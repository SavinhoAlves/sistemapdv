-- Acesso remoto: registro das sessões e opção de acesso sem aceite
ALTER TABLE "configuracoes" ADD COLUMN "suporte_sem_aceite" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "sessoes_remotas" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "suporte_id" TEXT,
    "suporte_nome" TEXT NOT NULL,
    "usuario_nome" TEXT,
    "tela" TEXT,
    "sem_aceite" BOOLEAN NOT NULL DEFAULT false,
    "controle" BOOLEAN NOT NULL DEFAULT false,
    "mensagens" INTEGER NOT NULL DEFAULT 0,
    "inicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fim" TIMESTAMP(3),
    "motivo_fim" TEXT,

    CONSTRAINT "sessoes_remotas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sessoes_remotas_tenant_id_inicio_idx" ON "sessoes_remotas"("tenant_id", "inicio");

ALTER TABLE "sessoes_remotas" ADD CONSTRAINT "sessoes_remotas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
