<template>
  <!-- QR Code Pix com o valor e o "copia e cola" -->
  <div class="grid justify-items-center gap-3 text-center">
    <img v-if="imagem" :src="imagem" alt="QR Code Pix" class="size-56 rounded-xl bg-white p-2" />
    <p v-if="valor" class="text-2xl font-extrabold tabular-nums">{{ valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }}</p>
    <p class="text-xs opacity-70">Recebedor: {{ nome }}</p>
    <button type="button" class="inline-flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-bold" :class="classeBotao" @click="copiar">
      <component :is="copiado ? Check : Copy" :size="16" /> {{ copiado ? 'Código copiado' : 'Copiar código Pix' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import QRCode from 'qrcode'
import { Copy, Check } from 'lucide-vue-next'
import { payloadPix } from '~/lib/pix'

const props = withDefaults(defineProps<{ chave: string; nome: string; cidade: string; valor?: number; txid?: string; classeBotao?: string }>(), {
  classeBotao: 'border-current/20',
})
const codigo = computed(() => payloadPix({ chave: props.chave, nome: props.nome, cidade: props.cidade, valor: props.valor, txid: props.txid }))
const imagem = ref('')
watch(codigo, async (c) => { imagem.value = await QRCode.toDataURL(c, { margin: 1, width: 448, errorCorrectionLevel: 'M' }) }, { immediate: true })

const copiado = ref(false)
async function copiar() {
  try { await navigator.clipboard.writeText(codigo.value); copiado.value = true; setTimeout(() => (copiado.value = false), 2000) } catch {}
}
</script>
