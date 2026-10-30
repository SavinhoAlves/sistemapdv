<template>
  <div class="lg">
    <div class="page">
      <aside class="hero" aria-label="Apresentação do sistema">
        <a class="logo" :href="linkInicio">Restaurante<i>PDV</i></a>
        <div class="hero-mid">
          <h2>Do pedido ao pagamento, <i>tudo em um só lugar.</i></h2>
          <ul class="mods">
            <li><strong>Mesas e comandas</strong><p>Abra, junte e transfira mesas.</p></li>
            <li><strong>Cozinha</strong><p>Pedidos na tela ou na impressora.</p></li>
            <li><strong>Caixa</strong><p>Dinheiro, cartão e Pix.</p></li>
            <li><strong>Delivery</strong><p>Entregas e cardápio digital.</p></li>
          </ul>
        </div>
        <span class="copy">© Restaurante PDV · Sistema PDV para restaurante</span>
      </aside>

      <div class="side">
        <div class="top">
          <!-- O site de apresentação fica no domínio principal (restaurantepdv.com.br) -->
          <a class="back" :href="linkInicio"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg><span>Voltar ao início</span></a>
          <a class="logo logo-sm" :href="linkInicio">Restaurante<i>PDV</i></a>
        </div>

        <main class="center">
          <div class="lg-card">
            <div v-if="!bloqueio">
              <div class="head">
                <span class="hello">{{ saudacao }}</span>
                <h1>{{ PERFIL[perfil].titulo }}</h1>
                <p>{{ PERFIL[perfil].desc }}</p>
              </div>

              <p v-if="msg.text" class="msg" :class="msg.type === 'error' ? 'err' : 'ok'" :role="msg.type === 'error' ? 'alert' : 'status'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.1" /></svg>
                {{ msg.text }}
              </p>

              <!-- Crachá RFID: recurso de plano, só aparece quando liberado -->
              <div v-if="perfil === 'cli' && modo === 'rfid'" class="rfid-wrap">
                <div class="rfid" @click="focusRfid">
                  <div class="rfid-ic" :class="{ lendo: rfidReading }">
                    <span class="anel" aria-hidden="true" />
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 14h4" /><path d="M14 9.5a3.5 3.5 0 0 1 0 5" /><path d="M17 8a6 6 0 0 1 0 8" /></svg>
                  </div>
                  <div class="rfid-txt">
                    <strong>Encoste o crachá no leitor</strong>
                    <span>{{ rfidReading ? 'Lendo o crachá…' : 'Aguardando leitura…' }}</span>
                  </div>
                  <input ref="rfidInputRef" v-model="rfidBuffer" class="rfid-input" type="password" autocomplete="off" aria-label="Leitura do crachá" @input="onRfidInput" @keydown.enter.prevent="onRfidEnter">
                </div>
                <button type="button" class="btn ghost" @click="setModo('manual')">Entrar com usuário e senha</button>
              </div>

              <form v-else novalidate @submit.prevent="entrar">
                <div class="field">
                  <label for="user">{{ PERFIL[perfil].label }}</label>
                  <input id="user" ref="emailRef" v-model="form.email" name="user" :type="perfil === 'ges' ? 'email' : 'text'" autocapitalize="none" spellcheck="false" autocomplete="username" :placeholder="PERFIL[perfil].ph" :aria-invalid="invalido === 'email'">
                </div>
                <div class="field">
                  <label for="pass">Senha</label>
                  <div class="control">
                    <input id="pass" ref="senhaRef" v-model="form.senha" class="pw" name="pass" :type="showPass ? 'text' : 'password'" autocomplete="current-password" placeholder="Sua senha" :aria-invalid="invalido === 'senha'" @keyup="verificarCaps" @blur="capsLock = false">
                    <button type="button" class="toggle" :aria-label="showPass ? 'Ocultar senha' : 'Mostrar senha'" :aria-pressed="showPass" @click="showPass = !showPass">
                      <svg v-if="!showPass" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" /><circle cx="12" cy="12" r="3" /></svg>
                      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18M10.6 6.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.5 7.6A17 17 0 0 0 2 12s3.5 7 10 7c1.6 0 3-.3 4.3-.9" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
                    </button>
                  </div>
                  <p class="hint" :class="{ show: capsLock }">Caps Lock está ativado.</p>
                </div>
                <button type="button" class="link forgot" @click="abrirRecuperar">Esqueci minha senha</button>
                <button class="btn" type="submit" :disabled="loading"><span class="spin" /><span>{{ loading ? 'Entrando…' : PERFIL[perfil].btn }}</span></button>
                <button v-if="rfidAtivo && perfil === 'cli'" type="button" class="link sub-act" @click="setModo('rfid')">Usar crachá</button>
                <!-- Rosto ou digital do próprio aparelho (passkey): sem digitar usuário nem senha -->
                <template v-if="bioDisponivel && perfil === 'cli'">
                  <div class="ou" aria-hidden="true"><span>ou</span></div>
                  <button type="button" class="btn ghost bio" :disabled="entrandoBio" @click="entrarComBiometria">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01M15 9h.01" /></svg>
                    {{ entrandoBio ? 'Confirmando…' : 'Entrar com rosto ou digital' }}
                  </button>
                </template>
              </form>
              <NuxtLink v-if="app" to="/acesso" class="link sub-act">Entrar lendo o QR code</NuxtLink>
              <p class="help">{{ PERFIL[perfil].help }}</p>
            </div>

            <div v-else class="blocked" role="alert">
              <div class="lock"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></div>
              <span class="hello">Não foi possível entrar</span>
              <h1>Acesso bloqueado</h1>
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
import { AVISO_INATIVIDADE } from '~/lib/inatividade'
import { noApp, destinoNoCelular } from '~/lib/app'
import { ehApp, ehPainel, urlDoHost } from '~/lib/hosts'
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useApi } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import { setTenantSlug } from '~/composables/useTenantSlug'
import { terminalLocal } from '~/composables/useTerminalLocal'
import { biometriaSuportada, biometriaDoAparelho, lembrarBiometria, recusouBiometria, usarBiometria, ofertaBiometria } from '~/lib/biometria'
import { semLeitorDeCartao as ehCelular } from '~/lib/identificacao'

