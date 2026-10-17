<template>
  <PlatformModal :model-value="modelValue" pequena centro @update:model-value="emit('resolved', false); emit('update:modelValue', false)">
    <div class="pf-confirm" style="padding:22px 0 4px">
      <span class="pf-ico" :class="type === 'danger' ? 'bad' : 'ok'" style="width:52px;height:52px;border-radius:16px">
        <AlertTriangle v-if="type === 'danger'" :size="22" />
        <CheckCircle2 v-else :size="22" />
      </span>
      <h2 style="font-size:20px">{{ title }}</h2>
      <p>{{ message }}</p>
    </div>
    <template #rodape>
      <button class="pf-btn" @click="emit('resolved', false); emit('update:modelValue', false)">Cancelar</button>
      <button class="pf-btn" :class="type === 'danger' ? 'd' : 'p'" @click="emit('resolved', true); emit('update:modelValue', false)">Confirmar</button>
    </template>
  </PlatformModal>
</template>

<script setup lang="ts">
import { AlertTriangle, CheckCircle2 } from 'lucide-vue-next'

defineProps<{
  modelValue: boolean
  title: string
  message: string
  type: 'danger' | 'success'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'resolved': [value: boolean]
}>()
</script>
