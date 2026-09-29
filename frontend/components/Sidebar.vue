<template>
  <!-- Overlay: fecha sidebar ao clicar fora (só quando expandida) -->
  <div
    v-if="expandida"
    class="fixed inset-0 z-30"
    @click="expandida = false"
  />

  <aside
    class="hidden sm:flex fixed left-0 flex-col
           bg-[#0e0d14] border-r border-white/[0.06]
           transition-all duration-200 overflow-hidden"
    :class="[expandida ? 'w-52' : 'w-14', 'z-40']"
    :style="{ top: authStore.modoSuporte ? '2.5rem' : '0', height: authStore.modoSuporte ? 'calc(100vh - 2.5rem)' : '100vh' }"
  >
    <!-- LOGO (clique expande/recolhe) -->
    <button
      @click="expandida = !expandida"
      class="h-14 w-full flex items-center gap-2.5 px-3 shrink-0 border-b border-white/[0.06] hover:bg-white/[0.04] transition-colors"
      :title="expandida ? 'Recolher menu' : 'Expandir menu'"
    >
      <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-md shadow-orange-900/50 flex items-center justify-center shrink-0">
        <UtensilsCrossed :size="14" class="text-white" />
      </div>
      <div class="overflow-hidden transition-opacity duration-200" :class="expandida ? 'opacity-100' : 'opacity-0'">
        <span class="text-sm font-black text-white tracking-tight whitespace-nowrap">
          Restaurante <span class="text-orange-400">PDV</span>
        </span>
      </div>
    </button>

    <!-- NAVEGAÇÃO -->
    <nav class="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
      <button
        v-for="item in navItems"
        :key="item.rota"
        @click="navegar(item.rota)"
        class="w-full flex items-center h-10 rounded-xl transition-all whitespace-nowrap"
        :class="[
          expandida ? 'gap-3 px-2' : 'justify-center',
          isAtivo(item.rota) ? 'bg-orange-500/[0.10]' : 'hover:bg-white/[0.05]'
        ]"
        :title="item.label"
      >
        <div
          class="size-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150"
          :class="isAtivo(item.rota) ? 'bg-gradient-to-br from-orange-500 to-orange-700 shadow-sm shadow-orange-900/50' : ''"
        >
          <component :is="item.icon" :size="15" :stroke-width="2.2"
            :class="isAtivo(item.rota) ? 'text-white' : 'text-white/35'" />
        </div>
        <span
          class="text-xs font-bold truncate transition-opacity duration-200 flex-1 text-left"
          :class="[expandida ? 'opacity-100' : 'opacity-0 w-0', isAtivo(item.rota) ? 'text-white' : 'text-white/40']"
        >{{ item.label }}</span>
      </button>
    </nav>

    <!-- RODAPÉ: SAIR -->
    <div class="p-2 border-t border-white/[0.06] shrink-0">
      <button
        @click="authStore.logout()"
        class="w-full flex items-center h-10 rounded-xl text-xs font-bold transition-all whitespace-nowrap hover:bg-red-950/40"
        :class="expandida ? 'gap-3 px-2' : 'justify-center'"
        title="Sair"
      >
        <div class="size-8 rounded-xl flex items-center justify-center shrink-0">
          <LogOut :size="15" :stroke-width="2.2" class="text-red-400/60 group-hover:text-red-300" />
        </div>
        <span
          class="text-red-400/60 truncate transition-opacity duration-200"
          :class="expandida ? 'opacity-100' : 'opacity-0 w-0'"
        >Sair</span>
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

watch(expandida, aberta => {
  document.documentElement.classList.toggle('sidebar-expandida', aberta)
}, { immediate: true })

function navegar(rota: string) {
  expandida.value = false
  router.push(rota)
}
</script>
