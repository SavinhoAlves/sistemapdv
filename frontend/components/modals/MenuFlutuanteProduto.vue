<template>
  <Teleport to="body">
    <Transition name="pop">
      <div
        v-if="aberto"
        :style="posicao"
        class="fixed z-[9999] pointer-events-auto select-none"
      >
        <div class="relative w-52 bg-white dark:bg-neutral-900/95 backdrop-blur-2xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden shadow-2xl shadow-black/60">

          <!-- shimmer top -->
          <div class="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.15] to-transparent"></div>

          <!-- QUANTIDADE -->
          <div class="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-white/[0.06]">
            <span class="text-[9px] font-black uppercase tracking-widest text-gray-400 dark:text-white/30">Quantidade</span>
            <span class="text-3xl font-black text-gray-900 dark:text-white leading-none tabular-nums">{{ quantidade }}</span>
          </div>

          <!-- + / - -->
          <div class="grid grid-cols-2 divide-x divide-gray-100 dark:divide-white/[0.06]">
            <button
              @click="$emit('remover')"
              class="h-16 flex flex-col items-center justify-center gap-1.5 hover:bg-red-500/10 active:scale-95 transition-all text-gray-400 dark:text-white/50 hover:text-red-400"
            >
              <MinusCircle :size="24" stroke-width="1.5" />
              <span class="text-[9px] font-black uppercase tracking-wider">Remover</span>
            </button>

            <button
              @click="$emit('adicionar')"
              class="h-16 flex flex-col items-center justify-center gap-1.5 hover:bg-green-500/10 active:scale-95 transition-all text-gray-400 dark:text-white/50 hover:text-green-400"
            >
              <PlusCircle :size="24" stroke-width="1.5" />
              <span class="text-[9px] font-black uppercase tracking-wider">Adicionar</span>
            </button>
          </div>

          <!-- REIMPRIMIR FICHA -->
          <div class="border-t border-gray-100 dark:border-white/[0.06]">
            <button
              @click="$emit('reimprimir')"
              class="w-full h-11 flex items-center justify-center gap-2 hover:bg-blue-500/10 active:scale-95 transition-all text-gray-400 dark:text-white/40 hover:text-blue-400"
            >
              <Printer :size="15" stroke-width="1.5" />
              <span class="text-[10px] font-black uppercase tracking-wider">Reimprimir ficha</span>
            </button>
          </div>

        </div>

        <!-- SETA APONTANDO PARA A DIREITA -->
        <div
          :style="{ top: `${alturaFlecha}px` }"
          class="absolute right-[-7px] w-3.5 h-3.5 bg-white dark:bg-neutral-900 border-r border-t border-gray-200 dark:border-white/[0.08] rotate-45 shadow-sm"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PlusCircle, MinusCircle, Printer } from 'lucide-vue-next'

defineOptions({ inheritAttrs: false })

const LARGURA = 192 // w-48
const GAP     = 12

const props = defineProps<{
  aberto: boolean
  quantidade: number
  elementoAtivador?: HTMLElement | null
  posicaoManual?: { x: number; y: number } | null
}>()

defineEmits(['adicionar', 'remover', 'reimprimir'])

const ALTURA_CARD = 164 // header(52) + botoes(56) + reimprimir(44) + borders

const posicao = computed(() => {
  if (props.posicaoManual) {
    let top = props.posicaoManual.y - ALTURA_CARD / 2
    if (top < 8) top = 8
    if (top + ALTURA_CARD > window.innerHeight - 8) top = window.innerHeight - ALTURA_CARD - 8
    return {
      top:  `${top}px`,
      left: `${props.posicaoManual.x - LARGURA - GAP}px`
    }
  }

  if (!props.elementoAtivador) return {}

  const r = props.elementoAtivador.getBoundingClientRect()
  const centroBtn = r.top + r.height / 2
  let top = centroBtn - ALTURA_CARD / 2
  if (top < 8) top = 8

  return {
    top:  `${top}px`,
    left: `${r.left - LARGURA - GAP}px`
  }
})

const alturaFlecha = computed(() => {
  const top = parseFloat(posicao.value.top as string) || 0

  if (props.posicaoManual) {
    return props.posicaoManual.y - top - 7
  }

  if (!props.elementoAtivador) return 0
  const r = props.elementoAtivador.getBoundingClientRect()
  return r.top + r.height / 2 - top - 7
})
</script>

<style scoped>
.pop-enter-active {
  transition: opacity 0.15s ease, transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.pop-leave-active {
  transition: opacity 0.1s ease, transform 0.12s ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateX(8px) scale(0.95);
}
</style>
