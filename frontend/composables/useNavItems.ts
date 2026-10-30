import { computed } from 'vue'
import {
  BarChart2, LayoutGrid, ShoppingCart, Package, Landmark,
  FileText, ShieldCheck, Settings, ChefHat, Boxes, LifeBuoy, Bike
} from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/configuracoes'

export interface NavItem {
  rota: string
  label: string
  icon: any
}

// Ordem do menu (agrupada em Operação, Gestão e Sistema) e a permissão que libera cada rota (mesma de middleware/roles.global.ts)
const MAPA: { rota: string; grupo: GrupoNav; label: string; icon: any; libera: (tem: (p: string) => boolean, modo: string, admin: boolean, delivery: boolean) => boolean }[] = [
  { rota: '/',              grupo: 'Operação', label: 'Dashboard',     icon: BarChart2,    libera: t => t('verRelatorios') || t('verDashboard') },
  { rota: '/mesas',         grupo: 'Operação', label: 'Mesas',         icon: LayoutGrid,   libera: (t, m) => m !== 'direta' && ['abrirMesa', 'fecharMesa', 'adicionarPedido', 'cancelarItemPedido'].some(t) },
  { rota: '/vendas',        grupo: 'Operação', label: 'Vendas',        icon: ShoppingCart, libera: (t, m) => m !== 'mesas' && t('gerenciarCaixa') },
  { rota: '/caixa',         grupo: 'Operação', label: 'Caixa',         icon: Landmark,     libera: t => t('gerenciarCaixa') },
  { rota: '/delivery',      grupo: 'Operação', label: 'Delivery',      icon: Bike,         libera: t => t('gerenciarCaixa') }, // pedidos do cardápio (retirada) valem para todos os planos
  { rota: '/entregador',    grupo: 'Operação', label: 'Minhas entregas', icon: Bike,       libera: (t, _m, admin) => !admin && t('fazerEntregas') },
  { rota: '/cozinha',       grupo: 'Operação', label: 'Cozinha',       icon: ChefHat,      libera: t => t('verCozinha') },
  { rota: '/produtos',      grupo: 'Gestão', label: 'Produtos',      icon: Package,      libera: t => t('gerenciarProdutos') },
  { rota: '/estoque',       grupo: 'Gestão', label: 'Estoque',       icon: Boxes,        libera: t => t('gerenciarProdutos') },
  { rota: '/relatorios',    grupo: 'Gestão', label: 'Relatórios',    icon: FileText,     libera: t => t('verRelatorios') },
  { rota: '/admin',         grupo: 'Sistema', label: 'Admin',         icon: ShieldCheck,  libera: (_t, _m, admin) => admin },
  { rota: '/configuracoes', grupo: 'Sistema', label: 'Configurações', icon: Settings,     libera: t => t('gerenciarConfiguracoes') },
  { rota: '/suporte',       grupo: 'Sistema', label: 'Suporte',       icon: LifeBuoy,     libera: (_t, _m, admin) => admin },
]

export function useNavItems() {
  const authStore = useAuthStore()

  const navItems = computed<NavItem[]>(() => calcularItens())

  /** Menu pelas permissões efetivas do token (padrão da função + perfil), como a API decide. */
  function calcularItens(): NavItem[] {
    const admin = authStore.usuario?.cargo === 'administrador'
    const modo  = (authStore.usuario?.permissoes?.modo_venda as string) || 'ambos'
    const tem   = (p: string) => authStore.temPermissao(p)
    const delivery = useConfigStore().delivery_disponivel
    return MAPA.filter(i => i.libera(tem, modo, admin, delivery)).map(({ rota, grupo, label, icon }) => ({ rota, grupo, label, icon }))
  }

  return { navItems }
}
