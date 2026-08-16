<template>
  <!-- Overlay: fecha sidebar ao clicar fora (só quando expandida) -->
  <div
    v-if="expandida"
    class="fixed inset-0 z-30"
    @click="expandida = false"
  />

  <aside
    class="hidden sm:flex fixed left-0 top-0 h-screen z-40 flex-col
           bg-black/40 backdrop-blur-xl border-r border-white/[0.08]
           transition-all duration-200 overflow-hidden"
    :class="expandida ? 'w-52' : 'w-14'"
  >
    <!-- LOGO (clique expande/recolhe) -->
    <button
      @click="expandida = !expandida"
      class="h-14 w-full flex items-center gap-2.5 px-3 shrink-0 border-b border-white/[0.08] hover:bg-white/[0.05] transition-colors"
      :title="expandida ? 'Recolher menu' : 'Expandir menu'"
    >
      <div class="w-8 h-8 rounded-lg bg-orange-500 shadow-lg shadow-orange-500/30 flex items-center justify-center shrink-0">
        <UtensilsCrossed :size="14" class="text-white" />
      </div>
      <span class="text-sm font-black text-white tracking-tight whitespace-nowrap transition-opacity duration-200"
        :class="expandida ? 'opacity-100' : 'opacity-0'">
        Restaurante <span class="text-orange-400">PDV</span>
      </span>
    </button>

    <!-- NAVEGAÇÃO -->
    <nav class="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
      <button
        v-for="item in navItems"
        :key="item.rota"
        @click="navegar(item.rota)"
        class="w-full flex items-center gap-3 h-10 px-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
        :class="isAtivo(item.rota)
          ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
          : 'text-white/40 hover:bg-white/[0.08] hover:text-white'"
        :title="item.label"
      >
        <component :is="item.icon" :size="17" :stroke-width="2.2" class="shrink-0" />
        <span class="transition-opacity duration-200" :class="expandida ? 'opacity-100' : 'opacity-0'">{{ item.label }}</span>
      </button>
    </nav>

    <!-- RODAPÉ: SAIR -->
    <div class="p-2 border-t border-white/[0.08] shrink-0">
      <button
        @click="authStore.logout()"
        class="w-full flex items-center gap-3 h-10 px-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/40 hover:text-red-300 transition-all whitespace-nowrap"
        title="Sair"
      >
        <LogOut :size="17" class="shrink-0" />
        <span class="transition-opacity duration-200" :class="expandida ? 'opacity-100' : 'opacity-0'">Sair</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { sidebarExpandida as expandida } from '~/composables/useSidebar'
import { useNavItems } from '~/composables/useNavItems'
import { UtensilsCrossed, LogOut } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

const { navItems } = useNavItems()

function isAtivo(rota: string) {
  if (rota === '/') return route.path === '/'
  return route.path.startsWith(rota)
}

// Expandida por clique na logo; empurra o conteúdo via classe global no <html>
watch(expandida, aberta => {
  document.documentElement.classList.toggle('sidebar-expandida', aberta)
}, { immediate: true })

function navegar(rota: string) {
  expandida.value = false
  router.push(rota)
}
</script>
