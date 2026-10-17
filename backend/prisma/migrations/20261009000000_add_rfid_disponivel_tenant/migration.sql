-- Coluna adicionada ao schema junto com o controle de RFID pelo super admin
-- (commit 9ed12c8), mas sem migration: bancos criados só com `migrate deploy`
-- quebravam em toda consulta de tenant. IF NOT EXISTS porque bancos de
-- desenvolvimento sincronizados via `db push` já têm a coluna.
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "rfid_disponivel" BOOLEAN NOT NULL DEFAULT false;
