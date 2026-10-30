<template>
  <!-- Acesso remoto do suporte: pedido para ver, pedido para controlar, faixa, chat e cursor do suporte -->
  <div v-if="pedido" class="esp-fundo" role="dialog" aria-modal="true" aria-labelledby="esp-titulo" data-espelho-ui>
    <div class="esp-caixa">
      <span class="esp-ic"><MonitorUp :size="22" /></span>
      <h2 id="esp-titulo">{{ pedido.tipo === 'ver' ? 'O suporte quer ver sua tela' : 'O suporte quer controlar sua tela' }}</h2>
      <p v-if="pedido.tipo === 'ver'">
        <b>{{ pedido.suporte }}</b>, do suporte RestaurantePDV, pede para acompanhar ao vivo o que aparece nesta tela.
        Senhas não são mostradas e você pode encerrar a qualquer momento.
      </p>
      <p v-else>
        <b>{{ pedido.suporte }}</b> quer clicar e digitar nesta tela para te ajudar. Você vê tudo o que ele faz
        e pode retomar o controle a qualquer momento.
      </p>
      <div class="esp-acoes">
        <button type="button" class="esp-sec" @click="responder(false)">Recusar</button>
        <button ref="permitirRef" type="button" class="esp-pri" @click="responder(true)">Permitir</button>
      </div>
    </div>
  </div>

  <template v-if="sessao">
    <!-- Cursor e destaque do suporte (não recebem clique) -->
    <div v-if="cursor" class="esp-cursor" :style="{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }" aria-hidden="true" data-espelho-ui>
      <svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" fill="#F07A12" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" /></svg>
      <span>{{ sessao.suporte }}</span>
    </div>
    <span v-for="p in pontos" :key="p.id" class="esp-ponto-destaque" :style="{ left: p.x + 'px', top: p.y + 'px' }" aria-hidden="true" data-espelho-ui />

    <div class="esp-barra" role="status" data-espelho-ui>
      <div v-if="chatAberto" class="esp-chat" role="log" aria-label="Chat com o suporte">
        <div ref="listaRef" class="esp-msgs">
          <p v-if="!mensagens.length" class="esp-vazio">Escreva para o suporte. As mensagens aparecem aqui.</p>
          <p v-for="m in mensagens" :key="m.em + m.texto" :class="m.de === 'cliente' ? 'eu' : 'ele'"><b>{{ m.de === 'cliente' ? 'Você' : m.nome }}</b>{{ m.texto }}</p>
        </div>
        <form class="esp-enviar" @submit.prevent="enviarChat">
          <input v-model="rascunho" maxlength="1000" placeholder="Mensagem para o suporte" aria-label="Mensagem para o suporte">
          <button type="submit" :disabled="!rascunho.trim()" aria-label="Enviar"><Send :size="16" /></button>
        </form>
      </div>
      <div class="esp-faixa">
        <span class="esp-ponto" aria-hidden="true" />
        <span class="esp-txt">{{ sessao.controle ? `${sessao.suporte} está controlando sua tela` : `${sessao.suporte} está vendo sua tela` }}<small v-if="sessao.semAceite"> · acesso autorizado pelo administrador</small></span>
        <button type="button" class="esp-chat-bt" :aria-expanded="chatAberto" @click="alternarChat">
          <MessageCircle :size="15" /> Chat<i v-if="naoLidas" class="esp-badge">{{ naoLidas }}</i>
        </button>
        <button v-if="sessao.controle" type="button" @click="retomar">Retomar controle</button>
        <button type="button" @click="parar(true)">Encerrar</button>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { MonitorUp, MessageCircle, Send } from 'lucide-vue-next'
import { record } from 'rrweb'
import type { Socket } from 'socket.io-client'
import { EVENTOS } from '~/shared/eventos'
import { useSocket } from '~/services/socket'
import { useAuthStore } from '~/stores/auth'
import { useToastStore } from '~/stores/toast'
import { executarAcao, type AcaoRemota } from '~/lib/controleRemoto'

const E = EVENTOS.espelho
const auth = useAuthStore()
const toast = useToastStore()
const { getSocket } = useSocket()
const router = useRouter()

interface Sessao { id: string; suporte: string; controle: boolean; semAceite: boolean }
interface Mensagem { de: 'suporte' | 'cliente'; nome: string; texto: string; em: number }

