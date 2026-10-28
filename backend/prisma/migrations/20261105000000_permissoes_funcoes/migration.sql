-- Permissões de cada função (cargo) editáveis por restaurante
ALTER TABLE "configuracoes" ADD COLUMN "permissoes_funcoes" JSONB NOT NULL DEFAULT '{}';
