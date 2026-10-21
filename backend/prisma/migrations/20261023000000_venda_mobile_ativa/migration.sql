-- Chave do restaurante para a venda pelo celular (o plano libera; o admin liga/desliga)
ALTER TABLE "configuracoes" ADD COLUMN "venda_mobile_ativa" BOOLEAN NOT NULL DEFAULT true;
