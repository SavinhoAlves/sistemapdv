<template>
  <div class="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">

    <!-- Fundo decorativo -->
    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-500/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      <div class="absolute top-1/2 -translate-y-1/2 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl"></div>
    </div>

    <div class="w-full max-w-sm relative z-10">

      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 rounded-3xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/30 mb-4">
          <ShieldCheck :size="28" class="text-white" />
        </div>
        <h1 class="text-2xl font-black text-white tracking-tight">Painel <span class="text-purple-400">Master</span></h1>
        <p class="text-sm text-neutral-500 mt-1">Acesso restrito ao administrador</p>
      </div>

      <!-- Card -->
      <div class="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">

        <!-- Alerta -->
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

        <form @submit.prevent="handleLogin" class="space-y-4">

          <div class="space-y-2">
            <label for="admin-email" class="text-[10px] font-black uppercase tracking-widest text-neutral-500 block">
              E-mail
            </label>
            <div class="relative">
              <Mail :size="16" class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none" />
              <input
                id="admin-email"
                ref="emailRef"
                v-model="form.email"
                type="email"
                autocomplete="email"
                placeholder="admin@restaurante.com"
                class="w-full h-13 pl-11 pr-4 bg-neutral-800 border border-neutral-700 rounded-2xl text-white placeholder-neutral-600 font-medium text-sm focus:outline-none focus:border-purple-500 focus:bg-neutral-750 transition-all"
                required
              />
            </div>
          </div>

          <div class="space-y-2">
            <label for="admin-senha" class="text-[10px] font-black uppercase tracking-widest text-neutral-500 block">
              Senha
            </label>
            <div class="relative">
              <Lock :size="16" class="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none" />
              <input
                id="admin-senha"
                v-model="form.senha"
                :type="showPass ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full h-13 pl-11 pr-12 bg-neutral-800 border border-neutral-700 rounded-2xl text-white placeholder-neutral-600 font-medium text-sm focus:outline-none focus:border-purple-500 transition-all"
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
            class="w-full h-13 mt-2 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
          >
            <Loader2 v-if="loading" :size="16" class="animate-spin" />
            <ShieldCheck v-else :size="16" />
            {{ loading ? 'Verificando...' : 'Acessar Master' }}
          </button>

        </form>

      </div>

      <p class="text-center text-neutral-700 text-xs mt-6 font-medium">
        Versão 1.0 · Restaurante PDV
      </p>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ShieldCheck, Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: false })

const api       = useApi()
const authStore = useAuthStore()

const emailRef = ref<HTMLInputElement>()
const loading  = ref(false)
const showPass = ref(false)
const msg      = reactive({ text: '', type: 'error' as 'error' | 'success' })
const form     = reactive({ email: '', senha: '' })

async function handleLogin() {
  if (!form.email || !form.senha) return showMsg('error', 'Preencha todos os campos')
  loading.value = true
  hideMsg()
  try {
    const res: any = await api.auth.login(form.email, form.senha)
    const user = res.funcionario || res.usuario
    if (!user || !res.token) throw new Error('Resposta inválida')

    if (user.cargo !== 'administrador') {
      showMsg('error', 'Acesso restrito ao administrador')
      return
    }

    authStore.setAuth(res.token, user)
    showMsg('success', `Bem-vindo, ${user.nome}!`)
    setTimeout(() => navigateTo('/admin'), 800)
  } catch (e: any) {
    showMsg('error', e?.message?.includes('administrador') ? e.message : 'E-mail ou senha incorretos')
  } finally {
    loading.value = false
  }
}

function showMsg(type: 'error' | 'success', text: string) { msg.type = type; msg.text = text }
function hideMsg() { msg.text = '' }

onMounted(() => {
  authStore.restoreSession()
  if (authStore.isAuthenticated && authStore.usuario?.cargo === 'administrador') {
    return navigateTo('/admin')
  }
  nextTick(() => emailRef.value?.focus())
})
</script>

<style scoped>
.h-13 { height: 3.25rem; }

.msg-enter-active,
.msg-leave-active { transition: all 0.2s ease; }
.msg-enter-from,
.msg-leave-to     { opacity: 0; transform: translateY(-6px); }
</style>
