import { createHash } from 'node:crypto'
import { prisma } from '../../lib/prisma'
import { TOLERANCIA_DIAS, ymd, type Db } from './assinatura'

/**
 * Contrato de prestação de serviços: versões e dados do PDF.
 *
 * Cada versão guarda em `dados` tudo o que vai no documento (inclusive quem é
 * a contratada e as regras de multa e prazo daquele momento), então o PDF de
 * uma versão antiga sai igual ao que foi enviado ao cliente. Uma edição só
 * gera versão nova quando muda algo que aparece no texto — trocar o status
 * ou registrar pagamento não mexe no contrato.
 */

/** Quem presta o serviço. Mudou? Só os contratos gerados a partir daí trazem o dado novo. */
export const CONTRATADA = {
  nome: 'Sávio Alves da Silva',
  cpf: '165.456.647-77',
  endereco: 'Rua Antonio Bernadino Monteiro, 70',
  cidade: 'Miracema',
  uf: 'RJ',
  email: 'suporte.savioalves@gmail.com',
  foro: 'Miracema/RJ',
}

/** Regras de cobrança que vão escritas no contrato. */
export const REGRAS = {
  toleranciaDias: TOLERANCIA_DIAS,
  multaAtrasoPct: 2,
  jurosMesPct: 1,
  rescisaoInadimplenciaDias: 30,
  avisoPrevioDias: 30,
  guardaDadosDias: 30,
  multaInfracaoMensalidades: 3,
}

export interface DadosContrato {
  contratada: typeof CONTRATADA
  contratante: {
    codigo: number
    nome: string
    cnpj: string | null
    responsavel: string | null
    cpfResponsavel: string | null
    endereco: string | null
    cidade: string | null
    uf: string | null
    telefone: string | null
    contato: string | null
  }
  condicoes: {
    plano: string
    valor: number | null
    ciclo: string
    diaVencimento: number
    dataInicio: string | null
    dataFim: string | null
    testeAte: string | null
    isento: boolean
    observacoes: string | null
  }
  regras: typeof REGRAS
}

/** Dados do contrato vigente, ou null se o restaurante não tem contrato. */
export async function montarDados(db: Db, tenantId: string): Promise<DadosContrato | null> {
  const t = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      codigo: true, nome: true, cnpj: true, responsavel: true, cpfResponsavel: true,
      endereco: true, cidade: true, uf: true, telefone: true, contato: true,
      contratos: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })
  const c = t?.contratos[0]
  if (!t || !c) return null
  const data = (d: Date | null) => (d ? ymd(d) : null)
  return {
    contratada: CONTRATADA,
    contratante: {
      codigo: t.codigo, nome: t.nome, cnpj: t.cnpj, responsavel: t.responsavel, cpfResponsavel: t.cpfResponsavel,
      endereco: t.endereco, cidade: t.cidade, uf: t.uf, telefone: t.telefone, contato: t.contato,
    },
    condicoes: {
      plano: c.plano,
      valor: c.valor != null ? Number(c.valor) : null,
      ciclo: c.ciclo,
      diaVencimento: c.diaVencimento,
      dataInicio: data(c.dataInicio),
      dataFim: data(c.dataFim),
      testeAte: data(c.testeAte),
      isento: c.isento,
      observacoes: c.observacoes?.trim() || null,
    },
    regras: REGRAS,
  }
}

const hashDe = (d: DadosContrato) => createHash('sha256').update(JSON.stringify(d)).digest('hex')

/**
 * Gera uma versão nova se o texto do contrato mudou desde a última.
 * Devolve a versão vigente e se ela acabou de ser criada.
 */
export async function registrarVersao(tenantId: string, motivo: string, db: Db = prisma) {
  const dados = await montarDados(db, tenantId)
  if (!dados) return null
  const hash = hashDe(dados)
  const ultima = await db.contratoVersao.findFirst({ where: { tenantId }, orderBy: { numero: 'desc' } })
  if (ultima?.hash === hash) return { versao: ultima, nova: false }
  const versao = await db.contratoVersao.create({
    data: { tenantId, numero: (ultima?.numero ?? 0) + 1, dados: dados as any, hash, motivo },
  })
  return { versao, nova: true }
}
