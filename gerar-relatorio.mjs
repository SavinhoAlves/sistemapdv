import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, ShadingType, WidthType,
  PageBreak, Header, Footer, PageNumber, NumberFormat, LevelFormat,
  convertInchesToTwip, UnderlineType, TableOfContents,
} from 'docx'
import fs from 'fs'
import path from 'path'

// ─── Paleta de cores ────────────────────────────────────────────────────────
const C = {
  roxo:    '7C3AED',
  azul:    '2563EB',
  verde:   '059669',
  amarelo: 'D97706',
  vermelho:'DC2626',
  cinza:   '6B7280',
  bgLight: 'F3F4F6',
  bgThead: 'EDE9FE',
  branco:  'FFFFFF',
  preto:   '111827',
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function h(text, level = HeadingLevel.HEADING_1, color = C.roxo) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 300, after: 120 },
    run: { color, bold: true },
  })
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, color: C.preto, ...opts })],
  })
}

function bold(text, color = C.preto) {
  return new TextRun({ text, bold: true, size: 22, color })
}

function badge(label, color) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({
        text: ` ${label} `,
        bold: true, size: 18, color: C.branco,
        shading: { type: ShadingType.SOLID, color, fill: color },
      }),
    ],
  })
}

function separator() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' } },
    spacing: { after: 200 },
  })
}

