-- Dados pessoais do funcionário (cadastro do Admin, exibidos em Meu perfil)
ALTER TABLE "usuarios" ADD COLUMN "cpf" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "telefone" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "nascimento" DATE;
ALTER TABLE "usuarios" ADD COLUMN "cep" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "endereco" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "cidade" TEXT;
ALTER TABLE "usuarios" ADD COLUMN "uf" TEXT;
