<template>
  <div class="cdp min-h-dvh">
    <div class="max-w-lg mx-auto px-4 py-6">
      <div v-if="carregando" class="space-y-3"><div class="h-16 rounded-2xl cdp-skel" /><div class="h-64 rounded-2xl cdp-skel" /></div>
      <div v-else-if="erro" class="pt-20 text-center">
        <p class="text-lg font-black">Pedido não encontrado</p>
        <p class="cdp-mudo text-sm mt-2">Confira o código <b class="font-mono">{{ codigo }}</b>.</p>
      </div>

      <template v-else-if="p">
        <header class="flex items-center gap-3">
          <img v-if="p.restaurante.logo" :src="p.restaurante.logo" alt="" class="size-12 rounded-2xl object-contain cdp-cartao p-1" />
          <span v-else class="size-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center"><UtensilsCrossed :size="20" /></span>
          <div class="min-w-0">
            <p class="text-xs cdp-mudo">Pedido <b class="font-mono cdp-txt">{{ p.codigo }}</b></p>
            <h1 class="text-lg font-black truncate">{{ p.restaurante.nome }}</h1>
          </div>
        </header>

        <!-- Situação -->
        <section class="mt-5 rounded-3xl cdp-cartao p-5" aria-live="polite">
          <template v-if="p.status === 'recusado' || p.status === 'cancelado'">
            <p class="text-xl font-black text-red-600 dark:text-red-400">Pedido não aceito</p>
            <p class="text-sm mt-1">{{ p.motivoRecusa || 'O restaurante não pôde atender este pedido.' }}</p>
            <p class="text-xs cdp-mudo mt-3">Nada foi cobrado.</p>
          </template>
          <template v-else>
            <p class="text-xl font-black">{{ TITULO[p.status] ?? 'Pedido recebido' }}</p>
            <p class="text-sm cdp-mudo mt-1">{{ SUB(p) }}</p>

            <ol class="mt-5 space-y-0">
              <li v-for="(e, i) in etapas" :key="e.chave" class="flex gap-3">
                <div class="flex flex-col items-center">
                  <span class="size-7 rounded-full flex items-center justify-center shrink-0"
                    :class="i < atual ? 'bg-emerald-500 text-white' : i === atual ? 'bg-orange-500 text-white ring-4 ring-orange-500/20' : 'cdp-chip cdp-mudo'">
                    <Check v-if="i < atual" :size="14" /><component :is="e.icone" v-else :size="14" />
                  </span>
                  <span v-if="i < etapas.length - 1" class="w-0.5 flex-1 min-h-6" :class="i < atual ? 'bg-emerald-500' : 'cdp-chip'" />
                </div>
                <div class="pb-5">
                  <p class="text-sm font-bold" :class="i > atual ? 'cdp-mudo' : ''">{{ e.rotulo }}</p>
                  <p v-if="quando(e.chave)" class="text-xs cdp-mudo tabular-nums">{{ quando(e.chave) }}</p>
                </div>
              </li>
            </ol>
          </template>
        </section>

        <!-- Itens -->
        <section class="mt-4 rounded-3xl cdp-cartao p-5">
          <h2 class="text-sm font-black mb-2">{{ p.tipo === 'entrega' ? 'Entrega' : 'Retirada no local' }} · {{ p.clienteNome }}</h2>
          <ul class="text-sm space-y-1.5">
            <li v-for="(i, k) in p.itens" :key="k" class="flex justify-between gap-3"><span>{{ i.quantidade }}× {{ i.nome }}</span><span class="tabular-nums">{{ moeda(i.preco * i.quantidade) }}</span></li>
          </ul>
          <dl class="mt-3 pt-3 border-t cdp-linha text-sm space-y-1 tabular-nums">
            <div v-if="p.taxaEntrega" class="flex justify-between"><dt class="cdp-mudo">Entrega</dt><dd>{{ moeda(p.taxaEntrega) }}</dd></div>
            <div class="flex justify-between font-black"><dt>Total</dt><dd>{{ moeda(p.total) }}</dd></div>
            <div class="flex justify-between cdp-mudo text-xs pt-1"><dt>Pagamento {{ p.tipo === 'entrega' ? 'na entrega' : 'na retirada' }}</dt><dd>{{ FORMA[p.formaPagamento] }}{{ p.trocoPara ? ` · troco para ${moeda(p.trocoPara)}` : '' }}</dd></div>
          </dl>
        </section>

        <a :href="`${base}cardapio/${p.restaurante.slug}`" class="mt-5 block text-center text-sm font-bold text-orange-600 dark:text-orange-400">Voltar ao cardápio</a>
        <p v-if="!final" class="text-center text-[11px] cdp-mudo mt-2">Esta página se atualiza sozinha.</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Check, Inbox, ChefHat, PackageCheck, Bike, Home, UtensilsCrossed } from 'lucide-vue-next'
