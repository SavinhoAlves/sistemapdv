<template>
  <div class="lg">
    <div class="bg" aria-hidden="true"><div class="orb o1" /><div class="orb o2" /></div>

    <div class="page">
      <section class="hero" aria-label="Apresentação do sistema">
        <span class="tagline">Plataforma para restaurantes</span>
        <h2>Cada perfil com a <i>ferramenta certa.</i></h2>
        <p class="lead">Clientes operam o restaurante no dia a dia. Gestores acompanham toda a plataforma: licenças, cobrança e planos.</p>
        <div class="mods">
          <div class="mod"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 5h18v5H3zM6 10v10M18 10v10" /></svg></span><div><h3>Mesas e comandas</h3><p>Abra, junte e transfira mesas, com a divisão de conta.</p></div></div>
          <div class="mod"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14a4 4 0 0 1 1-7.9A5 5 0 0 1 17 7a4 4 0 0 1 1 7.9V20H6zM6 17h12" /></svg></span><div><h3>Cozinha integrada</h3><p>O pedido do salão chega na hora na tela da cozinha.</p></div></div>
          <div class="mod"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM3 10h18M7 15h4" /></svg></span><div><h3>Caixa e pagamentos</h3><p>Dinheiro, cartão e Pix, com fechamento do dia.</p></div></div>
          <div class="mod"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg></span><div><h3>Relatórios</h3><p>Vendas, horários de pico e faturamento em tempo real.</p></div></div>
        </div>
        <div class="chips"><span>Perfis dedicados</span><span>Vários restaurantes</span><span>Relatórios em tempo real</span><span>100% online</span></div>
      </section>

      <div class="side">
        <div class="top">
          <!-- O site de apresentação fica no domínio principal (restaurantepdv.com.br) -->
          <a class="back" :href="linkInicio"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg><span>Voltar ao início</span></a>
        </div>

        <main class="center">
          <div class="lg-card">
            <div class="brand">
              <div class="mark"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" /><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" /><path d="m2.1 21.8 6.4-6.3" /><path d="m19 5-7 7" /></svg></div>
              <h1>Restaurante <i>PDV</i></h1>
              <p class="welcome">{{ bloqueio ? 'Não foi possível entrar' : saudacao }}</p>
            </div>

            <div v-if="!bloqueio">
              <div class="tabs" role="tablist" aria-label="Tipo de acesso">
                <button class="tab" role="tab" type="button" :aria-selected="perfil === 'cli'" @click="setPerfil('cli')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 9l1-5h16l1 5M4 9v11h16V9M9 20v-6h6v6" /></svg>Cliente</button>
                <button class="tab" role="tab" type="button" :aria-selected="perfil === 'ges'" @click="setPerfil('ges')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>Gestor</button>
              </div>
              <p class="tabdesc">{{ PERFIL[perfil].desc }}</p>

              <p v-if="msg.text" class="msg" :class="msg.type === 'error' ? 'err' : 'ok'" :role="msg.type === 'error' ? 'alert' : 'status'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.1" /></svg>
                {{ msg.text }}
              </p>

              <!-- Crachá RFID: recurso de plano, só aparece quando liberado -->
              <div v-if="perfil === 'cli' && modo === 'rfid'" class="rfid" @click="focusRfid">
                <div class="rfid-ic" :class="{ lendo: rfidReading }"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M7 15h4M15 9.5a3 3 0 0 1 0 5M17.5 8a6 6 0 0 1 0 8" /></svg></div>
                <p>{{ rfidReading ? 'Lendo o crachá…' : 'Encoste o crachá no leitor para entrar.' }}</p>
                <input ref="rfidInputRef" v-model="rfidBuffer" class="rfid-input" type="password" autocomplete="off" aria-label="Leitura do crachá" @input="onRfidInput" @keydown.enter.prevent="onRfidEnter">
                <button type="button" class="btn ghost" @click.stop="setModo('manual')">Entrar com usuário e senha</button>
              </div>

              <form v-else novalidate @submit.prevent="entrar">
                <div class="field">
                  <label for="user">{{ PERFIL[perfil].label }}</label>
                  <div class="control">
                    <span class="lead-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg></span>
                    <input id="user" ref="emailRef" v-model="form.email" name="user" :type="perfil === 'ges' ? 'email' : 'text'" autocapitalize="none" spellcheck="false" autocomplete="username" :placeholder="PERFIL[perfil].ph" :aria-invalid="invalido === 'email'">
                  </div>
                </div>
                <div class="field">
                  <label for="pass">Senha</label>
                  <div class="control">
                    <span class="lead-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></span>
                    <input id="pass" ref="senhaRef" v-model="form.senha" class="pw" name="pass" :type="showPass ? 'text' : 'password'" autocomplete="current-password" placeholder="Digite sua senha" :aria-invalid="invalido === 'senha'" @keyup="verificarCaps" @blur="capsLock = false">
                    <button type="button" class="toggle" :aria-label="showPass ? 'Ocultar senha' : 'Mostrar senha'" :aria-pressed="showPass" @click="showPass = !showPass">
                      <svg v-if="!showPass" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
                      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 6.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 7.6A17 17 0 0 0 2 12s3.5 7 10 7c1.6 0 3-.3 4.3-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
                    </button>
                  </div>
                  <p class="hint" :class="{ show: capsLock }">Caps Lock está ativado.</p>
                </div>
                <div class="row">
                  <button v-if="rfidAtivo && perfil === 'cli'" type="button" class="link" @click="setModo('rfid')">Entrar com crachá</button>
                  <span v-else />
                  <button type="button" class="link" @click="abrirRecuperar">Esqueci minha senha</button>
                </div>
                <button class="btn" type="submit" :disabled="loading"><span class="spin" /><span>{{ loading ? 'Entrando…' : PERFIL[perfil].btn }}</span></button>
              </form>
              <p class="help">{{ PERFIL[perfil].help }}</p>
              <NuxtLink v-if="app" to="/acesso" class="link" style="display:block;margin-top:12px;text-align:center">Entrar lendo o QR code</NuxtLink>
            </div>

            <div v-else class="blocked" role="alert">
              <div class="lock"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></div>
              <h2>Acesso bloqueado</h2>
              <p>{{ bloqueio }}</p>
              <a class="btn" href="/" style="text-decoration:none">Falar com o suporte</a>
              <button class="btn ghost" type="button" @click="voltarLogin">Voltar ao login</button>
            </div>
          </div>
        </main>
        <div class="copy">© Restaurante PDV</div>
      </div>
    </div>

    <!-- Recuperar senha: a redefinição é feita por quem administra o acesso,
         não por um formulário público (CNPJ/CPF não é segredo). -->
    <dialog ref="dlgRef" aria-labelledby="dt" @click="fecharFora">
      <h2 id="dt">Recuperar senha</h2>
      <p class="sub">{{ perfil === 'cli'
        ? 'O gerente do restaurante cria uma nova senha para você em Configurações › Usuários. Depois é só entrar com ela.'
        : 'Outro administrador da plataforma pode redefinir a sua senha na Central, em Usuários.' }}</p>
      <div class="dact"><span /><button type="button" class="btn" @click="dlgRef?.close()">Entendi</button></div>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from 'nuxt/app'
