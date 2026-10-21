<template>
  <div class="ent min-h-dvh pb-10" style="padding-top: env(safe-area-inset-top)">
    <!-- Topo -->
    <header class="sticky top-0 z-20 ent-topo border-b ent-linha">
      <div class="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
        <span class="size-9 rounded-xl bg-orange-500 text-white flex items-center justify-center"><Bike :size="18" /></span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-black truncate">{{ authStore.usuario?.nome?.split(' ')[0] }} · Entregas</p>
          <p class="text-[11px] flex items-center gap-1" :class="gpsCor"><span class="size-1.5 rounded-full bg-current" />{{ gpsTexto }}</p>
        </div>
        <button class="size-9 rounded-xl ent-chip flex items-center justify-center" aria-label="Atualizar" @click="carregar"><RefreshCw :size="16" :class="carregando ? 'animate-spin' : ''" /></button>
        <button class="size-9 rounded-xl ent-chip flex items-center justify-center" aria-label="Sair" @click="sair"><LogOut :size="16" /></button>
      </div>
    </header>

    <main class="max-w-xl mx-auto px-4 pt-4 space-y-4">
      <!-- Aviso: navegador para de mandar GPS com a tela apagada -->
      <div v-if="!rastreio.nativo && emRota" class="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-900 dark:text-amber-200">
        Deixe esta tela aberta: no navegador, a localização para quando a tela apaga.
        <a v-if="linkApp" :href="linkApp" class="font-black underline">Instale o app RestaurantePDV</a> para enviar com a tela apagada.
      </div>
      <div v-if="rastreio.estado.value === 'sem-permissao'" class="rounded-2xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-700 dark:text-red-300">
        Permita o acesso à localização (sempre) nas configurações do celular para o restaurante e os clientes verem onde você está.
      </div>

      <!-- Sair para entrega -->
      <button v-if="aguardando.length" class="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base flex items-center justify-center gap-2 disabled:opacity-50"
        :disabled="ocupado" @click="iniciarRota">
        <Navigation :size="18" /> Sair para entrega · {{ aguardando.length }} pedido{{ aguardando.length === 1 ? '' : 's' }}
      </button>

      <!-- Mapa da rota -->
      <MapaDelivery v-if="pendentes.length" :marcadores="marcadores" :trajeto="trajeto" altura="240px" descricao="Mapa da sua rota" vazio="Os endereços ainda estão sendo localizados" />

      <!-- Paradas -->
      <p v-if="!carregando && !pendentes.length" class="text-center ent-mudo py-16 text-sm">
        Nenhuma entrega com você agora.<br>Quando o caixa atribuir um pedido, ele aparece aqui.
      </p>

      <article v-for="(p, i) in pendentes" :key="p.id" class="rounded-2xl ent-cartao p-4" :class="i === 0 && emRota ? 'ring-2 ring-orange-500' : ''">
        <div class="flex items-start gap-3">
          <span class="size-8 rounded-full flex items-center justify-center text-sm font-black shrink-0" :class="i === 0 && emRota ? 'bg-orange-500 text-white' : 'ent-chip'">{{ i + 1 }}</span>
          <div class="flex-1 min-w-0">
            <p class="font-black leading-tight">{{ p.clienteNome }}</p>
            <p class="text-sm mt-1">{{ p.endereco }}, {{ p.numero }}<template v-if="p.complemento"> · {{ p.complemento }}</template></p>
            <p class="text-xs ent-mudo">{{ p.bairro }}<template v-if="p.referencia"> · {{ p.referencia }}</template></p>
            <p class="text-xs mt-2">
              <b>{{ moeda(p.total) }}</b> · {{ FORMA[p.formaPagamento] }}
              <span v-if="p.trocoPara" class="text-orange-600 dark:text-orange-400 font-bold"> · levar troco p/ {{ moeda(p.trocoPara) }} ({{ moeda(p.trocoPara - p.total) }})</span>
            </p>
            <p v-if="p.status !== 'em_rota'" class="text-[11px] mt-1 font-bold text-amber-700 dark:text-amber-300">{{ p.etapa === 'pronto' ? 'Pronto para sair' : 'Ainda na cozinha' }}</p>
          </div>
        </div>
        <div class="mt-3 grid grid-cols-3 gap-2">
          <a :href="linkNavegar(p)" target="_blank" rel="noopener" class="h-11 rounded-xl ent-chip text-xs font-black flex items-center justify-center gap-1.5"><Navigation :size="14" /> Navegar</a>
          <a :href="`tel:${p.clienteTelefone}`" class="h-11 rounded-xl ent-chip text-xs font-black flex items-center justify-center gap-1.5"><Phone :size="14" /> Ligar</a>
          <a :href="`https://wa.me/55${p.clienteTelefone}`" target="_blank" rel="noopener" class="h-11 rounded-xl ent-chip text-xs font-black flex items-center justify-center gap-1.5"><MessageCircle :size="14" /> WhatsApp</a>
        </div>
        <button v-if="p.status === 'em_rota'" class="mt-2 w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center justify-center gap-2 disabled:opacity-50"
          :disabled="ocupado" @click="entreguei(p)">
          <CheckCircle2 :size="18" /> Entreguei
        </button>
      </article>

      <section v-if="feitas.length" class="pt-2">
        <h2 class="text-xs font-black uppercase tracking-widest ent-mudo mb-2">Entregues hoje · {{ feitas.length }}</h2>
        <div class="rounded-2xl ent-cartao divide-y ent-linha">
          <div v-for="p in feitas" :key="p.id" class="px-4 py-2.5 flex justify-between text-sm">
            <span class="truncate">{{ p.clienteNome }} · {{ p.bairro }}</span>
            <span class="ent-mudo tabular-nums shrink-0">{{ hora(p.entregaConfirmadaEm) }}</span>
          </div>
        </div>
        <p class="text-[11px] ent-mudo mt-2">Acerte o dinheiro e as maquininhas no caixa ao voltar.</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Bike, RefreshCw, LogOut, Navigation, Phone, MessageCircle, CheckCircle2 } from 'lucide-vue-next'
