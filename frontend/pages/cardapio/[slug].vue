<template>
  <div class="cdp min-h-dvh pb-28" :class="etapa ? 'lg:pr-[420px]' : ''">
    <!-- Carregando / erro -->
    <div v-if="carregando" class="max-w-2xl mx-auto px-4 pt-10 space-y-3">
      <div class="h-16 rounded-2xl cdp-skel" /><div class="h-10 rounded-2xl cdp-skel" /><div v-for="n in 5" :key="n" class="h-24 rounded-2xl cdp-skel" />
    </div>
    <div v-else-if="erro" class="max-w-md mx-auto px-6 pt-24 text-center">
      <p class="text-lg font-black">Cardápio indisponível</p>
      <p class="cdp-mudo mt-2 text-sm">{{ erro }}</p>
    </div>

    <template v-else-if="c">
      <!-- Topo -->
      <header class="max-w-2xl mx-auto px-4 pt-6 pb-3">
        <div class="flex items-center gap-3">
          <img v-if="c.restaurante.logo" :src="c.restaurante.logo" alt="" class="size-14 rounded-2xl object-contain cdp-cartao p-1" />
          <span v-else class="size-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center"><UtensilsCrossed :size="24" /></span>
          <div class="min-w-0 flex-1">
            <h1 class="text-xl font-black leading-tight truncate">{{ c.restaurante.nome }}</h1>
            <p class="text-xs mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="inline-flex items-center gap-1 font-bold" :class="c.aberto ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                <span class="size-2 rounded-full" :class="c.aberto ? 'bg-emerald-500' : 'bg-red-500'" />{{ c.aberto ? 'Aberto' : 'Fechado' }}
              </span>
              <span v-if="c.aberto" class="cdp-mudo">· {{ c.tempoMin }}–{{ c.tempoMin + 15 }} min</span>
              <span v-if="c.aberto && c.entrega" class="cdp-mudo">· entrega {{ c.taxaEntrega ? moeda(c.taxaEntrega) : 'grátis' }}</span>
              <span v-if="c.pedidoMinimo" class="cdp-mudo">· mínimo {{ moeda(c.pedidoMinimo) }}</span>
            </p>
          </div>
        </div>
        <p v-if="!c.aberto" class="mt-3 text-sm rounded-xl px-3 py-2.5 bg-red-500/10 text-red-700 dark:text-red-300">{{ c.motivo }} Você pode olhar o cardápio.</p>
        <p v-else-if="c.mensagem" class="mt-3 text-sm rounded-xl px-3 py-2.5 bg-orange-500/10 text-orange-800 dark:text-orange-200">{{ c.mensagem }}</p>

        <a v-if="ultimoPedido" :href="`${base}pedido/${ultimoPedido}`" class="mt-3 flex items-center justify-between rounded-xl px-3 py-2.5 cdp-cartao text-sm">
          <span>Acompanhar seu pedido <b class="font-mono">{{ ultimoPedido }}</b></span><ChevronRight :size="16" />
        </a>
      </header>

      <!-- Busca + categorias (fixas ao rolar) -->
      <div class="sticky top-0 z-20 cdp-barra backdrop-blur border-b cdp-linha">
        <div class="max-w-2xl mx-auto px-4 py-2.5 space-y-2.5">
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 cdp-mudo" />
              <input v-model="busca" type="search" placeholder="Buscar no cardápio" aria-label="Buscar no cardápio" class="w-full h-10 pl-9 pr-3 rounded-xl cdp-campo text-sm" />
            </div>
            <div class="flex shrink-0 cdp-chip rounded-xl p-0.5" role="group" aria-label="Modo de exibição">
              <button type="button" class="size-9 rounded-lg flex items-center justify-center" :class="vista === 'lista' ? 'cdp-ativo' : 'cdp-mudo'" :aria-pressed="vista === 'lista'" aria-label="Lista" @click="mudarVista('lista')"><List :size="17" /></button>
              <button type="button" class="size-9 rounded-lg flex items-center justify-center" :class="vista === 'grade' ? 'cdp-ativo' : 'cdp-mudo'" :aria-pressed="vista === 'grade'" aria-label="Grade" @click="mudarVista('grade')"><LayoutGrid :size="17" /></button>
            </div>
          </div>
          <nav v-if="!busca" class="flex gap-2 overflow-x-auto -mx-4 px-4 no-scrollbar" aria-label="Categorias">
            <a v-for="cat in c.categorias" :key="cat.id" :href="`#cat-${cat.id}`" class="shrink-0 h-8 px-3 rounded-full text-xs font-bold flex items-center cdp-chip" @click.prevent="irPara(cat.id)">{{ cat.nome }}</a>
          </nav>
        </div>
      </div>

      <!-- Produtos -->
      <main class="max-w-2xl mx-auto px-4 pt-4 space-y-7">
        <p v-if="busca && !filtradas.length" class="text-center cdp-mudo py-10 text-sm">Nada encontrado para “{{ busca }}”.</p>
        <section v-for="cat in filtradas" :id="`cat-${cat.id}`" :key="cat.id" class="scroll-mt-28">
          <h2 class="text-base font-black mb-2.5">{{ cat.nome }}</h2>
          <div :class="vista === 'grade' ? 'grid grid-cols-2 sm:grid-cols-3 gap-2.5' : 'space-y-2.5'">
            <button v-for="p in cat.produtos" :key="p.id" type="button" :disabled="p.esgotado"
              class="relative w-full text-left rounded-2xl cdp-cartao disabled:opacity-50"
              :class="vista === 'grade' ? 'flex flex-col overflow-hidden' : 'p-3.5 flex gap-3 items-start'"
              @click="abrirProduto(p)">
              <!-- Grade: foto no alto. Lista: foto ao lado -->
              <div v-if="vista === 'grade'" class="relative aspect-[4/3] w-full">
                <ProdutoFoto :imagem="p.imagemUrl" :categoria="cat.nome" classe="absolute inset-0 rounded-none" :tamanho-icone="36" />
                <span v-if="!p.esgotado" class="absolute bottom-2 right-2 size-8 rounded-full bg-orange-500 text-white flex items-center justify-center shadow" aria-hidden="true"><Plus :size="16" /></span>
              </div>
              <div :class="vista === 'grade' ? 'p-3 flex-1 flex flex-col' : 'flex-1 min-w-0'">
                <p class="font-bold leading-snug" :class="vista === 'grade' ? 'text-sm line-clamp-2' : ''">{{ p.nome }}</p>
                <p v-if="p.descricao && vista === 'lista'" class="text-xs cdp-mudo mt-1 line-clamp-2">{{ p.descricao }}</p>
                <p class="font-black text-sm" :class="vista === 'grade' ? 'mt-auto pt-2' : 'mt-2'">{{ p.esgotado ? 'Esgotado' : moeda(p.preco) }}</p>
              </div>
              <!-- Foto, ou o ícone da categoria quando o produto não tem foto -->
              <span v-if="vista === 'lista'" class="relative shrink-0">
                <ProdutoFoto :imagem="p.imagemUrl" :categoria="cat.nome" classe="size-20 rounded-xl" :tamanho-icone="30" />
                <span v-if="!p.esgotado" class="absolute -bottom-1.5 -right-1.5 size-7 rounded-full bg-orange-500 text-white flex items-center justify-center ring-2 ring-[var(--cdp-cartao)]" aria-hidden="true"><Plus :size="15" /></span>
              </span>
              <span v-if="noCarrinho(p.id)" class="sr-only">{{ noCarrinho(p.id) }} na sacola</span>
            </button>
          </div>
        </section>
      </main>

      <!-- Barra da sacola -->
      <div v-if="qtdItens" class="fixed bottom-0 inset-x-0 z-30 p-3 cdp-fundo border-t cdp-linha" :class="etapa ? 'lg:hidden' : ''">
        <button class="max-w-2xl mx-auto w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black flex items-center justify-between px-5" @click="etapa = 'sacola'">
          <span class="flex items-center gap-2"><ShoppingBag :size="18" /> Ver sacola</span>
          <span class="tabular-nums">{{ qtdItens }} {{ qtdItens === 1 ? 'item' : 'itens' }} · {{ moeda(subtotal) }}</span>
        </button>
      </div>

      <!-- Folha do produto -->
      <Folha v-if="produto" :titulo="produto.nome" @fechar="produto = null">
        <p v-if="produto.descricao" class="text-sm cdp-mudo">{{ produto.descricao }}</p>
        <img v-if="produto.imagemUrl" :src="produto.imagemUrl" alt="" class="w-full max-h-56 object-cover rounded-2xl mt-3" />
        <label class="block mt-4">
          <span class="text-xs font-bold cdp-mudo">Alguma observação?</span>
          <input v-model="obsProduto" maxlength="140" placeholder="Ex.: sem cebola, ponto da carne…" class="mt-1 w-full h-11 px-3 rounded-xl cdp-campo text-sm" />
        </label>
        <template #rodape>
          <div class="flex items-center gap-3">
            <Stepper v-model="qtdProduto" :min="1" />
            <button class="flex-1 h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black" @click="adicionar">Adicionar · {{ moeda(produto.preco * qtdProduto) }}</button>
          </div>
        </template>
      </Folha>

      <!-- Sacola e finalização -->
      <Folha v-if="etapa" lateral :titulo="etapa === 'sacola' ? 'Sua sacola' : 'Finalizar pedido'" @fechar="etapa = null">
        <template v-if="etapa === 'sacola'">
          <div v-for="(i, idx) in carrinho" :key="idx" class="flex items-start gap-3 py-3 border-b cdp-linha last:border-0">
            <div class="flex-1 min-w-0">
              <p class="font-bold text-sm">{{ i.nome }}</p>
              <p v-if="i.observacao" class="text-xs cdp-mudo">{{ i.observacao }}</p>
              <p class="text-sm font-black mt-1 tabular-nums">{{ moeda(i.preco * i.quantidade) }}</p>
            </div>
            <Stepper v-model="i.quantidade" :min="0" pequeno @update:model-value="v => v === 0 && carrinho.splice(idx, 1)" />
          </div>
          <p v-if="faltaMinimo > 0" class="mt-3 text-xs rounded-xl px-3 py-2 bg-amber-500/10 text-amber-800 dark:text-amber-200">Faltam {{ moeda(faltaMinimo) }} para o pedido mínimo de {{ moeda(c.pedidoMinimo) }}.</p>
        </template>

        <template v-else>
          <!-- Entrega ou retirada -->
          <div class="grid grid-cols-2 gap-2">
            <button v-if="c.entrega" type="button" class="h-12 rounded-xl border-2 text-sm font-black" :class="f.tipo === 'entrega' ? 'border-orange-500 bg-orange-500/10' : 'cdp-linha'" @click="f.tipo = 'entrega'">Entrega</button>
            <button v-if="c.retirada" type="button" class="h-12 rounded-xl border-2 text-sm font-black" :class="f.tipo === 'retirada' ? 'border-orange-500 bg-orange-500/10' : 'cdp-linha'" @click="f.tipo = 'retirada'">Retirar no local</button>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3">
            <Campo v-model="f.clienteNome" rotulo="Seu nome" autocomplete="name" />
            <Campo v-model="f.clienteTelefone" rotulo="Celular com DDD" tipo="tel" autocomplete="tel" placeholder="(62) 9 9999-9999" @update:model-value="mascararTelefone" />
            <template v-if="f.tipo === 'entrega'">
              <div class="grid grid-cols-[1fr_6rem] gap-3">
                <Campo v-model="f.endereco" rotulo="Rua" autocomplete="address-line1" />
                <Campo v-model="f.numero" rotulo="Número" inputmode="numeric" />
              </div>
              <Campo v-model="f.bairro" rotulo="Bairro" />
              <Campo v-model="f.complemento" rotulo="Complemento (opcional)" placeholder="Apto, bloco, casa" />
              <Campo v-model="f.referencia" rotulo="Ponto de referência (opcional)" />
            </template>
          </div>

          <!-- Pagamento -->
          <p class="mt-5 text-xs font-bold cdp-mudo">Pagamento {{ f.tipo === 'entrega' ? 'na entrega' : 'na retirada' }}</p>
          <div class="mt-1.5 grid grid-cols-2 gap-2">
            <button v-for="fp in FORMAS" :key="fp.valor" type="button" class="h-11 rounded-xl border-2 text-xs font-black" :class="f.formaPagamento === fp.valor ? 'border-orange-500 bg-orange-500/10' : 'cdp-linha'" @click="f.formaPagamento = fp.valor">{{ fp.rotulo }}</button>
          </div>
          <Campo v-if="f.formaPagamento === 'dinheiro'" v-model="f.trocoPara" class="mt-3" rotulo="Troco para quanto? (deixe vazio se não precisar)" inputmode="decimal" placeholder="Ex.: 100" />
          <Campo v-model="f.observacao" class="mt-3" rotulo="Observação do pedido (opcional)" />

          <!-- Resumo -->
          <dl class="mt-5 text-sm space-y-1 tabular-nums">
            <div class="flex justify-between"><dt class="cdp-mudo">Itens</dt><dd>{{ moeda(subtotal) }}</dd></div>
            <div v-if="f.tipo === 'entrega'" class="flex justify-between"><dt class="cdp-mudo">Entrega</dt><dd>{{ c.taxaEntrega ? moeda(c.taxaEntrega) : 'Grátis' }}</dd></div>
            <div class="flex justify-between text-base font-black pt-1"><dt>Total</dt><dd>{{ moeda(total) }}</dd></div>
          </dl>
          <p v-if="erroEnvio" class="mt-3 text-sm text-red-600 dark:text-red-400 font-bold" role="alert">{{ erroEnvio }}</p>
        </template>

        <template #rodape>
          <button v-if="etapa === 'sacola'" class="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-black"
            :disabled="!qtdItens || faltaMinimo > 0 || !c.aberto" @click="etapa = 'dados'">
            {{ !c.aberto ? 'Restaurante fechado agora' : `Continuar · ${moeda(subtotal)}` }}
          </button>
          <button v-else class="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-black flex items-center justify-center gap-2"
            :disabled="enviando" @click="enviar">
            <Loader2 v-if="enviando" :size="18" class="animate-spin" /> Enviar pedido · {{ moeda(total) }}
          </button>
        </template>
      </Folha>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, defineComponent, h } from 'vue'
