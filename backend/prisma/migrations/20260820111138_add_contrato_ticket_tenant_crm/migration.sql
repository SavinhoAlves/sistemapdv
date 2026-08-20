-- CreateEnum
CREATE TYPE "ContratoCiclo" AS ENUM ('mensal', 'trimestral', 'semestral', 'anual');

-- CreateEnum
CREATE TYPE "ContratoStatus" AS ENUM ('trial', 'ativo', 'suspenso', 'cancelado');

-- CreateEnum
CREATE TYPE "TicketTipo" AS ENUM ('sync', 'instalacao', 'bug', 'cobranca', 'outro');

-- CreateEnum
CREATE TYPE "TicketPrioridade" AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('aberto', 'em_andamento', 'resolvido', 'fechado');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "contato" TEXT,
ADD COLUMN     "endereco" TEXT,
ADD COLUMN     "observacoes" TEXT,
ADD COLUMN     "responsavel" TEXT,
ADD COLUMN     "telefone" TEXT,
ADD COLUMN     "venda_mobile_permitida" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "plano" TEXT NOT NULL,
    "valor" DECIMAL(10,2),
    "ciclo" "ContratoCiclo" NOT NULL DEFAULT 'mensal',
    "data_inicio" DATE,
    "data_fim" DATE,
    "status" "ContratoStatus" NOT NULL DEFAULT 'ativo',
    "observacoes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets_suporte" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "tipo" "TicketTipo" NOT NULL DEFAULT 'outro',
    "prioridade" "TicketPrioridade" NOT NULL DEFAULT 'media',
    "status" "TicketStatus" NOT NULL DEFAULT 'aberto',
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "resolucao" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_suporte_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contratos_tenant_id_idx" ON "contratos"("tenant_id");

-- CreateIndex
CREATE INDEX "tickets_suporte_tenant_id_idx" ON "tickets_suporte"("tenant_id");

-- CreateIndex
CREATE INDEX "tickets_suporte_status_idx" ON "tickets_suporte"("status");

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets_suporte" ADD CONSTRAINT "tickets_suporte_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
