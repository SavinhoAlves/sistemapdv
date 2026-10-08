<template>
  <UModal :model-value="modelValue" :ui="{ width: 'max-w-sm', background: 'bg-[#0e0d18]', ring: 'ring-1 ring-white/[0.09]', rounded: 'rounded-2xl' }">
    <UCard :ui="{ ring: '', background: 'bg-transparent', body: { padding: 'p-7' }, footer: { padding: 'px-6 pb-6 pt-0' } }">
      <div class="flex flex-col items-center text-center gap-5">
        <div :class="['size-14 rounded-2xl flex items-center justify-center shadow-xl',
          type === 'danger' ? 'bg-gradient-to-br from-red-600 to-red-900 shadow-red-900/40' : 'bg-gradient-to-br from-emerald-600 to-emerald-900 shadow-emerald-900/40']">
          <UIcon :name="type === 'danger' ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle-2'" class="text-white size-6" />
        </div>
        <div>
          <h3 class="text-base font-bold text-white leading-tight text-balance">{{ title }}</h3>
          <p class="text-sm text-white/40 mt-2 leading-relaxed text-pretty">{{ message }}</p>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-2">
          <UButton color="gray" variant="ghost" block :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-sm' }"
            @click="emit('resolved', false); emit('update:modelValue', false)">Cancelar</UButton>
          <UButton :color="type === 'danger' ? 'red' : 'green'" block :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-sm' }"
            @click="emit('resolved', true); emit('update:modelValue', false)">Confirmar</UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
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
