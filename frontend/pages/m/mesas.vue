<template>
  <div class="flex flex-col min-h-full">

    <!-- HEADER -->
    <div class="px-5 pt-5 pb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-white tracking-tight">Mesas</h1>
        <p class="text-[11px] font-medium text-white/30 mt-0.5">
          <template v-if="authStore.usuario?.cargo === 'garcom'">{{ authStore.usuario.nome }}</template>
          <template v-else>{{ mesasAbertas.length }} abertas</template>
        </p>
      </div>
      <button
        v-if="authStore.temPermissao('abrirMesa')"
        @click="modalNovaMesa = true"
        class="h-8 px-3.5 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
      >
        <Plus :size="13" />
        Nova Mesa
      </button>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <Loader2 :size="22" class="animate-spin text-orange-400" />
    </div>

    <!-- EMPTY -->
    <div v-else-if="!mesasAbertas.length" class="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
      <div class="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
        <LayoutGrid :size="22" class="text-white/15" />
      </div>
      <div>
        <p class="text-sm font-black text-white/40">Nenhuma mesa aberta</p>
        <p class="text-xs text-white/20 mt-1">Toque em "Nova Mesa" para começar</p>
      </div>
    </div>

    <!-- GRID DE MESAS -->
    <div v-else class="px-4 pb-32">

      <!-- Banner filtro -->
      <div v-if="garcomFiltroId" class="mb-3 flex items-center gap-2.5 px-3.5 py-2.5 bg-orange-500/8 border border-orange-500/20 rounded-2xl">
        <UserCheck :size="13" class="text-orange-400 shrink-0" />
        <span class="text-[11px] font-bold text-orange-300/80 flex-1">Mesas de {{ garcomFiltroNome }}</span>
        <button
          @click="garcomFiltroId = null; garcomFiltroNome = ''"
          class="text-[10px] font-black text-white/30 hover:text-white/60 transition-colors"
        >
          Ver todas
        </button>
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        <button
          v-for="mesa in mesasAbertas"
          :key="mesa.id"
          @click="abrirDetalhesMesa(mesa)"
          :disabled="garcomFiltroId !== null && mesa.garcom_id !== garcomFiltroId"
          class="rounded-3xl p-4 text-left transition-all border"
          :class="garcomFiltroId !== null && mesa.garcom_id !== garcomFiltroId
            ? 'border-white/[0.04] bg-white/[0.02] opacity-20 cursor-not-allowed'
            : 'border-white/[0.07] bg-white/[0.04] active:scale-[0.97] active:bg-white/[0.07] hover:border-white/[0.12]'"
        >
          <!-- Status + tempo -->
          <div class="flex items-center justify-between mb-4">
            <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.45)]"></span>
            <span class="text-[10px] font-bold text-white/20 tabular-nums">{{ formatarTempo(mesa.data_abertura) }}</span>
          </div>
          <!-- Nome -->
          <p class="text-[15px] font-black text-white leading-tight line-clamp-2">{{ mesa.nome_mesa }}</p>
          <!-- Garçom -->
          <p v-if="mesa.garcom" class="text-[11px] text-white/30 mt-1 truncate">{{ mesa.garcom }}</p>
        </button>
      </div>
    </div>

    <!-- BOTTOM SHEET: DETALHES DA MESA -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="mesaSelecionada" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/65" @click="mesaSelecionada = null"></div>
          <div class="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-white/[0.07] rounded-t-3xl max-h-[85vh] flex flex-col">

            <div class="flex justify-center pt-3 pb-1 shrink-0">
              <div class="w-10 h-1 rounded-full bg-white/10"></div>
            </div>

            <div class="px-5 py-3 flex items-start justify-between shrink-0">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.12em] text-orange-400">Mesa aberta</p>
                <h3 class="text-lg font-black text-white mt-0.5">{{ mesaSelecionada.nome_mesa }}</h3>
                <p v-if="mesaSelecionada.garcom" class="text-xs text-white/30 mt-0.5">{{ mesaSelecionada.garcom }}</p>
              </div>
              <button
                @click="mesaSelecionada = null"
                class="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white transition-all shrink-0 mt-0.5"
              >
                <X :size="15" />
              </button>
            </div>

            <div class="h-px bg-white/[0.06] mx-5 shrink-0"></div>

            <div class="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              <div v-if="loadingItens" class="flex justify-center py-10">
                <Loader2 :size="20" class="animate-spin text-orange-400" />
              </div>
              <template v-else-if="itensMesa.length">
                <div
                  v-for="item in itensMesa"
                  :key="item.id"
                  class="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-2xl px-3.5 py-2.5"
                >
                  <span class="w-6 h-6 rounded-lg bg-orange-500/15 flex items-center justify-center text-[11px] font-black text-orange-400 shrink-0">
                    {{ item.quantidade }}
                  </span>
                  <span class="flex-1 text-xs font-bold text-white truncate">{{ item.produto_nome || item.nome }}</span>
                  <span class="text-xs font-black text-white/40 shrink-0">
                    R$ {{ fmt(item.total || (item.preco_unitario || 0) * item.quantidade) }}
                  </span>
                </div>

                <div class="flex justify-between items-center bg-orange-500/6 border border-orange-500/15 rounded-2xl px-3.5 py-2.5 mt-1">
                  <span class="text-xs font-black text-white/40">Total da mesa</span>
                  <span class="text-sm font-black text-orange-400">R$ {{ fmt(totalMesa) }}</span>
                </div>
              </template>
              <div v-else class="flex flex-col items-center justify-center py-10 gap-2.5">
                <ShoppingBag :size="24" class="text-white/10" />
                <p class="text-xs text-white/20 font-bold">Nenhum item ainda</p>
              </div>
            </div>

            <div class="px-5 py-4 border-t border-white/[0.06] shrink-0">
              <button
                v-if="authStore.temPermissao('adicionarPedido')"
                @click="abrirProdutos"
                class="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <Plus :size="16" />
                Adicionar Item
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- BOTTOM SHEET: SELETOR DE PRODUTOS -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="modalProdutos" class="fixed inset-0 z-[60]">
          <div class="absolute inset-0 bg-black/70" @click="modalProdutos = false"></div>
          <div class="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-white/[0.07] rounded-t-3xl max-h-[92vh] flex flex-col">

            <div class="flex justify-center pt-3 pb-1 shrink-0">
              <div class="w-10 h-1 rounded-full bg-white/10"></div>
            </div>

            <div class="px-5 pb-3 flex items-center justify-between shrink-0">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.12em] text-orange-400">{{ mesaSelecionada?.nome_mesa }}</p>
                <h3 class="text-base font-black text-white mt-0.5">Adicionar Item</h3>
              </div>
              <button @click="modalProdutos = false" class="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/30">
                <X :size="15" />
              </button>
            </div>

            <div class="px-5 pb-3 shrink-0">
              <div class="relative">
                <Search :size="13" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  v-model="buscaProduto"
                  type="text"
                  placeholder="Buscar produto..."
                  class="w-full h-10 pl-9 pr-4 bg-white/[0.05] border border-white/[0.07] rounded-xl text-sm text-white placeholder:text-white/20 outline-none focus:border-orange-500/40 transition-all"
                />
              </div>
            </div>

            <div class="h-px bg-white/[0.05] mx-5 shrink-0"></div>

            <div class="flex-1 overflow-y-auto px-4 py-3">
              <div v-if="!produtosFiltrados.length" class="flex flex-col items-center justify-center py-12 gap-2">
                <UtensilsCrossed :size="22" class="text-white/10" />
                <p class="text-xs text-white/20 font-bold">Nenhum produto encontrado</p>
              </div>
              <div v-else class="grid grid-cols-2 gap-2.5">
                <button
                  v-for="p in produtosFiltrados"
                  :key="p.id"
                  @click="adicionarItemMesa(p)"
                  :disabled="adicionando === p.id"
                  class="bg-white/[0.04] border border-white/[0.06] rounded-3xl p-3.5 flex flex-col items-center text-center active:scale-[0.97] transition-all disabled:opacity-50 hover:border-white/[0.12] hover:bg-white/[0.07]"
                >
                  <div class="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-2.5 shrink-0">
                    <Loader2 v-if="adicionando === p.id" :size="15" class="animate-spin text-orange-400" />
                    <UtensilsCrossed v-else :size="15" class="text-orange-400/70" />
                  </div>
                  <p class="text-xs font-black text-white leading-snug line-clamp-2">{{ p.nome }}</p>
                  <p v-if="p.categoria" class="text-[10px] text-white/20 mt-0.5 truncate w-full">{{ p.categoria }}</p>
                  <p class="text-sm font-black text-orange-400 mt-2">R$ {{ fmt(p.preco) }}</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- BOTTOM SHEET: NOVA MESA -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="modalNovaMesa" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/65" @click="modalNovaMesa = false; novaMesaNome = ''"></div>
          <div class="absolute bottom-0 left-0 right-0 bg-neutral-900 border-t border-white/[0.07] rounded-t-3xl px-5 pt-3 pb-8">

            <div class="flex justify-center mb-4">
              <div class="w-10 h-1 rounded-full bg-white/10"></div>
            </div>

            <div class="flex items-center justify-between mb-5">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.12em] text-orange-400">Novo atendimento</p>
                <h3 class="text-base font-black text-white mt-0.5">Abrir Mesa</h3>
              </div>
              <button
                @click="modalNovaMesa = false; novaMesaNome = ''"
                class="w-8 h-8 rounded-xl bg-white/[0.06] flex items-center justify-center text-white/30"
              >
                <X :size="15" />
              </button>
            </div>

            <input
              v-model="novaMesaNome"
              type="text"
              placeholder="Nome da mesa (ex: Mesa 5, Varanda...)"
              class="w-full h-12 px-4 bg-white/[0.05] border border-white/[0.07] rounded-2xl text-sm text-white placeholder:text-white/20 outline-none focus:border-orange-500/40 transition-all mb-4"
            />

            <div class="flex gap-2.5">
              <button
                @click="modalNovaMesa = false; novaMesaNome = ''"
                class="flex-1 h-12 rounded-2xl border border-white/[0.07] text-white/30 text-sm font-black transition-all active:scale-95 hover:bg-white/[0.04]"
              >
                Cancelar
              </button>
              <button
                @click="abrirMesa"
                :disabled="abrindoMesa"
                class="flex-1 h-12 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 active:scale-95 text-white text-sm font-black transition-all shadow-lg shadow-orange-500/20"
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
import { Plus, X, Loader2, LayoutGrid, UtensilsCrossed, ShoppingBag, Search, UserCheck } from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useAuthStore } from '~/stores/auth'
import { useToastStore } from '~/stores/toast'

