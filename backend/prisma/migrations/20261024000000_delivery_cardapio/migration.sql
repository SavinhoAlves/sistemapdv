-- Delivery: cardápio online (pedido do cliente → caixa → cozinha)

-- CreateEnum
CREATE TYPE "PedidoOnlineStatus" AS ENUM ('recebido', 'aceito', 'pronto', 'em_rota', 'entregue', 'recusado', 'cancelado');

-- CreateEnum
CREATE TYPE "PedidoOnlineTipo" AS ENUM ('entrega', 'retirada');

-- AlterTable
ALTER TABLE "configuracoes" ADD COLUMN     "delivery_ativo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "delivery_entrega" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "delivery_mensagem" TEXT,
ADD COLUMN     "delivery_pedido_minimo" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "delivery_retirada" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "delivery_taxa" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "delivery_tempo_min" INTEGER NOT NULL DEFAULT 40;

-- AlterTable
ALTER TABLE "pedidos" ADD COLUMN     "taxa_entrega" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "pedidos_online" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "status" "PedidoOnlineStatus" NOT NULL DEFAULT 'recebido',
    "tipo" "PedidoOnlineTipo" NOT NULL DEFAULT 'entrega',
    "cliente_nome" TEXT NOT NULL,
    "cliente_telefone" TEXT NOT NULL,
    "endereco" TEXT,
    "numero" TEXT,
    "bairro" TEXT,
    "complemento" TEXT,
    "referencia" TEXT,
    "itens" JSONB NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxa_entrega" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "troco_para" DECIMAL(10,2),
    "observacao" TEXT,
    "motivo_recusa" TEXT,
    "pedido_id" TEXT,
    "aceito_por" TEXT,
    "aceito_em" TIMESTAMP(3),
    "pronto_em" TIMESTAMP(3),
    "saiu_em" TIMESTAMP(3),
    "entregue_em" TIMESTAMP(3),
    "cancelado_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedidos_online_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_online_codigo_key" ON "pedidos_online"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_online_pedido_id_key" ON "pedidos_online"("pedido_id");

-- CreateIndex
CREATE INDEX "pedidos_online_tenant_id_status_idx" ON "pedidos_online"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "pedidos_online_tenant_id_created_at_idx" ON "pedidos_online"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "pedidos_online" ADD CONSTRAINT "pedidos_online_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_online" ADD CONSTRAINT "pedidos_online_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