import { noApp, destinoNoCelular } from '~/lib/app'
import { ehApp, ehPainel, urlDoHost } from '~/lib/hosts'
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useApi } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import { getTenantSlug, setTenantSlug } from '~/composables/useTenantSlug'

definePageMeta({ layout: false })

const authStore    = useAuthStore()
const platformAuth = usePlatformAuthStore()
const route        = useRoute()
const runtimeConfig = useRuntimeConfig()
const api          = useApi()

// ── Perfis: Cliente = restaurante, Gestor = plataforma (?acesso=plataforma) ──
type Perfil = 'cli' | 'ges'
const PERFIL = {
  cli: { desc: 'Acesse o sistema do seu restaurante: caixa, mesas e cozinha.', label: 'Código ou usuário', ph: 'Ex.: 1001-1 ou joao', btn: 'Entrar no sistema', help: 'Problemas para acessar? Fale com o gerente da loja.' },
  ges: { desc: 'Acesso ao painel da plataforma: restaurantes, cobrança, planos e demonstrações.', label: 'E-mail', ph: 'admin@restaurantepdv.com.br', btn: 'Entrar no painel', help: 'Problemas para acessar? Fale com outro administrador.' },
}
// painel.<domínio> é só da plataforma; app.<domínio> só do restaurante (a outra aba troca de endereço)
const perfil = ref<Perfil>(ehPainel() || route.query.acesso === 'plataforma' ? 'ges' : 'cli')
const linkInicio = (ehApp() || ehPainel()) ? urlDoHost('', '/') : '/'