const pedido = ref<{ tipo: 'ver' | 'controlar'; sessao: string; suporte: string } | null>(null)
const sessao = ref<Sessao | null>(null)
const permitirRef = ref<HTMLButtonElement>()
const cursor = ref<{ x: number; y: number } | null>(null)
const pontos = ref<{ id: number; x: number; y: number }[]>([])
const mensagens = ref<Mensagem[]>([])
const chatAberto = ref(false)
const naoLidas = ref(0)
const rascunho = ref('')
const listaRef = ref<HTMLDivElement>()

let pararGravacao: (() => void) | undefined
let pararRota: (() => void) | undefined
let fila: unknown[] = []
let envio: ReturnType<typeof setInterval> | null = null
let cursorTimer: ReturnType<typeof setTimeout> | null = null

const emitir = (ev: string, dados: Record<string, unknown>) => getSocket()?.emit(ev, dados)

// ── Pedidos ────────────────────────────────────────────────────────────────
function aoPedido(d: { sessao: string; suporte: string }) {
  // A própria sessão de suporte (aba aberta pela Central) não é espelhada
  if (!auth.token || auth.modoSuporte || sessao.value) return
  pedido.value = { tipo: 'ver', ...d }
  nextTick(() => permitirRef.value?.focus())
}
function aoPedirControle(d: { sessao: string; suporte: string }) {
  if (sessao.value?.id !== d.sessao) return
  pedido.value = { tipo: 'controlar', ...d }
  nextTick(() => permitirRef.value?.focus())
}
// Acesso sem aceite (ligado pelo admin): começa direto, com a faixa visível
function aoIniciar(d: { sessao: string; suporte: string; controle: boolean }) {
  if (!auth.token || auth.modoSuporte || sessao.value) return
  iniciar({ id: d.sessao, suporte: d.suporte, controle: d.controle, semAceite: true })
  toast.info('Suporte conectado', `${d.suporte} entrou na sua tela (acesso autorizado pelo administrador).`)
}
function aoAtendido(d: { sessao: string }) {
  if (pedido.value?.sessao === d.sessao && pedido.value.tipo === 'ver') pedido.value = null
}
function aoEncerrado(d: { sessao: string; motivo?: string }) {
  aoAtendido(d)
  if (sessao.value?.id !== d.sessao) return
  parar(false)
  toast.info('Suporte encerrado', d.motivo)
}
function aoControle(d: { sessao: string; permitido: boolean }) {
  if (sessao.value?.id === d.sessao) sessao.value.controle = d.permitido
}
function aoQuadroCompleto(d: { sessao: string }) {
  if (sessao.value?.id === d.sessao) record.takeFullSnapshot(true)
}

function responder(aceitar: boolean) {
  const p = pedido.value
  pedido.value = null
  if (!p) return
  if (p.tipo === 'ver') {
    emitir(E.responder, { sessao: p.sessao, aceitar, tela: location.pathname })
    if (aceitar) iniciar({ id: p.sessao, suporte: p.suporte, controle: false, semAceite: false })
  } else {
    if (sessao.value) sessao.value.controle = aceitar
    emitir(E.controle, { sessao: p.sessao, permitido: aceitar })
  }
}

function retomar() {
  if (!sessao.value) return
  sessao.value.controle = false
  emitir(E.controle, { sessao: sessao.value.id, permitido: false })
}

// ── Ações do suporte ───────────────────────────────────────────────────────
let idPonto = 0
function aoAcao(a: AcaoRemota & { sessao: string }) {
  if (sessao.value?.id !== a.sessao) return
  if (a.tipo === 'cursor' || a.tipo === 'apontar' || a.tipo === 'clique') mostrarCursor(a.x, a.y)
  if (a.tipo === 'apontar') {
    const p = { id: ++idPonto, x: a.x, y: a.y }
    pontos.value.push(p)
    setTimeout(() => { pontos.value = pontos.value.filter(x => x.id !== p.id) }, 1600)
    return
  }
  // Controle retomado aqui, mas a ação já estava a caminho: não executa
  if (a.tipo !== 'cursor' && sessao.value.controle) executarAcao(a)
}
function mostrarCursor(x: number, y: number) {
  cursor.value = { x, y }
  if (cursorTimer) clearTimeout(cursorTimer)
  cursorTimer = setTimeout(() => { cursor.value = null }, 4000)
}

