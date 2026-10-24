<template>
  <!-- Pix com QR Code: a chave do restaurante para receber -->
  <div class="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-5 mb-5 grid gap-5 lg:grid-cols-[1fr_auto]">
    <form class="grid gap-3 content-start" @submit.prevent="salvar">
      <div class="flex items-center gap-2">
        <QrCode :size="18" class="text-orange-500" />
        <h3 class="text-sm font-black text-gray-900 dark:text-white">Pix com QR Code</h3>
        <span class="text-[11px] font-black px-2 py-0.5 rounded-full" :class="ativo ? 'bg-green-500/15 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/40'">{{ ativo ? 'Ativo' : 'Desligado' }}</span>
      </div>
      <p class="text-xs text-gray-500 dark:text-white/50">Ao escolher Pix na venda direta ou no cardápio online, aparece um QR Code com o valor para o cliente pagar. O dinheiro cai direto na conta desta chave; confira o recebimento antes de confirmar a venda.</p>
      <label class="grid gap-1 text-xs font-bold text-gray-500 dark:text-white/40">Chave Pix
        <input v-model="f.chave" placeholder="CPF/CNPJ, celular, e-mail ou chave aleatória" class="h-11 rounded-xl px-3 text-sm font-semibold outline-none border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white focus:border-orange-500/70" />
      </label>
      <div class="grid sm:grid-cols-2 gap-3">
        <label class="grid gap-1 text-xs font-bold text-gray-500 dark:text-white/40">Nome do recebedor
          <input v-model="f.nome" maxlength="60" placeholder="Como aparece no banco" class="h-11 rounded-xl px-3 text-sm font-semibold outline-none border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white focus:border-orange-500/70" />
        </label>
        <label class="grid gap-1 text-xs font-bold text-gray-500 dark:text-white/40">Cidade
          <input v-model="f.cidade" maxlength="40" placeholder="Ex.: Campos dos Goytacazes" class="h-11 rounded-xl px-3 text-sm font-semibold outline-none border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white focus:border-orange-500/70" />
        </label>
      </div>
      <p v-if="erro" class="text-sm font-bold text-red-500" role="alert">{{ erro }}</p>
      <div class="flex gap-2">
        <button type="submit" class="h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black disabled:opacity-50" :disabled="salvando">{{ salvando ? 'Salvando…' : 'Salvar' }}</button>
        <button v-if="ativo" type="button" class="h-10 px-4 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-500 dark:text-white/60" @click="desligar">Desligar QR Code</button>
      </div>
    </form>
    <!-- Prévia: R$ 1,00 para testar a leitura no app do banco -->
    <div v-if="f.chave.trim() && f.nome.trim().length >= 2 && f.cidade.trim().length >= 2" class="grid justify-items-center gap-1 text-gray-900 dark:text-white">
      <p class="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Prévia (R$ 1,00)</p>
      <PixQrCode :chave="f.chave" :nome="f.nome" :cidade="f.cidade" :valor="1" classe-botao="border-gray-200 dark:border-white/10" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { QrCode } from 'lucide-vue-next'
import PixQrCode from '~/components/PixQrCode.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'

const api = useApi()
const toast = useToastStore()
const f = reactive({ chave: '', nome: '', cidade: '' })
const ativo = ref(false)
const salvando = ref(false)
const erro = ref('')

async function carregar() {
  try { const r = await api.get<any>('/pagamentos/pix'); Object.assign(f, r); ativo.value = Boolean(r.chave) } catch {}
}
async function salvar() {
  erro.value = ''; salvando.value = true
  try {
    const r = await api.put<any>('/pagamentos/pix', { ...f })
    Object.assign(f, r); ativo.value = Boolean(r.chave)
    toast.success(r.chave ? 'Pix com QR Code salvo' : 'QR Code Pix desligado')
  } catch (e: any) { erro.value = e?.message || 'Não deu para salvar' }
  finally { salvando.value = false }
}
function desligar() { f.chave = ''; salvar() }
onMounted(carregar)
</script>

