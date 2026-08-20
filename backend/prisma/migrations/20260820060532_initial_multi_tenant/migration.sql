-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ativo', 'suspenso', 'cancelado');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "UserCargo" AS ENUM ('administrador', 'garcom', 'caixa', 'cozinha');

-- CreateEnum
CREATE TYPE "MesaStatus" AS ENUM ('livre', 'aberta', 'fechada', 'ocupada', 'fechando', 'finalizada');

-- CreateEnum
CREATE TYPE "PedidoStatus" AS ENUM ('aberto', 'preparando', 'pronto', 'entregue', 'fechado', 'cancelado');

-- CreateEnum
CREATE TYPE "PedidoItemStatus" AS ENUM ('pendente', 'preparando', 'pronto', 'entregue', 'cancelado');

-- CreateEnum
CREATE TYPE "CaixaStatus" AS ENUM ('aberto', 'fechado');

-- CreateEnum
CREATE TYPE "MovimentoCaixaTipo" AS ENUM ('suprimento', 'sangria', 'pagamento', 'estorno');

-- CreateEnum
CREATE TYPE "PagamentoStatus" AS ENUM ('pendente', 'confirmado', 'estornado');

-- CreateEnum
CREATE TYPE "LicencaStatus" AS ENUM ('ativado', 'pendente', 'bloqueado');

-- CreateEnum
CREATE TYPE "DispositivoStatus" AS ENUM ('ativo', 'suspenso', 'bloqueado', 'inativo');