// ── Chat ───────────────────────────────────────────────────────────────────
function aoChat(m: Mensagem & { sessao: string }) {
  if (sessao.value?.id !== m.sessao) return
  mensagens.value.push(m)
  if (!chatAberto.value && m.de === 'suporte') { naoLidas.value++; chatAberto.value = true }
  rolarChat()
}
function enviarChat() {
  const texto = rascunho.value.trim()
  if (!texto || !sessao.value) return
  emitir(E.chat, { sessao: sessao.value.id, texto })
  // O servidor só repassa para o outro lado: a própria mensagem entra aqui
  mensagens.value.push({ de: 'cliente', nome: 'Você', texto, em: Date.now() })
  rascunho.value = ''
  rolarChat()
}
function alternarChat() {
  chatAberto.value = !chatAberto.value
  if (chatAberto.value) { naoLidas.value = 0; rolarChat() }
}
const rolarChat = () => nextTick(() => listaRef.value?.scrollTo({ top: listaRef.value.scrollHeight }))
watch(chatAberto, (aberto) => { if (aberto) naoLidas.value = 0 })

// ── Gravação ───────────────────────────────────────────────────────────────
function iniciar(s: Sessao) {
  sessao.value = s
  mensagens.value = []
  naoLidas.value = 0
  fila = []
  pararGravacao = record({
    emit: (ev) => { fila.push(ev) },
    maskInputOptions: { password: true },
    // Sem `input: 'last'`: com ele o rrweb só grava ao sair do campo (change)
    sampling: { mousemove: 50, scroll: 150 },
  })
  // Navegação dentro do sistema não gera nova tela inteira: avisa a rota
  pararRota = router.afterEach((to) => record.addCustomEvent('rota', { caminho: to.fullPath }))
  envio = setInterval(enviar, 250)
}

function enviar() {
  if (!sessao.value || !fila.length) return
  const eventos = fila
  fila = []
  emitir(E.gravacao, { sessao: sessao.value.id, eventos })
}

function parar(avisar: boolean) {
  pararGravacao?.()
  pararGravacao = undefined
  pararRota?.()
  pararRota = undefined
  if (envio) { clearInterval(envio); envio = null }
  fila = []
  if (avisar && sessao.value) emitir(E.encerrar, { sessao: sessao.value.id })
  if (pedido.value?.tipo === 'controlar') pedido.value = null
  sessao.value = null
  cursor.value = null
  pontos.value = []
  chatAberto.value = false
}

// ── Socket ─────────────────────────────────────────────────────────────────
const OUVINTES: [string, (d: any) => void][] = [
  [E.pedido, aoPedido], [E.iniciar, aoIniciar], [E.atendido, aoAtendido], [E.encerrado, aoEncerrado],
  [E.quadroCompleto, aoQuadroCompleto], [E.pedirControle, aoPedirControle], [E.controle, aoControle],
  [E.acao, aoAcao], [E.chat, aoChat],
]
const avisarTela = () => emitir(E.onde, { tela: router.currentRoute.value.fullPath })

// O socket pode ser recriado (troca de token): reata os ouvintes no novo
let ligado: Socket | null = null
function ligar() {
  const s = getSocket()
  if (!s || s === ligado) return
  for (const [ev, fn] of OUVINTES) ligado?.off(ev, fn)
  ligado = s
  for (const [ev, fn] of OUVINTES) s.on(ev, fn)
  // A lista de aparelhos da Central mostra em que tela cada um está
  s.on('connect', avisarTela)
  if (s.connected) avisarTela()
}

// Saiu do sistema: nada fica gravando
watch(() => auth.token, (t) => { if (!t) { pedido.value = null; if (sessao.value) parar(false) } })

let relogio: ReturnType<typeof setInterval> | null = null
let pararOnde: (() => void) | undefined
onMounted(() => {
  ligar()
  relogio = setInterval(ligar, 2000)
  pararOnde = router.afterEach(avisarTela)
})
onUnmounted(() => {
  if (relogio) clearInterval(relogio)
  pararOnde?.()
  parar(true)
})
</script>

