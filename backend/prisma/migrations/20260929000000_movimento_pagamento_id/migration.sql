-- AlterTable: vincula o movimento de caixa ao pagamento de origem (estorno pelo caixa)
ALTER TABLE "movimentos_caixa" ADD COLUMN "pagamento_id" TEXT;
CREATE INDEX "movimentos_caixa_pagamento_id_idx" ON "movimentos_caixa"("pagamento_id");
