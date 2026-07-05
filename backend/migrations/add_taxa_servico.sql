-- Taxa de serviço
-- pedidos.taxa_pct: 0 = sem taxa; > 0 = taxa aplicada com esse percentual
-- configuracoes.taxa_servico_pct: percentual padrão sugerido ao aplicar (ex.: 10%)
ALTER TABLE pedidos       ADD COLUMN taxa_pct DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE configuracoes ADD COLUMN taxa_servico_pct DECIMAL(5,2) NOT NULL DEFAULT 10.00;
