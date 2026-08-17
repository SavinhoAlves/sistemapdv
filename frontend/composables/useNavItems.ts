import { computed } from 'vue'
import {
  BarChart2, LayoutGrid, ShoppingCart, Package, Landmark,
  FileText, ShieldCheck, Settings, ChefHat
} from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

export interface NavItem {
  rota: string
  label: string
  icon: any
}

// Ordem e mapeamento permissão → rota
const MAPA_PERMISSOES: { perms: string[], rota: string, label: string, icon: any }[] = [
  { perms: ['abrirMesa', 'fecharMesa', 'adicionarPedido', 'cancelarItemPedido'], rota: '/mesas',         label: 'Mesas',         icon: LayoutGrid   },
  { perms: ['adicionarPedido'],                                                   rota: '/vendas',        label: 'Vendas',        icon: ShoppingCart },
  { perms: ['gerenciarProdutos'],                                                 rota: '/produtos',      label: 'Produtos',      icon: Package      },
  { perms: ['gerenciarCaixa'],                                                    rota: '/caixa',         label: 'Caixa',         icon: Landmark     },
  { perms: ['verCozinha'],                                                        rota: '/cozinha',       label: 'Cozinha',       icon: ChefHat      },
  { perms: ['verRelatorios'],                                                     rota: '/relatorios',    label: 'Relatórios',    icon: FileText     },
  { perms: ['gerenciarConfiguracoes'],                                            rota: '/configuracoes', label: 'Configurações', icon: Settings     },
]

export function useNavItems() {
  const authStore = useAuthStore()

  const navItems = computed<NavItem[]>(() => calcularItens())

  function calcularItens(): NavItem[] {
    const cargo      = authStore.usuario?.cargo
    const permissoes = authStore.usuario?.permissoes

    // Administrador sempre vê tudo
    if (cargo === 'administrador') return [
      { rota: '/',              label: 'Dashboard',     icon: BarChart2   },
      { rota: '/mesas',         label: 'Mesas',         icon: LayoutGrid  },
      { rota: '/vendas',        label: 'Vendas',        icon: ShoppingCart },
      { rota: '/produtos',      label: 'Produtos',      icon: Package     },
      { rota: '/caixa',         label: 'Caixa',         icon: Landmark    },
      { rota: '/cozinha',       label: 'Cozinha',       icon: ChefHat     },
      { rota: '/relatorios',    label: 'Relatórios',    icon: FileText    },
      { rota: '/admin',         label: 'Admin',         icon: ShieldCheck },
      { rota: '/configuracoes', label: 'Configurações', icon: Settings    }
    ]

    // Com perfil atribuído: nav baseada nas permissões e modo de operação do perfil
    if (permissoes && Object.keys(permissoes).length > 0) {
      const modo  = (permissoes.modo_venda as string) || 'ambos'
      const itens: NavItem[] = []
      const vistas = new Set<string>()

      // Dashboard visível se tiver ao menos uma permissão ativa
      const temAlguma = Object.values(permissoes).some(v => v === true)
      if (temAlguma) {
        itens.push({ rota: '/', label: 'Dashboard', icon: BarChart2 })
        vistas.add('/')
      }

      for (const { perms, rota, label, icon } of MAPA_PERMISSOES) {
        if (vistas.has(rota)) continue
        // Filtra por modo de operação do perfil
        if (rota === '/mesas'  && modo === 'direta') continue
        if (rota === '/vendas' && modo === 'mesas')  continue
        if (perms.some(p => permissoes[p])) {
          itens.push({ rota, label, icon })
          vistas.add(rota)
        }
      }

      return itens
    }

    // Sem perfil: fallback pelos defaults do cargo
    if (cargo === 'garcom') return [
      { rota: '/mesas',    label: 'Mesas',    icon: LayoutGrid   },
      { rota: '/vendas',   label: 'Vendas',   icon: ShoppingCart },
      { rota: '/produtos', label: 'Produtos', icon: Package      }
    ]
    if (cargo === 'caixa') return [
      { rota: '/caixa', label: 'Caixa', icon: Landmark }
    ]
    if (cargo === 'cozinha') return [
      { rota: '/cozinha', label: 'Cozinha', icon: ChefHat }
    ]

    return []
  }

  return { navItems }
}
