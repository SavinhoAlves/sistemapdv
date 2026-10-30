<template>
  <div class="msa">

    <!-- ══════════════ SALÃO ══════════════ -->
    <template v-if="!mesaSelecionada">
      <div class="msa-cab">
        <h1 class="eq-titulo msa-h1">Salão</h1>
        <button v-if="authStore.temPermissao('abrirMesa')" class="msa-nova" @click="modalNovaMesa = true">
          <Plus :size="18" :stroke-width="2.6" /> Nova mesa
        </button>
      </div>

      <div v-if="mesasAbertas.length" class="eq-pilulas msa-filtros" role="group" aria-label="Filtrar mesas">
        <button v-for="f in filtros" :key="f.id" class="eq-pilula" :aria-pressed="filtro === f.id" @click="filtro = f.id">
          {{ f.label }}<span class="eq-pilula-num">{{ f.n }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="msa-centro">
        <Loader2 :size="26" class="animate-spin" style="color:var(--eq-marca)" />
      </div>

      <!-- Vazio -->
      <div v-else-if="!mesasAbertas.length" class="msa-vazio">
        <span class="msa-vazio-ic"><LayoutGrid :size="30" /></span>
        <h3 class="eq-titulo">Nenhuma mesa aberta.</h3>
        <p>{{ authStore.temPermissao('abrirMesa') ? 'Toque em "Nova mesa" para começar um atendimento.' : 'Quando o caixa abrir uma mesa, ela aparece aqui.' }}</p>
      </div>

      <template v-else>
        <p v-if="!mesasFiltradas.length" class="msa-nada">Nenhuma mesa neste filtro.</p>
        <div class="msa-grade">
          <button
            v-for="mesa in mesasFiltradas"
            :key="mesa.id"
            class="msa-mesa"
            :class="mesa.status === 'fechando' ? 'conta' : 'aberta'"
            :aria-label="`${mesa.nome_mesa}, ${mesa.status === 'fechando' ? 'pediu a conta' : 'aberta'}, R$ ${fmt(mesa.total)}`"
            @click="selecionarMesa(mesa)"
          >
            <i class="cad t" /><i class="cad b" /><i class="cad l" /><i class="cad r" />
            <span class="msa-mesa-corpo">
              <span class="msa-mesa-topo">
                <span class="msa-mesa-num" :class="{ longo: rotuloMesa(mesa).length > 3 }">{{ rotuloMesa(mesa) }}</span>
                <span v-if="rotuloMesa(mesa).length <= 3" class="msa-mesa-tempo eq-mono">{{ tempoCurto(mesa.data_abertura) }}</span>
              </span>
              <!-- Nome por extenso ocupa o topo: o tempo desce para junto do valor -->
              <span class="msa-mesa-valor eq-mono">
                <span class="truncate">{{ fmt(mesa.total) }}</span>
                <span v-if="rotuloMesa(mesa).length > 3" class="msa-mesa-tempo">{{ tempoCurto(mesa.data_abertura) }}</span>
              </span>
            </span>
          </button>
        </div>
        <div class="msa-legenda">
          <span><i class="aberta" />Aberta</span>
          <span><i class="conta" />Pediu a conta</span>
        </div>
      </template>
    </template>

    <!-- ══════════════ MESA: CARDÁPIO ══════════════ -->
    <template v-else>
      <div class="msa-mesa-cab">
        <button class="eq-icone msa-voltar" aria-label="Voltar ao salão" @click="voltarParaMesas"><ChevronLeft :size="22" /></button>
        <div class="flex-1" />
        <div class="text-right">
          <p class="eq-rotulo" style="font-size:11px;letter-spacing:.08em">Consumo</p>
          <p class="eq-mono msa-consumo">R$ {{ fmt(totalMesa) }}</p>
        </div>
      </div>

      <div class="msa-titulo">
        <template v-if="numeroGrande(mesaSelecionada)">
          <span class="eq-titulo msa-numerao">{{ numeroGrande(mesaSelecionada) }}</span>
          <div class="msa-titulo-txt">
            <p class="eq-titulo">Mesa</p>
            <p class="eq-mudo">{{ kickerMesa }}</p>
          </div>
        </template>
        <div v-else class="msa-titulo-txt">
          <p class="eq-titulo msa-nome-longo">{{ mesaSelecionada.nome_mesa }}</p>
          <p class="eq-mudo">{{ kickerMesa }}</p>
        </div>
      </div>

      <div class="msa-filtro-prod">
        <label class="eq-busca">
          <Search :size="18" />
          <input v-model="buscaProduto" type="search" placeholder="Buscar produto…" aria-label="Buscar produto">
        </label>
        <div class="eq-pilulas" style="margin-top:12px" role="group" aria-label="Categorias">
          <button v-for="cat in ['Todos', ...categorias]" :key="cat" class="eq-pilula" :aria-pressed="categoriaAtiva === cat" @click="categoriaAtiva = cat">{{ cat }}</button>
        </div>
      </div>

      <p v-if="!produtosFiltrados.length" class="msa-nada">Nenhum produto encontrado.</p>
      <div v-else class="msa-produtos">
        <div
          v-for="p in produtosFiltrados"
          :key="p.id"
          class="msa-prod"
          :class="{ tem: qtdNaMesa(p.id) }"
          @click="adicionarItemMesa(p)"
        >
          <span class="msa-prod-ic"><UtensilsCrossed :size="20" /></span>
          <div class="flex-1">
            <p class="msa-prod-nome">{{ p.nome }}</p>
            <p v-if="p.categoria" class="msa-prod-cat">{{ p.categoria }}</p>
          </div>
          <div v-if="!qtdNaMesa(p.id)" class="msa-prod-pe">
            <span class="eq-mono msa-prod-preco">R$ {{ fmt(p.preco) }}</span>
            <button class="msa-mais" :aria-label="`Adicionar ${p.nome}`" :disabled="adicionando === p.id" @click.stop="adicionarItemMesa(p)">
              <Loader2 v-if="adicionando === p.id" :size="18" class="animate-spin" /><Plus v-else :size="20" :stroke-width="2.6" />
            </button>
          </div>
          <template v-else>
            <span class="eq-mono msa-prod-preco">R$ {{ fmt(p.preco) }}</span>
            <div class="msa-passo" @click.stop>
              <button :aria-label="`Tirar um ${p.nome}`" :disabled="!!ajustando" @click="tirarUm(p)"><Minus :size="18" /></button>
              <span class="eq-mono" aria-live="polite">{{ qtdNaMesa(p.id) }}</span>
              <button class="mais" :aria-label="`Adicionar ${p.nome}`" :disabled="adicionando === p.id" @click="adicionarItemMesa(p)">
                <Loader2 v-if="adicionando === p.id" :size="16" class="animate-spin" /><Plus v-else :size="18" :stroke-width="2.6" />
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Barra "Ver pedido" -->
      <Transition name="msa-barra">
        <button v-if="itensMesa.length" class="eq-btn eq-btn-primario msa-ver" @click="carrinhoAberto = true">
          <span :key="quantidadeItensMesa" class="msa-ver-qtd eq-mono">{{ quantidadeItensMesa }}</span>
          <span class="flex-1">{{ paraEnviar ? `Ver pedido · ${paraEnviar} a enviar` : 'Ver pedido' }}</span>
          <span class="eq-mono msa-ver-total">R$ {{ fmt(totalMesa) }}</span>
        </button>
      </Transition>
    </template>

    <!-- ══════════════ FOLHA: PEDIDO DA MESA ══════════════ -->
    <Teleport to="body">
      <Transition name="eq-folha">
        <div v-if="carrinhoAberto" class="eq eq-folha-fundo" @click.self="carrinhoAberto = false">
          <div class="eq-folha" role="dialog" aria-modal="true" aria-labelledby="msa-ped-t">
            <div class="eq-folha-alca" />
            <div class="msa-folha-cab">
              <div>
                <p class="eq-rotulo eq-rotulo-marca">Pedido da mesa</p>
                <h3 id="msa-ped-t" class="eq-titulo msa-folha-h3">{{ mesaSelecionada?.nome_mesa }}</h3>
              </div>
              <button class="eq-icone eq-icone-plano" aria-label="Fechar" @click="carrinhoAberto = false"><X :size="20" /></button>
            </div>

            <div class="msa-folha-itens">
              <div v-if="loadingItens" class="msa-centro"><Loader2 :size="22" class="animate-spin" style="color:var(--eq-marca)" /></div>
              <p v-else-if="!itensMesa.length" class="msa-nada">Nenhum item ainda.</p>
              <div v-for="item in itensMesa" v-else :key="item.id" class="msa-linha">
                <span class="eq-mono msa-linha-qtd">{{ item.quantidade }}×</span>
                <div class="flex-1 min-w-0">
                  <p class="msa-linha-nome">{{ item.produto_nome || item.nome }}</p>
                  <p v-if="item.status === 'rascunho'" class="msa-linha-rasc">Não enviado à cozinha</p>
                </div>
                <span class="eq-mono msa-linha-sub">{{ fmt((item.preco_unitario || 0) * item.quantidade) }}</span>
                <button class="eq-icone eq-icone-plano msa-linha-btn" :aria-label="`Tirar um ${item.produto_nome || item.nome}`" :disabled="ajustando === item.id" @click="decrementarItem(item)">
                  <Loader2 v-if="ajustando === item.id" :size="16" class="animate-spin" /><Minus v-else :size="18" />
                </button>
                <button class="eq-icone eq-icone-plano msa-linha-btn" :aria-label="`Mais um ${item.produto_nome || item.nome}`" :disabled="ajustando === item.id" @click="incrementarItem(item)"><Plus :size="18" /></button>
              </div>
            </div>

            <div class="msa-folha-total">
              <span>Total da mesa</span>
              <span class="eq-titulo">R$ {{ fmt(totalMesa) }}</span>
            </div>

            <div class="msa-folha-acoes">
              <!-- Modo "pelo botão": manda à cozinha os itens que estão esperando -->
              <button v-if="paraEnviar > 0" class="eq-btn eq-btn-primario" :disabled="enviando" @click="enviarPedido">
                <span class="flex-1">{{ enviando ? 'Enviando…' : `Enviar para a cozinha (${paraEnviar} ${paraEnviar === 1 ? 'item' : 'itens'})` }}</span>
                <span class="eq-btn-seta"><ChefHat :size="20" /></span>
              </button>
              <div class="msa-folha-dupla">
                <button class="eq-btn eq-btn-secundario" :disabled="!itensMesa.length" @click="imprimirComanda"><Printer :size="18" /> Imprimir</button>
                <button class="eq-btn eq-btn-secundario" @click="carrinhoAberto = false"><Plus :size="18" /> Adicionar itens</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════════ FOLHA: NOVA MESA ══════════════ -->
    <Teleport to="body">
      <Transition name="eq-folha">
        <div v-if="modalNovaMesa" class="eq eq-folha-fundo" @click.self="modalNovaMesa = false; novaMesaNome = ''">
          <form class="eq-folha msa-nova-folha" role="dialog" aria-modal="true" aria-labelledby="msa-nova-t" @submit.prevent="abrirMesa">
            <div class="eq-folha-alca" />
            <div class="msa-folha-cab">
              <div>
                <p class="eq-rotulo eq-rotulo-marca">Novo atendimento</p>
                <h3 id="msa-nova-t" class="eq-titulo msa-folha-h3">Abrir mesa</h3>
              </div>
              <button type="button" class="eq-icone eq-icone-plano" aria-label="Fechar" @click="modalNovaMesa = false; novaMesaNome = ''"><X :size="20" /></button>
            </div>
            <div style="padding:4px 20px 0">
              <label class="eq-campo">
                <span>Nome da mesa (opcional)</span>
                <input v-model="novaMesaNome" type="text" placeholder="Mesa 5, Varanda…" style="font-family:var(--eq-texto);font-weight:600;font-size:18px" enterkeyhint="go">
              </label>
              <p class="eq-apagado" style="margin:8px 4px 0;font-size:13px">Sem nome, ela recebe o próximo número.</p>
            </div>
            <div class="msa-folha-acoes">
              <button type="submit" class="eq-btn eq-btn-primario" :disabled="abrindoMesa">
                <span class="flex-1">{{ abrindoMesa ? 'Abrindo…' : 'Abrir mesa' }}</span>
                <span class="eq-btn-seta"><ArrowRight :size="20" /></span>
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { minutosDesde } from '~/lib/relogio'
import { reais, numeroBR } from '~/lib/moeda'
import { itensDaComanda } from '~/lib/comanda'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  Plus, Minus, X, Loader2, LayoutGrid, UtensilsCrossed,
  Search, ChevronLeft, Printer, ChefHat, ArrowRight,
} from 'lucide-vue-next'
import { useTopoMobile } from '~/composables/useTopoMobile'
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
const adicionando    = ref<string | null>(null)
const ajustando      = ref<string | null>(null)

