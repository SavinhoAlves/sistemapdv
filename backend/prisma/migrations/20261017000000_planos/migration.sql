-- Planos: pacotes de recursos (RFID, venda pelo celular, delivery, NFC-e).
-- O restaurante com plano tem rfid_disponivel / venda_mobile_permitida
-- sincronizados a partir do plano; sem plano, valem os interruptores manuais.

CREATE TABLE IF NOT EXISTS "planos" (
    "id"           TEXT NOT NULL,
    "nome"         TEXT NOT NULL,
    "descricao"    TEXT,
    "valor"        DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rfid"         BOOLEAN NOT NULL DEFAULT false,
    "venda_mobile" BOOLEAN NOT NULL DEFAULT false,
    "delivery"     BOOLEAN NOT NULL DEFAULT false,
    "nfce"         BOOLEAN NOT NULL DEFAULT false,
    "ativo"        BOOLEAN NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "planos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "planos_nome_key" ON "planos"("nome");

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "plano_id" TEXT;

DO $$ BEGIN
  ALTER TABLE "tenants" ADD CONSTRAINT "tenants_plano_id_fkey"
    FOREIGN KEY ("plano_id") REFERENCES "planos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
