<template>
  <div class="lg">
    <div class="page">
      <aside class="hero" aria-label="Apresentação do sistema">
        <a class="logo" :href="linkInicio">Restaurante<i>PDV</i></a>
        <div class="hero-mid">
          <h2>Do pedido ao pagamento, <i>tudo em um só lugar.</i></h2>
          <ol class="mods">
            <li><span>01</span><div><strong>Mesas e comandas</strong><p>Abra, junte e transfira mesas.</p></div></li>
            <li><span>02</span><div><strong>Cozinha</strong><p>Pedidos na tela ou na impressora.</p></div></li>
            <li><span>03</span><div><strong>Caixa</strong><p>Dinheiro, cartão e Pix.</p></div></li>
            <li><span>04</span><div><strong>Delivery</strong><p>Entregas e cardápio digital.</p></div></li>
          </ol>
        </div>
        <span class="copy">© Restaurante PDV · Sistema PDV para restaurante</span>
      </aside>

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
   Login — claro, no mesmo estilo do site (restaurantepdv.com.br).
   Cores e fontes da marca (frontend/design/marca.cjs).
   ═══════════════════════════════════════════════════════════════════════════ */
.lg {
  --bg:#F6F7F9; --card:#FFFFFF; --ink:#0E1119; --muted:#4A5567; --soft:#6B7688; --line:#DDE3EC; --line-2:#C3CCDA;
  --field:#FFFFFF; --brand:#FF7A00; --brand-hover:#E06A00; --brand-text:#B85500; --danger:#C0262D; --focus:#E06A00; --ok:#12805C;
  --tint:#FFF4E5; --tint-line:#FFCC8F;
  min-height:100vh; background:var(--bg); color:var(--ink); color-scheme:light;
  font:400 16px/1.5 var(--fonte-texto),system-ui,sans-serif; -webkit-font-smoothing:antialiased; overflow-x:hidden;
  padding-top:env(safe-area-inset-top,0px); padding-bottom:env(safe-area-inset-bottom,0px);
}
.lg *,.lg *::before,.lg *::after{box-sizing:border-box}
.lg h1,.lg h2,.lg h3{font-family:var(--fonte-texto);letter-spacing:-.03em;margin:0}
.lg :where(button){font:inherit;color:inherit}

.page{min-height:100vh;display:grid;grid-template-columns:1fr 1fr}

/* Painel de apresentação */
.hero{background:var(--tint);border-right:1px solid var(--tint-line);padding:clamp(28px,4vw,48px);display:flex;flex-direction:column;justify-content:space-between;gap:48px}
.logo{align-self:flex-start;font-weight:800;font-size:21px;letter-spacing:-.02em;color:var(--ink);text-decoration:none}
.logo i{color:var(--brand-text)}
.hero-mid{display:flex;flex-direction:column;gap:32px;max-width:500px}
.hero h2{font-size:clamp(34px,4.2vw,54px);line-height:1;font-weight:800;letter-spacing:-.04em;text-wrap:balance}
.hero h2 i{font-style:normal;color:var(--brand-text)}
.mods{list-style:none;margin:0;padding:0;border-top:1px solid var(--tint-line)}
.mods li{display:grid;grid-template-columns:40px minmax(0,1fr);gap:12px;padding:16px 0;border-bottom:1px solid var(--tint-line)}
.mods span{font:600 13px var(--fonte-numero),monospace;color:var(--brand-text);padding-top:2px}
.mods strong{font-size:16px;font-weight:600}
.mods p{margin:2px 0 0;font-size:14px;color:var(--muted)}
.copy{font-size:13px;color:var(--soft)}