import { Search, Plus, Minus, ShoppingBag, UtensilsCrossed, ChevronRight, X, Loader2, List, LayoutGrid } from 'lucide-vue-next'
import ProdutoFoto from '~/components/ProdutoFoto.vue'
import { useTemaDoAparelho } from '~/composables/useTemaDoAparelho'

definePageMeta({ layout: false })
useHead({ title: 'Cardápio', meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }] })
useTemaDoAparelho()

const route = useRoute()
const slug = String(route.params.slug || '')
const config = useRuntimeConfig()
const api = (p: string, o: any = {}) => $fetch<any>(`${config.public.apiUrl}/api/publico${p}`, o)
const base = config.app.baseURL

const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
// Crédito e débito separados: o pagamento entra certo no caixa e no fechamento das maquininhas
const FORMAS = [{ valor: 'pix', rotulo: 'Pix' }, { valor: 'credito', rotulo: 'Cartão de crédito' }, { valor: 'debito', rotulo: 'Cartão de débito' }, { valor: 'dinheiro', rotulo: 'Dinheiro' }] as const

// ── Pecinhas de interface ──
const Folha = defineComponent({
  props: { titulo: String, lateral: Boolean },
  emits: ['fechar'],
  setup(p, { slots, emit }) {
    // Lateral (sacola no computador): painel à direita, sem escurecer a página
    const fora = p.lateral
      ? 'fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 lg:inset-auto lg:right-6 lg:top-6 lg:bottom-6 lg:w-[380px] lg:bg-transparent lg:items-stretch lg:justify-end lg:pointer-events-none'
      : 'fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50'
    const dentro = p.lateral
      ? 'cdp-fundo w-full sm:max-w-lg max-h-[92dvh] rounded-t-3xl sm:rounded-3xl flex flex-col lg:max-w-none lg:max-h-none lg:h-full lg:rounded-3xl lg:border cdp-linha lg:pointer-events-auto'
      : 'cdp-fundo w-full sm:max-w-lg max-h-[92dvh] rounded-t-3xl sm:rounded-3xl flex flex-col'
    return () => h('div', { class: fora, onClick: (e: MouseEvent) => e.target === e.currentTarget && emit('fechar') }, [
      h('div', { class: dentro, role: 'dialog', 'aria-modal': 'true', 'aria-label': p.titulo }, [
        h('div', { class: 'flex items-center justify-between px-5 pt-5 pb-3' }, [
          h('h2', { class: 'text-lg font-black' }, p.titulo),
          h('button', { class: 'size-9 rounded-full cdp-chip flex items-center justify-center', 'aria-label': 'Fechar', onClick: () => emit('fechar') }, [h(X, { size: 18 })]),
        ]),
        h('div', { class: 'flex-1 overflow-y-auto px-5 pb-4' }, slots.default?.()),
        slots.rodape ? h('div', { class: 'px-5 py-4 border-t cdp-linha' }, slots.rodape()) : null,
      ]),
    ])
  },
})
const Stepper = defineComponent({
  props: { modelValue: { type: Number, required: true }, min: { type: Number, default: 1 }, pequeno: Boolean },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    const t = () => (p.pequeno ? 'size-8' : 'size-12')
    return () => h('div', { class: 'flex items-center gap-1 rounded-2xl cdp-chip p-1' }, [
      h('button', { type: 'button', class: `${t()} rounded-xl flex items-center justify-center`, 'aria-label': 'Menos', onClick: () => emit('update:modelValue', Math.max(p.min, p.modelValue - 1)) }, [h(Minus, { size: 16 })]),
      h('span', { class: 'w-7 text-center font-black tabular-nums', 'aria-live': 'polite' }, String(p.modelValue)),
      h('button', { type: 'button', class: `${t()} rounded-xl flex items-center justify-center`, 'aria-label': 'Mais', onClick: () => emit('update:modelValue', Math.min(99, p.modelValue + 1)) }, [h(Plus, { size: 16 })]),
    ])
  },
})
const Campo = defineComponent({
  props: { modelValue: [String, Number], rotulo: String, tipo: { type: String, default: 'text' }, placeholder: String, autocomplete: String, inputmode: String },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    return () => h('label', { class: 'block' }, [
      h('span', { class: 'text-xs font-bold cdp-mudo' }, p.rotulo),
      h('input', {
        class: 'mt-1 w-full h-11 px-3 rounded-xl cdp-campo text-sm', value: p.modelValue ?? '', type: p.tipo,
        placeholder: p.placeholder, autocomplete: p.autocomplete, inputmode: p.inputmode,
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
      }),
    ])
  },
})

