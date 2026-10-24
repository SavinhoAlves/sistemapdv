-- Perfil do cliente do cardápio e endereços completos
ALTER TABLE "clientes" ADD COLUMN "email" TEXT;
ALTER TABLE "clientes" ADD COLUMN "nascimento" DATE;
ALTER TABLE "clientes" ADD COLUMN "cpf" TEXT;
ALTER TABLE "clientes" ADD COLUMN "telefone_2" TEXT;
ALTER TABLE "clientes" ADD COLUMN "contato_preferido" TEXT;

ALTER TABLE "cliente_enderecos" ADD COLUMN "cep" TEXT;
ALTER TABLE "cliente_enderecos" ADD COLUMN "cidade" TEXT;
ALTER TABLE "cliente_enderecos" ADD COLUMN "uf" TEXT;
ALTER TABLE "cliente_enderecos" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "cliente_enderecos" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "cliente_enderecos" ADD COLUMN "padrao" BOOLEAN NOT NULL DEFAULT false;
