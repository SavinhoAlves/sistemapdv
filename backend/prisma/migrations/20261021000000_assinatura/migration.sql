-- Assinatura unificada: o contrato passa a guardar a cobrança (dia, isenção, próximo
-- vencimento, teste grátis) e a licença vira consequência dele. Só adiciona colunas:
-- os campos cobranca_* do restaurante ficam até o próximo deploy, para a API antiga
-- seguir funcionando entre a migração e o reload.

ALTER TABLE "contratos" ADD COLUMN IF NOT EXISTS "dia_vencimento" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "contratos" ADD COLUMN IF NOT EXISTS "proximo_vencimento" DATE;
ALTER TABLE "contratos" ADD COLUMN IF NOT EXISTS "teste_ate" DATE;
ALTER TABLE "contratos" ADD COLUMN IF NOT EXISTS "isento" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "contratos" ADD COLUMN IF NOT EXISTS "ajuste_motivo" TEXT;
ALTER TABLE "contratos" ADD COLUMN IF NOT EXISTS "ajuste_em" TIMESTAMP(3);

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "rfid_manual" BOOLEAN;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "venda_mobile_manual" BOOLEAN;

ALTER TABLE "pagamentos_mensalidade" ADD COLUMN IF NOT EXISTS "periodo_inicio" DATE;
ALTER TABLE "pagamentos_mensalidade" ADD COLUMN IF NOT EXISTS "periodo_fim" DATE;

-- Um pagamento por ciclo, não mais um por mês: a competência deixa de ser única
DROP INDEX IF EXISTS "pagamentos_mensalidade_tenant_id_competencia_key";
CREATE INDEX IF NOT EXISTS "pagamentos_mensalidade_tenant_id_competencia_idx" ON "pagamentos_mensalidade"("tenant_id", "competencia");

-- Restaurante sem contrato ganha um, com o plano (ou "Personalizado")
INSERT INTO "contratos" ("id", "tenant_id", "plano", "valor", "ciclo", "data_inicio", "status", "created_at", "updated_at")
SELECT gen_random_uuid()::text, t."id", COALESCE(p."nome", 'Personalizado'), p."valor", 'mensal', t."created_at"::date, 'trial', NOW(), NOW()
FROM "tenants" t
LEFT JOIN "planos" p ON p."id" = t."plano_id"
WHERE NOT EXISTS (SELECT 1 FROM "contratos" c WHERE c."tenant_id" = t."id");

-- Contrato mais recente de cada restaurante recebe a cobrança e o vencimento atual
WITH atual AS (
  SELECT DISTINCT ON ("tenant_id") "id", "tenant_id"
  FROM "contratos" ORDER BY "tenant_id", "created_at" DESC
), lic AS (
  SELECT DISTINCT ON ("tenant_id") "tenant_id", "status", "data_vencimento"
  FROM "licencas" ORDER BY "tenant_id", "created_at" DESC
)
UPDATE "contratos" c SET
  "dia_vencimento" = LEAST(GREATEST(t."cobranca_dia_vencimento", 1), 31),
  "isento"         = t."cobranca_isento",
  "valor"          = COALESCE(c."valor",
                       t."cobranca_valor" * CASE c."ciclo" WHEN 'trimestral' THEN 3 WHEN 'semestral' THEN 6 WHEN 'anual' THEN 12 ELSE 1 END,
                       p."valor"          * CASE c."ciclo" WHEN 'trimestral' THEN 3 WHEN 'semestral' THEN 6 WHEN 'anual' THEN 12 ELSE 1 END),
  -- Licença ativa vira o próximo vencimento; pendente/bloqueada fica sem (continua bloqueada)
  "proximo_vencimento" = CASE WHEN lic."status" = 'ativado' THEN lic."data_vencimento"::date END
FROM atual
JOIN "tenants" t ON t."id" = atual."tenant_id"
LEFT JOIN "planos" p ON p."id" = t."plano_id"
LEFT JOIN lic ON lic."tenant_id" = atual."tenant_id"
WHERE c."id" = atual."id";

-- Sem plano, os recursos eram manuais: viram exceções explícitas
UPDATE "tenants" SET "rfid_manual" = "rfid_disponivel", "venda_mobile_manual" = "venda_mobile_permitida"
WHERE "plano_id" IS NULL;