definePageMeta({ layout: false })

const authStore    = useAuthStore()
const platformAuth = usePlatformAuthStore()
const route        = useRoute()
const runtimeConfig = useRuntimeConfig()
const api          = useApi()

// ── Perfis: Cliente = restaurante, Gestor = plataforma (?acesso=plataforma) ──
type Perfil = 'cli' | 'ges'
const PERFIL = {
  cli: { titulo: 'Entre na sua conta', desc: 'Acesse o sistema do seu restaurante: caixa, mesas e cozinha.', label: 'Código ou usuário', ph: 'Ex.: 1001-1 ou joao', btn: 'Entrar', help: 'Problemas para acessar? Fale com o gerente da loja.' },
  ges: { titulo: 'Entrar no painel', desc: 'Acesso ao painel da plataforma: restaurantes, cobrança, planos e demonstrações.', label: 'E-mail', ph: 'admin@restaurantepdv.com.br', btn: 'Entrar no painel', help: 'Problemas para acessar? Fale com outro administrador.' },
}
// Sem abas: painel.<domínio> (ou ?acesso=plataforma) é o login do Gestor; o resto é do restaurante
const perfil = ref<Perfil>(ehPainel() || route.query.acesso === 'plataforma' ? 'ges' : 'cli')
const linkInicio = (ehApp() || ehPainel()) ? urlDoHost('', '/') : '/'

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

// ── Crachá: só nos terminais em que o administrador liberou ──────────────
// O restaurante vem do terminal (Admin › Terminais), nunca do que ficou salvo no aparelho.
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

// ── Rosto ou digital do aparelho (passkey) ─────────────────────────────────
// Só no celular (mesma regra do PIN e do Face ID de confirmação): no computador
// do caixa entra com senha ou crachá. O app da equipe (WebView) não tem passkey:
// lá segue QR ou senha
const bioDisponivel = ref(false)
const entrandoBio = ref(false)

