-- Delivery etapa B: entregador, rota, posições GPS e local do restaurante

ALTER TYPE "UserCargo" ADD VALUE 'entregador';

ALTER TABLE "configuracoes" ADD COLUMN     "delivery_lat" DOUBLE PRECISION,
ADD COLUMN     "delivery_lng" DOUBLE PRECISION;

ALTER TABLE "pedidos_online" ADD COLUMN     "destino_lat" DOUBLE PRECISION,
ADD COLUMN     "destino_lng" DOUBLE PRECISION,
ADD COLUMN     "entrega_confirmada_em" TIMESTAMP(3),
ADD COLUMN     "entregador_id" TEXT,
ADD COLUMN     "ordem_rota" INTEGER;

CREATE TABLE "entregador_posicoes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "precisao" DOUBLE PRECISION,
    "velocidade" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entregador_posicoes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "entregador_posicoes_tenant_id_usuario_id_created_at_idx" ON "entregador_posicoes"("tenant_id", "usuario_id", "created_at");

CREATE INDEX "entregador_posicoes_created_at_idx" ON "entregador_posicoes"("created_at");

CREATE INDEX "pedidos_online_tenant_id_entregador_id_status_idx" ON "pedidos_online"("tenant_id", "entregador_id", "status");

ALTER TABLE "pedidos_online" ADD CONSTRAINT "pedidos_online_entregador_id_fkey" FOREIGN KEY ("entregador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "entregador_posicoes" ADD CONSTRAINT "entregador_posicoes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "entregador_posicoes" ADD CONSTRAINT "entregador_posicoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