definePageMeta({ layout: 'mobile' })

const api        = useApi()
const authStore  = useAuthStore()
const toastStore = useToastStore()

const mesasAbertas    = ref<any[]>([])
const loading         = ref(false)
const mesaSelecionada = ref<any>(null)
const itensMesa       = ref<any[]>([])
const loadingItens    = ref(false)

const modalProdutos  = ref(false)
const buscaProduto   = ref('')
const produtos       = ref<any[]>([])
const adicionando    = ref<number | null>(null)

const garcomFiltroId   = ref<number | null>(null)
const garcomFiltroNome = ref('')

const modalNovaMesa = ref(false)
const novaMesaNome  = ref('')
const abrindoMesa   = ref(false)

let intervalo: ReturnType<typeof setInterval> | null = null

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

const produtosFiltrados = computed(() => {
  const q = buscaProduto.value.toLowerCase().trim()
  if (!q) return produtos.value
  return produtos.value.filter(p => p.nome.toLowerCase().includes(q))
})

const totalMesa = computed(() =>
  itensMesa.value.reduce((s, i) => s + Number(i.total || (i.preco_unitario || 0) * i.quantidade), 0)
)

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

async function abrirDetalhesMesa(mesa: any) {
  garcomFiltroId.value   = null
  garcomFiltroNome.value = ''
  mesaSelecionada.value  = mesa
  itensMesa.value        = []
  loadingItens.value     = true
  try {
    const resp = await api.get<any[]>(`/mesas/${mesa.id}/produtos`)
    itensMesa.value = resp || []
  } catch {
    itensMesa.value = []
  } finally {
    loadingItens.value = false
  }
}

