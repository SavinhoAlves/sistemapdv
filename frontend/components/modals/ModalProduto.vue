<template>
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    @click.self="fechar"
  >

    <div class="bg-white dark:bg-neutral-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] w-full max-w-2xl rounded-3xl overflow-hidden max-h-[90vh] flex flex-col shadow-float">

      <!-- HEADER -->
      <div class="p-6 border-b border-gray-100 dark:border-white/[0.08] flex justify-between items-center">
        <h2 class="text-2xl font-black text-gray-900 dark:text-white">
          {{ form.id ? 'Editar Produto' : 'Novo Produto' }}
        </h2>

        <button
          @click="fechar"
          class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-red-950/40 text-gray-500 dark:text-white/60 transition-colors"
        >
          ✕
        </button>
      </div>

      <!-- BODY -->
      <div class="p-6 overflow-y-auto flex-1 grid grid-cols-2 gap-4">

        <!-- FOTO: opcional; sem foto, o sistema usa o ícone da categoria -->
        <div class="col-span-2 flex items-center gap-4">
          <ProdutoFoto :imagem="form.imagemUrl" :categoria="categoriaAtual?.nome" classe="size-20 rounded-2xl" :tamanho-icone="30" />
          <div class="min-w-0">
            <p class="text-xs font-bold text-gray-500 dark:text-white/40">Foto do produto <span class="font-semibold">(opcional)</span></p>
            <p class="text-[11px] text-gray-400 dark:text-white/30 mt-0.5">{{ form.imagemUrl ? 'Aparece no PDV e no cardápio online.' : 'Sem foto, aparece o ícone da categoria.' }}</p>
            <div class="mt-2 flex gap-2">
              <label class="h-9 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black flex items-center cursor-pointer">
                {{ form.imagemUrl ? 'Trocar foto' : 'Escolher foto' }}
                <input type="file" accept="image/*" class="sr-only" @change="escolherFoto" />
              </label>
              <button v-if="form.imagemUrl" type="button" class="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-500 dark:text-white/50 hover:text-red-500" @click="form.imagemUrl = null">Remover</button>
            </div>
            <p v-if="erroFoto" class="text-[11px] font-bold text-red-500 mt-1" role="alert">{{ erroFoto }}</p>
          </div>
        </div>

        <!-- NOME -->
        <div class="col-span-2">
          <label for="prod-nome" class="text-xs font-bold text-gray-500 dark:text-white/40 block mb-1">Nome</label>
          <input id="prod-nome" name="prod-nome" v-model="form.nome"
            class="w-full h-11 border border-gray-200 dark:border-white/10 rounded-xl px-3 mt-0 outline-none bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:border-orange-500/70 transition-colors" />
        </div>

        <!-- CATEGORIA -->
        <div>
          <label for="prod-categoria" class="text-xs font-bold text-gray-500 dark:text-white/40 block mb-1">Categoria <span class="text-red-400">*</span></label>

          <div v-if="!novaCategoria" class="flex gap-2">
            <select id="prod-categoria" name="prod-categoria" v-model="form.categoriaId" required
              class="flex-1 h-11 border border-gray-200 dark:border-white/10 rounded-xl px-3 outline-none !bg-gray-50 dark:!bg-white/[0.06] text-gray-900 dark:text-white focus:border-orange-500/70 transition-colors">
              <option :value="null" disabled>Selecione...</option>
              <option
                v-for="cat in categorias"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.nome }}
              </option>
            </select>
            <button
              @click="novaCategoria = true"
              class="h-11 px-3 rounded-xl bg-orange-950/40 hover:bg-orange-900/50 text-orange-400 font-black text-lg"
              title="Nova categoria"
            >
              +
            </button>
          </div>

          <div v-else class="flex gap-2">
            <input
              id="prod-nova-categoria"
              name="prod-nova-categoria"
              v-model="nomeNovaCategoria"
              class="flex-1 h-11 border border-gray-200 dark:border-white/10 rounded-xl px-3 outline-none bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:border-orange-500/70 transition-colors"
              placeholder="Nome da categoria"
              aria-label="Nome da nova categoria"
              @keydown.enter="criarCategoria"
              @keydown.escape="novaCategoria = false"
            />
            <button
              @click="criarCategoria"
              :disabled="criandoCategoria"
              class="h-11 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black disabled:opacity-50"
            >
              OK
            </button>
            <button
              @click="novaCategoria = false; nomeNovaCategoria = ''"
              class="h-11 px-3 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/60 font-black transition-colors"
            >
              ✕
            </button>
          </div>

        </div>

        <!-- ENVIAR PARA A COZINHA: segue a categoria ou é exceção -->
        <!-- ENVIAR PARA A COZINHA: 3 opções fixas; "segue a categoria" é o padrão -->
        <fieldset class="col-span-2">
          <legend class="text-xs font-bold text-gray-500 dark:text-white/40 mb-1.5">Enviar para a cozinha</legend>
          <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Enviar para a cozinha">
            <label v-for="op in OPCOES_COZINHA" :key="op.valor"
              class="cursor-pointer rounded-xl border px-2.5 py-2 text-left transition-colors"
              :class="form.envioCozinha === op.valor
                ? 'border-orange-500 bg-orange-500/10 text-gray-900 dark:text-white'
                : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50 hover:border-gray-300 dark:hover:border-white/20'">
              <input type="radio" class="sr-only" name="prod-cozinha" :value="op.valor" v-model="form.envioCozinha" />
              <span class="flex items-center gap-1.5 text-xs font-black">
                <span class="size-3 rounded-full border-2 shrink-0" :class="form.envioCozinha === op.valor ? 'border-orange-500 bg-orange-500' : 'border-gray-300 dark:border-white/25'" />
                {{ op.rotulo }}
              </span>
              <span class="block mt-0.5 pl-[18px] text-[10px] font-semibold leading-tight text-gray-400 dark:text-white/35">{{ op.dica }}</span>
            </label>
          </div>
          <p class="mt-1.5 flex items-center gap-1 text-[11px] font-black" :class="vaiCozinha ? 'text-orange-400' : 'text-gray-400 dark:text-white/35'">
            <ChefHat :size="12" />
            {{ vaiCozinha ? 'Este produto aparece na Cozinha' : 'Este produto não passa pela Cozinha' }}
          </p>
        </fieldset>

        <!-- PREÇO -->
        <div>
          <label for="prod-preco" class="text-xs font-bold text-gray-500 dark:text-white/40 block mb-1">Preço</label>
          <input id="prod-preco" name="prod-preco" v-model="precoTexto" type="text" inputmode="decimal" placeholder="0,00"
            @blur="formatarPreco"
            class="w-full h-11 border border-gray-200 dark:border-white/10 rounded-xl px-3 mt-0 outline-none bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:border-orange-500/70 transition-colors" />
        </div>

        <!-- ESTOQUE -->
        <div>
          <label for="prod-estoque-atual" class="text-xs font-bold text-gray-500 dark:text-white/40 block mb-1">Estoque atual</label>
          <input id="prod-estoque-atual" name="prod-estoque-atual" v-model="form.estoqueAtual" type="number" min="0" step="1"
            class="w-full h-11 border border-gray-200 dark:border-white/10 rounded-xl px-3 mt-0 outline-none bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:border-orange-500/70 transition-colors" />
          <p v-if="form.id" class="text-[11px] text-gray-400 dark:text-white/40 mt-1">
            Alterações aqui entram no histórico como ajuste
          </p>
        </div>

        <div>
          <label for="prod-estoque-minimo" class="text-xs font-bold text-gray-500 dark:text-white/40 block mb-1">Estoque mínimo</label>
          <input id="prod-estoque-minimo" name="prod-estoque-minimo" v-model="form.estoqueMinimo" type="number" min="0" step="1"
            class="w-full h-11 border border-gray-200 dark:border-white/10 rounded-xl px-3 mt-0 outline-none bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:border-orange-500/70 transition-colors" />
          <p class="text-[11px] text-gray-400 dark:text-white/40 mt-1">
            Abaixo disso o produto é marcado como "baixo estoque"
          </p>
        </div>

        <!-- GERENCIAR ESTOQUE -->
        <div class="col-span-2 flex items-center justify-between bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/[0.06]">

          <div>
            <p class="font-bold text-gray-900 dark:text-white">Gerenciar estoque</p>
            <p class="text-sm text-gray-500 dark:text-white/50">
              Se ativado, o sistema bloqueia vendas sem estoque
            </p>
          </div>

          <button
            @click="form.gerenciarEstoque = !form.gerenciarEstoque"
            :class="form.gerenciarEstoque ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-400'"
            class="w-14 h-8 rounded-full relative transition-colors"
          >
            <div
              :class="form.gerenciarEstoque ? 'translate-x-7' : 'translate-x-1'"
              class="w-6 h-6 bg-white rounded-full absolute top-1 transition"
            />
          </button>

        </div>

        <!-- ATIVO -->
        <div class="col-span-2 flex items-center justify-between bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/[0.06]">

          <div>
            <p class="font-bold text-gray-900 dark:text-white">Produto ativo</p>
            <p class="text-sm text-gray-500 dark:text-white/50">
              Aparece na tela de vendas
            </p>
          </div>

          <button
            @click="form.ativo = !form.ativo"
            :class="form.ativo ? 'bg-green-500' : 'bg-red-500'"
            class="w-14 h-8 rounded-full relative"
          >
            <div
              :class="form.ativo ? 'translate-x-7' : 'translate-x-1'"
              class="w-6 h-6 bg-white rounded-full absolute top-1 transition"
            />
          </button>

        </div>

      </div>

      <!-- FOOTER -->
      <div class="p-6 border-t border-gray-100 dark:border-white/[0.08] flex justify-end gap-3">

        <button @click="fechar" class="px-5 py-2 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl font-bold transition-colors">
          Cancelar
        </button>

        <button @click="salvar" class="px-5 py-2 bg-orange-500 text-white font-black rounded-xl hover:bg-orange-600 transition-colors">
          Salvar
        </button>

      </div>

    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch, onMounted } from 'vue'
