<template>
  <div class="vda">

    <!-- LOADING -->
    <div v-if="iniciando" class="vda-centro">
      <Loader2 :size="26" class="animate-spin" style="color:var(--eq-marca)" />
    </div>

    <!-- CAIXA FECHADO -->
    <div v-else-if="!caixaStore.aberto" class="vda-vazio">
      <span class="vda-vazio-ic"><LockKeyhole :size="30" /></span>
      <h3 class="eq-titulo">Caixa fechado.</h3>
      <p>O administrador precisa abrir o caixa para começar as vendas.</p>
    </div>

    <template v-else>
      <div class="vda-cab">
        <div class="min-w-0">
          <h1 class="eq-titulo vda-h1">Venda direta</h1>
          <p class="vda-sub" :class="{ tem: carrinho.length }">
            <template v-if="carrinho.length">{{ totalItens }} {{ totalItens === 1 ? 'item' : 'itens' }} · <span class="eq-mono">R$ {{ fmt(total) }}</span></template>
            <template v-else>Toque nos produtos para montar a venda.</template>
          </p>
        </div>
        <button v-if="carrinho.length" class="vda-limpar" @click="limparCarrinho"><Trash2 :size="15" /> Limpar</button>
      </div>

      <div class="vda-filtro">
        <label class="eq-busca">
          <Search :size="18" />
          <input v-model="busca" type="search" placeholder="Buscar produto…" aria-label="Buscar produto">
        </label>
        <div class="eq-pilulas" style="margin-top:12px" role="group" aria-label="Categorias">
          <button v-for="cat in ['Todos', ...categorias]" :key="cat" class="eq-pilula" :aria-pressed="categoriaAtiva === cat" @click="categoriaAtiva = cat">{{ cat }}</button>
        </div>
      </div>

      <p v-if="!produtosFiltrados.length" class="vda-nada">Nenhum produto encontrado.</p>
      <div v-else class="vda-produtos">
        <div
          v-for="p in produtosFiltrados"
          :key="p.id"
          class="vda-prod"
          :class="{ tem: qtdNoCarrinho(p.id), esgotado: esgotado(p) }"
          :aria-disabled="esgotado(p) || undefined"
          @click="adicionarAoCarrinho(p)"
        >
          <span class="vda-prod-ic"><UtensilsCrossed :size="20" /></span>
          <div class="flex-1">
            <p class="vda-prod-nome">{{ p.nome }}</p>
            <p v-if="esgotado(p)" class="vda-prod-esg">Esgotado</p>
            <p v-else-if="p.categoria" class="vda-prod-cat">{{ p.categoria }}</p>
          </div>
          <div v-if="!qtdNoCarrinho(p.id)" class="vda-prod-pe">
            <span class="eq-mono vda-prod-preco">R$ {{ fmt(p.preco) }}</span>
            <button v-if="!esgotado(p)" class="vda-mais" :aria-label="`Adicionar ${p.nome}`" @click.stop="adicionarAoCarrinho(p)"><Plus :size="20" :stroke-width="2.6" /></button>
          </div>
          <template v-else>
            <span class="eq-mono vda-prod-preco">R$ {{ fmt(p.preco) }}</span>
            <div class="vda-passo" @click.stop>
              <button :aria-label="`Tirar um ${p.nome}`" @click="decrementar(indiceNoCarrinho(p.id))"><Minus :size="18" /></button>
              <span class="eq-mono" aria-live="polite">{{ qtdNoCarrinho(p.id) }}</span>
              <button class="mais" :aria-label="`Adicionar ${p.nome}`" @click="adicionarAoCarrinho(p)"><Plus :size="18" :stroke-width="2.6" /></button>
            </div>
          </template>
        </div>
      </div>

      <!-- Barra "Ver venda" -->
      <Transition name="vda-barra">
        <button v-if="carrinho.length" class="eq-btn eq-btn-primario vda-ver" @click="carrinhoAberto = true">
          <span :key="totalItens" class="vda-ver-qtd eq-mono">{{ totalItens }}</span>
          <span class="flex-1">Fechar venda</span>
          <span class="eq-mono vda-ver-total">R$ {{ fmt(total) }}</span>
        </button>
      </Transition>
    </template>

    <!-- FOLHA: CARRINHO E PAGAMENTO -->
    <Teleport to="body">
      <Transition name="eq-folha">
        <div v-if="carrinhoAberto" class="eq eq-folha-fundo" @click.self="carrinhoAberto = false">
          <div class="eq-folha" role="dialog" aria-modal="true" aria-labelledby="vda-folha-t">
            <div class="eq-folha-alca" />
            <div class="vda-folha-cab">
              <div>
                <p class="eq-rotulo eq-rotulo-marca">Venda direta</p>
                <h3 id="vda-folha-t" class="eq-titulo vda-folha-h3">{{ totalItens }} {{ totalItens === 1 ? 'item' : 'itens' }}</h3>
              </div>
              <button class="eq-icone eq-icone-plano" aria-label="Fechar" @click="carrinhoAberto = false"><X :size="20" /></button>
            </div>

            <div class="vda-folha-rolagem">
              <p v-if="!carrinho.length" class="vda-nada">Carrinho vazio.</p>
              <div v-for="(item, idx) in carrinho" :key="item.produto_id" class="vda-linha">
                <span class="eq-mono vda-linha-qtd">{{ item.quantidade }}×</span>
                <p class="vda-linha-nome">{{ item.nome_produto }}</p>
                <span class="eq-mono vda-linha-sub">{{ fmt(item.preco_unit * item.quantidade) }}</span>
                <button class="eq-icone eq-icone-plano vda-linha-btn" :aria-label="`Tirar um ${item.nome_produto}`" @click="decrementar(idx)"><Minus :size="18" /></button>
                <button class="eq-icone eq-icone-plano vda-linha-btn" :aria-label="`Mais um ${item.nome_produto}`" @click="incrementar(idx)"><Plus :size="18" /></button>
              </div>

              <!-- Desconto (só caixa/admin) -->
              <label v-if="authStore.temPermissao('fecharMesa')" class="eq-campo vda-campo">
                <span>Desconto (R$)</span>
                <input v-model="desconto" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0,00">
              </label>

              <p class="eq-rotulo vda-rot">Forma de pagamento</p>
              <div class="vda-metodos" role="radiogroup" aria-label="Forma de pagamento">
                <button
                  v-for="m in metodos"
                  :key="m.id"
                  class="vda-metodo"
                  role="radio"
                  :aria-checked="metodoSelecionado?.id === m.id"
                  @click="metodoSelecionado = m; valorRecebido = ''"
                >
                  <component :is="getMetodoIcon(m)" :size="18" />
                  {{ m.nome }}
                </button>
              </div>

              <!-- Troco (Dinheiro) -->
              <template v-if="metodoSelecionado?.nome === 'Dinheiro'">
                <label class="eq-campo vda-campo">
                  <span>Recebido (R$)</span>
                  <input v-model="valorRecebido" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0,00">
                </label>
                <div v-if="trocoVal > 0" class="vda-troco">
                  <span>Troco</span>
                  <span class="eq-mono">R$ {{ fmt(trocoVal) }}</span>
                </div>
                <p v-if="valorRecebidoNum > 0 && valorRecebidoNum < total" class="vda-falta">Faltam R$ {{ fmt(total - valorRecebidoNum) }}</p>
              </template>

              <div class="vda-totais">
                <div><span>Subtotal</span><span class="eq-mono">{{ fmt(subtotal) }}</span></div>
                <div v-if="descontoNum > 0" class="desc"><span>Desconto</span><span class="eq-mono">− {{ fmt(descontoNum) }}</span></div>
                <div class="total"><span>Total</span><span class="eq-titulo">R$ {{ fmt(total) }}</span></div>
              </div>
            </div>

            <div class="vda-folha-acoes">
              <button class="eq-btn eq-btn-primario" :disabled="!podePagar || processando" @click="confirmarVenda">
                <span class="flex-1">{{ processando ? 'Registrando…' : 'Confirmar venda' }}</span>
                <span class="eq-btn-seta"><Loader2 v-if="processando" :size="20" class="animate-spin" /><Check v-else :size="20" :stroke-width="2.6" /></span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- VENDA CONFIRMADA -->
    <Teleport to="body">
      <Transition name="vda-pop">
        <div v-if="fichaAtual" class="eq vda-ok" role="dialog" aria-modal="true" aria-labelledby="vda-ok-t">
          <div class="vda-ok-luz" aria-hidden="true" />
          <div class="vda-ok-meio">
            <span class="vda-ok-ic"><Check :size="34" :stroke-width="2.6" /></span>
            <h2 id="vda-ok-t" class="eq-titulo">Venda confirmada.</h2>
            <p class="eq-mudo">Ficha <b class="eq-mono">{{ fichaAtual.numero }}</b></p>

            <div class="vda-ok-cupom">
              <div v-for="item in fichaAtual.itens" :key="item.produto_id" class="vda-ok-item">
                <span class="eq-mono" style="color:var(--eq-marca-clara)">{{ item.quantidade }}×</span>
                <span class="flex-1 truncate">{{ item.nome_produto }}</span>
                <span class="eq-mono">{{ fmt(item.preco_unit * item.quantidade) }}</span>
              </div>
              <div class="vda-ok-item forte"><span class="flex-1">Total pago</span><span class="eq-mono">R$ {{ fmt(fichaAtual.total_liquido) }}</span></div>
              <div v-if="fichaAtual.troco > 0" class="vda-ok-item troco"><span class="flex-1">Troco</span><span class="eq-mono">R$ {{ fmt(fichaAtual.troco) }}</span></div>
            </div>
          </div>
          <button class="eq-btn eq-btn-primario" @click="fichaAtual = null">
            <span class="flex-1">Nova venda</span>
            <span class="eq-btn-seta"><ArrowRight :size="20" /></span>
          </button>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { numeroBR } from '~/lib/moeda'
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Search, UtensilsCrossed, Plus, Minus, X, Check, ArrowRight,
  Loader2, LockKeyhole, Banknote, CreditCard, QrCode, Wallet, Trash2
} from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useCaixaStore } from '~/stores/caixa'
import { useToastStore } from '~/stores/toast'
import { useCarrinhoVendaStore } from '~/stores/carrinhoVenda'
import { useProdutosStore } from '~/stores/produtos'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'mobile' })

