<template>
  <div class="eq acs">
    <!-- Início: QR ou código e senha -->
    <main v-if="passo === 'inicio'" class="acs-tela">
      <div class="acs-luz" aria-hidden="true" />
      <div class="acs-topo">
        <span class="eq-logo" style="width:52px;height:52px"><UtensilsCrossed :size="26" :stroke-width="2.2" /></span>
        <span class="eq-rotulo">App da equipe</span>
      </div>

      <div class="acs-marca">
        <h1 class="eq-titulo">Restaurante<br><span>PDV</span></h1>
        <p>App da equipe: garçons e entregadores</p>
      </div>

      <div class="acs-cargos">
        <div class="eq-cartao acs-cargo">
          <span class="acs-cargo-ic"><LayoutGrid :size="18" /></span>
          <strong>Garçom</strong>
          <span>Entra com o caixa aberto</span>
        </div>
        <div class="eq-cartao acs-cargo">
          <span class="acs-cargo-ic"><Bike :size="18" /></span>
          <strong>Entregador</strong>
          <span>Quando o restaurante tem delivery</span>
        </div>
      </div>

      <div class="acs-flex" />

      <p v-if="erro" class="eq-aviso eq-aviso-erro acs-erro" role="alert">{{ erro }}</p>

      <div class="acs-acoes">
        <button class="eq-btn eq-btn-primario" @click="abrirLeitor">
          <ScanLine :size="22" />
          <span class="flex-1">Ler QR code</span>
          <span class="eq-btn-seta"><ArrowRight :size="20" /></span>
        </button>
        <button class="eq-btn eq-btn-secundario" @click="irPara('codigo')">
          <KeyRound :size="20" />
          <span>Entrar com código e senha</span>
        </button>
      </div>
      <p class="acs-nota">O QR é gerado no computador do restaurante, em <span>Configurações › Acesso</span>.</p>
    </main>

    <!-- Passo 1: quem é -->
    <form v-else-if="passo === 'codigo'" class="acs-tela" novalidate @submit.prevent="continuar">
      <button type="button" class="eq-icone acs-voltar" aria-label="Voltar" @click="irPara('inicio')"><ChevronLeft :size="22" /></button>
      <p class="eq-rotulo eq-rotulo-marca acs-passo">Passo 1 de 2</p>
      <h2 class="eq-titulo acs-h2">Quem é você?</h2>
      <p class="acs-sub">Use o código que o gerente cadastrou para você.</p>

      <label class="eq-campo" :data-invalido="!!erro">
        <span>Seu código ou usuário</span>
        <input ref="codigoRef" v-model="form.codigo" name="user" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="1001-1" enterkeyhint="next">
      </label>
      <p v-if="erro" class="acs-erro-campo" role="alert">{{ erro }}</p>

      <div class="acs-flex" />
      <button type="submit" class="eq-btn eq-btn-primario">
        <span class="flex-1">Continuar</span>
        <span class="eq-btn-seta"><ArrowRight :size="20" /></span>
      </button>
    </form>

    <!-- Passo 2: senha -->
    <form v-else-if="passo === 'senha'" class="acs-tela" novalidate @submit.prevent="entrar">
      <button type="button" class="eq-icone acs-voltar" aria-label="Voltar" @click="irPara('codigo')"><ChevronLeft :size="22" /></button>
      <p class="eq-rotulo eq-rotulo-marca acs-passo">Passo 2 de 2</p>
      <h2 class="eq-titulo acs-h2">Sua senha</h2>
      <p class="acs-sub">Entrando como <b class="eq-mono">{{ form.codigo.trim() }}</b>.</p>

      <!-- O usuário vai junto (escondido) para o gerenciador de senhas do celular -->
      <input type="text" name="user" autocomplete="username" :value="form.codigo.trim()" class="sr-only" tabindex="-1" aria-hidden="true" readonly>
      <label class="eq-campo acs-senha" :data-invalido="!!erro">
        <span>Senha</span>
        <span class="acs-senha-linha">
          <input ref="senhaRef" v-model="form.senha" name="pass" :type="verSenha ? 'text' : 'password'" autocomplete="current-password" placeholder="••••" enterkeyhint="go">
          <button type="button" class="acs-olho" :aria-label="verSenha ? 'Ocultar senha' : 'Mostrar senha'" :aria-pressed="verSenha" @click="verSenha = !verSenha">
            <EyeOff v-if="verSenha" :size="20" /><Eye v-else :size="20" />
          </button>
        </span>
      </label>
      <p v-if="erro" class="acs-erro-campo" role="alert">{{ erro }}</p>
      <p class="acs-nota acs-nota-senha">Esqueceu a senha? O gerente cria uma nova em Configurações › Usuários.</p>

      <div class="acs-flex" />
      <button type="submit" class="eq-btn eq-btn-primario" :disabled="entrando">
        <span class="flex-1">{{ entrando ? 'Entrando…' : 'Entrar' }}</span>
        <span class="eq-btn-seta"><Loader2 v-if="entrando" :size="20" class="animate-spin" /><ArrowRight v-else :size="20" /></span>
      </button>
    </form>

    <!-- Leitor de QR (câmera da página, quando o app não tem o leitor nativo) -->
    <Teleport to="body">
      <div v-if="lendo" class="eq acs-leitor">
        <video ref="video" class="acs-video" playsinline muted />
        <div class="acs-leitor-topo">
          <span class="eq-rotulo">Ler QR code</span>
          <button class="eq-icone" aria-label="Fechar" @click="fecharLeitor"><X :size="22" /></button>
        </div>
        <div class="acs-mira" aria-hidden="true">
          <i class="c1" /><i class="c2" /><i class="c3" /><i class="c4" />
          <span class="acs-varre" />
        </div>
        <div class="acs-leitor-pe">
          <p role="status">{{ estadoLeitor }}</p>
          <button class="eq-btn eq-btn-secundario" @click="fecharLeitor(); irPara('codigo')">
            <KeyRound :size="20" /><span>Entrar com código e senha</span>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, onUnmounted } from 'vue'