import { lerValor } from '~/lib/valor'
import { numeroBR } from '~/lib/moeda'
import { ChefHat } from 'lucide-vue-next'
import ProdutoFoto from '~/components/ProdutoFoto.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'

const api        = useApi()
const toastStore = useToastStore()

const props = defineProps({
  modelValue: Boolean,
  produto: Object
})

const emit = defineEmits(['update:modelValue', 'salvar'])

const form = reactive({
  id: null,
  nome: '',
  preco: 0,
  categoriaId: null,
  ativo: true,
  estoqueAtual: 0,
  estoqueMinimo: 5,
  gerenciarEstoque: true,
  envioCozinha: 'categoria',
  imagemUrl: null
})

const categorias        = ref([])
const novaCategoria     = ref(false)
const nomeNovaCategoria = ref('')
const criandoCategoria  = ref(false)

const categoriaAtual = computed(() => categorias.value.find(c => c.id === form.categoriaId))

// ── Foto: reduz para no máximo 600 px e JPEG 0,8 (~60 KB) antes de guardar ──
const erroFoto = ref('')
function escolherFoto(e) {
  const input = e.target
  const arquivo = input.files?.[0]
  input.value = ''
  erroFoto.value = ''
  if (!arquivo) return
  if (!arquivo.type.startsWith('image/')) { erroFoto.value = 'Escolha um arquivo de imagem'; return }
  const url = URL.createObjectURL(arquivo)
  const img = new Image()
  img.onload = () => {
    const escala = Math.min(1, 600 / Math.max(img.width, img.height))
    const tela = document.createElement('canvas')
    tela.width = Math.round(img.width * escala)
    tela.height = Math.round(img.height * escala)
    tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height)
    form.imagemUrl = tela.toDataURL('image/jpeg', 0.8)
    URL.revokeObjectURL(url)
  }
  img.onerror = () => { erroFoto.value = 'Não deu para abrir esta imagem'; URL.revokeObjectURL(url) }
  img.src = url
}