// ── Cardápio ──
const c = ref<any>(null)
const carregando = ref(true)
const erro = ref('')
const busca = ref('')
// Lista ou grade: a escolha fica no aparelho
const vista = ref<'lista' | 'grade'>('lista')
function mudarVista(v: 'lista' | 'grade') { vista.value = v; try { localStorage.setItem('cardapio:vista', v) } catch {} }
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const filtradas = computed(() => {
  if (!c.value) return []
  const q = semAcento(busca.value.trim())
  if (!q) return c.value.categorias
  return c.value.categorias
    .map((cat: any) => ({ ...cat, produtos: cat.produtos.filter((p: any) => semAcento(`${p.nome} ${p.descricao ?? ''}`).includes(q)) }))
    .filter((cat: any) => cat.produtos.length)
})
function irPara(id: string) { document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth' }) }

// ── Sacola (guardada no aparelho por restaurante) ──
interface ItemSacola { produtoId: string; nome: string; preco: number; quantidade: number; observacao: string }
const CHAVE = `cardapio:${slug}`
const carrinho = ref<ItemSacola[]>([])
const qtdItens = computed(() => carrinho.value.reduce((s, i) => s + i.quantidade, 0))
const subtotal = computed(() => carrinho.value.reduce((s, i) => s + i.preco * i.quantidade, 0))
const noCarrinho = (id: string) => carrinho.value.filter(i => i.produtoId === id).reduce((s, i) => s + i.quantidade, 0)
const faltaMinimo = computed(() => Math.max(0, (c.value?.pedidoMinimo ?? 0) - subtotal.value))
watch(carrinho, (v) => { try { localStorage.setItem(CHAVE, JSON.stringify(v)) } catch {} }, { deep: true })

const produto = ref<any>(null)
const qtdProduto = ref(1)
const obsProduto = ref('')
function abrirProduto(p: any) { produto.value = p; qtdProduto.value = 1; obsProduto.value = '' }
function adicionar() {
  const p = produto.value
  const obs = obsProduto.value.trim()
  const igual = carrinho.value.find(i => i.produtoId === p.id && i.observacao === obs)
  if (igual) igual.quantidade = Math.min(99, igual.quantidade + qtdProduto.value)
  else carrinho.value.push({ produtoId: p.id, nome: p.nome, preco: p.preco, quantidade: qtdProduto.value, observacao: obs })
  produto.value = null
}

// ── Finalização ──
const etapa = ref<null | 'sacola' | 'dados'>(null)
const f = reactive({
  tipo: 'entrega' as 'entrega' | 'retirada', clienteNome: '', clienteTelefone: '', endereco: '', numero: '', bairro: '',
  complemento: '', referencia: '', formaPagamento: 'pix' as 'pix' | 'credito' | 'debito' | 'dinheiro', trocoPara: '', observacao: '',
})
const total = computed(() => subtotal.value + (f.tipo === 'entrega' ? c.value?.taxaEntrega ?? 0 : 0))
function mascararTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  f.clienteTelefone = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d
}
const enviando = ref(false)
const erroEnvio = ref('')
const ultimoPedido = ref<string | null>(null)


