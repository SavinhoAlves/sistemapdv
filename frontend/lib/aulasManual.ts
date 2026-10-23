/**
 * Manual de uso: cada aula tem um GIF gravado no sistema (public/manual) e o
 * passo a passo em texto. A página pública (/manual) mostra as aulas do
 * restaurante; o painel mostra todas e o link para compartilhar.
 */
export interface AulaManual {
  id: string
  titulo: string
  resumo: string
  /** Quem usa: restaurante (equipe) ou gestor da plataforma */
  para: 'restaurante' | 'gestor'
  gif: string
  passos: string[]
  dica?: string
}

export const AULAS: AulaManual[] = [
  {
    id: 'navegacao', para: 'restaurante', gif: '/manual/manual-01-navegacao.gif',
    titulo: '1. Primeiros passos e navegação',
    resumo: 'O Dashboard, o menu lateral e a tela de Mesas.',
    passos: [
      'Entre em app.restaurantepdv.com.br com o código do restaurante (ex.: 1001-1) ou o usuário e a senha.',
      'O Dashboard mostra o resumo do dia: faturamento, mesas abertas, pedidos e ticket médio.',
      'Toque no logotipo, no canto de cima, para abrir o menu com o nome de cada tela.',
      'Em Mesas, veja as comandas abertas em lista ou em grade, com o estado de cada uma (enviar à cozinha, na cozinha, conta pedida).',
    ],
    dica: 'O topo mostra se o caixa está aberto. Sem caixa aberto, vendas e pedidos ficam bloqueados.',
  },
  {
    id: 'venda-direta', para: 'restaurante', gif: '/manual/manual-02-venda-direta.gif',
    titulo: '2. Venda direta no balcão',
    resumo: 'Montar o carrinho, escolher o pagamento e calcular o troco.',
    passos: [
      'Abra Vendas. Toque em um produto para colocá-lo no carrinho; toque de novo para somar mais uma unidade.',
      'Ajuste a quantidade pelos botões − e + no carrinho, ou use Limpar para começar de novo.',
      'Escolha a forma de pagamento: crédito, débito, dinheiro ou Pix.',
      'No dinheiro, digite o valor recebido: o troco aparece na hora.',
      'Toque em Confirmar Venda para registrar e imprimir a ficha.',
    ],
    dica: 'Produto sem estoque fica apagado e não entra no carrinho.',
  },
  {
    id: 'produtos', para: 'restaurante', gif: '/manual/manual-03-produtos.gif',
    titulo: '3. Cadastro de produtos',
    resumo: 'Foto, categoria e se o produto vai para a cozinha.',
    passos: [
      'Em Produtos, toque em Novo Produto.',
      'Foto é opcional: sem foto, o sistema mostra o ícone da categoria (lanche, bebida, pizza…).',
      'Preencha nome, categoria, preço e estoque.',
      'Em "Enviar para a cozinha": Padrão segue a categoria; Sempre e Nunca são exceções para este produto.',
      'Salve. O produto aparece na venda direta, nas mesas e no cardápio online.',
    ],
  },
  {
    id: 'caixa-estoque', para: 'restaurante', gif: '/manual/manual-04-caixa-estoque.gif',
    titulo: '4. Caixa e estoque',
    resumo: 'Acompanhar o caixa do dia e lançar entradas de estoque.',
    passos: [
      'Em Caixa, veja saldo inicial, entradas, saídas e o dinheiro esperado na gaveta.',
      'Vendas por método e Mesas abertas mostram o que já entrou e o que falta receber.',
      'Em Movimentos, filtre vendas, suprimentos, sangrias e estornos; um pagamento errado pode ser estornado.',
      'Histórico lista os caixas fechados, com a diferença da conferência.',
      'Em Estoque, use + Entrada ou − Saída para registrar compras, perdas e ajustes (com motivo).',
    ],
    dica: 'Estoque baixo = o produto chegou no mínimo que você definiu.',
  },
  {
    id: 'delivery', para: 'restaurante', gif: '/manual/manual-05-delivery.gif',
    titulo: '5. Delivery e cardápio online',
    resumo: 'Quadro de pedidos, mapa e o link do cardápio para o WhatsApp.',
    passos: [
      'Pedidos do cardápio chegam no botão Delivery do topo, com som e aviso, em qualquer tela.',
      'Em Delivery, o Quadro mostra Novos, Na cozinha, Em rota e Finalizados. Aceite para mandar à cozinha.',
      'Escolha o entregador no card; em Mapa, veja a rota de cada entregador com as paradas.',
      'Em Ajustes e link: copie o link do cardápio, imprima o QR e copie a mensagem pronta para a saudação do WhatsApp Business.',
      'Na entrega, o cliente informa o código de 4 dígitos ao entregador; o pagamento entra no caixa.',
    ],
  },
  {
    id: 'relatorios-cozinha', para: 'restaurante', gif: '/manual/manual-06-relatorios-cozinha.gif',
    titulo: '6. Relatórios e cozinha',
    resumo: 'Faturamento por período e a tela da cozinha.',
    passos: [
      'Em Relatórios, escolha o período (Hoje, Ontem, 7 dias, mês) ou datas próprias.',
      'As abas mostram Vendas, Produtos, Mesas, Descontos, Caixa, Estoque e Auditoria; exporte em CSV ou imprima.',
      'A Cozinha recebe os itens na hora, com aviso sonoro: Iniciar → Pronto → Entregue.',
      'Use Tela cheia ou Painel para deixar a cozinha numa TV ou tablet.',
    ],
  },
  {
    id: 'cardapio-cliente', para: 'restaurante', gif: '/manual/manual-07-cardapio-cliente.gif',
    titulo: '7. Como o cliente pede pelo cardápio',
    resumo: 'O caminho do cliente, do link até o pedido.',
    passos: [
      'O cliente abre o link do cardápio (WhatsApp, Instagram ou QR).',
      'Escolhe o produto, escreve uma observação e adiciona à sacola.',
      'Em Continuar, informa entrega ou retirada, dados e forma de pagamento.',
      'Com conta (Entrar), nome, celular e endereços ficam salvos para o próximo pedido.',
      'Depois de enviar, acompanha o pedido em tempo real, com o mapa do entregador.',
    ],
  },
  {
    id: 'painel', para: 'gestor', gif: '/manual/manual-08-painel-central.gif',
    titulo: '8. Central da plataforma (gestor)',
    resumo: 'Restaurantes, contrato, cobranças e planos no painel.',
    passos: [
      'Em painel.restaurantepdv.com.br, a Visão geral mostra restaurantes, receita e pendências.',
      'Restaurantes lista cada cliente; abra um para ver assinatura, contrato, acesso e recursos.',
      'Cobranças mostra quem está em dia ou atrasado; Registrar pagamento empurra o vencimento e libera o acesso.',
      'Planos define o preço e os recursos (RFID, venda pelo celular, delivery) de cada pacote.',
    ],
  },
]
