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
        <p class="text-[11px] font-black uppercase tracking-widest mb-1" :class="totais.baixo > 0 ? 'text-amber-400/70' : 'text-white/40'">Estoque baixo</p>
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
              <p class="text-white/30 text-xs">{{ reais(Number(p.preco)) }}</p>
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

    <!-- ── Modal de histórico (desde o cadastro) ── -->
    <Transition name="modal">
      <div v-if="drawerHistorico.aberto" class="fixed inset-0 z-50 flex items-center justify-center p-4" @keydown.esc="fecharHistorico">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="fecharHistorico" />
        <div
          class="relative bg-[#16141f] border border-white/[0.10] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl"
          role="dialog" aria-modal="true" aria-labelledby="hist-titulo"
        >
          <div class="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-white/[0.07]">
            <div class="min-w-0">
              <h3 id="hist-titulo" class="text-base font-black text-white">Histórico de estoque</h3>
              <p class="text-white/60 text-sm mt-0.5 truncate">{{ drawerHistorico.produto?.nome }}</p>
              <p v-if="drawerHistorico.produto?.createdAt" class="text-white/30 text-xs mt-0.5">
                Cadastrado em {{ formatarDataCompleta(drawerHistorico.produto.createdAt) }}
              </p>
            </div>
            <button ref="fecharHistoricoRef" @click="fecharHistorico" aria-label="Fechar" class="text-white/30 hover:text-white/60 transition-colors shrink-0">
              <X :size="18" />
            </button>
          </div>

          <div v-if="carregandoHistorico" class="flex items-center justify-center py-16">
            <Loader2 :size="20" class="text-white/30 animate-spin" />
          </div>

          <p v-else-if="erroHistorico" class="py-16 text-center text-sm font-bold text-red-400">{{ erroHistorico }}</p>

          <template v-else>
            <!-- Resumo -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 p-5 sm:px-6">
              <div class="bg-white/[0.04] rounded-2xl p-3">
                <p class="text-white/40 text-[10px] font-black uppercase tracking-widest">No cadastro</p>
                <p class="text-lg font-black text-white mt-0.5">{{ qtd(resumoHistorico.inicial) }}</p>
              </div>
              <div class="bg-white/[0.04] rounded-2xl p-3">
                <p class="text-white/40 text-[10px] font-black uppercase tracking-widest">Entradas</p>
                <p class="text-lg font-black text-emerald-400 mt-0.5">+{{ qtd(resumoHistorico.entradas) }}</p>
              </div>
              <div class="bg-white/[0.04] rounded-2xl p-3">
                <p class="text-white/40 text-[10px] font-black uppercase tracking-widest">Saídas</p>
                <p class="text-lg font-black text-red-400 mt-0.5">−{{ qtd(resumoHistorico.saidas) }}</p>
              </div>
              <div class="bg-white/[0.04] rounded-2xl p-3">
                <p class="text-white/40 text-[10px] font-black uppercase tracking-widest">Atual</p>
                <p class="text-lg font-black mt-0.5" :class="corEstoque(drawerHistorico.produto)">{{ qtd(resumoHistorico.atual) }}</p>
              </div>
            </div>

            <!-- Movimentações: mais recente no topo, o cadastro por último -->
            <div class="flex-1 overflow-y-auto px-5 sm:px-6 pb-6">
              <p class="text-white/30 text-[11px] mb-2">{{ historico.length }} {{ historico.length === 1 ? 'movimentação' : 'movimentações' }} desde o cadastro</p>
              <ol class="space-y-1.5">
                <li
                  v-for="mov in linhasHistorico"
                  :key="mov.id"
                  class="grid grid-cols-[auto_1fr_auto] items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5"
                >
                  <div
                    class="size-7 rounded-lg flex items-center justify-center shrink-0"
                    :class="mov.tipo === 'entrada' ? 'bg-emerald-500/15' : mov.tipo === 'saida' ? 'bg-red-500/15' : 'bg-white/[0.08]'"
                  >
                    <TrendingUp v-if="mov.tipo === 'entrada'" :size="13" class="text-emerald-400" />
                    <TrendingDown v-else-if="mov.tipo === 'saida'" :size="13" class="text-red-400" />
                    <PackagePlus v-else :size="13" class="text-white/60" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-white/80 text-xs font-bold truncate">{{ mov.motivo || 'Sem motivo' }}</p>
                    <p class="text-white/30 text-[10px] mt-0.5 truncate">
                      {{ formatarDataCompleta(mov.createdAt) }}<template v-if="mov.usuario"> · por {{ mov.usuario.nome }}</template>
                    </p>
                  </div>
                  <div class="text-right">
                    <p
                      v-if="mov.tipo !== 'cadastro'"
                      class="text-xs font-black tabular-nums"
                      :class="mov.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'"
                    >
                      {{ mov.tipo === 'entrada' ? '+' : '−' }}{{ qtd(mov.quantidade) }}
                    </p>
                    <p class="text-white/40 text-[10px] tabular-nums">saldo {{ qtd(mov.saldo) }}</p>
                  </div>
                </li>
              </ol>
            </div>
          </template>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { reais } from '~/lib/moeda'
