<template>
  <Teleport to="body">
    <Transition name="pop">
      <div
        v-if="aberto"
        :style="posicao"
        class="fixed z-[9999] pointer-events-auto select-none"
      >
        <div class="w-48 bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden">

          <!-- QUANTIDADE -->
          <div class="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
            <span class="text-[10px] font-black uppercase tracking-widest text-neutral-400">
              Quantidade
            </span>
            <span class="text-2xl font-black text-neutral-900 leading-none">
              {{ quantidade }}
            </span>
          </div>

          <!-- + / - -->
          <div class="grid grid-cols-2 divide-x divide-neutral-100">
            <button
              @click="$emit('remover')"
              class="h-14 flex flex-col items-center justify-center gap-1 hover:bg-orange-50 active:scale-95 transition-all text-orange-500"
            >
              <MinusCircle :size="22" stroke-width="1.5" />
              <span class="text-[9px] font-black uppercase tracking-wider">Remover</span>
            </button>

            <button
              @click="$emit('adicionar')"
              class="h-14 flex flex-col items-center justify-center gap-1 hover:bg-green-50 active:scale-95 transition-all text-green-600"
            >
              <PlusCircle :size="22" stroke-width="1.5" />
              <span class="text-[9px] font-black uppercase tracking-wider">Adicionar</span>
            </button>
          </div>

          <!-- REIMPRIMIR FICHA -->
          <div class="border-t border-neutral-100">
            <button
              @click="$emit('reimprimir')"
              class="w-full h-11 flex items-center justify-center gap-2 hover:bg-blue-50 active:scale-95 transition-all text-blue-600"
            >
              <Printer :size="16" stroke-width="1.5" />
              <span class="text-[10px] font-black uppercase tracking-wider">Reimprimir ficha</span>
            </button>
          </div>

        </div>

        <!-- SETA APONTANDO PARA A DIREITA -->
        <div
          :style="{ top: `${alturaFlecha}px` }"
          class="absolute right-[-7px] w-3.5 h-3.5 bg-white border-r border-t border-neutral-100 rotate-45 shadow-sm"
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
