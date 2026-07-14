<template>
  <div class="min-h-screen bg-neutral-950 flex items-center justify-center p-6 relative overflow-hidden">

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
        <h1 class="text-2xl font-black text-white tracking-tight">Restaurante <span class="text-orange-400">PDV</span></h1>
      </div>

      <!-- Card -->
      <div class="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 shadow-2xl">

        <div v-if="carregando" class="flex flex-col items-center gap-3 py-4">
          <Loader2 :size="28" class="text-orange-500 animate-spin" />
          <p class="text-sm text-neutral-400">Verificando licença...</p>
        </div>

        <!-- Licença ativa -->
        <div v-else-if="status?.ativo" class="flex flex-col items-center gap-3">
          <ShieldCheck :size="36" class="text-green-400" />
          <p class="text-base font-black text-green-400">Licença ativa</p>
          <p class="text-xs text-neutral-400">
            Cliente: <span class="font-bold text-neutral-200">{{ status.cliente }}</span>
          </p>
          <p class="text-xs text-neutral-400">
            Válido até:
            <span class="font-bold text-neutral-200">{{ fmtData(status.dataVencimento) }}</span>
            <span class="ml-1 text-green-500 font-bold">({{ status.diasRestantes }} dia(s))</span>
          </p>
          <NuxtLink to="/"
            class="mt-3 h-10 px-6 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
            Ir para o sistema →
          </NuxtLink>
        </div>

        <!-- Licença suspensa remotamente pelo suporte -->
        <div v-else-if="status?.bloqueadoRemoto" class="flex flex-col items-center gap-3">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center bg-orange-500/10">
            <ShieldAlert :size="28" class="text-orange-400" />
          </div>

          <p class="text-base font-black text-orange-400">Licença suspensa pelo suporte</p>

          <div class="w-full mt-2 p-4 bg-neutral-800/60 rounded-2xl border border-neutral-700">
            <p class="text-xs text-neutral-400 leading-relaxed mb-3">
              O suporte suspendeu temporariamente o acesso desta instalação.
              Isso não se resolve digitando um código novo — fale com o
              suporte para reativar; o sistema libera sozinho em alguns
              minutos assim que for reativado do lado deles.
            </p>
            <a
              href="https://wa.me/5522997127142"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center justify-center gap-2 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <MessageCircle :size="16" />
              Falar com o suporte
            </a>
          </div>
        </div>

        <!-- Licença expirada / sem licença -->
        <div v-else class="flex flex-col items-center gap-3">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center"
            :class="status?.expirado ? 'bg-red-500/10' : 'bg-yellow-500/10'">
            <ShieldOff v-if="status?.expirado" :size="28" class="text-red-400" />
            <ShieldAlert v-else                 :size="28" class="text-yellow-400" />
          </div>

          <p class="text-base font-black" :class="status?.expirado ? 'text-red-400' : 'text-yellow-400'">
            {{ status?.expirado ? 'Licença expirada' : 'Sistema não licenciado' }}
          </p>

          <p v-if="status?.expirado" class="text-xs text-neutral-400">
            Venceu em
            <span class="font-bold text-red-400">{{ fmtData(status.dataVencimento) }}</span>
          </p>

          <div class="w-full mt-2 p-4 bg-neutral-800/60 rounded-2xl border border-neutral-700">
            <p class="text-xs text-neutral-400 leading-relaxed mb-3">
              Entre em contato com o suporte para renovar ou ativar sua licença.
            </p>
            <a
              href="https://wa.me/5522997127142"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center justify-center gap-2 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <MessageCircle :size="16" />
              Solicitar licença
            </a>
          </div>
        </div>

      </div>

      <p class="text-center text-neutral-700 text-xs mt-6">Versão 1.0 · Restaurante PDV</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { UtensilsCrossed, ShieldCheck, ShieldOff, ShieldAlert, Loader2, MessageCircle } from 'lucide-vue-next'

definePageMeta({ layout: false })

const config     = useRuntimeConfig()
const carregando = ref(true)
const status     = ref<any>(null)

function fmtData(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

onMounted(async () => {
  try {
    status.value = await $fetch<any>(`${config.public.apiUrl}/api/sistema/status-licenca`)
  } catch {
    status.value = { ativo: false, expirado: false, semLicenca: true }
  } finally {
    carregando.value = false
  }
})
</script>
