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

// ── Identidade (a mesma da Platform) ─────────────────────────────────────────

const COR = {
  marca: '#FF7A00', marcaEsc: '#B85500', marcaClara: '#FFF1E2',
  tinta: '#1E1E1E', suave: '#6F6C66', linha: '#E4E1DA', fundo: '#F6F4F0',
}


const ICONE_PATHS = `<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/>
<path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/>
<path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/>`

/** Selo da marca: talheres (ícone Lucide "utensils-crossed", licença ISC) no quadrado laranja, igual à logo da Platform (.pf-logo-m). */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 38 38">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF9B33"/><stop offset="1" stop-color="#FF7A00"/></linearGradient></defs>
<rect width="38" height="38" rx="12" fill="url(#g)"/>
<g transform="translate(9 9) scale(0.8333)" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
${ICONE_PATHS}
</g></svg>`

// ── Fundos (A4 = 595.28 × 841.89 pt) ────────────────────────────────────────

const A4 = { w: 595.28, h: 841.89 }
const HERO_ALTURA = 232

const FAIXA_RODAPE = `<rect y="${A4.h - 5}" width="${A4.w}" height="5" fill="url(#o)"/>`
const GRAD_LARANJA = `<linearGradient id="o" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF9B33"/><stop offset="1" stop-color="#FF7A00"/></linearGradient>`

/** Página 1: faixa escura com brilhos laranja e os talheres grandes, quase transparentes. */
const FUNDO_CAPA = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4.w}" height="${A4.h}" viewBox="0 0 ${A4.w} ${A4.h}">
<defs>
<linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2E1D0E"/><stop offset="0.6" stop-color="#1E1E1E"/><stop offset="1" stop-color="#171717"/></linearGradient>
${GRAD_LARANJA}
</defs>
<rect width="${A4.w}" height="${HERO_ALTURA}" fill="url(#h)"/>
<circle cx="545" cy="-10" r="165" fill="#FF7A00" fill-opacity="0.16"/>
<circle cx="600" cy="190" r="105" fill="#FF9B33" fill-opacity="0.10"/>
<circle cx="-30" cy="${HERO_ALTURA}" r="90" fill="#FF7A00" fill-opacity="0.07"/>
<g transform="translate(408 38) scale(6.4)" fill="none" stroke="#FFFFFF" stroke-opacity="0.07" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">${ICONE_PATHS}</g>
<rect y="${HERO_ALTURA}" width="${A4.w}" height="${A4.h - HERO_ALTURA}" fill="#FFFFFF"/>
<rect y="${HERO_ALTURA}" width="${A4.w}" height="4" fill="url(#o)"/>
${FAIXA_RODAPE}
</svg>`

/** Demais páginas: marca-d'água dos talheres ao centro e a faixa laranja no pé. */
const FUNDO_PAGINA = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4.w}" height="${A4.h}" viewBox="0 0 ${A4.w} ${A4.h}">
<defs>${GRAD_LARANJA}</defs>
<g transform="translate(${A4.w / 2 - 132} ${A4.h / 2 - 132}) scale(11)" fill="none" stroke="#FF7A00" stroke-opacity="0.045" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${ICONE_PATHS}</g>
${FAIXA_RODAPE}
</svg>`

