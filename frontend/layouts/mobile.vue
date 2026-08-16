<template>
  <div class="min-h-screen bg-neutral-950 flex flex-col text-white">

    <!-- TOP BAR -->
    <header class="shrink-0">
      <!-- Orange accent line -->
      <div class="h-0.5 bg-gradient-to-r from-orange-400 to-amber-500"></div>
      <div class="flex items-center justify-between px-4 py-3 bg-neutral-900 border-b border-white/[0.08]">
        <!-- Logo + nome -->
        <div class="flex items-center gap-2.5">
          <div class="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
            <UtensilsCrossed :size="14" class="text-white" />
          </div>
          <div>
            <p class="text-[10px] font-black uppercase tracking-widest text-orange-400 leading-none">Mobile PDV</p>
            <p class="text-xs font-black text-white leading-tight mt-0.5 truncate max-w-[140px]">
              {{ authStore.usuario?.nome || 'Funcionário' }}
            </p>
          </div>
        </div>

        <!-- Logout -->
        <button
          @click="authStore.logout()"
          class="h-8 px-3 rounded-xl bg-white/[0.06] hover:bg-red-500/20 hover:text-red-400 text-white/50 text-[11px] font-black transition-all active:scale-95 flex items-center gap-1.5"
        >
          <LogOut :size="12" />
          Sair
        </button>
      </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>

    <!-- BOTTOM NAVIGATION -->
    <nav
      v-if="navTabs.length > 0"
      class="shrink-0 bg-neutral-900 border-t border-white/[0.08] pb-6 safe-area-bottom"
    >
      <div class="flex">
        <button
          v-for="tab in navTabs"
          :key="tab.path"
          @click="navigateTo(tab.path)"
          class="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-all active:scale-95"
          :class="isActive(tab.path) ? 'text-orange-400' : 'text-white/40 hover:text-white/70'"
        >
          <div
            class="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            :class="isActive(tab.path) ? 'bg-orange-500/20' : ''"
          >
            <component :is="tab.icon" :size="18" />
          </div>
          <span class="text-[10px] font-black">{{ tab.label }}</span>
        </button>
      </div>
    </nav>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { UtensilsCrossed, LogOut, LayoutGrid, ShoppingCart } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const route = useRoute()

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

const navTabs = computed(() => {
  const tabs: { path: string; label: string; icon: any }[] = []

  const podeMesas = authStore.temPermissao('adicionarPedido') && authStore.temPermissao('abrirMesa')
  const podeVendas = authStore.temPermissao('adicionarPedido')

  if (podeMesas) {
    tabs.push({ path: '/m/mesas', label: 'Mesas', icon: LayoutGrid })
  }
  if (podeVendas) {
    tabs.push({ path: '/m/vendas', label: 'Vendas', icon: ShoppingCart })
  }

  return tabs
})
</script>

<style scoped>
.safe-area-bottom {
  padding-bottom: max(24px, env(safe-area-inset-bottom));
}
</style>
