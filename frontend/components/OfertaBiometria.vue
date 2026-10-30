<template>
  <!-- Depois de um PIN ou senha certos: "Da próxima vez, usar o rosto / digital?" -->
  <Transition name="fade">
    <div v-if="ofertaBiometria" class="fixed inset-0 z-[99998] flex items-end sm:items-center justify-center bg-black/50 p-3">
      <div class="w-full max-w-md rounded-[28px] bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] shadow-2xl p-6 text-center">
        <div class="size-16 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
          <ScanFace :size="34" :stroke-width="1.6" />
        </div>
        <h2 class="mt-4 text-lg font-black text-gray-900 dark:text-white">Usar rosto ou digital?</h2>
        <p class="mt-2 text-sm text-gray-500 dark:text-white/50 leading-relaxed">
          Da próxima vez, entre no sistema e confirme ações com o rosto ou a digital deste aparelho,
          sem digitar senha nem PIN. A biometria não sai do aparelho.
        </p>
        <p v-if="erro" class="mt-3 text-sm font-bold text-red-500">{{ erro }}</p>
        <div class="mt-5 flex gap-3">
          <button
            type="button"
            class="flex-1 h-12 rounded-xl border border-gray-200 dark:border-white/10 font-black text-sm text-gray-500 dark:text-white/50"
            :disabled="ativando"
            @click="agoraNao"
          >
            Agora não
          </button>
          <button
            type="button"
            class="flex-1 h-12 rounded-xl bg-orange-500 text-white font-black text-sm active:scale-95 disabled:opacity-60"
            :disabled="ativando"
            @click="ativar"
          >
            {{ ativando ? 'Ativando…' : 'Ativar' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ScanFace } from 'lucide-vue-next'
import { useRuntimeConfig } from '#imports'
import { useAuthStore } from '~/stores/auth'
import { useToastStore } from '~/stores/toast'
import { criarBiometria, lembrarBiometria, marcarRecusa, mensagemDoErro, ofertaBiometria } from '~/lib/biometria'

const authStore = useAuthStore()
const toastStore = useToastStore()
const config = useRuntimeConfig()
const ativando = ref(false)
const erro = ref('')

watch(ofertaBiometria, (aberta) => { if (aberta) erro.value = '' })

const headers = () => (authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {})

async function ativar() {
  const id = authStore.usuario?.id
  if (!id) return
  ativando.value = true
  erro.value = ''
  try {
    const opcoes = await $fetch(`${config.public.apiUrl}/api/auth/biometria/opcoes-cadastro`, { method: 'POST', body: {}, headers: headers() })
    const resposta = await criarBiometria(opcoes)
    const r = await $fetch<{ credentialId: string }>(`${config.public.apiUrl}/api/auth/biometria/cadastrar`, {
      method: 'POST',
      body: { resposta, aparelho: navigator.userAgent },
      headers: headers(),
    })
    lembrarBiometria(id, r.credentialId)
    ofertaBiometria.value = false
    toastStore.success('Rosto / digital ativado neste aparelho')
  } catch (e: any) {
    erro.value = mensagemDoErro(e)
  } finally {
    ativando.value = false
  }
}

function agoraNao() {
  // Não pergunta de novo; dá para ativar pelo menu do perfil
  if (authStore.usuario?.id) marcarRecusa(authStore.usuario.id, true)
  ofertaBiometria.value = false
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }
</style>