import { useTemaDoAparelho } from '~/composables/useTemaDoAparelho'

definePageMeta({ layout: false })
useTemaDoAparelho()

const route = useRoute()
const codigo = String(route.params.codigo || '').toUpperCase()
const config = useRuntimeConfig()
const base = config.app.baseURL
useHead({ title: `Pedido ${codigo}` })

const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const FORMA: Record<string, string> = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' }
const TITULO: Record<string, string> = {
  recebido: 'Aguardando o restaurante', aceito: 'Pedido aceito', preparando: 'Em preparo',
  pronto: 'Pronto', em_rota: 'Saiu para entrega', entregue: 'Entregue',
}
const SUB = (p: any) => ({
  recebido: 'O restaurante vai confirmar em instantes.',
  aceito: `Previsão: ${previsao(p)}.`,
  preparando: `Previsão: ${previsao(p)}.`,
  pronto: p.tipo === 'entrega' ? 'Logo sai para entrega.' : 'Pode vir buscar.',
  em_rota: 'O entregador está a caminho.',
  entregue: 'Bom apetite!',
} as Record<string, string>)[p.status] ?? ''

const p = ref<any>(null)
const carregando = ref(true)
const erro = ref(false)

const etapas = computed(() => [
  { chave: 'recebido', rotulo: 'Pedido enviado', icone: Inbox },
  { chave: 'aceito', rotulo: 'Aceito e em preparo', icone: ChefHat },
  { chave: 'pronto', rotulo: p.value?.tipo === 'entrega' ? 'Pronto' : 'Pronto para retirar', icone: PackageCheck },
  ...(p.value?.tipo === 'entrega' ? [{ chave: 'em_rota', rotulo: 'Saiu para entrega', icone: Bike }] : []),
  { chave: 'entregue', rotulo: p.value?.tipo === 'entrega' ? 'Entregue' : 'Retirado', icone: Home },
])
const atual = computed(() => {
  const s = p.value?.status === 'preparando' ? 'aceito' : p.value?.status
  const i = etapas.value.findIndex(e => e.chave === s)
  return s === 'entregue' ? etapas.value.length : Math.max(0, i)
})
const final = computed(() => ['entregue', 'recusado', 'cancelado'].includes(p.value?.status))
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const quando = (chave: string) => (p.value?.linhaDoTempo?.[chave] ? hora(p.value.linhaDoTempo[chave]) : '')
function previsao(x: any) {
  const ini = new Date(x.linhaDoTempo.aceito ?? x.linhaDoTempo.recebido).getTime()
  return `${hora(new Date(ini + x.tempoMin * 60000).toISOString())} – ${hora(new Date(ini + (x.tempoMin + 15) * 60000).toISOString())}`
}

let timer: ReturnType<typeof setInterval> | null = null
async function carregar() {
  try {
    p.value = await $fetch<any>(`${config.public.apiUrl}/api/publico/pedidos/${encodeURIComponent(codigo)}`)
    erro.value = false
    if (final.value && timer) { clearInterval(timer); timer = null }
  } catch { if (!p.value) erro.value = true }
  finally { carregando.value = false }
}
onMounted(() => {
  carregar()
  timer = setInterval(() => { if (!document.hidden) carregar() }, 15000)
  document.addEventListener('visibilitychange', carregar)
})
onUnmounted(() => { if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', carregar) })
</script>

<style>
/* Global (prefixo .cdp): as folhas são componentes de render function e não recebem o atributo do scoped */
.cdp { background: var(--cdp-fundo); color: var(--cdp-txt); font-family: var(--fonte-texto, system-ui), system-ui, sans-serif; }
.cdp-cartao { background: var(--cdp-cartao); border: 1px solid var(--cdp-linha); }
.cdp-chip { background: var(--cdp-chip); }
.cdp-linha { border-color: var(--cdp-linha); }
.cdp-mudo { color: var(--cdp-mudo); }
.cdp-txt { color: var(--cdp-txt); }
.cdp-skel { background: var(--cdp-chip); animation: pulse 1.4s ease-in-out infinite; }
</style>

<style>
:root { --cdp-fundo: #ffffff; --cdp-cartao: #ffffff; --cdp-chip: #f3f4f6; --cdp-linha: #e5e7eb; --cdp-txt: #111827; --cdp-mudo: #6b7280; }
html.dark { --cdp-fundo: #0e1119; --cdp-cartao: #171c27; --cdp-chip: #222938; --cdp-linha: #2b3345; --cdp-txt: #f1f4f9; --cdp-mudo: #a9b3c6; }
</style>
