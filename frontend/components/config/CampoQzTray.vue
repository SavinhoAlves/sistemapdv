<template>
  <!-- USB pelo QZ Tray: a lista vem do computador do caixa, não do servidor -->
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Impressora deste computador (QZ Tray)</label>
      <button type="button" :disabled="detectando" class="h-7 px-3 rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-50 text-gray-600 dark:text-white/70 text-[10px] font-black flex items-center gap-1.5" @click="detectar">
        <Loader2 v-if="detectando" :size="10" class="animate-spin" /><Search v-else :size="10" />
        {{ detectando ? 'Procurando...' : 'Detectar' }}
      </button>
    </div>
    <div v-if="lista.length" class="flex flex-wrap gap-1.5">
      <button v-for="nome in lista" :key="nome" type="button" class="h-7 px-3 rounded-lg border text-xs font-bold transition-all"
        :class="modelValue === nome ? 'bg-orange-500 border-orange-500 text-white' : 'bg-gray-50 dark:bg-white/[0.04] border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:border-orange-400/50'"
        @click="emit('update:modelValue', nome)">{{ nome }}</button>
    </div>
    <input :value="modelValue" type="text" placeholder="Nome da impressora (ex.: POS-80)" class="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-sm outline-none focus:border-orange-500/70"
      @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)" />
    <p v-if="erro" class="text-xs font-bold text-red-500">{{ erro }}</p>
    <details class="text-[11px] text-gray-500 dark:text-white/45">
      <summary class="cursor-pointer font-black">Como instalar o QZ Tray no computador do caixa</summary>
      <ol class="mt-1.5 ml-4 list-decimal space-y-1 leading-relaxed">
        <li>Baixe em <a href="https://qz.io/download/" target="_blank" rel="noopener" class="underline">qz.io/download</a> e instale (ou rode o instalador oficial pelo PowerShell).</li>
        <li>Deixe o QZ Tray aberto: o ícone fica perto do relógio do Windows. Ele abre sozinho com o computador.</li>
        <li>Clique em <b>Detectar</b>, escolha a térmica e salve. Na primeira impressão, marque <b>Lembrar</b> e <b>Permitir</b>.</li>
      </ol>
    </details>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Loader2, Search } from 'lucide-vue-next'
import { listarImpressorasQz } from '~/lib/qz'

defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const lista = ref<string[]>([])
const detectando = ref(false)
const erro = ref('')
async function detectar() {
  erro.value = ''; detectando.value = true
  try {
    lista.value = await listarImpressorasQz()
    if (!lista.value.length) erro.value = 'O QZ Tray não achou impressoras instaladas neste computador.'
  } catch (e: any) { erro.value = e?.message || 'Não deu para falar com o QZ Tray' }
  finally { detectando.value = false }
}
</script>
