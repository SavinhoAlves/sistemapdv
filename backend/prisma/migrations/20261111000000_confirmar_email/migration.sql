-- Confirmação do e-mail de quem se cadastra pelo site (usuários existentes não ficam pendentes)
ALTER TABLE "usuarios" ADD COLUMN "email_pendente" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "usuarios" ADD COLUMN "email_confirmado_em" TIMESTAMP(3);
