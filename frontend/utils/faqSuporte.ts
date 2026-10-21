/**
 * Perguntas frequentes da página de Suporte. Cada resposta descreve o caminho
 * pelas telas como ele é hoje — ao mudar uma tela, revise a resposta aqui.
 * `tipo` é o tipo de chamado sugerido quando a resposta não resolve.
 */
export interface Pergunta { p: string; r: string; tipo: 'bug' | 'instalacao' | 'cobranca' | 'outro' }
export interface GrupoFaq { grupo: string; perguntas: Pergunta[] }

export const FAQ: GrupoFaq[] = [
  {
    grupo: 'Caixa',
    perguntas: [
      {
        p: 'Como abro o caixa?',
        r: 'Use o botão "Abrir caixa" na barra superior e informe o valor inicial (o troco que está na gaveta). Enquanto o caixa estiver fechado, Mesas, Vendas e Cozinha ficam bloqueadas.',
        tipo: 'bug',
      },
      {
        p: 'Como fecho o caixa e confiro a diferença?',
        r: 'Na barra superior, clique em "Fechar caixa", conte o dinheiro da gaveta e informe o valor contado. O sistema mostra a diferença entre o esperado e o contado, e o fechamento fica no histórico em Caixa.',
        tipo: 'bug',
      },
      {
        p: 'Posso cadastrar produtos com o caixa fechado?',
        r: 'Sim. Produtos, Estoque, Relatórios, Configurações e Admin funcionam com o caixa fechado. Só as telas que registram vendas exigem o caixa aberto.',
        tipo: 'outro',
      },
    ],
  },
  {
    grupo: 'Produtos e cozinha',
    perguntas: [
      {
        p: 'Como cadastro um produto?',
        r: 'Em Produtos, clique em "Novo Produto", escolha a categoria (ou crie uma pelo botão +), informe o preço e, se quiser controlar estoque, ative "Gerenciar estoque" e informe o estoque atual e o mínimo.',
        tipo: 'bug',
      },
      {
        p: 'Como faço um item ir para a cozinha?',
        r: 'Quem decide é a categoria. Em Produtos, abra "Categorias" e ligue a chave da cozinha na categoria desejada. Todos os produtos dela passam a aparecer no painel da Cozinha quando forem pedidos.',
        tipo: 'bug',
      },
      {
        p: 'O que significa "Baixo estoque"?',
        r: 'O produto chegou ao estoque mínimo que você definiu. Use o botão de estoque no card do produto para registrar uma entrada, uma saída ou um ajuste de inventário. Tudo fica no histórico com data e usuário.',
        tipo: 'outro',
      },
    ],
  },
  {
    grupo: 'Equipe e acesso',
    perguntas: [
      {
        p: 'Como meus funcionários entram no sistema?',
        r: 'Cada funcionário tem um código no formato CÓDIGO-DO-RESTAURANTE-NÚMERO (ex.: 1001-3) ou um nome de usuário, e uma senha. O código aparece no cadastro do funcionário, em Admin.',
        tipo: 'outro',
      },
      {
        p: 'Como limito o que cada funcionário pode fazer?',
        r: 'Em Admin, cada funcionário tem um cargo. O cargo define as telas e ações liberadas (abrir mesa, cancelar item, mexer no caixa, ver relatórios…). Ajuste o cargo, não a pessoa: todos com o mesmo cargo seguem as mesmas regras.',
        tipo: 'outro',
      },
      {
        p: 'Um funcionário esqueceu a senha. E agora?',
        r: 'O administrador redefine a senha no cadastro do funcionário, em Admin. Se foi o administrador que esqueceu, abra um chamado.',
        tipo: 'outro',
      },
      {
        p: 'Como uso o cartão RFID?',
        r: 'O RFID depende do seu plano. Com ele liberado, ative em Configurações → Acesso e cadastre o cartão de cada funcionário. A entrada por cartão passa a aparecer na tela de login e nas ações protegidas.',
        tipo: 'instalacao',
      },
    ],
  },
  {
    grupo: 'Impressão',
    perguntas: [
      {
        p: 'A impressora não imprime as fichas.',
        r: 'Confira em Configurações → Impressora: o tipo, o endereço (IP e porta, para impressora de rede) e a largura do papel. Salve e use "Imprimir Teste". Se o teste não sair, verifique se a impressora está ligada e na mesma rede do computador.',
        tipo: 'instalacao',
      },
      {
        p: 'Posso imprimir os pedidos da cozinha numa impressora separada?',
        r: 'Sim. Em Configurações → Impressoras por Destino, escolha a impressora de cada destino (caixa, cozinha, bar).',
        tipo: 'instalacao',
      },
    ],
  },
  {
    grupo: 'Conta e pagamento',
    perguntas: [
      {
        p: 'Apareceu um aviso de mensalidade. O que acontece?',
        r: 'Depois do vencimento há alguns dias de tolerância, com o aviso no topo da tela. Passado esse prazo o sistema é bloqueado até o pagamento ser confirmado. Se já pagou, abra um chamado do tipo Financeiro.',
        tipo: 'cobranca',
      },
      {
        p: 'Onde vejo meu plano e o que ele inclui?',
        r: 'Os recursos do plano (como RFID e vendas pelo celular) aparecem em Configurações → Acesso. Para mudar de plano, abra um chamado do tipo Financeiro.',
        tipo: 'cobranca',
      },
    ],
  },
  {
    grupo: 'Problemas comuns',
    perguntas: [
      {
        p: 'Uma tela ficou em branco ou preta.',
        r: 'Recarregue com Ctrl+Shift+R. Se continuar, abra um chamado dizendo qual tela e, se puder, um print do console do navegador (tecla F12, aba Console).',
        tipo: 'bug',
      },
      {
        p: 'Os dados não atualizam entre os computadores.',
        r: 'As telas se atualizam sozinhas. Se um computador ficou para trás, verifique a internet dele e recarregue a página. O aviso "Sem conexão com o servidor" aparece quando a conexão cai.',
        tipo: 'bug',
      },
    ],
  },
]
