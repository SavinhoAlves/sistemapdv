<template>
  <div class="lg">
    <div class="lg-page">

      <!-- ══ PAINEL — comanda animada (desktop) ══ -->
      <aside class="lg-panel" aria-hidden="true">
        <div class="lg-marca">
          <span class="lg-marca-ic"><UtensilsCrossed :size="18" /></span>
          Restaurante PDV
        </div>

        <!-- Comanda impressa linha a linha, como sai na bobina do caixa -->
        <div class="lg-stage">
          <div class="lg-cupom" :class="{ fechada: comanda.fechada }">
            <div class="lg-cupom-topo">
              <span>{{ comanda.mesa }}</span>
              <span>{{ comanda.hora }}</span>
            </div>
            <div class="lg-cupom-itens">
              <div v-for="(it, i) in comanda.itens.slice(0, comanda.linhas)" :key="comanda.id + '-' + i" class="lg-cupom-linha">
                <span>{{ it[0] }}×</span>
                <span>{{ it[1] }}</span>
                <span>{{ reais(it[0] * it[2]) }}</span>
              </div>
              <div v-if="comanda.linhas < comanda.itens.length" class="lg-cupom-cursor"><i /></div>
            </div>
            <div class="lg-cupom-soma">
              <div><span>Subtotal</span><span>{{ reais(subtotal) }}</span></div>
              <div><span>Serviço 10%</span><span>{{ reais(subtotal * 0.1) }}</span></div>
              <div class="lg-cupom-total"><span>Total</span><span>{{ reais(subtotal * 1.1) }}</span></div>
            </div>
            <span v-if="comanda.fechada" class="lg-carimbo">Paga</span>
          </div>
        </div>

        <div>
          <h2>Do pedido na mesa à conta paga.</h2>
          <p class="lg-lead">O que o garçom lança chega na cozinha e fecha no caixa, sem comanda de papel perdida.</p>
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
            <span class="lg-logo-mark"><UtensilsCrossed :size="30" :stroke-width="2" /></span>
            <span>Restaurante <i class="lg-pdv">PDV</i></span>
          </div>

          <!-- Um login só: restaurante ou gestão da plataforma -->
          <div class="lg-acesso" role="tablist" aria-label="Tipo de acesso">
            <button type="button" role="tab" :aria-selected="acesso === 'restaurante'" :class="{ ativo: acesso === 'restaurante' }" @click="setAcesso('restaurante')">
              <Store :size="16" /> Restaurante
            </button>
            <button type="button" role="tab" :aria-selected="acesso === 'plataforma'" :class="{ ativo: acesso === 'plataforma' }" @click="setAcesso('plataforma')">
              <ShieldCheck :size="16" /> Plataforma
            </button>
          </div>

          <h1>{{ acesso === 'plataforma' ? 'Entrar na Central' : 'Entrar no sistema' }}</h1>
          <p class="lg-sub">
            {{ acesso === 'plataforma'
              ? 'Acesso de quem administra o Restaurante PDV.'
              : modo === 'rfid' ? 'Encoste o crachá no leitor para começar o turno.' : 'Use o e-mail e a senha que o gerente cadastrou para você.' }}
          </p>

          <p v-if="msg.text" class="lg-msg" :class="`lg-msg--${msg.type}`" role="alert">
            <CheckCircle2 v-if="msg.type === 'success'" :size="18" />
            <AlertCircle v-else :size="18" />
            {{ msg.text }}
          </p>

          <!-- Restaurante: só aparece como campo quando a pessoa pede para trocar -->
          <div v-if="acesso === 'restaurante'" class="lg-rest">
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
          <div v-if="acesso === 'restaurante' && modo === 'rfid'" class="lg-rfid">
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
          <form v-else novalidate @submit.prevent="acesso === 'plataforma' ? loginPlataforma() : handleManualLogin()">
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
                  :placeholder="acesso === 'plataforma' ? 'admin@restaurantepdv.com.br' : 'seu@email.com'"
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
                  placeholder="Sua senha"
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

            <button v-if="rfidAtivo && acesso === 'restaurante'" type="button" class="lg-btn lg-btn--ghost" @click="setModo('rfid')">
              <CreditCard :size="18" /> Entrar com crachá
            </button>
          </form>

          <p class="lg-foot">
            {{ acesso === 'plataforma'
              ? 'Esqueceu a senha? Outro administrador da plataforma pode redefinir para você.'
              : 'Esqueceu a senha? O gerente do restaurante pode criar uma nova para você.' }}
          </p>
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
  CheckCircle2, AlertCircle, Store, Sun, Moon, ShieldCheck,
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { useThemeStore } from '~/stores/theme'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import { getTenantSlug, setTenantSlug } from '~/composables/useTenantSlug'

