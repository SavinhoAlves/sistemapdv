-- Histórico de movimentações de estoque
-- quantidade é o delta com sinal: positivo entra, negativo sai
CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  produto_id         INT NOT NULL,
  tipo               ENUM('entrada','saida','ajuste','venda','cancelamento') NOT NULL,
  quantidade         INT NOT NULL,
  estoque_resultante INT DEFAULT NULL,
  motivo             VARCHAR(150) DEFAULT NULL,
  usuario_id         INT DEFAULT NULL,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_estmov_produto FOREIGN KEY (produto_id) REFERENCES produtos(id),
  INDEX idx_estmov_produto (produto_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
