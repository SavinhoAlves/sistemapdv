<template>
  <div class="flex flex-col min-h-full">

    <!-- PAGE HEADER -->
    <div class="relative px-5 pt-6 pb-5 overflow-hidden">
      <!-- Glow ambiental laranja -->
      <div
        class="absolute inset-0 pointer-events-none"
        style="background: radial-gradient(ellipse 70% 90% at 0% 0%, rgba(249,115,22,0.09) 0%, transparent 70%);"
      ></div>
      <div class="relative flex items-start justify-between">
        <div>
          <h1 class="text-[30px] font-black text-white tracking-tight leading-none">Mesas</h1>
          <p class="text-[12px] font-medium mt-2" :class="mesasAbertas.length ? 'text-white/35' : 'text-white/20'">
            <template v-if="authStore.usuario?.cargo === 'garcom'">{{ authStore.usuario.nome }}</template>
            <template v-else-if="mesasAbertas.length">{{ mesasAbertas.length }} mesa{{ mesasAbertas.length !== 1 ? 's' : '' }} em atendimento</template>
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

    <!-- LOADING -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <Loader2 :size="22" class="animate-spin text-orange-500/60" />
    </div>

    <!-- EMPTY -->
    <div v-else-if="!mesasAbertas.length" class="flex-1 flex flex-col items-center justify-center gap-5 text-center px-8 pb-24">
      <div
        class="w-20 h-20 rounded-[24px] flex items-center justify-center"
        style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);"
      >
        <LayoutGrid :size="26" class="text-white/15" />
      </div>
      <div>
        <p class="text-[15px] font-black text-white/35">Nenhuma mesa aberta</p>
        <p class="text-[12px] text-white/18 mt-1.5 font-medium">Toque em "Nova Mesa" para começar</p>
      </div>
    </div>

    <!-- CONTEÚDO PRINCIPAL -->
    <div v-else class="px-4 pb-36">

      <!-- Banner filtro garçom -->
      <div
        v-if="garcomFiltroId"
        class="mb-4 flex items-center gap-3 px-4 py-3 rounded-[16px]"
        style="background: rgba(249,115,22,0.08); border: 1px solid rgba(249,115,22,0.18);"
      >
        <UserCheck :size="14" class="text-orange-400 shrink-0" />
        <span class="text-[12px] font-bold text-orange-300/75 flex-1">Mesas de {{ garcomFiltroNome }}</span>
        <button
          @click="garcomFiltroId = null; garcomFiltroNome = ''"
          class="text-[11px] font-black text-white/25 hover:text-white/50 transition-colors"
        >
          Ver todas
        </button>
      </div>

      <!-- GRID DE MESAS -->
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="mesa in mesasAbertas"
          :key="mesa.id"
          @click="abrirDetalhesMesa(mesa)"
          :disabled="garcomFiltroId !== null && mesa.garcom_id !== garcomFiltroId"
          class="text-left transition-all rounded-[20px] p-4"
          :style="garcomFiltroId !== null && mesa.garcom_id !== garcomFiltroId
            ? 'background:#161619; border:1px solid rgba(255,255,255,0.04); opacity:0.2; cursor:not-allowed;'
            : 'background:#161619; border:1px solid rgba(255,255,255,0.07);'"
          @mousedown="garcomFiltroId === null || mesa.garcom_id === garcomFiltroId ? $event.currentTarget.style.background='#1c1c1f' : null"
          @mouseup="$event.currentTarget.style.background='#161619'"
          @touchstart="garcomFiltroId === null || mesa.garcom_id === garcomFiltroId ? $event.currentTarget.style.background='#1c1c1f' : null"
          @touchend="$event.currentTarget.style.background='#161619'"
        >
          <!-- Status + tempo -->
          <div class="flex items-center justify-between mb-4">
            <span
              class="w-2 h-2 rounded-full bg-emerald-400"
              style="box-shadow: 0 0 6px rgba(52,211,153,0.5);"
            ></span>
            <span class="text-[10px] font-semibold text-white/20 tabular-nums">{{ formatarTempo(mesa.data_abertura) }}</span>
          </div>
          <!-- Nome -->
          <p class="text-[15px] font-black text-white leading-tight line-clamp-2">{{ mesa.nome_mesa }}</p>
          <!-- Garçom -->
          <p v-if="mesa.garcom" class="text-[11px] font-medium text-white/30 mt-1 truncate">{{ mesa.garcom }}</p>
        </button>
      </div>
    </div>

    <!-- BOTTOM SHEET: DETALHES DA MESA -->
    <Teleport to="body">
      <Transition name="sheet">
        <div v-if="mesaSelecionada" class="fixed inset-0 z-50">
          <div class="absolute inset-0 bg-black/60" @click="mesaSelecionada = null"></div>
          <div
            class="absolute bottom-0 left-0 right-0 rounded-t-[28px] max-h-[85vh] flex flex-col"
            style="background: #141417; border-top: 1px solid rgba(255,255,255,0.07);"
          >
            <div class="flex justify-center pt-3 pb-1 shrink-0">
              <div class="w-10 h-1 rounded-full bg-white/[0.09]"></div>
            </div>

            <div class="px-5 py-3.5 flex items-start justify-between shrink-0">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-500/70">Mesa aberta</p>
                <h3 class="text-[20px] font-black text-white mt-1 leading-tight">{{ mesaSelecionada.nome_mesa }}</h3>
                <p v-if="mesaSelecionada.garcom" class="text-[12px] font-medium text-white/30 mt-0.5">{{ mesaSelecionada.garcom }}</p>
              </div>
              <button
                @click="mesaSelecionada = null"
                class="w-8 h-8 rounded-full flex items-center justify-center text-white/25 hover:text-white/60 transition-all shrink-0 mt-1"
                style="background: rgba(255,255,255,0.06);"
              >
                <X :size="15" />
              </button>
            </div>

            <div class="h-px mx-5 shrink-0 bg-white/[0.05]"></div>

            <div class="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              <div v-if="loadingItens" class="flex justify-center py-10">
                <Loader2 :size="20" class="animate-spin text-orange-400/60" />
              </div>
              <template v-else-if="itensMesa.length">
                <div
                  v-for="item in itensMesa"
                  :key="item.id"
                  class="flex items-center gap-3 rounded-[14px] px-3.5 py-2.5"
                  style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.05);"
                >
                  <div
                    class="w-6 h-6 rounded-[8px] flex items-center justify-center text-[11px] font-black text-orange-400 shrink-0"
                    style="background: rgba(249,115,22,0.12);"
                  >
                    {{ item.quantidade }}
                  </div>
                  <span class="flex-1 text-[13px] font-semibold text-white/85 truncate">{{ item.produto_nome || item.nome }}</span>
                  <span class="text-[12px] font-black text-white/40 shrink-0">
                    R$ {{ fmt(item.total || (item.preco_unitario || 0) * item.quantidade) }}
                  </span>
                </div>

                <!-- Total -->
                <div
                  class="flex justify-between items-center rounded-[14px] px-3.5 py-3 mt-1"
                  style="background: rgba(249,115,22,0.07); border: 1px solid rgba(249,115,22,0.15);"
                >
                  <span class="text-[12px] font-bold text-white/40">Total da mesa</span>
                  <span class="text-[15px] font-black text-orange-400">R$ {{ fmt(totalMesa) }}</span>
                </div>
              </template>
              <div v-else class="flex flex-col items-center justify-center py-12 gap-3">
                <ShoppingBag :size="26" class="text-white/[0.08]" />
                <p class="text-[12px] font-semibold text-white/20">Nenhum item ainda</p>
              </div>
            </div>

            <div class="px-5 py-4 shrink-0" style="border-top: 1px solid rgba(255,255,255,0.05);">
              <button
                v-if="authStore.temPermissao('adicionarPedido')"
                @click="abrirProdutos"
                class="w-full h-[52px] rounded-[16px] text-white font-black text-[14px] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                style="background: #f97316; box-shadow: 0 6px 20px rgba(249,115,22,0.3);"
              >
                <Plus :size="17" />
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
          <div class="absolute inset-0 bg-black/65" @click="modalProdutos = false"></div>
          <div
            class="absolute bottom-0 left-0 right-0 rounded-t-[28px] max-h-[92vh] flex flex-col"
            style="background: #141417; border-top: 1px solid rgba(255,255,255,0.07);"
          >
            <div class="flex justify-center pt-3 pb-1 shrink-0">
              <div class="w-10 h-1 rounded-full bg-white/[0.09]"></div>
            </div>

            <div class="px-5 pb-3 flex items-center justify-between shrink-0">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-500/70">{{ mesaSelecionada?.nome_mesa }}</p>
                <h3 class="text-[17px] font-black text-white mt-0.5">Adicionar Item</h3>
              </div>
              <button
                @click="modalProdutos = false"
                class="w-8 h-8 rounded-full flex items-center justify-center text-white/25"
                style="background: rgba(255,255,255,0.06);"
              >
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
                  class="w-full h-10 pl-9 pr-4 rounded-[12px] text-[13px] text-white placeholder:text-white/20 outline-none transition-all"
                  style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07);"
                  @focus="($event.target as HTMLInputElement).style.borderColor='rgba(249,115,22,0.4)'"
                  @blur="($event.target as HTMLInputElement).style.borderColor='rgba(255,255,255,0.07)'"
                />
              </div>
            </div>

            <div class="h-px mx-5 shrink-0 bg-white/[0.05]"></div>

            <div class="flex-1 overflow-y-auto px-4 py-3">
              <div v-if="!produtosFiltrados.length" class="flex flex-col items-center justify-center py-12 gap-2.5">
                <UtensilsCrossed :size="24" class="text-white/[0.08]" />
                <p class="text-[12px] font-semibold text-white/20">Nenhum produto encontrado</p>
              </div>
              <div v-else class="grid grid-cols-2 gap-2.5">
                <button
                  v-for="p in produtosFiltrados"
                  :key="p.id"
                  @click="adicionarItemMesa(p)"
                  :disabled="adicionando === p.id"
                  class="flex flex-col items-center text-center rounded-[18px] p-4 transition-all active:scale-[0.97] disabled:opacity-40"
                  style="background: #161619; border: 1px solid rgba(255,255,255,0.06);"
                >
                  <div
                    class="w-10 h-10 rounded-[14px] flex items-center justify-center mb-3 shrink-0"
                    style="background: rgba(249,115,22,0.1);"
                  >
                    <Loader2 v-if="adicionando === p.id" :size="15" class="animate-spin text-orange-400" />
                    <UtensilsCrossed v-else :size="15" class="text-orange-400/60" />
                  </div>
                  <p class="text-[12px] font-black text-white leading-snug line-clamp-2">{{ p.nome }}</p>
                  <p v-if="p.categoria" class="text-[10px] text-white/20 mt-0.5 truncate w-full font-medium">{{ p.categoria }}</p>
                  <p class="text-[14px] font-black text-orange-400 mt-2">R$ {{ fmt(p.preco) }}</p>
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
          <div class="absolute inset-0 bg-black/60" @click="modalNovaMesa = false; novaMesaNome = ''"></div>
          <div
            class="absolute bottom-0 left-0 right-0 rounded-t-[28px] px-5 pt-3 pb-8"
            style="background: #141417; border-top: 1px solid rgba(255,255,255,0.07);"
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
                class="w-8 h-8 rounded-full flex items-center justify-center text-white/25"
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
            />

            <div class="flex gap-3">
              <button
                @click="modalNovaMesa = false; novaMesaNome = ''"
                class="flex-1 h-[50px] rounded-[14px] text-white/30 text-[13px] font-black transition-all active:scale-95"
                style="border: 1px solid rgba(255,255,255,0.07);"
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
  // Guard: só perfis com modo_venda 'mesas' ou 'ambos' acessam esta página
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