async function entrarComBiometria() {
  hideMsg()
  entrandoBio.value = true
  const base = (runtimeConfig.public as any).apiUrl as string
  try {
    const { desafioId, ...opcoes } = await $fetch<any>(`${base}/api/auth/biometria/login/opcoes`, { method: 'POST', body: {} })
    const resposta = await usarBiometria(opcoes)
    const res: any = await $fetch(`${base}/api/auth/biometria/login`, { method: 'POST', body: { desafioId, resposta } })
    lembrarBiometria(res.usuario.id, resposta.id)
    concluirLogin(res, res.tenant?.slug ?? '', `Bem-vindo, ${res.usuario.nome}!`)
  } catch (e: any) {
    if (e?.name === 'NotAllowedError' || e?.name === 'AbortError') {
      showMsg('error', 'Biometria não confirmada. Tente de novo ou entre com usuário e senha.')
    } else {
      const texto = e?.data?.error || e?.message || 'Não foi possível entrar com a biometria.'
      if (/suspenso/i.test(texto)) { bloqueio.value = 'Este restaurante está suspenso. Entre em contato para regularizar o acesso.'; return }
      showMsg('error', texto)
    }
  } finally {
    entrandoBio.value = false
  }
}

/** Depois da senha: oferece ativar o rosto/digital deste aparelho para a próxima vez */
async function oferecerBiometria(usuarioId: string) {
  if (app || !ehCelular() || biometriaDoAparelho(usuarioId) || recusouBiometria(usuarioId)) return
  if (await biometriaSuportada()) ofertaBiometria.value = true
}

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
  if (!slug) return
  rfidReading.value = true
  hideMsg()
  try {
    const res: any = await api.auth.rfid(cartao_rfid)
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
    if (concluirLogin(res, res.tenant?.slug ?? '', 'Acesso autorizado!')) oferecerBiometria(res.usuario.id)
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
  // Saída automática por 8h sem uso (plugins/inatividade.client.ts): avisa no fim,
  // depois que a escolha do modo (crachá ou senha) já limpou as mensagens
  let saiuPorInatividade = false
  try {
    saiuPorInatividade = !!sessionStorage.getItem(AVISO_INATIVIDADE)
    sessionStorage.removeItem(AVISO_INATIVIDADE)
  } catch { /* sem armazenamento: sem aviso */ }
  if (perfil.value === 'ges') {
    platformAuth.restore()
    if (platformAuth.isAuthenticated) return navigateTo('/platform')
  } else {
    authStore.restoreSession()
    if (authStore.isAuthenticated) return navigateTo(noApp() ? destinoNoCelular(authStore.usuario?.cargo) : '/')
  }

  // Crachá aparece só se este aparelho é um terminal com crachá liberado
  // (e o plano do restaurante inclui o crachá: carregarConfig)
  if (perfil.value === 'cli') {
    const t = await terminalLocal()
    slugAtual.value = t?.cracha && t.slug ? t.slug : ''
  }
  await carregarConfig()
  if (rfidAtivo.value && perfil.value === 'cli') setModo('rfid')
  else nextTick(() => emailRef.value?.focus())
  if (saiuPorInatividade) showMsg('error', 'Sua sessão foi encerrada após 8 horas sem uso. Entre novamente.')
  if (perfil.value === 'cli' && !app && ehCelular()) bioDisponivel.value = await biometriaSuportada()
})

onUnmounted(() => {
  if (rfidTimer) clearTimeout(rfidTimer)
})
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   Login — visual "caloroso": creme e laranja, cantos arredondados.
   Fonte da marca (auto-hospedada, ver tokens.css); sempre claro.
   ═══════════════════════════════════════════════════════════════════════════ */
