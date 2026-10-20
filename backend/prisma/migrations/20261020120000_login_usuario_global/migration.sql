-- Login em campo único: o nome de usuário identifica a pessoa sem informar o restaurante,
-- então passa a ser único na plataforma inteira (antes era por restaurante).
DROP INDEX IF EXISTS "usuarios_tenant_id_login_key";
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_login_key" ON "usuarios"("login");
