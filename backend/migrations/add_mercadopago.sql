ALTER TABLE configuracoes
  ADD COLUMN IF NOT EXISTS mp_ativado      TINYINT(1)   DEFAULT 0   AFTER impressora_auto_imprimir,
  ADD COLUMN IF NOT EXISTS mp_access_token TEXT         DEFAULT NULL AFTER mp_ativado,
  ADD COLUMN IF NOT EXISTS mp_device_id    VARCHAR(255) DEFAULT NULL AFTER mp_access_token;