// A dica de "segue a categoria" mostra o que a categoria já decide
const OPCOES_COZINHA = computed(() => [
  { valor: 'categoria', rotulo: 'Padrão', dica: categoriaAtual.value ? (categoriaAtual.value.vaiCozinha ? 'Segue a categoria: vai' : 'Segue a categoria: não vai') : 'Segue a categoria' },
  { valor: 'sempre', rotulo: 'Sempre', dica: 'Vai à cozinha mesmo se a categoria não vai' },
  { valor: 'nunca', rotulo: 'Nunca', dica: 'Sai direto do balcão' },
])
const vaiCozinha = computed(() => form.envioCozinha === 'sempre' || (form.envioCozinha !== 'nunca' && (categoriaAtual.value?.vaiCozinha ?? true)))

async function carregarCategorias() {
  try {
    const rows = await api.get('/categorias')
    categorias.value = Array.isArray(rows) ? rows : []
  } catch {
    categorias.value = []
  }
}

async function criarCategoria() {
  const nome = nomeNovaCategoria.value.trim()
  if (!nome || criandoCategoria.value) return

  criandoCategoria.value = true
  try {
    const nova = await api.post('/categorias', { nome })
    categorias.value.push({ id: nova.id, nome: nova.nome })
    form.categoriaId = nova.id
    novaCategoria.value     = false
    nomeNovaCategoria.value = ''
    toastStore.success(`Categoria "${nova.nome}" criada!`)
  } catch (err) {
    toastStore.error(err?.message || 'Erro ao criar categoria')
  } finally {
    criandoCategoria.value = false
  }
}