import MapaDelivery from '~/components/MapaDelivery.vue'
import { useApi } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { useToastStore } from '~/stores/toast'
import { useSocket } from '~/services/socket'
import { useRastreioEntregador } from '~/composables/useRastreioEntregador'
import { EVENTOS } from '~/shared/eventos'

definePageMeta({ layout: false })
useHead({ title: 'Minhas entregas', meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }] })

const api = useApi()
const authStore = useAuthStore()
const toast = useToastStore()
const socket = useSocket()
const rastreio = useRastreioEntregador()

const FORMA: Record<string, string> = { pix: 'Pix', cartao: 'Cartão', dinheiro: 'Dinheiro' }
const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
// APK mais recente publicado no GitHub (workflow "Android entregador")
const linkApp = 'https://github.com/SavinhoAlves/sistemapdv/releases/latest'

const rota = ref<any>(null)
const carregando = ref(true)
const ocupado = ref(false)
const pendentes = computed(() => rota.value?.pendentes ?? [])
const feitas = computed(() => rota.value?.feitas ?? [])
const aguardando = computed(() => pendentes.value.filter((p: any) => p.status !== 'em_rota'))
const emRota = computed(() => pendentes.value.some((p: any) => p.status === 'em_rota'))

const gpsTexto = computed(() => ({
  ativo: rastreio.ultima.value ? `GPS ligado · ${hora(new Date(rastreio.ultima.value.em).toISOString())}` : 'GPS ligado',
  parado: emRota.value ? 'GPS desligado' : 'Sem rota em andamento',
  'sem-permissao': 'Sem permissão de localização',
  indisponivel: 'Localização indisponível',
} as Record<string, string>)[rastreio.estado.value])
const gpsCor = computed(() => rastreio.estado.value === 'ativo' ? 'text-emerald-600 dark:text-emerald-400' : emRota.value ? 'text-red-600 dark:text-red-400' : 'ent-mudo')

