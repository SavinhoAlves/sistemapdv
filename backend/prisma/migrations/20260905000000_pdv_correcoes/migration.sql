-- ═══════════════════════════════════════════════════════════════════════════
-- Correções estruturais do PDV
--
-- Rode com o serviço parado. Faz backfill dos dados existentes antes de
-- aplicar as constraints, então a ordem dos blocos importa.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Sequências por tenant
--    Substitui `SELECT max(numero)+1`, que tem corrida: duas requisições
--    simultâneas geravam o mesmo número de mesa.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE "sequencias" (
  "tenant_id" TEXT NOT NULL,
  "nome"      TEXT NOT NULL,
  "valor"     INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "sequencias_pkey" PRIMARY KEY ("tenant_id", "nome")
);

INSERT INTO "sequencias" ("tenant_id", "nome", "valor")
SELECT id, 'mesa', COALESCE((SELECT MAX(numero) FROM mesas m WHERE m.tenant_id = t.id), 0)
FROM tenants t;

INSERT INTO "sequencias" ("tenant_id", "nome", "valor")
SELECT id, 'pedido', 0 FROM tenants t;


-- ───────────────────────────────────────────────────────────────────────────
-- 2. Pedido: numeração + remoção do total materializado
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE "pedidos" ADD COLUMN "numero" INTEGER;
ALTER TABLE "pedidos" ADD COLUMN "fechado_em" TIMESTAMP(3);

-- Numera os pedidos existentes por ordem de criação, dentro de cada tenant.
WITH numerados AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) AS n
  FROM pedidos
)
UPDATE pedidos p SET numero = numerados.n
FROM numerados WHERE numerados.id = p.id;

ALTER TABLE "pedidos" ALTER COLUMN "numero" SET NOT NULL;
CREATE UNIQUE INDEX "pedidos_tenant_numero_key" ON "pedidos" ("tenant_id", "numero");

UPDATE sequencias s
SET valor = COALESCE((SELECT MAX(numero) FROM pedidos p WHERE p.tenant_id = s.tenant_id), 0)
WHERE s.nome = 'pedido';

-- Preenche fechado_em para pedidos já fechados, usando o updated_at.
UPDATE pedidos SET fechado_em = updated_at WHERE status = 'fechado' AND fechado_em IS NULL;


-- ───────────────────────────────────────────────────────────────────────────
-- 3. Abatimentos: o desconto escalar vira tabela com motivo e autor
--    Migra Pedido.desconto > 0 para uma linha de abatimento, atribuída ao
--    garçom do pedido (é a melhor procedência disponível no histórico).
-- ───────────────────────────────────────────────────────────────────────────

CREATE TYPE "AbatimentoTipo" AS ENUM ('valor', 'percentual', 'cortesia');

CREATE TABLE "abatimentos" (
  "id"             TEXT NOT NULL,
  "tenant_id"      TEXT NOT NULL,
  "pedido_id"      TEXT NOT NULL,
  "tipo"           "AbatimentoTipo" NOT NULL DEFAULT 'valor',
  "valor"          DECIMAL(10,2) NOT NULL,
  "percentual"     DECIMAL(5,2),
  "motivo"         TEXT NOT NULL,
  "usuario_id"     TEXT NOT NULL,
  "cancelado"      BOOLEAN NOT NULL DEFAULT false,
  "cancelado_em"   TIMESTAMP(3),
  "cancelado_por"  TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "abatimentos_pkey" PRIMARY KEY ("id")
);

INSERT INTO "abatimentos" (id, tenant_id, pedido_id, tipo, valor, motivo, usuario_id, created_at)
SELECT gen_random_uuid()::text, tenant_id, id, 'valor', desconto,
       'Migrado do campo desconto', garcom_id, created_at
FROM pedidos WHERE desconto > 0;

ALTER TABLE "abatimentos"
  ADD CONSTRAINT "abatimentos_tenant_fk"  FOREIGN KEY ("tenant_id")     REFERENCES "tenants"("id"),
  ADD CONSTRAINT "abatimentos_pedido_fk"  FOREIGN KEY ("pedido_id")     REFERENCES "pedidos"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "abatimentos_usuario_fk" FOREIGN KEY ("usuario_id")    REFERENCES "usuarios"("id"),
  ADD CONSTRAINT "abatimentos_cancel_fk"  FOREIGN KEY ("cancelado_por") REFERENCES "usuarios"("id");

CREATE INDEX "abatimentos_tenant_idx" ON "abatimentos" ("tenant_id");
CREATE INDEX "abatimentos_pedido_idx" ON "abatimentos" ("pedido_id");

ALTER TABLE "pedidos" DROP COLUMN "desconto";
ALTER TABLE "pedidos" DROP COLUMN "total";


