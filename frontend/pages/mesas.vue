<template>
  <div class="h-screen overflow-hidden com-sidebar">

    <Sidebar />

    <div
      class="pagina-mesas h-screen flex flex-col"
      :class="{ 'sidebar-open': sidebarMesa }"
    >
      <Navbar />

      <main class="flex-1 overflow-hidden relative">
        <CaixaFechado acao="iniciar mesas e lançar pedidos" />

        <!-- SALÃO -->
        <div v-if="!modoProdutos" class="salao h-full overflow-auto">

          <!-- CABEÇALHO -->
          <header class="salao__cabeca">
            <div class="min-w-0">
              <h1 class="salao__titulo">Mesas</h1>
              <p class="salao__resumo">
                <span>{{ mesasDoOperador.length }} {{ mesasDoOperador.length === 1 ? 'comanda aberta' : 'comandas abertas' }}</span>
                <span v-if="mesasDoOperador.length" class="salao__sep" aria-hidden="true">·</span>
                <span v-if="mesasDoOperador.length">a receber <strong class="pdv-valor">{{ moeda.format(totalSalao) }}</strong></span>
              </p>
            </div>

            <div class="flex items-center gap-2">
              <button
                v-if="rfidAtivo && garcomSessao"
                class="pdv-botao pdv-botao--neutro"
                title="Trava a tela para o próximo garçom passar o cartão"
                @click="travar"
              >
                <Lock :size="16" />
                <span class="max-w-[10rem] truncate">{{ garcomSessao.nome }}</span>
              </button>
              <div class="salao__alternar" role="group" aria-label="Visualização">
                <button :class="{ ativo: viewMode === 'grade' }" :aria-pressed="viewMode === 'grade'" title="Grade" @click="viewMode = 'grade'">
                  <LayoutGrid :size="18" />
                </button>
                <button :class="{ ativo: viewMode === 'lista' }" :aria-pressed="viewMode === 'lista'" title="Lista" @click="viewMode = 'lista'">
                  <List :size="18" />
                </button>
              </div>

              <button class="pdv-botao pdv-botao--acao" :class="{ salao__desativado: !caixaAberto }" @click="novaMesa">
                <Plus :size="18" />
                Iniciar mesa
              </button>
            </div>
          </header>

          <!-- FILTRO POR ESTADO (também é a legenda das cores) -->
          <nav v-if="!loading && mesasDoOperador.length" class="salao__filtros" aria-label="Filtrar por estado">
            <button :class="{ ativo: filtro === null }" @click="filtro = null">
              Todas <span class="pdv-valor">{{ mesasDoOperador.length }}</span>
            </button>
            <button
              v-for="k in ordemEstados"
              :key="k"
              :class="[`f--${k}`, { ativo: filtro === k, vazio: !contagem[k] }]"
              :disabled="!contagem[k]"
              @click="filtro = filtro === k ? null : k"
            >
              <i aria-hidden="true" />
              {{ ROTULO_ESTADO[k] }}
              <span class="pdv-valor">{{ contagem[k] }}</span>
            </button>
          </nav>

          <!-- SKELETON -->
          <template v-if="loading">
            <div v-if="viewMode === 'grade'" class="salao__grade">
              <div v-for="n in 10" :key="n" class="salao__esqueleto h-[148px]" />
            </div>
            <div v-else class="space-y-2">
              <div v-for="n in 6" :key="n" class="salao__esqueleto h-14" />
            </div>
          </template>

          <!-- VAZIO -->
          <div v-else-if="mesasDoOperador.length === 0" class="salao__vazio">
            <span class="salao__vazio-icone"><LayoutGrid :size="28" /></span>
            <h3>Nenhuma mesa aberta</h3>
            <p v-if="caixaAberto">Quando um cliente sentar, inicie a mesa para começar a lançar os pedidos.</p>
            <p v-else>O caixa está fechado. Peça ao responsável para abrir o caixa antes de iniciar mesas.</p>
            <button
              class="pdv-botao pdv-botao--acao pdv-botao--confirmar"
              :class="{ salao__desativado: !caixaAberto }"
              :aria-disabled="!caixaAberto"
              @click="novaMesa"
            >
              <Plus :size="20" /> Iniciar mesa
            </button>
          </div>

          <!-- GRADE -->
          <div v-else-if="viewMode === 'grade'" class="salao__grade">
            <ComandaCard
              v-for="mesa in mesasVisiveis"
              :key="mesa.id"
              :comanda="mesa"
              :selecionada="mesaSelecionada?.id === mesa.id"
              pode-vender
              @abrir="abrirMesa(mesa)"
              @vender="venderMesa(mesa)"
            />
          </div>

          <!-- LISTA -->
          <div v-else class="pdv-cartao salao__lista" role="table">
            <div class="salao__linha salao__linha--cabeca" role="row">
              <span role="columnheader">Mesa</span>
              <span role="columnheader">Estado</span>
              <span role="columnheader" class="hidden md:block">Garçom</span>
              <span role="columnheader" class="hidden sm:block text-right">Aberta há</span>
              <span role="columnheader" class="text-right">Total</span>
              <span role="columnheader" class="sr-only">Ação</span>
            </div>
            <button
              v-for="mesa in mesasVisiveis"
              :key="mesa.id"
              role="row"
              class="salao__linha"
              :class="{ sel: mesaSelecionada?.id === mesa.id }"
              @click="abrirMesa(mesa)"
            >
              <span class="flex items-center gap-3 min-w-0" role="cell">
                <span class="pdv-faixa self-stretch" :class="`pdv-faixa--${chaveEstado(mesa)}`" aria-hidden="true" />
                <span class="min-w-0">
                  <span class="block font-semibold truncate text-[var(--txt)]">{{ mesa.nome }}</span>
                  <span v-if="mesa.cliente" class="block truncate text-[var(--txt-2)] text-[13px]">{{ mesa.cliente }}</span>
                </span>
              </span>
              <span role="cell"><span class="salao__selo" :class="`s--${chaveEstado(mesa)}`">{{ ROTULO_ESTADO[chaveEstado(mesa)] }}</span></span>
              <span role="cell" class="hidden md:block truncate text-[var(--txt-2)]">{{ mesa.garcom?.nome ?? '—' }}</span>
              <span role="cell" class="hidden sm:block text-right pdv-valor text-[var(--txt-3)]">{{ mesa.aberta_em ? duracao(minutosDesde(mesa.aberta_em)) : '—' }}</span>
              <span role="cell" class="text-right pdv-valor font-semibold" :class="mesa.qtd_itens ? 'text-[var(--txt)]' : 'text-[var(--txt-3)]'">{{ moeda.format(mesa.total) }}</span>
              <span role="cell" class="flex justify-end">
                <span
                  role="button"
                  tabindex="0"
                  class="salao__vender"
                  :class="{ off: mesa.status === 'fechando' }"
                  :title="mesa.status === 'fechando' ? 'Conta pedida — reabra a mesa para lançar' : 'Lançar produtos'"
                  @click.stop="mesa.status !== 'fechando' && venderMesa(mesa)"
                  @keydown.enter.stop.prevent="mesa.status !== 'fechando' && venderMesa(mesa)"
                >
                  <Plus :size="16" stroke-width="2.5" /><span class="hidden lg:inline">Lançar</span>
                </span>
              </span>
            </button>
          </div>

          <p v-if="!loading && mesasDoOperador.length && !mesasVisiveis.length" class="salao__nada">
            Nenhuma comanda neste estado.
          </p>
        </div>

        <!-- PAINEL DE PRODUTOS -->
        <PainelProdutos
          v-else
          ref="painelRef"
          :mesa="mesaSelecionada"
          @voltar="modoProdutos = false"
          @produto-adicionado="produtoSelecionado"
        />

      </main>
    </div>

    <!-- SIDEBAR -->
    <SidebarMesa
      ref="sidebarRef"
      v-model="sidebarMesa"
      :mesa="mesaSelecionada"
      @abrir-produtos="abrirProdutos"
      @estoque-atualizado="painelRef?.recarregar()"
      @mesa-fechada="onMesaFechada"
      @garcom-mismatch="onGarcomMismatch"
    />

    <!-- MODAL ABRIR MESA -->
    <ModalAbrirMesa
      v-model="modalAbrirMesa"
      @mesa-aberta="() => carregarMesas()"
    />

    <!-- Trava do terminal: sem cartão não há mesas na tela -->
    <ModalRfidAuth
      v-model="rfidModal"
      :mensagem="rfidMensagem"
      :erro="erroModal"
      :carregando-rfid="carregandoRfid"
      obrigatorio
      rotulo-sair="Sair das Mesas"
      @auth-success="onRfidSuccess"
      @sair="router.replace('/')"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Plus, LayoutGrid, List, Lock } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import ComandaCard from '~/components/salao/ComandaCard.vue'
