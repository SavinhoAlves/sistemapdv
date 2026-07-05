<template>
  <div class="min-h-screen bg-neutral-100 dark:bg-neutral-950 transition-colors duration-200 com-sidebar">
    <Sidebar />
    <Navbar />

    <main class="p-6 max-w-5xl mx-auto">

      <!-- HEADER -->
      <div class="mb-6">
        <h1 class="text-2xl font-black text-neutral-900 dark:text-white">Administração</h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">Gerencie funcionários, categorias e métodos de pagamento</p>
      </div>

      <!-- ABAS -->
      <div class="flex gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1 w-fit mb-6">
        <button v-for="tab in tabs" :key="tab.id" @click="abaAtiva = tab.id"
          class="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-black transition-all"
          :class="abaAtiva === tab.id ? 'bg-orange-500 text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'">
          <component :is="tab.icon" :size="12" /> {{ tab.label }}
        </button>
      </div>

      <!-- ══ FUNCIONÁRIOS ══════════════════════════════════════ -->
      <div v-if="abaAtiva === 'funcionarios'">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ funcionarios.length }} funcionário(s)</p>
          <button @click="abrirModalFunc(null)"
            class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5">
            <Plus :size="13" /> Novo Funcionário
          </button>
        </div>

        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
          <div v-if="loadingFunc" class="p-8 text-center text-sm text-neutral-400">Carregando...</div>
          <div v-else-if="!funcionarios.length" class="p-8 text-center text-sm text-neutral-400">Nenhum funcionário cadastrado</div>
          <table v-else class="w-full text-sm">
            <thead class="bg-neutral-50 dark:bg-neutral-800/50">
              <tr>
                <th class="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Nome</th>
                <th class="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Cargo</th>
                <th class="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">E-mail</th>
                <th class="px-5 py-3 text-center text-[10px] font-black uppercase tracking-widest text-neutral-400">Status</th>
                <th class="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in funcionarios" :key="f.id"
                class="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                <td class="px-5 py-3">
                  <p class="text-xs font-black text-neutral-800 dark:text-neutral-200">{{ f.nome }}</p>
                  <p v-if="f.cartao_rfid" class="text-[10px] text-neutral-400 font-mono">RFID: {{ f.cartao_rfid }}</p>
                </td>
                <td class="px-5 py-3">
                  <span class="text-[10px] font-black px-2 py-0.5 rounded-full capitalize" :class="corCargo(f.cargo)">{{ f.cargo }}</span>
                </td>
                <td class="px-5 py-3 text-xs text-neutral-500">{{ f.email || '—' }}</td>
                <td class="px-5 py-3 text-center">
                  <button @click="toggleAtivo(f)"
                    class="text-[10px] font-black px-2 py-0.5 rounded-full transition-all"
                    :class="f.ativo ? 'bg-green-100 dark:bg-green-950/40 text-green-600 hover:bg-green-200' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:bg-neutral-200'">
                    {{ f.ativo ? 'Ativo' : 'Inativo' }}
                  </button>
                </td>
                <td class="px-5 py-3 text-right">
                  <button @click="abrirModalFunc(f)"
                    class="h-7 px-3 rounded-lg text-[11px] font-black text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all">
                    Editar
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ══ CATEGORIAS ════════════════════════════════════════ -->
      <div v-else-if="abaAtiva === 'categorias'">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ categorias.length }} categoria(s)</p>
          <button @click="abrirModalCat(null)"
            class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5">
            <Plus :size="13" /> Nova Categoria
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="cat in categorias" :key="cat.id"
            class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                <Tag :size="14" class="text-orange-500" />
              </div>
              <p class="text-sm font-black text-neutral-800 dark:text-neutral-200">{{ cat.nome }}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button @click="alternarCozinha(cat)"
                :title="cat.vai_cozinha ? 'Itens vão para a cozinha — clique para desativar' : 'Itens NÃO vão para a cozinha — clique para ativar'"
                class="h-7 px-2 rounded-lg flex items-center gap-1 justify-center text-[10px] font-black transition-all"
                :class="cat.vai_cozinha
                  ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 hover:bg-orange-200'
                  : 'text-neutral-300 dark:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-500'">
                <ChefHat :size="12" />
              </button>
              <button @click="abrirModalCat(cat)"
                class="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all">
                <Pencil :size="12" />
              </button>
              <button @click="excluirCategoria(cat)"
                class="h-7 w-7 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 transition-all">
                <Trash2 :size="12" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ MÉTODOS ════════════════════════════════════════════ -->
      <div v-else-if="abaAtiva === 'metodos'">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ metodos.length }} método(s)</p>
          <button @click="modalMetodoAberto = true"
            class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5">
            <Plus :size="13" /> Novo Método
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="m in metodos" :key="m.id"
            class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                :class="m.ativo ? 'bg-green-100 dark:bg-green-950/40' : 'bg-neutral-100 dark:bg-neutral-800'">
                <CreditCard :size="14" :class="m.ativo ? 'text-green-500' : 'text-neutral-400'" />
              </div>
              <div>
                <p class="text-sm font-black text-neutral-800 dark:text-neutral-200">{{ m.nome }}</p>
                <p class="text-[10px]" :class="m.ativo ? 'text-green-500' : 'text-neutral-400'">
                  {{ m.ativo ? 'Ativo' : 'Inativo' }}
                </p>
              </div>
            </div>
            <button @click="toggleMetodo(m)"
              class="h-8 px-3 rounded-xl text-xs font-black border transition-all"
              :class="m.ativo
                ? 'border-red-200 dark:border-red-900 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                : 'border-green-200 dark:border-green-900 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/40'">
              {{ m.ativo ? 'Desativar' : 'Ativar' }}
            </button>
          </div>
        </div>
      </div>

    </main>

    <!-- MODAL FUNCIONÁRIO -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalFunc" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="modalFunc = false">
          <div class="bg-white dark:bg-neutral-900 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 class="text-lg font-black text-neutral-900 dark:text-white mb-5">
              {{ funcForm.id ? 'Editar Funcionário' : 'Novo Funcionário' }}
            </h2>

            <div class="space-y-3">
              <div>
                <label for="fNome" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Nome *</label>
                <input id="fNome" v-model="funcForm.nome" type="text" placeholder="Nome completo"
                  class="w-full h-11 px-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all" />
              </div>
              <div>
                <label for="fCargo" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Cargo *</label>
                <select id="fCargo" v-model="funcForm.cargo"
                  class="w-full h-11 px-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all appearance-none">
                  <option value="">Selecione...</option>
                  <option value="administrador">Administrador</option>
                  <option value="garcom">Garçom</option>
                  <option value="caixa">Caixa</option>
                  <option value="cozinha">Cozinha</option>
                </select>
              </div>
              <div>
                <label for="fEmail" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">E-mail</label>
                <input id="fEmail" v-model="funcForm.email" type="email" placeholder="email@exemplo.com"
                  class="w-full h-11 px-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all" />
              </div>
              <div>
                <label for="fSenha" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
                  {{ funcForm.id ? 'Nova Senha (deixe vazio para manter)' : 'Senha' }}
                </label>
                <input id="fSenha" v-model="funcForm.senha" type="password" placeholder="••••••••"
                  class="w-full h-11 px-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all" />
              </div>
              <div>
                <label for="fRfid" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">Cartão RFID</label>
                <input id="fRfid" v-model="funcForm.cartao_rfid" type="text" placeholder="Código do cartão"
                  class="w-full h-11 px-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white text-sm font-mono outline-none focus:border-orange-500 transition-all" />
              </div>
            </div>

            <div v-if="erroFunc" class="mt-3 text-xs text-red-400 font-bold">{{ erroFunc }}</div>

            <div class="flex gap-3 mt-6">
              <button @click="modalFunc = false"
                class="flex-1 h-11 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-sm font-black transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800">
                Cancelar
              </button>
              <button @click="salvarFunc" :disabled="salvandoFunc"
                class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 active:scale-95 text-white text-sm font-black transition-all">
                {{ salvandoFunc ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL CATEGORIA -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalCat" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="modalCat = false">
          <div class="bg-white dark:bg-neutral-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 class="text-lg font-black text-neutral-900 dark:text-white mb-5">{{ catForm.id ? 'Editar' : 'Nova' }} Categoria</h2>
            <label for="cNome" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Nome *</label>
            <input id="cNome" v-model="catForm.nome" type="text" placeholder="Ex: Bebidas"
              class="w-full h-11 px-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all mb-5" />
            <div v-if="erroCat" class="mb-3 text-xs text-red-400 font-bold">{{ erroCat }}</div>
            <div class="flex gap-3">
              <button @click="modalCat = false"
                class="flex-1 h-11 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-sm font-black hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">
                Cancelar
              </button>
              <button @click="salvarCategoria" :disabled="salvandoCat"
                class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 active:scale-95 text-white text-sm font-black transition-all">
                {{ salvandoCat ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL MÉTODO -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalMetodoAberto" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="modalMetodoAberto = false">
          <div class="bg-white dark:bg-neutral-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 class="text-lg font-black text-neutral-900 dark:text-white mb-5">Novo Método de Pagamento</h2>
            <label for="mNome" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Nome *</label>
            <input id="mNome" v-model="novoMetodo" type="text" placeholder="Ex: Pix"
              class="w-full h-11 px-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all mb-5" />
            <div class="flex gap-3">
              <button @click="modalMetodoAberto = false"
                class="flex-1 h-11 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-sm font-black hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">
                Cancelar
              </button>
              <button @click="criarMetodo" :disabled="!novoMetodo.trim()"
                class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 active:scale-95 text-white text-sm font-black transition-all">
                Criar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Users, Tag, CreditCard, Plus, Pencil, Trash2, ChefHat } from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'

definePageMeta({ layout: false })

const api        = useApi()
const toastStore = useToastStore()

const tabs = [
  { id: 'funcionarios', label: 'Funcionários', icon: Users },
  { id: 'categorias',   label: 'Categorias',   icon: Tag },
  { id: 'metodos',      label: 'Métodos',       icon: CreditCard }
]
const abaAtiva = ref('funcionarios')

// ── Funcionários ─────────────────────────────
const funcionarios = ref<any[]>([])
const loadingFunc  = ref(false)
const modalFunc    = ref(false)
const salvandoFunc = ref(false)
const erroFunc     = ref('')
const funcForm     = reactive({ id: null as number | null, nome: '', cargo: '', email: '', senha: '', cartao_rfid: '' })

function corCargo(cargo: string) {
  if (cargo === 'administrador') return 'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400'
  if (cargo === 'garcom')        return 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
  if (cargo === 'caixa')         return 'bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400'
  if (cargo === 'cozinha')       return 'bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400'
  return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
}

async function carregarFuncionarios() {
  loadingFunc.value = true
  try { funcionarios.value = await api.get<any[]>('/users') } finally { loadingFunc.value = false }
}

function abrirModalFunc(f: any) {
  erroFunc.value = ''
  if (f) {
    Object.assign(funcForm, { id: f.id, nome: f.nome, cargo: f.cargo, email: f.email || '', senha: '', cartao_rfid: f.cartao_rfid || '' })
  } else {
    Object.assign(funcForm, { id: null, nome: '', cargo: '', email: '', senha: '', cartao_rfid: '' })
  }
  modalFunc.value = true
}

async function salvarFunc() {
  if (!funcForm.nome.trim() || !funcForm.cargo) { erroFunc.value = 'Nome e cargo são obrigatórios'; return }
  salvandoFunc.value = true; erroFunc.value = ''
  try {
    const payload = { nome: funcForm.nome, email: funcForm.email || null, cargo: funcForm.cargo,
      cartao_rfid: funcForm.cartao_rfid || null, ...(funcForm.senha ? { senha: funcForm.senha } : {}) }
    if (funcForm.id) await api.put(`/users/${funcForm.id}`, payload)
    else await api.post('/users', payload)
    toastStore.success(funcForm.id ? 'Funcionário atualizado!' : 'Funcionário criado!')
    modalFunc.value = false
    await carregarFuncionarios()
  } catch (e: any) { erroFunc.value = e?.message || 'Erro ao salvar' } finally { salvandoFunc.value = false }
}

async function toggleAtivo(f: any) {
  f.ativo = !f.ativo
  try { await api.patch(`/users/${f.id}/ativo`, { ativo: f.ativo }) }
  catch { f.ativo = !f.ativo; toastStore.error('Erro ao alterar status') }
}

// ── Categorias ────────────────────────────────
const categorias   = ref<any[]>([])
const modalCat     = ref(false)
const salvandoCat  = ref(false)
const erroCat      = ref('')
const catForm      = reactive({ id: null as number | null, nome: '' })

async function carregarCategorias() {
  try { categorias.value = await api.get<any[]>('/categorias') } catch {}
}

async function alternarCozinha(cat: any) {
  try {
    const res = await api.patch<{ vai_cozinha: number }>(`/categorias/${cat.id}/cozinha`, {
      vai_cozinha: !cat.vai_cozinha
    })
    cat.vai_cozinha = res.vai_cozinha
    toastStore.success(cat.vai_cozinha
      ? `Itens de "${cat.nome}" agora aparecem na cozinha`
      : `Itens de "${cat.nome}" não vão mais para a cozinha`)
  } catch (e: any) {
    toastStore.error(e?.message || 'Erro ao atualizar categoria')
  }
}

function abrirModalCat(c: any) {
  erroCat.value = ''
  catForm.id   = c?.id ?? null
  catForm.nome = c?.nome ?? ''
  modalCat.value = true
}

async function salvarCategoria() {
  if (!catForm.nome.trim()) { erroCat.value = 'Nome é obrigatório'; return }
  salvandoCat.value = true; erroCat.value = ''
  try {
    if (catForm.id) await api.put(`/categorias/${catForm.id}`, { nome: catForm.nome })
    else await api.post('/categorias', { nome: catForm.nome })
    toastStore.success(catForm.id ? 'Categoria atualizada!' : 'Categoria criada!')
    modalCat.value = false
    await carregarCategorias()
  } catch (e: any) { erroCat.value = e?.message || 'Erro ao salvar' } finally { salvandoCat.value = false }
}

async function excluirCategoria(c: any) {
  if (!confirm(`Excluir a categoria "${c.nome}"?`)) return
  try {
    await api.delete(`/categorias/${c.id}`)
    toastStore.success('Categoria excluída!')
    await carregarCategorias()
  } catch (e: any) { toastStore.error(e?.message || 'Erro ao excluir') }
}

// ── Métodos ───────────────────────────────────
const metodos            = ref<any[]>([])
const modalMetodoAberto  = ref(false)
const novoMetodo         = ref('')

async function carregarMetodos() {
  try { metodos.value = await api.get<any[]>('/pagamentos/metodos/todos') } catch {}
}

async function toggleMetodo(m: any) {
  m.ativo = !m.ativo
  try { await api.patch(`/pagamentos/metodos/${m.id}`, { ativo: m.ativo }) }
  catch { m.ativo = !m.ativo; toastStore.error('Erro ao alterar') }
}

async function criarMetodo() {
  if (!novoMetodo.value.trim()) return
  try {
    await api.post('/pagamentos/metodos', { nome: novoMetodo.value.trim() })
    toastStore.success('Método criado!')
    novoMetodo.value = ''
    modalMetodoAberto.value = false
    await carregarMetodos()
  } catch (e: any) { toastStore.error(e?.message || 'Erro ao criar') }
}

onMounted(() => {
  carregarFuncionarios()
  carregarCategorias()
  carregarMetodos()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