function fechar() {
  novaCategoria.value     = false
  nomeNovaCategoria.value = ''
  emit('update:modelValue', false)
}

// Preço digitado como texto (aceita 12,5 / 12.50) e mostrado sempre com 2 casas: 12,50
const precoTexto = ref('')
function formatarPreco() {
  const v = lerValor(precoTexto.value)
  if (v !== null && !Number.isNaN(v) && v >= 0) precoTexto.value = numeroBR(v)
}

function salvar() {
  if (!form.nome?.trim()) return toastStore.error('Nome obrigatório', 'Informe o nome do produto')
  if (!form.categoriaId) return toastStore.error('Categoria obrigatória', 'Selecione uma categoria para o produto')
  const preco = lerValor(precoTexto.value)
  if (preco === null || Number.isNaN(preco) || preco <= 0) return toastStore.error('Preço inválido', 'Informe um preço maior que zero, por exemplo 12,50')
  form.preco = Math.round(preco * 100) / 100
  emit('salvar', { ...form })
  fechar()
}

watch(
  () => props.produto,
  (val) => {
    novaCategoria.value     = false
    nomeNovaCategoria.value = ''
    if (val) {
      Object.assign(form, val)
      form.envioCozinha = val.envioCozinha ?? 'categoria'
      precoTexto.value = numeroBR(val.preco)
    } else {
      precoTexto.value = ''
      Object.assign(form, {
        id: null,
        nome: '',
        preco: 0,
        categoriaId: null,
        ativo: true,
        estoqueAtual: 0,
        estoqueMinimo: 5,
        gerenciarEstoque: true,
        envioCozinha: 'categoria',
        imagemUrl: null
      })
    }
  },
  { immediate: true }
)

onMounted(carregarCategorias)
</script>
