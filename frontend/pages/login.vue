<template>
  <div class="lg">
    <div class="lg-page">

      <!-- ══ PAINEL — comanda animada (desktop) ══ -->
      <aside class="lg-panel" aria-hidden="true">
        <div class="lg-stage">
          <div class="lg-board">
            <div class="lg-board-head"><strong>Pedidos de agora</strong><span>{{ contagemPedidos }}</span></div>
            <div
              v-for="p in pedidos"
              :key="p.id"
              class="lg-order"
              :class="{ enter: p.entrando, leaving: p.saindo }"
              :style="p.atraso ? { animationDelay: p.atraso } : undefined"
            >
              <div class="lg-tbl">{{ p.tbl }}</div>
              <div class="lg-info"><b>{{ p.nome }}</b><small>{{ p.itens }}</small></div>
              <span class="lg-badge" :class="[ESTADOS[p.s][0], { pop: p.pop }]">{{ ESTADOS[p.s][1] }}</span>
            </div>
          </div>
          <div class="lg-chip">Conta fechada<b>R$ 207,00</b></div>
        </div>
        <div>
          <h2>Abra o caixa e comece o atendimento.</h2>
          <p class="lg-lead">Mesas, cozinha e caixa no mesmo lugar para a sua equipe atender mais rápido.</p>
        </div>
      </aside>

      <!-- ══ FORMULÁRIO ══ -->
      <main class="lg-form-side">
        <button
          class="lg-theme"
          type="button"
          :aria-label="themeStore.dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
          @click="themeStore.toggle()"
        >
          <Sun v-if="themeStore.dark" :size="20" />
          <Moon v-else :size="20" />
        </button>

        <div class="lg-card">
          <div class="lg-logo">
            <span class="lg-logo-mark"><UtensilsCrossed :size="44" :stroke-width="2" /></span>
            <span>Restaurante <i class="lg-pdv">PDV</i></span>
          </div>

          <h1>Bem-vindo de volta</h1>
          <p class="lg-sub">
            {{ modo === 'rfid' ? 'Aproxime seu crachá do leitor para entrar.' : 'Entre com seu e-mail e senha para abrir o caixa.' }}
          </p>

          <p v-if="msg.text" class="lg-msg" :class="`lg-msg--${msg.type}`" role="alert">
            <CheckCircle2 v-if="msg.type === 'success'" :size="18" />
            <AlertCircle v-else :size="18" />
            {{ msg.text }}
          </p>

          <!-- Restaurante: só aparece como campo quando a pessoa pede para trocar -->
          <div class="lg-rest">
            <template v-if="!editandoSlug">
              <Store :size="16" />
              <span>Restaurante <b>{{ slugAtual || '—' }}</b></span>
              <button type="button" class="lg-link" @click="trocarRestaurante">Trocar</button>
            </template>
            <div v-else class="lg-field lg-field--rest">
              <label for="login-slug">Código do restaurante</label>
              <div class="lg-control">
                <span class="lg-lead-ic"><Store :size="20" /></span>
                <input
                  id="login-slug"
                  ref="slugRef"
                  v-model="form.slug"
                  name="pdv-restaurante-slug"
                  type="text"
                  autocomplete="off"
                  placeholder="ex: tarantela"
                  @blur="confirmarSlug"
                  @keydown.enter.prevent="confirmarSlug"
                >
              </div>
            </div>
          </div>

          <!-- ── CRACHÁ (só quando o plano do restaurante inclui RFID) ── -->
          <div v-if="modo === 'rfid'" class="lg-rfid">
            <button type="button" class="lg-rfid-alvo" :class="{ ativo: rfidFocused, lendo: rfidReading }" @click="focusRfid">
              <span class="lg-rfid-ondas"><i /><i /><i /></span>
              <span class="lg-rfid-cartao"><Wifi :size="30" :stroke-width="1.75" /></span>
            </button>
            <strong>{{ rfidReading ? 'Identificando…' : 'Aproxime o crachá do leitor' }}</strong>
            <span class="lg-rfid-status"><i />{{ rfidReading ? 'Lendo cartão' : rfidFocused ? 'Leitor pronto' : 'Toque no círculo para ativar o leitor' }}</span>
            <input
              id="rfid-input"
              ref="rfidInputRef"
              v-model="rfidBuffer"
              name="rfid-input"
              aria-label="Leitor de cartão RFID"
              type="password"
              class="lg-rfid-input"
              @input="onRfidInput"
              @keyup.enter="onRfidEnter"
              @focus="rfidFocused = true"
              @blur="rfidFocused = false"
            >
            <button type="button" class="lg-btn lg-btn--ghost" @click="setModo('manual')">
              <KeyRound :size="18" /> Entrar com e-mail e senha
            </button>
          </div>

          <!-- ── E-MAIL E SENHA ── -->
          <form v-else novalidate @submit.prevent="handleManualLogin">
            <div class="lg-field">
              <label for="login-email">E-mail</label>
              <div class="lg-control">
                <span class="lg-lead-ic"><UserRound :size="20" /></span>
                <input
                  id="login-email"
                  ref="emailRef"
                  v-model="form.email"
                  name="email"
                  type="email"
                  autocomplete="username"
                  placeholder="seu@email.com"
                  :aria-invalid="invalido === 'email' || undefined"
                >
              </div>
            </div>

            <div class="lg-field">
              <label for="login-senha">Senha</label>
              <div class="lg-control">
                <span class="lg-lead-ic"><Lock :size="20" /></span>
                <input
                  id="login-senha"
                  ref="senhaRef"
                  v-model="form.senha"
                  name="senha"
                  :type="showPass ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="Digite sua senha"
                  :aria-invalid="invalido === 'senha' || undefined"
                  @keyup="verificarCaps"
                  @blur="capsLock = false"
                >
                <button
                  type="button"
                  class="lg-toggle"
                  :aria-label="showPass ? 'Ocultar senha' : 'Mostrar senha'"
                  :aria-pressed="showPass"
                  @click="showPass = !showPass"
                >
                  <EyeOff v-if="showPass" :size="20" />
                  <Eye v-else :size="20" />
                </button>
              </div>
              <p v-if="capsLock" class="lg-hint">Caps Lock está ativado.</p>
            </div>

            <button class="lg-btn" type="submit" :disabled="loading">
              <span v-if="loading" class="lg-spin" />
              {{ loading ? 'Entrando…' : 'Entrar' }}
            </button>

            <button v-if="rfidAtivo" type="button" class="lg-btn lg-btn--ghost" @click="setModo('rfid')">
              <CreditCard :size="18" /> Entrar com crachá
            </button>
          </form>

          <p class="lg-foot">Problemas para acessar? Fale com o gerente da loja.</p>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from 'nuxt/app'
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import {
  UtensilsCrossed, CreditCard, KeyRound, Wifi, UserRound, Lock, Eye, EyeOff,
  CheckCircle2, AlertCircle, Store, Sun, Moon,
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { useThemeStore } from '~/stores/theme'
import { getTenantSlug, setTenantSlug } from '~/composables/useTenantSlug'

definePageMeta({ layout: false })

const authStore  = useAuthStore()
const themeStore = useThemeStore()
const api        = useApi()

// RFID é recurso de plano: a API só devolve rfid_ativo quando o super admin
// liberou (rfidDisponivel) e o restaurante ativou nas configurações.
const rfidAtivo = ref(false)
const modo      = ref<'rfid' | 'manual'>('manual')
const loading   = ref(false)
const showPass  = ref(false)
const capsLock  = ref(false)
const invalido  = ref<'email' | 'senha' | null>(null)
const msg       = reactive({ text: '', type: 'error' as 'error' | 'success' })

const rfidInputRef = ref<HTMLInputElement>()
const emailRef     = ref<HTMLInputElement>()
const senhaRef     = ref<HTMLInputElement>()
const slugRef      = ref<HTMLInputElement>()
const rfidFocused  = ref(false)
const rfidReading  = ref(false)
const rfidBuffer   = ref('')
const form         = reactive({ email: '', senha: '', slug: '' })
let rfidTimer: ReturnType<typeof setTimeout> | null = null

// ── Restaurante ─────────────────────────────────────────────────────────
// O slug vem do subdomínio, do último acesso ou do .env; o campo só aparece
// quando a pessoa pede para trocar.
const slugAtual    = ref('')
const editandoSlug = ref(false)

function trocarRestaurante() {
  form.slug = slugAtual.value
  editandoSlug.value = true
  nextTick(() => slugRef.value?.focus())
}

async function confirmarSlug() {
  const novo = form.slug.trim().toLowerCase()
  editandoSlug.value = false
  if (!novo || novo === slugAtual.value) return
  slugAtual.value = novo
  await carregarConfig()
}

async function carregarConfig() {
  try {
    const cfg = await api.get<{ rfid_ativo: boolean }>(`/sistema/config-publica?slug=${encodeURIComponent(slugAtual.value)}`)
    rfidAtivo.value = cfg.rfid_ativo === true
  } catch {
    rfidAtivo.value = false
  }
  if (!rfidAtivo.value && modo.value === 'rfid') setModo('manual')
}

// ── Modos ───────────────────────────────────────────────────────────────
function setModo(m: 'rfid' | 'manual') {
  modo.value = m
  hideMsg()
  if (m === 'rfid') nextTick(focusRfid)
  else nextTick(() => emailRef.value?.focus())
}

function focusRfid() { rfidInputRef.value?.focus() }

function verificarCaps(e: KeyboardEvent) {
  capsLock.value = !!e.getModifierState?.('CapsLock')
}

// ── Login por crachá ────────────────────────────────────────────────────
function onRfidInput() {
  if (rfidTimer) clearTimeout(rfidTimer)
  rfidTimer = setTimeout(() => {
    if (rfidBuffer.value.length >= 3) onRfidEnter()
  }, 300)
}

function onRfidEnter() {
  const code = rfidBuffer.value.trim()
  rfidBuffer.value = ''
  if (code) loginRfid(code)
}

function concluirLogin(res: any, slug: string, texto: string) {
  const raw = res.usuario
  if (!(res.accessToken || res.access_token) || !raw) return false
  setTenantSlug(slug)
  const user = { id: raw.id, nome: raw.nome, cargo: raw.cargo, perfil_id: raw.perfil_id ?? null, permissoes: raw.permissoes ?? null }
  authStore.setAuth(res.accessToken ?? res.access_token, user, res.refreshToken ?? res.refresh_token)
  showMsg('success', texto)
  navigateTo('/')
  return true
}

async function loginRfid(cartao_rfid: string) {
  const slug = slugAtual.value
  if (!slug) return showMsg('error', 'Informe o código do restaurante.')
  rfidReading.value = true
  hideMsg()
  try {
    const res: any = await api.auth.rfid(cartao_rfid, slug)
    concluirLogin(res, slug, `Bem-vindo, ${res.usuario?.nome}!`)
  } catch (e: any) {
    showMsg('error', e.message || 'Cartão não reconhecido.')
    focusRfid()
  } finally {
    rfidReading.value = false
  }
}

// ── Login por e-mail e senha ────────────────────────────────────────────
async function handleManualLogin() {
  hideMsg()
  const slug = slugAtual.value
  if (!slug) return falhar('Informe o código do restaurante.', null)
  if (!form.email.trim()) return falhar('Informe seu e-mail para continuar.', 'email')
  if (!form.senha) return falhar('Informe sua senha para continuar.', 'senha')

  loading.value = true
  try {
    const res: any = await api.auth.login(form.email.trim(), form.senha, slug)
    concluirLogin(res, slug, 'Acesso autorizado!')
  } catch (err: any) {
    const texto = err?.message || err?.data?.error || 'Falha ao conectar com o servidor.'
    falhar(texto === 'Sessão expirada' ? 'E-mail ou senha incorretos.' : texto, 'senha')
  } finally {
    loading.value = false
  }
}

function falhar(texto: string, campo: 'email' | 'senha' | null) {
  showMsg('error', texto)
  invalido.value = campo
  if (campo === 'email') emailRef.value?.focus()
  if (campo === 'senha') senhaRef.value?.focus()
}

function showMsg(type: 'error' | 'success', text: string) { msg.type = type; msg.text = text }
function hideMsg() { msg.text = ''; invalido.value = null }

// ── Comanda animada do painel ───────────────────────────────────────────
const ESTADOS = [['b-wait', 'Na fila'], ['b-prep', 'Preparando'], ['b-ok', 'Pronto']] as const

interface PedidoDemo { id: number; tbl: string; nome: string; itens: string; s: 0 | 1 | 2; entrando: boolean; saindo: boolean; pop: boolean; atraso?: string }

const POOL: [string, string, string][] = [
  ['9', 'Mesa 9', '1 feijoada, 2 refrigerantes'],
  ['3', 'Mesa 3', '2 pizzas grandes'],
  ['B2', 'Balcão 2', '1 marmita'],
  ['7', 'Mesa 7', '4 pratos executivos'],
  ['15', 'Mesa 15', '1 picanha, 1 salada'],
]

let seq = 0
let proximo = 0
const novo = (tbl: string, nome: string, itens: string, s: 0 | 1 | 2, atraso?: string): PedidoDemo =>
  ({ id: ++seq, tbl, nome, itens, s, entrando: true, saindo: false, pop: false, atraso })

const pedidos = ref<PedidoDemo[]>([
  novo('12', 'Mesa 12', '2 risotos, 1 salmão', 1, '500ms'),
  novo('4', 'Mesa 4', '3 sucos, 1 sobremesa', 2, '680ms'),
  novo('B7', 'Balcão 7', '1 prato executivo', 0, '860ms'),
])

const contagemPedidos = computed(() => {
  const n = pedidos.value.filter(p => !p.saindo).length
  return `${n} ${n === 1 ? 'aberto' : 'abertos'}`
})

function avancar(p: PedidoDemo) {
  p.s = (p.s + 1) as 0 | 1 | 2
  p.pop = false
  requestAnimationFrame(() => { p.pop = true })
}

function tick() {
  const vivos = pedidos.value.filter(p => !p.saindo)
  const pronto = vivos.find(p => p.s === 2)
  if (pronto) {
    pronto.saindo = true
    setTimeout(() => {
      pedidos.value = pedidos.value.filter(p => p.id !== pronto.id)
      const [tbl, nome, itens] = POOL[proximo++ % POOL.length]
      pedidos.value.push(novo(tbl, nome, itens, 0))
    }, 900)
    return
  }
  const alvo = vivos.find(p => p.s === 1) ?? vivos.find(p => p.s === 0)
  if (alvo) avancar(alvo)
}

let animTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  authStore.restoreSession()
  if (authStore.isAuthenticated) return navigateTo('/')

  slugAtual.value = getTenantSlug() || ''
  await carregarConfig()
  if (rfidAtivo.value) setModo('rfid')
  else nextTick(() => emailRef.value?.focus())

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    animTimer = setInterval(() => { if (!document.hidden) tick() }, 2400)
  }
})

