<template>
  <!-- Sistema na nuvem: USB e rede direta não alcançam a impressora do restaurante -->
  <div class="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100 space-y-2">
    <p class="font-black flex items-center gap-2"><CloudOff :size="16" /> {{ tipo === 'windows' ? 'USB' : 'Rede' }} não funciona no sistema online</p>
    <p class="text-xs leading-relaxed">
      O sistema roda num servidor na nuvem, que não enxerga {{ tipo === 'windows' ? 'as impressoras instaladas no computador do restaurante' : 'o IP interno da impressora (192.168…)' }}.
      Use <b>Navegador</b>: a ficha sai na impressora instalada no computador do caixa, seja USB ou de rede.
    </p>
    <details class="text-xs">
      <summary class="cursor-pointer font-black">Imprimir direto, sem a janela de impressão</summary>
      <ol class="mt-2 ml-4 list-decimal space-y-1 leading-relaxed">
        <li>No Windows, deixe a térmica como <b>impressora padrão</b> (Configurações › Impressoras).</li>
        <li>Crie um atalho do Chrome com o destino:<br><code class="break-all select-all rounded bg-black/10 dark:bg-white/10 px-1">"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk-printing https://app.restaurantepdv.com.br</code></li>
        <li>Abra o sistema sempre por esse atalho, com o Chrome fechado antes. A ficha vai direto para a impressora padrão.</li>
      </ol>
    </details>
    <button v-if="podeTrocar" type="button" class="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-black" @click="emit('usarNavegador')">Usar Navegador</button>
  </div>
</template>

<script setup lang="ts">
import { CloudOff } from 'lucide-vue-next'

withDefaults(defineProps<{ tipo: 'rede' | 'windows'; podeTrocar?: boolean }>(), { podeTrocar: true })
const emit = defineEmits<{ usarNavegador: [] }>()
</script>