import { chaveEstado, minutosDesde, duracao, ROTULO_ESTADO, type ChaveEstado, type ComandaResumo } from '~/composables/useEstadoComanda'

import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import SidebarMesa from '~/components/sidebar/SidebarMesa.vue'
import ModalAbrirMesa from '~/components/modals/ModalAbrirMesa.vue'
import PainelProdutos from '~/components/produtos/PainelProdutos.vue'

import { useApi } from '~/services/api'
import { useCaixaStore } from '~/stores/caixa'
import { useToastStore } from '~/stores/toast'
import { useRfidIdentify, podeMexerNaMesa, type UsuarioRfid } from '~/composables/useRfidIdentify'
import ModalRfidAuth from '~/components/modals/ModalRfidAuth.vue'

definePageMeta({ layout: false })

/**
 * O resumo do salão (GET /mesas) + os campos que SidebarMesa e
 * PainelProdutos ainda leem no formato antigo (nome_mesa, garcom_id).
 */
type Mesa = ComandaResumo & { nome_mesa: string; garcom_id: string | null }

const api         = useApi()
const caixaStore  = useCaixaStore()
const toastStore  = useToastStore()
const router      = useRouter()
const { rfidAtivo, modalAberto: rfidModal, mensagemModal: rfidMensagem, erroModal, carregandoRfid, identificarViaRfid, onRfidSuccess } = useRfidIdentify()
const caixaAberto = computed(() => caixaStore.aberto)
const sidebarRef  = ref()
const painelRef   = ref()

