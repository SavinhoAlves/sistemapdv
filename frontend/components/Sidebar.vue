<template>
  <aside
    class="sb hidden sm:flex fixed left-0 flex-col z-40"
    :class="expandida ? 'w-56' : 'w-16'"
    :style="{ top: authStore.modoSuporte ? '2.5rem' : '0', height: authStore.modoSuporte ? 'calc(100vh - 2.5rem)' : '100vh' }"
  >
    <!-- LOGO (clique expande/recolhe) -->
    <button class="sb__logo" @click="expandida = !expandida" :title="expandida ? 'Recolher menu' : 'Expandir menu'">
      <span class="sb__marca"><UtensilsCrossed :size="16" /></span>
      <span class="sb__texto" :class="{ oculto: !expandida }">Restaurante PDV</span>
    </button>

    <!-- NAVEGAÇÃO -->
    <nav class="flex-1 py-3 px-2 overflow-y-auto overflow-x-hidden flex flex-col gap-3">
      <div v-for="g in grupos" :key="g.nome" class="space-y-1">
        <!-- Título do grupo só com o menu aberto; recolhido fica só o espaço entre os grupos -->
        <span v-if="expandida" class="sb__grupo">{{ g.nome }}</span>
        <button
          v-for="item in g.itens"
          :key="item.rota"
          class="sb__item"
          :class="{ ativo: isAtivo(item.rota), aberto: expandida }"
          :aria-current="isAtivo(item.rota) ? 'page' : undefined"
          :title="item.label"
          @click="navegar(item.rota)"
        >
          <component :is="item.icon" :size="18" :stroke-width="2" class="shrink-0" />
          <span class="sb__texto" :class="{ oculto: !expandida }">{{ item.label }}</span>
        </button>
      </div>
    </nav>

    <!-- RODAPÉ: SAIR -->
    <div class="p-2 shrink-0">
      <button class="sb__item sb__item--sair" :class="{ aberto: expandida }" title="Sair" @click="authStore.logout()">
        <LogOut :size="18" :stroke-width="2" class="shrink-0" />
        <span class="sb__texto" :class="{ oculto: !expandida }">Sair</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { sidebarExpandida as expandida } from '~/composables/useSidebar'
import { useNavItems } from '~/composables/useNavItems'
import { UtensilsCrossed, LogOut } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

const router    = useRouter()
const route     = useRoute()
const authStore = useAuthStore()

const { navItems } = useNavItems()

const grupos = computed(() => (['Operação', 'Gestão', 'Sistema'] as const)
  .map(nome => ({ nome, itens: navItems.value.filter(i => i.grupo === nome) }))
  .filter(g => g.itens.length))

function isAtivo(rota: string) {
  if (rota === '/') return route.path === '/'
  return route.path.startsWith(rota)
}

watch(expandida, aberta => {
  document.documentElement.classList.toggle('sidebar-expandida', aberta)
}, { immediate: true })

function navegar(rota: string) {
  router.push(rota)
}
</script>

<style scoped>
/* Sidebar sobre tokens: superfície sólida, seleção indicada por barra +
   superfície elevada — o laranja fica só na marca e na barra do item ativo. */
.sb {
  background: var(--sup-painel);
  border-right: 1px solid var(--linha);
  transition: width var(--tempo-folha) var(--curva);
  overflow: hidden;
}
.sb__logo {
  height: 56px; width: 100%;
  display: flex; align-items: center; gap: var(--e-3);
  padding: 0 var(--e-3);
  flex-shrink: 0;
  color: var(--txt);
  font-weight: 700;
}
.sb__logo:hover { background: var(--sup-elevado); }
.sb__marca {
  width: 40px; height: 40px; flex-shrink: 0;
  display: grid; place-items: center;
  border-radius: var(--r-controle);
  background: var(--acao); color: #fff;
}
.sb__texto {
  white-space: nowrap;
  font-size: var(--t-micro);
  transition: opacity var(--tempo-folha) var(--curva);
}
.sb__texto.oculto { opacity: 0; width: 0; overflow: hidden; }
.sb__grupo {
  display: block;
  padding: 6px var(--e-3) 2px;
  font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
  color: var(--txt-3);
  white-space: nowrap;
}

.sb__item {
  position: relative;
  width: 100%;
  min-height: var(--toque-min);
  display: flex; align-items: center; justify-content: center; gap: var(--e-3);
  border-radius: var(--r-controle);
  color: var(--txt-2);
  font-weight: 500;
  transition: background-color var(--tempo-toque) var(--curva), color var(--tempo-toque) var(--curva);
}
/* Recolhida, o texto fica com largura 0 mas o gap ainda contava e tirava o ícone do centro */
.sb__item:not(.aberto) { gap: 0; }
.sb__item.aberto { justify-content: flex-start; padding: 0 var(--e-3); }
.sb__item:hover  { background: var(--sup-elevado); color: var(--txt); }
.sb__item.ativo  { background: var(--sup-elevado); color: var(--txt); font-weight: 600; }
.sb__item.ativo::before {
  content: '';
  position: absolute; left: -8px; top: 10px; bottom: 10px;
  width: 3px; border-radius: 0 3px 3px 0;
  background: var(--acao);
}
.sb__item:focus-visible { outline: 2px solid var(--acao); outline-offset: -2px; }
/* Telas baixas (notebook ~660px de altura): o menu inteiro cabe sem rolar */
@media (max-height: 820px) {
  .sb__item { min-height: 38px; }
  .sb__grupo { padding-top: 2px; padding-bottom: 0; }
  nav.flex-col { gap: 6px; padding-top: 6px; padding-bottom: 6px; }
  nav .space-y-1 > * + * { margin-top: 2px; }
}
@media (max-height: 720px) {
  .sb__item { min-height: 33px; font-size: 13px; }
  .sb__logo { height: 48px; }
}
.sb__item--sair       { color: var(--txt-3); }
.sb__item--sair:hover { color: var(--st-atencao); background: var(--st-atencao-bg); }
</style>
