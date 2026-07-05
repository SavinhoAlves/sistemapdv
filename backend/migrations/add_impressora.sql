-- Conexão da impressora térmica (ESC/POS)
-- tipo: 'navegador' (window.print, padrão), 'rede' (TCP porta 9100), 'windows' (impressora compartilhada)
ALTER TABLE configuracoes
  ADD COLUMN impressora_tipo  ENUM('navegador','rede','windows') DEFAULT 'navegador',
  ADD COLUMN impressora_host  VARCHAR(100) DEFAULT NULL,
  ADD COLUMN impressora_porta INT DEFAULT 9100;