import { ref, computed, onMounted, nextTick } from 'vue'
import { useApi } from '~/services/api'
import {
  Boxes, Search, Eye, History, Loader2, X,
  TrendingUp, TrendingDown, PackagePlus
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
  createdAt?: string
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
const erroHistorico    = ref('')
const fecharHistoricoRef = ref<HTMLButtonElement | null>(null)

/**
 * O cadastro do produto não gera movimentação. Como toda mudança de estoque
 * depois dele gera (lançamento, venda, delivery, ajuste, edição), o estoque
 * no cadastro é o atual desfeito das movimentações.
 */
const resumoHistorico = computed(() => {
  const atual    = Number(drawerHistorico.value.produto?.estoqueAtual ?? 0)
  const entradas = historico.value.filter(m => m.tipo === 'entrada').reduce((s, m) => s + Number(m.quantidade), 0)
  const saidas   = historico.value.filter(m => m.tipo === 'saida').reduce((s, m) => s + Number(m.quantidade), 0)
  return { atual, entradas, saidas, inicial: atual - entradas + saidas }
})

/** Movimentações com o saldo depois de cada uma, da mais recente ao cadastro */
const linhasHistorico = computed(() => {
  const asc = [...historico.value].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  let saldo = resumoHistorico.value.inicial
  const linhas: Array<Omit<Movimentacao, 'tipo'> & { tipo: Movimentacao['tipo'] | 'cadastro'; saldo: number }> = [{
    id: 'cadastro', tipo: 'cadastro', quantidade: saldo, motivo: 'Produto cadastrado',
    createdAt: drawerHistorico.value.produto?.createdAt ?? asc[0]?.createdAt ?? '', usuario: null, saldo,
  }]
  for (const m of asc) {
    saldo += m.tipo === 'entrada' ? Number(m.quantidade) : -Number(m.quantidade)
    linhas.push({ ...m, saldo })
  }
  return linhas.reverse()
})

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

// Baixo = chegou no mínimo (igual a Produtos e à venda direta); mínimo 0 = sem alerta
const ehBaixo = (p: Produto) => p.estoqueMinimo > 0 && p.estoqueAtual <= p.estoqueMinimo

const totais = computed(() => {
  const mon = produtos.value.filter(p => p.gerenciarEstoque)
  return {
    monitorados: mon.length,
    ok:     mon.filter(p => p.estoqueAtual > 0 && !ehBaixo(p)).length,
    baixo:  mon.filter(p => p.estoqueAtual > 0 && ehBaixo(p)).length,
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
  if (p.estoqueMinimo > 0 && prev <= p.estoqueMinimo) return 'text-amber-400'
  return 'text-emerald-400'
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function prioridade(p: Produto) {
  if (!p.gerenciarEstoque) return 3
  if (p.estoqueAtual <= 0) return 0
  if (ehBaixo(p)) return 1
  return 2
}

function corEstoque(p: Produto | null) {
  if (!p || !p.gerenciarEstoque) return 'text-white/40'
  if (p.estoqueAtual <= 0) return 'text-red-400'
  if (ehBaixo(p)) return 'text-amber-400'
  return 'text-emerald-400'
}

function badgeEstoque(p: Produto) {
  if (p.estoqueAtual <= 0) return 'bg-red-500/15 text-red-400'
  if (ehBaixo(p)) return 'bg-amber-500/15 text-amber-400'
  return 'bg-emerald-500/15 text-emerald-400'
}

function labelEstoque(p: Produto) {
  if (p.estoqueAtual <= 0) return 'Zerado'
  if (ehBaixo(p)) return 'Baixo'
  return 'OK'
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
  erroHistorico.value   = ''
  carregandoHistorico.value = true
  nextTick(() => fecharHistoricoRef.value?.focus())
  try {
    historico.value = await api.get<Movimentacao[]>(`/produtos/${p.id}/estoque`)
  } catch (e: any) {
    erroHistorico.value = e?.message || 'Não deu para carregar o histórico'
  } finally {
    carregandoHistorico.value = false
  }
}

function fecharHistorico() {
  drawerHistorico.value = { aberto: false, produto: null }
}

function formatarDataCompleta(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const qtd = (n: number) => { const v = Number(n); return v.toFixed(v % 1 === 0 ? 0 : 2) }

onMounted(carregar)
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }

</style>