import { UtensilsCrossed, ScanLine, KeyRound, ArrowRight, ChevronLeft, X, LayoutGrid, Bike, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/services/api'
import { setTenantSlug } from '~/composables/useTenantSlug'
import { registerPlugin } from '@capacitor/core'
import { tokenDoQr, destinoNoCelular, noApp } from '~/lib/app'

definePageMeta({ layout: false })
useHead({ meta: [{ name: 'theme-color', content: '#0A0A0B' }] })

const authStore = useAuthStore()
const api = useApi()
const erro = ref('')
const lendo = ref(false)
const estadoLeitor = ref('Aponte a câmera para o QR em Configurações › Acesso, no computador do restaurante.')
const video = ref<HTMLVideoElement | null>(null)

// ── Código e senha (antes ia para /login?app=1, que é a tela do computador) ──
type Passo = 'inicio' | 'codigo' | 'senha'
const passo = ref<Passo>('inicio')
const form = reactive({ codigo: '', senha: '' })
const verSenha = ref(false)
const entrando = ref(false)
const codigoRef = ref<HTMLInputElement>()
const senhaRef = ref<HTMLInputElement>()

function irPara(p: Passo) {
  erro.value = ''
  passo.value = p
  if (p === 'codigo') nextTick(() => codigoRef.value?.focus())
  if (p === 'senha') { form.senha = ''; nextTick(() => senhaRef.value?.focus()) }
}

function continuar() {
  if (!form.codigo.trim()) { erro.value = 'Informe seu código ou nome de usuário.'; return }
  irPara('senha')
}

async function entrar() {
  if (entrando.value) return
  if (!form.senha) { erro.value = 'Informe sua senha.'; return }
  erro.value = ''
  entrando.value = true
  try {
    const res: any = await api.auth.login(form.codigo.trim(), form.senha)
    const raw = res.usuario
    const token = res.accessToken ?? res.access_token
    if (!token || !raw) throw new Error('Resposta inválida do servidor.')
    setTenantSlug(res.tenant?.slug ?? '')
    authStore.setAuth(token, { id: raw.id, nome: raw.nome, cargo: raw.cargo, perfil_id: raw.perfilId ?? null, permissoes: raw.permissoes ?? null }, res.refreshToken ?? res.refresh_token)
    // Entregador vai direto às entregas; os demais passam por /m, que confere
    // se a venda pelo celular está liberada e o caixa aberto
    navigateTo(raw.cargo === 'entregador' ? '/entregador' : { path: '/m', query: { t: token } })
  } catch (e: any) {
    const texto = e?.message || e?.data?.error || 'Falha ao conectar com o servidor.'
    erro.value = /suspenso/i.test(texto)
      ? 'Este restaurante está suspenso. Fale com o gerente.'
      : texto === 'Sessão expirada' || texto === 'Credenciais inválidas' ? 'Código ou senha incorretos.' : texto
    form.senha = ''
    nextTick(() => senhaRef.value?.focus())
  } finally {
    entrando.value = false
  }
}

// ── Leitor de QR ────────────────────────────────────────────────────────────
let fluxo: MediaStream | null = null
let quadro = 0
let tela: HTMLCanvasElement | null = null

// Leitor nativo do Google (app 1.2+): abre a câmera fora da página, sem pedir
// permissão no WebView. Apps antigos não têm o plugin e caem no leitor da página.
const LeitorNativo = registerPlugin<any>('BarcodeScanner')

async function lerNoApp(): Promise<boolean> {
  if (!noApp()) return false
  try {
    const { available } = await LeitorNativo.isGoogleBarcodeScannerModuleAvailable()
    if (!available) {
      erro.value = 'Preparando o leitor de QR (só na primeira vez)… tente de novo em alguns segundos.'
      await LeitorNativo.installGoogleBarcodeScannerModule()
      return true
    }
    const { barcodes } = await LeitorNativo.scan({ formats: ['QR_CODE'] })
    const texto = barcodes?.[0]?.rawValue
    if (texto) {
      const t = tokenDoQr(texto)
      if (t) { erro.value = ''; navigateTo({ path: '/m', query: { t } }) }
      else erro.value = 'Esse QR não é de acesso ao RestaurantePDV.'
    }
    return true
  } catch (e: any) {
    const msg = String(e?.message || e)
    if (/not implemented|unimplemented/i.test(msg)) return false // app sem o plugin
    if (!/cancel/i.test(msg)) erro.value = 'Não deu para abrir o leitor de QR. Entre com código e senha.'
    return true
  }
}

async function abrirLeitor() {
  erro.value = ''
  if (await lerNoApp()) return
  if (!navigator.mediaDevices?.getUserMedia) { erro.value = 'Este aparelho não deixa usar a câmera aqui. Entre com código e senha.'; return }
  try {
    fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
  } catch (e: any) {
    // No app 1.1 o Android recusa a câmera dentro da página: o 1.2 usa o leitor do Google
    erro.value = noApp()
      ? 'Atualize o app RestaurantePDV para a versão mais nova para ler o QR, ou entre com código e senha.'
      : e?.name === 'NotAllowedError'
        ? 'A câmera foi bloqueada. Libere a câmera para este site nas configurações do navegador.'
        : 'Não deu para abrir a câmera. Entre com código e senha.'
    return
  }
  lendo.value = true
  estadoLeitor.value = 'Aponte a câmera para o QR em Configurações › Acesso, no computador do restaurante.'
  await nextTick()
  video.value!.srcObject = fluxo
  await video.value!.play().catch(() => {})
  procurar()
}

/** Usa o leitor nativo do navegador quando existe; senão decodifica o quadro com jsQR. */
async function procurar() {
  const detector = 'BarcodeDetector' in window ? new (window as any).BarcodeDetector({ formats: ['qr_code'] }) : null
  const jsQR = detector ? null : (await import('jsqr')).default
  tela ??= document.createElement('canvas')
  const ctx = tela.getContext('2d', { willReadFrequently: true })!

  const passo = async () => {
    if (!lendo.value || !video.value) return
    const v = video.value
    if (v.readyState >= 2 && v.videoWidth) {
      let texto: string | null = null
      if (detector) {
        const achados = await detector.detect(v).catch(() => [])
        texto = achados[0]?.rawValue ?? null
      } else {
        const escala = Math.min(1, 640 / Math.max(v.videoWidth, v.videoHeight))
        tela!.width = Math.round(v.videoWidth * escala)
        tela!.height = Math.round(v.videoHeight * escala)
        ctx.drawImage(v, 0, 0, tela!.width, tela!.height)
        const img = ctx.getImageData(0, 0, tela!.width, tela!.height)
        texto = jsQR!(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data ?? null
      }
      if (texto) return lido(texto)
    }
    quadro = requestAnimationFrame(passo)
  }
  quadro = requestAnimationFrame(passo)
}

function lido(texto: string) {
  const t = tokenDoQr(texto)
  if (!t) {
    estadoLeitor.value = 'Esse QR não é de acesso ao RestaurantePDV.'
    quadro = requestAnimationFrame(() => setTimeout(procurar, 1200))
    return
  }
  fecharLeitor()
  // /m valida o QR (plano, caixa aberto) e leva cada cargo para a sua tela
  navigateTo({ path: '/m', query: { t } })
}

function fecharLeitor() {
  lendo.value = false
  cancelAnimationFrame(quadro)
  fluxo?.getTracks().forEach(t => t.stop())
  fluxo = null
}

onMounted(() => {
  if (authStore.isAuthenticated) navigateTo(destinoNoCelular(authStore.usuario?.cargo), { replace: true })
})
onUnmounted(fecharLeitor)
</script>

<style scoped>
.acs { min-height: 100dvh; display: flex; flex-direction: column; padding-top: env(safe-area-inset-top); padding-bottom: env(safe-area-inset-bottom); overflow: hidden; }
.acs-tela { position: relative; flex: 1; display: flex; flex-direction: column; width: 100%; max-width: 440px; margin: 0 auto; padding: 28px 24px; }
.acs-luz { position: absolute; width: 520px; height: 520px; left: -150px; top: -210px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 122, 0, .32) 0%, rgba(255, 122, 0, 0) 65%); pointer-events: none; }
.acs-topo { position: relative; display: flex; align-items: center; gap: 12px; }
.acs-marca { position: relative; margin-top: clamp(32px, 9vh, 72px); }
.acs-marca h1 { margin: 0; font-size: 54px; line-height: .92; letter-spacing: -.035em; }
.acs-marca h1 span { color: var(--eq-marca); }
.acs-marca p { margin: 16px 0 0; max-width: 280px; font: 500 17px/1.45 var(--eq-texto); color: var(--eq-mudo); }
.acs-cargos { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 36px; }
.acs-cargo { padding: 14px; display: flex; flex-direction: column; }
.acs-cargo-ic { width: 34px; height: 34px; border-radius: 11px; background: var(--eq-marca-fundo); color: var(--eq-marca-clara); display: grid; place-items: center; }
.acs-cargo strong { margin-top: 10px; font: 700 15px var(--eq-titulo); }
.acs-cargo > span:last-child { margin-top: 2px; font: 500 12.5px/1.4 var(--eq-texto); color: var(--eq-mudo); }
.acs-flex { flex: 1; min-height: 24px; }
.acs-acoes { display: flex; flex-direction: column; gap: 10px; }
.acs-erro { margin-bottom: 12px; }
.acs-nota { margin: 18px 4px 0; font: 500 12.5px/1.5 var(--eq-texto); color: var(--eq-apagado); }
.acs-nota span { color: var(--eq-mudo); }
.acs-nota-senha { margin-top: 14px; }

