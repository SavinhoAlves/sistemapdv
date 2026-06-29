-- ============================================================
-- RESTAURANTE PDV - Dados Iniciais (Seed)
-- ============================================================

-- Métodos de pagamento
INSERT INTO metodos_pagamento (nome) VALUES
  ('Dinheiro'),
  ('Cartão de Débito'),
  ('Cartão de Crédito'),
  ('PIX'),
  ('Vale Refeição');

-- Produtos
INSERT INTO produtos (nome, descricao, preco, categoria, tempo_preparo_minutos) VALUES
  ('Frango Grelhado', 'Filé de frango grelhado com ervas, acompanha arroz e salada', 34.90, 'Pratos Principais', 20),
  ('Picanha na Brasa', 'Picanha 300g na brasa com manteiga de alho, arroz e farofa', 69.90, 'Pratos Principais', 25),
  ('Batata Frita', 'Porção de batata frita crocante 300g com maionese temperada', 22.90, 'Porções', 15),
  ('Coca-Cola 350ml', 'Refrigerante gelado lata 350ml', 7.90, 'Bebidas', 2),
  ('Brownie com Sorvete', 'Brownie quente de chocolate com sorvete de creme e calda', 19.90, 'Sobremesas', 10),
  ('Cerveja Artesanal 500ml', 'Cerveja artesanal IPA gelada', 16.90, 'Bebidas', 2),
  ('Salada Caesar', 'Salada caesar com croutons, parmesão e molho especial', 28.90, 'Entradas', 10),
  ('Água Mineral 500ml', 'Água mineral sem gás gelada', 5.90, 'Bebidas', 1),
  ('Suco de Laranja Natural', 'Suco natural de laranja 400ml', 12.90, 'Bebidas', 8),
  ('Peixe Grelhado', 'Filé de tilápia grelhado com limão e ervas, acompanha arroz integral', 42.90, 'Pratos Principais', 22);

-- Usuários
-- senha_hash = bcrypt de "admin123" (mesma para todos em dev)
-- pin = bcrypt de cada PIN numérico (gerado via: node -e "console.log(require('bcryptjs').hashSync('PIN', 10))")
INSERT INTO usuarios (nome, email, senha_hash, cartao_rfid, cargo, pin) VALUES
  ('Carlos Administrador', 'admin@restaurante.local',
    '$2b$10$rQnH5ZqJpH9p2cQJCJKhUOxGQFzfQfKaZQNK1mVQhqHFwN4s3Kfq2',
    'RFID-ADMIN-001', 'administrador',
    '$2a$10$M5SJxmXtAdFal4b1fUB.H.1tEUZnMWjHz44..0LAUQXP8ARuhJn0q'),   -- PIN: 1234

  ('João Garçom', 'joao@restaurante.local',
    '$2b$10$rQnH5ZqJpH9p2cQJCJKhUOxGQFzfQfKaZQNK1mVQhqHFwN4s3Kfq2',
    'RFID-GARCOM-001', 'garcom',
    '$2a$10$4s3ahLlcwqqmVD1BCx1etOrY90uWfn1hDbipH20gqaOzKFEfihQ7C'),    -- PIN: 5678

  ('Maria Garçom', 'maria@restaurante.local',
    '$2b$10$rQnH5ZqJpH9p2cQJCJKhUOxGQFzfQfKaZQNK1mVQhqHFwN4s3Kfq2',
    'RFID-GARCOM-002', 'garcom',
    '$2a$10$CkXWf2w5sk549Mf85T5tJ.Vq1Hfk2CxEHeG5wMRfgF6KKkiX1mq4y'),   -- PIN: 9012

  ('Ana Caixa', 'ana@restaurante.local',
    '$2b$10$rQnH5ZqJpH9p2cQJCJKhUOxGQFzfQfKaZQNK1mVQhqHFwN4s3Kfq2',
    'RFID-CAIXA-001', 'caixa',
    '$2a$10$menitN6dy328H.yf83kTY.u.xDtUOwishrAWC9eyIqhrNrEZk7bNe'),    -- PIN: 3456

  ('Pedro Cozinha', 'pedro@restaurante.local',
    '$2b$10$rQnH5ZqJpH9p2cQJCJKhUOxGQFzfQfKaZQNK1mVQhqHFwN4s3Kfq2',
    'RFID-COZINHA-001', 'cozinha',
    '$2a$10$qnQ.PwVOKf0M0qB0ZYdySO6V6Mn5ecOmgAVaYxe/5m4nIQwF2teZO');   -- PIN: 7890

-- Mesas
INSERT INTO mesas (numero, capacidade, status) VALUES
  (1, 4, 'livre'),
  (2, 6, 'livre'),
  (3, 2, 'livre'),
  (4, 8, 'livre'),
  (5, 4, 'livre'),
  (6, 4, 'livre'),
  (7, 6, 'livre'),
  (8, 2, 'livre'),
  (9, 10, 'livre'),
  (10, 4, 'livre');