.lg {
  --bg:#FBF6EF; --panel:#F4E7D6; --card:#FFFFFF; --ink:#1F1A15; --muted:#6B5D50; --line:#EADFCE; --line-2:#E3D6C3;
  --brand:#F07A12; --brand-hover:#E2680A; --brand-text:#B4500A; --tint:#FDEBD8; --danger:#B42318; --ok:#12805C;
  min-height:100vh; background:var(--bg); color:var(--ink); color-scheme:light;
  font:400 16px/1.5 var(--fonte-texto),system-ui,sans-serif; -webkit-font-smoothing:antialiased; overflow-x:hidden;
  padding-top:env(safe-area-inset-top,0px); padding-bottom:env(safe-area-inset-bottom,0px);
}
.lg *,.lg *::before,.lg *::after{box-sizing:border-box}
.lg h1,.lg h2,.lg h3{font-family:var(--fonte-texto);margin:0}
.lg :where(button){font:inherit;color:inherit}

.page{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px}

/* Painel de apresentação */
.hero{background:var(--panel);border-radius:28px;padding:clamp(28px,4vw,52px);display:flex;flex-direction:column;justify-content:space-between;gap:48px}
.logo{align-self:flex-start;font-weight:800;font-size:20px;letter-spacing:-.02em;color:var(--ink);text-decoration:none}
.logo i{font-style:normal;color:var(--brand-hover)}
.hero-mid{display:flex;flex-direction:column;gap:36px;max-width:500px}
.hero h2{font-size:clamp(36px,4vw,58px);line-height:1;font-weight:800;letter-spacing:-.045em;text-wrap:balance}
.hero h2 i{font-style:normal;color:var(--brand-text)}
.mods{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.mods li{background:var(--bg);border-radius:18px;padding:18px}
.mods strong{display:block;font-size:15px;font-weight:600}
.mods p{margin:4px 0 0;font-size:13.5px;line-height:1.4;color:var(--muted)}
.copy{font-size:13px;color:var(--muted)}

/* Coluna do formulário */
.side{display:flex;flex-direction:column;padding:clamp(12px,3vw,36px);gap:24px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:40px}
.back{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px 0 10px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);text-decoration:none;font-weight:500;font-size:14px;transition:background .15s}
.back:hover{background:#F7EFE4}
.logo-sm{display:none}
.center{flex:1;display:flex;align-items:center;justify-content:center}
.lg-card{width:100%;max-width:380px}

.head{display:flex;flex-direction:column;gap:8px;margin-bottom:28px}
.hello{font-size:14px;font-weight:600;color:var(--brand-text)}
.lg-card h1{font-size:34px;line-height:1.05;font-weight:800;letter-spacing:-.04em}
.head p{margin:0;font-size:15px;color:var(--muted)}

/* Crachá RFID */
.rfid-wrap{display:flex;flex-direction:column;gap:14px}
.rfid{position:relative;display:flex;align-items:center;gap:16px;padding:20px;border-radius:20px;background:var(--card);border:1px solid var(--line);cursor:pointer}
.rfid-ic{position:relative;width:52px;height:52px;flex:none;border-radius:16px;background:var(--tint);color:var(--brand-text);display:grid;place-items:center}
.anel{position:absolute;inset:0;border-radius:16px;border:2px solid var(--brand);animation:ring 1.8s ease-out infinite}
.rfid-ic.lendo .anel{animation-duration:.8s}
@keyframes ring{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.6);opacity:0}}
.rfid-txt{display:flex;flex-direction:column;gap:2px}
.rfid-txt strong{font-size:15px;font-weight:600}
.rfid-txt span{font-size:13.5px;color:var(--muted)}
.rfid .rfid-input{position:absolute;left:0;top:0;opacity:0;width:1px;height:1px;min-height:0;padding:0;border:0;box-shadow:none;pointer-events:none}