function abrirProdutos() {
  buscaProduto.value  = ''
  modalProdutos.value = true
}

async function adicionarItemMesa(produto: any) {
  if (!mesaSelecionada.value) return

  const userId   = authStore.usuario?.id
  const userName = authStore.usuario?.nome ?? ''

  if (userId) {
    const donoDaMesa = mesaSelecionada.value.garcom_id
    if (donoDaMesa && donoDaMesa !== userId) {
      const mesasDoGarcom = mesasAbertas.value.filter(m => m.garcom_id === userId)
      if (mesasDoGarcom.length === 0) {
        toastStore.warning('Você não tem mesa aberta. Abra uma mesa primeiro.')
        return
      }
      if (mesasDoGarcom.length === 1) {
        toastStore.success('Redirecionado para a sua mesa.')
        await abrirDetalhesMesa(mesasDoGarcom[0])
      } else {
        garcomFiltroId.value   = userId
        garcomFiltroNome.value = userName
        mesaSelecionada.value  = null
        modalProdutos.value    = false
        toastStore.info('Você tem várias mesas abertas. Selecione a correta.')
        return
      }
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
    await abrirDetalhesMesa(mesaSelecionada.value)
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

onMounted(async () => {
  await Promise.all([carregarMesas(), carregarProdutos()])

  const userId = authStore.usuario?.id
  if (userId && authStore.usuario?.cargo === 'garcom') {
    const mesasDoGarcom = mesasAbertas.value.filter(m => m.garcom_id === userId)
    if (mesasDoGarcom.length === 1)      await abrirDetalhesMesa(mesasDoGarcom[0])
    else if (mesasDoGarcom.length > 1) { garcomFiltroId.value = userId; garcomFiltroNome.value = authStore.usuario.nome }
  }

  intervalo = setInterval(carregarMesas, 30000)
})

onUnmounted(() => { if (intervalo) clearInterval(intervalo) })
</script>

<style scoped>
.sheet-enter-active,
.sheet-leave-active { transition: opacity 0.2s; }
.sheet-enter-active .absolute.bottom-0,
.sheet-leave-active .absolute.bottom-0 {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from,
.sheet-leave-to { opacity: 0; }
.sheet-enter-from .absolute.bottom-0,
.sheet-leave-to .absolute.bottom-0 { transform: translateY(100%); }
</style>
