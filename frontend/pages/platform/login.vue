<template>
  <div class="auth auth--plataforma">

    <header class="auth__barra">
      <div class="auth__marca">
        <span class="auth__marca-icone"><Globe :size="18" /></span>
        <span>Plataforma Central</span>
      </div>
      <div class="auth__relogio">
        <span class="auth__hora pdv-valor">{{ hora }}</span>
        <span class="auth__data">{{ data }}</span>
      </div>
    </header>

    <main class="auth__centro">
      <div class="auth__caixa">

        <div class="auth__saudacao">
          <span class="auth__online"><i></i>Área restrita</span>
          <h1>{{ saudacao }}!</h1>
          <p>Acesso exclusivo de super administrador.</p>
        </div>

        <div class="auth__cartao">
          <Transition name="msg">
            <div v-if="msg.text" class="auth__alerta" :class="`auth__alerta--${msg.type}`" role="alert">
              <CheckCircle2 v-if="msg.type === 'success'" :size="16" />
              <AlertCircle v-else :size="16" />
              {{ msg.text }}
            </div>
          </Transition>

          <form class="auth__form" @submit.prevent="handleLogin">
            <div class="auth__campo">
              <label for="plat-email" class="pdv-rotulo">E-mail</label>
              <div class="auth__input">
                <Mail :size="18" />
                <input id="plat-email" ref="emailRef" v-model="form.email" class="pdv-campo" type="email"
                  placeholder="admin@plataforma.com" autocomplete="email" required />
              </div>
            </div>

            <div class="auth__campo">
              <label for="plat-senha" class="pdv-rotulo">Senha</label>
              <div class="auth__input">
                <Lock :size="18" />
                <input id="plat-senha" name="senha" v-model="form.senha" class="pdv-campo"
                  :type="showPass ? 'text' : 'password'" placeholder="••••••••" autocomplete="current-password" required />
                <button type="button" class="auth__olho" :aria-label="showPass ? 'Ocultar senha' : 'Mostrar senha'" @click="showPass = !showPass">
                  <Eye v-if="!showPass" :size="18" />
                  <EyeOff v-else :size="18" />
                </button>
              </div>
            </div>

            <button type="submit" :disabled="loading" class="pdv-botao pdv-botao--acao pdv-botao--confirmar w-full">
              <Loader2 v-if="loading" :size="20" class="animate-spin" />
              <ShieldCheck v-else :size="20" />
              {{ loading ? 'Verificando…' : 'Entrar na plataforma' }}
            </button>
          </form>
        </div>
      </div>
    </main>

    <footer class="auth__rodape">
      <span>Versão 1.0</span>
      <NuxtLink to="/login"><ArrowLeft :size="14" /> Voltar ao PDV</NuxtLink>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { Globe, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import { useRelogio } from '~/composables/useRelogio'

definePageMeta({ layout: false })

const platformAuth  = usePlatformAuthStore()
const runtimeConfig = useRuntimeConfig()
const emailRef      = ref()
const loading       = ref(false)
const showPass      = ref(false)
const msg           = reactive({ text: '', type: 'error' as 'error' | 'success' })
const form          = reactive({ email: '', senha: '' })

const { hora, data, saudacao } = useRelogio()

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
  nextTick(() => emailRef.value?.focus())
})
</script>

<style scoped>
.msg-enter-active, .msg-leave-active { transition: opacity var(--tempo-folha) var(--curva); }
.msg-enter-from, .msg-leave-to { opacity: 0; }
</style>
