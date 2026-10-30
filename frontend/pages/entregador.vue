<template>
  <div class="eq ent">
    <!-- Topo -->
    <header class="ent-topo">
      <span class="eq-logo"><Bike :size="22" :stroke-width="2.2" /></span>
      <div class="flex-1 min-w-0">
        <p class="ent-nome truncate">{{ authStore.usuario?.nome?.split(' ')[0] }} · Entregas</p>
        <p class="ent-gps" :class="gpsCor"><span class="ent-gps-ponto" />{{ gpsTexto }}</p>
      </div>
      <button class="eq-icone" aria-label="Atualizar" @click="carregar"><RefreshCw :size="19" :class="carregando ? 'animate-spin' : ''" /></button>
      <button class="eq-icone" aria-label="Sair" @click="sair"><LogOut :size="19" /></button>
    </header>

    <!-- Resumo -->
    <div class="ent-resumo">
      <div class="ent-num"><p>Comigo</p><strong class="eq-titulo">{{ pendentes.length }}</strong></div>
      <div class="ent-num"><p>Hoje</p><strong class="eq-titulo">{{ feitas.length }}</strong></div>
      <div class="ent-num marca"><p>A cobrar</p><strong class="eq-mono">{{ moeda(aCobrar) }}</strong></div>
    </div>

    <main class="ent-lista">
      <!-- Aviso: navegador para de mandar GPS com a tela apagada -->
      <p v-if="!rastreio.nativo && emRota" class="eq-aviso eq-aviso-alerta">
        Deixe esta tela aberta: no navegador, a localização para quando a tela apaga.
        <a v-if="linkApp" :href="linkApp" class="ent-link">Instale o app RestaurantePDV</a> para enviar com a tela apagada.
      </p>
      <p v-if="rastreio.estado.value === 'sem-permissao'" class="eq-aviso eq-aviso-erro">
        Permita o acesso à localização (sempre) nas configurações do celular para o restaurante e os clientes verem onde você está.
      </p>

      <!-- Notificações: avisa pedido novo com o app fechado -->
      <div v-if="push.disponivel.value && !push.ativo.value" class="eq-cartao ent-push">
        <span class="ent-push-ic"><BellRing :size="20" /></span>
        <div class="flex-1 min-w-0">
          <p class="ent-push-t">Avisar pedido novo</p>
          <p v-if="push.negado.value" class="ent-push-d">Notificações bloqueadas. Libere nas configurações do navegador para este site.</p>
          <p v-else-if="push.iphoneSemInstalar" class="ent-push-d">No iPhone: toque em Compartilhar → "Adicionar à Tela de Início" e abra por lá.</p>
          <p v-else class="ent-push-d">Receba um alerta quando o caixa mandar uma entrega, mesmo com o app fechado.</p>
        </div>
        <button v-if="!push.negado.value && !push.iphoneSemInstalar" class="ent-push-btn" :disabled="push.ocupado.value" @click="ativarPush">Ativar</button>
      </div>

      <!-- Sair para entrega -->
      <button v-if="aguardando.length" class="eq-btn eq-btn-primario" :disabled="ocupado" @click="iniciarRota">
        <Navigation :size="22" />
        <span class="flex-1">Sair para entrega · {{ aguardando.length }} {{ aguardando.length === 1 ? 'pedido' : 'pedidos' }}</span>
        <span class="eq-btn-seta"><ArrowRight :size="20" /></span>
      </button>

      <!-- Mapa da rota -->
      <div v-if="pendentes.length" class="ent-mapa">
        <MapaDelivery :marcadores="marcadores" :rotas="rotas" altura="240px" descricao="Mapa da sua rota" vazio="Os endereços ainda estão sendo localizados" />
      </div>

      <!-- Nenhuma entrega -->
      <div v-if="!carregando && !pendentes.length" class="ent-vazio">
        <div class="ent-radar" aria-hidden="true">
          <i /><i /><i />
          <span class="ent-radar-ic"><Bike :size="30" /></span>
        </div>
        <h3 class="eq-titulo">Nenhuma entrega com você agora.</h3>
        <p>Quando o caixa atribuir um pedido, ele aparece aqui.</p>
        <button class="eq-btn eq-btn-secundario ent-vazio-btn" @click="carregar"><RefreshCw :size="18" /> Atualizar</button>
      </div>

      <!-- Tickets -->
      <article v-for="(p, i) in pendentes" :key="p.id" class="ent-ticket eq-entra" :class="{ ativo: i === 0 && emRota }">
        <div class="ent-ticket-cab">
          <div class="ent-ticket-id">
            <span v-if="varias" class="ent-parada" :aria-label="`Parada ${i + 1}`">{{ i + 1 }}</span>
            <span class="eq-mono">#{{ p.pedidoNumero ?? p.codigo }}</span>
          </div>
          <span class="ent-chip" :class="chipDe(p).cls">{{ chipDe(p).txt }}</span>
        </div>
        <div class="ent-etapas" :aria-label="`Etapa: ${p.status === 'em_rota' ? 'a caminho' : 'atribuído'}`">
          <div v-for="(e, k) in ETAPAS" :key="e" class="ent-etapa" :class="{ feita: k === 0 || (k === 1 && p.status === 'em_rota') }">
            <i /><span>{{ e }}</span>
          </div>
        </div>

        <div class="ent-picote" aria-hidden="true" />

        <div class="ent-ticket-corpo">
          <div class="ent-end">
            <MapPin :size="20" class="ent-end-ic" />
            <div class="min-w-0">
              <p class="ent-end-rua">{{ p.endereco }}, {{ p.numero }}<template v-if="p.complemento"> · {{ p.complemento }}</template></p>
              <p class="ent-end-bairro">{{ p.bairro }} · {{ p.clienteNome }}</p>
              <p v-if="p.referencia" class="ent-end-ref">{{ p.referencia }}</p>
            </div>
          </div>

          <div class="eq-poco ent-pag">
            <div class="min-w-0">
              <p class="ent-pag-forma">{{ FORMA[p.formaPagamento] || p.formaPagamento }}</p>
              <p v-if="p.trocoPara" class="ent-pag-troco">Troco para {{ moeda(p.trocoPara) }} · levar {{ moeda(p.trocoPara - p.total) }}</p>
              <p v-else-if="p.itens?.length" class="ent-pag-nota">{{ qtdItens(p) }} {{ qtdItens(p) === 1 ? 'item' : 'itens' }}</p>
            </div>
            <span class="eq-mono ent-pag-total">{{ moeda(p.total) }}</span>
          </div>

          <div class="ent-acoes">
            <a :href="linkNavegar(p)" target="_blank" rel="noopener" class="ent-acao"><Navigation :size="17" /> Mapa</a>
            <a :href="`tel:${p.clienteTelefone}`" class="ent-acao"><Phone :size="17" /> Ligar</a>
            <a :href="`https://wa.me/55${p.clienteTelefone}`" target="_blank" rel="noopener" class="ent-acao"><MessageCircle :size="17" /> WhatsApp</a>
          </div>

          <p v-if="p.status === 'em_rota' && p.codigoBloqueado" class="eq-aviso eq-aviso-alerta">
            Código bloqueado por tentativas erradas. Peça ao caixa para concluir esta entrega.
          </p>
          <!-- Deslizar para confirmar: evita marcar entregue com um toque sem querer -->
          <div v-else-if="p.status === 'em_rota'" class="ent-deslize" :class="{ ocupado }">
            <div class="ent-deslize-cheio" :style="{ width: `${(arraste?.id === p.id ? arraste.x : 0) + 58}px`, transition: arraste?.id === p.id ? 'none' : undefined }" />
            <span class="ent-deslize-txt" :style="{ opacity: arraste?.id === p.id ? Math.max(0, 1 - arraste.x / 140) : 1 }">
              {{ p.exigeCodigo ? 'Deslize e digite o código' : 'Deslize para confirmar entrega' }}
            </span>
            <button
              class="ent-deslize-pega"
              :style="{ transform: `translateX(${arraste?.id === p.id ? arraste.x : 0}px)`, transition: arraste?.id === p.id ? 'none' : undefined }"
              :aria-label="p.exigeCodigo ? `Confirmar entrega para ${p.clienteNome} com o código` : `Confirmar entrega para ${p.clienteNome}`"
              :disabled="ocupado"
              @pointerdown="comecarArraste($event, p)"
              @keydown.enter.prevent="confirmarEntrega(p)"
              @keydown.space.prevent="confirmarEntrega(p)"
            >
              <Check :size="24" :stroke-width="2.6" />
            </button>
          </div>
          <p v-else class="ent-espera">{{ p.etapa === 'pronto' ? 'Pronto para sair.' : 'Ainda na cozinha.' }}</p>
        </div>
      </article>

      <section v-if="feitas.length" class="ent-feitas">
        <p class="eq-rotulo">Entregues hoje · {{ feitas.length }}</p>
        <div class="eq-cartao ent-feitas-lista">
          <div v-for="p in feitas" :key="p.id" class="ent-feita">
            <Check :size="16" class="ent-feita-ic" />
            <span class="flex-1 truncate">{{ p.clienteNome }} · {{ p.bairro }}</span>
            <span class="eq-mono eq-mudo">{{ hora(p.entregaConfirmadaEm) }}</span>
          </div>
        </div>
        <p class="ent-feitas-nota">Acerte o dinheiro e as maquininhas no caixa ao voltar.</p>
      </section>
    </main>

    <!-- Código de entrega -->
    <Teleport to="body">
      <Transition name="eq-folha">
        <div v-if="codigoDe" class="eq eq-folha-fundo" @click.self="codigoDe = null">
          <form class="eq-folha ent-cod" role="dialog" aria-modal="true" aria-labelledby="cod-t" @submit.prevent="confirmarCodigo">
            <div class="eq-folha-alca" />
            <p class="eq-rotulo eq-rotulo-marca" style="margin-top:18px">Confirmar entrega</p>
            <h2 id="cod-t" class="eq-titulo">Código de entrega</h2>
            <p class="eq-mudo ent-cod-d">Peça a {{ codigoDe.clienteNome.split(' ')[0] }} os 4 números que aparecem no acompanhamento do pedido.</p>
            <input v-model="codigoDigitado" class="ent-cod-campo eq-mono" inputmode="numeric" autocomplete="one-time-code" maxlength="4" pattern="[0-9]*" autofocus aria-label="Código de 4 números" placeholder="····">
            <p v-if="erroCodigo" class="ent-cod-erro" role="alert">{{ erroCodigo }}</p>
            <div class="ent-cod-acoes">
              <button type="button" class="eq-btn eq-btn-secundario" @click="codigoDe = null">Cancelar</button>
              <button type="submit" class="eq-btn eq-btn-primario" :disabled="ocupado"><span class="flex-1">Confirmar</span><span class="eq-btn-seta"><Check :size="20" /></span></button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Bike, RefreshCw, LogOut, Navigation, Phone, MessageCircle, Check, BellRing, ArrowRight, MapPin } from 'lucide-vue-next'
