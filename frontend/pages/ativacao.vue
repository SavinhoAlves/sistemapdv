<template>
  <div class="login-page-bg min-h-screen flex items-center justify-center p-6 relative overflow-hidden">

    <div class="absolute inset-0 pointer-events-none">
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-orange-500/10 rounded-full blur-3xl" />
      <div class="absolute bottom-0 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
    </div>

    <div class="w-full max-w-sm relative z-10 text-center">

      <!-- Logo -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-16 h-16 rounded-3xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4">
          <UtensilsCrossed :size="28" class="text-white" />
        </div>
        <h1 class="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Restaurante <span class="text-orange-400">PDV</span></h1>
      </div>

      <!-- Card -->
      <div class="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/[0.08] rounded-3xl p-8 shadow-2xl shadow-gray-200/50 dark:shadow-black/50">

        <div v-if="carregando" class="flex flex-col items-center gap-3 py-4">
          <Loader2 :size="28" class="text-orange-500 animate-spin" />
          <p class="text-sm text-gray-500 dark:text-white/40">Verificando licença...</p>
        </div>

        <!-- Licença ativa -->
        <div v-else-if="status?.ativo" class="flex flex-col items-center gap-3 w-full">
          <ShieldCheck :size="36" class="text-green-400" />
          <p class="text-base font-black text-green-500 dark:text-green-400">Licença ativa</p>
          <p class="text-xs text-gray-500 dark:text-white/40">
            Cliente: <span class="font-bold text-gray-700 dark:text-white/80">{{ status.cliente }}</span>
          </p>
          <p class="text-xs text-gray-500 dark:text-white/40">
            Válido até:
            <span class="font-bold text-gray-700 dark:text-white/80">{{ fmtData(status.dataVencimento) }}</span>
            <span class="ml-1 text-green-500 font-bold">({{ status.diasRestantes }} dia(s))</span>
          </p>
          <button @click="irParaSistema"
            class="mt-3 h-10 px-6 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
            Ir para o sistema →
          </button>

          <!-- Reativação com nova chave (colapsável) -->
          <div class="w-full mt-1">
            <button @click="mostrarReativacao = !mostrarReativacao"
              class="w-full text-xs text-gray-400 dark:text-white/25 hover:text-orange-500 transition-colors py-1">
              {{ mostrarReativacao ? '↑ Cancelar' : 'Reativar com nova chave' }}
            </button>
            <div v-if="mostrarReativacao" class="mt-2 space-y-2">
              <textarea v-model="chaveInput" rows="3"
                placeholder="Cole a nova chave aqui..."
                class="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-gray-700 dark:text-white/80 placeholder-gray-400 dark:placeholder-white/20 resize-none focus:outline-none focus:border-orange-500/50 transition-colors" />
              <p v-if="erroAtivacao" class="text-xs text-red-400 text-left">{{ erroAtivacao }}</p>
              <button @click="ativar" :disabled="!chaveInput.trim() || ativando"
                class="w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                <Loader2 v-if="ativando" :size="13" class="animate-spin" />
                <span>{{ ativando ? 'Ativando...' : 'Ativar nova licença' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Sistema suspenso pela central -->
        <div v-else-if="status?.suspenso" class="flex flex-col items-center gap-3">
          <div class="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <ShieldOff :size="28" class="text-red-400" />
          </div>
          <p class="text-base font-black text-red-400">Sistema suspenso</p>
          <div class="w-full mt-2 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
            <p class="text-xs text-gray-500 dark:text-white/40 leading-relaxed">
              O acesso a este sistema foi suspenso. Entre em contato com o suporte.
            </p>
            <p class="mt-3 text-sm font-black text-orange-400">suporte.savioalves@gmail.com</p>
          </div>
          <button @click="verificarNovamente" :disabled="verificando"
            class="mt-1 h-10 px-5 rounded-2xl border border-gray-200 dark:border-white/10 hover:border-orange-500/40 text-gray-500 dark:text-white/40 hover:text-orange-500 text-xs font-black transition-all active:scale-95 flex items-center gap-2 disabled:opacity-40">
            <Loader2 v-if="verificando" :size="13" class="animate-spin" />
            <RefreshCw v-else :size="13" />
            {{ verificando ? 'Verificando…' : 'Verificar novamente' }}
          </button>
        </div>

        <!-- Licença revogada pela central (cliente excluído) -->
        <div v-else-if="status?.revogado" class="flex flex-col items-center gap-3 w-full">
          <div class="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center">
            <ShieldOff :size="28" class="text-orange-400" />
          </div>
          <p class="text-base font-black text-orange-400">Licença revogada</p>
          <div class="w-full mt-2 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
            <p class="text-xs text-gray-500 dark:text-white/40 leading-relaxed">
              Esta licença foi revogada. Entre em contato com o suporte para obter uma nova chave de ativação.
            </p>
            <p class="mt-3 text-sm font-black text-orange-400">suporte.savioalves@gmail.com</p>
          </div>
          <div class="w-full mt-1 space-y-2">
            <p class="text-xs text-gray-500 dark:text-white/30 text-left">Nova chave de ativação:</p>
            <textarea v-model="chaveInput" rows="3"
              placeholder="Cole a nova chave aqui..."
              class="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-gray-700 dark:text-white/80 placeholder-gray-400 dark:placeholder-white/20 resize-none focus:outline-none focus:border-orange-500/50 transition-colors" />
            <p v-if="erroAtivacao" class="text-xs text-red-400 text-left">{{ erroAtivacao }}</p>
            <button @click="ativar" :disabled="!chaveInput.trim() || ativando"
              class="w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              <Loader2 v-if="ativando" :size="13" class="animate-spin" />
              <span>{{ ativando ? 'Ativando...' : 'Ativar nova licença' }}</span>
            </button>
          </div>
        </div>

        <!-- Licença expirada / sem licença -->
        <div v-else class="flex flex-col items-center gap-3 w-full">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center"
            :class="status?.expirado ? 'bg-red-500/10' : 'bg-yellow-500/10'">
            <ShieldOff v-if="status?.expirado" :size="28" class="text-red-400" />
            <ShieldAlert v-else                 :size="28" class="text-yellow-400" />
          </div>

          <p class="text-base font-black" :class="status?.expirado ? 'text-red-400' : 'text-yellow-500 dark:text-yellow-400'">
            {{ status?.expirado ? 'Licença expirada' : 'Sistema não licenciado' }}
          </p>

          <p v-if="status?.expirado" class="text-xs text-gray-500 dark:text-white/40">
            Venceu em
            <span class="font-bold text-red-400">{{ fmtData(status.dataVencimento) }}</span>
          </p>

          <div class="w-full mt-2 p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
            <p class="text-xs text-gray-500 dark:text-white/40 leading-relaxed">
              Entre em contato com o suporte para renovar ou ativar sua licença.
            </p>
            <p class="mt-3 text-sm font-black text-orange-400">suporte.savioalves@gmail.com</p>
          </div>

          <!-- Ativação manual com chave -->
          <div class="w-full mt-1 space-y-2">
            <p class="text-xs text-gray-500 dark:text-white/30 text-left">Tem uma chave de ativação? Cole abaixo:</p>
            <textarea v-model="chaveInput" rows="3"
              placeholder="Cole a chave aqui..."
              class="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-gray-700 dark:text-white/80 placeholder-gray-400 dark:placeholder-white/20 resize-none focus:outline-none focus:border-orange-500/50 transition-colors" />
            <p v-if="erroAtivacao" class="text-xs text-red-400 text-left">{{ erroAtivacao }}</p>
            <button @click="ativar" :disabled="!chaveInput.trim() || ativando"
              class="w-full h-10 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
              <Loader2 v-if="ativando" :size="13" class="animate-spin" />
              <span>{{ ativando ? 'Ativando...' : 'Ativar licença' }}</span>
            </button>
          </div>
        </div>

      </div>

      <!-- Escape para o painel de gestão -->
      <NuxtLink :to="temTokenPlataforma ? '/platform' : '/platform/login'"
        class="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400 dark:text-white/25 hover:text-orange-400 transition-colors">
        <LayoutDashboard :size="12" />
        Acessar Central de Gestão
      </NuxtLink>

      <p class="text-center text-gray-400 dark:text-white/25 text-xs mt-4">Versão 1.0 · Restaurante PDV</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { UtensilsCrossed, ShieldCheck, ShieldOff, ShieldAlert, Loader2, RefreshCw, LayoutDashboard } from 'lucide-vue-next'
import { useToastStore } from '../stores/toast'

definePageMeta({ layout: false })

const config     = useRuntimeConfig()
const toast      = useToastStore()
const temTokenPlataforma = ref(false)
const carregando   = ref(true)
const status       = ref<any>(null)
const chaveInput   = ref('')
const ativando     = ref(false)
const erroAtivacao = ref('')
const verificando       = ref(false)
const mostrarReativacao = ref(false)

function irParaSistema() {
  const cache = useState<{ valido: boolean | null; ts: number }>(
    'licenca_cache',
    () => ({ valido: null, ts: 0 })
  )
  cache.value = { valido: true, ts: Date.now() }
  useRouter().push('/')
}

function fmtData(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

async function carregarStatus() {
  const slug = (config.public as any).tenantSlug as string
  try {
    status.value = await $fetch<any>(`${config.public.apiUrl}/api/sistema/status-licenca`, { query: { slug } })
  } catch {
    status.value = { ativo: false, expirado: false, semLicenca: true }
  }
}

async function verificarNovamente() {
  verificando.value = true
  try {
    await carregarStatus()
    if (!status.value?.suspenso) useRouter().push('/')
  } finally {
    verificando.value = false
  }
}

async function ativar() {
  erroAtivacao.value = ''
  ativando.value = true
  try {
    const res = await $fetch<any>(`${config.public.apiUrl}/api/sistema/ativar`, {
      method: 'POST',
      body: { chave: chaveInput.value.trim() }
    })
    if (res.success) {
      toast.success('Licença ativada!', `Sistema ativado para "${res.cliente}" até ${fmtData(res.dataVencimento)}`)
      chaveInput.value = ''
      carregando.value = true
      await carregarStatus()
    } else {
      erroAtivacao.value = res.message || 'Erro ao ativar'
    }
  } catch (err: any) {
    erroAtivacao.value = err?.data?.message || err?.message || 'Erro ao ativar licença'
  } finally {
    ativando.value = false
    carregando.value = false
  }
}

onMounted(async () => {
  temTokenPlataforma.value = !!localStorage.getItem('platform_token')
  await carregarStatus()
  carregando.value = false
})
</script>