-- CreateEnum
CREATE TYPE "EstoqueMovimentoTipo" AS ENUM ('entrada', 'saida');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cnpj" TEXT,
    "status" "TenantStatus" NOT NULL DEFAULT 'ativo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL DEFAULT 'SUPPORT',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_refresh_tokens" (
    "id" TEXT NOT NULL,
    "platform_user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "senha_hash" TEXT,
    "cartao_rfid" TEXT,
    "cargo" "UserCargo" NOT NULL,
    "pin" TEXT,
    "perfil_id" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfis" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "permissoes" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "vai_cozinha" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "categoria_id" TEXT,
    "imagem_url" TEXT,
    "tempo_preparo_minutos" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "estoque_atual" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "estoque_minimo" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "gerenciar_estoque" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metodos_pagamento" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "metodos_pagamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mesas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "capacidade" INTEGER NOT NULL DEFAULT 4,
    "cliente" TEXT,
    "nome_mesa" TEXT,
    "status" "MesaStatus" NOT NULL DEFAULT 'livre',
    "garcom_id" TEXT,
    "caixa_id" TEXT,
    "data_abertura" TIMESTAMP(3),
    "data_fechamento" TIMESTAMP(3),
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "mesa_id" TEXT,
    "garcom_id" TEXT NOT NULL,
    "status" "PedidoStatus" NOT NULL DEFAULT 'aberto',
    "total" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "taxa_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedido_itens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pedido_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "preco_unitario" DECIMAL(10,2) NOT NULL,
    "preco_total" DECIMAL(10,2) NOT NULL,
    "status" "PedidoItemStatus" NOT NULL DEFAULT 'pendente',
    "observacao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedido_itens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caixa" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "funcionario_id" TEXT NOT NULL,
    "valor_inicial" DECIMAL(10,2) NOT NULL,
    "valor_fechamento" DECIMAL(10,2),
    "data_abertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechado_em" TIMESTAMP(3),
    "status" "CaixaStatus" NOT NULL DEFAULT 'aberto',
    "valor_contado" DECIMAL(10,2),
    "diferenca" DECIMAL(10,2),
    "observacao_fechamento" TEXT,
    "fechado_por" TEXT,

    CONSTRAINT "caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentos_caixa" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "caixa_id" TEXT NOT NULL,
    "tipo" "MovimentoCaixaTipo" NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT,
    "usuario_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentos_caixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "mesa_id" TEXT,
    "pedido_id" TEXT,
    "metodo_id" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "troco" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "caixa_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "status" "PagamentoStatus" NOT NULL DEFAULT 'confirmado',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT,
    "entidade_id" TEXT,
    "detalhes" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nome_restaurante" TEXT NOT NULL DEFAULT 'Restaurante',
    "logo_base64" TEXT,
    "logo_tamanho" TEXT,
    "logo_altura_custom" INTEGER,
    "mensagem_ficha" TEXT,
    "impressora_largura" INTEGER NOT NULL DEFAULT 80,
    "impressora_copias" INTEGER NOT NULL DEFAULT 1,
    "impressora_auto_imprimir" BOOLEAN NOT NULL DEFAULT false,
    "impressora_tipo" TEXT NOT NULL DEFAULT 'usb',
    "impressora_host" TEXT,
    "impressora_porta" INTEGER,
    "taxa_servico_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "modo_venda" TEXT NOT NULL DEFAULT 'mesa',
    "rfid_ativo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_estoque" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "produto_id" TEXT NOT NULL,
    "tipo" "EstoqueMovimentoTipo" NOT NULL,
    "quantidade" DECIMAL(10,3) NOT NULL,
    "motivo" TEXT,
    "usuario_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimentacoes_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "licenca_id" TEXT,
    "instalacao_uuid" TEXT,
    "nome" TEXT,
    "versao" TEXT,
    "host_fingerprint" TEXT,
    "status" "DispositivoStatus" NOT NULL DEFAULT 'ativo',
    "sync_token" TEXT,
    "sync_bloqueado" BOOLEAN NOT NULL DEFAULT false,
    "sync_suspenso" BOOLEAN NOT NULL DEFAULT false,
    "venda_mobile_permitida" BOOLEAN NOT NULL DEFAULT false,
    "ultimo_sync_em" TIMESTAMP(3),
    "ultimo_sync_erro" TEXT,
    "central_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispositivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licencas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "chave_ativacao" TEXT,
    "status" "LicencaStatus" NOT NULL DEFAULT 'pendente',
    "data_ativacao" TIMESTAMP(3),
    "data_vencimento" TIMESTAMP(3),
    "ultima_verificacao" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licencas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_cnpj_key" ON "tenants"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "platform_users_email_key" ON "platform_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "platform_refresh_tokens_token_hash_key" ON "platform_refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "usuarios_tenant_id_idx" ON "usuarios"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tenant_id_email_key" ON "usuarios"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_tenant_id_cartao_rfid_key" ON "usuarios"("tenant_id", "cartao_rfid");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_usuario_id_idx" ON "refresh_tokens"("usuario_id");

-- CreateIndex
CREATE INDEX "perfis_tenant_id_idx" ON "perfis"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "perfis_tenant_id_nome_key" ON "perfis"("tenant_id", "nome");

-- CreateIndex
CREATE INDEX "categorias_tenant_id_idx" ON "categorias"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_tenant_id_nome_key" ON "categorias"("tenant_id", "nome");

-- CreateIndex
CREATE INDEX "produtos_tenant_id_idx" ON "produtos"("tenant_id");

-- CreateIndex
CREATE INDEX "produtos_tenant_id_ativo_idx" ON "produtos"("tenant_id", "ativo");

-- CreateIndex
CREATE INDEX "metodos_pagamento_tenant_id_idx" ON "metodos_pagamento"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "metodos_pagamento_tenant_id_nome_key" ON "metodos_pagamento"("tenant_id", "nome");

-- CreateIndex
CREATE INDEX "mesas_tenant_id_idx" ON "mesas"("tenant_id");

-- CreateIndex
CREATE INDEX "mesas_tenant_id_status_idx" ON "mesas"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mesas_tenant_id_numero_key" ON "mesas"("tenant_id", "numero");

-- CreateIndex
CREATE INDEX "pedidos_tenant_id_idx" ON "pedidos"("tenant_id");

