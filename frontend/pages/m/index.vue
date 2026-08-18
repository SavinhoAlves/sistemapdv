<template>
  <div class="min-h-screen bg-neutral-950 flex items-center justify-center p-6">

    <!-- LOADING -->
    <div v-if="loading" class="flex flex-col items-center gap-4 text-center">
      <div class="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
        <Loader2 :size="28" class="animate-spin text-orange-400" />
      </div>
      <div>
        <p class="text-sm font-black text-white">Autenticando...</p>
        <p class="text-xs text-white/40 mt-1">Aguarde um momento</p>
      </div>
    </div>

    <!-- MOBILE DESATIVADO -->
    <div v-else-if="mobileDesativado" class="flex flex-col items-center gap-5 text-center max-w-xs">
      <div class="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
        <WifiOff :size="28" class="text-orange-400" />
      </div>
      <div>
        <h2 class="text-lg font-black text-white">Acesso mobile desativado</h2>
        <p class="text-sm text-white/50 mt-1.5 leading-relaxed">
          O administrador desativou o acesso mobile neste sistema.
        </p>
      </div>
      <div class="w-full h-px bg-white/[0.08]"></div>
      <p class="text-[11px] text-white/20">PDV Mobile · Restaurante</p>
    </div>

    <!-- CAIXA FECHADO -->
    <div v-else-if="caixaFechado" class="flex flex-col items-center gap-5 text-center max-w-xs">
      <div class="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
        <LockKeyhole :size="28" class="text-orange-400" />
      </div>
      <div>
        <h2 class="text-lg font-black text-white">Caixa fechado</h2>
        <p class="text-sm text-white/50 mt-1.5 leading-relaxed">
          Aguarde o administrador abrir o caixa para iniciar o plantão.
        </p>
      </div>
      <div class="w-full h-px bg-white/[0.08]"></div>
      <p class="text-[11px] text-white/20">PDV Mobile · Restaurante</p>
    </div>

    <!-- ERRO / SEM TOKEN -->
    <div v-else-if="erro" class="flex flex-col items-center gap-5 text-center max-w-xs">
      <div class="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertCircle :size="28" class="text-red-400" />
      </div>
      <div>
        <h2 class="text-lg font-black text-white">Acesso negado</h2>
        <p class="text-sm text-white/50 mt-1.5 leading-relaxed">
          {{ erro }}
        </p>
      </div>
      <p class="text-xs text-white/30 leading-relaxed">
        Peça ao administrador para gerar um novo QR Code e escaneie novamente.
      </p>
      <div class="w-full h-px bg-white/[0.08]"></div>
      <p class="text-[11px] text-white/20">PDV Mobile · Restaurante</p>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Loader2, AlertCircle, WifiOff, LockKeyhole } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useRuntimeConfig } from '#imports'

definePageMeta({ layout: false })

const route     = useRoute()
const authStore = useAuthStore()
const config    = useRuntimeConfig()

const loading          = ref(true)
const erro             = ref('')
const mobileDesativado = ref(false)
const caixaFechado     = ref(false)

async function primeiraRotaMobile(): Promise<string> {
  // Redireciona para a primeira página que o usuário tem permissão
  const podeMesas  = authStore.temPermissao('adicionarPedido') && authStore.temPermissao('abrirMesa')
  const podeVendas = authStore.temPermissao('adicionarPedido')
  if (podeMesas)  return '/m/mesas'
  if (podeVendas) return '/m/vendas'
  return '/m/mesas' // fallback
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
      authStore.setAuth(resp.token, resp.usuario)
      const dest = await primeiraRotaMobile()
      await navigateTo(dest)
    } else {
      throw new Error('Resposta inválida do servidor')
    }
  } catch (e: any) {
    loading.value = false
    const status = e?.status ?? e?.response?.status
    if (status === 403) {
      caixaFechado.value = true
    } else {
      erro.value = e?.data?.error || e?.message || 'Token inválido ou expirado'
    }
  }
})
</script>
