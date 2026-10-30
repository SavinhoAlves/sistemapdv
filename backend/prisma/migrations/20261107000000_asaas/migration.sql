-- Cobrança automática da mensalidade pelo Asaas
ALTER TABLE "tenants" ADD COLUMN "asaas_cliente_id" TEXT;
CREATE UNIQUE INDEX "tenants_asaas_cliente_id_key" ON "tenants"("asaas_cliente_id");

ALTER TABLE "contratos" ADD COLUMN "asaas_assinatura_id" TEXT;
CREATE UNIQUE INDEX "contratos_asaas_assinatura_id_key" ON "contratos"("asaas_assinatura_id");

ALTER TABLE "pagamentos_mensalidade" ADD COLUMN "asaas_pagamento_id" TEXT;
CREATE UNIQUE INDEX "pagamentos_mensalidade_asaas_pagamento_id_key" ON "pagamentos_mensalidade"("asaas_pagamento_id");
