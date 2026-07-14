<template>
  <div class="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">

    <!-- Fundo decorativo -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-orange-500/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl"></div>
      <div class="absolute top-1/2 -translate-y-1/2 left-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl"></div>
    </div>

    <div class="w-full max-w-md relative z-10">

      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 rounded-3xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4">
          <UtensilsCrossed :size="28" class="text-white" />
        </div>
        <h1 class="text-2xl font-black text-white tracking-tight">Restaurante <span class="text-orange-400">PDV</span></h1>
        <p class="text-sm text-neutral-500 mt-1">Sistema de Atendimento</p>
      </div>

      <!-- Card principal -->
      <div class="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">

        <!-- Tab switcher -->
        <div class="flex p-1 bg-neutral-800 rounded-2xl mb-8">
          <button
            @click="tab = 'rfid'; focusRfid()"
            class="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            :class="tab === 'rfid'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-neutral-500 hover:text-neutral-300'"
          >
            <CreditCard :size="14" />
            <span class="hidden sm:inline">Cartão RFID</span>
          </button>
          <button
            @click="tab = 'qr'"
            class="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            :class="tab === 'qr'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-neutral-500 hover:text-neutral-300'"
          >
            <ScanLine :size="14" />
            <span class="hidden sm:inline">Crachá QR</span>
          </button>
          <button
            @click="tab = 'manual'; focusEmail()"
            class="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            :class="tab === 'manual'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-neutral-500 hover:text-neutral-300'"
          >
            <KeyRound :size="14" />
            <span class="hidden sm:inline">E-mail / Senha</span>
          </button>
        </div>

        <!-- Alerta de mensagem -->
        <Transition name="msg">
          <div
            v-if="msg.text"
            class="mb-6 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-3"
            :class="msg.type === 'success'
              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'"
          >
            <CheckCircle2 v-if="msg.type === 'success'" :size="16" class="shrink-0" />
            <AlertCircle v-else :size="16" class="shrink-0" />
            {{ msg.text }}
          </div>
        </Transition>

        <!-- RFID -->
        <Transition name="tab-fade" mode="out-in">
          <div v-if="tab === 'rfid'" key="rfid" class="text-center">

            <button @click="focusRfid" class="w-full group relative mb-6">
              <!-- Cartão simulado -->
              <div
                class="relative mx-auto w-72 h-44 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between p-6 overflow-hidden"
                :class="rfidReading
                  ? 'border-orange-500 bg-gradient-to-br from-orange-500/20 to-orange-900/20 scale-[1.02]'
                  : 'border-neutral-700 bg-gradient-to-br from-neutral-800 to-neutral-850 hover:border-orange-500/40 hover:from-neutral-750 hover:to-neutral-800'"
              >
                <!-- Círculos decorativos de fundo -->
                <div class="absolute -right-8 -top-8 w-36 h-36 rounded-full border border-white/5"></div>
                <div class="absolute -right-4 -top-4 w-24 h-24 rounded-full border border-white/5"></div>

                <!-- Topo: label do sistema -->
                <div class="flex items-center justify-between relative z-10">
                  <span class="text-[10px] font-black uppercase tracking-widest transition-colors duration-300"
                    :class="rfidReading ? 'text-orange-400' : 'text-neutral-600'">
                    Restaurante PDV
                  </span>
                  <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors duration-300"
                    :class="rfidReading ? 'border-orange-500/40 text-orange-400 bg-orange-500/10' : 'border-neutral-700 text-neutral-600'">
                    RFID
                  </span>
                </div>

                <!-- Centro: ícone de ondas RFID -->
                <div class="flex items-center justify-center relative z-10">
                  <div class="relative flex items-center justify-center">
                    <!-- Ondas animadas ao ler -->
                    <div v-if="rfidReading" class="absolute w-16 h-16 rounded-full border border-orange-500/30 animate-ping"></div>
                    <div v-if="rfidReading" class="absolute w-10 h-10 rounded-full border border-orange-500/40 animate-ping" style="animation-delay: 0.15s"></div>
                    <Wifi
                      :size="32"
                      stroke-width="1.5"
                      class="transition-colors duration-300"
                      :class="rfidReading ? 'text-orange-400' : 'text-neutral-500 group-hover:text-neutral-400'"
                    />
                  </div>
                </div>

                <!-- Rodapé: instrução -->
                <div class="relative z-10">
                  <p class="text-[10px] font-black uppercase tracking-widest transition-colors duration-300"
                    :class="rfidReading ? 'text-orange-400' : 'text-neutral-600 group-hover:text-neutral-500'">
                    {{ rfidReading ? 'Identificando...' : 'Aproxime aqui' }}
                  </p>
                </div>

                <!-- Brilho pulsante ao ler -->
                <div
                  v-if="rfidReading"
                  class="absolute inset-0 rounded-3xl bg-orange-500/10 animate-pulse"
                ></div>
              </div>
            </button>

            <p class="text-xs text-neutral-600">
              Aproxime seu cartão RFID ao leitor ou clique para ativar
            </p>

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

          <!-- CRACHÁ QR -->
          <div v-else-if="tab === 'qr'" key="qr" class="text-center">

            <div class="relative mx-auto w-72 aspect-square rounded-3xl border-2 border-neutral-700 bg-neutral-950 overflow-hidden">
              <video
                v-show="qrCameraAtiva"
                ref="videoRef"
                class="absolute inset-0 w-full h-full object-cover"
                autoplay
                muted
                playsinline
              ></video>

              <!-- moldura de mira -->
              <div v-if="qrCameraAtiva" class="absolute inset-6 border-2 border-orange-500/50 rounded-2xl pointer-events-none"></div>

              <div v-if="!qrCameraAtiva" class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6">
                <ScanLine :size="32" class="text-neutral-600" />
                <p class="text-xs text-neutral-500 leading-relaxed">
                  {{ qrErro || 'Câmera desligada' }}
                </p>
              </div>
            </div>

            <p class="text-xs text-neutral-600 mt-4">
              Aponte a câmera para o QR code do seu crachá
            </p>

            <button
              v-if="!qrCameraAtiva"
              type="button"
              @click="iniciarLeituraQr"
              class="w-full h-13 mt-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <Camera :size="16" />
              Ativar câmera
            </button>
          </div>

          <!-- Login Manual -->
          <form v-else key="manual" @submit.prevent="handleManualLogin" class="space-y-4">

            <div class="space-y-2">
              <label for="login-email" class="text-[10px] font-black uppercase tracking-widest text-neutral-500 block">
                E-mail
              </label>
              <div class="relative">
                <Mail :size="16" class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none" />
                <input
                  id="login-email"
                  name="email"
                  ref="emailRef"
                  v-model="form.email"
                  autocomplete="email"
                  type="email"
                  placeholder="exemplo@pdv.com"
                  class="w-full h-13 pl-11 pr-4 bg-neutral-800 border border-neutral-700 rounded-2xl text-white placeholder-neutral-600 font-medium text-sm focus:outline-none focus:border-orange-500 focus:bg-neutral-750 transition-all"
                  required
                />
              </div>
            </div>

            <div class="space-y-2">
              <label for="login-senha" class="text-[10px] font-black uppercase tracking-widest text-neutral-500 block">
                Senha
              </label>
              <div class="relative">
                <Lock :size="16" class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none" />
                <input
                  id="login-senha"
                  name="senha"
                  v-model="form.senha"
                  autocomplete="current-password"
                  :type="showPass ? 'text' : 'password'"
                  placeholder="••••••••"
                  class="w-full h-13 pl-11 pr-12 bg-neutral-800 border border-neutral-700 rounded-2xl text-white placeholder-neutral-600 font-medium text-sm focus:outline-none focus:border-orange-500 transition-all"
                  required
                />
                <button
                  type="button"
                  @click="showPass = !showPass"
                  class="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  <Eye v-if="!showPass" :size="16" />
                  <EyeOff v-else :size="16" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full h-13 mt-2 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
            >
              <Loader2 v-if="loading" :size="16" class="animate-spin" />
              <LogIn v-else :size="16" />
              {{ loading ? 'Verificando...' : 'Entrar' }}
            </button>

            <div class="pt-2 text-center">
              <button
                type="button"
                @click="authStore.logout()"
                class="text-[10px] font-black text-neutral-700 uppercase tracking-widest hover:text-red-500 transition-colors"
              >
                Limpar Sessão
              </button>
            </div>

          </form>
        </Transition>

      </div>

      <!-- Rodapé -->
      <p class="text-center text-neutral-700 text-xs mt-6 font-medium">
        Versão 1.0 · Restaurante PDV
      </p>

    </div>
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from 'nuxt/app'
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import jsQR from 'jsqr'
import {
  UtensilsCrossed, CreditCard, KeyRound, Wifi,
  Mail, Lock, Eye, EyeOff, LogIn, Loader2,
  CheckCircle2, AlertCircle, ScanLine, Camera
} from 'lucide-vue-next'
import { useApi } from '../services/api'
import { useAuthStore } from '../stores/auth'

