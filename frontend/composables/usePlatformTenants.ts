import { ref } from 'vue'

/** Formatos devolvidos por /platform/tenants e /platform/tenants/dashboard. */
export interface Licenca  { id: string; status: string; dataAtivacao: string | null; dataVencimento: string | null; createdAt: string }
export interface Contrato { id: string; plano: string; valor: string | null; ciclo: string; status: string; dataInicio?: string | null }
export interface Tenant {
  id: string; nome: string; slug: string; cnpj: string | null; contato: string | null
  responsavel: string | null; cpfResponsavel: string | null; telefone: string | null
  endereco: string | null; cidade: string | null; uf: string | null; observacoes: string | null
  status: string; rfidDisponivel: boolean; vendaMobilePermitida: boolean; createdAt: string
  planoId?: string | null; plano?: { id: string; nome: string; valor: string | number } | null
  licencas: Licenca[]; contratos: Contrato[]
}

/** Plano do restaurante; sem plano cadastrado, usa o nome do plano no contrato. */
export const nomePlano = (t: Tenant) => t.plano?.nome ?? t.contratos?.[0]?.plano ?? ''
export interface Dashboard {
  totais:     { tenants: number; ativos: number; suspensos: number }
  licencas:   { ativas: number; pendentes: number; bloqueadas: number; vencendo: number; vencidas: number }
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

export function licencaPill(t: Tenant): Pilula {
  const lic = t.licencas?.[0]
  if (!lic) return ['Sem licença', 'mute']
  if (lic.status === 'pendente') return ['Pendente', 'warn']
  if (lic.status !== 'ativado') return ['Bloqueada', 'bad']
  const d = diasAte(lic.dataVencimento)
  if (d === null) return ['Ilimitada', 'ok']
  if (d < 0) return ['Vencida', 'bad']
  if (d <= 7) return [`Vence em ${d} d`, 'warn']
  return [`Até ${dataBR(lic.dataVencimento)}`, 'ok']
}

/** Status de operação: suspenso manualmente > licença bloqueada/vencida > ativo. */
export type ChaveStatus = 'ativo' | 'suspenso' | 'bloqueado'

export function statusPill(t: Tenant): [string, Pilula[1], ChaveStatus] {
  if (t.status === 'suspenso') return ['Suspenso', 'warn', 'suspenso']
  const [, tom] = licencaPill(t)
  if (tom === 'bad') return ['Bloqueado', 'bad', 'bloqueado']
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
