-- Envio para a cozinha: exceção por produto, modo do restaurante (automático ou
-- pelo botão "Enviar pedido") e itens em rascunho até serem enviados.
CREATE TYPE "EnvioCozinha" AS ENUM ('categoria', 'sempre', 'nunca');
CREATE TYPE "ModoEnvioCozinha" AS ENUM ('automatico', 'botao');

ALTER TABLE "produtos" ADD COLUMN "envio_cozinha" "EnvioCozinha" NOT NULL DEFAULT 'categoria';
ALTER TABLE "configuracoes" ADD COLUMN "envio_cozinha_modo" "ModoEnvioCozinha" NOT NULL DEFAULT 'automatico';
ALTER TABLE "pedido_itens" ADD COLUMN "enviado_em" TIMESTAMP(3);

ALTER TYPE "PedidoItemStatus" ADD VALUE 'rascunho' BEFORE 'pendente';