const api           = useApi()
const caixaStore    = useCaixaStore()
const toastStore    = useToastStore()
const authStore     = useAuthStore()
const carrinhoStore = useCarrinhoVendaStore()
const produtosStore = useProdutosStore()

const { itens: carrinho, desconto, metodoSelecionado, valorRecebido } = storeToRefs(carrinhoStore)
const { lista: todosProdutos } = storeToRefs(produtosStore)

const iniciando      = ref(true)
const busca          = ref('')
const categoriaAtiva = ref('Todos')
const carrinhoAberto = ref(false)
const metodos        = ref<any[]>([])
const processando    = ref(false)
const fichaAtual     = ref<any>(null)

function fmt(v: number) {
  return numeroBR(v)
}

function getMetodoIcon(m: any) {
  const n = (m.nome || '').toLowerCase()
  if (n.includes('dinheiro')) return Banknote
  if (n.includes('pix'))      return QrCode
  if (n.includes('créd') || n.includes('cred')) return CreditCard
  if (n.includes('déb')  || n.includes('deb'))  return CreditCard
  return Wallet
}

const categorias = computed(() => {
  const cats = [...new Set(todosProdutos.value.filter(p => p.ativo && p.categoria).map(p => p.categoria))]
  return cats as string[]
})

const produtosFiltrados = computed(() => {
  let lista = todosProdutos.value.filter(p => p.ativo)
  if (categoriaAtiva.value !== 'Todos') lista = lista.filter(p => p.categoria === categoriaAtiva.value)
  const q = busca.value.toLowerCase().trim()
  if (q) lista = lista.filter(p => p.nome.toLowerCase().includes(q))
  return lista
})