onUnmounted(() => {
  if (animTimer) clearInterval(animTimer)
  if (rfidTimer) clearTimeout(rfidTimer)
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   Login do sistema — design "Entrar · RestaurantePDV".
   Paleta própria (laranja quente), escopada nesta página: o tema escuro
   segue o mesmo seletor `html.dark` do resto do app, não o do sistema
   operacional, para o botão de tema daqui valer no sistema todo.
   ═══════════════════════════════════════════════════════════════════════════ */
.lg {
  --bg: #FFF4EA; --surface: #FFFFFF; --ink: #2A1608; --muted: #7A5C48; --line: #EBCFB8; --soft: #FFEBDA;
  --brand: #D9480F; --brand-ink: #FFFFFF; --brand-hover: #B93C0A; --focus: #EA580C; --danger: #B3261E; --ok: #14602B;
  --hero: #FF7A00; --hero-ink: #1E1E1E; --paper: #FFFDF7; --paper-ink: #1B1B18;

  min-height: 100dvh;
  background: var(--bg);
  color: var(--ink);
  font: 400 16px/1.5 'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}
html.dark .lg {
  --bg: #1A0E07; --surface: #27160C; --ink: #FFEFE2; --muted: #CBA68D; --line: #4D2F1D; --soft: #33200F;
  --brand: #FF8A3D; --brand-ink: #2A1000; --brand-hover: #FFA566; --focus: #FFA566; --danger: #FF8A80; --ok: #7EDC9A;
}
.lg h1, .lg h2 { font-family: 'Bricolage Grotesque', system-ui, sans-serif; letter-spacing: -.02em; margin: 0; }

.lg-page { display: grid; grid-template-columns: 1.1fr 1fr; min-height: 100dvh; padding: 14px; gap: 14px; }

/* ── Painel ── */
.lg-panel {
  position: relative; border-radius: 28px; background: var(--hero); color: var(--hero-ink);
  padding: 40px 44px; display: flex; flex-direction: column; justify-content: space-between;
  overflow: hidden; isolation: isolate;
}
.lg-panel::before, .lg-panel::after { content: ''; position: absolute; border-radius: 50%; z-index: -1; }
.lg-panel::before { width: 520px; height: 520px; right: -160px; bottom: -200px; background: radial-gradient(circle, rgba(255,226,170,.85), transparent 68%); }
.lg-panel::after  { width: 380px; height: 380px; left: -140px; top: -120px; background: radial-gradient(circle, rgba(255,255,255,.35), transparent 70%); }
.lg-panel h2 { font-size: clamp(30px, 3.4vw, 46px); line-height: 1.06; max-width: 14ch; margin-bottom: 12px; }
.lg-lead { margin: 0; max-width: 40ch; color: rgba(42,16,0,.85); font-size: 17px; }

.lg-stage { position: relative; display: flex; justify-content: center; padding: 28px 0; flex: 1; align-items: center; }
.lg-board {
  width: 340px; background: var(--paper); color: var(--paper-ink); border-radius: 20px; padding: 18px;
  box-shadow: 0 30px 60px rgba(90,30,0,.32); transform: rotate(-2deg);
  animation: lg-rise .8s cubic-bezier(.2,.8,.2,1) both;
}
.lg-board-head { display: flex; justify-content: space-between; align-items: baseline; padding: 2px 4px 12px; border-bottom: 2px dashed #D9CFB8; }
.lg-board-head strong { font: 700 18px 'Bricolage Grotesque', sans-serif; }
.lg-board-head span { font-size: 13px; color: #6A6757; }
.lg-order { display: flex; align-items: center; gap: 12px; padding: 12px 4px; border-bottom: 1px solid #EEE6D3; overflow: hidden; max-height: 100px; }
.lg-order:last-child { border-bottom: 0; }
.lg-tbl { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; font: 700 18px 'Bricolage Grotesque', sans-serif; background: #FFE3CC; color: #8A2F05; flex: none; }
.lg-info { flex: 1; min-width: 0; font-size: 15px; }
.lg-info b { display: block; font-weight: 600; }
.lg-info small { color: #6A6757; font-size: 13px; }
.lg-badge { font-size: 12.5px; font-weight: 600; padding: 5px 11px; border-radius: 999px; white-space: nowrap; transition: background .3s, color .3s; }
.b-prep { background: #FFE3CC; color: #8A2F05; }
.b-ok   { background: #D5F0DC; color: #14602B; }
.b-wait { background: #EEE9DC; color: #5A5646; }
.lg-badge.b-prep::before { content: ''; display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; background: currentColor; animation: lg-blink 1s ease-in-out infinite; }
.lg-chip { position: absolute; right: 6%; bottom: 2px; background: #2A1000; color: #FFEFE2; border-radius: 14px; padding: 10px 16px; font-size: 14px; box-shadow: 0 16px 30px rgba(60,20,0,.3); transform: rotate(3deg); }
.lg-chip b { display: block; font: 700 18px 'Bricolage Grotesque', sans-serif; color: #FFB366; }
.enter   { animation: lg-slide-in .5s cubic-bezier(.2,.8,.2,1) both; }
.leaving { animation: lg-slide-out .45s ease-in both; }
.pop     { animation: lg-pop .4s cubic-bezier(.2,.8,.2,1); }
@keyframes lg-rise { from { opacity: 0; transform: translateY(30px) rotate(-2deg); } to { opacity: 1; transform: rotate(-2deg); } }
@keyframes lg-slide-in { from { opacity: 0; transform: translateX(40px); max-height: 0; padding-top: 0; padding-bottom: 0; } to { opacity: 1; transform: none; max-height: 100px; } }
@keyframes lg-slide-out { from { opacity: 1; max-height: 100px; } 60% { opacity: 0; transform: translateX(-50px); max-height: 100px; } to { opacity: 0; transform: translateX(-50px); max-height: 0; padding-top: 0; padding-bottom: 0; border-width: 0; } }
@keyframes lg-pop { 0% { transform: scale(.8); } 60% { transform: scale(1.12); } 100% { transform: scale(1); } }
@keyframes lg-blink { 50% { opacity: .25; } }

/* ── Formulário ── */
.lg-form-side { position: relative; display: flex; align-items: center; justify-content: center; padding: 32px 24px; }
.lg-theme {
  position: absolute; top: 14px; right: 14px; width: 44px; height: 44px; border-radius: 12px;
  border: 1.5px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; display: grid; place-items: center;
}
.lg-theme:hover { background: var(--soft); }
.lg-card { width: 100%; max-width: 404px; }

.lg-logo { display: flex; flex-direction: column; align-items: center; gap: 16px; margin-bottom: 34px; font: 700 32px/1 'Bricolage Grotesque', sans-serif; text-align: center; }
.lg-logo-mark { width: 84px; height: 84px; border-radius: 24px; background: linear-gradient(145deg, #FF9B33, #FF7A00); color: #fff; display: grid; place-items: center; box-shadow: 0 6px 16px rgba(255,122,0,.35); }
.lg-pdv { color: #FF7A00; font-style: normal; }

.lg-card h1 { font-size: 22px; line-height: 1.2; margin-bottom: 6px; text-align: center; }
.lg-sub { margin: 0 0 22px; color: var(--muted); font-size: 15px; text-align: center; }

.lg-msg {
  display: flex; align-items: center; gap: 10px; margin: 0 0 18px; padding: 12px 14px; border-radius: 12px; font-size: 14px;
}
.lg-msg--error   { color: var(--danger); background: color-mix(in srgb, var(--danger) 10%, transparent); border: 1px solid color-mix(in srgb, var(--danger) 35%, transparent); }
.lg-msg--success { color: var(--ok); background: color-mix(in srgb, var(--ok) 10%, transparent); border: 1px solid color-mix(in srgb, var(--ok) 35%, transparent); }

.lg-rest { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; padding: 10px 14px; border-radius: 12px; background: var(--soft); color: var(--muted); font-size: 14px; }
.lg-rest b { color: var(--ink); font-weight: 600; }
.lg-rest .lg-link { margin-left: auto; }
.lg-rest:has(.lg-field--rest) { padding: 0; background: none; }
.lg-field--rest { width: 100%; margin-bottom: 0 !important; }

.lg-field { margin-bottom: 18px; }
.lg label { display: block; font-weight: 500; font-size: 14px; margin-bottom: 7px; }
.lg-control { position: relative; }
.lg-lead-ic { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; display: flex; transition: color .15s; }
.lg-control:focus-within .lg-lead-ic { color: var(--brand); }
.lg-control input {
  width: 100%; height: 54px; padding: 0 14px 0 46px; font: inherit; color: var(--ink);
  background: var(--surface); border: 1.5px solid var(--line); border-radius: 14px;
  transition: border-color .15s, box-shadow .15s;
}
.lg-control input::placeholder { color: #B79A86; }
.lg-control input:hover { border-color: #E0B48F; }
.lg-control input:focus-visible { outline: none; border-color: var(--focus); box-shadow: 0 0 0 4px color-mix(in srgb, var(--focus) 22%, transparent); }
.lg-control input[aria-invalid='true'] { border-color: var(--danger); }
.lg-control input[name='senha'] { padding-right: 52px; }
.lg-toggle { position: absolute; right: 6px; top: 6px; width: 42px; height: 42px; border: 0; border-radius: 10px; background: transparent; color: var(--muted); cursor: pointer; display: grid; place-items: center; }
.lg-toggle:hover { color: var(--ink); background: var(--soft); }
.lg-hint { margin: 7px 2px 0; font-size: 13px; color: var(--muted); }

.lg-link { color: var(--brand); font-weight: 500; text-decoration: none; border-radius: 4px; background: none; border: 0; padding: 4px 2px; cursor: pointer; font-size: 14px; }
.lg-link:hover { text-decoration: underline; }

.lg-btn {
  width: 100%; height: 56px; margin-top: 6px; border: 0; border-radius: 14px; background: var(--brand); color: var(--brand-ink);
  font: 600 17px 'DM Sans', sans-serif; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
  box-shadow: 0 10px 22px color-mix(in srgb, var(--brand) 32%, transparent);
  transition: background .15s, transform .05s, box-shadow .15s;
}
.lg-btn:hover { background: var(--brand-hover); }
.lg-btn:active { transform: scale(.99); box-shadow: none; }
.lg-btn[disabled] { opacity: .8; cursor: progress; }
.lg-btn--ghost { margin-top: 12px; height: 52px; background: transparent; color: var(--ink); border: 1.5px solid var(--line); box-shadow: none; font-size: 16px; }
.lg-btn--ghost:hover { background: var(--soft); }
.lg-spin { width: 18px; height: 18px; border: 2.5px solid color-mix(in srgb, var(--brand-ink) 35%, transparent); border-top-color: var(--brand-ink); border-radius: 50%; animation: lg-s .7s linear infinite; }
@keyframes lg-s { to { transform: rotate(360deg); } }

.lg-toggle:focus-visible, .lg-btn:focus-visible, .lg-theme:focus-visible, .lg-link:focus-visible, .lg-rfid-alvo:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }

/* Crachá (não existe no protótipo; segue a mesma linguagem visual) */
.lg-rfid { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
.lg-rfid > strong { font-size: 17px; font-weight: 600; }
.lg-rfid-alvo { position: relative; width: 168px; height: 168px; display: grid; place-items: center; border-radius: 50%; border: 0; background: none; cursor: pointer; }
.lg-rfid-ondas, .lg-rfid-ondas i { position: absolute; inset: 0; border-radius: 50%; }
.lg-rfid-ondas i { border: 1.5px solid var(--line); }
.lg-rfid-ondas i:nth-child(2) { inset: 18px; }
.lg-rfid-ondas i:nth-child(3) { inset: 36px; }
.lg-rfid-alvo.ativo .lg-rfid-ondas i { border-color: var(--brand); animation: lg-onda 2.4s ease-in-out infinite; }
.lg-rfid-alvo.ativo .lg-rfid-ondas i:nth-child(2) { animation-delay: .3s; }
.lg-rfid-alvo.ativo .lg-rfid-ondas i:nth-child(3) { animation-delay: .6s; }
@keyframes lg-onda { 0%, 100% { opacity: .25; } 50% { opacity: .8; } }
.lg-rfid-cartao { position: relative; width: 72px; height: 96px; display: grid; place-items: center; border-radius: 12px; background: var(--surface); border: 1.5px solid var(--line); color: var(--muted); transition: transform .18s, background-color .18s, color .18s; }
.lg-rfid-alvo.ativo .lg-rfid-cartao { color: var(--brand); }
.lg-rfid-alvo.lendo .lg-rfid-cartao { background: var(--brand); border-color: var(--brand); color: var(--brand-ink); transform: scale(1.06); }
.lg-rfid-status { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; color: var(--muted); }
.lg-rfid-status i { width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
.lg-rfid-alvo.ativo ~ .lg-rfid-status i { background: #2EC27E; }
.lg-rfid-alvo.lendo ~ .lg-rfid-status i { background: var(--brand); }
.lg-rfid-input { position: absolute; width: 0; height: 0; opacity: 0; }

.lg-foot { margin-top: 30px; text-align: center; font-size: 13px; color: var(--muted); }

@media (max-width: 900px) {
  .lg-page { grid-template-columns: 1fr; padding: 0; }
  .lg-panel { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .lg-board, .enter, .leaving, .pop, .lg-badge::before, .lg-rfid-ondas i { animation: none !important; }
}
</style>
