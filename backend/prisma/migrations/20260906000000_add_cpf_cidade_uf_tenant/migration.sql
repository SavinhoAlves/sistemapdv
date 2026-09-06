-- AlterTable: add cpf_responsavel, cidade, uf to tenants
ALTER TABLE "tenants" ADD COLUMN "cpf_responsavel" TEXT;
ALTER TABLE "tenants" ADD COLUMN "cidade" TEXT;
ALTER TABLE "tenants" ADD COLUMN "uf" TEXT;
