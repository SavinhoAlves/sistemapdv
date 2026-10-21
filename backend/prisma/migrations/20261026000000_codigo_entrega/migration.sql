-- Código de entrega (estilo iFood): o cliente informa ao entregador, que digita
-- no app para concluir. Pedidos antigos ficam sem código (fluxo de antes).
ALTER TABLE "pedidos_online" ADD COLUMN "codigo_entrega" VARCHAR(4),
ADD COLUMN "tentativas_codigo" INTEGER NOT NULL DEFAULT 0;
