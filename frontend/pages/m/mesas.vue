<template>
  <div class="flex flex-col min-h-full">

    <!-- ══════════════════════════════════════
         TELA 1: GRID DE MESAS
    ══════════════════════════════════════ -->
    <template v-if="!mesaSelecionada">

      <!-- Header -->
      <div class="relative px-5 pt-5 pb-5 overflow-hidden shrink-0">
        <div
          class="absolute inset-0 pointer-events-none"
          style="background: radial-gradient(ellipse 70% 90% at 0% 0%, rgba(249,115,22,0.09) 0%, transparent 70%);"
        ></div>
        <div class="relative flex items-start justify-between">
          <div>
            <h1 class="text-[26px] font-black text-white tracking-tight leading-none">Mesas</h1>
            <p class="text-[12px] font-medium mt-1.5" :class="mesasAbertas.length ? 'text-white/35' : 'text-white/20'">
              <template v-if="mesasAbertas.length">{{ mesasAbertas.length }} mesa{{ mesasAbertas.length !== 1 ? 's' : '' }} em atendimento</template>
              <template v-else>Nenhuma mesa aberta</template>
            </p>
          </div>
          <button
            v-if="authStore.temPermissao('abrirMesa')"
            @click="modalNovaMesa = true"
            class="flex items-center gap-2 h-9 px-4 rounded-[14px] bg-orange-500 text-white text-[12px] font-black active:scale-95 transition-all mt-0.5"
            style="box-shadow: 0 4px 14px rgba(249,115,22,0.35);"
          >
            <Plus :size="13" />
            Nova Mesa
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <Loader2 :size="22" class="animate-spin text-orange-500/60" />
      </div>

      <!-- Empty -->
      <div v-else-if="!mesasAbertas.length" class="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8 pb-24">
        <div
          class="w-20 h-20 rounded-[24px] flex items-center justify-center"
          style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);"
        >
          <LayoutGrid :size="26" class="text-white/15" />
        </div>
        <div>
          <p class="text-[15px] font-black text-white/35">Nenhuma mesa aberta</p>
          <p class="text-[12px] text-white/20 mt-1.5 font-medium">Toque em "Nova Mesa" para começar</p>
        </div>
      </div>

      <!-- Grid de mesas -->
      <div v-else class="px-4 pb-36">
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="mesa in mesasAbertas"
            :key="mesa.id"
            @click="selecionarMesa(mesa)"
            class="text-left transition-all rounded-[20px] p-4 active:scale-[0.96]"
            style="background:#161619; border:1px solid rgba(255,255,255,0.07);"
          >
            <div class="flex items-center justify-between mb-3.5">
              <div class="flex items-center gap-1.5">
                <span
                  class="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                  style="box-shadow: 0 0 5px rgba(52,211,153,0.7);"
                ></span>
                <span class="text-[10px] font-bold text-emerald-400/60">Aberta</span>
              </div>
              <span class="text-[10px] font-semibold text-white/20 tabular-nums">{{ formatarTempo(mesa.data_abertura) }}</span>
            </div>
            <p class="text-[16px] font-black text-white leading-tight line-clamp-2">{{ mesa.nome_mesa }}</p>
            <p class="text-[11px] font-medium mt-1.5 truncate" :class="mesa.garcom ? 'text-white/30' : 'text-white/10'">
              {{ mesa.garcom || '—' }}
            </p>
          </button>
        </div>
      </div>

    </template>

    <!-- ══════════════════════════════════════
         TELA 2: SELEÇÃO DE PRODUTOS (full screen)
    ══════════════════════════════════════ -->
    <template v-else>

      <!-- Header: voltar + nome da mesa -->
      <div class="relative px-5 pt-5 pb-4 overflow-hidden shrink-0">
        <div
          class="absolute inset-0 pointer-events-none"
          style="background: radial-gradient(ellipse 60% 80% at 100% 0%, rgba(249,115,22,0.07) 0%, transparent 65%);"
        ></div>
        <div class="relative flex items-center gap-3">
          <button
            @click="voltarParaMesas"
            class="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 transition-all active:scale-90"
            style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.07);"
          >
            <ChevronLeft :size="18" class="text-white/60" />
          </button>
          <div class="min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-500/70">Mesa aberta</p>
            <h1 class="text-[20px] font-black text-white leading-tight truncate">{{ mesaSelecionada.nome_mesa }}</h1>
          </div>
        </div>
      </div>

      <!-- Busca -->
      <div class="px-5 pb-3 shrink-0">
        <div class="relative">
          <Search :size="13" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            v-model="buscaProduto"
            type="text"
            placeholder="Buscar produto..."
            class="w-full h-10 pl-9 pr-4 rounded-[12px] text-[13px] text-white placeholder:text-white/20 outline-none transition-all"
            style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07);"
            @focus="($event.target as HTMLInputElement).style.borderColor='rgba(249,115,22,0.35)'"
            @blur="($event.target as HTMLInputElement).style.borderColor='rgba(255,255,255,0.07)'"
          />
        </div>
      </div>

      <!-- Chips de categoria -->
      <div class="flex gap-2 overflow-x-auto px-5 pb-3 shrink-0 scrollbar-none">
        <button
          v-for="cat in ['Todos', ...categorias]"
          :key="cat"
          @click="categoriaAtiva = cat"
          class="h-[28px] px-3.5 rounded-[10px] text-[11px] font-black whitespace-nowrap shrink-0 transition-all active:scale-95"
          :class="categoriaAtiva === cat ? 'text-white' : 'text-white/30'"
          :style="categoriaAtiva === cat
            ? 'background: #f97316; box-shadow: 0 2px 10px rgba(249,115,22,0.3);'
            : 'background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07);'"
        >{{ cat }}</button>
      </div>

      <div class="h-px mx-5 shrink-0 bg-white/[0.05]"></div>

      <!-- Grid de produtos -->
      <div class="px-4 pt-3 pb-36">
        <div v-if="!produtosFiltrados.length" class="flex flex-col items-center justify-center h-48 gap-3">
          <UtensilsCrossed :size="26" class="text-white/[0.07]" />
          <p class="text-[13px] font-semibold text-white/20">Nenhum produto encontrado</p>
        </div>
        <div v-else class="grid grid-cols-2 gap-2.5">
          <button
            v-for="p in produtosFiltrados"
            :key="p.id"
            @click="adicionarItemMesa(p)"
            :disabled="adicionando === p.id"
            class="relative rounded-[20px] p-4 flex flex-col items-center text-center transition-all active:scale-[0.95] disabled:opacity-40"
            style="background:#161619; border:1px solid rgba(255,255,255,0.06);"
          >
            <div
              class="w-10 h-10 rounded-[14px] flex items-center justify-center mb-3 shrink-0"
              style="background: rgba(249,115,22,0.08);"
            >
              <Loader2 v-if="adicionando === p.id" :size="15" class="animate-spin text-orange-400" />
              <UtensilsCrossed v-else :size="15" class="text-orange-400/50" />
            </div>
            <p class="text-[12px] font-black text-white leading-snug line-clamp-2">{{ p.nome }}</p>
            <p v-if="p.categoria" class="text-[10px] font-medium text-white/20 mt-0.5 truncate w-full">{{ p.categoria }}</p>
            <p class="text-[15px] font-black text-orange-400/80 mt-2">R$ {{ fmt(p.preco) }}</p>
          </button>
        </div>
      </div>

      <!-- FAB: itens já pedidos na mesa -->
      <Transition name="fab">
        <button
          v-if="itensMesa.length"
          @click="carrinhoAberto = true"
          class="fixed bottom-[88px] right-4 z-20 w-[54px] h-[54px] rounded-[16px] flex items-center justify-center active:scale-[0.95] transition-transform duration-150"
          style="background: linear-gradient(135deg, #fb923c, #ea580c); box-shadow: 0 8px 28px rgba(249,115,22,0.5);"
        >
          <div class="relative">
            <ShoppingBag :size="22" class="text-white" />
            <div
              :key="quantidadeItensMesa"
              class="absolute -top-3 -right-3 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-black badge-pop"
              style="background: white; color: #ea580c;"
            >
              {{ quantidadeItensMesa > 9 ? '9+' : quantidadeItensMesa }}
            </div>
          </div>
        </button>
      </Transition>

    </template>

    <!-- ══════════════════════════════════════
         BOTTOM SHEET: ITENS DA MESA (carrinho)
    ══════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="carrinhoAberto" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/70 backdrop-blur-[2px]" @click="carrinhoAberto = false"></div>
          <div
            class="absolute bottom-0 left-0 right-0 rounded-t-[28px] max-h-[80vh] flex flex-col"
            style="background: #141417; border-top: 1px solid rgba(255,255,255,0.08);"
          >
            <!-- Handle -->
            <div class="flex justify-center pt-3 pb-2 shrink-0">
              <div class="w-9 h-[3px] rounded-full bg-white/[0.1]"></div>
            </div>

            <!-- Header -->
            <div class="px-5 pb-3 flex items-start justify-between shrink-0">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-500/70">Pedido atual</p>
                <h3 class="text-[20px] font-black text-white mt-0.5">{{ mesaSelecionada?.nome_mesa }}</h3>
              </div>
              <button
                @click="carrinhoAberto = false"
                class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 active:scale-90 transition-all"
                style="background: rgba(255,255,255,0.07);"
              >
                <X :size="15" class="text-white/50" />
              </button>
            </div>

            <div class="h-px mx-5 shrink-0 bg-white/[0.05]"></div>

            <!-- Lista de itens com steppers -->
            <div class="flex-1 overflow-y-auto">
              <div v-if="loadingItens" class="flex justify-center py-10">
                <Loader2 :size="20" class="animate-spin text-orange-400/60" />
              </div>
              <div v-else-if="!itensMesa.length" class="flex flex-col items-center justify-center py-12 gap-3">
                <ShoppingBag :size="24" class="text-white/[0.08]" />
                <p class="text-[12px] font-semibold text-white/20">Nenhum item ainda</p>
              </div>
              <div v-else>
                <div
                  v-for="(item, idx) in itensMesa"
                  :key="item.id"
                  class="flex items-center justify-between px-5 py-3"
                  :style="idx < itensMesa.length - 1 ? 'border-bottom: 1px solid rgba(255,255,255,0.04);' : ''"
                >
                  <!-- Esquerda: nome -->
                  <p class="flex-1 min-w-0 text-[13px] font-semibold text-white/85 truncate">{{ item.produto_nome || item.nome }}</p>

                  <!-- Centro: stepper -->
                  <div class="flex items-center gap-1.5 shrink-0 mx-3">
                    <button
                      @click="decrementarItem(item)"
                      :disabled="ajustando === item.id"
                      class="w-8 h-8 rounded-[10px] flex items-center justify-center font-black text-[16px] transition-all active:scale-90 disabled:opacity-30"
                      :style="item.quantidade === 1
                        ? 'background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.2);'
                        : 'background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.09);'"
                    >
                      <Loader2 v-if="ajustando === item.id" :size="12" class="animate-spin" />
                      <span v-else>−</span>
                    </button>

                    <span class="text-[15px] font-black text-white tabular-nums w-5 text-center shrink-0">{{ item.quantidade }}</span>

                    <button
                      @click="incrementarItem(item)"
                      :disabled="ajustando === item.id"
                      class="w-8 h-8 rounded-[10px] flex items-center justify-center font-black text-[16px] transition-all active:scale-90 disabled:opacity-30"
                      style="background: rgba(249,115,22,0.12); color: #fb923c; border: 1px solid rgba(249,115,22,0.2);"
                    >
                      <span>+</span>
                    </button>
                  </div>

                  <!-- Direita: valor -->
                  <span class="shrink-0 text-[13px] font-black text-white/45 tabular-nums whitespace-nowrap text-right">
                    R$ {{ fmt((item.preco_unitario || 0) * item.quantidade) }}
                  </span>
                </div>

                <!-- Total da mesa -->
                <div
                  class="flex justify-between items-center mx-5 my-3 rounded-[14px] px-4 py-3"
                  style="background: rgba(249,115,22,0.07); border: 1px solid rgba(249,115,22,0.15);"
                >
                  <span class="text-[12px] font-bold text-white/40">Total da mesa</span>
                  <span class="text-[16px] font-black text-orange-400 tabular-nums">R$ {{ fmt(totalMesa) }}</span>
                </div>
              </div>
            </div>

            <!-- Footer: ações -->
            <div
              class="px-5 pt-3 flex gap-3 shrink-0"
              style="border-top: 1px solid rgba(255,255,255,0.05); padding-bottom: max(20px, env(safe-area-inset-bottom));"
            >
              <button
                @click="imprimirComanda"
                :disabled="!itensMesa.length"
                class="h-[52px] px-4 rounded-[16px] flex items-center justify-center gap-2 font-black text-[13px] transition-all active:scale-[0.98] disabled:opacity-30 shrink-0"
                style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.09); color: rgba(255,255,255,0.5);"
              >
                <Printer :size="16" />
                Imprimir
              </button>
              <button
                @click="carrinhoAberto = false"
                class="flex-1 h-[52px] rounded-[16px] text-white font-black text-[14px] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style="background: #f97316; box-shadow: 0 6px 20px rgba(249,115,22,0.3);"
              >
                <Plus :size="17" />
                Adicionar itens
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════════════════════════════════
         BOTTOM SHEET: NOVA MESA
    ══════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="modalNovaMesa" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/65" @click="modalNovaMesa = false; novaMesaNome = ''"></div>
          <div
            class="absolute bottom-0 left-0 right-0 rounded-t-[28px] px-5 pt-3"
            style="background: #141417; border-top: 1px solid rgba(255,255,255,0.07); padding-bottom: max(28px, env(safe-area-inset-bottom));"
          >
            <div class="flex justify-center mb-5">
              <div class="w-10 h-1 rounded-full bg-white/[0.09]"></div>
            </div>

            <div class="flex items-center justify-between mb-6">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-500/70">Novo atendimento</p>
                <h3 class="text-[18px] font-black text-white mt-0.5">Abrir Mesa</h3>
              </div>
              <button
                @click="modalNovaMesa = false; novaMesaNome = ''"
                class="w-8 h-8 rounded-full flex items-center justify-center text-white/25 active:scale-90"
                style="background: rgba(255,255,255,0.06);"
              >
                <X :size="15" />
              </button>
            </div>

            <input
              v-model="novaMesaNome"
              type="text"
              placeholder="Nome da mesa (ex: Mesa 5, Varanda...)"
              class="w-full h-[50px] px-4 rounded-[14px] text-[14px] text-white placeholder:text-white/20 outline-none transition-all mb-4"
              style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07);"
              @focus="($event.target as HTMLInputElement).style.borderColor='rgba(249,115,22,0.4)'"
              @blur="($event.target as HTMLInputElement).style.borderColor='rgba(255,255,255,0.07)'"
              @keypress.enter="abrirMesa"
            />

            <div class="flex gap-3">
              <button
                @click="modalNovaMesa = false; novaMesaNome = ''"
                class="flex-1 h-[50px] rounded-[14px] text-white/30 text-[13px] font-black transition-all active:scale-95"
                style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07);"
              >
                Cancelar
              </button>
              <button
                @click="abrirMesa"
                :disabled="abrindoMesa"
                class="flex-1 h-[50px] rounded-[14px] text-white text-[13px] font-black transition-all active:scale-95 disabled:opacity-50"
                style="background: #f97316; box-shadow: 0 4px 16px rgba(249,115,22,0.3);"
              >
                {{ abrindoMesa ? 'Abrindo...' : 'Abrir Mesa' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Plus, X, Loader2, LayoutGrid, UtensilsCrossed,
  ShoppingBag, Search, ChevronLeft, Printer
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { useToastStore } from '~/stores/toast'
import { useConfigStore } from '~/stores/configuracoes'

definePageMeta({ layout: 'mobile' })

const api         = useApi()
const authStore   = useAuthStore()
const toastStore  = useToastStore()
const configStore = useConfigStore()

// ── Estado ────────────────────────────────────────────────
const mesasAbertas    = ref<any[]>([])
const loading         = ref(false)
const mesaSelecionada = ref<any>(null)
const itensMesa       = ref<any[]>([])
const loadingItens    = ref(false)
const carrinhoAberto  = ref(false)

// ── Produtos ──────────────────────────────────────────────
const produtos       = ref<any[]>([])
const buscaProduto   = ref('')
const categoriaAtiva = ref('Todos')
const adicionando    = ref<number | null>(null)
const ajustando      = ref<number | null>(null)

// ── Nova mesa ─────────────────────────────────────────────
const modalNovaMesa = ref(false)
const novaMesaNome  = ref('')
const abrindoMesa   = ref(false)

let intervalo: ReturnType<typeof setInterval> | null = null

// ── Helpers ───────────────────────────────────────────────
function fmt(v: number) {
  return Number(v || 0).toFixed(2).replace('.', ',')
}

function formatarTempo(data: string) {
  if (!data) return ''
  const diff = Math.floor((Date.now() - new Date(data).getTime()) / 60000)
  if (diff < 60) return `${diff}min`
  const h = Math.floor(diff / 60), m = diff % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ── Computeds ─────────────────────────────────────────────
const categorias = computed(() => {
  const cats = [...new Set(produtos.value.filter(p => p.ativo && p.categoria).map(p => p.categoria))]
  return cats as string[]
})

const produtosFiltrados = computed(() => {
  let lista = produtos.value.filter(p => p.ativo)
  if (categoriaAtiva.value !== 'Todos') lista = lista.filter(p => p.categoria === categoriaAtiva.value)
  const q = buscaProduto.value.toLowerCase().trim()
  if (q) lista = lista.filter(p => p.nome.toLowerCase().includes(q))
  return lista
})

const totalMesa = computed(() =>
  itensMesa.value.reduce((s, i) => s + (i.preco_unitario || 0) * i.quantidade, 0)
)

const quantidadeItensMesa = computed(() =>
  itensMesa.value.reduce((s, i) => s + i.quantidade, 0)
)

// ── Mesas ─────────────────────────────────────────────────
async function carregarMesas() {
  loading.value = true
  try {
    const rows = await api.get<any[]>('/mesas')
    mesasAbertas.value = (rows || []).filter((m: any) => m.status === 'aberta' || m.aberta)
  } catch {}
  finally { loading.value = false }
}

async function carregarProdutos() {
  try {
    const rows = await api.get<any[]>('/produtos')
    produtos.value = (rows || []).filter((p: any) => p.ativo)
  } catch {}
}

async function carregarItensMesa(mesaId: number) {
  loadingItens.value = true
  try {
    const resp = await api.get<any[]>(`/mesas/${mesaId}/produtos`)
    itensMesa.value = resp || []
  } catch {
    itensMesa.value = []
  } finally {
    loadingItens.value = false
  }
}

async function selecionarMesa(mesa: any) {
  mesaSelecionada.value = mesa
  buscaProduto.value    = ''
  categoriaAtiva.value  = 'Todos'
  carrinhoAberto.value  = false
  await carregarItensMesa(mesa.id)
}

function voltarParaMesas() {
  mesaSelecionada.value = null
  itensMesa.value       = []
  carrinhoAberto.value  = false
}

// ── Stepper do carrinho ────────────────────────────────────
async function incrementarItem(item: any) {
  if (ajustando.value) return
  ajustando.value = item.id
  try {
    await api.post('/pedidos/adicionar', {
      mesa_id:    mesaSelecionada.value.id,
      produto_id: item.produto_id,
      quantidade: 1,
      garcom_id:  authStore.usuario?.id
    })
    item.quantidade += 1
  } catch {
    toastStore.error('Erro ao adicionar')
  } finally {
    ajustando.value = null
  }
}

async function decrementarItem(item: any) {
  if (ajustando.value) return
  ajustando.value = item.id
  try {
    await api.patch(`/pedidos/itens/${item.id}/decrementar`)
    if (item.quantidade <= 1) {
      itensMesa.value = itensMesa.value.filter(i => i.id !== item.id)
    } else {
      item.quantidade -= 1
    }
  } catch {
    toastStore.error('Erro ao remover')
  } finally {
    ajustando.value = null
  }
}

// ── Adicionar produto na mesa ──────────────────────────────
async function adicionarItemMesa(produto: any) {
  if (!mesaSelecionada.value) return

  const userId = authStore.usuario?.id

  if (userId) {
    const donoDaMesa = mesaSelecionada.value.garcom_id
    if (donoDaMesa && donoDaMesa !== userId) {
      const mesasDoGarcom = mesasAbertas.value.filter(m => m.garcom_id === userId)
      if (mesasDoGarcom.length === 0) {
        toastStore.warning('Você não tem mesa aberta. Abra uma mesa primeiro.')
        return
      }
      if (mesasDoGarcom.length === 1) {
        toastStore.info('Redirecionado para a sua mesa.')
        await selecionarMesa(mesasDoGarcom[0])
        return
      }
      voltarParaMesas()
      toastStore.info('Selecione a sua mesa.')
      return
    }
  }

  adicionando.value = produto.id
  try {
    await api.post('/pedidos/adicionar', {
      mesa_id:    mesaSelecionada.value.id,
      produto_id: produto.id,
      quantidade: 1,
      ...(userId ? { garcom_id: userId } : {})
    })
    toastStore.success(`${produto.nome} adicionado!`)
    carregarItensMesa(mesaSelecionada.value.id)
  } catch {
    toastStore.error('Erro ao adicionar item')
  } finally {
    adicionando.value = null
  }
}

async function abrirMesa() {
  const garcomId = authStore.usuario?.id
  abrindoMesa.value = true
  try {
    const nome = novaMesaNome.value.trim() || undefined
    await api.post('/mesas/abrir', { nome_mesa: nome, ...(garcomId ? { garcom_id: garcomId } : {}) })
    toastStore.success('Mesa aberta!')
    modalNovaMesa.value = false
    novaMesaNome.value  = ''
    await carregarMesas()
  } catch {
    toastStore.error('Erro ao abrir mesa')
  } finally {
    abrindoMesa.value = false
  }
}

// ── Impressão da comanda ──────────────────────────────────
function imprimirComanda() {
  if (!mesaSelecionada.value || !itensMesa.value.length) return

  const mesa  = mesaSelecionada.value
  const itens = itensMesa.value
  const data  = new Date().toLocaleString('pt-BR')
  const logo      = configStore.logo_base64
  const nomeRest  = configStore.nome_restaurante || 'Restaurante PDV'
  const logoAltura = ({ pequena: '24px', media: '36px', grande: '96px' } as Record<string, string>)[configStore.logo_tamanho] ?? '36px'
  const logoHtml  = logo
    ? `<img src="${logo}" style="height:${logoAltura};object-fit:contain;display:block;margin:0 auto 4px;" />`
    : ''

  const linhas = itens.map(i =>
    `<tr>
      <td>${i.produto_nome || i.nome}</td>
      <td style="text-align:center">${i.quantidade}</td>
      <td style="text-align:right">R$ ${Number((i.preco_unitario || 0) * i.quantidade).toFixed(2)}</td>
    </tr>`
  ).join('')

  const total = totalMesa.value

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Comanda - ${mesa.nome_mesa}</title>
  <style>
    body { font-family: monospace; font-size: 13px; padding: 16px; max-width: 320px; margin: 0 auto }
    .cab { text-align: center; margin-bottom: 12px }
    h1 { font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 2px }
    .sub { text-align: center; color: #666; margin-bottom: 12px; font-size: 12px }
    table { width: 100%; border-collapse: collapse }
    th { border-bottom: 1px solid #000; padding: 4px 0; font-size: 11px }
    td { padding: 3px 0 }
    .sep { border-top: 1px dashed #000; margin: 8px 0 }
    .total { font-weight: bold; font-size: 15px }
  </style></head><body>
  <div class="cab">${logoHtml}<h1>${nomeRest}</h1>
  <div style="font-size:11px;color:#888;margin-top:1px">COMANDA DA MESA</div></div>
  <div class="sub">${mesa.nome_mesa} &nbsp;|&nbsp; ${data}</div>
  <table>
    <thead><tr>
      <th style="text-align:left">Item</th>
      <th>Qtd</th>
      <th style="text-align:right">Total</th>
    </tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="sep"></div>
  <table><tbody>
    <tr class="total">
      <td colspan="2">Total</td>
      <td style="text-align:right">R$ ${total.toFixed(2)}</td>
    </tr>
  </tbody></table>
  </body></html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;'
  document.body.appendChild(iframe)
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow!.focus()
      iframe.contentWindow!.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 250)
  }
  const doc = iframe.contentDocument!
  doc.open(); doc.write(html); doc.close()
}

onMounted(async () => {
  const modo = authStore.usuario?.cargo === 'administrador'
    ? 'ambos'
    : (authStore.usuario?.permissoes?.modo_venda as string) || 'ambos'
  if (!authStore.temPermissao('adicionarPedido') || (modo !== 'mesas' && modo !== 'ambos')) {
    navigateTo('/m/vendas')
    return
  }

  await Promise.all([carregarMesas(), carregarProdutos()])

  const userId = authStore.usuario?.id
  if (userId && authStore.usuario?.cargo === 'garcom') {
    const mesasDoGarcom = mesasAbertas.value.filter(m => m.garcom_id === userId)
    if (mesasDoGarcom.length === 1) await selecionarMesa(mesasDoGarcom[0])
  }

  intervalo = setInterval(carregarMesas, 30000)
})

onUnmounted(() => { if (intervalo) clearInterval(intervalo) })
</script>

<style scoped>
.sheet-enter-active,
.sheet-leave-active { transition: opacity 0.22s; }
.sheet-enter-active .absolute.bottom-0,
.sheet-leave-active .absolute.bottom-0 {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .absolute.bottom-0,
.sheet-leave-to .absolute.bottom-0 { transform: translateY(100%); }

.fab-enter-active { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease; }
.fab-leave-active { transition: transform 0.18s ease-in, opacity 0.18s ease; }
.fab-enter-from, .fab-leave-to { transform: scale(0.4) translateY(10px); opacity: 0; }

@keyframes badge-pop {
  0%   { transform: scale(1); }
  45%  { transform: scale(1.5); }
  100% { transform: scale(1); }
}
.badge-pop { animation: badge-pop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1); }

.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
