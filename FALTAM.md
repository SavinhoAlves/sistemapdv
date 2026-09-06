# Arquivos que ainda faltam

Estes 6 vieram corrompidos no `.rar` original e **não estão nesta árvore**.
Copie-os do seu projeto atual antes de rodar o frontend — sem eles o Nuxt
não compila.

```
frontend/pages/configuracoes.vue
frontend/pages/m/index.vue
frontend/pages/m/mesas.vue
frontend/stores/carrinhoVenda.ts
frontend/components/modals/ModalEstoque.vue
frontend/plugins/api-url.client.ts
```

`carrinhoVenda.ts` precisa de um ajuste: a venda de balcão agora manda
`{ produtoId, quantidade }` e **não manda mais `precoUnit`**. O preço vem do
banco (ver `backend/src/modules/vendas/vendas.service.ts`). A store também
precisa gerar uma `idempotencyKey` com `crypto.randomUUID()` por venda.

O backend está completo — os 4 arquivos de rota que você mandou foram
integrados e reescritos contra os services novos.
