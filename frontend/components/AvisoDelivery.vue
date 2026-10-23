<template>
  <!-- Pedido do cardápio online chega para quem está no caixa/balcão, em qualquer tela -->
  <div v-if="ativo" ref="raiz" class="relative">
    <button class="av-dlv" :class="novos.length ? 'av-dlv--novo' : ''" :aria-expanded="aberto"
      :aria-label="novos.length ? `${novos.length} pedido(s) de delivery esperando` : 'Pedidos de delivery'" @click="alternar">
      <Bike :size="14" class="shrink-0" />
      <span class="hidden sm:inline">Delivery</span>
      <span v-if="novos.length" class="min-w-5 h-5 px-1 rounded-full bg-white text-orange-600 text-[11px] font-black flex items-center justify-center tabular-nums">{{ novos.length }}</span>
    </button>

    <div v-if="aberto" class="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[var(--linha)] bg-[var(--sup-elevado,#fff)] shadow-xl z-50 overflow-hidden" role="dialog" aria-label="Pedidos de delivery esperando">
      <div class="px-4 py-3 border-b border-[var(--linha)] flex items-center justify-between">
        <p class="text-sm font-black text-[var(--txt)]">Delivery · novos</p>
        <NuxtLink to="/delivery" class="text-xs font-black text-orange-600 dark:text-orange-400" @click="aberto = false">Abrir quadro</NuxtLink>
      </div>
      <p v-if="!novos.length" class="px-4 py-6 text-center text-xs text-[var(--txt-2)]">Nenhum pedido esperando.</p>
      <div v-for="p in novos" :key="p.id" class="px-4 py-3 border-b last:border-b-0 border-[var(--linha)]">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="text-sm font-black text-[var(--txt)] truncate">{{ p.clienteNome }}</p>
            <p class="text-[11px] text-[var(--txt-2)]">{{ p.codigo }} · {{ p.tipo === 'entrega' ? `Entrega · ${p.bairro}` : 'Retirada' }} · {{ ha(p.criadoEm) }}</p>
          </div>
          <p class="text-sm font-black tabular-nums text-[var(--txt)] shrink-0">{{ moeda(p.total) }}</p>
        </div>
        <p class="mt-1 text-[11px] text-[var(--txt-2)] truncate">{{ p.itens.map((i: any) => `${i.quantidade}× ${i.nome}`).join(', ') }}</p>
        <div class="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <button class="h-9 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-black disabled:opacity-50" :disabled="ocupado === p.id" @click="aceitar(p)">Aceitar e mandar para a cozinha</button>
          <NuxtLink to="/delivery" class="h-9 px-3 rounded-lg border border-[var(--linha)] text-xs font-black text-[var(--txt-2)] flex items-center" @click="aberto = false">Ver</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Bike } from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useSocket } from '~/services/socket'
import { useAuthStore } from '~/stores/auth'
import { useConfigStore } from '~/stores/configuracoes'
import { useToastStore } from '~/stores/toast'
import { EVENTOS } from '~/shared/eventos'

const api = useApi()
const socket = useSocket()
const auth = useAuthStore()
const config = useConfigStore()
const toast = useToastStore()
const route = useRoute()

// Só para quem cuida do caixa/balcão, com delivery no plano; na própria tela do quadro não repete
const ativo = computed(() => config.delivery_disponivel && auth.temPermissao('gerenciarCaixa') && route.path !== '/delivery')

const pedidos = ref<any[]>([])
const novos = computed(() => pedidos.value.filter(p => p.status === 'recebido').sort((a, b) => a.criadoEm.localeCompare(b.criadoEm)))
const aberto = ref(false)
const ocupado = ref<string | null>(null)
const raiz = ref<HTMLElement | null>(null)

const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
function ha(iso: string) {
  const m = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  return m < 1 ? 'agora' : m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
}