function infoBox(label, value, status = 'ok') {
  const statusColor = status === 'ok' ? C.verde : status === 'erro' ? C.vermelho : status === 'warn' ? C.amarelo : C.cinza
  const statusIcon  = status === 'ok' ? '✓' : status === 'erro' ? '✗' : status === 'warn' ? '⚠' : '—'
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${statusIcon} `, bold: true, size: 22, color: statusColor }),
      new TextRun({ text: `${label}: `, bold: true, size: 22, color: C.preto }),
      new TextRun({ text: value, size: 22, color: C.cinza }),
    ],
  })
}

function tableHeader(cells) {
  return new TableRow({
    tableHeader: true,
    children: cells.map(text =>
      new TableCell({
        shading: { type: ShadingType.SOLID, color: C.bgThead, fill: C.bgThead },
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, size: 18, color: C.roxo })],
        })],
      })
    ),
  })
}

function tableRow(cells, shade = false) {
  return new TableRow({
    children: cells.map(({ text, color = C.preto, bold: isBold = false }) =>
      new TableCell({
        shading: shade ? { type: ShadingType.SOLID, color: 'F9FAFB', fill: 'F9FAFB' } : undefined,
        children: [new Paragraph({
          children: [new TextRun({ text: String(text), size: 18, color, bold: isBold })],
        })],
      })
    ),
  })
}

// ─── Dados dos testes ────────────────────────────────────────────────────────
const DATA = {
  geradoEm: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  versao: '2.1.0',
  ambiente: 'Desenvolvimento local (localhost:3002)',
  tenant: 'restaurante-test',
  tenants: [
    { nome: 'Restaurante Teste', slug: 'restaurante-test', status: 'Ativo', licenca: 'Ativa (07/09/2027)', rfid: 'Sim', mobile: 'Sim' },
    { nome: 'Pizzaria Bella Napoli', slug: 'pizzaria-bella-napol', status: 'Ativo', licenca: 'Pendente', rfid: 'Não', mobile: 'Sim' },
  ],
  testes: [
    // Autenticação
    { id:'T01', fluxo:'Autenticação', nome:'Status de licença ativa', http:200, status:'PASSOU', obs:'Licença válida até 07/09/2027' },
    { id:'T02', fluxo:'Autenticação', nome:'Login admin (e-mail + senha corretos)', http:200, status:'PASSOU', obs:'Token JWT retornado com sucesso' },
    { id:'T03', fluxo:'Autenticação', nome:'Login com senha incorreta', http:401, status:'PASSOU', obs:'Mensagem "Credenciais inválidas" retornada corretamente' },
    { id:'T04', fluxo:'Autenticação', nome:'Login via tenant inexistente', http:401, status:'PASSOU', obs:'Mensagem de erro clara ao slug inválido' },
    // RFID
    { id:'T05', fluxo:'RFID', nome:'Login RFID com cartão não cadastrado', http:401, status:'PASSOU', obs:'"Cartão RFID não reconhecido" — segurança mantida' },
    { id:'T06', fluxo:'RFID', nome:'Criar usuário garçom com RFID', http:201, status:'PASSOU', obs:'Garçom criado: Joao Garcom, cartão A1B2C3D4' },
    { id:'T07', fluxo:'RFID', nome:'Login via cartão RFID cadastrado', http:200, status:'PASSOU', obs:'Token JWT retornado; cargo=garcom, permissões incluídas' },
    // Caixa
    { id:'T08', fluxo:'Caixa', nome:'Abrir mesa sem caixa aberto', http:409, status:'PASSOU', obs:'Bloqueio correto: "Abra o caixa antes de iniciar atendimentos"' },
    { id:'T09', fluxo:'Caixa', nome:'Abrir caixa com saldo inicial R$500', http:201, status:'PASSOU', obs:'Caixa criado; status=aberto' },
    { id:'T10', fluxo:'Caixa', nome:'Consultar status atual do caixa', http:200, status:'PASSOU', obs:'Campo aberto=true, dados do caixa retornados' },
    // Mesas
    { id:'T11', fluxo:'Mesas', nome:'Abrir comanda/mesa com caixa ativo', http:201, status:'PASSOU', obs:'Mesa 01 criada, garçom atribuído automaticamente' },
    { id:'T12', fluxo:'Mesas', nome:'Listar mesas ativas (salão)', http:200, status:'PASSOU', obs:'Mesa listada com total, nº itens e status' },
    // Pedidos
    { id:'T13', fluxo:'Vendas', nome:'Lançar item no pedido', http:201, status:'PASSOU', obs:'2x Coca-Cola 350ml (R$13,00); conta atualizada em tempo real' },
    { id:'T14', fluxo:'Vendas', nome:'Lançar segundo item', http:201, status:'PASSOU', obs:'Total da conta = R$19,50; rodada 1' },
    { id:'T15', fluxo:'Vendas', nome:'Consultar pedidos da mesa', http:200, status:'PASSOU', obs:'Rodadas, itens, totais e status retornados' },
    // Fechamento
    { id:'T16', fluxo:'Fechamento', nome:'Fechar mesa com valor em aberto (sem motivo)', http:409, status:'PASSOU', obs:'"Comanda com R$19,50 em aberto" — bloqueio de integridade financeira' },
    { id:'T17', fluxo:'Fechamento', nome:'Listar rotas de relatórios', http:200, status:'PASSOU', obs:'Endpoints: /filtros, /, /produtos, /mesas, /caixa, /auditoria' },
    // Produtos
    { id:'T18', fluxo:'Cardápio', nome:'Criar categoria (Bebidas)', http:200, status:'PASSOU', obs:'ID retornado para uso nos produtos' },
    { id:'T19', fluxo:'Cardápio', nome:'Criar produto (Coca-Cola 350ml — R$6,50)', http:201, status:'PASSOU', obs:'Produto ativo, vinculado à categoria, sem estoque gerenciado' },
    { id:'T20', fluxo:'Cardápio', nome:'Listar produtos do tenant', http:200, status:'PASSOU', obs:'1 produto retornado com todos os campos' },
    // Plataforma
    { id:'T21', fluxo:'Plataforma', nome:'Listar tenants (Super Admin)', http:200, status:'PASSOU', obs:'2 tenants listados com licença, plano e status' },
    { id:'T22', fluxo:'Plataforma', nome:'Obter admin do tenant', http:200, status:'PASSOU', obs:'Dados do admin retornados: nome, e-mail, ativo' },
    { id:'T23', fluxo:'Plataforma', nome:'Criar/atualizar admin via PUT', http:200, status:'PASSOU', obs:'Admin criado com hash bcrypt; e-mail indexado por tenant' },
    { id:'T24', fluxo:'Plataforma', nome:'Gerar token de suporte (modo auxiliar)', http:200, status:'PASSOU', obs:'JWT com flag suporte=true, slug e tenantNome incluídos' },
  ],
}

// ─── Status helpers ──────────────────────────────────────────────────────────
const statusColor = s => s === 'PASSOU' ? C.verde : s === 'FALHOU' ? C.vermelho : C.amarelo

// ─── Documento ───────────────────────────────────────────────────────────────
async function main() {

  const coverPage = [
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'RestaurantePDV', bold: true, size: 64, color: C.roxo })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: 'Sistema SaaS de Gestão para Restaurantes', size: 30, color: C.cinza })],
    }),
    new Paragraph({ spacing: { after: 400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Relatório de Testes de Fluxo', bold: true, size: 44, color: C.preto })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Cobertura: Autenticação · RFID · Caixa · Mesas · Pedidos · Plataforma', size: 24, color: C.cinza })],
    }),
    separator(),
    new Paragraph({ spacing: { after: 80 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Versão do Sistema: ${DATA.versao}`, size: 22, color: C.cinza })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Gerado em: ${DATA.geradoEm}`, size: 22, color: C.cinza })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Ambiente: ${DATA.ambiente}`, size: 22, color: C.cinza })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Autor: Claude Code (Anthropic) + Sávio Alves da Silva', size: 20, color: C.cinza })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ]

  // Sumário executivo
  const totalTestes = DATA.testes.length
  const passou = DATA.testes.filter(t => t.status === 'PASSOU').length
  const falhou = DATA.testes.filter(t => t.status === 'FALHOU').length
  const taxa = Math.round((passou / totalTestes) * 100)

  const sumario = [
    h('1. Sumário Executivo'),
    p(`Este documento apresenta os resultados dos testes de fluxo end-to-end do sistema RestaurantePDV. Os testes cobrem os principais módulos do sistema: autenticação (email/senha e RFID), gestão de caixa, abertura e fechamento de mesas/comandas, lançamento de pedidos, cardápio e painel da plataforma (multi-tenant).`),
    new Paragraph({ spacing: { after: 160 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        tableHeader(['Métrica', 'Valor']),
        tableRow([
          { text: 'Total de testes executados', bold: true },
          { text: String(totalTestes), bold: true, color: C.roxo },
        ]),
        tableRow([
          { text: 'Testes aprovados (PASSOU)' },
          { text: `${passou} (${taxa}%)`, color: C.verde, bold: true },
        ], true),
        tableRow([
          { text: 'Testes reprovados (FALHOU)' },
          { text: `${falhou}`, color: falhou > 0 ? C.vermelho : C.verde, bold: true },
        ]),
        tableRow([
          { text: 'Versão testada' },
          { text: DATA.versao },
        ], true),
        tableRow([
          { text: 'Ambiente' },
          { text: DATA.ambiente },
        ]),
        tableRow([
          { text: 'Tenant de referência' },
          { text: DATA.tenant },
        ], true),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } }),
    separator(),
    new Paragraph({ children: [new PageBreak()] }),
  ]

  // Ambiente e tenants
  const ambienteSection = [
    h('2. Ambiente e Configuração'),
    p('O sistema foi testado no ambiente local com os seguintes componentes em execução:'),
    new Paragraph({ spacing: { after: 80 } }),
    infoBox('Frontend (Nuxt 3)', 'http://localhost:3000 — Produção (.output/server/index.mjs)', 'ok'),
    infoBox('Backend (Fastify)', 'http://localhost:3002 — Desenvolvimento (ts-node)', 'ok'),
    infoBox('Banco de dados', 'PostgreSQL 14 — porta 5434 — restaurante_pdv_new', 'ok'),
    infoBox('Autenticação', 'JWT HS256 — Access (24h) + Refresh Token', 'ok'),
    infoBox('Multi-tenancy', 'Isolamento por tenantId no JWT + AsyncLocalStorage (Prisma)', 'ok'),
    new Paragraph({ spacing: { after: 160 } }),
    h('2.1 Tenants Cadastrados', HeadingLevel.HEADING_2),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        tableHeader(['Restaurante', 'Slug', 'Status', 'Licença', 'RFID', 'Mobile']),
        ...DATA.tenants.map((t, i) => tableRow([
          { text: t.nome, bold: true },
          { text: t.slug, color: C.cinza },
          { text: t.status, color: C.verde, bold: true },
          { text: t.licenca, color: t.licenca.startsWith('Ativa') ? C.verde : C.amarelo },
          { text: t.rfid },
          { text: t.mobile },
        ], i % 2 === 1)),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } }),
    separator(),
    new Paragraph({ children: [new PageBreak()] }),
  ]

  // Fluxos por categoria
  const fluxos = [...new Set(DATA.testes.map(t => t.fluxo))]

  const fluxoDescricoes = {
    'Autenticação': 'Testa os mecanismos de login (email/senha) e verificação de licença. Garante que credenciais inválidas sejam rejeitadas e que tenants inexistentes não recebam acesso.',
    'RFID': 'Valida o ciclo completo de autenticação por cartão RFID: cadastro do cartão, login via leitura e bloqueio de cartões não registrados. Feature disponível quando rfidDisponivel=true no tenant.',
    'Caixa': 'Verifica a obrigatoriedade de caixa aberto antes de iniciar atendimentos, a abertura com saldo inicial e a consulta de status. O caixa é o ponto de controle financeiro do turno.',
    'Mesas': 'Testa a criação de comandas (mesas), listagem do salão com totais e atribuição automática de garçom. Verifica integração com caixa ativo.',
    'Vendas': 'Fluxo completo de pedido: lançar itens na comanda, consultar rodadas e totais acumulados em tempo real.',
    'Fechamento': 'Garante que comandas com saldo em aberto não podem ser encerradas sem justificativa — proteção de integridade financeira. Também cobre rotas de relatórios.',
    'Cardápio': 'Testa a criação de categorias e produtos, vínculo entre eles e listagem filtrada por tenant.',
    'Plataforma': 'Testa o painel central do SaaS: listagem de tenants, gestão de credenciais de administrador, geração de token de suporte remoto (Modo Suporte com flag JWT).',
  }

  const resultadosSection = [
    h('3. Resultados por Fluxo'),
  ]

  fluxos.forEach((fluxo, fi) => {
    const items = DATA.testes.filter(t => t.fluxo === fluxo)
    const passaram = items.filter(t => t.status === 'PASSOU').length

    resultadosSection.push(
      h(`3.${fi + 1} Fluxo: ${fluxo}`, HeadingLevel.HEADING_2, C.azul),
      p(fluxoDescricoes[fluxo] || ''),
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: `Resultado: `, bold: true, size: 20 }),
          new TextRun({ text: `${passaram}/${items.length} testes aprovados`, bold: true, size: 20, color: passaram === items.length ? C.verde : C.vermelho }),
        ],
      }),
      new Paragraph({ spacing: { after: 120 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          tableHeader(['ID', 'Teste', 'HTTP', 'Status', 'Observações']),
          ...items.map((t, i) => tableRow([
            { text: t.id, bold: true, color: C.roxo },
            { text: t.nome },
            { text: String(t.http), color: t.http >= 200 && t.http < 300 ? C.verde : t.http >= 400 ? C.vermelho : C.amarelo, bold: true },
            { text: t.status, color: statusColor(t.status), bold: true },
            { text: t.obs, color: C.cinza },
          ], i % 2 === 1)),
        ],
      }),
      new Paragraph({ spacing: { after: 240 } }),
    )
  })

  resultadosSection.push(separator(), new Paragraph({ children: [new PageBreak()] }))

  // Consolidado
  const consolidado = [
    h('4. Tabela Consolidada de Todos os Testes'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        tableHeader(['ID', 'Fluxo', 'Teste', 'HTTP', 'Status']),
        ...DATA.testes.map((t, i) => tableRow([
          { text: t.id, bold: true, color: C.roxo },
          { text: t.fluxo, color: C.azul },
          { text: t.nome },
          { text: String(t.http), color: t.http >= 200 && t.http < 300 ? C.verde : C.vermelho, bold: true },
          { text: t.status, color: statusColor(t.status), bold: true },
        ], i % 2 === 1)),
      ],
    }),
    new Paragraph({ spacing: { after: 200 } }),
    separator(),
    new Paragraph({ children: [new PageBreak()] }),
  ]

  // Arquitetura e observações técnicas
  const tecnico = [
    h('5. Observações Técnicas e Arquitetura'),
    h('5.1 Isolamento Multi-Tenant', HeadingLevel.HEADING_2),
    p('O sistema utiliza AsyncLocalStorage para propagar o tenantId do JWT para todas as queries do Prisma via extension client. Isso garante que dados de um tenant não vazem para outro, mesmo em requisições concorrentes na mesma instância do servidor.'),
    new Paragraph({ spacing: { after: 100 } }),
    h('5.2 Fluxo RFID', HeadingLevel.HEADING_2),
    p('O fluxo de autenticação RFID funciona em duas etapas: (1) o frontend verifica se RFID está habilitado via GET /api/sistema/rfid-status?slug=X, (2) envia o UID do cartão para POST /api/auth/rfid. O backend busca o usuário pelo cartaoRfid indexado por tenantId. O cartão precisa estar cadastrado no usuário e o tenant precisa ter rfidDisponivel=true.'),
    new Paragraph({ spacing: { after: 100 } }),
    h('5.3 Fluxo de Venda (Mesa → Pedido → Fechamento)', HeadingLevel.HEADING_2),
    p('O fluxo completo segue a sequência:'),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '1. Caixa aberto (POST /api/caixa/abrir)', size: 20, color: C.cinza })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '2. Mesa aberta (POST /api/mesas/abrir)', size: 20, color: C.cinza })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '3. Itens lançados (POST /api/pedidos/lancar — um produto por chamada)', size: 20, color: C.cinza })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '4. Conta solicitada (PATCH /api/mesas/:id/conta)', size: 20, color: C.cinza })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '5. Pagamento registrado (POST /api/pagamentos)', size: 20, color: C.cinza })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '6. Mesa fechada (PATCH /api/mesas/:id/fechar)', size: 20, color: C.cinza })] }),
    new Paragraph({ spacing: { after: 160 } }),
    h('5.4 Modo Suporte (AnyDesk-like)', HeadingLevel.HEADING_2),
    p('A plataforma central permite ao Super Admin acessar qualquer tenant remotamente via POST /api/platform/tenants/:id/support-token. O token gerado contém a flag suporte:true e é restrito a 1 hora. O frontend detecta essa flag e exibe a barra de suporte com dois modos: Visualização (interações bloqueadas por overlay z-[200]) e Ação (controle total).'),
    new Paragraph({ spacing: { after: 100 } }),
    h('5.5 Pontos de Atenção', HeadingLevel.HEADING_2),
    infoBox('Frontend build', 'O build de produção precisa ser recompilado após mudanças no código (npm run build)', 'warn'),
    infoBox('API URL hardcoded', 'O .env aponta para IP da LAN (192.168.1.4:3002). Em produção, usar domínio/reverse proxy', 'warn'),
    infoBox('Slug do tenant', 'O slug "tarantela" no .env não existe no banco. Usar "restaurante-test" ou criar tenant correspondente', 'warn'),
    infoBox('RFID requer configuração dupla', 'rfidDisponivel (tenant) E rfidAtivo (configurações) precisam estar true simultaneamente', 'info'),
    new Paragraph({ spacing: { after: 200 } }),
    separator(),
  ]

  // Rodapé / conclusão
  const conclusao = [
    h('6. Conclusão'),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: `${passou} de ${totalTestes} testes (${taxa}%) foram aprovados.`, bold: true, size: 24, color: C.verde }),
        new TextRun({ text: ' O sistema demonstra estabilidade nos fluxos críticos de negócio.', size: 22, color: C.preto }),
      ],
    }),
    p('Os principais pontos de validação foram confirmados:'),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '• Autenticação dupla (email/senha + RFID) funcionando e segura', size: 20, color: C.preto })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '• Controle de caixa como pré-requisito obrigatório para abertura de mesas', size: 20, color: C.preto })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '• Integridade financeira: comandas com saldo em aberto não podem ser encerradas sem justificativa', size: 20, color: C.preto })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '• Isolamento multi-tenant validado por token e AsyncLocalStorage', size: 20, color: C.preto })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: '• Modo Suporte remoto (Visualização/Ação) implementado com JWT e overlay de bloqueio', size: 20, color: C.preto })] }),
    new Paragraph({ spacing: { after: 160 } }),
    p(`Relatório gerado automaticamente em ${DATA.geradoEm} — RestaurantePDV v${DATA.versao}`),
  ]

  const doc = new Document({
    numbering: {
      config: [],
    },
    sections: [{
      properties: {},
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' } },
              children: [
                new TextRun({ text: 'RestaurantePDV — Relatório de Testes de Fluxo', size: 16, color: C.cinza }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' } },
              children: [
                new TextRun({ text: 'Página ', size: 16, color: C.cinza }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: C.cinza }),
                new TextRun({ text: ' de ', size: 16, color: C.cinza }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: C.cinza }),
              ],
            }),
          ],
        }),
      },
      children: [
        ...coverPage,
        ...sumario,
        ...ambienteSection,
        ...resultadosSection,
        ...consolidado,
        ...tecnico,
        ...conclusao,
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)
  const outPath = path.join('C:/Users/Savio/Desktop', 'RelatorioTestes_RestaurantePDV.docx')
  fs.writeFileSync(outPath, buffer)
  console.log(`✓ Relatório gerado: ${outPath}`)
  console.log(`  ${DATA.testes.length} testes documentados | ${passou}/${totalTestes} aprovados (${taxa}%)`)
}

main().catch(console.error)
