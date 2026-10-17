<template>
  <Teleport to="body">
    <Transition name="pf-fade">
      <div
        v-if="modelValue"
        class="pf-portal pf-veu"
        :style="centro ? 'align-items:center' : undefined"
        @click.self="fechar"
      >
        <div class="pf-modal" :class="{ sm: pequena }" role="dialog" aria-modal="true" :aria-labelledby="idTitulo">
          <div v-if="titulo" class="pf-modal-h">
            <span v-if="$slots.icone" class="pf-av" style="width:42px;height:42px"><slot name="icone" /></span>
            <div style="min-width:0">
              <h2 :id="idTitulo">{{ titulo }}</h2>
              <small v-if="subtitulo" style="color:var(--pf-muted)">{{ subtitulo }}</small>
            </div>
            <button type="button" class="pf-ib" aria-label="Fechar" @click="fechar"><X :size="18" /></button>
          </div>
          <div class="pf-modal-b"><slot /></div>
          <div v-if="$slots.rodape" class="pf-modal-f"><slot name="rodape" /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch, onUnmounted, useId } from 'vue'
import { X } from 'lucide-vue-next'

/**
 * Janela da plataforma no visual "Central": véu, cartão claro/escuro pelos
 * tokens do platform.css (.pf-portal) e Esc para fechar.
 */
const props = defineProps<{
  modelValue: boolean
  titulo?: string
  subtitulo?: string
  pequena?: boolean
  centro?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; fechar: [] }>()

const idTitulo = `pf-modal-${useId()}`

function fechar() {
  emit('update:modelValue', false)
  emit('fechar')
}

function onKey(e: KeyboardEvent) { if (e.key === 'Escape') fechar() }
watch(() => props.modelValue, aberto => {
  if (aberto) document.addEventListener('keydown', onKey)
  else document.removeEventListener('keydown', onKey)
}, { immediate: true })
onUnmounted(() => document.removeEventListener('keydown', onKey))
</script>

<style>
.pf-fade-enter-active, .pf-fade-leave-active { transition: opacity .15s; }
.pf-fade-enter-from, .pf-fade-leave-to { opacity: 0; }
</style>