-- ───────────────────────────────────────────────────────────────────────────
-- 4. PedidoItem: rodadas e rastreabilidade
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE "pedido_itens" ADD COLUMN "rodada"              INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "pedido_itens" ADD COLUMN "lancado_por"         TEXT;
ALTER TABLE "pedido_itens" ADD COLUMN "cancelado_por"       TEXT;
ALTER TABLE "pedido_itens" ADD COLUMN "motivo_cancelamento" TEXT;

-- Reconstrói rodadas históricas agrupando lançamentos com até 3 min de
-- diferença dentro do mesmo pedido — aproxima o comportamento real.
WITH marcados AS (
  SELECT id, pedido_id, created_at,
         CASE WHEN created_at - LAG(created_at) OVER w > INTERVAL '3 minutes'
              THEN 1 ELSE 0 END AS quebra
  FROM pedido_itens
  WINDOW w AS (PARTITION BY pedido_id ORDER BY created_at)
),
rodadas AS (
  SELECT id, 1 + SUM(quebra) OVER (PARTITION BY pedido_id ORDER BY created_at
                                   ROWS UNBOUNDED PRECEDING) AS rodada
  FROM marcados
)
UPDATE pedido_itens pi SET rodada = rodadas.rodada
FROM rodadas WHERE rodadas.id = pi.id;

ALTER TABLE "pedido_itens"
  ADD CONSTRAINT "pedido_itens_tenant_fk"  FOREIGN KEY ("tenant_id")   REFERENCES "tenants"("id"),
  ADD CONSTRAINT "pedido_itens_lancado_fk" FOREIGN KEY ("lancado_por") REFERENCES "usuarios"("id"),
  ADD CONSTRAINT "pedido_itens_cancel_fk"  FOREIGN KEY ("cancelado_por") REFERENCES "usuarios"("id");

CREATE INDEX "pedido_itens_rodada_idx" ON "pedido_itens" ("pedido_id", "rodada");
CREATE INDEX "pedido_itens_status_idx" ON "pedido_itens" ("tenant_id", "status");

-- Corrige itens cujo precoTotal divergiu do unitário × quantidade.
-- Causa: o increment usava o preço ATUAL do produto enquanto preco_unitario
-- guardava o preço do momento da criação.
UPDATE pedido_itens
SET preco_total = ROUND(preco_unitario * quantidade, 2)
WHERE preco_total <> ROUND(preco_unitario * quantidade, 2);


-- ───────────────────────────────────────────────────────────────────────────
-- 5. Pagamento: idempotência e valor recebido
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE "pagamentos" ADD COLUMN "idempotency_key" TEXT;
ALTER TABLE "pagamentos" ADD COLUMN "valor_recebido"  DECIMAL(10,2);
ALTER TABLE "pagamentos" ADD COLUMN "estornado_em"    TIMESTAMP(3);
ALTER TABLE "pagamentos" ADD COLUMN "estornado_por"   TEXT;
ALTER TABLE "pagamentos" ADD COLUMN "motivo_estorno"  TEXT;

-- Histórico: o id serve de chave, e recebido = valor + troco.
UPDATE pagamentos SET idempotency_key = 'legado-' || id WHERE idempotency_key IS NULL;
UPDATE pagamentos SET valor_recebido  = valor + troco  WHERE valor_recebido  IS NULL;

ALTER TABLE "pagamentos" ALTER COLUMN "idempotency_key" SET NOT NULL;
ALTER TABLE "pagamentos" ALTER COLUMN "valor_recebido"  SET NOT NULL;

CREATE UNIQUE INDEX "pagamentos_tenant_idem_key"
  ON "pagamentos" ("tenant_id", "idempotency_key");

-- pedido_id passa a ser obrigatório: pagamento sem pedido não tem conta.
DELETE FROM pagamentos WHERE pedido_id IS NULL;
ALTER TABLE "pagamentos" ALTER COLUMN "pedido_id" SET NOT NULL;

ALTER TABLE "pagamentos"
  ADD CONSTRAINT "pagamentos_estorno_fk" FOREIGN KEY ("estornado_por") REFERENCES "usuarios"("id");

CREATE INDEX "pagamentos_caixa_idx" ON "pagamentos" ("tenant_id", "caixa_id");


-- ───────────────────────────────────────────────────────────────────────────
-- 6. Mesa: enum enxuto e encerramento justificado
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE "mesas" ADD COLUMN "encerrada_sem_pagamento" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "mesas" ADD COLUMN "motivo_encerramento"     TEXT;
ALTER TABLE "mesas" ADD COLUMN "encerrada_por"           TEXT;