const marcadores = computed(() => {
  const m: any[] = []
  const r = rota.value?.restaurante
  if (r?.local) m.push({ id: 'r', tipo: 'restaurante', ...r.local, titulo: r.nome })
  if (rastreio.ultima.value) m.push({ id: 'eu', tipo: 'entregador', lat: rastreio.ultima.value.lat, lng: rastreio.ultima.value.lng, titulo: 'Você' })
  pendentes.value.forEach((p: any, i: number) => { if (p.destino) m.push({ id: p.id, tipo: 'parada', ...p.destino, rotulo: String(i + 1), titulo: `${i + 1}. ${p.clienteNome}` }) })
  return m
})
const trajeto = computed(() => {
  const proxima = pendentes.value.find((p: any) => p.destino)
  const de = rastreio.ultima.value ?? rota.value?.restaurante?.local
  return emRota.value && proxima && de ? { de: { lat: de.lat, lng: de.lng }, para: proxima.destino } : null
})

function linkNavegar(p: any) {
  const destino = p.destino ? `${p.destino.lat},${p.destino.lng}` : encodeURIComponent(`${p.endereco}, ${p.numero}, ${p.bairro}`)
  return `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`
}

async function carregar() {
  carregando.value = true
  try { rota.value = await api.get('/entregador/rota') } catch (e: any) { toast.error(e?.message || 'Erro ao carregar a rota') }
  finally { carregando.value = false }
}
async function iniciarRota() {
  ocupado.value = true
  try {
    await rastreio.iniciar()
    rota.value = await api.post('/entregador/rota/iniciar')
    toast.success('Boa rota!', 'Os clientes já veem você no mapa.')
  } catch (e: any) { toast.error(e?.message || 'Não deu para iniciar') }
  finally { ocupado.value = false }
}
async function entreguei(p: any) {
  ocupado.value = true
  try { rota.value = await api.post(`/entregador/pedidos/${p.id}/entregue`); toast.success(`Entregue para ${p.clienteNome.split(' ')[0]}`) }
  catch (e: any) { toast.error(e?.message || 'Não deu para confirmar') }
  finally { ocupado.value = false }
}
async function sair() { await rastreio.parar(); navigateTo('/logout') }

// GPS ligado só com rota em andamento
watch(emRota, (v) => { v ? rastreio.iniciar() : rastreio.parar() })

let timer: any = null
const desinscrever: Array<() => void> = []
onMounted(async () => {
  // Segue o tema do aparelho, como as telas do cliente
  document.documentElement.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches)
  await carregar()
  if (emRota.value) rastreio.iniciar()
  desinscrever.push(socket.on(EVENTOS.delivery.atualizado, () => carregar()))
  timer = setInterval(() => { if (!document.hidden) carregar() }, 30000)
})
onUnmounted(() => { clearInterval(timer); desinscrever.forEach(f => f()) })
</script>

<style>
.ent { background: var(--ent-fundo); color: var(--ent-txt); font-family: var(--fonte-texto, system-ui), system-ui, sans-serif; }
.ent-topo { background: color-mix(in srgb, var(--ent-fundo) 94%, transparent); backdrop-filter: blur(8px); }
.ent-cartao { background: var(--ent-cartao); border: 1px solid var(--ent-linha); }
.ent-chip { background: var(--ent-chip); color: var(--ent-txt); }
.ent-linha { border-color: var(--ent-linha); }
.ent-mudo { color: var(--ent-mudo); }
:root { --ent-fundo: #f7f7f8; --ent-cartao: #ffffff; --ent-chip: #f0f1f3; --ent-linha: #e5e7eb; --ent-txt: #111827; --ent-mudo: #6b7280; }
html.dark { --ent-fundo: #0e1119; --ent-cartao: #171c27; --ent-chip: #222938; --ent-linha: #2b3345; --ent-txt: #f1f4f9; --ent-mudo: #a9b3c6; }
</style>