definePageMeta({ layout: false })

const authStore  = useAuthStore()
const themeStore = useThemeStore()
const platformAuth = usePlatformAuthStore()
const route      = useRoute()
const runtimeConfig = useRuntimeConfig()

// ── Tipo de acesso: restaurante (padrão) ou plataforma (?acesso=plataforma) ──
const acesso = ref<'restaurante' | 'plataforma'>(route.query.acesso === 'plataforma' ? 'plataforma' : 'restaurante')

function setAcesso(a: 'restaurante' | 'plataforma') {
  if (acesso.value === a) return
  acesso.value = a
  hideMsg()
  if (a === 'plataforma') modo.value = 'manual'
  else if (rfidAtivo.value) modo.value = 'rfid'
  navigateTo({ path: '/login', query: a === 'plataforma' ? { acesso: 'plataforma' } : {} }, { replace: true })
  if (modo.value === 'rfid') nextTick(focusRfid)
  else nextTick(() => emailRef.value?.focus())
}
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

// ── Login da plataforma (super admin) ───────────────────────────────────
async function loginPlataforma() {
  hideMsg()
  if (!form.email.trim()) return falhar('Informe seu e-mail para continuar.', 'email')
  if (!form.senha) return falhar('Informe sua senha para continuar.', 'senha')
  loading.value = true
  try {
    const baseUrl = (runtimeConfig.public as any).apiUrl as string
    const resp = await fetch(`${baseUrl}/api/platform/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email.trim(), senha: form.senha }),
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) throw new Error(data.error || 'E-mail ou senha incorretos.')
    if (!data.accessToken || !data.user) throw new Error('Resposta inválida do servidor.')
    if (data.refreshToken) localStorage.setItem('platform_refresh_token', data.refreshToken)
    platformAuth.set(data.accessToken, data.user)
    showMsg('success', `Bem-vindo, ${data.user.nome}!`)
    navigateTo('/platform')
  } catch (err: any) {
    falhar(err?.message || 'Falha ao conectar com o servidor.', 'senha')
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

// ── Comanda do painel: imprime uma linha por vez, fecha e passa à próxima ──
type Item = [number, string, number] // quantidade, produto, preço unitário

const EXEMPLOS: { mesa: string; hora: string; itens: Item[] }[] = [
  { mesa: 'Mesa 07', hora: '12:41', itens: [[2, 'Parmegiana de frango', 46.9], [1, 'Arroz à grega', 12], [2, 'Suco de laranja', 9.5], [1, 'Pudim de leite', 14]] },
  { mesa: 'Balcão 3', hora: '13:05', itens: [[1, 'Prato executivo', 32.9], [1, 'Refrigerante lata', 7], [1, 'Café expresso', 6.5]] },
  { mesa: 'Mesa 14', hora: '20:18', itens: [[1, 'Pizza margherita', 64], [1, 'Pizza calabresa', 62], [3, 'Cerveja long neck', 13], [1, 'Petit gâteau', 24]] },
]

let seqComanda = 0
function novaComanda(i: number) {
  const ex = EXEMPLOS[i % EXEMPLOS.length]
  return { id: ++seqComanda, ...ex, linhas: 1, fechada: false }
}
const indice  = ref(0)
const comanda = ref(novaComanda(0))
const subtotal = computed(() => comanda.value.itens.slice(0, comanda.value.linhas).reduce((t, it) => t + it[0] * it[2], 0))
const reais = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

let pausa = 0
function tick() {
  const c = comanda.value
  if (pausa > 0) { pausa--; return }
  if (c.linhas < c.itens.length) { c.linhas++; return }
  if (!c.fechada) { c.fechada = true; pausa = 2; return }
  indice.value++
  comanda.value = novaComanda(indice.value)
}

let animTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  if (acesso.value === 'plataforma') {
    platformAuth.restore()
    if (platformAuth.isAuthenticated) return navigateTo('/platform')
  } else {
    authStore.restoreSession()
    if (authStore.isAuthenticated) return navigateTo('/')
  }

  slugAtual.value = getTenantSlug() || ''
  await carregarConfig()
  if (rfidAtivo.value && acesso.value === 'restaurante') setModo('rfid')
  else nextTick(() => emailRef.value?.focus())

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    comanda.value.linhas = comanda.value.itens.length
  } else {
    animTimer = setInterval(() => { if (!document.hidden) tick() }, 1100)
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
  font: 400 16px/1.55 var(--fonte-texto);
  -webkit-font-smoothing: antialiased;
}
html.dark .lg {
  --bg: #1A0E07; --surface: #27160C; --ink: #FFEFE2; --muted: #CBA68D; --line: #4D2F1D; --soft: #33200F;
  --brand: #FF8A3D; --brand-ink: #2A1000; --brand-hover: #FFA566; --focus: #FFA566; --danger: #FF8A80; --ok: #7EDC9A;
}
.lg h1, .lg h2 { font-family: var(--fonte-texto); font-weight: 700; letter-spacing: -.03em; margin: 0; }

.lg-page { display: grid; grid-template-columns: 1.1fr 1fr; min-height: 100dvh; padding: 14px; gap: 14px; }

/* ── Painel ──
   Laranja chapado da marca, sem brilhos. Em cima, a comanda do PDV: papel de
   bobina picotado, itens e valores em fonte monoespaçada, carimbo de paga. */
.lg-panel {
  position: relative; border-radius: 24px; background: var(--hero); color: var(--hero-ink);
  padding: 36px 44px 40px; display: flex; flex-direction: column; justify-content: space-between; gap: 24px;
  overflow: hidden;
  /* trama de linhas de bobina, bem discreta */
  background-image: repeating-linear-gradient(0deg, rgba(0,0,0,.035) 0 1px, transparent 1px 28px);
}
.lg-marca { display: flex; align-items: center; gap: 10px; font: 700 16px var(--fonte-texto); color: #1E1E1E; }
.lg-marca-ic { width: 36px; height: 36px; border-radius: 10px; background: #1E1E1E; color: var(--hero); display: grid; place-items: center; }
.lg-panel h2 { font-size: clamp(28px, 3vw, 42px); line-height: 1.08; max-width: 15ch; margin-bottom: 12px; }
.lg-lead { margin: 0; max-width: 42ch; color: rgba(30,20,10,.82); font-size: 16px; }

.lg-stage { flex: 1; display: grid; place-items: center; padding: 8px 0; }
.lg-cupom {
  --furo: 7px;
  position: relative; width: min(340px, 100%);
  padding: 22px 22px 24px;
  background: var(--paper); color: var(--paper-ink);
  font: 400 14px/1.6 var(--fonte-numero); font-variant-numeric: tabular-nums;
  box-shadow: 0 24px 50px rgba(90,30,0,.28);
  -webkit-mask:
    radial-gradient(circle var(--furo) at 50% 0, #0000 98%, #000) 50% 0 / calc(var(--furo) * 3) 51% repeat-x,
    radial-gradient(circle var(--furo) at 50% 100%, #0000 98%, #000) 50% 100% / calc(var(--furo) * 3) 51% repeat-x;
          mask:
    radial-gradient(circle var(--furo) at 50% 0, #0000 98%, #000) 50% 0 / calc(var(--furo) * 3) 51% repeat-x,
    radial-gradient(circle var(--furo) at 50% 100%, #0000 98%, #000) 50% 100% / calc(var(--furo) * 3) 51% repeat-x;
}
.lg-cupom-topo { display: flex; justify-content: space-between; padding-bottom: 10px; border-bottom: 1.5px dashed #D9CFB8; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; font-size: 12px; }
.lg-cupom-itens { min-height: 128px; padding: 10px 0; }
.lg-cupom-linha { display: grid; grid-template-columns: 2.4em 1fr auto; gap: 8px; animation: lg-imprime .35s ease-out both; }
.lg-cupom-linha > :last-child { text-align: right; }
.lg-cupom-cursor i { display: inline-block; width: 9px; height: 15px; background: #1B1B18; vertical-align: middle; animation: lg-pisca 1s steps(1) infinite; }
.lg-cupom-soma { border-top: 1.5px dashed #D9CFB8; padding-top: 10px; display: grid; gap: 2px; }
.lg-cupom-soma > div { display: flex; justify-content: space-between; color: #6A6757; }
.lg-cupom-soma .lg-cupom-total { color: #1B1B18; font-weight: 700; font-size: 17px; margin-top: 4px; }
.lg-carimbo {
  position: absolute; right: 18px; top: 46%;
  padding: 4px 14px; border: 2.5px solid #12805C; border-radius: 8px;
  color: #12805C; font: 700 20px var(--fonte-numero); letter-spacing: .18em; text-transform: uppercase;
  transform: rotate(-12deg); opacity: .9;
  animation: lg-carimba .3s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes lg-imprime { from { opacity: 0; transform: translateY(-4px); clip-path: inset(0 100% 0 0); } to { opacity: 1; transform: none; clip-path: inset(0 0 0 0); } }
@keyframes lg-pisca { 50% { opacity: 0; } }
@keyframes lg-carimba { from { opacity: 0; transform: rotate(-12deg) scale(1.6); } to { opacity: .9; transform: rotate(-12deg) scale(1); } }

/* ── Formulário ── */
.lg-form-side { position: relative; display: flex; align-items: center; justify-content: center; padding: 32px 24px; }
.lg-theme {
  position: absolute; top: 14px; right: 14px; width: 44px; height: 44px; border-radius: 12px;
  border: 1.5px solid var(--line); background: var(--surface); color: var(--ink); cursor: pointer; display: grid; place-items: center;
}
.lg-theme:hover { background: var(--soft); }
.lg-card { width: 100%; max-width: 404px; }

.lg-logo { display: flex; flex-direction: column; align-items: center; gap: 16px; margin-bottom: 34px; font: 700 28px/1.1 var(--fonte-texto); letter-spacing: -.03em; text-align: center; }
.lg-logo-mark { width: 64px; height: 64px; border-radius: 18px; background: var(--brand); color: var(--brand-ink); display: grid; place-items: center; }
.lg-pdv { color: #FF7A00; font-style: normal; }

.lg-acesso { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 4px; margin-bottom: 22px; border-radius: 14px; background: var(--soft); }
.lg-acesso button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 42px; border: 0; border-radius: 10px; background: transparent; color: var(--muted); font: 600 14px var(--fonte-texto); cursor: pointer; }
.lg-acesso button:hover { color: var(--ink); }
.lg-acesso button.ativo { background: var(--surface); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.12); }
.lg-acesso button:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
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
  font: 600 16px var(--fonte-texto); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
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
  .lg-cupom-linha, .lg-cupom-cursor i, .lg-carimbo, .lg-rfid-ondas i { animation: none !important; }
}
</style>