/* Formulário */
form{display:flex;flex-direction:column}
.field{margin-bottom:14px}
label{display:block;font-weight:500;font-size:13.5px;margin-bottom:6px;color:var(--ink)}
.control{position:relative}
input{width:100%;min-height:52px;padding:0 16px;font:400 16px var(--fonte-texto),sans-serif;color:var(--ink);background:var(--card);border:1px solid var(--line-2);border-radius:14px;transition:border-color .15s,box-shadow .15s}
input::placeholder{color:#9C8E80}
input:hover{border-color:#D6C5AE}
input:focus-visible{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px rgba(240,122,18,.15)}
input[aria-invalid=true]{border-color:var(--danger)}
input.pw{padding-right:52px}
.toggle{position:absolute;right:6px;top:6px;width:40px;height:40px;border:0;border-radius:10px;background:transparent;color:var(--muted);cursor:pointer;display:grid;place-items:center}
.toggle:hover{color:var(--ink);background:var(--panel)}
.hint{display:none;margin:6px 2px 0;font-size:13px;color:var(--muted)}
.hint.show{display:block}
.link{color:var(--brand-text);font-weight:600;text-decoration:none;border:0;background:none;padding:0;cursor:pointer;border-radius:6px;font-size:14px}
.link:hover{text-decoration:underline}
.forgot{align-self:flex-end;margin:-2px 0 6px}
.ou{display:flex;align-items:center;gap:12px;margin:16px 0 4px;color:var(--muted);font-size:13px}
.ou::before,.ou::after{content:'';flex:1;height:1px;background:var(--line)}
.btn.bio{gap:10px}
.sub-act{display:block;align-self:center;margin:10px auto 0;min-height:40px;padding:0 12px;color:var(--muted);font-weight:500;text-align:center;line-height:40px}
.sub-act:hover{color:var(--ink);text-decoration:none}
.btn{width:100%;min-height:52px;margin-top:6px;border:0;border-radius:14px;background:var(--brand);color:var(--ink) !important;font:600 15px var(--fonte-texto),sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:background .15s,transform .05s}
.btn:hover{background:var(--brand-hover)}
.btn:active{transform:scale(.99)}
.btn[disabled]{opacity:.75;cursor:progress}
.btn.ghost{margin-top:0;background:transparent;border:1px solid var(--line)}
.btn.ghost:hover{background:var(--panel)}
.spin{width:18px;height:18px;border:2.5px solid rgba(31,26,21,.25);border-top-color:var(--ink);border-radius:50%;animation:s .7s linear infinite;display:none}
.btn[disabled] .spin{display:block}
@keyframes s{to{transform:rotate(360deg)}}
.msg{display:flex;align-items:center;gap:10px;margin:0 0 16px;padding:12px 14px;border-radius:14px;font-size:14px}
.msg.err{color:var(--danger);background:#FDECEC;border:1px solid #F3B9BC}
.msg.ok{color:var(--ok);background:#E7F6EF;border:1px solid #A6DCC4}
.help{margin:24px 0 0;text-align:center;font-size:13.5px;color:var(--muted)}
a:focus-visible,button:focus-visible{outline:2px solid var(--brand);outline-offset:2px}

/* Acesso bloqueado */
.blocked{display:flex;flex-direction:column;gap:8px}
.blocked .lock{width:52px;height:52px;margin-bottom:12px;border-radius:16px;background:#FDECEC;color:var(--danger);display:grid;place-items:center}
.blocked .hello{color:var(--danger)}
.blocked p{color:var(--muted);margin:0 0 18px;font-size:15px}
.blocked .btn{margin-top:0}

/* Recuperar senha */
dialog{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:22px;padding:28px;width:min(440px,calc(100% - 32px));box-shadow:0 40px 90px rgba(31,26,21,.25);font-family:var(--fonte-texto)}
dialog::backdrop{background:rgba(31,26,21,.45);backdrop-filter:blur(4px)}
dialog h2{font-size:24px;letter-spacing:-.03em;margin-bottom:6px}
dialog .sub{margin:0 0 20px;color:var(--muted);font-size:14px}
.dact{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-top:20px}

/* Tela estreita: o painel some e o formulário vem primeiro (celular da equipe) */
@media (max-width:980px){
  .page{grid-template-columns:1fr;padding:0}
  .hero{display:none}
  .logo-sm{display:block;font-size:18px}
}
@media (max-width:520px){.side{padding:14px 16px 20px}.lg-card h1{font-size:30px}}
@media (prefers-reduced-motion:reduce){.anel{animation:none;opacity:0}.spin{animation-duration:1.5s}}
</style>
