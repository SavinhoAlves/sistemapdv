<template>
  <div class="min-h-screen bg-neutral-950 flex flex-col text-white">

    <!-- HEADER -->
    <header class="shrink-0 flex items-center justify-between px-5 pt-5 pb-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
          <UtensilsCrossed :size="14" class="text-white" />
        </div>
        <div class="leading-none">
          <p class="text-[9px] font-bold text-white/25 uppercase tracking-[0.18em]">PDV Mobile</p>
          <p class="text-[14px] font-black text-white mt-1">{{ authStore.usuario?.nome || 'Funcionário' }}</p>
        </div>
      </div>

      <button
        @click="authStore.logout()"
        title="Sair da conta"
        class="w-9 h-9 rounded-full bg-white/[0.07] border border-white/[0.06] flex items-center justify-center text-[13px] font-black text-white/40 hover:bg-red-500/12 hover:text-red-400 hover:border-red-500/20 active:scale-95 transition-all"
      >
        {{ inicial }}
      </button>
    </header>

    <div class="h-px bg-white/[0.06] mx-5 shrink-0"></div>

    <!-- CONTENT -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>

    <!-- FLOATING PILL NAV -->
    <nav v-if="navTabs.length > 1" class="shrink-0 px-4 pt-3 nav-bottom">
      <div class="flex items-stretch bg-neutral-900/85 backdrop-blur-2xl border border-white/[0.07] rounded-[26px] p-1.5 gap-1.5 shadow-2xl shadow-black/40">
        <button
          v-for="tab in navTabs"
          :key="tab.path"
          @click="navigateTo(tab.path)"
          class="flex-1 flex items-center justify-center gap-2 py-[13px] rounded-[20px] transition-all duration-200 active:scale-[0.96]"
          :class="isActive(tab.path)
            ? 'bg-orange-500 text-white font-black shadow-lg shadow-orange-500/20'
            : 'text-white/25 hover:text-white/50 font-bold'"
        >
          <component :is="tab.icon" :size="18" />
          <span v-if="isActive(tab.path)" class="text-[13px]">{{ tab.label }}</span>
        </button>
      </div>
    </nav>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { UtensilsCrossed, LayoutGrid, ShoppingCart } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const route = useRoute()

const inicial = computed(() =>
  (authStore.usuario?.nome || '?').charAt(0).toUpperCase()
)

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

const navTabs = computed(() => {
  const tabs: { path: string; label: string; icon: any }[] = []
  const podeMesas  = authStore.temPermissao('adicionarPedido') && authStore.temPermissao('abrirMesa')
  const podeVendas = authStore.temPermissao('adicionarPedido')
  if (podeMesas)  tabs.push({ path: '/m/mesas',  label: 'Mesas',  icon: LayoutGrid })
  if (podeVendas) tabs.push({ path: '/m/vendas', label: 'Vendas', icon: ShoppingCart })
  return tabs
})
</script>

<style scoped>
.nav-bottom {
  padding-bottom: max(20px, env(safe-area-inset-bottom));
}
</style>
