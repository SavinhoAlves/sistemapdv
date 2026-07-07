<template>
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" @click.self="fechar">
    <div class="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">

      <!-- HEADER -->
      <div class="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
        <div>
          <h2 class="text-xl font-black text-neutral-900 dark:text-white leading-tight">{{ produto?.nome }}</h2>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Estoque atual:
            <b class="text-neutral-900 dark:text-white">{{ estoqueAtual }}</b>
            <span v-if="produto?.estoque_minimo > 0" class="text-neutral-400 dark:text-neutral-600"> · mín. {{ produto.estoque_minimo }}</span>
          </p>
        </div>
        <button @click="fechar"
          class="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-neutral-600 dark:text-neutral-400 font-bold transition-colors">
          ✕
        </button>
      </div>

      <div class="p-6 overflow-y-auto flex-1 space-y-5">

        <!-- TIPO -->
        <div class="grid grid-cols-3 gap-2">
          <button v-for="t in tipos" :key="t.value" @click="tipo = t.value"
            class="h-16 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all"
            :class="tipo === t.value
              ? t.classeAtiva
              : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'">
            <component :is="t.icone" :size="18" />
            <span class="text-[11px] font-black uppercase tracking-wide">{{ t.label }}</span>
          </button>
        </div>

        <!-- QUANTIDADE + MOTIVO -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="est-qtd" class="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">
              {{ tipo === 'ajuste' ? 'Novo estoque' : 'Quantidade' }}
            </label>
            <input id="est-qtd" name="est-qtd" v-model.number="quantidade" type="number" min="0" step="1"
              @keydown.enter="confirmar"
              class="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-orange-400 transition-colors" />
          </div>
          <div>
            <label for="est-motivo" class="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1">Motivo (opcional)</label>
            <input id="est-motivo" name="est-motivo" v-model="motivo" type="text" maxlength="150"
              :placeholder="placeholderMotivo" @keydown.enter="confirmar"
              class="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-orange-400 transition-colors placeholder-neutral-400 dark:placeholder-neutral-600" />
          </div>
        </div>

        <!-- PREVIEW + CONFIRMAR -->
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">
            <template v-if="novoEstoque !== null">
              Ficará com <b :class="novoEstoque <= (produto?.estoque_minimo || 0) ? 'text-orange-500' : 'text-neutral-900 dark:text-white'">{{ novoEstoque }}</b> em estoque
            </template>
          </p>
          <button @click="confirmar" :disabled="salvando || novoEstoque === null || novoEstoque < 0"
            class="h-11 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-black text-sm transition-all active:scale-95">
            {{ salvando ? 'Salvando...' : 'Confirmar' }}
          </button>
        </div>

        <!-- HISTÓRICO -->
        <div>
          <h3 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600 mb-2">Últimas movimentações</h3>

          <div v-if="carregandoHistorico" class="space-y-2">
            <div v-for="n in 3" :key="n" class="h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </div>

          <p v-else-if="!movimentos.length" class="text-sm text-neutral-400 dark:text-neutral-600 py-3 text-center">
            Nenhuma movimentação registrada ainda
          </p>

          <div v-else class="space-y-1.5">
            <div v-for="m in movimentos" :key="m.id"
              class="flex items-center gap-3 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
              <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0" :class="corTipo(m.tipo)">
                {{ rotuloTipo(m.tipo) }}
              </span>
              <span class="text-sm font-black shrink-0 w-12 text-right"
                :class="m.quantidade > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'">
                {{ m.quantidade > 0 ? '+' : '' }}{{ m.quantidade }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-xs text-neutral-600 dark:text-neutral-300 truncate">{{ m.motivo || '—' }}</p>
                <p class="text-[10px] text-neutral-400 dark:text-neutral-600">
                  {{ formatarData(m.created_at) }}<template v-if="m.usuario"> · {{ m.usuario }}</template>
                </p>
              </div>
              <span v-if="m.estoque_resultante !== null" class="text-[10px] text-neutral-400 dark:text-neutral-600 shrink-0">
                = {{ m.estoque_resultante }}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { PackagePlus, PackageMinus, SlidersHorizontal } from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'

const api = useApi()
const toastStore = useToastStore()

const props = defineProps<{ modelValue: boolean, produto: any }>()
const emit = defineEmits(['update:modelValue', 'atualizado'])

const tipos = [
  { value: 'entrada', label: 'Entrada', icone: PackagePlus,
    classeAtiva: 'border-green-500 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400' },
  { value: 'saida', label: 'Saída', icone: PackageMinus,
    classeAtiva: 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400' },
  { value: 'ajuste', label: 'Ajuste', icone: SlidersHorizontal,
    classeAtiva: 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' }
]

const tipo       = ref<'entrada' | 'saida' | 'ajuste'>('entrada')
const quantidade = ref<number | null>(null)
const motivo     = ref('')
const salvando   = ref(false)

const estoqueAtual       = ref(0)
const movimentos         = ref<any[]>([])
const carregandoHistorico = ref(false)

const placeholderMotivo = computed(() =>
  tipo.value === 'entrada' ? 'Ex: compra, reposição' :
  tipo.value === 'saida'   ? 'Ex: perda, quebra, consumo' :
                             'Ex: contagem de inventário'
)

const novoEstoque = computed(() => {
  const q = quantidade.value
  if (q === null || q === undefined || Number.isNaN(q) || q < 0 || !Number.isInteger(q)) return null
  if (tipo.value === 'entrada') return q > 0 ? estoqueAtual.value + q : null
  if (tipo.value === 'saida')   return q > 0 ? estoqueAtual.value - q : null
  return q
})

function rotuloTipo(t: string) {
  return ({ entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste', venda: 'Venda', cancelamento: 'Estorno' } as any)[t] || t
}

function corTipo(t: string) {
  if (t === 'entrada')      return 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
  if (t === 'saida')        return 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400'
  if (t === 'ajuste')       return 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
  if (t === 'venda')        return 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'
  return 'bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
}

function formatarData(d: string) {
  return new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

async function carregarHistorico() {
  if (!props.produto?.id) return
  carregandoHistorico.value = true
  try {
    const rows = await api.get<any[]>(`/produtos/${props.produto.id}/estoque`)
    movimentos.value = Array.isArray(rows) ? rows : []
  } catch {
    movimentos.value = []
  } finally {
    carregandoHistorico.value = false
  }
}

async function confirmar() {
  if (salvando.value || novoEstoque.value === null || novoEstoque.value < 0) return
  salvando.value = true
  try {
    const resp = await api.post<any>(`/produtos/${props.produto.id}/estoque`, {
      tipo: tipo.value,
      quantidade: quantidade.value,
      motivo: motivo.value.trim() || null
    })
    estoqueAtual.value = resp.estoque_atual
    quantidade.value = null
    motivo.value = ''
    toastStore.success('Estoque atualizado')
    emit('atualizado')
    carregarHistorico()
  } catch (e: any) {
    toastStore.error('Erro ao ajustar estoque', e?.message)
  } finally {
    salvando.value = false
  }
}

function fechar() {
  emit('update:modelValue', false)
}

watch(() => props.produto, (p) => {
  tipo.value = 'entrada'
  quantidade.value = null
  motivo.value = ''
  estoqueAtual.value = Number(p?.estoque_atual) || 0
  if (p?.id) carregarHistorico()
}, { immediate: true })
</script>