<style scoped>
.esp-fundo { position: fixed; inset: 0; z-index: 10001; display: grid; place-items: center; padding: 16px; background: rgba(0, 0, 0, .55); }
.esp-caixa { width: min(420px, 100%); background: var(--sup-painel); color: var(--txt); border: 1px solid var(--linha); border-radius: 20px; padding: 24px; box-shadow: 0 30px 80px rgba(0, 0, 0, .35); }
.esp-ic { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--acao-fraca); color: var(--acao); margin-bottom: 14px; }
.esp-caixa h2 { margin: 0 0 8px; font-size: 20px; font-weight: 800; letter-spacing: -.02em; }
.esp-caixa p { margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: var(--txt-2); }
.esp-caixa b { color: var(--txt); }
.esp-acoes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.esp-acoes button { min-height: 46px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; }
.esp-sec { background: transparent; border: 1px solid var(--linha); color: var(--txt); }
.esp-sec:hover { background: var(--sup-elevado); }
.esp-pri { background: var(--acao); border: 0; color: var(--acao-txt); }
.esp-pri:hover { background: var(--acao-hover); }

.esp-cursor { position: fixed; left: 0; top: 0; z-index: 10003; pointer-events: none; display: flex; align-items: flex-start; gap: 2px; transition: transform .08s linear; }
.esp-cursor span { margin-top: 14px; padding: 2px 8px; border-radius: 999px; background: #F07A12; color: #1F1A15; font-size: 11px; font-weight: 800; white-space: nowrap; }
.esp-ponto-destaque { position: fixed; z-index: 10002; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; border: 3px solid #F07A12; background: rgba(240, 122, 18, .2); pointer-events: none; animation: esp-destaque 1.6s ease-out forwards; }
@keyframes esp-destaque { 0% { transform: scale(.4); opacity: 1 } 70% { transform: scale(1.4); opacity: .9 } 100% { transform: scale(1.8); opacity: 0 } }

.esp-barra { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 10001; display: flex; flex-direction: column; align-items: center; gap: 8px; width: max-content; max-width: calc(100% - 32px); }
.esp-faixa { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: center; padding: 6px 6px 6px 14px; border-radius: 22px; background: #B42318; color: #fff; font-size: 13px; font-weight: 700; box-shadow: 0 10px 30px rgba(0, 0, 0, .3); }
.esp-txt small { font-weight: 500; opacity: .85; }
.esp-faixa button { position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 12px; border-radius: 999px; border: 0; background: rgba(255, 255, 255, .2); color: #fff; font-weight: 800; font-size: 13px; cursor: pointer; }
.esp-faixa button:hover { background: rgba(255, 255, 255, .32); }
.esp-badge { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: #fff; color: #B42318; font-style: normal; font-size: 11px; display: grid; place-items: center; }
.esp-ponto { width: 8px; height: 8px; border-radius: 50%; background: #fff; animation: esp-pulso 1.2s ease-in-out infinite; flex: none; }
@keyframes esp-pulso { 50% { opacity: .3 } }

.esp-chat { width: min(360px, calc(100vw - 32px)); background: var(--sup-painel); color: var(--txt); border: 1px solid var(--linha); border-radius: 18px; box-shadow: 0 20px 50px rgba(0, 0, 0, .3); overflow: hidden; }
.esp-msgs { max-height: 240px; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.esp-msgs p { margin: 0; padding: 8px 10px; border-radius: 12px; font-size: 13.5px; line-height: 1.4; max-width: 85%; white-space: pre-wrap; overflow-wrap: anywhere; }
.esp-msgs p b { display: block; font-size: 11px; opacity: .7; margin-bottom: 2px; }
.esp-msgs .ele { align-self: flex-start; background: var(--sup-elevado); }
.esp-msgs .eu { align-self: flex-end; background: var(--acao); color: var(--acao-txt); }
.esp-msgs .esp-vazio { max-width: none; color: var(--txt-3); padding: 4px 2px; }
.esp-enviar { display: flex; gap: 6px; padding: 8px; border-top: 1px solid var(--linha); }
.esp-enviar input { flex: 1; min-width: 0; height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--linha); background: var(--sup-fundo); color: var(--txt); font-size: 14px; }
.esp-enviar button { width: 40px; height: 40px; border-radius: 10px; border: 0; background: var(--acao); color: var(--acao-txt); display: grid; place-items: center; cursor: pointer; }
.esp-enviar button:disabled { opacity: .5; cursor: default; }
@media (prefers-reduced-motion: reduce) { .esp-ponto, .esp-ponto-destaque { animation: none } .esp-cursor { transition: none } }
</style>
