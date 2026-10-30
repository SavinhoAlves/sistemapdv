<template>
  <div class="eq lay-m">

    <!-- Topo: saudação e quem está no aparelho (some quando a tela tem o próprio topo, ex.: dentro da mesa) -->
    <header v-if="topoVisivel" class="lay-m-topo">
      <span class="eq-logo"><UtensilsCrossed :size="22" :stroke-width="2.2" /></span>
      <div class="flex-1 min-w-0">
        <p class="lay-m-ola">{{ saudacao }},</p>
        <p class="lay-m-nome truncate">{{ primeiroNome }}<span v-if="labelCargo" class="lay-m-cargo"> · {{ labelCargo }}</span></p>
      </div>
      <button class="lay-m-avatar" :title="`Sair (${authStore.usuario?.nome || ''})`" aria-label="Sair" @click="authStore.logout()">{{ inicial }}</button>
    </header>

    <main class="lay-m-conteudo" :class="{ 'com-abas': navTabs.length > 1 }">
      <slot />
    </main>

    <!-- Abas flutuantes -->
    <nav v-if="navTabs.length > 1" class="lay-m-nav" aria-label="Telas do app">
      <div class="eq-abas">
        <button
          v-for="tab in navTabs"
          :key="tab.path"
          class="eq-aba"
          :aria-current="isActive(tab.path) ? 'page' : undefined"
          @click="navigateTo(tab.path)"
        >
          <component :is="tab.icon" :size="19" />
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
import { useTopoMobile } from '~/composables/useTopoMobile'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const route = useRoute()

const agora = ref(new Date())
let clockTick: ReturnType<typeof setInterval> | null = null
onMounted(() => { clockTick = setInterval(() => { agora.value = new Date() }, 60000) })
onUnmounted(() => { if (clockTick) clearInterval(clockTick) })

const saudacao = computed(() => {
  const h = agora.value.getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
})

const topoVisivel = useTopoMobile()
useHead({ meta: [{ name: 'theme-color', content: '#0A0A0B' }] })

const primeiroNome = computed(() =>
  (authStore.usuario?.nome || 'Funcionário').split(' ')[0]
)

const inicial = computed(() =>
  (authStore.usuario?.nome || '?').charAt(0).toUpperCase()
)

const labelCargo = computed(() => {
  const map: Record<string, string> = {
    administrador: 'Administrador',
    caixa:         'Caixa',
    cozinha:       'Cozinha',
  }
  // Garçom é o padrão do app: não precisa dizer
  return map[authStore.usuario?.cargo ?? ''] ?? ''
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
.lay-m { min-height: 100dvh; display: flex; flex-direction: column; }
.lay-m-topo { display: flex; align-items: center; gap: 12px; padding: calc(10px + env(safe-area-inset-top)) 18px 4px; }
.lay-m-ola { margin: 0; font: 500 13px var(--eq-texto); color: var(--eq-mudo); }
.lay-m-nome { margin: 0; font: 800 19px/1.15 var(--eq-titulo); letter-spacing: -.01em; }
.lay-m-cargo { font: 600 13px var(--eq-texto); color: var(--eq-mudo); letter-spacing: 0; }
.lay-m-avatar { flex: none; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; background: var(--eq-marca-fundo); border: 1px solid rgba(255, 122, 0, .35); color: var(--eq-marca-clara); font: 800 16px var(--eq-titulo); }
.lay-m-avatar:active { transform: scale(.94); }
.lay-m-conteudo { flex: 1; display: flex; flex-direction: column; padding-bottom: env(safe-area-inset-bottom); }
.lay-m-conteudo.com-abas { padding-bottom: calc(100px + env(safe-area-inset-bottom)); }
.lay-m-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 30; padding: 0 16px max(18px, env(safe-area-inset-bottom)); max-width: 560px; margin: 0 auto; }
</style>
