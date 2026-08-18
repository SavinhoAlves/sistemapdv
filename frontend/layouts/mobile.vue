<template>
  <div class="min-h-screen bg-[#0d0d10] flex flex-col text-white">

    <!-- HEADER -->
    <header class="shrink-0 flex items-center justify-between px-5 pt-5 pb-4">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-[12px] bg-orange-500 flex items-center justify-center shadow-[0_4px_14px_rgba(249,115,22,0.4)]">
          <UtensilsCrossed :size="14" class="text-white" />
        </div>
        <div class="leading-none">
          <p class="text-[10px] font-semibold text-white/20 uppercase tracking-[0.18em]">PDV Mobile</p>
          <p class="text-[14px] font-black text-white mt-1">{{ primeiroNome }}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-[14px] font-semibold text-white/25 tabular-nums">{{ horario }}</span>
        <button
          @click="authStore.logout()"
          title="Sair da conta"
          class="w-9 h-9 rounded-full bg-orange-500/10 ring-1 ring-orange-500/30 flex items-center justify-center text-[13px] font-black text-orange-400 hover:bg-red-500/10 hover:ring-red-500/30 hover:text-red-400 active:scale-95 transition-all"
        >
          {{ inicial }}
        </button>
      </div>
    </header>

    <div class="h-px mx-5 shrink-0 bg-white/[0.05]"></div>

    <!-- CONTENT -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>

    <!-- FLOATING NAV -->
    <nav v-if="navTabs.length > 1" class="shrink-0 px-5 pt-3 nav-bottom">
      <div
        class="flex p-1.5 gap-1.5 rounded-[22px]"
        style="background: rgba(22,22,25,0.92); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); border: 1px solid rgba(255,255,255,0.07); box-shadow: 0 8px 32px rgba(0,0,0,0.45);"
      >
        <button
          v-for="tab in navTabs"
          :key="tab.path"
          @click="navigateTo(tab.path)"
          class="flex-1 flex items-center justify-center gap-2.5 py-[13px] rounded-[16px] font-black transition-all duration-200 active:scale-[0.96]"
          :class="isActive(tab.path)
            ? 'bg-orange-500 text-white shadow-[0_4px_12px_rgba(249,115,22,0.35)]'
            : 'text-white/25 hover:text-white/50'"
        >
          <component :is="tab.icon" :size="18" />
          <span v-if="isActive(tab.path)" class="text-[13px]">{{ tab.label }}</span>
        </button>
      </div>
    </nav>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { UtensilsCrossed, LayoutGrid, ShoppingCart } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const route = useRoute()

const agora = ref(new Date())
let clockTick: ReturnType<typeof setInterval> | null = null
onMounted(() => { clockTick = setInterval(() => { agora.value = new Date() }, 30000) })
onUnmounted(() => { if (clockTick) clearInterval(clockTick) })

const horario = computed(() =>
  agora.value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
)

const primeiroNome = computed(() =>
  (authStore.usuario?.nome || 'Funcionário').split(' ')[0]
)

const inicial = computed(() =>
  (authStore.usuario?.nome || '?').charAt(0).toUpperCase()
)

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

const modoVenda = computed((): string => {
  if (authStore.usuario?.cargo === 'administrador') return 'ambos'
  return (authStore.usuario?.permissoes?.modo_venda as string) || 'ambos'
})

const navTabs = computed(() => {
  const tabs: { path: string; label: string; icon: any }[] = []
  const podeAdicionar = authStore.temPermissao('adicionarPedido')
  const modo = modoVenda.value
  if (podeAdicionar && (modo === 'mesas' || modo === 'ambos'))
    tabs.push({ path: '/m/mesas',  label: 'Mesas',  icon: LayoutGrid })
  if (podeAdicionar && (modo === 'direta' || modo === 'ambos'))
    tabs.push({ path: '/m/vendas', label: 'Vendas', icon: ShoppingCart })
  return tabs
})
</script>

<style scoped>
.nav-bottom {
  padding-bottom: max(20px, env(safe-area-inset-bottom));
}
</style>