import MapaDelivery from '~/components/MapaDelivery.vue'
import { useApi } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { useToastStore } from '~/stores/toast'
import { useSocket } from '~/services/socket'
import { useRastreioEntregador } from '~/composables/useRastreioEntregador'
import { usePushEntregador } from '~/composables/usePushEntregador'
import { EVENTOS } from '~/shared/eventos'

definePageMeta({ layout: false })
useHead({
  title: 'Minhas entregas',
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }, { name: 'theme-color', content: '#0A0A0B' }],
  // Instalável na tela inicial (no iPhone o push só funciona assim)
  link: [{ rel: 'manifest', href: '/entregador.webmanifest' }, { rel: 'apple-touch-icon', href: '/icone-entregador.svg' }],
})

const api = useApi()
const authStore = useAuthStore()
const toast = useToastStore()
const socket = useSocket()
const rastreio = useRastreioEntregador()
const push = usePushEntregador()

const FORMA: Record<string, string> = { pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito', cartao: 'Cartão', dinheiro: 'Dinheiro' }
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
const gpsCor = computed(() => rastreio.estado.value === 'ativo' ? 'ligado' : emRota.value ? 'falha' : '')

// O entregador recebe o que não foi pago pelo Pix do cardápio (dinheiro e cartão na maquininha)
const aCobrar = computed(() => pendentes.value.filter((p: any) => p.formaPagamento !== 'pix').reduce((s: number, p: any) => s + Number(p.total || 0), 0))
const qtdItens = (p: any) => (p.itens || []).reduce((s: number, i: any) => s + (i.quantidade || 1), 0)
const ETAPAS = ['Atribuído', 'A caminho', 'Entregue']
function chipDe(p: any) {
  if (p.status === 'em_rota') return { txt: 'A caminho', cls: 'rota' }
  return p.etapa === 'pronto' ? { txt: 'Pronto', cls: 'pronto' } : { txt: 'Na cozinha', cls: '' }
}

// ── Deslizar para confirmar ─────────────────────────────────────────────────
const arraste = ref<{ id: string; x: number } | null>(null)
function confirmarEntrega(p: any) {
  if (ocupado.value) return
  if (p.exigeCodigo) pedirCodigo(p)
  else entreguei(p)
}
function comecarArraste(e: PointerEvent, p: any) {
  if (ocupado.value) return
  e.preventDefault() // sem selecionar texto enquanto arrasta
  const pega = e.currentTarget as HTMLElement
  const trilho = pega.parentElement!
  const max = trilho.clientWidth - pega.offsetWidth - 10
  const inicio = e.clientX
  pega.setPointerCapture(e.pointerId)
  arraste.value = { id: p.id, x: 0 }
  const mover = (ev: PointerEvent) => { if (arraste.value) arraste.value.x = Math.min(max, Math.max(0, ev.clientX - inicio)) }
  const soltar = () => {
    pega.removeEventListener('pointermove', mover)
    pega.removeEventListener('pointerup', soltar)
    pega.removeEventListener('pointercancel', soltar)
    const chegou = (arraste.value?.x ?? 0) >= max * 0.85
    arraste.value = null
    if (chegou) confirmarEntrega(p)
  }
  pega.addEventListener('pointermove', mover)
  pega.addEventListener('pointerup', soltar)
  pega.addEventListener('pointercancel', soltar)
}

const marcadores = computed(() => {
  const m: any[] = []
  const r = rota.value?.restaurante
  if (r?.local) m.push({ id: 'r', tipo: 'restaurante', ...r.local, titulo: r.nome })
  if (rastreio.ultima.value) m.push({ id: 'eu', tipo: 'entregador', lat: rastreio.ultima.value.lat, lng: rastreio.ultima.value.lng, titulo: 'Você' })
  // Paradas numeradas na ordem da rota; com uma só, o pino é o destino (sem "1")
  pendentes.value.forEach((p: any, i: number) => {
    if (!p.destino) return
    m.push(varias.value
      ? { id: p.id, tipo: 'parada', ...p.destino, rotulo: String(i + 1), titulo: `${i + 1}. ${p.clienteNome}` }
      : { id: p.id, tipo: 'destino', ...p.destino, rotulo: '★', titulo: p.clienteNome })
  })
  return m
})
const varias = computed(() => pendentes.value.length > 1)
// Rota destacada passando por todas as paradas, na ordem, a partir de onde ele está
// (ou do restaurante, antes de sair)
const rotas = computed(() => {
  const de = rastreio.ultima.value ?? rota.value?.restaurante?.local
  const paradas = pendentes.value.filter((p: any) => p.destino).map((p: any) => p.destino)
  return de && paradas.length ? [{ id: 'rota', pontos: [{ lat: de.lat, lng: de.lng }, ...paradas], destaque: emRota.value }] : []
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
async function entreguei(p: any, codigo?: string) {
  ocupado.value = true
  try {
    const r = await api.post<any>(`/entregador/pedidos/${p.id}/entregue`, codigo ? { codigo } : undefined)
    rota.value = r
    // Entregue, mas o pagamento ficou para o caixa (caixa fechado, forma sem correspondente…)
    if (r?.aviso) toast.warning(`Entregue para ${p.clienteNome.split(' ')[0]}`, r.aviso)
    else toast.success(`Entregue para ${p.clienteNome.split(' ')[0]}`)
    return true
  } catch (e: any) {
    if (codigo) erroCodigo.value = e?.message || 'Código incorreto'
    else toast.error(e?.message || 'Não deu para confirmar')
    if (e?.status === 423 || /bloqueado/i.test(e?.message ?? '')) { codigoDe.value = null; carregar() }
    return false
  } finally { ocupado.value = false }
}

// Código de entrega: o cliente informa os 4 dígitos que aparecem no acompanhamento
const codigoDe = ref<any>(null)
const codigoDigitado = ref('')
const erroCodigo = ref('')
function pedirCodigo(p: any) { codigoDe.value = p; codigoDigitado.value = ''; erroCodigo.value = '' }
async function confirmarCodigo() {
  const c = codigoDigitado.value.replace(/\D/g, '')
  if (c.length !== 4) { erroCodigo.value = 'O código tem 4 números'; return }
  if (await entreguei(codigoDe.value, c)) codigoDe.value = null
}
async function sair() { await rastreio.parar(); await push.desativar(); navigateTo('/logout') }
async function ativarPush() {
  try {
    if (await push.ativar()) toast.success('Notificações ligadas', 'Você recebe um alerta a cada entrega nova.')
  } catch (e: any) { toast.error(e?.message || 'Não deu para ligar as notificações') }
}

// GPS ligado só com rota em andamento
watch(emRota, (v) => { v ? rastreio.iniciar() : rastreio.parar() })

let timer: any = null
const desinscrever: Array<() => void> = []
onMounted(async () => {
  // App da equipe é sempre escuro (o mapa acompanha o html.dark)
  document.documentElement.classList.add('dark')
  await carregar()
  if (emRota.value) rastreio.iniciar()
  push.verificar()
  desinscrever.push(socket.on(EVENTOS.delivery.atualizado, () => carregar()))
  timer = setInterval(() => { if (!document.hidden) carregar() }, 30000)
})
onUnmounted(() => { clearInterval(timer); desinscrever.forEach(f => f()) })
</script>

<style scoped>
.ent { min-height: 100dvh; padding-top: env(safe-area-inset-top); padding-bottom: calc(32px + env(safe-area-inset-bottom)); }
.ent-topo { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px; max-width: 560px; margin: 0 auto; padding: 10px 18px 16px; background: color-mix(in srgb, var(--eq-fundo) 92%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.ent-nome { margin: 0; font: 800 19px/1.15 var(--eq-titulo); letter-spacing: -.01em; }
.ent-gps { display: flex; align-items: center; gap: 6px; margin: 2px 0 0; font: 500 13px var(--eq-texto); color: var(--eq-mudo); }
.ent-gps-ponto { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex: none; }
.ent-gps.ligado { color: var(--eq-ok); }
.ent-gps.ligado .ent-gps-ponto { animation: ent-pisca 1.6s ease-in-out infinite; }
.ent-gps.falha { color: var(--eq-perigo); }
@keyframes ent-pisca { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }

.ent-resumo { display: grid; grid-template-columns: 1fr 1fr 1.25fr; gap: 8px; max-width: 560px; margin: 0 auto; padding: 0 18px 18px; }
.ent-num { padding: 12px 14px; border-radius: 18px; background: var(--eq-cartao); min-width: 0; }
.ent-num p { margin: 0; font: 600 11px var(--eq-texto); letter-spacing: .08em; text-transform: uppercase; color: var(--eq-mudo); }
.ent-num strong { display: block; margin-top: 2px; font-size: 26px; line-height: 1.15; }
.ent-num.marca { background: var(--eq-marca-fundo); }
.ent-num.marca p, .ent-num.marca strong { color: var(--eq-marca-clara); }
.ent-num.marca strong { font-size: 17px; line-height: 1.75; font-weight: 700; letter-spacing: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.ent-lista { display: flex; flex-direction: column; gap: 14px; max-width: 560px; margin: 0 auto; padding: 0 18px; }
.ent-link { color: inherit; font-weight: 800; text-decoration: underline; }
.ent-push { display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
.ent-push-ic { flex: none; width: 40px; height: 40px; border-radius: 13px; display: grid; place-items: center; background: var(--eq-marca-fundo); color: var(--eq-marca-clara); }
.ent-push-t { margin: 0; font: 700 15px var(--eq-texto); }
.ent-push-d { margin: 2px 0 0; font: 500 12.5px/1.4 var(--eq-texto); color: var(--eq-mudo); }
.ent-push-btn { flex: none; height: 44px; padding: 0 16px; border-radius: 14px; border: 0; cursor: pointer; background: var(--eq-marca); color: var(--eq-sobre-marca); font: 700 14px var(--eq-texto); }
.ent-push-btn:disabled { opacity: .45; }
.ent-mapa { border-radius: 24px; overflow: hidden; border: 1px solid var(--eq-linha); }

/* Vazio */
.ent-vazio { display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 40px; }
.ent-radar { position: relative; width: 180px; height: 180px; display: grid; place-items: center; }
.ent-radar i { position: absolute; inset: 54px; border-radius: 50%; border: 2px solid rgba(255, 122, 0, .55); animation: eq-pulso 3s ease-out infinite; }
.ent-radar i:nth-child(2) { animation-delay: 1s; }
.ent-radar i:nth-child(3) { animation-delay: 2s; }
.ent-radar-ic { position: relative; width: 72px; height: 72px; border-radius: 24px; display: grid; place-items: center; background: var(--eq-cartao); border: 1px solid var(--eq-linha); color: var(--eq-marca-clara); }
.ent-vazio h3 { margin: 28px 0 8px; font-size: 24px; line-height: 1.15; letter-spacing: -.02em; }
.ent-vazio p { margin: 0; max-width: 280px; font: 500 15px/1.5 var(--eq-texto); color: var(--eq-mudo); }
.ent-vazio-btn { margin-top: 24px; height: 48px; gap: 8px; padding: 0 20px; border-radius: 16px; font-size: 14px; }

/* Ticket */
.ent-ticket { position: relative; border-radius: 24px; background: var(--eq-cartao); border: 1px solid var(--eq-linha); }
.ent-ticket.ativo { border-color: rgba(255, 122, 0, .55); box-shadow: 0 0 0 1px rgba(255, 122, 0, .25), 0 18px 40px rgba(255, 122, 0, .1); }
.ent-ticket-cab { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 18px 0; }
.ent-ticket-id { display: flex; align-items: center; gap: 10px; min-width: 0; font-size: 22px; font-weight: 700; }
.ent-ticket-id .eq-mono { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ent-parada { flex: none; width: 30px; height: 30px; border-radius: 10px; display: grid; place-items: center; background: var(--eq-marca); color: var(--eq-sobre-marca); font: 800 15px var(--eq-titulo); }
.ent-chip { flex: none; padding: 6px 10px; border-radius: 999px; font: 700 11px var(--eq-texto); letter-spacing: .08em; text-transform: uppercase; background: var(--eq-cartao-2); color: var(--eq-mudo); }
.ent-chip.pronto { background: rgba(52, 211, 153, .12); color: var(--eq-ok); }
.ent-chip.rota { background: var(--eq-marca); color: var(--eq-sobre-marca); }
.ent-etapas { display: flex; gap: 4px; padding: 14px 18px 14px; }
.ent-etapa { flex: 1; }
.ent-etapa i { display: block; height: 4px; border-radius: 2px; background: var(--eq-pressionado); }
.ent-etapa span { display: block; margin-top: 6px; font: 600 11px var(--eq-texto); color: var(--eq-apagado); }
.ent-etapa.feita i { background: var(--eq-marca); }
.ent-etapa.feita span { color: var(--eq-tinta); }
/* Picote do ticket, com os recortes nas laterais */
.ent-picote { position: relative; height: 0; margin: 0 18px; border-top: 2px dashed rgba(255, 255, 255, .1); }
.ent-picote::before, .ent-picote::after { content: ''; position: absolute; top: -12px; width: 22px; height: 22px; border-radius: 50%; background: var(--eq-fundo); }
.ent-picote::before { left: -30px; }
.ent-picote::after { right: -30px; }
.ent-ticket-corpo { display: flex; flex-direction: column; gap: 12px; padding: 14px 18px 18px; }
.ent-end { display: flex; gap: 10px; align-items: flex-start; }
.ent-end-ic { flex: none; margin-top: 1px; color: var(--eq-marca-clara); }
.ent-end-rua { margin: 0; font: 700 16px/1.3 var(--eq-texto); }
.ent-end-bairro { margin: 0; font: 500 14px var(--eq-texto); color: var(--eq-mudo); }
.ent-end-ref { margin: 2px 0 0; font: 500 13px var(--eq-texto); color: var(--eq-apagado); }
.ent-pag { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; }
.ent-pag p { margin: 0; }
.ent-pag-forma { font: 600 12px var(--eq-texto); color: var(--eq-mudo); }
.ent-pag-nota { font: 500 12px var(--eq-texto); color: var(--eq-apagado); }
.ent-pag-troco { font: 700 12px var(--eq-texto); color: var(--eq-marca-clara); }
.ent-pag-total { flex: none; font-size: 17px; font-weight: 700; }
.ent-acoes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.ent-acao { display: flex; align-items: center; justify-content: center; gap: 7px; height: 48px; border-radius: 16px; background: var(--eq-cartao-2); color: var(--eq-tinta); font: 600 14px var(--eq-texto); text-decoration: none; }
.ent-acao:active { transform: scale(.97); }
.ent-espera { margin: 0; font: 600 13px var(--eq-texto); color: var(--eq-alerta); }

/* Trilho de deslizar */
.ent-deslize { position: relative; height: 64px; border-radius: 22px; background: var(--eq-fundo); border: 1px solid rgba(255, 122, 0, .35); overflow: hidden; user-select: none; -webkit-user-select: none; }
.ent-deslize.ocupado { opacity: .5; }
.ent-deslize-cheio { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, rgba(255, 122, 0, .15), rgba(255, 122, 0, .55)); transition: width .3s cubic-bezier(.2, .8, .2, 1); }
.ent-deslize-txt { position: absolute; inset: 0; display: flex; align-items: center; padding-left: 76px; font: 700 15px var(--eq-texto); color: var(--eq-marca-clara); pointer-events: none; }
.ent-deslize-pega { position: absolute; top: 5px; left: 5px; width: 52px; height: 52px; border-radius: 17px; border: 0; display: grid; place-items: center; background: var(--eq-marca); color: var(--eq-sobre-marca); cursor: grab; touch-action: none; box-shadow: 0 6px 18px rgba(255, 122, 0, .4); transition: transform .3s cubic-bezier(.2, .8, .2, 1); }
.ent-deslize-pega:active { cursor: grabbing; }

/* Entregues hoje */
.ent-feitas { padding-top: 6px; }
.ent-feitas .eq-rotulo { margin: 0 0 10px; font-size: 11px; letter-spacing: .1em; }
.ent-feitas-lista { padding: 2px 14px; }
.ent-feita { display: flex; align-items: center; gap: 10px; padding: 11px 0; font: 600 14px var(--eq-texto); border-bottom: 1px dashed rgba(255, 255, 255, .08); }
.ent-feita:last-child { border-bottom: 0; }
.ent-feita-ic { flex: none; color: var(--eq-ok); }
.ent-feitas-nota { margin: 10px 4px 0; font: 500 12.5px var(--eq-texto); color: var(--eq-apagado); }

/* Código de entrega */
.ent-cod { padding: 0 20px 22px; }
.ent-cod h2 { margin: 6px 0 0; font-size: 30px; }
.ent-cod-d { margin: 8px 0 0; font: 500 15px/1.45 var(--eq-texto); }
.ent-cod-campo { width: 100%; height: 72px; margin-top: 18px; border-radius: 20px; border: 1px solid var(--eq-linha); background: var(--eq-fundo); color: var(--eq-tinta); text-align: center; font-size: 34px; font-weight: 700; letter-spacing: .5em; padding-left: .5em; outline: none; }
.ent-cod-campo:focus { border-color: rgba(255, 122, 0, .6); }
.ent-cod-erro { margin: 10px 4px 0; font: 600 14px var(--eq-texto); color: var(--eq-perigo); }
.ent-cod-acoes { display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; margin-top: 18px; }
.ent-cod-acoes .eq-btn { height: 60px; }
.ent-cod-acoes .eq-btn-secundario { justify-content: center; }
</style>