const totalItens       = computed(() => carrinho.value.reduce((s, i) => s + i.quantidade, 0))
const subtotal         = computed(() => carrinho.value.reduce((s, i) => s + i.preco_unit * i.quantidade, 0))
const descontoNum      = computed(() => Math.min(Math.max(Number(desconto.value) || 0, 0), subtotal.value))
const total            = computed(() => subtotal.value - descontoNum.value)
const valorRecebidoNum = computed(() => Number(valorRecebido.value) || 0)
const trocoVal         = computed(() => metodoSelecionado.value?.nome === 'Dinheiro' ? Math.max(0, valorRecebidoNum.value - total.value) : 0)
const podePagar        = computed(() => {
  if (!carrinho.value.length || !metodoSelecionado.value || total.value <= 0) return false
  if (metodoSelecionado.value.nome === 'Dinheiro') return valorRecebidoNum.value >= total.value
  return true
})

function qtdNoCarrinho(produtoId: string): number {
  return carrinho.value.find(i => i.produto_id === produtoId)?.quantidade ?? 0
}
const indiceNoCarrinho = (produtoId: string) => carrinho.value.findIndex(i => i.produto_id === produtoId)
const esgotado = (p: any) => p.gerenciarEstoque && p.estoqueAtual <= 0

function adicionarAoCarrinho(p: any) {
  if (p.gerenciarEstoque && p.estoqueAtual <= 0) {
    toastStore.warning(`${p.nome} está sem estoque`)
    return
  }
  const idx = carrinho.value.findIndex(i => i.produto_id === p.id)
  if (idx >= 0) carrinho.value[idx].quantidade++
  else carrinho.value.push({ produto_id: p.id, nome_produto: p.nome, preco_unit: Number(p.preco), quantidade: 1 })
  if (p.gerenciarEstoque) p.estoqueAtual--
}