// Uma busca por vez, e não repete em menos de 2 s: o mount e o watch disparavam juntos
let buscando: Promise<void> | null = null
let ultimaBusca = 0
function carregar(forcar = false) {
  if (!ativo.value) return Promise.resolve()
  if (buscando) return buscando
  if (!forcar && Date.now() - ultimaBusca < 2000) return Promise.resolve()
  ultimaBusca = Date.now()
  buscando = api.get<any[]>('/delivery/pedidos').then((r) => { pedidos.value = r }).catch(() => {}).finally(() => { buscando = null })
  return buscando
}
function alternar() { aberto.value = !aberto.value; if (aberto.value) carregar(true) }

async function aceitar(p: any) {
  ocupado.value = p.id
  try {
    const r = await api.post<any>(`/delivery/pedidos/${p.id}/aceitar`)
    const i = pedidos.value.findIndex(x => x.id === p.id)
    if (i >= 0) pedidos.value[i] = r
    toast.success(`Pedido ${p.codigo} na cozinha`)
  } catch (e: any) { toast.error(e?.message || 'Não deu para aceitar') }
  finally { ocupado.value = null }
}

// Som curto de "pedido chegou" (sem arquivo de áudio)
let audio: AudioContext | null = null
function tocar() {
  try {
    audio = audio || new AudioContext()
    if (audio.state === 'suspended') audio.resume()
    ;[988, 1319, 988, 1319].forEach((f, i) => {
      const o = audio!.createOscillator(), g = audio!.createGain()
      o.connect(g); g.connect(audio!.destination); o.type = 'triangle'; o.frequency.value = f
      const t = audio!.currentTime + i * 0.16
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
      o.start(t); o.stop(t + 0.16)
    })
  } catch {}
}
const destravar = () => { try { audio = audio || new AudioContext(); audio.resume() } catch {} }

function fecharFora(e: MouseEvent) { if (aberto.value && raiz.value && !raiz.value.contains(e.target as Node)) aberto.value = false }

const desinscrever: Array<() => void> = []
let timer: any = null
onMounted(async () => {
  await config.carregar() // traz delivery_disponivel (cache de 45 s no store)
  carregar()
  desinscrever.push(socket.on(EVENTOS.delivery.recebido, (d: any) => {
    if (!ativo.value) return
    tocar()
    toast.add({ type: 'info', title: `Novo pedido de delivery · ${d.clienteNome}`, message: 'Toque em "Delivery" no topo para aceitar.', duration: 10000 })
    carregar(true)
  }))
  desinscrever.push(socket.on(EVENTOS.delivery.atualizado, () => carregar(true)))
  // Rede de segurança se o tempo real cair
  timer = setInterval(() => { if (!document.hidden) carregar() }, 60000)
  document.addEventListener('mousedown', fecharFora)
  document.addEventListener('pointerdown', destravar, { once: true })
})
watch(ativo, (v) => { if (v) carregar() })
onBeforeUnmount(() => { desinscrever.forEach(f => f()); clearInterval(timer); document.removeEventListener('mousedown', fecharFora) })
</script>

<style scoped>
/* Estilo próprio: o .nb__caixa da Navbar estreita o 1º span (bolinha de status) e quebrava o texto */
.av-dlv { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 12px; border-radius: var(--r-controle, 10px); border: 1px solid var(--linha); background: var(--sup-elevado); color: var(--txt-2); font-size: var(--t-micro, 12px); font-weight: 700; white-space: nowrap; }
.av-dlv:hover { color: var(--txt); }
.av-dlv--novo { background: #f97316; color: #fff; border-color: #f97316; animation: av-pulso 1.6s ease-in-out infinite; }
@keyframes av-pulso { 0%, 100% { box-shadow: 0 0 0 0 rgb(249 115 22 / 0.5); } 50% { box-shadow: 0 0 0 6px rgb(249 115 22 / 0); } }
@media (prefers-reduced-motion: reduce) { .av-dlv--novo { animation: none; } }
</style>
