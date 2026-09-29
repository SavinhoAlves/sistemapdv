<template>
  <div class="p-6 space-y-6">

    <!-- Cabeçalho -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-white tracking-tight">Estoque</h1>
        <p class="text-white/40 text-sm mt-0.5">Controle de estoque dos produtos</p>
      </div>
      <button
        @click="mostrarTodos = !mostrarTodos"
        class="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all"
        :class="mostrarTodos
          ? 'bg-white/[0.08] border-white/20 text-white'
          : 'bg-transparent border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'"
      >
        <Eye :size="13" />
        {{ mostrarTodos ? 'Monitorados + Todos' : 'Só monitorados' }}
      </button>
    </div>

    <!-- Cards de resumo -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
        <p class="text-white/40 text-[11px] font-black uppercase tracking-widest mb-1">Monitorados</p>
        <p class="text-2xl font-black text-white">{{ totais.monitorados }}</p>
      </div>
      <div class="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-4">
        <p class="text-white/40 text-[11px] font-black uppercase tracking-widest mb-1">Em dia</p>
        <p class="text-2xl font-black text-emerald-400">{{ totais.ok }}</p>
      </div>
      <div
        class="rounded-2xl p-4 border"
        :class="totais.baixo > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white/[0.04] border-white/[0.07]'"
      >
        <p class="text-[11px] font-black uppercase tracking-widest mb-1" :class="totais.baixo > 0 ? 'text-amber-400/70' : 'text-white/40'">Abaixo do mín.</p>
        <p class="text-2xl font-black" :class="totais.baixo > 0 ? 'text-amber-400' : 'text-white'">{{ totais.baixo }}</p>
      </div>
      <div
        class="rounded-2xl p-4 border"
        :class="totais.zerado > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-white/[0.04] border-white/[0.07]'"
      >
        <p class="text-[11px] font-black uppercase tracking-widest mb-1" :class="totais.zerado > 0 ? 'text-red-400/70' : 'text-white/40'">Zerado / Crítico</p>
        <p class="text-2xl font-black" :class="totais.zerado > 0 ? 'text-red-400' : 'text-white'">{{ totais.zerado }}</p>
      </div>
    </div>

    <!-- Tabela -->
    <div class="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">

      <!-- Barra de busca -->
      <div class="p-4 border-b border-white/[0.06]">
        <div class="relative max-w-xs">
          <Search :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            v-model="busca"
            type="text"
            placeholder="Buscar produto..."
            class="w-full h-9 pl-9 pr-4 bg-white/[0.05] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-colors"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="carregando" class="py-16 flex items-center justify-center">
        <Loader2 :size="20" class="text-white/30 animate-spin" />
      </div>

      <!-- Vazio -->
      <div v-else-if="produtosFiltrados.length === 0" class="py-16 flex flex-col items-center gap-3 text-white/30">
        <Boxes :size="32" :stroke-width="1.5" />
        <p class="text-sm font-bold">Nenhum produto encontrado</p>
        <p v-if="!mostrarTodos" class="text-xs">Ative o monitoramento em algum produto ou clique em "Só monitorados" para ver todos</p>
      </div>

      <!-- Tabela de produtos -->
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-white/[0.06]">
            <th class="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/30">Produto</th>
            <th class="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/30 hidden md:table-cell">Categoria</th>
            <th class="text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/30">Atual</th>
            <th class="text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/30 hidden lg:table-cell">Mínimo</th>
            <th class="text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/30">Status</th>
            <th class="text-center px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white/30">Monitor</th>
            <th class="text-right px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white/30">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in produtosFiltrados"
            :key="p.id"
            class="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
            :class="{ 'opacity-50': !p.ativo }"
          >
            <!-- Produto -->
            <td class="px-5 py-3.5">
              <p class="font-bold text-white truncate max-w-[180px]">{{ p.nome }}</p>
              <p class="text-white/30 text-xs">R$ {{ Number(p.preco).toFixed(2) }}</p>
            </td>

            <!-- Categoria -->
            <td class="px-4 py-3.5 hidden md:table-cell">
              <span class="text-white/50 text-xs">{{ p.categoria || '—' }}</span>
            </td>

            <!-- Estoque atual -->
            <td class="px-4 py-3.5 text-center">
              <span v-if="p.gerenciarEstoque" class="text-base font-black" :class="corEstoque(p)">
                {{ Number(p.estoqueAtual).toFixed(p.estoqueAtual % 1 === 0 ? 0 : 2) }}
              </span>
              <span v-else class="text-white/20 text-xs">—</span>
            </td>

            <!-- Estoque mínimo -->
            <td class="px-4 py-3.5 text-center hidden lg:table-cell">
              <span v-if="p.gerenciarEstoque" class="text-white/40 text-xs">
                {{ Number(p.estoqueMinimo).toFixed(p.estoqueMinimo % 1 === 0 ? 0 : 2) }}
              </span>
              <span v-else class="text-white/20 text-xs">—</span>
            </td>

            <!-- Status badge -->
            <td class="px-4 py-3.5 text-center">
              <span v-if="!p.gerenciarEstoque" class="text-white/20 text-[10px] font-bold uppercase tracking-wider">Inativo</span>
              <span
                v-else
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                :class="badgeEstoque(p)"
              >
                {{ labelEstoque(p) }}
              </span>
            </td>

            <!-- Toggle monitoramento -->
            <td class="px-4 py-3.5 text-center">
              <button
                @click="toggleMonitoramento(p)"
                :disabled="togglingId === p.id"
                class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50"
                :class="p.gerenciarEstoque ? 'bg-orange-500' : 'bg-white/10'"
              >
                <span
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  :class="p.gerenciarEstoque ? 'translate-x-[18px]' : 'translate-x-0.5'"
                />
              </button>
            </td>

            <!-- Ações -->
            <td class="px-5 py-3.5 text-right">
              <div class="flex items-center justify-end gap-1">
                <button
                  v-if="p.gerenciarEstoque"
                  @click="abrirAjuste(p, 'entrada')"
                  title="Entrada"
                  class="h-7 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-black uppercase tracking-wider transition-colors"
                >
                  + Entrada
                </button>
                <button
                  v-if="p.gerenciarEstoque"
                  @click="abrirAjuste(p, 'saida')"
                  title="Saída"
                  class="h-7 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-black uppercase tracking-wider transition-colors"
                >
                  − Saída
                </button>
                <button
                  v-if="p.gerenciarEstoque"
                  @click="abrirHistorico(p)"
                  title="Histórico"
                  class="h-7 w-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.10] text-white/40 flex items-center justify-center transition-colors"
                >
                  <History :size="13" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Modal de ajuste de estoque ── -->
    <Transition name="modal">
      <div v-if="modalAjuste.aberto" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="fecharAjuste" />
        <div class="relative bg-[#16141f] border border-white/[0.10] rounded-3xl p-6 w-full max-w-sm shadow-2xl">

          <div class="flex items-center justify-between mb-5">
            <div>
              <h3 class="text-base font-black text-white">
                {{ modalAjuste.tipo === 'entrada' ? '+ Entrada de Estoque' : '− Saída de Estoque' }}
              </h3>
              <p class="text-white/40 text-xs mt-0.5 truncate max-w-[200px]">{{ modalAjuste.produto?.nome }}</p>
            </div>
            <button @click="fecharAjuste" class="text-white/30 hover:text-white/60 transition-colors">
              <X :size="18" />
            </button>
          </div>

          <!-- Estoque atual -->
          <div class="bg-white/[0.04] rounded-2xl p-3 mb-4 text-center">
            <p class="text-white/40 text-[10px] font-black uppercase tracking-widest">Estoque atual</p>
            <p class="text-2xl font-black mt-0.5" :class="corEstoque(modalAjuste.produto)">
              {{ modalAjuste.produto ? Number(modalAjuste.produto.estoqueAtual).toFixed(0) : 0 }}
            </p>
          </div>

          <form @submit.prevent="confirmarAjuste" class="space-y-4">
            <!-- Quantidade -->
            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">Quantidade</label>
              <input
                v-model.number="ajusteForm.quantidade"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="0"
                class="w-full h-11 px-4 bg-white/[0.05] border border-white/[0.10] rounded-2xl text-white text-center text-lg font-black focus:outline-none focus:border-orange-500/60 transition-colors"
                required
              />
            </div>

            <!-- Motivo -->
            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5">Motivo</label>
              <input
                v-model="ajusteForm.motivo"
                type="text"
                placeholder="Ex: compra de fornecedor, quebra..."
                class="w-full h-11 px-4 bg-white/[0.05] border border-white/[0.10] rounded-2xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>

            <!-- Previsão -->
            <div v-if="ajusteForm.quantidade > 0" class="bg-white/[0.03] rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span class="text-white/40 text-xs">Estoque após ajuste</span>
              <span class="font-black text-sm" :class="corPrevisao">
                {{ previsaoEstoque }}
              </span>
            </div>

            <div class="flex gap-2 pt-1">
              <button type="button" @click="fecharAjuste"
                class="flex-1 h-11 rounded-2xl border border-white/10 text-white/40 text-sm font-bold hover:bg-white/[0.04] transition-colors">
                Cancelar
              </button>
              <button type="submit" :disabled="salvandoAjuste || !ajusteForm.quantidade"
                class="flex-1 h-11 rounded-2xl text-sm font-black uppercase tracking-wider transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                :class="modalAjuste.tipo === 'entrada'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                  : 'bg-red-500 hover:bg-red-400 text-white'"
              >
                <Loader2 v-if="salvandoAjuste" :size="14" class="animate-spin" />
                {{ modalAjuste.tipo === 'entrada' ? 'Confirmar entrada' : 'Confirmar saída' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ── Drawer de histórico ── -->
    <Transition name="drawer">
      <div v-if="drawerHistorico.aberto" class="fixed inset-0 z-50 flex justify-end">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="drawerHistorico.aberto = false" />
        <div class="relative bg-[#16141f] border-l border-white/[0.10] w-full max-w-md h-full flex flex-col shadow-2xl">

          <div class="flex items-center justify-between p-5 border-b border-white/[0.07]">
            <div>
              <h3 class="font-black text-white">Histórico de Estoque</h3>
              <p class="text-white/40 text-xs mt-0.5 truncate max-w-[250px]">{{ drawerHistorico.produto?.nome }}</p>
            </div>
            <button @click="drawerHistorico.aberto = false" class="text-white/30 hover:text-white/60 transition-colors">
              <X :size="18" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-5">
            <div v-if="carregandoHistorico" class="flex items-center justify-center py-12">
              <Loader2 :size="20" class="text-white/30 animate-spin" />
            </div>

            <div v-else-if="historico.length === 0" class="flex flex-col items-center gap-2 py-12 text-white/30">
              <History :size="28" :stroke-width="1.5" />
              <p class="text-sm font-bold">Sem movimentações</p>
            </div>

            <div v-else class="space-y-2">
              <div
                v-for="mov in historico"
                :key="mov.id"
                class="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3"
              >
                <div
                  class="mt-0.5 size-7 rounded-lg flex items-center justify-center shrink-0"
                  :class="mov.tipo === 'entrada' ? 'bg-emerald-500/15' : 'bg-red-500/15'"
                >
                  <TrendingUp v-if="mov.tipo === 'entrada'" :size="13" class="text-emerald-400" />
                  <TrendingDown v-else :size="13" class="text-red-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-black uppercase tracking-wider" :class="mov.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'">
                      {{ mov.tipo === 'entrada' ? '+' : '-' }}{{ Number(mov.quantidade).toFixed(Number(mov.quantidade) % 1 === 0 ? 0 : 2) }}
                    </span>
                    <span class="text-white/25 text-[10px] shrink-0">{{ formatarData(mov.createdAt) }}</span>
                  </div>
                  <p class="text-white/50 text-xs mt-0.5 truncate">{{ mov.motivo || 'Sem motivo' }}</p>
                  <p v-if="mov.usuario" class="text-white/25 text-[10px] mt-0.5">por {{ mov.usuario.nome }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useApi } from '~/services/api'
import {
  Boxes, Search, Eye, History, Loader2, X,
  TrendingUp, TrendingDown
} from 'lucide-vue-next'

const api = useApi()

interface Produto {
  id: string
  nome: string
  preco: number
  categoria: string | null
  gerenciarEstoque: boolean
  estoqueAtual: number
  estoqueMinimo: number
  ativo: boolean
}

interface Movimentacao {
  id: string
  tipo: 'entrada' | 'saida'
  quantidade: number
  motivo: string | null
  createdAt: string
  usuario: { id: string; nome: string } | null
}

const produtos      = ref<Produto[]>([])
const carregando    = ref(true)
const busca         = ref('')
const mostrarTodos  = ref(false)
const togglingId    = ref<string | null>(null)
const salvandoAjuste = ref(false)

const modalAjuste = ref<{ aberto: boolean; tipo: 'entrada' | 'saida'; produto: Produto | null }>({
  aberto: false, tipo: 'entrada', produto: null,
})
const ajusteForm = ref({ quantidade: 0, motivo: '' })

const drawerHistorico = ref<{ aberto: boolean; produto: Produto | null }>({ aberto: false, produto: null })
const historico        = ref<Movimentacao[]>([])
const carregandoHistorico = ref(false)

// ── Computed ──────────────────────────────────────────────────────────────────

const produtosFiltrados = computed(() => {
  let lista = mostrarTodos.value ? produtos.value : produtos.value.filter(p => p.gerenciarEstoque)
  if (busca.value.trim()) {
    const q = busca.value.toLowerCase()
    lista = lista.filter(p => p.nome.toLowerCase().includes(q) || (p.categoria || '').toLowerCase().includes(q))
  }
  // Críticos primeiro, depois abaixo do mínimo, depois ok
  return [...lista].sort((a, b) => {
    const prioA = prioridade(a)
    const prioB = prioridade(b)
    if (prioA !== prioB) return prioA - prioB
    return a.nome.localeCompare(b.nome)
  })
})

const totais = computed(() => {
  const mon = produtos.value.filter(p => p.gerenciarEstoque)
  return {
    monitorados: mon.length,
    ok:     mon.filter(p => p.estoqueAtual >= p.estoqueMinimo).length,
    baixo:  mon.filter(p => p.estoqueAtual > 0 && p.estoqueAtual < p.estoqueMinimo).length,
    zerado: mon.filter(p => p.estoqueAtual <= 0).length,
  }
})

const previsaoEstoque = computed(() => {
  if (!modalAjuste.value.produto) return 0
  const atual = Number(modalAjuste.value.produto.estoqueAtual)
  const qtd   = Number(ajusteForm.value.quantidade) || 0
  return modalAjuste.value.tipo === 'entrada' ? atual + qtd : atual - qtd
})

const corPrevisao = computed(() => {
  const p = modalAjuste.value.produto
  if (!p) return 'text-white'
  const prev = previsaoEstoque.value
  if (prev <= 0) return 'text-red-400'
  if (prev < p.estoqueMinimo) return 'text-amber-400'
  return 'text-emerald-400'
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function prioridade(p: Produto) {
  if (!p.gerenciarEstoque) return 3
  if (p.estoqueAtual <= 0) return 0
  if (p.estoqueAtual < p.estoqueMinimo) return 1
  return 2
}

function corEstoque(p: Produto | null) {
  if (!p || !p.gerenciarEstoque) return 'text-white/40'
  if (p.estoqueAtual <= 0) return 'text-red-400'
  if (p.estoqueAtual < p.estoqueMinimo) return 'text-amber-400'
  return 'text-emerald-400'
}

function badgeEstoque(p: Produto) {
  if (p.estoqueAtual <= 0) return 'bg-red-500/15 text-red-400'
  if (p.estoqueAtual < p.estoqueMinimo) return 'bg-amber-500/15 text-amber-400'
  return 'bg-emerald-500/15 text-emerald-400'
}

function labelEstoque(p: Produto) {
  if (p.estoqueAtual <= 0) return 'Zerado'
  if (p.estoqueAtual < p.estoqueMinimo) return 'Baixo'
  return 'OK'
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// ── Ações ─────────────────────────────────────────────────────────────────────

async function carregar() {
  carregando.value = true
  try {
    produtos.value = await api.get<Produto[]>('/produtos')
  } finally {
    carregando.value = false
  }
}

async function toggleMonitoramento(p: Produto) {
  togglingId.value = p.id
  try {
    const atualizado = await api.put<Produto>(`/produtos/${p.id}`, { gerenciarEstoque: !p.gerenciarEstoque })
    const idx = produtos.value.findIndex(x => x.id === p.id)
    if (idx !== -1) produtos.value[idx] = { ...produtos.value[idx], gerenciarEstoque: atualizado.gerenciarEstoque }
  } finally {
    togglingId.value = null
  }
}

function abrirAjuste(p: Produto, tipo: 'entrada' | 'saida') {
  modalAjuste.value = { aberto: true, tipo, produto: p }
  ajusteForm.value  = { quantidade: 0, motivo: '' }
}

function fecharAjuste() {
  modalAjuste.value.aberto = false
}

async function confirmarAjuste() {
  const { produto, tipo } = modalAjuste.value
  if (!produto || !ajusteForm.value.quantidade) return
  salvandoAjuste.value = true
  try {
    const res = await api.post<{ estoqueAtual: number }>(`/produtos/${produto.id}/estoque`, {
      tipo,
      quantidade: ajusteForm.value.quantidade,
      motivo: ajusteForm.value.motivo || (tipo === 'entrada' ? 'Entrada manual' : 'Saída manual'),
    })
    const idx = produtos.value.findIndex(x => x.id === produto.id)
    if (idx !== -1) produtos.value[idx] = { ...produtos.value[idx], estoqueAtual: res.estoqueAtual }
    fecharAjuste()
  } catch (e: any) {
    alert(e.message || 'Erro ao ajustar estoque')
  } finally {
    salvandoAjuste.value = false
  }
}

async function abrirHistorico(p: Produto) {
  drawerHistorico.value = { aberto: true, produto: p }
  historico.value       = []
  carregandoHistorico.value = true
  try {
    historico.value = await api.get<Movimentacao[]>(`/produtos/${p.id}/estoque`)
  } finally {
    carregandoHistorico.value = false
  }
}

onMounted(carregar)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }

.drawer-enter-active, .drawer-leave-active { transition: transform 0.2s ease, opacity 0.2s ease; }
.drawer-enter-from, .drawer-leave-to       { transform: translateX(100%); opacity: 0; }
</style>
