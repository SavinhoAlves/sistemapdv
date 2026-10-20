import path from 'node:path'
import pdfmake from 'pdfmake'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { DadosContrato } from './contrato'

/**
 * PDF do contrato, montado só a partir dos dados da versão (nunca do banco),
 * para que a versão N saia sempre igual.
 *
 * O texto foi escrito para um prestador pessoa física licenciando um SaaS a
 * um estabelecimento comercial. Não substitui a revisão de um advogado.
 */

const FONTES = path.join(path.dirname(require.resolve('pdfmake/package.json')), 'fonts', 'Roboto')
pdfmake.setFonts({
  Roboto: {
    normal: path.join(FONTES, 'Roboto-Regular.ttf'),
    bold: path.join(FONTES, 'Roboto-Medium.ttf'),
    italics: path.join(FONTES, 'Roboto-Italic.ttf'),
    bolditalics: path.join(FONTES, 'Roboto-MediumItalic.ttf'),
  },
})
// O documento não referencia arquivos nem URLs; bloqueia os dois por garantia
pdfmake.setUrlAccessPolicy(() => false)
pdfmake.setLocalAccessPolicy((p) => p.startsWith(FONTES))

// ── Textos auxiliares ────────────────────────────────────────────────────────

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const CICLO_TXT: Record<string, { nome: string; periodo: string }> = {
  mensal: { nome: 'mensal', periodo: '1 (um) mês' },
  trimestral: { nome: 'trimestral', periodo: '3 (três) meses' },
  semestral: { nome: 'semestral', periodo: '6 (seis) meses' },
  anual: { nome: 'anual', periodo: '12 (doze) meses' },
}

export function dataExtenso(s: string) {
  const [a, m, d] = s.split('-').map(Number)
  return `${d} de ${MESES[m - 1]} de ${a}`
}
const dataBR = (s: string) => s.split('-').reverse().join('/')

const UNI = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

function ate999(n: number): string {
  if (n === 100) return 'cem'
  const partes: string[] = []
  if (n >= 100) partes.push(CEM[Math.floor(n / 100)])
  const r = n % 100
  if (r >= 20) partes.push(DEZ[Math.floor(r / 10)] + (r % 10 ? ` e ${UNI[r % 10]}` : ''))
  else if (r > 0) partes.push(UNI[r])
  return partes.join(' e ')
}

/** Inteiro por extenso (até 999.999). */
export function extenso(n: number): string {
  if (n === 0) return 'zero'
  const mil = Math.floor(n / 1000)
  const resto = n % 1000
  const m = mil === 0 ? '' : mil === 1 ? 'mil' : `${ate999(mil)} mil`
  if (!resto) return m
  if (!m) return ate999(resto)
  // "mil e cem", "dois mil e trinta", mas "mil duzentos e dez"
  const liga = resto < 100 || resto % 100 === 0 ? ' e ' : ' '
  return m + liga + ate999(resto)
}

export function moedaExtenso(v: number) {
  const reais = Math.floor(v + 1e-9)
  const centavos = Math.round((v - reais) * 100)
  const r = reais ? `${extenso(reais)} ${reais === 1 ? 'real' : 'reais'}` : ''
  const c = centavos ? `${extenso(centavos)} ${centavos === 1 ? 'centavo' : 'centavos'}` : ''
  return [r, c].filter(Boolean).join(' e ') || 'zero reais'
}

const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const nx = (n: number) => `${n} (${extenso(n)})`

// ── Documento ────────────────────────────────────────────────────────────────

