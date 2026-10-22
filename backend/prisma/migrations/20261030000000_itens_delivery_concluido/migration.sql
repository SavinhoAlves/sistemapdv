-- Pedidos de delivery já entregues e pagos tinham itens presos na cozinha
-- ("em preparo"/"pronto" para sempre). A partir de agora o concluir marca os
-- itens como entregues; aqui acerta os que ficaram para trás.
UPDATE "pedido_itens" SET "status" = 'entregue'
 WHERE "status" NOT IN ('cancelado', 'entregue')
   AND "pedido_id" IN (SELECT "pedido_id" FROM "pedidos_online" WHERE "status" = 'entregue' AND "pedido_id" IS NOT NULL);