async function enviar() {
  erroEnvio.value = ''
  if (f.clienteNome.trim().length < 2) { erroEnvio.value = 'Informe seu nome'; return }
  if (f.clienteTelefone.replace(/\D/g, '').length < 10) { erroEnvio.value = 'Informe o celular com DDD'; return }
  if (f.tipo === 'entrega' && (!f.endereco.trim() || !f.numero.trim() || !f.bairro.trim())) { erroEnvio.value = 'Informe rua, número e bairro'; return }
  const troco = f.formaPagamento === 'dinheiro' && f.trocoPara.trim() ? Number(f.trocoPara.replace(',', '.')) : null
  if (troco !== null && (!Number.isFinite(troco) || troco < total.value)) { erroEnvio.value = `O troco precisa ser para um valor acima de ${moeda(total.value)}`; return }
  enviando.value = true
  try {
    const r = await api(`/cardapio/${encodeURIComponent(slug)}/pedidos`, {
      method: 'POST',
      body: {
        ...f, trocoPara: troco,
        itens: carrinho.value.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade, ...(i.observacao ? { observacao: i.observacao } : {}) })),
      },
    })
    try {
      localStorage.removeItem(CHAVE)
      localStorage.setItem(`${CHAVE}:ultimo`, r.codigo)
    } catch {}
    carrinho.value = []
    navigateTo(`/pedido/${r.codigo}`)
  } catch (e: any) {
    erroEnvio.value = e?.data?.error || 'Não deu para enviar. Confira a conexão e tente de novo.'
  } finally {
    enviando.value = false
  }
}

