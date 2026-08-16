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

        <!-- NOME -->
        <div class="col-span-2">
          <label for="prod-nome" class="text-xs font-bold text-gray-500 dark:text-white/40 block mb-1">Nome</label>
          <input id="prod-nome" name="prod-nome" v-model="form.nome"
            class="w-full h-11 border border-gray-200 dark:border-white/10 rounded-xl px-3 mt-0 outline-none bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:border-orange-500/70 transition-colors" />
        </div>

        <!-- CATEGORIA -->
        <div>
          <label for="prod-categoria" class="text-xs font-bold text-gray-500 dark:text-white/40 block mb-1">Categoria</label>

          <div v-if="!novaCategoria" class="flex gap-2">
            <select id="prod-categoria" name="prod-categoria" v-model="form.categoria_id"
              class="flex-1 h-11 border border-gray-200 dark:border-white/10 rounded-xl px-3 outline-none !bg-gray-50 dark:!bg-white/[0.06] text-gray-900 dark:text-white focus:border-orange-500/70 transition-colors">
              <option :value="null">Sem categoria</option>
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

        <!-- PREÇO -->
        <div>
          <label for="prod-preco" class="text-xs font-bold text-gray-500 dark:text-white/40 block mb-1">Preço</label>
          <input id="prod-preco" name="prod-preco" v-model="form.preco" type="number" min="0" step="0.01"
            class="w-full h-11 border border-gray-200 dark:border-white/10 rounded-xl px-3 mt-0 outline-none bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:border-orange-500/70 transition-colors" />
        </div>

        <!-- ESTOQUE -->
        <div>
          <label for="prod-estoque-atual" class="text-xs font-bold text-gray-500 dark:text-white/40 block mb-1">Estoque atual</label>
          <input id="prod-estoque-atual" name="prod-estoque-atual" v-model="form.estoque_atual" type="number" min="0" step="1"
            class="w-full h-11 border border-gray-200 dark:border-white/10 rounded-xl px-3 mt-0 outline-none bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:border-orange-500/70 transition-colors" />
          <p v-if="form.id" class="text-[11px] text-gray-400 dark:text-white/40 mt-1">
            Alterações aqui entram no histórico como ajuste
          </p>
        </div>

        <div>
          <label for="prod-estoque-minimo" class="text-xs font-bold text-gray-500 dark:text-white/40 block mb-1">Estoque mínimo</label>
          <input id="prod-estoque-minimo" name="prod-estoque-minimo" v-model="form.estoque_minimo" type="number" min="0" step="1"
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
            @click="form.gerenciar_estoque = !form.gerenciar_estoque"
            :class="form.gerenciar_estoque ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-400'"
            class="w-14 h-8 rounded-full relative transition-colors"
          >
            <div
              :class="form.gerenciar_estoque ? 'translate-x-7' : 'translate-x-1'"
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
import { reactive, ref, watch, onMounted } from 'vue'
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
  categoria_id: null,
  ativo: true,
  estoque_atual: 0,
  estoque_minimo: 5,
  gerenciar_estoque: true
})

const categorias        = ref([])
const novaCategoria     = ref(false)
const nomeNovaCategoria = ref('')
const criandoCategoria  = ref(false)

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
    form.categoria_id = nova.id
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

function salvar() {
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
    } else {
      Object.assign(form, {
        id: null,
        nome: '',
        preco: 0,
        categoria_id: null,
        ativo: true,
        estoque_atual: 0,
        estoque_minimo: 5,
        gerenciar_estoque: true
      })
    }
  },
  { immediate: true }
)

onMounted(carregarCategorias)
</script>
