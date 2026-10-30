<template>
  <div class="eq m-st">
    <!-- LOADING -->
    <div v-if="loading" class="m-st-caixa" role="status">
      <span class="m-st-ic m-st-ic-marca"><Loader2 :size="30" class="animate-spin" /></span>
      <h2 class="eq-titulo">Entrando…</h2>
      <p>Conferindo o seu acesso.</p>
    </div>

    <!-- MOBILE DESATIVADO -->
    <div v-else-if="mobileDesativado" class="m-st-caixa">
      <span class="m-st-ic"><WifiOff :size="30" /></span>
      <h2 class="eq-titulo">Acesso pelo celular desligado</h2>
      <p>O administrador desligou o acesso pelo celular neste restaurante.</p>
    </div>

    <!-- CAIXA FECHADO -->
    <div v-else-if="caixaFechado" class="m-st-caixa">
      <span class="m-st-ic m-st-ic-marca"><LockKeyhole :size="30" /></span>
      <h2 class="eq-titulo">Caixa fechado</h2>
      <p>Aguarde o administrador abrir o caixa para começar o turno.</p>
      <button v-if="app" class="eq-btn eq-btn-secundario m-st-btn" @click="voltar">Voltar ao início</button>
    </div>

    <!-- ERRO / SEM TOKEN -->
    <div v-else-if="erro" class="m-st-caixa">
      <span class="m-st-ic m-st-ic-erro"><AlertCircle :size="30" /></span>
      <h2 class="eq-titulo">Acesso negado</h2>
      <p>{{ erro }}</p>
      <p class="m-st-dica">Peça ao administrador para gerar um novo QR code e leia de novo.</p>
      <button v-if="app" class="eq-btn eq-btn-secundario m-st-btn" @click="voltar">Voltar ao início</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Loader2, AlertCircle, WifiOff, LockKeyhole } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useRuntimeConfig } from '#imports'
import { noApp } from '~/lib/app'
import { setTenantSlug } from '~/composables/useTenantSlug'

definePageMeta({ layout: false })
useHead({ meta: [{ name: 'theme-color', content: '#0A0A0B' }] })

const route     = useRoute()
const authStore = useAuthStore()
const config    = useRuntimeConfig()

const loading          = ref(true)
const erro             = ref('')
const mobileDesativado = ref(false)
const caixaFechado     = ref(false)
const app              = noApp()
// No app, volta para a tela de acesso (ler outro QR ou entrar com senha)
function voltar() { authStore.logout() }

function getModoVenda(): string {
  if (authStore.usuario?.cargo === 'administrador') return 'ambos'
  return (authStore.usuario?.permissoes?.modo_venda as string) || 'ambos'
}

async function primeiraRotaMobile(): Promise<string> {
  if (authStore.usuario?.cargo === 'entregador') return '/entregador'
  const podeAdicionar = authStore.temPermissao('adicionarPedido')
  const modo = getModoVenda()
  if (podeAdicionar && (modo === 'mesas' || modo === 'ambos'))  return '/m/mesas'
  if (podeAdicionar && (modo === 'direta' || modo === 'ambos')) return '/m/vendas'
  return '/m/mesas'
}

onMounted(async () => {
  const token = route.query.t as string | undefined

  // Se já autenticado sem token na URL, redireciona direto
  if (!token && authStore.isAuthenticated) {
    const dest = await primeiraRotaMobile()
    await navigateTo(dest)
    return
  }

  // Verifica se mobile está habilitado antes de qualquer coisa
  try {
    const status = await $fetch<{ ativo: boolean }>(`${config.public.apiUrl}/api/auth/mobile-status`)
    if (!status.ativo) {
      loading.value = false
      mobileDesativado.value = true
      return
    }
  } catch { /* fail-open se não conseguir verificar */ }

  if (!token) {
    loading.value = false
    erro.value = 'Nenhum token encontrado. O QR code pode estar inválido ou expirado.'
    return
  }

  // Autentica via token mobile
  try {
    const resp = await $fetch<any>(`${config.public.apiUrl}/api/auth/mobile`, {
      method: 'POST',
      body: { token }
    })

    if (resp?.token && resp?.usuario) {
      // Vindo do login por código e senha (app), mantém a renovação da sessão
      // Restaurante do QR fica no aparelho (licença e crachá dependem dele)
      if (resp.slug) setTenantSlug(resp.slug)
      const mesmo = authStore.usuario?.id === resp.usuario.id
      authStore.setAuth(resp.token, { ...resp.usuario, perfil_id: resp.usuario.perfilId ?? null }, mesmo ? authStore.refreshToken : null)
      const dest = await primeiraRotaMobile()
      await navigateTo(dest)
    } else {
      throw new Error('Resposta inválida do servidor')
    }
  } catch (e: any) {
    loading.value = false
    const status = e?.status ?? e?.response?.status
    const msg = e?.data?.error || ''
    if (status === 403 && (!msg || /caixa/i.test(msg))) {
      caixaFechado.value = true
    } else if (status === 403) {
      erro.value = msg
    } else {
      erro.value = e?.data?.error || e?.message || 'Token inválido ou expirado'
    }
  }
})
</script>

<style scoped>
.m-st { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom)); }
.m-st-caixa { width: 100%; max-width: 340px; display: flex; flex-direction: column; align-items: flex-start; }
.m-st-ic { width: 72px; height: 72px; border-radius: 24px; display: grid; place-items: center; background: var(--eq-cartao); border: 1px solid var(--eq-linha); color: var(--eq-mudo); }
.m-st-ic-marca { background: var(--eq-marca); border-color: var(--eq-marca); color: var(--eq-sobre-marca); }
.m-st-ic-erro { background: rgba(248, 113, 113, .12); border-color: rgba(248, 113, 113, .25); color: var(--eq-perigo); }
.m-st h2 { margin: 22px 0 0; font-size: 34px; }
.m-st p { margin: 10px 0 0; font: 500 16px/1.45 var(--eq-texto); color: var(--eq-mudo); }
.m-st .m-st-dica { font-size: 14px; color: var(--eq-apagado); }
.m-st-btn { width: 100%; margin-top: 28px; }
</style>