onMounted(async () => {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || '[]')
    if (Array.isArray(salvo)) carrinho.value = salvo
    ultimoPedido.value = localStorage.getItem(`${CHAVE}:ultimo`)
    if (localStorage.getItem('cardapio:vista') === 'grade') vista.value = 'grade'
  } catch {}
  try {
    c.value = await api(`/cardapio/${encodeURIComponent(slug)}`)
    useHead({ title: `${c.value.restaurante.nome} · Cardápio` })
    if (!c.value.entrega) f.tipo = 'retirada'
    else if (!c.value.retirada) f.tipo = 'entrega'
    // Itens que saíram do cardápio somem da sacola salva
    const ativos = new Map(c.value.categorias.flatMap((cat: any) => cat.produtos).filter((p: any) => !p.esgotado).map((p: any) => [p.id, p]))
    carrinho.value = carrinho.value.filter(i => ativos.has(i.produtoId)).map(i => ({ ...i, preco: (ativos.get(i.produtoId) as any).preco }))
  } catch (e: any) {
    erro.value = e?.data?.error || 'Confira o link com o restaurante.'
  } finally {
    carregando.value = false
  }
})
</script>

<style>
/* Global (prefixo .cdp): as folhas são componentes de render function e não recebem o atributo do scoped */
.cdp-ativo { background: var(--cdp-txt); color: var(--cdp-fundo); }
.cdp { background: var(--cdp-fundo); color: var(--cdp-txt); font-family: var(--fonte-texto, system-ui), system-ui, sans-serif; }
.cdp-fundo { background: var(--cdp-fundo); color: var(--cdp-txt); }
.cdp-barra { background: color-mix(in srgb, var(--cdp-fundo) 94%, transparent); }
.cdp-cartao { background: var(--cdp-cartao); border: 1px solid var(--cdp-linha); }
.cdp-campo { background: var(--cdp-cartao); border: 1px solid var(--cdp-linha); color: var(--cdp-txt); outline: none; }
.cdp-campo:focus { border-color: #f97316; }
.cdp-chip { background: var(--cdp-chip); color: var(--cdp-txt); }
.cdp-linha { border-color: var(--cdp-linha); }
.cdp-mudo { color: var(--cdp-mudo); }
.cdp-skel { background: var(--cdp-chip); animation: pulse 1.4s ease-in-out infinite; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { scrollbar-width: none; }
</style>

<style>
/* Tokens do cardápio: seguem o tema do aparelho do cliente (useTemaDoAparelho) */
:root { --cdp-fundo: #ffffff; --cdp-cartao: #ffffff; --cdp-chip: #f3f4f6; --cdp-linha: #e5e7eb; --cdp-txt: #111827; --cdp-mudo: #6b7280; }
html.dark { --cdp-fundo: #0e1119; --cdp-cartao: #171c27; --cdp-chip: #222938; --cdp-linha: #2b3345; --cdp-txt: #f1f4f9; --cdp-mudo: #a9b3c6; }
</style>