function incrementar(idx: number) {
  const item = carrinho.value[idx]
  const prod = todosProdutos.value.find(p => p.id === item.produto_id)
  if (prod?.gerenciarEstoque) {
    if (prod.estoqueAtual <= 0) { toastStore.warning('Estoque insuficiente'); return }
    prod.estoqueAtual--
  }
  item.quantidade++
}

function decrementar(idx: number) {
  const item = carrinho.value[idx]
  const prod = todosProdutos.value.find(p => p.id === item.produto_id)
  if (prod?.gerenciarEstoque) prod.estoqueAtual++
  if (item.quantidade <= 1) carrinho.value.splice(idx, 1)
  else item.quantidade--
}

function removerTudo(idx: number) {
  const item = carrinho.value[idx]
  const prod = todosProdutos.value.find(p => p.id === item.produto_id)
  if (prod?.gerenciarEstoque) prod.estoqueAtual += item.quantidade
  carrinho.value.splice(idx, 1)
}

function limparCarrinho() {
  for (const item of carrinho.value) {
    const prod = todosProdutos.value.find(p => p.id === item.produto_id)
    if (prod?.gerenciarEstoque) prod.estoqueAtual += item.quantidade
  }
  carrinho.value = []
}

async function confirmarVenda() {
  if (!podePagar.value || processando.value) return
  processando.value = true
  try {
    const resp = await api.post<any>('/vendas', {
      idempotencyKey: carrinhoStore.idempotencyKey,
      itens: carrinho.value.map(i => ({
        produtoId:  i.produto_id,
        quantidade: i.quantidade,
        ...(i.observacao ? { observacao: i.observacao } : {}),
      })),
      metodoId:      metodoSelecionado.value.id,
      valorRecebido: metodoSelecionado.value.nome === 'Dinheiro' ? valorRecebidoNum.value : undefined,
      desconto:      descontoNum.value > 0 ? descontoNum.value : undefined,
    })
    // A API devolve só o código da ficha e a conta; o cupom é montado com o carrinho
    fichaAtual.value = {
      numero:        resp.ficha,
      itens:         carrinho.value.map(i => ({ ...i })),
      total_liquido: resp.total,
      troco:         resp.troco,
    }
    carrinhoStore.limpar()
    carrinhoAberto.value = false
    carregarProdutos()
    caixaStore.carregarStatus()
  } catch (e: any) {
    toastStore.error('Erro ao registrar venda', e?.message)
  } finally {
    processando.value = false
  }
}

async function carregarProdutos() {
  try {
    const rows = await api.get<any[]>('/produtos')
    produtosStore.lista = (rows || [])
  } catch {}
}

async function carregarMetodos() {
  try {
    const rows = await api.get<any[]>('/pagamentos/metodos')
    metodos.value = rows || []
  } catch {}
}

onMounted(async () => {
  const modo = authStore.usuario?.cargo === 'administrador'
    ? 'ambos'
    : (authStore.usuario?.permissoes?.modo_venda as string) || 'ambos'
  if (!authStore.temPermissao('adicionarPedido') || (modo !== 'direta' && modo !== 'ambos')) {
    navigateTo('/m/mesas')
    return
  }

  await Promise.all([caixaStore.carregarStatus(), carregarProdutos(), carregarMetodos()])
  iniciando.value = false
})
</script>