/**
 * Com RFID ligado, a tela fica travada até alguém passar o cartão. O garçom
 * vê só as mesas abertas por ele; administrador e caixa veem todas. Cada ação
 * dentro da mesa pede o cartão de novo, e ao terminar a tela trava outra vez.
 */
const garcomSessao = ref<UsuarioRfid | null>(null)

const loading         = ref(true)
const mesas           = ref<Mesa[]>([])
const modalAbrirMesa  = ref(false)
const sidebarMesa     = ref(false)
const modoProdutos    = ref(false)
const mesaSelecionada = ref<Mesa>()

const savedView = typeof localStorage !== 'undefined' ? localStorage.getItem('mesas-view') : null
const viewMode  = ref<'grade' | 'lista'>((savedView === 'lista' ? 'lista' : 'grade'))

watch(viewMode, v => { if (typeof localStorage !== 'undefined') localStorage.setItem('mesas-view', v) })

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const ordemEstados: ChaveEstado[] = ['pronto', 'enviar', 'cozinha', 'conta', 'atencao', 'parado']
const filtro = ref<ChaveEstado | null>(null)

const mesasDoOperador = computed(() => {
  if (!rfidAtivo.value) return mesas.value
  if (!garcomSessao.value) return []
  const quem = garcomSessao.value
  return mesas.value.filter(m => podeMexerNaMesa(quem, m.garcom_id))
})

const contagem = computed(() => {
  const c: Record<ChaveEstado, number> = { pronto: 0, enviar: 0, cozinha: 0, conta: 0, atencao: 0, parado: 0 }
  for (const m of mesasDoOperador.value) c[chaveEstado(m)]++
  return c
})
const mesasVisiveis = computed(() =>
  filtro.value ? mesasDoOperador.value.filter(m => chaveEstado(m) === filtro.value) : mesasDoOperador.value,
)
const totalSalao = computed(() => mesasDoOperador.value.reduce((s, m) => s + (m.restante ?? m.total ?? 0), 0))

// Se o estado filtrado esvaziar (ex.: prato entregue), volta para todas
watch(contagem, c => { if (filtro.value && !c[filtro.value]) filtro.value = null })

function novaMesa() {
  if (caixaAberto.value) modalAbrirMesa.value = true
  else toastStore.warning('Abra o caixa para iniciar atendimentos')
}

const abrirProdutos = () => { modoProdutos.value = true }

// Cartão de outro garçom numa ação da mesa: nada foi feito; a tela passa a
// mostrar as mesas de quem passou o cartão
let trocandoGarcom = false
async function onGarcomMismatch(usuario: UsuarioRfid) {
  trocandoGarcom = true
  sidebarMesa.value     = false
  modoProdutos.value    = false
  mesaSelecionada.value = undefined
  garcomSessao.value    = usuario
  toastStore.warning(`Esta mesa não é de ${usuario.nome}. Mostrando as mesas dele.`)
  await nextTick()
  trocandoGarcom = false
}

