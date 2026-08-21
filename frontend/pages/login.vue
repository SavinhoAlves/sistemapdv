<template>
  <div class="min-h-screen flex">

    <!-- ══ PAINEL ESQUERDO — Branding (desktop) ══ -->
    <div class="hidden lg:flex lg:w-[55%] xl:w-[58%] relative overflow-hidden bg-neutral-950 flex-col justify-between p-10 xl:p-14">

      <!-- Gradientes de fundo -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_20%,rgba(249,115,22,0.12),transparent)]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_90%_80%,rgba(234,88,12,0.07),transparent)]"></div>

      <!-- Grid sutil -->
      <div class="absolute inset-0 opacity-[0.025]"
        style="background-image: linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px); background-size: 40px 40px;">
      </div>

      <!-- Borda de brilho direita -->
      <div class="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent"></div>

      <!-- TOPO: Logo -->
      <div class="relative z-10 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
          <UtensilsCrossed :size="16" class="text-white" />
        </div>
        <span class="text-white font-black tracking-tight">Restaurante PDV</span>
      </div>

      <!-- CENTRO: Hero -->
      <div class="relative z-10 space-y-8">
        <div>
          <div class="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 mb-6">
            <span class="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
            <span class="text-orange-400 text-[11px] font-black uppercase tracking-widest">Sistema online</span>
          </div>
          <h2 class="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
            Gestão completa<br>
            para o seu<br>
            <span class="text-orange-400">restaurante</span>
          </h2>
          <p class="text-white/40 text-base mt-4 leading-relaxed max-w-sm">
            Do controle de mesas à emissão de fichas. Rápido, moderno e feito para o dia a dia da sua operação.
          </p>
        </div>

        <!-- Features -->
        <div class="grid grid-cols-2 gap-3">
          <div v-for="f in features" :key="f.label"
            class="flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.10] rounded-2xl p-4 transition-all duration-200">
            <div class="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
              <component :is="f.icon" :size="14" class="text-orange-400" />
            </div>
            <p class="text-white/70 text-xs font-bold leading-tight">{{ f.label }}</p>
          </div>
        </div>
      </div>

      <!-- FUNDO: Rodapé -->
      <div class="relative z-10">
        <p class="text-white/20 text-[11px]">© 2025 Restaurante PDV · v1.0</p>
      </div>
    </div>

    <!-- ══ PAINEL DIREITO — Formulário ══ -->
    <div class="flex-1 login-page-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">

      <!-- Blob de fundo -->
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-[380px] relative z-10">

        <!-- Logo mobile (só aparece em mobile) -->
        <div class="lg:hidden flex flex-col items-center mb-8">
          <div class="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-3">
            <UtensilsCrossed :size="20" class="text-white" />
          </div>
          <h1 class="text-xl font-black text-gray-900 dark:text-white">
            Restaurante <span class="text-orange-400">PDV</span>
          </h1>
        </div>

        <!-- Cabeçalho do form -->
        <div class="mb-7">
          <h2 class="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Bem-vindo de volta</h2>
          <p class="text-sm text-gray-500 dark:text-white/40 mt-1">Faça login para acessar o sistema</p>
        </div>

        <!-- Alerta -->
        <Transition name="msg">
          <div
            v-if="msg.text"
            class="mb-5 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-3"
            :class="msg.type === 'success'
              ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'"
          >
            <CheckCircle2 v-if="msg.type === 'success'" :size="15" class="shrink-0" />
            <AlertCircle v-else :size="15" class="shrink-0" />
            {{ msg.text }}
          </div>
        </Transition>

        <!-- Tabs (só exibe se RFID estiver ativo) -->
        <div v-if="rfidAtivo" class="flex bg-gray-100 dark:bg-white/[0.06] rounded-2xl p-1 mb-6">
          <button
            @click="setTab('rfid')"
            class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
            :class="tab === 'rfid'
              ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60'"
          >
            <CreditCard :size="13" />
            Cartão RFID
          </button>
          <button
            @click="setTab('manual')"
            class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
            :class="tab === 'manual'
              ? 'bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60'"
          >
            <KeyRound :size="13" />
            E-mail / Senha
          </button>
        </div>

        <!-- Conteúdo das tabs -->
        <Transition name="tab-fade" mode="out-in">

          <!-- TAB RFID -->
          <div v-if="tab === 'rfid'" key="rfid"
            class="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-3xl overflow-hidden shadow-sm">

            <button @click="focusRfid" class="w-full group flex flex-col items-center gap-5 py-10 px-6 cursor-pointer active:scale-[0.98] transition-transform duration-150">
              <div class="relative">
                <div
                  v-if="rfidReading"
                  class="absolute inset-0 rounded-full bg-orange-500/20 animate-ping"
                  style="transform: scale(2)"
                ></div>
                <div
                  class="w-24 h-24 rounded-3xl border-2 flex items-center justify-center transition-all duration-200"
                  :class="rfidReading
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] group-hover:border-orange-400/50 group-hover:bg-orange-500/5'"
                >
                  <Wifi
                    :size="36"
                    stroke-width="1.25"
                    class="transition-colors duration-200"
                    :class="rfidReading ? 'text-orange-400' : 'text-gray-300 dark:text-white/20 group-hover:text-orange-400/60'"
                  />
                </div>
              </div>

              <div class="text-center">
                <p class="text-base font-black transition-colors duration-200"
                  :class="rfidReading ? 'text-orange-400' : 'text-gray-700 dark:text-white/70'">
                  {{ rfidReading ? 'Identificando...' : 'Aproxime o cartão ao leitor' }}
                </p>
                <p class="text-xs text-gray-400 dark:text-white/30 mt-1.5">
                  {{ rfidReading ? 'Aguarde um momento' : 'Toque aqui para ativar o leitor' }}
                </p>
              </div>

              <!-- Indicador de status -->
              <div class="flex items-center gap-2 bg-gray-50 dark:bg-white/[0.04] rounded-xl px-4 py-2">
                <span class="w-2 h-2 rounded-full transition-colors duration-300"
                  :class="rfidReading ? 'bg-orange-400 animate-pulse' : 'bg-gray-300 dark:bg-white/20'"></span>
                <span class="text-[11px] font-bold text-gray-400 dark:text-white/30">
                  {{ rfidReading ? 'Lendo cartão...' : rfidFocused ? 'Leitor ativo' : 'Clique para ativar' }}
                </span>
              </div>
            </button>

            <!-- Input invisível -->
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

          <!-- TAB MANUAL -->
          <form v-else key="manual" @submit.prevent="handleManualLogin"
            class="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-3xl p-7 shadow-sm space-y-5">

            <div>
              <label for="login-email" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
                E-mail
              </label>
              <div class="relative">
                <Mail :size="14" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25 pointer-events-none" />
                <input
                  id="login-email"
                  name="email"
                  ref="emailRef"
                  v-model="form.email"
                  autocomplete="email"
                  type="email"
                  placeholder="seu@email.com"
                  class="w-full h-12 pl-11 pr-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 text-sm focus:outline-none focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <div>
              <label for="login-senha" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
                Senha
              </label>
              <div class="relative">
                <Lock :size="14" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25 pointer-events-none" />
                <input
                  id="login-senha"
                  name="senha"
                  v-model="form.senha"
                  autocomplete="current-password"
                  :type="showPass ? 'text' : 'password'"
                  placeholder="••••••••"
                  class="w-full h-12 pl-11 pr-12 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 text-sm focus:outline-none focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  @click="showPass = !showPass"
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25 hover:text-gray-600 dark:hover:text-white/60 transition-colors duration-150 cursor-pointer"
                >
                  <Eye v-if="!showPass" :size="14" />
                  <EyeOff v-else :size="14" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 cursor-pointer mt-2"
            >
              <Loader2 v-if="loading" :size="15" class="animate-spin" />
              <LogIn v-else :size="15" />
              {{ loading ? 'Verificando...' : 'Entrar' }}
            </button>

          </form>
        </Transition>

        <!-- Rodapé -->
        <div class="mt-6 flex flex-col items-center gap-2">
          <NuxtLink to="/platform/login"
            class="flex items-center gap-1.5 text-[10px] text-gray-300 dark:text-white/15 hover:text-orange-400 dark:hover:text-orange-400 transition-colors font-medium">
            <LayoutGrid :size="10" />
            Central de Gestão
          </NuxtLink>
          <p class="text-gray-400 dark:text-white/20 text-[11px]">Versão 1.0 · Restaurante PDV</p>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from 'nuxt/app'
