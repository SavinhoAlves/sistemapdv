-- Mensalidades: configuração de cobrança por restaurante e pagamentos por mês.
-- A situação (em dia / pendente / atrasado / isento) é calculada na consulta.

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "cobranca_dia_vencimento" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "cobranca_valor" DECIMAL(10,2);
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "cobranca_isento" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "cobranca_obs" TEXT;

CREATE TABLE IF NOT EXISTS "pagamentos_mensalidade" (
    "id"          TEXT NOT NULL,
    "tenant_id"   TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "valor"       DECIMAL(10,2) NOT NULL,
    "pago_em"     DATE NOT NULL,
    "forma"       TEXT,
    "observacao"  TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pagamentos_mensalidade_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "pagamentos_mensalidade_tenant_id_competencia_key" ON "pagamentos_mensalidade"("tenant_id", "competencia");
CREATE INDEX IF NOT EXISTS "pagamentos_mensalidade_competencia_idx" ON "pagamentos_mensalidade"("competencia");

DO $$ BEGIN
  ALTER TABLE "pagamentos_mensalidade" ADD CONSTRAINT "pagamentos_mensalidade_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
