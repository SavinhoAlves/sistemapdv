<template>
  <div class="auth">

    <!-- Barra superior: marca + relógio (tela fica aberta no balcão o dia todo) -->
    <header class="auth__barra">
      <div class="auth__marca">
        <span class="auth__marca-icone"><UtensilsCrossed :size="18" /></span>
        <span>Restaurante PDV</span>
      </div>
      <div class="auth__relogio">
        <span class="auth__hora pdv-valor">{{ hora }}</span>
        <span class="auth__data">{{ data }}</span>
      </div>
    </header>

    <main class="auth__centro">
      <div class="auth__caixa">

        <div class="auth__saudacao">
          <span class="auth__online"><i></i>Sistema online</span>
          <h1>{{ saudacao }}!</h1>
          <p>Identifique-se para começar o turno.</p>
        </div>

        <div class="auth__cartao">

          <!-- Escolha do método: dois blocos grandes, não abas pequenas -->
          <div v-if="rfidAtivo" class="auth__metodos" role="tablist">
            <button role="tab" :aria-selected="tab === 'rfid'" :class="{ ativo: tab === 'rfid' }" @click="setTab('rfid')">
              <CreditCard :size="22" />
              <span><strong>Crachá</strong><small>Aproxime do leitor</small></span>
            </button>
            <button role="tab" :aria-selected="tab === 'manual'" :class="{ ativo: tab === 'manual' }" @click="setTab('manual')">
              <KeyRound :size="22" />
              <span><strong>E-mail</strong><small>Usuário e senha</small></span>
            </button>
          </div>

          <Transition name="msg">
            <div v-if="msg.text" class="auth__alerta" :class="`auth__alerta--${msg.type}`" role="alert">
              <CheckCircle2 v-if="msg.type === 'success'" :size="16" />
              <AlertCircle v-else :size="16" />
              {{ msg.text }}
            </div>
          </Transition>

          <Transition name="tab-fade" mode="out-in">

            <!-- RFID -->
            <div v-if="tab === 'rfid'" key="rfid" class="auth__rfid">
              <button type="button" class="auth__rfid-alvo" :class="{ lendo: rfidReading, ativo: rfidFocused }" @click="focusRfid">
                <span class="auth__rfid-ondas" aria-hidden="true"><i></i><i></i><i></i></span>
                <span class="auth__rfid-cartao"><Wifi :size="30" stroke-width="1.75" /></span>
              </button>
              <strong class="auth__rfid-titulo">{{ rfidReading ? 'Identificando…' : 'Aproxime o crachá do leitor' }}</strong>
              <span class="auth__rfid-status">
                <i></i>
                {{ rfidReading ? 'Lendo cartão' : rfidFocused ? 'Leitor pronto' : 'Toque no círculo para ativar o leitor' }}
              </span>
              <input
                id="rfid-input"
                name="rfid-input"
                ref="rfidInputRef"
                v-model="rfidBuffer"
                aria-label="Leitor de cartão RFID"
                @input="onRfidInput"
                @keyup.enter="onRfidEnter"
                @focus="rfidFocused = true"
                @blur="rfidFocused = false"
                type="password"
                class="opacity-0 absolute h-0 w-0"
              />
            </div>

            <!-- MANUAL -->
            <form v-else key="manual" class="auth__form" @submit.prevent="handleManualLogin">
              <div class="auth__campo">
                <label for="login-slug" class="pdv-rotulo">Restaurante</label>
                <div class="auth__input">
                  <Store :size="18" />
                  <input
                    id="login-slug"
                    name="pdv-restaurante-slug"
                    v-model="form.slug"
                    class="pdv-campo"
                    autocomplete="off"
                    type="text"
                    placeholder="código do restaurante"
                    readonly
                    @focus="($event.target as HTMLInputElement).removeAttribute('readonly')"
                    required
                  />
                </div>
              </div>

              <div class="auth__campo">
                <label for="login-email" class="pdv-rotulo">E-mail</label>
                <div class="auth__input">
                  <Mail :size="18" />
                  <input id="login-email" name="email" ref="emailRef" v-model="form.email" class="pdv-campo"
                    autocomplete="email" type="email" placeholder="seu@email.com" required />
                </div>
              </div>

              <div class="auth__campo">
                <label for="login-senha" class="pdv-rotulo">Senha</label>
                <div class="auth__input">
                  <Lock :size="18" />
                  <input id="login-senha" name="senha" v-model="form.senha" class="pdv-campo"
                    autocomplete="current-password" :type="showPass ? 'text' : 'password'" placeholder="••••••••" required />
                  <button type="button" class="auth__olho" :aria-label="showPass ? 'Ocultar senha' : 'Mostrar senha'" @click="showPass = !showPass">
                    <Eye v-if="!showPass" :size="18" />
                    <EyeOff v-else :size="18" />
                  </button>
                </div>
              </div>

              <button type="submit" :disabled="loading" class="pdv-botao pdv-botao--acao pdv-botao--confirmar w-full">
                <Loader2 v-if="loading" :size="20" class="animate-spin" />
                <LogIn v-else :size="20" />
                {{ loading ? 'Verificando…' : 'Entrar' }}
              </button>
            </form>
          </Transition>
        </div>
      </div>
    </main>

    <footer class="auth__rodape">
      <span>Versão 1.0</span>
      <NuxtLink to="/platform/login"><LayoutGrid :size="14" /> Central de gestão</NuxtLink>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from 'nuxt/app'