.acs-voltar { width: 48px; height: 48px; border-radius: 16px; }
.acs-passo { margin-top: 36px; }
.acs-h2 { margin: 8px 0; font-size: 34px; }
.acs-sub { margin: 0 0 28px; font: 500 15px/1.45 var(--eq-texto); color: var(--eq-mudo); }
.acs-sub b { color: var(--eq-tinta); font-weight: 700; }
.acs-erro-campo { margin: 12px 4px 0; font: 600 13px var(--eq-texto); color: var(--eq-marca-clara); }
.acs-senha-linha { display: flex !important; align-items: center; gap: 8px; text-transform: none !important; letter-spacing: 0 !important; }
.acs-senha input { letter-spacing: .08em; }
.acs-olho { flex: none; display: grid; place-items: center; width: 40px; height: 40px; margin: -6px -8px -6px 0; border: 0; border-radius: 12px; background: transparent; color: var(--eq-mudo); cursor: pointer; }

/* Leitor */
.acs-leitor { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; padding: calc(16px + env(safe-area-inset-top)) 24px calc(28px + env(safe-area-inset-bottom)); background: radial-gradient(120% 70% at 50% 40%, #1b1712 0%, #0A0A0B 70%); }
.acs-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .85; }
.acs-leitor-topo, .acs-leitor-pe { position: relative; }
.acs-leitor-topo { display: flex; align-items: center; justify-content: space-between; }
.acs-mira { position: relative; width: 250px; height: 250px; margin: auto; box-shadow: 0 0 0 9999px rgba(10, 10, 11, .55); border-radius: 28px; }
.acs-mira i { position: absolute; width: 56px; height: 56px; border: 0 solid var(--eq-marca); }
.acs-mira .c1 { left: 0; top: 0; border-left-width: 5px; border-top-width: 5px; border-top-left-radius: 28px; }
.acs-mira .c2 { right: 0; top: 0; border-right-width: 5px; border-top-width: 5px; border-top-right-radius: 28px; }
.acs-mira .c3 { left: 0; bottom: 0; border-left-width: 5px; border-bottom-width: 5px; border-bottom-left-radius: 28px; }
.acs-mira .c4 { right: 0; bottom: 0; border-right-width: 5px; border-bottom-width: 5px; border-bottom-right-radius: 28px; }
.acs-varre { position: absolute; left: 14px; right: 14px; height: 2px; border-radius: 2px; background: var(--eq-marca); box-shadow: 0 0 16px 2px rgba(255, 122, 0, .6); animation: eq-varre 2.4s ease-in-out infinite; }
.acs-leitor-pe p { margin: 0 0 18px; font: 500 15px/1.5 var(--eq-texto); color: var(--eq-tinta); text-shadow: 0 1px 8px rgba(0, 0, 0, .6); }
.acs-leitor-pe .eq-btn { width: 100%; }
</style>
