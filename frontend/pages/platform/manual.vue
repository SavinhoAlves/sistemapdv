<template>
  <PlatformShell ativo="manual" titulo="Manual">
    <div class="pf-head">
      <div>
        <h1>Manual de uso</h1>
        <p>Aulas com a tela gravada no sistema e o passo a passo. Compartilhe o link com os restaurantes.</p>
      </div>
    </div>

    <!-- Link público para compartilhar -->
    <section class="pf-card man-link">
      <div class="man-link__txt">
        <p class="man-link__rot">Link do manual (não precisa de login)</p>
        <input :value="link" readonly aria-label="Link do manual" class="man-link__campo" @focus="($event.target as HTMLInputElement).select()" />
        <p class="man-link__obs">Mostra as 7 aulas do restaurante. A aula da Central (gestor) aparece só aqui no painel.</p>
      </div>
      <div class="man-link__acoes">
        <button class="pf-btn p" @click="copiar"><Copy :size="16" /> {{ copiado ? 'Copiado' : 'Copiar link' }}</button>
        <button v-if="podeCompartilhar" class="pf-btn" @click="compartilhar"><Share2 :size="16" /> Compartilhar</button>
        <a class="pf-btn" :href="link" target="_blank" rel="noopener"><ExternalLink :size="16" /> Abrir</a>
      </div>
    </section>

    <div class="man-painel">
      <ManualAulas publico="todos" />
    </div>
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Copy, Share2, ExternalLink } from 'lucide-vue-next'
import PlatformShell from '~/components/platform/PlatformShell.vue'
import ManualAulas from '~/components/ManualAulas.vue'
import { urlDoHost } from '~/lib/hosts'

definePageMeta({ layout: false })

// O manual público mora no app.<domínio> (o painel exige login de gestor)
const link = ref('')
onMounted(() => { link.value = location.hostname.startsWith('painel.') ? urlDoHost('app', '/manual') : `${location.origin}/manual` })
const copiado = ref(false)
async function copiar() {
  try { await navigator.clipboard.writeText(link.value); copiado.value = true; setTimeout(() => (copiado.value = false), 2000) } catch {}
}
const podeCompartilhar = computed(() => typeof navigator !== 'undefined' && 'share' in navigator)
async function compartilhar() {
  try { await navigator.share({ title: 'Manual do RestaurantePDV', text: 'Aulas de uso do RestaurantePDV', url: link.value }) } catch {}
}
</script>

<style scoped>
.man-link { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; }
.man-link__txt { flex: 1; min-width: 260px; }
.man-link__rot { font-size: 12px; font-weight: 800; color: var(--pf-muted); text-transform: uppercase; letter-spacing: .06em; }
.man-link__campo { margin-top: 6px; width: 100%; height: 42px; padding: 0 12px; border-radius: 12px; border: 1px solid var(--pf-line); background: var(--pf-bg); color: var(--pf-ink); font-family: ui-monospace, monospace; font-size: 13px; }
.man-link__obs { margin-top: 6px; font-size: 12px; color: var(--pf-muted); }
.man-link__acoes { display: flex; flex-wrap: wrap; gap: 8px; }
.man-painel { --man-cartao: var(--pf-card); --man-linha: var(--pf-line); --man-txt: var(--pf-ink); --man-mudo: var(--pf-muted); }
</style>