/* Coluna do formulário */
.side{display:flex;flex-direction:column;padding:20px 24px 24px}
.top{display:flex;align-items:center;justify-content:space-between;min-height:42px}
.back{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 16px 0 12px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);text-decoration:none;font-weight:600;font-size:14px;transition:background .15s}
.back:hover{background:#EEF1F6}
.center{flex:1;display:flex;align-items:center;justify-content:center;padding:16px 0}
.lg-card{width:100%;max-width:430px}
.brand{text-align:center;margin-bottom:22px}
.mark{width:80px;height:80px;margin:0 auto 14px;border-radius:22px;background:var(--brand);color:var(--ink);display:grid;place-items:center;box-shadow:0 14px 30px -12px rgba(184,85,0,.6)}
.brand h1{font-size:30px;line-height:1.1;font-weight:800}
.brand h1 i{font-style:normal;color:var(--brand-text)}
.welcome{margin:6px 0 0;color:var(--muted);font-size:15px}

.tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:16px;background:#EEF1F6;border:1px solid var(--line);margin-bottom:12px}
.tab{height:48px;border:0;border-radius:12px;background:none;color:var(--muted);font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;transition:background .2s,color .2s}
.tab:hover{color:var(--ink)}
.tab[aria-selected=true]{background:var(--brand);color:var(--ink)}
.tabdesc{margin:0 2px 20px;color:var(--muted);font-size:15px;min-height:44px}

.field{margin-bottom:18px}
label{display:block;font-weight:600;font-size:15px;margin-bottom:8px;color:var(--ink)}
.control{position:relative}
.lead-ic{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--soft);pointer-events:none;display:flex;transition:color .15s}
.control:focus-within .lead-ic{color:var(--brand-text)}
input{width:100%;height:56px;padding:0 16px 0 48px;font:500 16px var(--fonte-texto),sans-serif;color:var(--ink);background:var(--field);border:1px solid var(--line-2);border-radius:14px;transition:border-color .15s,box-shadow .15s}
input::placeholder{color:#8F98A8;font-weight:400}
input:hover{border-color:#A9B3C6}
input:focus-visible{outline:none;border-color:var(--brand);box-shadow:0 0 0 3px rgba(255,122,0,.22)}
input[aria-invalid=true]{border-color:var(--danger)}
input.pw{padding-right:56px}
.toggle{position:absolute;right:6px;top:6px;width:44px;height:44px;border:0;border-radius:10px;background:transparent;color:var(--soft);cursor:pointer;display:grid;place-items:center}
.toggle:hover{color:var(--ink);background:#EEF1F6}
.hint{display:none;margin:7px 2px 0;font-size:13px;color:var(--muted)}
.hint.show{display:block}
.row{display:flex;justify-content:space-between;align-items:center;margin:2px 0 22px;font-size:15px;gap:12px;flex-wrap:wrap}
.link{color:var(--brand-text);font-weight:600;text-decoration:none;border:0;background:none;padding:0;cursor:pointer;border-radius:4px;font-size:inherit}
.link:hover{text-decoration:underline}
.btn{width:100%;height:58px;border:0;border-radius:14px;background:var(--brand);color:var(--ink) !important;font:700 17px var(--fonte-texto),sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;box-shadow:0 14px 28px -14px rgba(184,85,0,.7);transition:background .15s,transform .05s}
.btn:hover{background:var(--brand-hover)}
.btn:active{transform:scale(.99)}
.btn[disabled]{opacity:.75;cursor:progress}
.btn.ghost{background:var(--card);color:var(--ink) !important;box-shadow:none;border:1px solid var(--line-2);height:52px;font-weight:600}
.btn.ghost:hover{background:#EEF1F6}
.spin{width:18px;height:18px;border:2.5px solid rgba(14,17,25,.25);border-top-color:var(--ink);border-radius:50%;animation:s .7s linear infinite;display:none}
.btn[disabled] .spin{display:block}
@keyframes s{to{transform:rotate(360deg)}}
.msg{display:flex;align-items:center;gap:10px;margin:0 0 16px;padding:12px 14px;border-radius:14px;font-size:14px}
.msg.err{color:var(--danger);background:#FDECEC;border:1px solid #F3B9BC}
.msg.ok{color:var(--ok);background:#E7F6EF;border:1px solid #A6DCC4}
.help{margin:22px 0 0;text-align:center;font-size:14px;color:var(--soft)}
a:focus-visible,button:focus-visible{outline:2px solid var(--focus);outline-offset:2px}

/* Crachá RFID */
.rfid{text-align:center;cursor:pointer}
.rfid-ic{width:76px;height:76px;margin:0 auto 14px;border-radius:22px;background:var(--tint);color:var(--brand-text);border:1px solid var(--tint-line);display:grid;place-items:center}
.rfid-ic.lendo{animation:pulso 1s ease-in-out infinite}
@keyframes pulso{50%{box-shadow:0 0 0 10px rgba(255,122,0,.15)}}
.rfid p{color:var(--muted);margin:0 0 20px}
.rfid-input{position:absolute;opacity:0;width:1px;height:1px;pointer-events:none}

/* Acesso bloqueado */
.blocked{text-align:center;padding:8px 0}
.blocked .lock{width:76px;height:76px;margin:0 auto 18px;border-radius:22px;background:#FDECEC;color:var(--danger);border:1px solid #F3B9BC;display:grid;place-items:center}
.blocked h2{font-size:26px;margin-bottom:8px}
.blocked p{color:var(--muted);margin:0 0 24px}
.blocked .btn{margin-bottom:10px}

/* Recuperar senha */
dialog{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:22px;padding:28px;width:min(440px,calc(100% - 32px));box-shadow:0 40px 90px rgba(14,17,25,.25);font-family:var(--fonte-texto)}
dialog::backdrop{background:rgba(14,17,25,.45);backdrop-filter:blur(4px)}
dialog h2{font-size:24px;margin-bottom:6px}
dialog .sub{margin:0 0 20px;color:var(--muted);font-size:14px}
.dact{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-top:20px}
.dact .btn{height:52px;font-size:16px}

@media (max-width:980px){
  .page{grid-template-columns:1fr}
  .hero{display:none}
}
@media (max-width:520px){.back span{display:none}.back{padding:0 12px}.side{padding:14px 16px 20px}}
@media (prefers-reduced-motion:reduce){.spin{animation-duration:1.5s}}
</style>
