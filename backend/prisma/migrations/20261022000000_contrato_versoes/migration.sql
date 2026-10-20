-- Versões do contrato (PDF gerado no servidor)
CREATE TABLE "contrato_versoes" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "dados" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "motivo" TEXT,
    "enviado_em" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contrato_versoes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contrato_versoes_tenant_id_numero_key" ON "contrato_versoes"("tenant_id", "numero");

ALTER TABLE "contrato_versoes" ADD CONSTRAINT "contrato_versoes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
