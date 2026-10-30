<template>
  <PlatformShell ativo="restaurantes" titulo="Acesso remoto">
    <div class="pf-head">
      <div>
        <h1>{{ tenantNome || 'Acesso remoto' }}</h1>
        <p>{{ subtitulo }}</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button v-if="estado === 'aovivo'" class="pf-btn" @click="pedirQuadro"><RefreshCw :size="16" /> Recarregar tela</button>
        <button v-if="estado === 'aguardando' || estado === 'aovivo'" class="pf-btn d" @click="encerrar"><PhoneOff :size="16" /> Encerrar</button>
        <button v-else-if="estado === 'fim'" class="pf-btn p" @click="voltarLista"><MonitorSmartphone :size="16" /> Aparelhos</button>
        <NuxtLink to="/platform/restaurantes" class="pf-btn">Voltar</NuxtLink>
      </div>
    </div>

    <!-- Aparelhos logados agora -->
    <template v-if="estado === 'lista'">
      <div class="pf-card">
        <div class="pf-card-h">
          <strong style="flex:1">Aparelhos conectados</strong>
          <span v-if="semAceite" class="pf-pill ok"><i />Acesso sem aceite ligado</span>
          <button class="pf-btn s" :disabled="carregandoLista" @click="listar"><RefreshCw :size="14" /> Atualizar</button>
        </div>
        <div v-if="carregandoLista" class="esp-vazio"><span class="pf-spin" /></div>
        <div v-else-if="!aparelhos.length" class="esp-vazio">
          <MonitorX :size="26" />
          <strong>Ninguém logado neste restaurante agora</strong>
          <p>O acesso remoto precisa do sistema aberto e logado no aparelho do cliente.</p>
        </div>
        <ul v-else class="esp-lista">
          <li v-for="a in aparelhos" :key="a.id">
            <span class="esp-av">{{ (a.nome || '?').slice(0, 1).toUpperCase() }}</span>
            <div class="esp-info">
              <strong>{{ a.nome || 'Sem nome' }} <small>{{ a.cargo }}</small></strong>
              <span>{{ a.tela || 'tela desconhecida' }} · conectado {{ haQuanto(a.desde) }}</span>
            </div>
            <button class="pf-btn s p" @click="pedir(a.id)"><MonitorPlay :size="14" /> {{ semAceite ? 'Conectar' : 'Pedir acesso' }}</button>
          </li>
        </ul>
        <div v-if="aparelhos.length > 1 && !semAceite" class="esp-rodape">
          <button class="pf-btn s" @click="pedir()">Pedir a todos (o primeiro que aceitar)</button>
        </div>
      </div>

      <div class="pf-card">
        <div class="pf-card-h"><strong>Acessos anteriores</strong></div>
        <p v-if="!historico.length" class="esp-vazio" style="padding:20px">Nenhum acesso remoto registrado.</p>
        <div v-else style="overflow-x:auto">
          <table class="pf-table">
            <thead><tr><th>Quando</th><th>Suporte</th><th>Aparelho de</th><th>Duração</th><th>Como</th><th>Fim</th></tr></thead>
            <tbody>
              <tr v-for="h in historico" :key="h.id">
                <td>{{ quando(h.inicio) }}</td>
                <td>{{ h.suporteNome }}</td>
                <td>{{ h.usuarioNome || '—' }}</td>
                <td>{{ duracao(h.inicio, h.fim) }}</td>
                <td>{{ h.controle ? 'Controlou' : 'Só viu' }}{{ h.semAceite ? ' · sem aceite' : '' }}{{ h.mensagens ? ` · ${h.mensagens} msg` : '' }}</td>
                <td>{{ h.motivoFim || (h.fim ? '—' : 'em andamento') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-else-if="estado !== 'aovivo'" class="esp-vazio pf-card">
      <span v-if="estado === 'aguardando'" class="pf-spin" />
      <MonitorX v-else :size="28" />
      <strong>{{ estado === 'aguardando' ? 'Aguardando o cliente aceitar' : 'Sessão encerrada' }}</strong>
      <p>{{ estado === 'aguardando' ? 'O aviso apareceu na tela do cliente. Assim que ele permitir, a tela aparece aqui.' : motivo }}</p>
    </div>

    <!-- Ao vivo -->
    <div v-show="estado === 'aovivo'" class="esp-ao-vivo">
      <div class="esp-moldura pf-card">
        <div class="esp-barra">
          <span class="esp-vivo"><i /> Ao vivo</span>
          <span class="esp-url">{{ endereco }}</span>
          <div class="esp-modos" role="group" aria-label="Modo">
            <button :aria-pressed="modo === 'ver'" @click="mudarModo('ver')"><Eye :size="14" /> Ver</button>
            <button :aria-pressed="modo === 'apontar'" @click="mudarModo('apontar')"><Crosshair :size="14" /> Apontar</button>
            <button :aria-pressed="modo === 'controlar'" :disabled="controle === 'pedindo'" @click="mudarModo('controlar')">
              <MousePointer2 :size="14" /> {{ controle === 'pedindo' ? 'Aguardando…' : 'Controlar' }}
            </button>
          </div>
        </div>
        <div ref="palcoRef" class="esp-palco" :style="{ height: alturaPalco + 'px' }">
          <!-- Camada que captura mouse e teclado do suporte (fora do modo Ver) -->
          <div
            v-if="modo !== 'ver'"
            ref="camadaRef"
            class="esp-camada"
            :class="modo"
            tabindex="0"
            aria-label="Tela do cliente: clique para interagir"
            @mousemove="aoMover"
            @click="aoClicar"
            @wheel.prevent="aoRolar"
            @keydown="aoTeclar"
            @paste="aoColar"
            @blur="segurarFoco"
          />
          <div v-if="opcoes" class="esp-opcoes" :style="{ left: opcoes.left + 'px', top: opcoes.top + 'px' }" role="listbox">
            <button v-for="o in opcoes.lista" :key="o.value" role="option" :aria-selected="o.value === opcoes.atual" @click="escolherOpcao(o.value)">{{ o.texto }}</button>
          </div>
        </div>
        <p class="esp-dica">{{ dicaModo }}</p>
      </div>

      <aside class="esp-chat pf-card" aria-label="Chat com o cliente">
        <div class="pf-card-h"><MessageCircle :size="16" /><strong>Chat com {{ usuario || 'o cliente' }}</strong></div>
        <div ref="msgsRef" class="esp-msgs" role="log">
          <p v-if="!mensagens.length" class="esp-sem">As mensagens aparecem na tela do cliente.</p>
          <p v-for="m in mensagens" :key="m.em + m.texto" :class="m.de === 'suporte' ? 'eu' : 'ele'"><b>{{ m.de === 'suporte' ? 'Você' : m.nome }}</b>{{ m.texto }}</p>
        </div>
        <form class="esp-enviar" @submit.prevent="enviarChat">
          <input v-model="rascunho" class="pf-inp" maxlength="1000" placeholder="Mensagem para o cliente" aria-label="Mensagem para o cliente">
          <button class="pf-btn p" type="submit" :disabled="!rascunho.trim()" aria-label="Enviar"><Send :size="16" /></button>
        </form>
      </aside>
    </div>
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { MonitorPlay, MonitorX, MonitorSmartphone, PhoneOff, RefreshCw, Eye, Crosshair, MousePointer2, MessageCircle, Send } from 'lucide-vue-next'
import { io, type Socket } from 'socket.io-client'
import { Replayer, EventType } from 'rrweb'
import 'rrweb/dist/style.css'
import { EVENTOS } from '~/shared/eventos'
import { urlNaOrigemAtual } from '~/services/url'
import { usePlatformAuthStore } from '~/stores/platformAuth'

definePageMeta({ layout: false })

interface Aparelho { id: string; nome: string; cargo: string; tela: string; desde: number }
interface Mensagem { de: 'suporte' | 'cliente'; nome: string; texto: string; em: number }
interface Historico { id: string; suporteNome: string; usuarioNome: string | null; semAceite: boolean; controle: boolean; mensagens: number; inicio: string; fim: string | null; motivoFim: string | null }

const E = EVENTOS.espelho
const route = useRoute()
const config = useRuntimeConfig()
const platformAuth = usePlatformAuthStore()
const { platformFetch } = usePlatformFetch()
const toast = useToast()

const tenantId = String(route.params.id)
const tenantNome = ref('')
const estado = ref<'conectando' | 'lista' | 'aguardando' | 'aovivo' | 'fim'>('conectando')
const motivo = ref('')
const usuario = ref('')
const endereco = ref('')
const aparelhos = ref<Aparelho[]>([])
const semAceite = ref(false)
const carregandoLista = ref(false)
const historico = ref<Historico[]>([])
const modo = ref<'ver' | 'apontar' | 'controlar'>('ver')
const controle = ref<'nao' | 'pedindo' | 'sim'>('nao')
const mensagens = ref<Mensagem[]>([])
const rascunho = ref('')
const opcoes = ref<{ left: number; top: number; x: number; y: number; atual: string; lista: { value: string; texto: string }[] } | null>(null)
const palcoRef = ref<HTMLDivElement>()
const camadaRef = ref<HTMLDivElement>()
const msgsRef = ref<HTMLDivElement>()
const alturaPalco = ref(560)

const subtitulo = computed(() => ({
  conectando: 'Conectando…',
  lista: 'Escolha o aparelho do cliente. Ele vê uma faixa enquanto você estiver conectado.',
  aguardando: 'O cliente precisa aceitar o pedido na tela dele.',
  aovivo: `Na tela de ${usuario.value || 'um aparelho do restaurante'}.`,
  fim: 'A sessão terminou.',
}[estado.value]))
const dicaModo = computed(() => modo.value === 'ver'
  ? 'Só visualização. Use Apontar para mostrar algo na tela do cliente ou Controlar para clicar e digitar por ele.'
  : modo.value === 'apontar'
    ? 'Clique para destacar um ponto na tela do cliente. Ele vê seu cursor com o seu nome.'
    : 'Você está controlando: clique, digite e role na tela acima. O cliente pode retomar o controle quando quiser.')

let socket: Socket | null = null
let sessao = ''
let player: Replayer | null = null
let tela = { w: 1280, h: 720 }
let escala = 1

// ── Conexão e lista de aparelhos ───────────────────────────────────────────
function conectar() {
  socket = io(urlNaOrigemAtual(config.public.socketUrl as string), {
    auth: { token: platformAuth.token },
    transports: ['websocket', 'polling'],
    reconnection: false,
  })
  socket.on('connect', listar)
  socket.on('connect_error', (e) => fim(`Não deu para conectar: ${e.message}`))
  socket.on(E.aceito, (d: { sessao: string; usuario: string; tela: string; controle: boolean }) => {
    if (d.sessao !== sessao) return
    usuario.value = d.usuario
    endereco.value = d.tela
    controle.value = d.controle ? 'sim' : 'nao'
    estado.value = 'aovivo'
  })
  socket.on(E.gravacao, (d: { sessao: string; eventos: any[] }) => { if (d.sessao === sessao) receber(d.eventos) })
  socket.on(E.encerrado, (d: { sessao: string; motivo?: string }) => { if (d.sessao === sessao) fim(d.motivo || 'Sessão encerrada') })
  socket.on(E.controle, (d: { sessao: string; permitido: boolean }) => {
    if (d.sessao !== sessao) return
    const antes = controle.value
    controle.value = d.permitido ? 'sim' : 'nao'
    if (d.permitido && antes === 'pedindo') { modo.value = 'controlar'; focarCamada() }
    if (!d.permitido) {
      if (modo.value === 'controlar') modo.value = 'ver'
      toast.add({ title: antes === 'pedindo' ? 'O cliente recusou o controle' : 'O cliente retomou o controle', color: 'amber', icon: 'i-lucide-hand' })
    }
  })
  socket.on(E.chat, (m: Mensagem & { sessao: string }) => {
    if (m.sessao !== sessao) return
    mensagens.value.push(m)
    rolarChat()
  })
}

function listar() {
  carregandoLista.value = true
  estado.value = 'lista'
  socket?.emit(E.aparelhos, { tenantId }, (r: { aparelhos: Aparelho[]; semAceite: boolean }) => {
    aparelhos.value = r?.aparelhos ?? []
    semAceite.value = !!r?.semAceite
    carregandoLista.value = false
  })
  carregarHistorico()
}

function carregarHistorico() {
  platformFetch<Historico[]>(`/platform/tenants/${tenantId}/sessoes-remotas`).then(h => { historico.value = h ?? [] }).catch(() => {})
}

function pedir(aparelho?: string) {
  destruirPlayer()
  mensagens.value = []
  modo.value = 'ver'
  controle.value = 'nao'
  estado.value = 'aguardando'
  motivo.value = ''
  socket?.emit(E.pedir, { tenantId, aparelho }, (r: { sessao?: string; erro?: string }) => {
    if (r?.erro || !r?.sessao) { toast.add({ title: r?.erro || 'Não deu para pedir', color: 'red' }); return listar() }
    sessao = r.sessao
  })
}

function voltarLista() { listar() }

// ── Reprodução ─────────────────────────────────────────────────────────────
function receber(eventos: any[]) {
  for (const ev of eventos) {
    if (ev.type === EventType.Custom && ev.data?.tag === 'rota') { endereco.value = String(ev.data.payload?.caminho ?? ''); opcoes.value = null }
    if (ev.type === EventType.Meta) {
      endereco.value = String(ev.data?.href ?? '').replace(/^https?:\/\/[^/]+/, '')
      tela = { w: ev.data?.width || tela.w, h: ev.data?.height || tela.h }
    }
    if (!player) {
      // Sem a tela inteira ainda (chegou no meio): pede de novo
      if (ev.type !== EventType.Meta && ev.type !== EventType.FullSnapshot) { pedirQuadro(); continue }
      player = new Replayer([], { root: palcoRef.value!, liveMode: true, mouseTail: false })
      player.on('resize', (d: any) => { tela = { w: d.width, h: d.height }; ajustar() })
      player.startLive(ev.timestamp - 500)
    }
    player.addEvent(ev)
  }
  ajustar()
}

// Cabe a tela do cliente na largura disponível, sem distorcer
function ajustar() {
  const palco = palcoRef.value
  const wrapper = palco?.querySelector<HTMLElement>('.replayer-wrapper')
  if (!palco || !wrapper) return
  escala = Math.min(1, palco.clientWidth / tela.w)
  wrapper.style.transformOrigin = 'top left'
  wrapper.style.transform = `scale(${escala})`
  alturaPalco.value = Math.round(tela.h * escala)
}

function pedirQuadro() {
  if (sessao) socket?.emit(E.quadroCompleto, { sessao })
}

// ── Modos: ver, apontar, controlar ─────────────────────────────────────────
function mudarModo(m: 'ver' | 'apontar' | 'controlar') {
  opcoes.value = null
  if (m === 'controlar' && controle.value !== 'sim') {
    controle.value = 'pedindo'
    socket?.emit(E.pedirControle, { sessao })
    return
  }
  modo.value = m
  if (m !== 'ver') focarCamada()
}
const focarCamada = () => nextTick(() => camadaRef.value?.focus())
// A reprodução repete o foco dos campos do cliente (.focus() dentro do iframe) e
// rouba o teclado do suporte: devolve para a camada
function segurarFoco() {
  setTimeout(() => {
    if (modo.value !== 'ver' && document.activeElement?.tagName === 'IFRAME' && palcoRef.value?.contains(document.activeElement)) camadaRef.value?.focus()
  }, 0)
}

/** Posição do mouse na tela do cliente (desfaz a escala da reprodução) */
function ponto(e: MouseEvent) {
  const r = palcoRef.value!.getBoundingClientRect()
  return { x: Math.round((e.clientX - r.left) / escala), y: Math.round((e.clientY - r.top) / escala) }
}
const acao = (tipo: string, dados: Record<string, unknown> = {}) => socket?.emit(E.acao, { sessao, tipo, ...dados })

let ultimoCursor = 0
function aoMover(e: MouseEvent) {
  if (Date.now() - ultimoCursor < 60) return
  ultimoCursor = Date.now()
  acao('cursor', ponto(e))
}

/** Elemento da tela do cliente sob o ponto (na cópia reproduzida aqui) */
function elementoNaCopia(x: number, y: number) {
  const doc = palcoRef.value?.querySelector('iframe')?.contentDocument
  return doc?.elementFromPoint(x, y) ?? null
}

function aoClicar(e: MouseEvent) {
  const p = ponto(e)
  camadaRef.value?.focus()
  if (modo.value === 'apontar') return acao('apontar', p)
  // Lista de opções (select) não abre por clique simulado: escolhe aqui
  const sel = elementoNaCopia(p.x, p.y)?.closest('select') as HTMLSelectElement | null
  if (sel) {
    const r = palcoRef.value!.getBoundingClientRect()
    opcoes.value = {
      left: e.clientX - r.left, top: e.clientY - r.top, x: p.x, y: p.y, atual: sel.value,
      lista: [...sel.options].map(o => ({ value: o.value, texto: o.text })),
    }
    return
  }
  opcoes.value = null
  acao('clique', p)
}

function escolherOpcao(valor: string) {
  if (!opcoes.value) return
  acao('selecionar', { x: opcoes.value.x, y: opcoes.value.y, valor })
  opcoes.value = null
  camadaRef.value?.focus()
}

function aoRolar(e: WheelEvent) {
  if (modo.value !== 'controlar') return
  acao('rolar', { ...ponto(e), dx: Math.round(e.deltaX), dy: Math.round(e.deltaY) })
}

function aoTeclar(e: KeyboardEvent) {
  if (modo.value !== 'controlar') return
  // Ctrl/Cmd+V vira o evento paste (texto da área de transferência do suporte)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') return
  if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return
  e.preventDefault()
  acao('tecla', { tecla: e.key, ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, meta: e.metaKey })
}

function aoColar(e: ClipboardEvent) {
  if (modo.value !== 'controlar') return
  const texto = e.clipboardData?.getData('text') ?? ''
  e.preventDefault()
  if (texto) acao('texto', { texto })
}

// ── Chat ───────────────────────────────────────────────────────────────────
function enviarChat() {
  const texto = rascunho.value.trim()
  if (!texto || !sessao) return
  socket?.emit(E.chat, { sessao, texto })
  mensagens.value.push({ de: 'suporte', nome: 'Você', texto, em: Date.now() })
  rascunho.value = ''
  rolarChat()
}
const rolarChat = () => nextTick(() => msgsRef.value?.scrollTo({ top: msgsRef.value.scrollHeight }))

// ── Fim ────────────────────────────────────────────────────────────────────
function encerrar() {
  if (sessao) socket?.emit(E.encerrar, { sessao })
  fim('Você encerrou')
}

function fim(texto: string) {
  estado.value = 'fim'
  motivo.value = texto
  sessao = ''
  modo.value = 'ver'
  controle.value = 'nao'
  opcoes.value = null
  destruirPlayer()
}

function destruirPlayer() {
  player?.pause()
  player = null
  palcoRef.value?.querySelectorAll('.replayer-wrapper').forEach(n => n.remove())
}

const haQuanto = (t: number) => {
  const min = Math.round((Date.now() - t) / 60000)
  return min < 1 ? 'agora' : min < 60 ? `há ${min} min` : `há ${Math.floor(min / 60)} h`
}
const quando = (s: string) => new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const duracao = (ini: string, f: string | null) => {
  if (!f) return '—'
  const min = Math.max(1, Math.round((+new Date(f) - +new Date(ini)) / 60000))
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`
}

onMounted(async () => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) return navigateTo('/platform/login')
  platformFetch<{ nome: string }>(`/platform/tenants/${tenantId}`).then(t => { tenantNome.value = t?.nome ?? '' }).catch(() => {})
  conectar()
  window.addEventListener('resize', ajustar)
})

onUnmounted(() => {
  window.removeEventListener('resize', ajustar)
  if (sessao) socket?.emit(E.encerrar, { sessao })
  socket?.disconnect()
  destruirPlayer()
})
</script>

<style scoped>
.esp-vazio { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 48px 24px; color: var(--pf-muted); }
.esp-vazio strong { color: var(--pf-ink); font-size: 16px; }
.esp-vazio p { margin: 0; max-width: 52ch; font-size: 14px; }
.esp-lista { list-style: none; margin: 0; padding: 0; }
.esp-lista li { display: flex; align-items: center; gap: 14px; padding: 14px 20px; border-bottom: 1px solid var(--pf-line); }
.esp-lista li:last-child { border-bottom: 0; }
.esp-av { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: var(--pf-brand-soft); color: var(--pf-brand-d); font-weight: 800; flex: none; }
.esp-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.esp-info strong small { font-weight: 500; color: var(--pf-muted); margin-left: 6px; text-transform: capitalize; }
.esp-info span { font-size: 13px; color: var(--pf-muted); font-family: ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.esp-rodape { padding: 12px 20px; border-top: 1px solid var(--pf-line); }

.esp-ao-vivo { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; align-items: start; }
.esp-moldura { overflow: hidden; margin-bottom: 0; }
.esp-barra { display: flex; align-items: center; gap: 12px; padding: 8px 12px 8px 16px; border-bottom: 1px solid var(--pf-line); font-size: 13px; flex-wrap: wrap; }
.esp-vivo { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: #B42318; }
.esp-vivo i { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: esp-pulso 1.2s ease-in-out infinite; }
.esp-url { flex: 1; min-width: 80px; color: var(--pf-muted); font-family: ui-monospace, monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.esp-modos { display: inline-flex; gap: 2px; padding: 3px; border-radius: 10px; background: var(--pf-line); }
.esp-modos button { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border: 0; border-radius: 8px; background: none; color: var(--pf-muted); font: inherit; font-weight: 600; cursor: pointer; }
.esp-modos button[aria-pressed=true] { background: var(--pf-card); color: var(--pf-ink); box-shadow: 0 1px 3px rgba(0, 0, 0, .15); }
.esp-modos button:disabled { opacity: .6; cursor: progress; }
.esp-palco { position: relative; overflow: hidden; background: #111; }
.esp-palco :deep(.replayer-wrapper) { position: absolute; top: 0; left: 0; }
.esp-palco :deep(iframe) { border: 0; pointer-events: none; }
.esp-camada { position: absolute; inset: 0; z-index: 2; outline: none; }
.esp-camada.apontar { cursor: crosshair; }
.esp-camada.controlar { cursor: default; box-shadow: inset 0 0 0 3px rgba(240, 122, 18, .9); }
.esp-camada:focus-visible { box-shadow: inset 0 0 0 3px var(--pf-brand); }
.esp-opcoes { position: absolute; z-index: 3; min-width: 180px; max-height: 260px; overflow-y: auto; background: var(--pf-card); border: 1px solid var(--pf-line); border-radius: 10px; box-shadow: 0 12px 30px rgba(0, 0, 0, .3); padding: 4px; }
.esp-opcoes button { display: block; width: 100%; text-align: left; padding: 8px 10px; border: 0; border-radius: 6px; background: none; color: var(--pf-ink); font: inherit; font-size: 14px; cursor: pointer; }
.esp-opcoes button:hover, .esp-opcoes button[aria-selected=true] { background: var(--pf-brand-soft); }
.esp-dica { margin: 0; padding: 10px 16px; font-size: 13px; color: var(--pf-muted); border-top: 1px solid var(--pf-line); }

.esp-chat { display: flex; flex-direction: column; height: min(640px, calc(100vh - 220px)); margin-bottom: 0; position: sticky; top: 16px; }
.esp-chat .pf-card-h { gap: 8px; }
.esp-msgs { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.esp-msgs p { margin: 0; padding: 8px 10px; border-radius: 12px; font-size: 13.5px; line-height: 1.4; max-width: 88%; white-space: pre-wrap; overflow-wrap: anywhere; }
.esp-msgs p b { display: block; font-size: 11px; opacity: .7; margin-bottom: 2px; }
.esp-msgs .ele { align-self: flex-start; background: var(--pf-line); }
.esp-msgs .eu { align-self: flex-end; background: var(--pf-brand); color: #1F1A15; }
.esp-msgs .esp-sem { max-width: none; color: var(--pf-muted); }
.esp-enviar { display: flex; gap: 6px; padding: 10px; border-top: 1px solid var(--pf-line); }
.esp-enviar .pf-inp { flex: 1; min-width: 0; }
@keyframes esp-pulso { 50% { opacity: .3 } }
@media (max-width: 1100px) { .esp-ao-vivo { grid-template-columns: 1fr; } .esp-chat { position: static; height: 360px; } }
@media (prefers-reduced-motion: reduce) { .esp-vivo i { animation: none } }
</style>
