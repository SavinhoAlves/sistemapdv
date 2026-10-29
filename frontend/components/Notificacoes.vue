<template>
  <!-- Sino do topo: pedidos de delivery esperando, estoque baixo e outros avisos -->
  <div v-if="ativo" ref="raiz" class="relative">
    <button class="nt-sino" :class="{ 'nt-sino--novo': temNovo }" :aria-expanded="aberto"
      :aria-label="total ? `${total} notificação(ões)` : 'Notificações'" @click="alternar">
      <Bell :size="17" />
      <span v-if="total" class="nt-badge">{{ total > 99 ? '99+' : total }}</span>
    </button>

    <div v-if="aberto" class="nt-painel" role="dialog" aria-label="Notificações">
      <div class="nt-topo">
        <p>Notificações</p>
        <span v-if="total">{{ total }}</span>
      </div>

      <p v-if="!total" class="nt-vazio">Nenhuma notificação agora.</p>

      <div class="nt-lista">
        <!-- Delivery -->
        <template v-if="novos.length">
          <div class="nt-grupo"><Bike :size="13" />Delivery · esperando<NuxtLink to="/delivery" @click="aberto = false">Abrir quadro</NuxtLink></div>
          <div v-for="p in novos" :key="p.id" class="nt-item">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="nt-tit truncate">{{ p.clienteNome }}</p>
                <p class="nt-sub">{{ p.codigo }} · {{ p.tipo === 'entrega' ? `Entrega · ${p.bairro}` : 'Retirada' }} · {{ ha(p.criadoEm) }}</p>
              </div>
              <p class="nt-tit tabular-nums shrink-0">{{ moeda(p.total) }}</p>
            </div>
            <p class="nt-sub truncate mt-1">{{ p.itens.map((i: any) => `${i.quantidade}× ${i.nome}`).join(', ') }}</p>
            <div class="mt-2 grid grid-cols-[1fr_auto] gap-2">
              <button class="nt-btn pri" :disabled="ocupado === p.id" @click="aceitar(p)">Aceitar e mandar para a cozinha</button>
              <NuxtLink to="/delivery" class="nt-btn" @click="aberto = false">Ver</NuxtLink>
            </div>
          </div>
        </template>

        <!-- Estoque baixo -->
        <template v-if="estoque.length">
          <div class="nt-grupo"><PackageOpen :size="13" />Estoque baixo<NuxtLink to="/estoque" @click="aberto = false">Ver estoque</NuxtLink></div>
          <NuxtLink v-for="p in estoque" :key="p.id" to="/estoque" class="nt-item nt-item--link" @click="aberto = false">
            <p class="nt-tit truncate">{{ p.nome }}</p>
            <p class="nt-sub">
              <b :class="p.estoqueAtual <= 0 ? 'nt-zero' : 'nt-baixo'">{{ p.estoqueAtual <= 0 ? 'Acabou' : `${num(p.estoqueAtual)} em estoque` }}</b>
              · mínimo {{ num(p.estoqueMinimo) }}
            </p>
          </NuxtLink>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Bell, Bike, PackageOpen } from 'lucide-vue-next'
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

// Cada tipo só para quem cuida dele: delivery para o caixa/balcão (com delivery no plano), estoque para quem gerencia produtos
const veDelivery = computed(() => config.delivery_disponivel && auth.temPermissao('gerenciarCaixa'))
const veEstoque  = computed(() => auth.temPermissao('gerenciarProdutos'))
const ativo = computed(() => veDelivery.value || veEstoque.value)

const pedidos = ref<any[]>([])
const estoque = ref<{ id: string; nome: string; estoqueAtual: number; estoqueMinimo: number }[]>([])
const novos = computed(() => veDelivery.value
  ? pedidos.value.filter(p => p.status === 'recebido').sort((a, b) => a.criadoEm.localeCompare(b.criadoEm))
  : [])
const total = computed(() => novos.value.length + estoque.value.length)
// O sino pulsa só com pedido esperando (estoque baixo não é urgente)
const temNovo = computed(() => novos.value.length > 0)

const aberto = ref(false)
const ocupado = ref<string | null>(null)
const raiz = ref<HTMLElement | null>(null)