definePageMeta({ layout: false })

const authStore = useAuthStore()
const api = useApi()

const tab       = ref<'rfid' | 'qr' | 'manual'>('rfid')
const loading   = ref(false)
const showPass  = ref(false)
const msg       = reactive({ text: '', type: 'error' as 'error' | 'success' })

const rfidInputRef = ref<HTMLInputElement>()
const emailRef     = ref<HTMLInputElement>()
const rfidFocused  = ref(false)
const rfidReading  = ref(false)
const rfidBuffer   = ref('')
const form         = reactive({ email: '', senha: '' })
let rfidTimer: any = null

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
    const user = res.funcionario || res.usuario
    if (res.token && user) {
      authStore.setAuth(res.token, user)
      showMsg('success', `Bem-vindo, ${user.nome}!`)
      return navigateTo('/')
    }
  } catch (e: any) {
    showMsg('error', e.message || 'Cartão não reconhecido')
    focusRfid()
  } finally {
    rfidReading.value = false
  }
}

// ─── Crachá QR: mesma identidade do RFID, só muda a origem do código ───
// (câmera decodificando o QR em vez do leitor físico "digitando" no input)
const videoRef      = ref<HTMLVideoElement>()
const qrCameraAtiva  = ref(false)
const qrErro         = ref('')
let qrStream: MediaStream | null = null
let qrAnimationId: number | null = null
let qrProcessando    = false

