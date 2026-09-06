<template>
  <div class="min-h-dvh flex">

    <!-- ══ PAINEL ESQUERDO ══ -->
    <div class="hidden lg:flex lg:w-[50%] xl:w-[55%] relative overflow-hidden bg-neutral-950 flex-col justify-between p-10 xl:p-14">

      <div class="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_15%_25%,rgba(139,92,246,0.18),transparent)]"></div>
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_85%_75%,rgba(124,58,237,0.10),transparent)]"></div>
      <div class="absolute inset-0 opacity-[0.025]"
        style="background-image: linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px); background-size: 40px 40px;">
      </div>
      <div class="absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent"></div>

      <!-- Topo -->
      <div class="relative z-10 flex items-center gap-3">
        <div class="size-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <UIcon name="i-lucide-globe" class="text-white size-4" />
        </div>
        <div>
          <span class="text-white font-black tracking-tight block text-sm">Plataforma Central</span>
          <span class="text-white/30 text-[10px] font-bold uppercase tracking-widest">Super Administrador</span>
        </div>
      </div>

      <!-- Centro -->
      <div class="relative z-10 space-y-6">
        <UBadge color="violet" variant="soft" size="sm" class="gap-1.5">
          <UIcon name="i-lucide-shield" class="w-3 h-3" />
          Acesso de Plataforma
        </UBadge>

        <h2 class="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight text-balance">
          Gestão de<br>
          <span class="text-violet-400">Restaurantes</span>
        </h2>
        <p class="text-white/40 text-base leading-relaxed max-w-sm text-pretty">
          Controle centralizado de todos os tenants, features e acessos do sistema PDV.
        </p>

        <UCard class="bg-white/[0.03] border border-white/[0.06] ring-0 shadow-none">
          <template #header>
            <p class="text-[11px] font-black uppercase tracking-widest text-white/30">Recursos disponíveis</p>
          </template>
          <div class="space-y-3">
            <div v-for="r in recursos" :key="r.label" class="flex items-center gap-3">
              <div class="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                <UIcon :name="r.icon" class="text-violet-400 w-3 h-3" />
              </div>
              <p class="text-white/60 text-xs font-bold">{{ r.label }}</p>
            </div>
          </div>
        </UCard>
      </div>

      <div class="relative z-10">
        <p class="text-white/20 text-[11px]">© 2025 Restaurante PDV · Plataforma Central</p>
      </div>
    </div>

    <!-- ══ PAINEL DIREITO — Formulário ══ -->
    <div class="flex-1 bg-gray-50 dark:bg-neutral-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">

      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div class="w-full max-w-[370px] relative z-10">

        <!-- Logo mobile -->
        <div class="lg:hidden flex flex-col items-center mb-8">
          <div class="size-12 rounded-2xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30 mb-3">
            <UIcon name="i-lucide-globe" class="text-white size-5" />
          </div>
          <h1 class="text-xl font-black text-gray-900 dark:text-white text-balance">
            Plataforma <span class="text-violet-500">Central</span>
          </h1>
        </div>

        <div class="mb-7">
          <h2 class="text-2xl font-black text-gray-900 dark:text-white tracking-tight text-balance">Acesso de plataforma</h2>
          <p class="text-sm text-gray-500 dark:text-white/40 mt-1 text-pretty">Credenciais de super administrador</p>
        </div>

        <!-- Alerta -->
        <Transition name="msg">
          <UAlert
            v-if="msg.text"
            :color="msg.type === 'success' ? 'green' : 'red'"
            :icon="msg.type === 'success' ? 'i-lucide-check-circle-2' : 'i-lucide-alert-circle'"
            :description="msg.text"
            variant="soft"
            class="mb-5"
          />
        </Transition>

        <!-- Formulário -->
        <UCard class="shadow-sm">
          <form @submit.prevent="handleLogin" class="space-y-5">
            <UFormGroup label="E-mail" name="email" required>
              <UInput
                ref="emailRef"
                v-model="form.email"
                type="email"
                placeholder="admin@plataforma.com"
                autocomplete="email"
                icon="i-lucide-mail"
                size="lg"
                :ui="{ rounded: 'rounded-2xl' }"
                required
              />
            </UFormGroup>

            <UFormGroup label="Senha" name="senha" required>
              <UInput
                v-model="form.senha"
                :type="showPass ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                icon="i-lucide-lock"
                size="lg"
                :ui="{ rounded: 'rounded-2xl' }"
                required
              >
                <template #trailing>
                  <UButton
                    :icon="showPass ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    color="gray"
                    variant="link"
                    :padded="false"
                    @click="showPass = !showPass"
                  />
                </template>
              </UInput>
            </UFormGroup>

            <UButton
              type="submit"
              color="violet"
              block
              size="lg"
              :loading="loading"
              :icon="loading ? '' : 'i-lucide-globe'"
              :ui="{ rounded: 'rounded-2xl', font: 'font-black tracking-widest uppercase text-sm' }"
              class="mt-2 shadow-lg shadow-violet-500/25"
            >
              {{ loading ? 'Verificando...' : 'Entrar na plataforma' }}
            </UButton>
          </form>
        </UCard>

        <p class="text-center text-gray-400 dark:text-white/20 text-[11px] mt-5">
          Versão 1.0 · Plataforma Central PDV
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { usePlatformAuthStore } from '~/stores/platformAuth'

definePageMeta({ layout: false })

const platformAuth  = usePlatformAuthStore()
const runtimeConfig = useRuntimeConfig()
const emailRef      = ref()
const loading       = ref(false)
const showPass      = ref(false)
const msg           = reactive({ text: '', type: 'error' as 'error' | 'success' })
const form          = reactive({ email: '', senha: '' })

const recursos = [
  { icon: 'i-lucide-building-2',   label: 'Gestão de restaurantes e tenants' },
  { icon: 'i-lucide-credit-card',  label: 'Controle de RFID por tenant' },
  { icon: 'i-lucide-toggle-right', label: 'Ativação de features pagas' },
]

async function handleLogin() {
  if (!form.email || !form.senha) return showMsg('error', 'Preencha todos os campos')
  loading.value = true
  msg.text = ''
  try {
    const baseUrl = (runtimeConfig.public as any).apiUrl as string
    const resp = await fetch(`${baseUrl}/api/platform/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, senha: form.senha }),
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error || 'Credenciais inválidas')

    const token = data.accessToken
    const user  = data.user
    if (!token || !user) throw new Error('Resposta inválida do servidor')

    if (data.refreshToken) {
      localStorage.setItem('platform_refresh_token', data.refreshToken)
    }
    platformAuth.set(token, user)
    showMsg('success', `Bem-vindo, ${user.nome}!`)
    setTimeout(() => navigateTo('/platform'), 600)
  } catch (e: any) {
    showMsg('error', e?.message || 'Credenciais inválidas')
  } finally {
    loading.value = false
  }
}

function showMsg(type: 'error' | 'success', text: string) { msg.type = type; msg.text = text }

onMounted(() => {
  platformAuth.restore()
  if (platformAuth.isAuthenticated) return navigateTo('/platform')
  nextTick(() => emailRef.value?.input?.focus())
})
</script>

<style scoped>
.msg-enter-active, .msg-leave-active { transition: all 0.2s ease; }
.msg-enter-from, .msg-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
