-- Caixa administrativo: conferência de fechamento e vínculo movimento ↔ pagamento
-- (aplicada automaticamente pelo migrate.js, que checa se a coluna já existe)
ALTER TABLE caixa ADD COLUMN valor_contado         DECIMAL(10,2) DEFAULT NULL; -- dinheiro contado na gaveta no fechamento
ALTER TABLE caixa ADD COLUMN diferenca             DECIMAL(10,2) DEFAULT NULL; -- contado - esperado (quebra de caixa)
ALTER TABLE caixa ADD COLUMN observacao_fechamento VARCHAR(255)  DEFAULT NULL;
ALTER TABLE caixa ADD COLUMN fechado_por           INT           DEFAULT NULL; -- usuário que fechou

-- Vincula o movimento do extrato ao pagamento que o originou (permite estorno)
ALTER TABLE movimentos_caixa ADD COLUMN pagamento_id INT DEFAULT NULL;