<style scoped>
.vda { display: flex; flex-direction: column; min-height: 100%; }
.vda-centro { flex: 1; display: flex; align-items: center; justify-content: center; padding: 48px 0; }
.vda-nada { margin: 0; padding: 20px 4px; font: 500 15px var(--eq-texto); color: var(--eq-mudo); }
.vda-vazio { flex: 1; display: flex; flex-direction: column; align-items: flex-start; padding: 40px 22px; }
.vda-vazio-ic { width: 72px; height: 72px; border-radius: 24px; display: grid; place-items: center; background: var(--eq-cartao); border: 1px solid var(--eq-linha); color: var(--eq-mudo); }
.vda-vazio h3 { margin: 24px 0 8px; font-size: 24px; letter-spacing: -.02em; }
.vda-vazio p { margin: 0; max-width: 300px; font: 500 15px/1.5 var(--eq-texto); color: var(--eq-mudo); }

.vda-cab { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; padding: 22px 18px 16px; }
.vda-h1 { margin: 0; font-size: 34px; }
.vda-sub { margin: 8px 0 0; font: 500 14px var(--eq-texto); color: var(--eq-mudo); }
.vda-sub.tem { color: var(--eq-marca-clara); }
.vda-limpar { flex: none; display: flex; align-items: center; gap: 6px; height: 40px; padding: 0 14px; border-radius: 14px; cursor: pointer; background: rgba(248, 113, 113, .08); border: 1px solid rgba(248, 113, 113, .2); color: var(--eq-perigo); font: 700 13px var(--eq-texto); }
.vda-filtro { padding: 0 18px; }
.vda-nada { padding: 20px 22px; }
.vda-produtos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px 18px 96px; }
.vda-prod { display: flex; flex-direction: column; gap: 10px; min-height: 168px; padding: 14px; border-radius: 22px; background: var(--eq-cartao); border: 1.5px solid var(--eq-linha); cursor: pointer; transition: border-color .15s; }
.vda-prod.tem { border-color: var(--eq-marca); }
.vda-prod.esgotado { opacity: .45; cursor: not-allowed; }
.vda-prod-ic { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--eq-marca-fundo); color: var(--eq-marca-clara); }
.vda-prod-nome { margin: 0; font: 700 15px/1.25 var(--eq-texto); overflow-wrap: anywhere; }
.vda-prod-cat { margin: 2px 0 0; font: 500 12px var(--eq-texto); color: var(--eq-apagado); }
.vda-prod-esg { margin: 4px 0 0; font: 700 11px var(--eq-texto); letter-spacing: .08em; text-transform: uppercase; color: var(--eq-perigo); }
.vda-prod-pe { display: flex; align-items: center; justify-content: space-between; gap: 6px; min-height: 44px; }
.vda-prod-preco { font-size: 14px; font-weight: 700; color: var(--eq-marca-clara); }
.vda-mais { flex: none; width: 44px; height: 44px; border-radius: 14px; border: 0; display: grid; place-items: center; cursor: pointer; background: var(--eq-marca); color: var(--eq-sobre-marca); }
.vda-mais:active { transform: scale(.9); }
.vda-passo { display: flex; align-items: center; justify-content: space-between; padding: 3px; border-radius: 14px; background: var(--eq-fundo); cursor: default; }
.vda-passo button { width: 44px; height: 40px; border-radius: 11px; border: 0; display: grid; place-items: center; cursor: pointer; background: transparent; color: var(--eq-tinta); }
.vda-passo button.mais { background: var(--eq-marca); color: var(--eq-sobre-marca); }
.vda-passo span { font-size: 17px; font-weight: 700; }
.vda-ver { position: fixed; left: 16px; right: 16px; bottom: calc(96px + env(safe-area-inset-bottom)); z-index: 25; padding: 0 10px 0 12px; gap: 12px; max-width: 528px; margin: 0 auto; box-shadow: 0 16px 40px rgba(255, 122, 0, .35); }
.vda-ver-qtd { min-width: 44px; height: 44px; padding: 0 8px; border-radius: 15px; display: grid; place-items: center; background: var(--eq-sobre-marca); color: var(--eq-marca); font-size: 16px; font-weight: 700; animation: vda-pop-n .28s cubic-bezier(.34, 1.56, .64, 1); }
.vda-ver-total { font-size: 15px; padding: 0 10px; }
@keyframes vda-pop-n { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
.vda-barra-enter-active { transition: transform .25s ease-out, opacity .2s; }
.vda-barra-leave-active { transition: transform .18s ease-in, opacity .18s; }
.vda-barra-enter-from, .vda-barra-leave-to { transform: translateY(16px); opacity: 0; }

/* Folha */
.vda-folha-cab { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 20px 12px; }
.vda-folha-cab p { margin: 0; }
.vda-folha-h3 { margin: 2px 0 0; font-size: 26px; line-height: 1.1; }
.vda-folha-rolagem { overflow: auto; padding: 0 20px; }
.vda-linha { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px dashed rgba(255, 255, 255, .1); }
.vda-linha-qtd { min-width: 30px; font-size: 15px; font-weight: 700; color: var(--eq-marca-clara); }
.vda-linha-nome { flex: 1; min-width: 0; margin: 0; font: 600 15px var(--eq-texto); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vda-linha-sub { font-size: 14px; font-weight: 700; }
.vda-linha-btn { width: 44px; height: 44px; border-radius: 14px; }
.vda-campo { margin-top: 14px; background: var(--eq-fundo); }
.vda-rot { margin: 20px 0 10px; font-size: 11px; letter-spacing: .1em; }
.vda-metodos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.vda-metodo { display: flex; align-items: center; gap: 10px; height: 54px; padding: 0 14px; border-radius: 16px; cursor: pointer; background: var(--eq-fundo); border: 1.5px solid transparent; color: var(--eq-mudo); font: 700 14px var(--eq-texto); text-align: left; }
.vda-metodo[aria-checked="true"] { border-color: var(--eq-marca); color: var(--eq-tinta); background: var(--eq-marca-fundo); }
.vda-metodo[aria-checked="true"] svg { color: var(--eq-marca-clara); }
.vda-troco { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding: 12px 16px; border-radius: 16px; background: rgba(52, 211, 153, .08); border: 1px solid rgba(52, 211, 153, .2); color: var(--eq-ok); font: 700 14px var(--eq-texto); }
.vda-troco .eq-mono { font-size: 18px; }
.vda-falta { margin: 8px 4px 0; font: 700 13px var(--eq-texto); color: var(--eq-perigo); }
.vda-totais { margin-top: 18px; padding-bottom: 14px; }
.vda-totais > div { display: flex; justify-content: space-between; align-items: baseline; padding: 3px 0; font: 600 14px var(--eq-texto); color: var(--eq-mudo); }
.vda-totais .desc { color: var(--eq-ok); }
.vda-totais .total { padding-top: 8px; }
.vda-totais .total .eq-titulo { font-size: 30px; letter-spacing: -.02em; color: var(--eq-tinta); }
.vda-folha-acoes { padding: 6px 16px 22px; }
.vda-folha-acoes .eq-btn { width: 100%; }

/* Venda confirmada */
.vda-ok { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; padding: calc(28px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom)); overflow: hidden; }
.vda-ok-luz { position: absolute; width: 460px; height: 460px; left: -40px; top: 80px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 122, 0, .25) 0%, rgba(255, 122, 0, 0) 65%); pointer-events: none; }
.vda-ok-meio { position: relative; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 12px; max-width: 440px; width: 100%; margin: 0 auto; }
.vda-ok-ic { width: 72px; height: 72px; border-radius: 24px; display: grid; place-items: center; background: var(--eq-marca); color: var(--eq-sobre-marca); }
.vda-ok h2 { margin: 6px 0 0; font-size: 40px; }
.vda-ok p { margin: 0; font: 500 16px var(--eq-texto); }
.vda-ok-cupom { margin-top: 14px; padding: 6px 16px; border-radius: 20px; background: var(--eq-cartao); border: 1px solid var(--eq-linha); }
.vda-ok-item { display: flex; align-items: center; gap: 10px; padding: 9px 0; font: 600 14px var(--eq-texto); border-bottom: 1px dashed rgba(255, 255, 255, .1); }
.vda-ok-item:last-child { border-bottom: 0; }
.vda-ok-item.forte { font-weight: 800; }
.vda-ok-item.troco { color: var(--eq-ok); }
.vda-ok > .eq-btn { position: relative; width: 100%; max-width: 440px; margin: 0 auto; }
.vda-pop-enter-active { transition: opacity .2s, transform .25s cubic-bezier(.2, .8, .2, 1); }
.vda-pop-leave-active { transition: opacity .15s; }
.vda-pop-enter-from { opacity: 0; transform: translateY(16px); }
.vda-pop-leave-to { opacity: 0; }
</style>