export function gerarContratoPdf(d: DadosContrato, versao: { numero: number; criadaEm: Date }): Promise<Buffer> {
  const { contratada: cd, contratante: ct, condicoes: co, regras: rg } = d
  const ciclo = CICLO_TXT[co.ciclo] ?? CICLO_TXT.mensal
  const cobra = !co.isento && co.valor != null && co.valor > 0

  const ctEndereco = [ct.endereco, [ct.cidade, ct.uf].filter(Boolean).join('/')].filter(Boolean).join(', ')
  const ctDoc = ct.cnpj ? `inscrita no CNPJ sob o nº ${ct.cnpj}` : null
  const ctRep = ct.responsavel
    ? `neste ato representada por ${ct.responsavel}${ct.cpfResponsavel ? `, CPF nº ${ct.cpfResponsavel}` : ''}`
    : null

  // Cláusulas numeradas na ordem em que aparecem (a de teste é opcional)
  let n = 0
  const clausulas: Content[] = []
  const clausula = (titulo: string, ...corpo: Content[]) => {
    n++
    clausulas.push({ text: `CLÁUSULA ${n}ª — ${titulo.toUpperCase()}`, style: 'clausula' }, ...corpo)
    return n
  }
  const p = (...t: any[]): Content => ({ text: t, style: 'p' })
  const par = (rotulo: string, ...t: any[]): Content => ({ text: [{ text: `${rotulo} `, bold: true }, ...t], style: 'p' })
  const lista = (itens: any[]): Content => ({ ol: itens.map(i => (Array.isArray(i) ? { text: i } : i)), type: 'lower-alpha', style: 'lista' })
  const b = (t: string) => ({ text: t, bold: true })

  clausula('Do objeto',
    p('O presente contrato tem por objeto o licenciamento de uso, não exclusivo e intransferível, do sistema de ponto de venda ', b('Restaurante PDV'), ', disponibilizado pela internet na modalidade ', { text: 'Software as a Service', italics: true }, ' (SaaS), no plano ', b(co.plano), ', acompanhado dos serviços de hospedagem, manutenção, atualização e suporte técnico descritos neste instrumento.'),
    par('Parágrafo único.', 'O acesso é feito por navegador, com login individual para cada usuário cadastrado pela CONTRATANTE. Os recursos disponíveis são os do plano contratado, podendo a CONTRATADA liberar recursos adicionais por mera liberalidade, sem que isso gere direito adquirido.'),
  )

  if (co.testeAte) {
    clausula('Do período de teste',
      p('A CONTRATANTE poderá utilizar o sistema gratuitamente até ', b(dataExtenso(co.testeAte)), ', inclusive, para avaliação.'),
      par('§1º', 'Durante o período de teste não há cobrança nem multa por desistência. Não havendo contratação até o fim do período, o acesso será suspenso automaticamente, sem tolerância.'),
      par('§2º', `Os dados inseridos durante o teste ficarão disponíveis por ${nx(rg.guardaDadosDias)} dias após o término e, não havendo contratação, poderão ser excluídos definitivamente.`),
    )
  }

  clausula('Da vigência',
    p('Este contrato entra em vigor em ', b(co.dataInicio ? dataExtenso(co.dataInicio) : 'na data de sua assinatura'),
      ...(co.dataFim
        ? [' e vigora até ', b(dataExtenso(co.dataFim)), ', podendo ser renovado por acordo entre as partes.']
        : [` e vigora por prazo indeterminado, em períodos sucessivos de ${ciclo.periodo}, renovados automaticamente com o pagamento de cada período.`])),
  )

  clausula('Do preço e da forma de pagamento',
    ...(cobra
      ? [
          p('Pela licença e pelos serviços, a CONTRATANTE pagará à CONTRATADA ', b(`${moeda(co.valor!)} (${moedaExtenso(co.valor!)})`), ` por período ${ciclo.nome}, com vencimento no dia `, b(String(co.diaVencimento)), ` do mês correspondente${co.ciclo === 'mensal' ? '' : ' ao início de cada período'}.`),
          par('§1º', 'O pagamento é antecipado: cada pagamento libera o uso do sistema pelo período seguinte. O pagamento poderá ser feito por PIX, transferência bancária ou outro meio aceito pela CONTRATADA, valendo o comprovante como recibo.'),
          par('§2º', 'O valor será reajustado a cada 12 (doze) meses pela variação positiva do IPCA/IBGE acumulada no período, ou por outro índice que o substitua, mediante aviso à CONTRATANTE com antecedência mínima de 30 (trinta) dias.'),
          par('§3º', 'Mudança de plano ou de ciclo a pedido da CONTRATANTE será formalizada em nova versão deste contrato, valendo o novo preço a partir do período seguinte.'),
        ]
      : [
          p('Durante a vigência desta versão, o uso do sistema é concedido ', b('sem cobrança'), ', por liberalidade da CONTRATADA.'),
          par('Parágrafo único.', `A CONTRATADA poderá passar a cobrar pelo uso mediante aviso com antecedência mínima de ${nx(rg.avisoPrevioDias)} dias, por meio de nova versão deste contrato. Não aceita a cobrança, a CONTRATANTE poderá rescindir sem ônus.`),
        ]),
  )

  const cAtraso = clausula('Do atraso e da suspensão do acesso',
    p(`O não pagamento até o vencimento sujeita o valor em aberto a multa moratória de ${nx(rg.multaAtrasoPct)} por cento, juros de mora de ${nx(rg.jurosMesPct)} por cento ao mês calculados dia a dia e correção monetária pelo IPCA/IBGE, contados do vencimento até o efetivo pagamento.`),
    par('§1º', `Após o vencimento, a CONTRATANTE terá ${nx(rg.toleranciaDias)} dias de tolerância com o sistema funcionando normalmente. Encerrada a tolerância sem pagamento, o acesso será suspenso automaticamente, independentemente de aviso, sem prejuízo da cobrança dos valores devidos.`),
    par('§2º', 'Confirmado o pagamento, o acesso será restabelecido em até 1 (um) dia útil. A suspensão não apaga nem altera os dados da CONTRATANTE.'),
    par('§3º', 'A tolerância concedida não altera a data de vencimento, que continua sendo o marco para a incidência dos encargos e para o período seguinte.'),
  )

  clausula('Das obrigações da CONTRATADA',
    lista([
      'manter o sistema disponível, ressalvadas as interrupções para manutenção, que serão realizadas preferencialmente fora do horário comercial e, quando programadas, avisadas com antecedência;',
      'realizar cópias de segurança (backup) dos dados com frequência mínima diária;',
      `prestar suporte técnico pelo e-mail ${cd.email} ou pelo canal de atendimento informado à CONTRATANTE, em dias úteis, em horário comercial;`,
      'corrigir falhas do sistema que impeçam o uso regular, em prazo razoável conforme a gravidade;',
      'guardar sigilo sobre os dados da CONTRATANTE e não os compartilhar com terceiros, salvo por ordem legal ou judicial.',
    ]),
  )

  const cObrigContratante = clausula('Das obrigações da CONTRATANTE',
    lista([
      'pagar pontualmente os valores previstos neste contrato;',
      'manter em sigilo as senhas de acesso e responder pelo uso feito com os logins que cadastrar;',
      'manter seus dados cadastrais atualizados;',
      'utilizar o sistema somente para fins lícitos e no próprio estabelecimento, cumprindo por conta própria suas obrigações fiscais, trabalhistas e sanitárias;',
      'providenciar os equipamentos, a conexão com a internet e as impressoras necessários ao uso.',
    ]),
    par('Parágrafo único.', 'É vedado à CONTRATANTE, sob pena da multa da Cláusula {{MULTA}}ª: copiar, modificar, descompilar ou fazer engenharia reversa do sistema; sublicenciar, alugar, revender ou ceder o acesso a terceiros estranhos ao seu estabelecimento; e tentar burlar os mecanismos de licença, de segurança ou de cobrança.'),
  )

  clausula('Da propriedade intelectual',
    p('O sistema, seu código-fonte, telas, marca e documentação pertencem exclusivamente à CONTRATADA, protegidos pela Lei nº 9.609/1998 e pela Lei nº 9.610/1998. Este contrato concede apenas licença de uso pelo prazo de vigência, sem transferência de qualquer direito de propriedade.'),
    par('Parágrafo único.', 'Os dados cadastrados pela CONTRATANTE (produtos, vendas, clientes e demais registros) pertencem a ela.'),
  )

  clausula('Da proteção de dados pessoais',
    p('As partes cumprirão a Lei nº 13.709/2018 (LGPD). A CONTRATANTE é a controladora dos dados pessoais que inserir no sistema e a CONTRATADA atua como operadora, tratando-os apenas para executar este contrato e conforme as instruções da CONTRATANTE.'),
    par('Parágrafo único.', 'A CONTRATADA adotará medidas técnicas razoáveis de segurança e comunicará à CONTRATANTE, em prazo razoável, qualquer incidente que possa acarretar risco aos titulares.'),
  )

  clausula('Da limitação de responsabilidade',
    p('A CONTRATADA não responde por danos indiretos ou lucros cessantes, nem por falhas decorrentes de:'),
    lista([
      'uso inadequado do sistema ou descumprimento deste contrato pela CONTRATANTE ou por seus usuários;',
      'falhas de internet, energia elétrica, equipamentos da CONTRATANTE ou serviços de terceiros;',
      'caso fortuito ou força maior, nos termos do art. 393 do Código Civil.',
    ]),
    par('Parágrafo único.', 'Em qualquer hipótese, a responsabilidade da CONTRATADA fica limitada ao total pago pela CONTRATANTE nos 3 (três) meses anteriores ao fato, salvo dolo ou culpa grave.'),
  )

  clausula('Da rescisão',
    p('Este contrato poderá ser rescindido:'),
    lista([
      [b('por qualquer das partes, sem justo motivo, '), `mediante aviso por escrito com antecedência mínima de ${nx(rg.avisoPrevioDias)} dias, sem multa. Não haverá devolução proporcional do período já pago, cujo acesso será mantido até o seu término;`],
      [b('pela CONTRATADA, por inadimplência, '), `de pleno direito e independentemente de notificação, quando o atraso ultrapassar ${nx(rg.rescisaoInadimplenciaDias)} dias do vencimento, permanecendo devidos os valores vencidos com os encargos da Cláusula ${cAtraso}ª;`],
      [b('por descumprimento de qualquer cláusula, '), 'se a parte notificada não corrigir a falta em 5 (cinco) dias úteis do recebimento da notificação;'],
      [b('de imediato, '), 'em caso de falência, recuperação judicial ou encerramento das atividades de qualquer das partes, ou de uso do sistema para fins ilícitos.'],
    ]),
  )

  const cMulta = clausula('Das penalidades',
    p(`A violação do parágrafo único da Cláusula ${cObrigContratante}ª sujeita a CONTRATANTE a multa não compensatória equivalente a ${nx(rg.multaInfracaoMensalidades)} vezes o valor mensal vigente`, cobra ? '' : ' (ou ao valor mensal do plano, se o uso for sem cobrança)', ', além da suspensão imediata do acesso, sem prejuízo da indenização pelo prejuízo que exceder a multa (art. 416, parágrafo único, do Código Civil).'),
    par('§1º', 'A parte que der causa à rescisão por descumprimento responde pelas perdas e danos que causar à outra.'),
    par('§2º', 'Havendo necessidade de cobrança judicial ou extrajudicial, a parte inadimplente arcará também com as custas e com honorários advocatícios de 10% (dez por cento) sobre o valor do débito.'),
  )

  clausula('Do término e da devolução dos dados',
    p(`Encerrado o contrato por qualquer motivo, a CONTRATADA manterá os dados da CONTRATANTE por ${nx(rg.guardaDadosDias)} dias, período em que, mediante solicitação e quitação dos valores em aberto, fornecerá cópia dos principais registros em formato de planilha. Após esse prazo, os dados poderão ser excluídos definitivamente, ressalvada a guarda exigida por lei.`),
  )

  clausula('Das disposições gerais',
    lista([
      'este contrato substitui qualquer acordo anterior sobre o mesmo objeto; alterações só valem por escrito, inclusive por nova versão deste documento aceita pela CONTRATANTE;',
      'a tolerância de uma parte quanto ao descumprimento da outra não importa novação nem renúncia ao direito de exigir o cumprimento;',
      'a nulidade de uma cláusula não prejudica as demais;',
      'não há entre as partes, nem entre a CONTRATADA e os empregados da CONTRATANTE, vínculo empregatício, societário ou de representação;',
      'a CONTRATANTE não poderá ceder este contrato sem anuência da CONTRATADA. A CONTRATADA poderá cedê-lo a pessoa jurídica da qual seja titular ou sócia, mantidas as condições aqui previstas, mediante simples comunicação à CONTRATANTE.',
    ]),
  )

  clausula('Das comunicações e da assinatura',
    p('As comunicações entre as partes serão válidas quando feitas por e-mail ou por mensagem de aplicativo aos contatos informados neste contrato.'),
    par('Parágrafo único.', 'As partes admitem a assinatura deste contrato por meio eletrônico, inclusive por plataforma de assinatura digital, reconhecendo sua validade nos termos do art. 10, §2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020.'),
  )

  clausula('Do foro',
    p('Fica eleito o foro da Comarca de ', b(cd.foro), ' para resolver qualquer questão decorrente deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.'),
  )

  // A referência à cláusula de multa só é conhecida depois de numerar todas
  const ajustar = (c: any): any => {
    if (Array.isArray(c)) return c.map(ajustar)
    if (typeof c === 'string') return c.replace('{{MULTA}}', String(cMulta))
    if (c && typeof c === 'object') return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, ajustar(v)]))
    return c
  }

  const linha = (rotulo: string, valor: string | null | undefined) =>
    valor ? [{ text: rotulo, style: 'rot' }, { text: valor, style: 'val' }] : null

  const quadro = [
    linha('Plano', co.plano),
    linha('Valor', cobra ? `${moeda(co.valor!)} por período ${ciclo.nome}` : 'Sem cobrança'),
    cobra ? linha('Vencimento', `Dia ${co.diaVencimento}`) : null,
    linha('Início', co.dataInicio ? dataBR(co.dataInicio) : 'Na assinatura'),
    linha('Término', co.dataFim ? dataBR(co.dataFim) : 'Prazo indeterminado'),
    co.testeAte ? linha('Teste grátis até', dataBR(co.testeAte)) : null,
    cobra ? linha('Tolerância', `${rg.toleranciaDias} dias após o vencimento`) : null,
  ].filter(Boolean) as any[][]

  const assinatura = (nome: string, papel: string, doc?: string | null): Content => ({
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 0.6, lineColor: '#333' }], margin: [0, 36, 0, 4] },
      { text: nome, bold: true, fontSize: 9.5 },
      { text: papel, fontSize: 8.5, color: '#555' },
      doc ? { text: doc, fontSize: 8.5, color: '#555' } : '',
    ],
  })

  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [56, 60, 56, 56],
    info: {
      title: `Contrato ${ct.codigo} — ${ct.nome} — versão ${versao.numero}`,
      author: cd.nome,
      subject: 'Contrato de licença de uso de software (SaaS)',
    },
    defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.25, color: '#1a1a1a' },
    styles: {
      titulo: { fontSize: 13, bold: true, alignment: 'center', margin: [0, 0, 0, 4] },
      sub: { fontSize: 8.5, alignment: 'center', color: '#666', margin: [0, 0, 0, 16] },
      secao: { fontSize: 10, bold: true, margin: [0, 10, 0, 6], color: '#111' },
      clausula: { fontSize: 9.5, bold: true, margin: [0, 10, 0, 4] },
      p: { margin: [0, 0, 0, 4] },
      lista: { margin: [8, 0, 0, 4] },
      rot: { fontSize: 8.5, color: '#555' },
      val: { fontSize: 9, bold: true },
    },
    footer: (pagina, total) => ({
      columns: [
        { text: `Contrato ${ct.codigo} · ${ct.nome} · versão ${versao.numero}`, fontSize: 7.5, color: '#888' },
        { text: `Página ${pagina} de ${total}`, alignment: 'right', fontSize: 7.5, color: '#888' },
      ],
      margin: [56, 20, 56, 0],
    }),
    content: ajustar([
      { text: 'CONTRATO DE LICENÇA DE USO DE SOFTWARE E PRESTAÇÃO DE SERVIÇOS', style: 'titulo' },
      { text: `Restaurante PDV · Código do cliente ${ct.codigo} · Versão ${versao.numero}, de ${dataBR(versao.criadaEm.toISOString().slice(0, 10))}`, style: 'sub' },

      { text: 'AS PARTES', style: 'secao' },
      p(b('CONTRATADA: '), `${cd.nome}, pessoa física, inscrito no CPF sob o nº ${cd.cpf}, residente e domiciliado na ${cd.endereco}, ${cd.cidade}/${cd.uf}, e-mail ${cd.email}.`),
      p(b('CONTRATANTE: '), [ct.nome, ctDoc, ctEndereco ? `com endereço em ${ctEndereco}` : null, ctRep].filter(Boolean).join(', ') + '.',
        ct.telefone || ct.contato ? ` Contato: ${[ct.telefone, ct.contato].filter(Boolean).join(' · ')}.` : ''),
      p('As partes acima têm entre si justo e contratado o presente instrumento, que se regerá pelas cláusulas e condições a seguir.'),

      { text: 'QUADRO-RESUMO', style: 'secao' },
      {
        table: { widths: [110, '*'], body: quadro },
        layout: {
          hLineWidth: () => 0.5, vLineWidth: () => 0,
          hLineColor: () => '#ddd', paddingTop: () => 4, paddingBottom: () => 4,
        },
        margin: [0, 0, 0, 6],
      },
      { text: 'Em caso de divergência, prevalecem as cláusulas abaixo.', fontSize: 8, color: '#666', italics: true },

      { text: 'CLÁUSULAS', style: 'secao' },
      ...clausulas,

      ...(co.observacoes
        ? [{ text: 'CONDIÇÕES ESPECÍFICAS', style: 'secao' } as Content,
           p(`As condições abaixo, combinadas entre as partes, complementam as cláusulas acima e prevalecem sobre elas no que forem diferentes: ${co.observacoes}`)]
        : []),

      {
        stack: [
          p('E, por estarem de acordo, as partes assinam este contrato, em 2 (duas) vias de igual teor, ou eletronicamente, na presença das testemunhas abaixo.'),
          { text: `${cd.cidade}/${cd.uf}, ____ de ____________________ de ________.`, margin: [0, 8, 0, 0] },
          {
            columns: [
              assinatura(ct.nome, 'CONTRATANTE', ct.responsavel ? `p/ ${ct.responsavel}${ct.cpfResponsavel ? ` · CPF ${ct.cpfResponsavel}` : ''}` : null),
              assinatura(cd.nome, 'CONTRATADA', `CPF ${cd.cpf}`),
            ],
            columnGap: 30,
          },
          {
            columns: [
              assinatura('Testemunha 1', 'Nome:', 'CPF:'),
              assinatura('Testemunha 2', 'Nome:', 'CPF:'),
            ],
            columnGap: 30,
          },
        ],
        unbreakable: true,
        margin: [0, 14, 0, 0],
      },
    ]),
  }

  return pdfmake.createPdf(doc).getBuffer()
}
