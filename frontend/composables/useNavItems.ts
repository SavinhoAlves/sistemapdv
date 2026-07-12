import { computed } from 'vue'
import {
  BarChart2, LayoutGrid, ShoppingCart, Package, Landmark,
  FileText, ShieldCheck, Settings, ChefHat
} from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/configuracoes'

export interface NavItem {
  rota: string
  label: string
  icon: any
}

// Itens de navegação por cargo — usado pela Sidebar (desktop) e Navbar (mobile)
export function useNavItems() {
  const authStore = useAuthStore()
  const configStore = useConfigStore()
  const cargo = computed(() => authStore.usuario?.cargo)

  const navItems = computed<NavItem[]>(() => {
    const itens = calcularItens()
    // Venda mobile pode ser desligada remotamente pelo painel central de suporte
    return configStore.venda_mobile_permitida
      ? itens
      : itens.filter(item => item.rota !== '/vendas')
  })

  function calcularItens(): NavItem[] {
    if (cargo.value === 'administrador') return [
      { rota: '/',              label: 'Dashboard',     icon: BarChart2    },
      { rota: '/mesas',         label: 'Mesas',         icon: LayoutGrid   },
      { rota: '/vendas',        label: 'Vendas',        icon: ShoppingCart },
      { rota: '/produtos',      label: 'Produtos',      icon: Package      },
      { rota: '/caixa',         label: 'Caixa',         icon: Landmark     },
      { rota: '/cozinha',       label: 'Cozinha',       icon: ChefHat      },
      { rota: '/relatorios',    label: 'Relatórios',    icon: FileText     },
      { rota: '/admin',         label: 'Admin',         icon: ShieldCheck  },
      { rota: '/configuracoes', label: 'Configurações', icon: Settings     }
    ]
    if (cargo.value === 'garcom') return [
      { rota: '/mesas',    label: 'Mesas',    icon: LayoutGrid   },
      { rota: '/vendas',   label: 'Vendas',   icon: ShoppingCart },
      { rota: '/produtos', label: 'Produtos', icon: Package      }
    ]
    if (cargo.value === 'caixa') return [
      { rota: '/caixa', label: 'Caixa', icon: Landmark }
    ]
    if (cargo.value === 'cozinha') return [
      { rota: '/cozinha', label: 'Cozinha', icon: ChefHat }
    ]
    return []
  }

  return { navItems }
}
