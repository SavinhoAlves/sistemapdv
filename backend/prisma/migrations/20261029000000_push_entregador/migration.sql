-- Notificação push do app do entregador: uma inscrição por aparelho
CREATE TABLE "push_inscricoes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_inscricoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "push_inscricoes_endpoint_key" ON "push_inscricoes"("endpoint");
CREATE INDEX "push_inscricoes_tenant_id_usuario_id_idx" ON "push_inscricoes"("tenant_id", "usuario_id");

ALTER TABLE "push_inscricoes" ADD CONSTRAINT "push_inscricoes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "push_inscricoes" ADD CONSTRAINT "push_inscricoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
