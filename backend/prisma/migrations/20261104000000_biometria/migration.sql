-- Face ID / digital do celular (passkey WebAuthn) no lugar do PIN
CREATE TABLE "biometrias" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "chave_publica" BYTEA NOT NULL,
    "contador" BIGINT NOT NULL DEFAULT 0,
    "transportes" TEXT[],
    "aparelho" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usado_em" TIMESTAMP(3),

    CONSTRAINT "biometrias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "biometrias_credential_id_key" ON "biometrias"("credential_id");
CREATE INDEX "biometrias_tenant_id_usuario_id_idx" ON "biometrias"("tenant_id", "usuario_id");

ALTER TABLE "biometrias" ADD CONSTRAINT "biometrias_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "biometrias" ADD CONSTRAINT "biometrias_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
