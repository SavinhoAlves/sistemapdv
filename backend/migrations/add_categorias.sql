-- ============================================================
-- MIGRAÇÃO: Tabela de Categorias
-- Execute este arquivo em bancos já existentes.
-- ============================================================

CREATE TABLE IF NOT EXISTS categorias (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Adiciona FK à tabela produtos (sem remover o campo texto legado)
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS categoria_id INT DEFAULT NULL AFTER categoria,
  ADD CONSTRAINT fk_produtos_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    ON DELETE SET NULL;