-- CreateIndex
CREATE INDEX "pedidos_tenant_id_status_idx" ON "pedidos"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "pedidos_tenant_id_mesa_id_idx" ON "pedidos"("tenant_id", "mesa_id");

-- CreateIndex
CREATE INDEX "pedido_itens_tenant_id_idx" ON "pedido_itens"("tenant_id");

-- CreateIndex
CREATE INDEX "pedido_itens_pedido_id_idx" ON "pedido_itens"("pedido_id");

-- CreateIndex
CREATE INDEX "caixa_tenant_id_idx" ON "caixa"("tenant_id");

-- CreateIndex
CREATE INDEX "caixa_tenant_id_status_idx" ON "caixa"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "movimentos_caixa_tenant_id_idx" ON "movimentos_caixa"("tenant_id");

-- CreateIndex
CREATE INDEX "movimentos_caixa_caixa_id_idx" ON "movimentos_caixa"("caixa_id");

-- CreateIndex
CREATE INDEX "pagamentos_tenant_id_idx" ON "pagamentos"("tenant_id");

-- CreateIndex
CREATE INDEX "pagamentos_tenant_id_mesa_id_idx" ON "pagamentos"("tenant_id", "mesa_id");

-- CreateIndex
CREATE INDEX "auditoria_tenant_id_idx" ON "auditoria"("tenant_id");

-- CreateIndex
CREATE INDEX "auditoria_tenant_id_created_at_idx" ON "auditoria"("tenant_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_tenant_id_key" ON "configuracoes"("tenant_id");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_tenant_id_idx" ON "movimentacoes_estoque"("tenant_id");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_tenant_id_produto_id_idx" ON "movimentacoes_estoque"("tenant_id", "produto_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_instalacao_uuid_key" ON "dispositivos"("instalacao_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivos_sync_token_key" ON "dispositivos"("sync_token");

-- CreateIndex
CREATE INDEX "dispositivos_tenant_id_idx" ON "dispositivos"("tenant_id");

-- CreateIndex
CREATE INDEX "licencas_tenant_id_idx" ON "licencas"("tenant_id");

-- AddForeignKey
ALTER TABLE "platform_refresh_tokens" ADD CONSTRAINT "platform_refresh_tokens_platform_user_id_fkey" FOREIGN KEY ("platform_user_id") REFERENCES "platform_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfis" ADD CONSTRAINT "perfis_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metodos_pagamento" ADD CONSTRAINT "metodos_pagamento_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_garcom_id_fkey" FOREIGN KEY ("garcom_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mesas" ADD CONSTRAINT "mesas_caixa_id_fkey" FOREIGN KEY ("caixa_id") REFERENCES "caixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_mesa_id_fkey" FOREIGN KEY ("mesa_id") REFERENCES "mesas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_garcom_id_fkey" FOREIGN KEY ("garcom_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixa" ADD CONSTRAINT "caixa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixa" ADD CONSTRAINT "caixa_funcionario_id_fkey" FOREIGN KEY ("funcionario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "caixa" ADD CONSTRAINT "caixa_fechado_por_fkey" FOREIGN KEY ("fechado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_caixa_id_fkey" FOREIGN KEY ("caixa_id") REFERENCES "caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentos_caixa" ADD CONSTRAINT "movimentos_caixa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_mesa_id_fkey" FOREIGN KEY ("mesa_id") REFERENCES "mesas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_metodo_id_fkey" FOREIGN KEY ("metodo_id") REFERENCES "metodos_pagamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_caixa_id_fkey" FOREIGN KEY ("caixa_id") REFERENCES "caixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracoes" ADD CONSTRAINT "configuracoes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_estoque" ADD CONSTRAINT "movimentacoes_estoque_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivos" ADD CONSTRAINT "dispositivos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivos" ADD CONSTRAINT "dispositivos_licenca_id_fkey" FOREIGN KEY ("licenca_id") REFERENCES "licencas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencas" ADD CONSTRAINT "licencas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