function setPerfil(p: Perfil) {
  if (perfil.value === p) return
  if (p === 'ges' && ehApp()) return navigateTo(urlDoHost('painel', '/login'), { external: true })
  if (p === 'cli' && ehPainel()) return navigateTo(urlDoHost('app', '/login'), { external: true })
  perfil.value = p
  hideMsg()
  if (p === 'ges') modo.value = 'manual'
  else if (rfidAtivo.value) modo.value = 'rfid'
  navigateTo({ path: '/login', query: p === 'ges' ? { acesso: 'plataforma' } : {} }, { replace: true })
  if (modo.value === 'rfid') nextTick(focusRfid)
  else nextTick(() => emailRef.value?.focus())
}

const hora = new Date().getHours()
const saudacao = (hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite') + ', bem-vindo de volta'

const rfidAtivo = ref(false)
const modo      = ref<'rfid' | 'manual'>('manual')
const loading   = ref(false)
const showPass  = ref(false)
const capsLock  = ref(false)
const invalido  = ref<'email' | 'senha' | null>(null)
const msg       = reactive({ text: '', type: 'error' as 'error' | 'success' })
const bloqueio  = ref('')

const rfidInputRef = ref<HTMLInputElement>()
const emailRef     = ref<HTMLInputElement>()
const senhaRef     = ref<HTMLInputElement>()
const dlgRef       = ref<HTMLDialogElement>()
const rfidReading  = ref(false)
const rfidBuffer   = ref('')
const form         = reactive({ email: '', senha: '' })
let rfidTimer: ReturnType<typeof setTimeout> | null = null

// ── Restaurante do aparelho ─────────────────────────────────────────────
// Não é digitado: vem do último login (ou do subdomínio) e só é usado pelo crachá RFID.
const slugAtual = ref('')

async function carregarConfig() {
  if (!slugAtual.value) { rfidAtivo.value = false; return }
  try {
    const cfg = await api.get<{ rfid_ativo: boolean }>(`/sistema/config-publica?slug=${encodeURIComponent(slugAtual.value)}`)
    rfidAtivo.value = cfg.rfid_ativo === true
  } catch {
    rfidAtivo.value = false
  }
  if (!rfidAtivo.value && modo.value === 'rfid') setModo('manual')
}

// Licença vencida ou restaurante suspenso: estado "Acesso bloqueado"
async function verificarLicenca(slug: string) {
  if (!slug) return false
  try {
    const st = await api.get<{ suspenso?: boolean; expirado?: boolean; semLicenca?: boolean; motivo?: string }>(`/sistema/status-licenca?slug=${encodeURIComponent(slug)}`)
    // Restaurante inexistente não é bloqueio: o login mostra o erro e pede outro código
    if (st.motivo === 'tenant_nao_encontrado') return false
    if (st.suspenso) bloqueio.value = st.motivo || 'Este restaurante está suspenso. Entre em contato para regularizar o acesso.'
    else if (st.expirado) bloqueio.value = 'A licença deste restaurante está vencida. Entre em contato para regularizar o acesso.'
    else if (st.semLicenca) bloqueio.value = 'Este restaurante ainda não tem uma licença ativa. Entre em contato para liberar o acesso.'
  } catch { /* sem status, segue o login normal */ }
  return !!bloqueio.value
}

function voltarLogin() {
  bloqueio.value = ''
  form.senha = ''
  hideMsg()
  nextTick(() => emailRef.value?.focus())
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

function abrirRecuperar() { dlgRef.value?.showModal() }
function fecharFora(e: MouseEvent) { if (e.target === dlgRef.value) dlgRef.value?.close() }

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

const app = noApp()

function concluirLogin(res: any, slug: string, texto: string) {
  const raw = res.usuario
  if (!(res.accessToken || res.access_token) || !raw) return false
  setTenantSlug(slug)
  const user = { id: raw.id, nome: raw.nome, cargo: raw.cargo, perfil_id: raw.perfilId ?? null, permissoes: raw.permissoes ?? null }
  const token = res.accessToken ?? res.access_token
  authStore.setAuth(token, user, res.refreshToken ?? res.refresh_token)
  showMsg('success', texto)
  // No app da equipe: entregador vai para as entregas; os demais passam por /m,
  // que confere se a venda pelo celular está liberada e o caixa aberto
  if (noApp()) navigateTo(raw.cargo === 'entregador' ? '/entregador' : { path: '/m', query: { t: token } })
  else navigateTo('/')
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
    if (/suspenso/i.test(e?.message || '') && await verificarLicenca(slug)) return
    showMsg('error', e.message || 'Cartão não reconhecido.')
    focusRfid()
  } finally {
    rfidReading.value = false
  }
}

function entrar() {
  return perfil.value === 'ges' ? loginPlataforma() : handleManualLogin()
}

// ── Cliente: código ou nome de usuário e senha ──────────────────────────────
async function handleManualLogin() {
  hideMsg()
  if (!form.email.trim()) return falhar('Informe seu código ou nome de usuário.', 'email')
  if (!form.senha) return falhar('Informe sua senha para continuar.', 'senha')

  loading.value = true
  try {
    // O restaurante vem na resposta: código completo (1001-3) e nome de usuário já o identificam
    const res: any = await api.auth.login(form.email.trim(), form.senha)
    concluirLogin(res, res.tenant?.slug ?? '', 'Acesso autorizado!')
  } catch (err: any) {
    const texto = err?.message || err?.data?.error || 'Falha ao conectar com o servidor.'
    if (/suspenso/i.test(texto)) {
      bloqueio.value = 'Este restaurante está suspenso. Entre em contato para regularizar o acesso.'
      return
    }
    falhar(texto === 'Sessão expirada' || texto === 'Credenciais inválidas' ? 'Usuário ou senha incorretos.' : texto, 'senha')
  } finally {
    loading.value = false
  }
}

// ── Gestor: login da plataforma (super admin) ───────────────────────────
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

onMounted(async () => {
  if (perfil.value === 'ges') {
    platformAuth.restore()
    if (platformAuth.isAuthenticated) return navigateTo('/platform')
  } else {
    authStore.restoreSession()
    if (authStore.isAuthenticated) return navigateTo(noApp() ? destinoNoCelular(authStore.usuario?.cargo) : '/')
  }

  // Restaurante guardado no aparelho (para o crachá); se não existir mais, é descartado
  slugAtual.value = getTenantSlug() || ''
  if (slugAtual.value) {
    await api.get(`/auth/restaurante?ref=${encodeURIComponent(slugAtual.value)}`).catch((e: any) => {
      if (/não encontrado/i.test(e?.message || '')) slugAtual.value = ''
    })
  }
  await carregarConfig()
  if (rfidAtivo.value && perfil.value === 'cli') setModo('rfid')
  else nextTick(() => emailRef.value?.focus())
})

onUnmounted(() => {
  if (rfidTimer) clearTimeout(rfidTimer)
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   Login — design "Entrar · Restaurante PDV" (escuro, vidro e laranja).
   Fiel ao arquivo de referência; só as fontes seguem a identidade do PDV
   (Sora no texto) e a lógica é a real do sistema.
   ═══════════════════════════════════════════════════════════════════════════ */
.lg {
  --bg:#12100E; --card:rgba(30,27,24,.72); --ink:#F6F2EA; --muted:#A8A196; --line:rgba(255,255,255,.12);
  --field:#171513; --brand:#FF7A00; --brand-hover:#FF8F2B; --danger:#FF8F94; --focus:#FFA14D; --ok:#5DDBA8;
  min-height:100vh; background:var(--bg); color:var(--ink); color-scheme:dark;
  font:400 16px/1.5 var(--fonte-texto),system-ui,sans-serif; -webkit-font-smoothing:antialiased; overflow-x:hidden;
  padding-top:env(safe-area-inset-top,0px); padding-bottom:env(safe-area-inset-bottom,0px);
}
.lg *,.lg *::before,.lg *::after{box-sizing:border-box}
.lg h1,.lg h2,.lg h3{font-family:var(--fonte-texto);letter-spacing:-.02em;margin:0}
.lg :where(button){font:inherit;color:inherit}

.bg{position:fixed;inset:0;overflow:hidden;z-index:0}
.orb{position:absolute;border-radius:50%;filter:blur(110px);animation:drift 22s ease-in-out infinite alternate}
.o1{width:620px;height:620px;left:-200px;top:-200px;background:#FF7A00;opacity:.4}
.o2{width:520px;height:520px;right:-160px;bottom:-200px;background:#FF9B33;opacity:.26;animation-duration:28s;animation-delay:-8s}
@keyframes drift{from{transform:translate(0,0) scale(1)}to{transform:translate(60px,40px) scale(1.12)}}

.page{position:relative;z-index:1;min-height:100vh;display:grid;grid-template-columns:1.1fr 1fr;gap:14px;padding:14px}

/* Painel de apresentação */
.hero{border:1px solid var(--line);border-radius:30px;background:linear-gradient(160deg,rgba(255,122,0,.16),rgba(30,27,24,.55) 45%);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);padding:44px 48px;display:flex;flex-direction:column;justify-content:center;gap:28px}
.tagline{align-self:flex-start;font-size:13px;font-weight:600;color:var(--focus);padding:6px 14px;border-radius:999px;background:rgba(255,122,0,.14);border:1px solid rgba(255,122,0,.35)}
.hero h2{font-size:clamp(32px,3.6vw,50px);line-height:1.04;font-weight:800;max-width:15ch}
.hero h2 i{font-style:normal;color:var(--brand)}
.hero p.lead{margin:0;color:var(--muted);font-size:17px;max-width:48ch}
.mods{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.mod{display:flex;gap:14px;padding:16px;border-radius:20px;border:1px solid var(--line);background:rgba(255,255,255,.04);transition:background .2s,transform .2s,border-color .2s}
.mod:hover{background:rgba(255,255,255,.07);transform:translateY(-2px);border-color:rgba(255,122,0,.4)}
.mod .ic{flex:none;width:44px;height:44px;border-radius:13px;background:rgba(255,122,0,.16);color:var(--brand);display:grid;place-items:center}
.mod h3{font-size:16px;margin-bottom:2px}
.mod p{margin:0;color:var(--muted);font-size:14px;line-height:1.4}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips span{font-size:13px;font-weight:500;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.06);color:#D8D2C7}

/* Coluna do formulário */
.side{display:flex;flex-direction:column;padding:6px 10px}
.top{display:flex;align-items:center;justify-content:space-between;min-height:42px}
.back{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 16px 0 12px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:var(--ink);text-decoration:none;font-weight:500;font-size:14px;transition:background .15s}
.back:hover{background:rgba(255,255,255,.1)}
.center{flex:1;display:flex;align-items:center;justify-content:center;padding:16px 0}
.lg-card{width:100%;max-width:430px}
.brand{text-align:center;margin-bottom:22px}
.mark{width:84px;height:84px;margin:0 auto 14px;border-radius:26px;background:linear-gradient(145deg,#FFA23D,#FF7A00 60%,#E85F00);color:#fff;display:grid;place-items:center;box-shadow:0 18px 40px rgba(255,122,0,.45),inset 0 2px 0 rgba(255,255,255,.35)}
.brand h1{font-size:30px;line-height:1.1;font-weight:800}
.brand h1 i{font-style:normal;color:var(--brand)}
.welcome{margin:6px 0 0;color:var(--muted);font-size:14px}

.tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid var(--line);margin-bottom:12px}
.tab{height:46px;border:0;border-radius:12px;background:none;color:var(--muted);font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:background .2s,color .2s}
.tab:hover{color:var(--ink)}
.tab[aria-selected=true]{background:var(--brand);color:#1E1E1E;box-shadow:0 8px 20px rgba(255,122,0,.3)}
.tabdesc{margin:0 2px 20px;color:var(--muted);font-size:14px;min-height:42px}

/* Restaurante do acesso */

.field{margin-bottom:16px}
label{display:block;font-weight:500;font-size:14px;margin-bottom:7px;color:#D8D2C7}
.control{position:relative}
.lead-ic{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none;display:flex;transition:color .15s}
.control:focus-within .lead-ic{color:var(--brand)}
input{width:100%;height:56px;padding:0 16px 0 48px;font:inherit;color:var(--ink);background:var(--field);border:1.5px solid var(--line);border-radius:16px;transition:border-color .15s,box-shadow .15s}
input::placeholder{color:#6F695F}
input:hover{border-color:rgba(255,255,255,.22)}
input:focus-visible{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px rgba(255,122,0,.2)}
input[aria-invalid=true]{border-color:var(--danger)}
input.pw{padding-right:54px}
.toggle{position:absolute;right:7px;top:7px;width:42px;height:42px;border:0;border-radius:12px;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center}
.toggle:hover{color:var(--ink);background:rgba(255,255,255,.08)}
.hint{display:none;margin:7px 2px 0;font-size:13px;color:var(--muted)}
.hint.show{display:block}
.row{display:flex;justify-content:space-between;align-items:center;margin:2px 0 22px;font-size:14px;gap:12px;flex-wrap:wrap}
.link{color:var(--focus);font-weight:500;text-decoration:none;border:0;background:none;padding:0;cursor:pointer;border-radius:4px;font-size:inherit}
.link:hover{text-decoration:underline}
.btn{width:100%;height:58px;border:0;border-radius:16px;background:var(--brand);color:#1E1E1E !important;font:700 17px var(--fonte-texto),sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 14px 30px rgba(255,122,0,.35);transition:background .15s,transform .05s,box-shadow .15s}
.btn:hover{background:var(--brand-hover);box-shadow:0 18px 38px rgba(255,122,0,.45)}
.btn:active{transform:scale(.99)}
.btn[disabled]{opacity:.8;cursor:progress}
.btn.ghost{background:rgba(255,255,255,.07);color:var(--ink) !important;box-shadow:none;border:1px solid var(--line);height:52px;font-weight:600}
.btn.ghost:hover{background:rgba(255,255,255,.12);box-shadow:none}
.spin{width:18px;height:18px;border:2.5px solid rgba(30,30,30,.3);border-top-color:#1E1E1E;border-radius:50%;animation:s .7s linear infinite;display:none}
.btn[disabled] .spin{display:block}
@keyframes s{to{transform:rotate(360deg)}}
.msg{display:flex;align-items:center;gap:10px;margin:0 0 16px;padding:12px 14px;border-radius:14px;font-size:14px}
.msg.err{color:var(--danger);background:rgba(255,143,148,.1);border:1px solid rgba(255,143,148,.35)}
.msg.ok{color:var(--ok);background:rgba(93,219,168,.1);border:1px solid rgba(93,219,168,.35)}
.help{margin:22px 0 0;text-align:center;font-size:13px;color:var(--muted)}
.copy{text-align:center;font-size:13px;color:#7C766B}
a:focus-visible,button:focus-visible{outline:3px solid var(--focus);outline-offset:2px}

/* Crachá RFID */
.rfid{text-align:center;cursor:pointer}
.rfid-ic{width:76px;height:76px;margin:0 auto 14px;border-radius:24px;background:rgba(255,122,0,.14);color:var(--brand);border:1px solid rgba(255,122,0,.35);display:grid;place-items:center}
.rfid-ic.lendo{animation:pulso 1s ease-in-out infinite}
@keyframes pulso{50%{box-shadow:0 0 0 10px rgba(255,122,0,.15)}}
.rfid p{color:var(--muted);margin:0 0 20px}
.rfid-input{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}

/* Acesso bloqueado */
.blocked{text-align:center;padding:8px 0}
.blocked .lock{width:76px;height:76px;margin:0 auto 18px;border-radius:24px;background:rgba(255,143,148,.12);color:var(--danger);border:1px solid rgba(255,143,148,.35);display:grid;place-items:center}
.blocked h2{font-size:26px;margin-bottom:8px}
.blocked p{color:var(--muted);margin:0 0 24px}
.blocked .btn{margin-bottom:10px}

/* Recuperar senha */
dialog{border:1px solid var(--line);background:#1B1815;color:var(--ink);border-radius:26px;padding:28px;width:min(440px,calc(100% - 32px));box-shadow:0 40px 90px rgba(0,0,0,.6);font-family:var(--fonte-texto)}
dialog::backdrop{background:rgba(0,0,0,.62);backdrop-filter:blur(4px)}
dialog h2{font-size:24px;margin-bottom:6px}
dialog .sub{margin:0 0 20px;color:var(--muted);font-size:14px}
.dact{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-top:20px}
.dact .btn{height:52px;font-size:16px}

@media (max-width:980px){
  .page{grid-template-columns:1fr;padding:12px}
  .hero{display:none}
}
@media (max-width:520px){.back span{display:none}.back{padding:0 12px}}
@media (prefers-reduced-motion:reduce){.orb{animation:none}.spin{animation-duration:1.5s}.mod{transition:none}}
</style>
