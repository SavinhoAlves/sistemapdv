-- CreateTable
CREATE TABLE "impressoras" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "destino" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "host" TEXT,
    "porta" INTEGER NOT NULL DEFAULT 9100,
    "largura" INTEGER NOT NULL DEFAULT 80,
    "copias" INTEGER NOT NULL DEFAULT 1,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impressoras_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "impressoras_tenant_id_idx" ON "impressoras"("tenant_id");

-- AddForeignKey
ALTER TABLE "impressoras" ADD CONSTRAINT "impressoras_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