// ── Nova mesa ─────────────────────────────────────────────
const modalNovaMesa = ref(false)
const novaMesaNome  = ref('')
const abrindoMesa   = ref(false)

let intervalo: ReturnType<typeof setInterval> | null = null

// ── Helpers ───────────────────────────────────────────────
function fmt(v: number) {
  return numeroBR(v)
}

function formatarTempo(data: string) {
  if (!data) return ''
  const diff = minutosDesde(data)
  if (diff < 60) return `${diff}min`
  const h = Math.floor(diff / 60), m = diff % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

/** Minutos abertos, curto como no brief: 48′, 1h20 */
function tempoCurto(data: string) {
  if (!data) return ''
  const diff = minutosDesde(data)
  if (diff < 60) return `${diff}′`
  const h = Math.floor(diff / 60), m = diff % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

/** Número da mesa em destaque ("Mesa 5" → 05); nome próprio (Varanda) fica por extenso */
function numeroGrande(mesa: any): string {
  const m = /^mesa\s*(\d{1,3})$/i.exec((mesa?.nome_mesa || '').trim())
  if (m) return m[1].padStart(2, '0')
  return mesa?.nome_mesa ? '' : String(mesa?.numero ?? '').padStart(2, '0')
}
const rotuloMesa = (mesa: any) => numeroGrande(mesa) || mesa.nome_mesa

const kickerMesa = computed(() => {
  const m = mesaSelecionada.value
  if (!m) return ''
  const partes = [m.status === 'fechando' ? 'Pediu a conta' : `Aberta há ${formatarTempo(m.data_abertura)}`]
  if (m.garcom?.nome && m.garcom_id !== authStore.usuario?.id) partes.push(`de ${m.garcom.nome.split(' ')[0]}`)
  return partes.join(' · ')
})

// ── Filtro do salão ──────────────────────────────────────
const filtro = ref<'todas' | 'minhas' | 'conta'>('todas')
const filtros = computed(() => {
  const eu = authStore.usuario?.id
  return [
    { id: 'todas' as const, label: 'Todas', n: mesasAbertas.value.length },
    { id: 'minhas' as const, label: 'Minhas', n: mesasAbertas.value.filter(m => m.garcom_id === eu).length },
    { id: 'conta' as const, label: 'Pediu a conta', n: mesasAbertas.value.filter(m => m.status === 'fechando').length },
  ]
})
const mesasFiltradas = computed(() => {
  if (filtro.value === 'minhas') return mesasAbertas.value.filter(m => m.garcom_id === authStore.usuario?.id)
  if (filtro.value === 'conta') return mesasAbertas.value.filter(m => m.status === 'fechando')
  return mesasAbertas.value
})

// ── Topo do layout: dentro da mesa a tela tem o próprio (voltar + consumo) ──
const topo = useTopoMobile()
watch(mesaSelecionada, (m) => { topo.value = !m }, { immediate: true })

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

// ── Enviar pedido (modo "pelo botão") ──────────────────────
const paraEnviar = computed(() => itensMesa.value.filter((i: any) => i.status === 'rascunho').reduce((s: number, i: any) => s + i.quantidade, 0))
const enviando   = ref(false)
async function enviarPedido() {
  if (!mesaSelecionada.value || enviando.value) return
  enviando.value = true
  try {
    const r = await api.post<{ enviados: number }>(`/pedidos/mesa/${mesaSelecionada.value.id}/enviar`)
    toastStore.success(`${r.enviados} ${r.enviados === 1 ? 'item enviado' : 'itens enviados'} para a cozinha`)
    await carregarItensMesa(mesaSelecionada.value.id)
  } catch (e: any) {
    toastStore.error(e?.message || 'Não deu para enviar')
  } finally {
    enviando.value = false
  }
}

/** Quantas unidades do produto já estão na comanda da mesa */
function qtdNaMesa(produtoId: string) {
  return itensMesa.value.reduce((s, i) => s + (i.produto_id === produtoId ? i.quantidade : 0), 0)
}

/** "−" no cartão do produto: tira do lançamento mais recente desse produto */
function tirarUm(p: any) {
  const ultimo = [...itensMesa.value].reverse().find(i => i.produto_id === p.id)
  if (ultimo) decrementarItem(ultimo)
}

const quantidadeItensMesa = computed(() =>
  itensMesa.value.reduce((s, i) => s + i.quantidade, 0)
)

// ── Mesas ─────────────────────────────────────────────────
// Spinner só no 1º carregamento; o polling de 30 s troca a lista sem escondê-la
let mesasCarregadas = false
async function carregarMesas() {
  if (!mesasCarregadas) loading.value = true
  try {
    const rows = await api.get<any[]>('/mesas')
    // GET /mesas → { nome, garcom: { id, nome }, aberta_em, … }; a tela usa nome_mesa/garcom_id/data_abertura
    mesasAbertas.value = (rows || [])
      .filter((m: any) => m.status === 'aberta' || m.status === 'fechando')
      .map((m: any) => ({ ...m, nome_mesa: m.nome, garcom_id: m.garcom?.id ?? null, data_abertura: m.aberta_em, total: Number(m.total) || 0 }))
  } catch {}
  finally { loading.value = false; mesasCarregadas = true }
}

async function carregarProdutos() {
  try {
    const rows = await api.get<any[]>('/produtos')
    produtos.value = (rows || []).filter((p: any) => p.ativo)
  } catch {}
}

async function carregarItensMesa(mesaId: number) {
  // Recarregar depois de lançar um item não esconde a comanda (só a 1ª vez mostra o spinner)
  loadingItens.value = !itensMesa.value.length
  try {
    itensMesa.value = itensDaComanda(await api.get<any>(`/mesas/${mesaId}/produtos`))
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
  itensMesa.value       = [] // outra mesa: não mostrar os itens da anterior enquanto carrega
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
      mesaId:     mesaSelecionada.value.id,
      produtoId:  item.produto_id,
      quantidade: 1,
      garcomId:   authStore.usuario?.id
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
  } catch (err: any) {
    // Ex.: item já entregue (só o admin/caixa cancela, com motivo, no terminal)
    toastStore.error(err?.message || 'Erro ao remover')
  } finally {
    ajustando.value = null
  }
}

// ── Adicionar produto na mesa ──────────────────────────────
async function adicionarItemMesa(produto: any) {
  if (!mesaSelecionada.value) return

  // Qualquer garçom lança em qualquer mesa aberta: o item fica no nome de quem lançou
  const userId = authStore.usuario?.id

  adicionando.value = produto.id
  try {
    await api.post('/pedidos/adicionar', {
      mesaId:     mesaSelecionada.value.id,
      produtoId:  produto.id,
      quantidade: 1,
      ...(userId ? { garcomId: userId } : {})
    })
    toastStore.success(configStore.envio_cozinha_modo === 'botao' ? `${produto.nome} adicionado — toque em Enviar pedido` : `${produto.nome} adicionado!`)
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
    await api.post('/mesas/abrir', { nomeMesa: nome, ...(garcomId ? { garcomId } : {}) })
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
      <td style="text-align:right">${reais(Number((i.preco_unitario || 0) * i.quantidade))}</td>
    </tr>`
  ).join('')

  const total = totalMesa.value

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Comanda - ${mesa.nome_mesa || `Mesa ${mesa.numero}`}</title>
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
  <div class="sub">${mesa.nome_mesa || `Mesa ${mesa.numero}`} &nbsp;|&nbsp; ${data}</div>
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
      <td style="text-align:right">${reais(total)}</td>
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

  await Promise.all([carregarMesas(), carregarProdutos(), configStore.carregar()])

  const userId = authStore.usuario?.id
  if (userId && authStore.usuario?.cargo === 'garcom') {
    const mesasDoGarcom = mesasAbertas.value.filter(m => m.garcom_id === userId)
    if (mesasDoGarcom.length === 1) await selecionarMesa(mesasDoGarcom[0])
  }

  intervalo = setInterval(carregarMesas, 30000)
})

onUnmounted(() => { if (intervalo) clearInterval(intervalo); topo.value = true })
</script>

<style scoped>
.msa { display: flex; flex-direction: column; min-height: 100%; }
.msa-centro { display: flex; justify-content: center; padding: 48px 0; }
.msa-nada { margin: 0; padding: 20px 22px; font: 500 15px var(--eq-texto); color: var(--eq-mudo); }

/* Salão */
.msa-cab { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 22px 18px 0; }
.msa-h1 { margin: 0; font-size: 34px; }
.msa-nova { display: flex; align-items: center; gap: 6px; height: 42px; padding: 0 16px; border-radius: 14px; border: 0; cursor: pointer; background: var(--eq-marca); color: var(--eq-sobre-marca); font: 700 14px var(--eq-texto); box-shadow: 0 8px 22px rgba(255, 122, 0, .3); }
.msa-nova:active { transform: scale(.96); }
.msa-filtros { padding: 16px 18px 14px; }
.msa-grade { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; padding: 6px 18px 0; }
.msa-mesa { all: unset; box-sizing: border-box; position: relative; padding: 9px; cursor: pointer; transition: transform .1s; }
.msa-mesa:active { transform: scale(.96); }
.msa-mesa:focus-visible { outline: 2px solid var(--eq-marca-clara); outline-offset: 2px; border-radius: 20px; }
/* Cadeiras em volta da mesa */
.msa-mesa .cad { position: absolute; border-radius: 3px; background: rgba(247, 244, 239, .55); }
.msa-mesa.conta .cad { background: var(--eq-marca); }
.cad.t, .cad.b { left: 30%; right: 30%; height: 5px; }
.cad.t { top: 0; } .cad.b { bottom: 0; }
.cad.l, .cad.r { top: 30%; bottom: 30%; width: 5px; }
.cad.l { left: 0; } .cad.r { right: 0; }
.msa-mesa-corpo { display: flex; flex-direction: column; justify-content: space-between; height: 92px; border-radius: 20px; padding: 11px 12px; background: var(--eq-tinta); color: var(--eq-sobre-marca); }
.msa-mesa.conta .msa-mesa-corpo { background: var(--eq-marca); animation: eq-brilho 2.4s ease-in-out infinite; }
.msa-mesa-topo { display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; min-width: 0; }
.msa-mesa-num { font: 800 26px/1 var(--eq-titulo); letter-spacing: -.02em; min-width: 0; }
.msa-mesa-num.longo { font-size: 15px; line-height: 1.15; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-word; }
.msa-mesa-tempo { flex: none; font-size: 11px; font-weight: 700; opacity: .75; }
.msa-mesa-valor { display: flex; justify-content: space-between; gap: 4px; font-size: 12px; font-weight: 700; opacity: .9; white-space: nowrap; min-width: 0; }
.msa-legenda { display: flex; gap: 16px; padding: 18px 22px 0; font: 500 12px var(--eq-texto); color: var(--eq-mudo); }
.msa-legenda span { display: flex; align-items: center; gap: 6px; }
.msa-legenda i { width: 10px; height: 10px; border-radius: 3px; }
.msa-legenda i.aberta { background: var(--eq-tinta); }
.msa-legenda i.conta { background: var(--eq-marca); }
.msa-vazio { flex: 1; display: flex; flex-direction: column; align-items: flex-start; padding: 40px 22px; }
.msa-vazio-ic { width: 72px; height: 72px; border-radius: 24px; display: grid; place-items: center; background: var(--eq-cartao); border: 1px solid var(--eq-linha); color: var(--eq-mudo); }
.msa-vazio h3 { margin: 24px 0 8px; font-size: 24px; letter-spacing: -.02em; }
.msa-vazio p { margin: 0; max-width: 300px; font: 500 15px/1.5 var(--eq-texto); color: var(--eq-mudo); }

/* Mesa aberta */
.msa-mesa-cab { display: flex; align-items: center; gap: 12px; padding: calc(10px + env(safe-area-inset-top)) 18px 0; }
.msa-voltar { width: 48px; height: 48px; border-radius: 16px; }
.msa-consumo { margin: 0; font-size: 16px; font-weight: 700; }
.msa-titulo { display: flex; align-items: flex-end; gap: 12px; padding: 18px 18px 16px; min-width: 0; }
.msa-numerao { font-size: 88px; line-height: .8; letter-spacing: -.05em; color: var(--eq-marca); }
.msa-titulo-txt { padding-bottom: 4px; min-width: 0; }
.msa-titulo-txt p { margin: 0; }
.msa-titulo-txt .eq-titulo { font-size: 22px; }
.msa-titulo-txt .eq-mudo { margin-top: 4px; font: 500 13px var(--eq-texto); }
.msa-nome-longo { font-size: 34px !important; color: var(--eq-marca); overflow-wrap: anywhere; }
.msa-filtro-prod { padding: 0 18px; }
.msa-produtos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px 18px 96px; }
.msa-prod { position: relative; display: flex; flex-direction: column; gap: 10px; min-height: 168px; padding: 14px; border-radius: 22px; background: var(--eq-cartao); border: 1.5px solid var(--eq-linha); cursor: pointer; transition: border-color .15s; }
.msa-prod.tem { border-color: var(--eq-marca); }
.msa-prod-ic { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--eq-marca-fundo); color: var(--eq-marca-clara); }
.msa-prod-nome { margin: 0; font: 700 15px/1.25 var(--eq-texto); overflow-wrap: anywhere; }
.msa-prod-cat { margin: 2px 0 0; font: 500 12px var(--eq-texto); color: var(--eq-apagado); }
.msa-prod-pe { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.msa-prod-preco { font-size: 14px; font-weight: 700; color: var(--eq-marca-clara); }
.msa-mais { flex: none; width: 44px; height: 44px; border-radius: 14px; border: 0; display: grid; place-items: center; cursor: pointer; background: var(--eq-marca); color: var(--eq-sobre-marca); }
.msa-mais:active { transform: scale(.9); }
.msa-passo { display: flex; align-items: center; justify-content: space-between; padding: 3px; border-radius: 14px; background: var(--eq-fundo); cursor: default; }
.msa-passo button { width: 44px; height: 40px; border-radius: 11px; border: 0; display: grid; place-items: center; cursor: pointer; background: transparent; color: var(--eq-tinta); }
.msa-passo button.mais { background: var(--eq-marca); color: var(--eq-sobre-marca); }
.msa-passo button:disabled { opacity: .45; }
.msa-passo span { font-size: 17px; font-weight: 700; }
.msa-ver { position: fixed; left: 16px; right: 16px; bottom: calc(96px + env(safe-area-inset-bottom)); z-index: 25; padding: 0 10px 0 12px; gap: 12px; max-width: 528px; margin: 0 auto; box-shadow: 0 16px 40px rgba(255, 122, 0, .35); }
.msa-ver-qtd { min-width: 44px; height: 44px; padding: 0 8px; border-radius: 15px; display: grid; place-items: center; background: var(--eq-sobre-marca); color: var(--eq-marca); font-size: 16px; font-weight: 700; animation: eq-pop .28s cubic-bezier(.34, 1.56, .64, 1); }
.msa-ver-total { font-size: 15px; padding: 0 10px; }
@keyframes eq-pop { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
.msa-barra-enter-active { transition: transform .25s ease-out, opacity .2s; }
.msa-barra-leave-active { transition: transform .18s ease-in, opacity .18s; }
.msa-barra-enter-from, .msa-barra-leave-to { transform: translateY(16px); opacity: 0; }

/* Folhas */
.msa-folha-cab { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px 12px; }
.msa-folha-cab p { margin: 0; }
.msa-folha-h3 { margin: 2px 0 0; font-size: 26px; line-height: 1.1; }
.msa-folha-itens { overflow: auto; padding: 0 20px; }
.msa-linha { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px dashed rgba(255, 255, 255, .1); }
.msa-linha-qtd { min-width: 30px; font-size: 15px; font-weight: 700; color: var(--eq-marca-clara); }
.msa-linha-nome { margin: 0; font: 600 15px var(--eq-texto); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.msa-linha-rasc { margin: 2px 0 0; font: 700 11px var(--eq-texto); letter-spacing: .06em; text-transform: uppercase; color: var(--eq-alerta); }
.msa-linha-sub { font-size: 14px; font-weight: 700; }
.msa-linha-btn { width: 44px; height: 44px; border-radius: 14px; }
.msa-linha-btn:disabled { opacity: .45; }
.msa-folha-total { display: flex; align-items: baseline; justify-content: space-between; padding: 18px 20px 14px; }
.msa-folha-total > span:first-child { font: 600 14px var(--eq-texto); color: var(--eq-mudo); }
.msa-folha-total .eq-titulo { font-size: 30px; letter-spacing: -.02em; }
.msa-folha-acoes { display: flex; flex-direction: column; gap: 10px; padding: 0 16px 22px; }
.msa-folha-dupla { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.msa-folha-dupla .eq-btn { gap: 8px; padding: 0 16px; }
.msa-nova-folha .msa-folha-acoes { padding-top: 20px; }
</style>
