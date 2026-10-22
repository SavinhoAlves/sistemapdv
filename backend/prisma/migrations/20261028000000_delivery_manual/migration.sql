-- Delivery como RFID e venda pelo celular: vem do plano, com exceção do
-- superadmin por restaurante. delivery_disponivel é o valor efetivo.
ALTER TABLE "tenants" ADD COLUMN "delivery_disponivel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "delivery_manual" BOOLEAN;

-- Quem já tem delivery pelo plano continua tendo
UPDATE "tenants" t SET "delivery_disponivel" = COALESCE((SELECT p."delivery" FROM "planos" p WHERE p."id" = t."plano_id"), false);
