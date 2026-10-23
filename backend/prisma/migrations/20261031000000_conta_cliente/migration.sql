-- Conta do cliente no cardápio online (celular + senha, de um restaurante só)
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "ultimo_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "clientes_tenant_id_telefone_key" ON "clientes"("tenant_id", "telefone");
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Endereços salvos do cliente
CREATE TABLE "cliente_enderecos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "apelido" TEXT,
    "endereco" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "complemento" TEXT,
    "referencia" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cliente_enderecos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cliente_enderecos_tenant_id_cliente_id_idx" ON "cliente_enderecos"("tenant_id", "cliente_id");
ALTER TABLE "cliente_enderecos" ADD CONSTRAINT "cliente_enderecos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cliente_enderecos" ADD CONSTRAINT "cliente_enderecos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Pedido ligado à conta (apagar a conta mantém o pedido, sem o vínculo)
ALTER TABLE "pedidos_online" ADD COLUMN "cliente_id" TEXT;
CREATE INDEX "pedidos_online_cliente_id_idx" ON "pedidos_online"("cliente_id");
ALTER TABLE "pedidos_online" ADD CONSTRAINT "pedidos_online_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
