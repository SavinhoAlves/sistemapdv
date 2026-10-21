<template>
  <Teleport to="body">
    <div v-if="funcionario" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="fechar">
      <div class="bg-white dark:bg-[#161b26] border border-gray-200 dark:border-white/[0.08] rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center" role="dialog" aria-modal="true" aria-label="QR de acesso pelo celular">
        <div class="flex items-center justify-between mb-1">
          <h3 class="font-black text-gray-900 dark:text-white">Acesso pelo celular</h3>
          <button class="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] flex items-center justify-center text-gray-400" aria-label="Fechar" @click="fechar"><X :size="16" /></button>
        </div>
        <p class="text-sm text-gray-500 dark:text-white/50 mb-4">{{ funcionario.nome }}</p>

        <div v-if="gerando" class="flex items-center justify-center h-56"><Loader2 :size="28" class="animate-spin text-orange-500" /></div>

        <div v-else-if="erro" class="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-left">
          <p class="text-sm font-black text-amber-800 dark:text-amber-300">Não dá para liberar agora</p>
          <p class="text-xs text-amber-800/80 dark:text-amber-200/80 mt-1">{{ erro }}</p>
        </div>

        <template v-else-if="dataUrl">
          <div v-if="ips.length > 1" class="mb-3 flex flex-wrap gap-1.5 justify-center">
            <button v-for="ip in ips" :key="ip" class="text-[10px] font-black px-2.5 py-1 rounded-lg border"
              :class="ip === ipAtual ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50'"
              @click="trocarIp(ip)">{{ ip }}</button>
          </div>
          <img :src="dataUrl" alt="QR code de acesso" class="mx-auto rounded-2xl border border-gray-200 dark:border-white/10" />
          <p class="text-xs text-gray-600 dark:text-white/60 mt-3">Peça para {{ funcionario.nome.split(' ')[0] }} apontar a câmera do celular.</p>
          <p class="text-[11px] text-gray-400 dark:text-white/35 mt-1">Vale enquanto o caixa estiver aberto (até 10 horas).</p>
          <a :href="url" target="_blank" rel="noopener" class="block mt-3 text-[10px] font-mono text-orange-500 break-all">{{ url }}</a>
        </template>

        <button class="mt-4 w-full h-10 rounded-2xl border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-black hover:bg-orange-500/10 disabled:opacity-50" :disabled="gerando" @click="gerar">
          {{ erro ? 'Tentar de novo' : 'Gerar outro QR' }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Loader2 } from 'lucide-vue-next'
import QRCode from 'qrcode'
import { useApi } from '~/services/api'

/**
 * QR que abre o PDV no celular já logado como o funcionário (/m?t=TOKEN).
 * A API recusa (409) quando o plano não inclui, o admin desligou em
 * Configurações → Acesso ou o caixa está fechado; o motivo aparece aqui.
 */
const props = defineProps<{ funcionario: { id: string; nome: string } | null }>()
const emit = defineEmits<{ (e: 'fechar'): void }>()
const api = useApi()

const gerando = ref(false)
const erro = ref('')
const token = ref('')
const dataUrl = ref('')
const url = ref('')
const ips = ref<string[]>([])
const ipAtual = ref('')

async function montar(ip: string) {
  const porta = window.location.port ? `:${window.location.port}` : ''
  url.value = `${window.location.protocol}//${ip}${porta}${useRuntimeConfig().app.baseURL}m?t=${token.value}`
  dataUrl.value = await QRCode.toDataURL(url.value, { width: 240, margin: 2 })
}
async function trocarIp(ip: string) { ipAtual.value = ip; await montar(ip) }

async function gerar() {
  if (!props.funcionario) return
  gerando.value = true; erro.value = ''; dataUrl.value = ''
  try {
    const r = await api.post<any>(`/usuarios/${props.funcionario.id}/mobile-token`)
    token.value = r.token
    // Rodando em localhost, o celular precisa do IP da máquina na rede
    const host = window.location.hostname
    const local = host === 'localhost' || host === '127.0.0.1'
    ips.value = local ? (r.ips ?? r.localIps ?? []) : []
    ipAtual.value = ips.value[0] ?? host
    await montar(ipAtual.value)
  } catch (e: any) {
    erro.value = e?.message || 'Erro ao gerar o QR'
  } finally {
    gerando.value = false
  }
}

function fechar() { emit('fechar') }
watch(() => props.funcionario, (f) => { if (f) gerar() }, { immediate: true })
</script>
