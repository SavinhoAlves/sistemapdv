-- ============================================================
-- RESTAURANTE PDV - Schema SQL Completo
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET time_zone = '-03:00';

-- ============================================================
-- USUÁRIOS / FUNCIONÁRIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) DEFAULT NULL UNIQUE,
  senha_hash VARCHAR(255) DEFAULT NULL,
  cartao_rfid VARCHAR(100) DEFAULT NULL UNIQUE,
  cargo ENUM('administrador','garcom','caixa','cozinha') NOT NULL,
  pin VARCHAR(255) DEFAULT NULL,
  ativo TINYINT(1) DEFAULT 1,
  ultimo_login TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CATEGORIAS
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PRODUTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS produtos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT DEFAULT NULL,
  preco DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  categoria VARCHAR(100) DEFAULT NULL,
  categoria_id INT DEFAULT NULL,
  imagem_url VARCHAR(255) DEFAULT NULL,
  tempo_preparo_minutos INT DEFAULT 0,
  ativo TINYINT(1) DEFAULT 1,
  estoque_atual DECIMAL(10,3) DEFAULT 0,
  estoque_minimo DECIMAL(10,3) DEFAULT 5,
  gerenciar_estoque TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_produtos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- MÉTODOS DE PAGAMENTO
-- ============================================================
CREATE TABLE IF NOT EXISTS metodos_pagamento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  ativo TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CAIXA
-- ============================================================
CREATE TABLE IF NOT EXISTS caixa (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  data_abertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_fechamento TIMESTAMP DEFAULT NULL,
  valor_inicial DECIMAL(10,2) DEFAULT 0.00,
  valor_final DECIMAL(10,2) DEFAULT NULL,
  status ENUM('aberto','fechado') DEFAULT 'aberto',
  observacoes TEXT DEFAULT NULL,
  CONSTRAINT fk_caixa_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS movimentos_caixa (
  id INT AUTO_INCREMENT PRIMARY KEY,
  caixa_id INT NOT NULL,
  tipo ENUM('suprimento','sangria','pagamento','estorno') NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  descricao VARCHAR(255) DEFAULT NULL,
  usuario_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_caixa FOREIGN KEY (caixa_id) REFERENCES caixa(id),
  CONSTRAINT fk_mov_caixa_user FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- MESAS
-- ============================================================
CREATE TABLE IF NOT EXISTS mesas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero INT DEFAULT NULL,
  capacidade INT DEFAULT 4,
  cliente VARCHAR(150) DEFAULT NULL,
  status ENUM('livre','aberta','fechada','ocupada','fechando','finalizada') DEFAULT 'livre',
  garcom_id INT DEFAULT NULL,
  caixa_id INT DEFAULT NULL,
  data_abertura TIMESTAMP DEFAULT NULL,
  data_fechamento TIMESTAMP DEFAULT NULL,
  observacoes VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_mesas_garcom FOREIGN KEY (garcom_id) REFERENCES usuarios(id),
  CONSTRAINT fk_mesas_caixa FOREIGN KEY (caixa_id) REFERENCES caixa(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PEDIDOS
-- ============================================================
CREATE TABLE IF NOT EXISTS pedidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mesa_id INT NOT NULL,
  garcom_id INT DEFAULT NULL,
  status ENUM('aberto','preparando','pronto','entregue','fechado','cancelado') DEFAULT 'aberto',
  total DECIMAL(10,2) DEFAULT 0.00,
  observacoes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedidos_mesa FOREIGN KEY (mesa_id) REFERENCES mesas(id),
  CONSTRAINT fk_pedidos_garcom FOREIGN KEY (garcom_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pedido_itens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pedido_id INT NOT NULL,
  produto_id INT NOT NULL,
  quantidade INT NOT NULL DEFAULT 1,
  preco_unitario DECIMAL(10,2) NOT NULL,
  preco_total DECIMAL(10,2) NOT NULL,
  status ENUM('pendente','preparando','pronto','entregue','cancelado') DEFAULT 'pendente',
  observacao VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_itens_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
  CONSTRAINT fk_itens_produto FOREIGN KEY (produto_id) REFERENCES produtos(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PAGAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS pagamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mesa_id INT NOT NULL,
  pedido_id INT DEFAULT NULL,
  metodo_id INT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  troco DECIMAL(10,2) DEFAULT 0.00,
  caixa_id INT DEFAULT NULL,
  usuario_id INT NOT NULL,
  status ENUM('pendente','confirmado','estornado') DEFAULT 'confirmado',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pagamentos_mesa FOREIGN KEY (mesa_id) REFERENCES mesas(id),
  CONSTRAINT fk_pagamentos_metodo FOREIGN KEY (metodo_id) REFERENCES metodos_pagamento(id),
  CONSTRAINT fk_pagamentos_caixa FOREIGN KEY (caixa_id) REFERENCES caixa(id),
  CONSTRAINT fk_pagamentos_user FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- LICENÇA / CONFIGURAÇÃO DO PDV
-- ============================================================
CREATE TABLE IF NOT EXISTS pdv_config (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  chave_ativacao      VARCHAR(255) NOT NULL,
  status_licenca      ENUM('ativado','pendente','bloqueado') DEFAULT 'pendente',
  data_ativacao       DATETIME DEFAULT NULL,
  data_vencimento     DATETIME DEFAULT NULL,
  ultima_verificacao  DATETIME DEFAULT NULL,
  host_fingerprint    VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- AUDITORIA DE OPERAÇÕES SENSÍVEIS
-- ============================================================
CREATE TABLE IF NOT EXISTS auditoria (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NULL,
  acao        VARCHAR(50) NOT NULL,
  entidade    VARCHAR(50) NULL,
  entidade_id INT NULL,
  detalhes    TEXT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auditoria_acao (acao),
  INDEX idx_auditoria_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================
CREATE INDEX idx_pedidos_mesa ON pedidos(mesa_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedido_itens_pedido ON pedido_itens(pedido_id);
CREATE INDEX idx_pedido_itens_status ON pedido_itens(status);
CREATE INDEX idx_mesas_status ON mesas(status);
CREATE INDEX idx_usuarios_rfid ON usuarios(cartao_rfid);
CREATE INDEX idx_movimentos_caixa_id ON movimentos_caixa(caixa_id);
CREATE INDEX idx_pagamentos_mesa ON pagamentos(mesa_id);