async function travar() {
  garcomSessao.value = null
  sidebarMesa.value  = false
  modoProdutos.value = false
  filtro.value       = null
  const quem = await identificarViaRfid('Passe o cartão para ver as suas mesas').catch(() => null)
  if (!quem) return
  garcomSessao.value = quem
  if (quem.cargo === 'garcom') {
    if (loading.value) await new Promise<void>(r => { const stop = watch(loading, v => { if (!v) { stop(); r() } }) })
    if (mesasDoOperador.value.length === 1) abrirMesa(mesasDoOperador.value[0])
  }
}

// Terminou na mesa (fechou o painel e o cardápio): trava para o próximo
watch([sidebarMesa, modoProdutos], ([painel, produtos]) => {
  if (!painel && !produtos && rfidAtivo.value && garcomSessao.value && !trocandoGarcom) travar()
})

const produtoSelecionado = async () => {
  if (sidebarMesa.value) sidebarRef.value?.recarregar()
  else sidebarMesa.value = true
}

const carregarMesas = async (mostrarLoading = false) => {
  try {
    if (mostrarLoading) loading.value = true
    const response = await api.mesas.listar<Mesa>()
    // 'fechando' = conta pedida: continua no salão, com a cor de conta
    mesas.value = (response as any[])
      .filter(m => m.status === 'aberta' || m.status === 'fechando')
      .map(m => ({ ...m, nome_mesa: m.nome, garcom_id: m.garcom?.id ?? null }))
  } catch (error) {
    console.error(error)
  } finally {
    if (mostrarLoading) loading.value = false
  }
}

/**
 * Atalho do card: seleciona a mesa e passa pela mesma identificação RFID do
 * botão "Produtos" do painel (dono da mesa, sessão do garçom) antes de abrir
 * o cardápio. Não é um bypass da checagem.
 */
async function venderMesa(mesa: Mesa) {
  if (!caixaAberto.value) return toastStore.warning('Abra o caixa para lançar produtos')
  mesaSelecionada.value = mesa
  await nextTick()
  sidebarRef.value?.lancarProdutos()
}

const abrirMesa = (mesa: Mesa) => {
  mesaSelecionada.value = mesa
  sidebarMesa.value     = true
}

const onMesaFechada = () => {
  sidebarMesa.value     = false
  mesaSelecionada.value = undefined
  modoProdutos.value    = false
  carregarMesas()
}

let pollingTimer: ReturnType<typeof setInterval> | null = null

function onVisibilityChange() {
  if (!document.hidden) carregarMesas()
}

