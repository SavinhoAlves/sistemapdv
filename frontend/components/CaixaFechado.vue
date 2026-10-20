<template>
  <!-- Cobre só a área de conteúdo (o pai precisa de position: relative):
       sidebar e navbar seguem livres para abrir o caixa pelo botão da barra. -->
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="caixaStore.inicializado && !caixaStore.aberto"
      class="absolute inset-0 z-30 flex flex-col items-center justify-center backdrop-blur-[6px]"
      style="background: color-mix(in srgb, var(--sup-fundo) 94%, transparent)"
    >
      <div class="flex flex-col items-center gap-4 text-center px-6 max-w-xs">
        <div class="w-16 h-16 rounded-[14px] bg-[var(--sup-cartao)] border border-[var(--linha)] flex items-center justify-center">
          <LockKeyhole :size="28" class="text-[var(--txt-2)]" />
        </div>
        <div>
          <p class="text-lg font-bold text-[var(--txt)] mb-1">Caixa fechado</p>
          <p class="text-[15px] text-[var(--txt-2)] leading-relaxed">
            {{ podeAbrir
              ? `Abra o caixa pelo botão na barra superior para ${acao}.`
              : `Peça ao responsável para abrir o caixa antes de ${acao}.` }}
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LockKeyhole } from 'lucide-vue-next'
import { useCaixaStore } from '~/stores/caixa'
import { useAuthStore } from '~/stores/auth'

/** acao: o que a página libera com o caixa aberto, ex.: "iniciar as vendas". */
withDefaults(defineProps<{ acao?: string }>(), { acao: 'liberar as operações' })

const caixaStore = useCaixaStore()
const authStore  = useAuthStore()
const podeAbrir  = computed(() => authStore.temPermissao('gerenciarCaixa'))
</script>
