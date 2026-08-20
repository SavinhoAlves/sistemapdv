<template>
  <div class="min-h-screen bg-[#0d0d10] flex flex-col text-white">

    <!-- HEADER -->
    <header class="shrink-0 px-5 pb-3" style="padding-top: max(18px, env(safe-area-inset-top));">
      <div class="flex items-center justify-between">
        <!-- Logo + nome -->
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-[13px] bg-orange-500 flex items-center justify-center"
            style="box-shadow: 0 4px 16px rgba(249,115,22,0.38);"
          >
            <UtensilsCrossed :size="15" class="text-white" />
          </div>
          <div class="leading-none">
            <p class="text-[15px] font-black text-white">{{ primeiroNome }}</p>
            <p class="text-[10px] font-semibold text-white/25 mt-0.5 uppercase tracking-[0.14em]">{{ labelCargo }}</p>
          </div>
        </div>

        <!-- Relógio + sair -->
        <div class="flex items-center gap-2.5">
          <span
            class="text-[13px] font-semibold tabular-nums px-2.5 py-1 rounded-[8px]"
            style="color: rgba(255,255,255,0.25); background: rgba(255,255,255,0.04);"
          >{{ horario }}</span>
          <button
            @click="authStore.logout()"
            title="Sair"
            class="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-black transition-all active:scale-90"
            style="background: rgba(249,115,22,0.1); color: rgb(251,146,60); border: 1px solid rgba(249,115,22,0.2);"
          >
            {{ inicial }}
          </button>
        </div>
      </div>
    </header>

    <div class="h-px mx-5 shrink-0 mt-3" style="background: rgba(255,255,255,0.05);"></div>

    <!-- CONTENT -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>

    <!-- FLOATING NAV -->
    <nav v-if="navTabs.length > 1" class="shrink-0 px-4 pt-3 nav-bottom">
      <div
        class="flex p-1.5 gap-1.5 rounded-[22px]"
        style="background: rgba(18,18,21,0.95); backdrop-filter: blur(32px); -webkit-backdrop-filter: blur(32px); border: 1px solid rgba(255,255,255,0.07); box-shadow: 0 8px 32px rgba(0,0,0,0.5);"
      >
        <button
          v-for="tab in navTabs"
          :key="tab.path"
          @click="navigateTo(tab.path)"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-[16px] font-black transition-all duration-200 active:scale-[0.96] text-[13px]"
          :class="isActive(tab.path) ? 'text-white' : 'text-white/25'"
          :style="isActive(tab.path) ? 'background: #f97316; box-shadow: 0 4px 14px rgba(249,115,22,0.35);' : ''"
        >
          <component :is="tab.icon" :size="17" />
          {{ tab.label }}
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

const labelCargo = computed(() => {
  const map: Record<string, string> = {
    administrador: 'Administrador',
    garcom:        'Garçom',
    caixa:         'Caixa',
    cozinha:       'Cozinha',
  }
  return map[authStore.usuario?.cargo ?? ''] ?? 'Funcionário'
})

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