-- Colapsa os estados que nunca foram atribuídos pelo código.
UPDATE mesas SET status = 'aberta'  WHERE status IN ('livre', 'ocupada');
UPDATE mesas SET status = 'fechada' WHERE status = 'finalizada';

ALTER TYPE "MesaStatus" RENAME TO "MesaStatus_antigo";
CREATE TYPE "MesaStatus" AS ENUM ('aberta', 'fechando', 'fechada');
ALTER TABLE "mesas"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "MesaStatus" USING status::text::"MesaStatus",
  ALTER COLUMN "status" SET DEFAULT 'aberta';
DROP TYPE "MesaStatus_antigo";

ALTER TABLE "mesas" DROP COLUMN "capacidade";
ALTER TABLE "mesas"
  ADD CONSTRAINT "mesas_encerrada_por_fk" FOREIGN KEY ("encerrada_por") REFERENCES "usuarios"("id");

CREATE INDEX "mesas_abertura_idx" ON "mesas" ("tenant_id", "data_abertura");


-- ───────────────────────────────────────────────────────────────────────────
-- 7. As constraints que faltavam
-- ───────────────────────────────────────────────────────────────────────────

-- Um caixa aberto por tenant. Antes, abrirCaixa() fazia findFirst + create:
-- duas requisições simultâneas criavam dois caixas abertos.
-- Fecha os duplicados existentes antes de aplicar.
WITH duplicados AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY data_abertura DESC) AS n
  FROM caixa WHERE status = 'aberto'
)
UPDATE caixa SET status = 'fechado', fechado_em = NOW(),
       observacao_fechamento = 'Fechado automaticamente na migração (caixa duplicado)'
FROM duplicados WHERE duplicados.id = caixa.id AND duplicados.n > 1;

CREATE UNIQUE INDEX "caixa_um_aberto_por_tenant"
  ON "caixa" ("tenant_id") WHERE status = 'aberto';

-- Um pedido aberto por mesa. Mesma corrida em adicionarItem().
-- Consolida duplicados: move os itens para o pedido mais antigo.
WITH duplicados AS (
  SELECT id, mesa_id,
         FIRST_VALUE(id) OVER (PARTITION BY mesa_id ORDER BY created_at) AS principal,
         ROW_NUMBER()    OVER (PARTITION BY mesa_id ORDER BY created_at) AS n
  FROM pedidos
  WHERE mesa_id IS NOT NULL AND status IN ('aberto', 'preparando', 'pronto')
)
UPDATE pedido_itens pi SET pedido_id = d.principal
FROM duplicados d WHERE pi.pedido_id = d.id AND d.n > 1;

DELETE FROM pedidos p
USING (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY mesa_id ORDER BY created_at) AS n
  FROM pedidos
  WHERE mesa_id IS NOT NULL AND status IN ('aberto', 'preparando', 'pronto')
) d
WHERE p.id = d.id AND d.n > 1
  AND NOT EXISTS (SELECT 1 FROM pagamentos pg WHERE pg.pedido_id = p.id);

CREATE UNIQUE INDEX "pedido_um_aberto_por_mesa"
  ON "pedidos" ("mesa_id")
  WHERE mesa_id IS NOT NULL AND status IN ('aberto', 'preparando', 'pronto');

-- Estoque nunca negativo. Antes a validação era check-then-act sem lock e
-- duas mesas conseguiam consumir a mesma última unidade.
UPDATE produtos SET estoque_atual = 0 WHERE gerenciar_estoque AND estoque_atual < 0;
ALTER TABLE "produtos"
  ADD CONSTRAINT "produtos_estoque_nao_negativo"
  CHECK (NOT gerenciar_estoque OR estoque_atual >= 0);

-- Valores monetários nunca negativos.
ALTER TABLE "pagamentos"  ADD CONSTRAINT "pagamentos_valor_positivo" CHECK (valor >= 0 AND troco >= 0);
ALTER TABLE "abatimentos" ADD CONSTRAINT "abatimentos_valor_positivo" CHECK (valor >= 0);
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_qtd_positiva"  CHECK (quantidade > 0);


-- ───────────────────────────────────────────────────────────────────────────
-- 8. Índices para as consultas quentes
-- ───────────────────────────────────────────────────────────────────────────

-- Tela da cozinha: itens pendentes/preparando das últimas horas.
CREATE INDEX "pedido_itens_cozinha_idx"
  ON "pedido_itens" ("tenant_id", "created_at" DESC)
  WHERE status IN ('pendente', 'preparando');

-- Relatório de vendas por período.
CREATE INDEX "pagamentos_periodo_idx"
  ON "pagamentos" ("tenant_id", "created_at" DESC)
  WHERE status = 'confirmado';

COMMIT;
