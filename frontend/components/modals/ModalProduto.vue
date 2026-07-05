<template>
  <div
    class="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
    @click.self="fechar"
  >

    <div class="bg-white w-full max-w-2xl rounded-3xl overflow-hidden max-h-[90vh] flex flex-col">

      <!-- HEADER -->
      <div class="p-6 border-b flex justify-between items-center">
        <h2 class="text-2xl font-black">
          {{ form.id ? 'Editar Produto' : 'Novo Produto' }}
        </h2>

        <button
          @click="fechar"
          class="w-10 h-10 rounded-xl bg-neutral-100 hover:bg-red-50"
        >
          ✕
        </button>
      </div>

      <!-- BODY -->
      <div class="p-6 overflow-y-auto flex-1 grid grid-cols-2 gap-4">

        <!-- NOME -->
        <div class="col-span-2">
          <label for="prod-nome" class="label">Nome</label>
          <input id="prod-nome" name="prod-nome" v-model="form.nome" class="input" />
        </div>

        <!-- CATEGORIA -->
        <div>
          <label for="prod-categoria" class="label">Categoria</label>

          <div v-if="!novaCategoria" class="flex gap-2 mt-1">
            <select id="prod-categoria" name="prod-categoria" v-model="form.categoria_id" class="input flex-1 mt-0">
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
              class="h-11 px-3 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-700 font-black text-lg"
              title="Nova categoria"
            >
              +
            </button>
          </div>

          <div v-else class="flex gap-2 mt-1">
            <input
              id="prod-nova-categoria"
              name="prod-nova-categoria"
              v-model="nomeNovaCategoria"
              class="input flex-1 mt-0"
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
              class="h-11 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 font-black"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- PREÇO -->
        <div>
          <label for="prod-preco" class="label">Preço</label>
          <input id="prod-preco" name="prod-preco" v-model="form.preco" type="number" class="input" />
        </div>

        <!-- ESTOQUE -->
        <div>
          <label for="prod-estoque-atual" class="label">Estoque atual</label>
          <input id="prod-estoque-atual" name="prod-estoque-atual" v-model="form.estoque_atual" type="number" class="input" />
        </div>

        <div>
          <label for="prod-estoque-minimo" class="label">Estoque mínimo</label>
          <input id="prod-estoque-minimo" name="prod-estoque-minimo" v-model="form.estoque_minimo" type="number" class="input" />
        </div>

        <!-- GERENCIAR ESTOQUE -->
        <div class="col-span-2 flex items-center justify-between bg-neutral-50 p-4 rounded-xl">

          <div>
            <p class="font-bold">Gerenciar estoque</p>
            <p class="text-sm text-neutral-500">
              Se ativado, o sistema bloqueia vendas sem estoque
            </p>
          </div>

          <button
            @click="form.gerenciar_estoque = !form.gerenciar_estoque"
            :class="form.gerenciar_estoque ? 'bg-green-500' : 'bg-gray-400'"
            class="w-14 h-8 rounded-full relative"
          >
            <div
              :class="form.gerenciar_estoque ? 'translate-x-7' : 'translate-x-1'"
              class="w-6 h-6 bg-white rounded-full absolute top-1 transition"
            />
          </button>

        </div>

        <!-- ATIVO -->
        <div class="col-span-2 flex items-center justify-between bg-neutral-50 p-4 rounded-xl">

          <div>
            <p class="font-bold">Produto ativo</p>
            <p class="text-sm text-neutral-500">
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
      <div class="p-6 border-t flex justify-end gap-3">

        <button @click="fechar" class="px-5 py-2 bg-gray-200 rounded-xl font-bold">
          Cancelar
        </button>

        <button @click="salvar" class="px-5 py-2 bg-orange-500 text-white font-black rounded-xl">
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

// Categorias
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

<style scoped>
.input {
  width: 100%;
  height: 44px;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 0 12px;
  margin-top: 4px;
  outline: none;
}

.label {
  font-size: 12px;
  font-weight: 700;
  color: #666;
}
</style>
