-- Tipo de comércio do restaurante (restaurante, bar, lanchonete…). Nulo nos já cadastrados.
ALTER TABLE "tenants" ADD COLUMN "tipo_comercio" TEXT;
