-- Login por código: cada restaurante ganha um código numérico (a partir de 1001)
-- e cada usuário um código sequencial dentro do restaurante, além de um nome de usuário opcional.

-- Restaurantes: numera os existentes por ordem de cadastro e segue a sequência
CREATE SEQUENCE IF NOT EXISTS "tenants_codigo_seq" START 1001;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "codigo" INTEGER;

UPDATE "tenants" t SET "codigo" = n.codigo
FROM (SELECT "id", 1000 + ROW_NUMBER() OVER (ORDER BY "created_at", "id") AS codigo FROM "tenants") n
WHERE t."id" = n."id" AND t."codigo" IS NULL;

SELECT setval('"tenants_codigo_seq"', GREATEST(COALESCE((SELECT MAX("codigo") FROM "tenants"), 1000), 1000));
ALTER SEQUENCE "tenants_codigo_seq" OWNED BY "tenants"."codigo";
ALTER TABLE "tenants" ALTER COLUMN "codigo" SET DEFAULT nextval('"tenants_codigo_seq"');
ALTER TABLE "tenants" ALTER COLUMN "codigo" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "tenants_codigo_key" ON "tenants"("codigo");

-- Usuários: código sequencial por restaurante e nome de usuário
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "codigo" INTEGER;
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "login" TEXT;

UPDATE "usuarios" u SET "codigo" = n.codigo
FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "tenant_id" ORDER BY "created_at", "id") AS codigo FROM "usuarios") n
WHERE u."id" = n."id" AND u."codigo" IS NULL;

-- Preenche o código em qualquer INSERT (backend, Central, seed) sem depender da aplicação.
-- O advisory lock serializa cadastros simultâneos do mesmo restaurante.
CREATE OR REPLACE FUNCTION usuarios_definir_codigo() RETURNS trigger AS $$
BEGIN
  IF NEW."codigo" IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('usuarios_codigo:' || NEW."tenant_id"));
    SELECT COALESCE(MAX("codigo"), 0) + 1 INTO NEW."codigo" FROM "usuarios" WHERE "tenant_id" = NEW."tenant_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "usuarios_definir_codigo" ON "usuarios";
CREATE TRIGGER "usuarios_definir_codigo" BEFORE INSERT ON "usuarios"
  FOR EACH ROW EXECUTE FUNCTION usuarios_definir_codigo();

ALTER TABLE "usuarios" ALTER COLUMN "codigo" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_tenant_id_codigo_key" ON "usuarios"("tenant_id", "codigo");
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_tenant_id_login_key" ON "usuarios"("tenant_id", "login");