import { ref, reactive, onMounted, nextTick } from 'vue'
import {
  UtensilsCrossed, CreditCard, KeyRound, Wifi,
  Mail, Lock, Eye, EyeOff, LogIn, Loader2,
  CheckCircle2, AlertCircle, LayoutGrid, Receipt,
  BarChart2, Smartphone
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useAuthStore } from '~/stores/auth'

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
const form         = reactive({ email: '', senha: '' })
let rfidTimer: any = null

const features = [
  { icon: LayoutGrid,  label: 'Controle de mesas em tempo real' },
  { icon: Receipt,     label: 'Emissão de fichas térmicas' },
  { icon: BarChart2,   label: 'Relatórios de vendas e caixa' },
  { icon: Smartphone,  label: 'Integração com maquininha' },
]

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
  rfidReading.value = true
  hideMsg()
  try {
    const res: any = await api.auth.rfid(cartao_rfid)
    const raw = res.usuario
    if (res.access_token && raw) {
      const user = { id: raw.id, nome: raw.nome, cargo: raw.cargo, perfil_id: raw.perfil_id ?? null, permissoes: raw.permissoes ?? null }
      authStore.setAuth(res.access_token, user, res.refresh_token)
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
  if (!form.email || !form.senha) return showMsg('error', 'Preencha todos os campos')
  loading.value = true
  hideMsg()
  try {
    const res: any = await api.auth.login(form.email, form.senha)
    const raw = res.usuario
    if (res.access_token && raw) {
      const user = { id: raw.id, nome: raw.nome, cargo: raw.cargo, perfil_id: raw.perfil_id ?? null, permissoes: raw.permissoes ?? null }
      authStore.setAuth(res.access_token, user, res.refresh_token)
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

  // Verifica se RFID está habilitado (endpoint público, sem auth)
  try {
    const slug = (runtimeConfig.public as any).tenantSlug || ''
    const cfg = await api.get<{ rfid_ativo: boolean }>(`/sistema/config-publica?slug=${slug}`)
    rfidAtivo.value = cfg.rfid_ativo !== false
  } catch {
    rfidAtivo.value = true // fallback seguro
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
.tab-fade-enter-active,
.tab-fade-leave-active { transition: opacity 0.12s ease, transform 0.12s ease; }
.tab-fade-enter-from   { opacity: 0; transform: translateY(6px); }
.tab-fade-leave-to     { opacity: 0; transform: translateY(-6px); }

.msg-enter-active,
.msg-leave-active { transition: all 0.2s ease; }
.msg-enter-from,
.msg-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
