-- Define quais categorias aparecem no painel da cozinha (KDS)
-- 1 = itens vão para a cozinha (padrão); 0 = não vão (ex.: bebidas prontas)
ALTER TABLE categorias ADD COLUMN vai_cozinha TINYINT(1) NOT NULL DEFAULT 1;
UPDATE categorias SET vai_cozinha = 0 WHERE nome LIKE '%bebida%' OR nome LIKE '%drink%';
