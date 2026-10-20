import { ref } from 'vue'

/** Formatos devolvidos por /platform/tenants e /platform/tenants/dashboard. */
export interface Licenca  { id: string; status: string; dataAtivacao: string | null; dataVencimento: string | null; createdAt: string }
export interface Contrato {
  id: string; plano: string; valor: string | null; ciclo: string; status: string
  dataInicio?: string | null; dataFim?: string | null; observacoes?: string | null
  diaVencimento?: number; proximoVencimento?: string | null; testeAte?: string | null; isento?: boolean
  ajusteMotivo?: string | null; ajusteEm?: string | null
}

/** Situação da assinatura calculada no backend (ver backend/src/modules/platform/assinatura.ts). */
export type Situacao = 'teste' | 'em_dia' | 'tolerancia' | 'bloqueado' | 'isento' | 'suspenso' | 'cancelado' | 'pendente'
export interface Assinatura {
  situacao: Situacao
  liberadoAte: string | null; proximoVencimento: string | null; testeAte: string | null
  diasParaVencer: number | null; diasParaBloquear: number | null
  valor: number | null; ciclo: string; diaVencimento: number; isento: boolean
}

export const TOLERANCIA_DIAS = 5
export const CICLOS = [
  { value: 'mensal', label: 'Mensal', meses: 1 }, { value: 'trimestral', label: 'Trimestral', meses: 3 },
  { value: 'semestral', label: 'Semestral', meses: 6 }, { value: 'anual', label: 'Anual', meses: 12 },
] as const
export const rotuloCiclo = (c: string) => CICLOS.find(x => x.value === c)?.label.toLowerCase() ?? c
export const mesesCiclo = (c: string) => CICLOS.find(x => x.value === c)?.meses ?? 1

/** Data sem hora (AAAA-MM-DD) para dd/mm/aaaa, sem passar pelo fuso. */
export const diaBR = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')

export interface Tenant {
  id: string; codigo: number; nome: string; slug: string; cnpj: string | null; contato: string | null
  responsavel: string | null; cpfResponsavel: string | null; telefone: string | null
  endereco: string | null; cidade: string | null; uf: string | null; observacoes: string | null
  status: string; rfidDisponivel: boolean; vendaMobilePermitida: boolean; createdAt: string
  planoId?: string | null; plano?: { id: string; nome: string; valor: string | number } | null
  licencas: Licenca[]; contratos: Contrato[]
  assinatura?: Assinatura
}

/** Plano do restaurante; sem plano cadastrado, usa o nome do plano no contrato. */
export const nomePlano = (t: Tenant) => t.plano?.nome ?? t.contratos?.[0]?.plano ?? ''
export interface Dashboard {
  totais:     { tenants: number; ativos: number; suspensos: number }
  licencas:   { ativas: number; pendentes: number; bloqueadas: number; vencendo: number; vencidas: number; teste: number }
  financeiro: { mrr: number; arr: number; porPlano: { plano: string; count: number; mrr: number }[] }
  alertas:    { tenantId: string; nome: string; tipo: string; dias?: number; valor?: number }[]
}

/** [rótulo, tom] — tom vira a classe da pílula (ok | warn | bad | info | mute). */
export type Pilula = [string, 'ok' | 'warn' | 'bad' | 'info' | 'mute']

export const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const dataBR = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')
export const iniciais = (nome: string) => nome.trim().slice(0, 2).toUpperCase()

export function diasAte(iso: string | null | undefined) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

/** Pílula da situação da assinatura: o que o restaurante pode fazer agora e até quando. */
export function situacaoPill(a: Assinatura | undefined): Pilula {
  if (!a) return ['Sem contrato', 'mute']
  switch (a.situacao) {
    case 'teste':      return [`Teste até ${diaBR(a.testeAte)}`, 'info']
    case 'em_dia':     return a.diasParaVencer !== null && a.diasParaVencer <= 5
      ? [a.diasParaVencer === 0 ? 'Vence hoje' : `Vence em ${a.diasParaVencer} d`, 'warn']
      : [`Em dia · ${diaBR(a.proximoVencimento)}`, 'ok']
    case 'tolerancia': return [`Atrasado · bloqueia em ${a.diasParaBloquear} d`, 'warn']
    case 'bloqueado':  return [a.proximoVencimento || !a.testeAte ? 'Bloqueado por atraso' : 'Teste encerrado', 'bad']
    case 'isento':     return ['Isento', 'ok']
    case 'suspenso':   return ['Suspenso', 'warn']
    case 'cancelado':  return ['Rescindido', 'bad']
    default:           return ['Sem vencimento', 'mute']
  }
}

export const licencaPill = (t: Tenant): Pilula => situacaoPill(t.assinatura)

/** Status de operação: suspenso manualmente > licença bloqueada/vencida > ativo. */
export type ChaveStatus = 'ativo' | 'suspenso' | 'bloqueado'

export function statusPill(t: Tenant): [string, Pilula[1], ChaveStatus] {
  if (t.status === 'suspenso') return ['Suspenso', 'warn', 'suspenso']
  const s = t.assinatura?.situacao
  if (s === 'bloqueado' || s === 'cancelado' || s === 'pendente') return ['Bloqueado', 'bad', 'bloqueado']
  return ['Ativo', 'ok', 'ativo']
}

export function usePlatformTenants() {
  const { platformFetch } = usePlatformFetch()
  const tenants   = ref<Tenant[]>([])
  const dashboard = ref<Dashboard | null>(null)
  const loading   = ref(false)
  const erro      = ref('')

  async function carregar() {
    loading.value = true
    erro.value = ''
    try {
      const [t, d] = await Promise.all([
        platformFetch<Tenant[]>('/platform/tenants'),
        platformFetch<Dashboard>('/platform/tenants/dashboard'),
      ])
      tenants.value = t
      dashboard.value = d
    } catch (e: any) {
      erro.value = e?.message || 'Erro ao carregar'
    } finally {
      loading.value = false
    }
  }

  return { tenants, dashboard, loading, erro, carregar, platformFetch }
}