const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const num = (v: number) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })
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
  buscando = Promise.all([
    veDelivery.value ? api.get<any[]>('/delivery/pedidos').then(r => { pedidos.value = r }).catch(() => {}) : null,
    veEstoque.value ? api.get<any[]>('/produtos/estoque-baixo').then(r => { estoque.value = r }).catch(() => {}) : null,
  ]).then(() => {}).finally(() => { buscando = null })
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
  // Pedido novo: só o som e o número no sino (sem aviso flutuante)
  desinscrever.push(socket.on(EVENTOS.delivery.recebido, () => {
    if (!veDelivery.value) return
    tocar()
    carregar(true)
  }))
  desinscrever.push(socket.on(EVENTOS.delivery.atualizado, () => carregar(true)))
  // Rede de segurança se o tempo real cair; também atualiza o estoque
  timer = setInterval(() => { if (!document.hidden) carregar() }, 60000)
  document.addEventListener('mousedown', fecharFora)
  document.addEventListener('pointerdown', destravar, { once: true })
})
watch(ativo, (v) => { if (v) carregar() })
onBeforeUnmount(() => { desinscrever.forEach(f => f()); clearInterval(timer); document.removeEventListener('mousedown', fecharFora) })
</script>

<style scoped>
.nt-sino { position: relative; width: 36px; height: 36px; display: grid; place-items: center; border-radius: var(--r-controle, 10px); border: 1px solid var(--linha); background: var(--sup-elevado); color: var(--txt-2); }
.nt-sino:hover { color: var(--txt); }
.nt-sino--novo { color: var(--acao); border-color: var(--acao); animation: nt-pulso 1.6s ease-in-out infinite; }
@keyframes nt-pulso { 0%, 100% { box-shadow: 0 0 0 0 rgb(255 122 0 / .45); } 50% { box-shadow: 0 0 0 6px rgb(255 122 0 / 0); } }
.nt-badge { position: absolute; top: -6px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: var(--acao); color: #0E1119; font: 700 11px/18px var(--fonte-numero); text-align: center; border: 2px solid var(--sup-painel); box-sizing: content-box; }

.nt-painel { position: absolute; right: 0; top: calc(100% + 8px); width: min(23rem, calc(100vw - 2rem)); max-height: min(70vh, 560px); display: flex; flex-direction: column; border-radius: 16px; border: 1px solid var(--linha); background: var(--sup-elevado); box-shadow: 0 20px 40px rgb(0 0 0 / .2); z-index: 50; overflow: hidden; }
.nt-topo { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--linha); }
.nt-topo p { font-size: 14px; font-weight: 800; color: var(--txt); }
.nt-topo span { font: 600 12px var(--fonte-numero); color: var(--txt-3); }
.nt-vazio { padding: 28px 16px; text-align: center; font-size: 13px; color: var(--txt-2); }
.nt-lista { overflow-y: auto; }
.nt-grupo { display: flex; align-items: center; gap: 6px; padding: 10px 16px 6px; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--txt-3); }
.nt-grupo a { margin-left: auto; font-size: 12px; letter-spacing: 0; text-transform: none; color: var(--acao); }
.nt-item { display: block; padding: 10px 16px 12px; border-bottom: 1px solid var(--linha); }
.nt-item:last-child { border-bottom: 0; }
.nt-item--link:hover { background: var(--sup-pressed, var(--sup-cartao)); }
.nt-tit { font-size: 14px; font-weight: 700; color: var(--txt); }
.nt-sub { font-size: 12px; color: var(--txt-2); }
.nt-baixo { color: var(--st-atencao); font-weight: 700; }
.nt-zero { color: var(--st-atencao); font-weight: 800; }
.nt-btn { height: 36px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--linha); font-size: 12px; font-weight: 800; color: var(--txt-2); display: flex; align-items: center; justify-content: center; }
.nt-btn.pri { background: var(--acao); border-color: var(--acao); color: #0E1119; }
.nt-btn.pri:hover { background: var(--acao-hover); }
.nt-btn[disabled] { opacity: .5; }
@media (prefers-reduced-motion: reduce) { .nt-sino--novo { animation: none; } }
</style>