import { ref, reactive, onMounted, nextTick } from 'vue'
import {
  UtensilsCrossed, CreditCard, KeyRound, Wifi,
  Mail, Lock, Eye, EyeOff, LogIn, Loader2,
  CheckCircle2, AlertCircle, LayoutGrid,
  Store
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useRelogio } from '~/composables/useRelogio'
import { useAuthStore } from '~/stores/auth'
import { getTenantSlug, setTenantSlug } from '~/composables/useTenantSlug'

definePageMeta({ layout: false })

const authStore = useAuthStore()
const api = useApi()
const runtimeConfig = useRuntimeConfig()

const rfidAtivo = ref(true)
const tab      = ref<'rfid' | 'manual'>('rfid')
const loading  = ref(false)
const showPass = ref(false)
const msg      = reactive({ text: '', type: 'error' as 'error' | 'success' })

const rfidInputRef = ref<HTMLInputElement>()
const emailRef     = ref<HTMLInputElement>()
const rfidFocused  = ref(false)
const rfidReading  = ref(false)
const rfidBuffer   = ref('')
const form         = reactive({ email: '', senha: '', slug: '' })
let rfidTimer: any = null

const { hora, data, saudacao } = useRelogio()

function setTab(t: 'rfid' | 'manual') {
  tab.value = t
  hideMsg()
  if (t === 'rfid') focusRfid()
  else focusEmail()
}

function focusRfid() { rfidInputRef.value?.focus() }
function focusEmail() { nextTick(() => emailRef.value?.focus()) }

function onRfidInput() {
  clearTimeout(rfidTimer)
  rfidTimer = setTimeout(() => {
    if (rfidBuffer.value.length >= 3) onRfidEnter()
  }, 300)
}

function onRfidEnter() {
  const code = rfidBuffer.value.trim()
  rfidBuffer.value = ''
  if (code) loginRfid(code)
}

async function loginRfid(cartao_rfid: string) {
  const slug = form.slug.trim() || getTenantSlug()
  if (!slug) return showMsg('error', 'Informe o código do restaurante')
  rfidReading.value = true
  hideMsg()
  try {
    const res: any = await api.auth.rfid(cartao_rfid, slug)
    const raw = res.usuario
    if ((res.accessToken || res.access_token) && raw) {
      setTenantSlug(slug)
      const user = { id: raw.id, nome: raw.nome, cargo: raw.cargo, perfil_id: raw.perfil_id ?? null, permissoes: raw.permissoes ?? null }
      authStore.setAuth(res.accessToken ?? res.access_token, user, res.refreshToken ?? res.refresh_token)
      showMsg('success', `Bem-vindo, ${raw.nome}!`)
      return navigateTo('/')
    }
  } catch (e: any) {
    showMsg('error', e.message || 'Cartão não reconhecido')
    focusRfid()
  } finally {
    rfidReading.value = false
  }
}

async function handleManualLogin() {
  const slug = form.slug.trim()
  if (!slug)          return showMsg('error', 'Informe o código do restaurante')
  if (!form.email || !form.senha) return showMsg('error', 'Preencha todos os campos')
  loading.value = true
  hideMsg()
  try {
    const res: any = await api.auth.login(form.email, form.senha, slug)
    const raw = res.usuario
    if ((res.accessToken || res.access_token) && raw) {
      setTenantSlug(slug)
      const user = { id: raw.id, nome: raw.nome, cargo: raw.cargo, perfil_id: raw.perfil_id ?? null, permissoes: raw.permissoes ?? null }
      authStore.setAuth(res.accessToken ?? res.access_token, user, res.refreshToken ?? res.refresh_token)
      showMsg('success', 'Acesso autorizado!')
      return navigateTo('/')
    }
  } catch (err: any) {
    const msg = err?.message || err?.data?.error || 'Falha ao conectar com o servidor'
    showMsg('error', msg === 'Sessão expirada' ? 'E-mail ou senha incorretos' : msg)
  } finally {
    loading.value = false
  }
}

function showMsg(type: 'error' | 'success', text: string) { msg.type = type; msg.text = text }
function hideMsg() { msg.text = '' }

onMounted(async () => {
  authStore.restoreSession()
  if (authStore.isAuthenticated) return navigateTo('/')

  // Pré-preenche o slug se já houver um salvo nesta sessão
  form.slug = getTenantSlug() !== ((runtimeConfig.public as any).tenantSlug || '') ? getTenantSlug() : ''

  // Verifica se RFID está habilitado (endpoint público, sem auth)
  try {
    const slug = getTenantSlug()
    const cfg = await api.get<{ rfid_ativo: boolean }>(`/sistema/config-publica?slug=${slug}`)
    rfidAtivo.value = cfg.rfid_ativo !== false
  } catch {
    rfidAtivo.value = true
  }

  if (!rfidAtivo.value) {
    tab.value = 'manual'
    setTimeout(() => focusEmail(), 200)
  } else {
    setTimeout(() => focusRfid(), 400)
  }
})
</script>

<style scoped>
.tab-fade-enter-active, .tab-fade-leave-active { transition: opacity var(--tempo-folha) var(--curva); }
.tab-fade-enter-from, .tab-fade-leave-to { opacity: 0; }
.msg-enter-active, .msg-leave-active { transition: opacity var(--tempo-folha) var(--curva); }
.msg-enter-from, .msg-leave-to { opacity: 0; }
</style>