/** Células separadas por 4pt de branco (cartões lado a lado). */
const GRADE = {
  hLineWidth: () => 4, vLineWidth: () => 4, hLineColor: () => '#FFFFFF', vLineColor: () => '#FFFFFF',
  paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
}

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
    const cabecalho: Content = {
      table: {
        widths: [22, '*'],
        body: [[
          { text: String(n), style: 'clNum', fillColor: COR.marca },
          { text: [{ text: `CLÁUSULA ${n}ª  `, style: 'clRot' }, { text: titulo.toUpperCase(), style: 'clTit' }], margin: [6, 3, 0, 0] },
        ]],
      },
      layout: 'noBorders',
      margin: [0, 12, 0, 6],
    }
    // Título nunca fica sozinho no pé da página: vai junto com o primeiro parágrafo
    clausulas.push({ stack: [cabecalho, corpo[0]], unbreakable: true }, ...corpo.slice(1))
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

  // ── Blocos visuais ─────────────────────────────────────────────────────────

  const emitido = dataBR(versao.criadaEm.toISOString().slice(0, 10))

  const parte = (rotulo: string, nome: string, linhas: (string | null | undefined)[]) => ({
    stack: [
      { canvas: [{ type: 'rect', x: 0, y: 0, w: 26, h: 3, r: 1.5, color: COR.marca }], margin: [0, 0, 0, 7] },
      { text: rotulo, style: 'rotulo', color: COR.marcaEsc },
      { text: nome, fontSize: 11, bold: true, margin: [0, 2, 0, 4] },
      ...linhas.filter(Boolean).map(l => ({ text: l as string, fontSize: 8.5, color: COR.suave, margin: [0, 0, 0, 1] as [number, number, number, number] })),
    ],
    margin: [12, 10, 12, 10] as [number, number, number, number],
  })

  const secao = (t: string): Content => ({
    columns: [
      { canvas: [{ type: 'rect', x: 0, y: 0, w: 14, h: 3, r: 1.5, color: COR.marca }], width: 22, margin: [0, 3.5, 0, 0] },
      { text: t, style: 'secao', margin: 0 },
    ],
    margin: [0, 20, 0, 9],
  })

  const tile = (rotulo: string, valor: string, destaque = false) => ({
    stack: [
      { text: rotulo.toUpperCase(), style: 'rotulo', color: destaque ? '#FFE2C2' : COR.suave },
      { text: valor, fontSize: destaque ? 12.5 : 10, bold: true, color: destaque ? '#FFFFFF' : COR.tinta, margin: [0, 3, 0, 0] },
    ],
    fillColor: destaque ? COR.marca : COR.fundo,
    margin: [10, 8, 10, 8],
  })

  const tiles = [
    tile('Valor', cobra ? `${moeda(co.valor!)} / ${ciclo.nome}` : 'Sem cobrança', true),
    tile('Plano', co.plano),
    cobra ? tile('Vencimento', `Todo dia ${co.diaVencimento}`) : tile('Ciclo', ciclo.nome),
    tile('Início', co.dataInicio ? dataBR(co.dataInicio) : 'Na assinatura'),
    tile('Término', co.dataFim ? dataBR(co.dataFim) : 'Indeterminado'),
    co.testeAte ? tile('Teste grátis até', dataBR(co.testeAte)) : tile('Tolerância', cobra ? `${rg.toleranciaDias} dias` : '—'),
  ]
  const linhasTiles = [tiles.slice(0, 3), tiles.slice(3, 6)]

  const assinatura = (nome: string, papel: string, doc?: string | null): Content => ({
    stack: [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 225, y2: 0, lineWidth: 0.7, lineColor: COR.tinta }], margin: [0, 34, 0, 5] },
      { text: nome, bold: true, fontSize: 9.5 },
      { text: papel, style: 'rotulo', color: COR.marcaEsc, margin: [0, 1, 0, 0] },
      doc ? { text: doc, fontSize: 8, color: COR.suave } : '',
    ],
  })

  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [48, 74, 48, 58],
    info: {
      title: `Contrato ${ct.codigo} — ${ct.nome} — versão ${versao.numero}`,
      author: cd.nome,
      subject: 'Contrato de licença de uso de software (SaaS)',
    },
    defaultStyle: { font: 'Roboto', fontSize: 9.5, lineHeight: 1.3, color: COR.tinta },
    styles: {
      rotulo: { fontSize: 7, bold: true, color: COR.suave, characterSpacing: 0.8 },
      secao: { fontSize: 8, bold: true, color: COR.marcaEsc, characterSpacing: 1.4 },
      clNum: { color: '#FFFFFF', bold: true, fontSize: 10, alignment: 'center', margin: [0, 3, 0, 3] },
      clRot: { fontSize: 7.5, bold: true, color: COR.marcaEsc, characterSpacing: 0.6 },
      clTit: { fontSize: 9.5, bold: true },
      p: { margin: [0, 0, 0, 5] },
      lista: { margin: [10, 0, 0, 5] },
    },
    background: (pagina) => ({ svg: pagina === 1 ? FUNDO_CAPA : FUNDO_PAGINA, width: A4.w, height: A4.h }),
    header: (pagina) => {
      const capa = pagina === 1
      return {
        stack: [
          {
            columns: [
              { svg: LOGO_SVG, width: 22, height: 22 },
              {
                text: [{ text: 'Restaurante ', bold: true, color: capa ? '#FFFFFF' : COR.tinta }, { text: 'PDV', bold: true, color: COR.marca }],
                fontSize: 12, margin: [8, 4, 0, 0], width: 'auto',
              },
              {
                text: `Contrato · Cód. ${ct.codigo} · versão ${versao.numero}`,
                alignment: 'right', fontSize: 8, color: capa ? '#BDB4A8' : COR.suave, margin: [0, 6, 0, 0],
              },
            ],
          },
          capa
            ? { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 0.5, lineColor: '#4A4038' }], margin: [0, 10, 0, 0] }
            : { canvas: [{ type: 'rect', x: 0, y: 0, w: 499, h: 2, color: COR.marca }], margin: [0, 10, 0, 0] },
        ],
        margin: [48, 28, 48, 0],
      } as Content
    },
    footer: (pagina, total) => ({
      stack: [
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: 0.5, lineColor: COR.linha }] },
        {
          columns: [
            { text: `Restaurante PDV · ${cd.nome} · ${cd.email}`, fontSize: 7.5, color: COR.suave },
            { text: `Página ${pagina} de ${total}`, alignment: 'right', fontSize: 7.5, color: COR.suave },
          ],
          margin: [0, 8, 0, 0],
        },
      ],
      margin: [48, 16, 48, 0],
    }),
    content: ajustar([
      // Título
      {
        table: {
          widths: ['*'],
          heights: [HERO_ALTURA - 74 - 4],
          body: [[{
            stack: [
              { text: 'CONTRATO', style: 'rotulo', color: COR.marca, fontSize: 8, characterSpacing: 2.4, margin: [0, 14, 0, 6] },
              { text: 'Licença de uso de software\ne prestação de serviços', fontSize: 23, bold: true, lineHeight: 1.08, color: '#FFFFFF' },
              {
                text: [
                  { text: ct.nome, bold: true, color: '#FFFFFF' },
                  { text: `   ·   Cliente ${ct.codigo}   ·   Versão ${versao.numero}   ·   Emitido em ${emitido}`, color: '#BDB4A8' },
                ],
                fontSize: 8.5, margin: [0, 12, 0, 0],
              },
            ],
          }]],
        },
        layout: 'noBorders',
      },

      // Partes
      secao('AS PARTES'),
      {
        table: {
          widths: ['*', '*'],
          body: [[
            {
              ...parte('CONTRATANTE', ct.nome, [
                ct.cnpj ? `CNPJ ${ct.cnpj}` : null,
                ctEndereco || null,
                ct.responsavel ? `Representante: ${ct.responsavel}${ct.cpfResponsavel ? ` · CPF ${ct.cpfResponsavel}` : ''}` : null,
                [ct.telefone, ct.contato].filter(Boolean).join(' · ') || null,
              ]),
              fillColor: COR.fundo,
            },
            {
              ...parte('CONTRATADA', cd.nome, [
                `Pessoa física · CPF ${cd.cpf}`,
                `${cd.endereco}, ${cd.cidade}/${cd.uf}`,
                cd.email,
              ]),
              fillColor: COR.fundo,
            },
          ]],
        },
        layout: GRADE,
        margin: [-4, -4, -4, 0],
      },
      { text: [
        b('CONTRATANTE: '), [ct.nome, ctDoc, ctEndereco ? `com endereço em ${ctEndereco}` : null, ctRep].filter(Boolean).join(', ') + '. ',
        b('CONTRATADA: '), `${cd.nome}, pessoa física, inscrito no CPF sob o nº ${cd.cpf}, residente e domiciliado na ${cd.endereco}, ${cd.cidade}/${cd.uf}. `,
        'As partes têm entre si justo e contratado o presente instrumento, que se regerá pelas cláusulas e condições a seguir.',
      ], style: 'p', margin: [0, 10, 0, 0] },

      // Quadro-resumo
      secao('QUADRO-RESUMO'),
      {
        table: { widths: ['*', '*', '*'], body: linhasTiles },
        layout: GRADE,
        margin: [-4, -4, -4, 0],
      },
      { text: 'Em caso de divergência, prevalecem as cláusulas abaixo.', fontSize: 7.5, color: COR.suave, italics: true, margin: [0, 4, 0, 0] },

      // Cláusulas
      { ...(secao('CLÁUSULAS') as object), pageBreak: 'before' } as Content,
      ...clausulas,

      ...(co.observacoes
        ? [
            secao('CONDIÇÕES ESPECÍFICAS'),
            {
              table: { widths: [3, '*'], body: [[
                { text: '', fillColor: COR.marca },
                { stack: [
                  { text: 'Combinadas entre as partes; complementam as cláusulas acima e prevalecem sobre elas no que forem diferentes.', fontSize: 8, color: COR.suave, margin: [0, 0, 0, 4] },
                  { text: co.observacoes },
                ], fillColor: COR.marcaClara, margin: [10, 8, 10, 8] },
              ]] },
              layout: 'noBorders',
            } as Content,
          ]
        : []),

      // Assinaturas
      {
        stack: [
          secao('ASSINATURAS'),
          p('E, por estarem de acordo, as partes assinam este contrato, em 2 (duas) vias de igual teor, ou eletronicamente, na presença das testemunhas abaixo.'),
          { text: `${cd.cidade}/${cd.uf}, ____ de ____________________ de ________.`, margin: [0, 6, 0, 0] },
          {
            columns: [
              assinatura(ct.nome, 'CONTRATANTE', ct.responsavel ? `p/ ${ct.responsavel}${ct.cpfResponsavel ? ` · CPF ${ct.cpfResponsavel}` : ''}` : null),
              assinatura(cd.nome, 'CONTRATADA', `CPF ${cd.cpf}`),
            ],
            columnGap: 40,
          },
          {
            columns: [
              assinatura('Testemunha 1', 'NOME E CPF'),
              assinatura('Testemunha 2', 'NOME E CPF'),
            ],
            columnGap: 40,
          },
        ],
        unbreakable: true,
      },
    ]),
  }

  return pdfmake.createPdf(doc).getBuffer()
}