onMounted(async () => {
  carregarMesas(true)
  travar()

  pollingTimer = setInterval(() => { if (!document.hidden) carregarMesas() }, 20000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.pagina-mesas {
  transition: padding-right 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: padding-right;
}
@media (min-width: 1024px) {
  .pagina-mesas.sidebar-open { padding-right: 420px; }
}

/* ── Salão sobre tokens: a cor do card é o estado; o laranja é só ação ── */
.salao { padding: var(--e-5) var(--e-4); }
@media (min-width: 640px)  { .salao { padding: var(--e-6) var(--e-5); } }
@media (min-width: 1024px) { .salao { padding: var(--e-6); } }

.salao__cabeca {
  display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between;
  gap: var(--e-4);
  margin-bottom: var(--e-5);
}
.salao__titulo { font-size: 1.75rem; font-weight: 700; letter-spacing: -0.02em; color: var(--txt); line-height: 1.1; }
.salao__resumo { margin-top: 6px; display: flex; flex-wrap: wrap; gap: 6px; font-size: var(--t-corpo); color: var(--txt-2); }
.salao__resumo strong { color: var(--txt); font-weight: 600; }
.salao__sep { color: var(--txt-3); }

.salao__alternar {
  display: flex; gap: 2px; padding: 3px;
  background: var(--sup-painel);
  border: 1px solid var(--linha);
  border-radius: var(--r-controle);
}
.salao__alternar button {
  width: 42px; height: 40px;
  display: grid; place-items: center;
  border-radius: 7px;
  color: var(--txt-3);
}
.salao__alternar button:hover { color: var(--txt); }
.salao__alternar button.ativo { background: var(--sup-elevado); color: var(--txt); box-shadow: var(--sombra-cartao); }

.salao__desativado { opacity: .45; cursor: not-allowed; }

/* Filtros = legenda: cada chip carrega a cor do estado que filtra */
.salao__filtros {
  display: flex; gap: var(--e-2);
  margin-bottom: var(--e-5);
  overflow-x: auto;
  scrollbar-width: none;
}
.salao__filtros::-webkit-scrollbar { display: none; }
.salao__filtros button {
  flex-shrink: 0;
  display: inline-flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--linha);
  background: var(--sup-painel);
  color: var(--txt-2);
  font-size: var(--t-micro); font-weight: 500;
  transition: background-color var(--tempo-toque) var(--curva), border-color var(--tempo-toque) var(--curva);
}
.salao__filtros button:hover:not(:disabled) { border-color: var(--linha-forte); color: var(--txt); }
.salao__filtros button.ativo { background: var(--sup-elevado); border-color: var(--linha-forte); color: var(--txt); }
.salao__filtros button.vazio { opacity: .5; cursor: default; }
.salao__filtros .pdv-valor { color: var(--txt-3); }
.salao__filtros button.ativo .pdv-valor { color: var(--txt); }
.salao__filtros i { width: 8px; height: 8px; border-radius: 50%; background: var(--st-parado); }
.f--pronto  i { background: var(--st-pronto); }
.f--cozinha i { background: var(--st-cozinha); }
.f--conta   i { background: var(--st-conta); }
.f--atencao i { background: var(--st-atencao); }

.salao__grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--e-3);
}
@media (max-width: 480px) { .salao__grade { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.salao__esqueleto {
  border-radius: var(--r-cartao);
  background: var(--sup-cartao);
  border: 1px solid var(--linha);
  animation: pulsar 1.4s ease-in-out infinite;
}
@keyframes pulsar { 50% { opacity: .55; } }

.salao__vazio {
  min-height: 55vh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--e-3);
  text-align: center;
}
.salao__vazio-icone {
  width: 64px; height: 64px;
  display: grid; place-items: center;
  border-radius: var(--r-cartao);
  background: var(--sup-cartao);
  border: 1px solid var(--linha);
  color: var(--txt-2);
}
.salao__vazio h3 { font-size: var(--t-titulo); font-weight: 700; color: var(--txt); }
.salao__vazio p  { max-width: 34ch; color: var(--txt-2); font-size: var(--t-corpo); margin-bottom: var(--e-2); }

/* Lista */
.salao__lista { overflow: hidden; }
.salao__linha {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1.4fr) auto auto;
  gap: var(--e-4);
  align-items: center;
  min-height: 60px;
  padding: var(--e-2) var(--e-4);
  text-align: left;
  font-size: var(--t-corpo);
  border-top: 1px solid var(--linha);
}
@media (min-width: 640px) { .salao__linha { grid-template-columns: minmax(0, 2fr) minmax(0, 1.4fr) 90px 120px auto; } }
@media (min-width: 768px) { .salao__linha { grid-template-columns: minmax(0, 2fr) minmax(0, 1.4fr) minmax(0, 1.2fr) 90px 120px auto; } }
.salao__linha--cabeca {
  min-height: 44px;
  border-top: none;
  background: var(--sup-painel);
  font-size: var(--t-micro); font-weight: 500;
  color: var(--txt-3);
}
button.salao__linha:hover { background: var(--sup-elevado); }
button.salao__linha.sel   { background: var(--sup-elevado); }
button.salao__linha:focus-visible { outline: 2px solid var(--acao); outline-offset: -2px; }

.salao__selo {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: var(--t-micro); font-weight: 500;
  background: var(--sup-elevado); color: var(--txt-2);
  white-space: nowrap;
}
.s--pronto  { background: var(--st-pronto-bg);  color: var(--st-pronto); }
.s--cozinha { background: var(--st-cozinha-bg); color: var(--st-cozinha); }
.s--conta   { background: var(--st-conta-bg);   color: var(--st-conta); }
.s--atencao, .s--enviar { background: var(--st-atencao-bg); color: var(--st-atencao); }

.salao__vender {
  display: inline-flex; align-items: center; gap: 6px;
  height: 40px; min-width: 40px; padding: 0 12px;
  justify-content: center;
  border-radius: var(--r-controle);
  background: var(--acao); color: var(--acao-txt);
  font-size: var(--t-micro); font-weight: 600;
  cursor: pointer;
}
.salao__vender:hover { background: var(--acao-hover); }
.salao__vender.off { background: var(--sup-elevado); color: var(--txt-3); cursor: not-allowed; }

.salao__nada { padding: var(--e-6) 0; text-align: center; color: var(--txt-2); }
</style>