async function iniciarLeituraQr() {
  qrErro.value = ''

  // getUserMedia só existe em contexto seguro (https ou localhost) — em
  // http://IP-da-rede o navegador nem expõe a API, então detecta isso
  // antes de tentar, pra dar uma mensagem que explica o motivo real
  if (!navigator.mediaDevices?.getUserMedia) {
    qrErro.value = 'Câmera indisponível: o acesso só é permitido em conexão segura (https). Peça pro administrador configurar HTTPS ou use a aba RFID/Manual.'
    return
  }

  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } }
    })
    if (!videoRef.value) return
    videoRef.value.srcObject = qrStream
    await videoRef.value.play()
    qrCameraAtiva.value = true
    qrAnimationId = requestAnimationFrame(escanearFrame)
  } catch (e: any) {
    qrErro.value = e?.name === 'NotAllowedError'
      ? 'Permissão de câmera negada — habilite nas configurações do navegador'
      : 'Não foi possível acessar a câmera'
  }
}

function pararLeituraQr() {
  if (qrAnimationId) cancelAnimationFrame(qrAnimationId)
  qrAnimationId = null
  qrStream?.getTracks().forEach(t => t.stop())
  qrStream = null
  qrCameraAtiva.value = false
}

function escanearFrame() {
  const video = videoRef.value
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
    qrAnimationId = requestAnimationFrame(escanearFrame)
    return
  }

  if (!qrProcessando) {
    qrProcessando = true
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const codigo = jsQR(frame.data, frame.width, frame.height)

      if (codigo?.data) {
        pararLeituraQr()
        loginRfid(codigo.data)
        qrProcessando = false
        return
      }
    }
    qrProcessando = false
  }

  qrAnimationId = requestAnimationFrame(escanearFrame)
}

watch(tab, (novaAba) => {
  if (novaAba !== 'qr') pararLeituraQr()
})

onBeforeUnmount(() => pararLeituraQr())

async function handleManualLogin() {
  if (!form.email || !form.senha) return showMsg('error', 'Preencha todos os campos')
  loading.value = true
  hideMsg()
  try {
    const res: any = await api.auth.login(form.email, form.senha)
    const user = res.funcionario || res.usuario
    if (res.token && user) {
      authStore.setAuth(res.token, user)
      showMsg('success', 'Acesso autorizado!')
      return navigateTo('/')
    }
  } catch {
    showMsg('error', 'E-mail ou senha incorretos')
  } finally {
    loading.value = false
  }
}

function showMsg(type: 'error' | 'success', text: string) { msg.type = type; msg.text = text }
function hideMsg() { msg.text = '' }

onMounted(() => {
  authStore.restoreSession()
  if (authStore.isAuthenticated) return navigateTo('/')
  setTimeout(() => focusRfid(), 400)
})
</script>

<style scoped>
.h-13 { height: 3.25rem; }

.tab-fade-enter-active,
.tab-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.tab-fade-enter-from   { opacity: 0; transform: translateX(8px); }
.tab-fade-leave-to     { opacity: 0; transform: translateX(-8px); }

.msg-enter-active,
.msg-leave-active { transition: all 0.2s ease; }
.msg-enter-from,
.msg-leave-to     { opacity: 0; transform: translateY(-6px); }
</style>
