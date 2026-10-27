-- Modo local (Host): terminais por IP fixo e IP do Host
ALTER TABLE "configuracoes" ADD COLUMN "host_ip" TEXT;

CREATE TABLE "terminais" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "terminais_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "terminais_tenant_id_ip_key" ON "terminais"("tenant_id", "ip");
ALTER TABLE "terminais" ADD CONSTRAINT "terminais_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
