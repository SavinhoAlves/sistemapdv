<template>
  <div class="min-h-screen flex">

    <!-- ══ PAINEL ESQUERDO — Branding admin ══ -->
    <div class="hidden lg:flex lg:w-[50%] xl:w-[55%] relative overflow-hidden bg-neutral-950 flex-col justify-between p-10 xl:p-14">

      <!-- Gradientes -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_15%_25%,rgba(147,51,234,0.14),transparent)]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_85%_75%,rgba(124,58,237,0.08),transparent)]"></div>

      <!-- Grid -->
      <div class="absolute inset-0 opacity-[0.025]"
        style="background-image: linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px); background-size: 40px 40px;">
      </div>

      <!-- Borda direita -->
      <div class="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent"></div>

      <!-- Topo -->
      <div class="relative z-10 flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <ShieldCheck :size="16" class="text-white" />
        </div>
        <div>
          <span class="text-white font-black tracking-tight block text-sm">Restaurante PDV</span>
          <span class="text-white/30 text-[10px] font-bold uppercase tracking-widest">Painel Administrativo</span>
        </div>
      </div>

      <!-- Centro -->
      <div class="relative z-10 space-y-6">
        <div class="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1">
          <AlertTriangle :size="12" class="text-red-400" />
          <span class="text-red-400 text-[11px] font-black uppercase tracking-widest">Acesso Restrito</span>
        </div>

        <h2 class="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
          Central de<br>
          <span class="text-purple-400">Administração</span>
        </h2>
        <p class="text-white/40 text-base leading-relaxed max-w-sm">
          Área exclusiva para administradores. Todas as ações são registradas e auditadas.
        </p>

        <div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 space-y-3.5">
          <p class="text-[11px] font-black uppercase tracking-widest text-white/30 mb-1">Recursos disponíveis</p>
          <div v-for="r in recursos" :key="r.label" class="flex items-center gap-3">
            <div class="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <component :is="r.icon" :size="12" class="text-purple-400" />
            </div>
            <p class="text-white/60 text-xs font-bold">{{ r.label }}</p>
          </div>
        </div>
      </div>

      <!-- Rodapé -->
      <div class="relative z-10">
        <p class="text-white/20 text-[11px]">© 2025 Restaurante PDV · Acesso monitorado</p>
      </div>
    </div>

    <!-- ══ PAINEL DIREITO — Formulário ══ -->
    <div class="flex-1 login-page-bg flex flex-col items-center justify-center p-6 relative overflow-hidden">

      <!-- Blob fundo -->
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-[370px] relative z-10">

        <!-- Logo mobile -->
        <div class="lg:hidden flex flex-col items-center mb-8">
          <div class="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-3">
            <ShieldCheck :size="20" class="text-white" />
          </div>
          <h1 class="text-xl font-black text-gray-900 dark:text-white">
            Painel <span class="text-purple-500">Admin</span>
          </h1>
        </div>

        <!-- Cabeçalho -->
        <div class="mb-7">
          <h2 class="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Acesso administrativo</h2>
          <p class="text-sm text-gray-500 dark:text-white/40 mt-1">Apenas administradores autorizados</p>
        </div>

        <!-- Badge de alerta -->
        <div class="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl px-4 py-3 mb-6">
          <AlertTriangle :size="14" class="text-amber-500 shrink-0" />
          <p class="text-amber-600 dark:text-amber-400 text-xs font-bold">
            Esta área é monitorada. Use credenciais de administrador.
          </p>
        </div>

        <!-- Alerta de resultado -->
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

        <!-- Formulário -->
        <form
          @submit.prevent="handleLogin"
          class="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-3xl p-7 shadow-sm space-y-5"
        >
          <div>
            <label for="admin-email" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
              E-mail administrativo
            </label>
            <div class="relative">
              <Mail :size="14" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25 pointer-events-none" />
              <input
                id="admin-email"
                ref="emailRef"
                name="email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                placeholder="admin@restaurante.com"
                class="w-full h-13 pl-11 pr-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 text-sm focus:outline-none focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/15 transition-all duration-200"
                required
              />
            </div>
          </div>

          <div>
            <label for="admin-senha" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
              Senha
            </label>
            <div class="relative">
              <Lock :size="14" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/25 pointer-events-none" />
              <input
                id="admin-senha"
                name="senha"
                v-model="form.senha"
                :type="showPass ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full h-13 pl-11 pr-12 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/20 text-sm focus:outline-none focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/15 transition-all duration-200"
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
            class="w-full h-13 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm uppercase tracking-widest transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer mt-2"
          >
            <Loader2 v-if="loading" :size="15" class="animate-spin" />
            <ShieldCheck v-else :size="15" />
            {{ loading ? 'Verificando...' : 'Entrar como admin' }}
          </button>
        </form>

        <!-- Link voltar -->
        <div class="mt-5 text-center">
          <NuxtLink
            to="/login"
            class="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60 transition-colors duration-200 font-bold"
          >
            <ArrowLeft :size="11" />
            Voltar ao login do sistema
          </NuxtLink>
        </div>

        <p class="text-center text-gray-400 dark:text-white/20 text-[11px] mt-4">
          Versão 1.0 · Restaurante PDV
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import {
  ShieldCheck, AlertTriangle, ArrowLeft,
  Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle,
  Users, BarChart2, Settings, Database
} from 'lucide-vue-next'
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

const recursos = [
  { icon: Users,     label: 'Gestão de funcionários e cargos' },
  { icon: BarChart2, label: 'Relatórios gerenciais completos' },
  { icon: Settings,  label: 'Configurações do sistema' },
  { icon: Database,  label: 'Banco de dados e backups' },
]

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
