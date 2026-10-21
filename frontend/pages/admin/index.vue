<template>
  <div class="min-h-screen transition-colors duration-200 com-sidebar">
    <Sidebar />
    <Navbar />

    <main class="p-6 w-full">

      <!-- HEADER -->
      <div class="flex items-center gap-3 mb-6">
        <div class="size-11 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-md shadow-orange-900/50 flex items-center justify-center shrink-0">
          <ShieldCheck :size="18" class="text-white" />
        </div>
        <div>
          <h1 class="text-2xl font-black text-gray-900 dark:text-white">Administração</h1>
          <p class="text-sm text-gray-500 dark:text-white/50 mt-0.5">Equipe, cargos e permissões, categorias e formas de pagamento</p>
        </div>
      </div>

      <!-- ABAS -->
      <div class="flex flex-wrap gap-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-xl p-1 w-fit mb-6">
        <button v-for="tab in tabs" :key="tab.id" @click="abaAtiva = tab.id"
          class="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-black transition-all"
          :class="abaAtiva === tab.id ? 'bg-orange-500 text-white' : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white'">
          <component :is="tab.icon" :size="12" /> {{ tab.label }}
        </button>
      </div>

      <!-- ══ FUNCIONÁRIOS ══ -->
      <AdminFuncionarios v-if="abaAtiva === 'funcionarios'" :funcionarios="funcionarios" :perfis="perfis" :padroes="padroes" :carregando="loadingFunc"
        @recarregar="recarregarEquipe" @qr="gerarQrMobile" />

      <!-- ══ CATEGORIAS ════════════════════════════════════════ -->
      <div v-else-if="abaAtiva === 'categorias'">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-gray-500 dark:text-white/50">{{ categorias.length }} categoria(s)</p>
          <button @click="abrirModalCat(null)"
            class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5">
            <Plus :size="13" /> Nova Categoria
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="cat in categorias" :key="cat.id"
            class="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="size-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 shadow-sm shadow-orange-900/40 flex items-center justify-center shrink-0">
                <Tag :size="14" class="text-white" />
              </div>
              <p class="text-sm font-black text-gray-900 dark:text-white">{{ cat.nome }}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button @click="alternarCozinha(cat)"
                :title="cat.vaiCozinha ? 'Itens vão para a cozinha — clique para desativar' : 'Itens NÃO vão para a cozinha — clique para ativar'"
                class="h-7 px-2 rounded-lg flex items-center gap-1 justify-center text-[10px] font-black transition-all"
                :class="cat.vaiCozinha
                  ? 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                  : 'text-gray-300 dark:text-white/20 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-400 dark:hover:text-white/40'">
                <ChefHat :size="12" />
              </button>
              <button @click="abrirModalCat(cat)"
                class="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
                <Pencil :size="12" />
              </button>
              <button @click="excluirCategoria(cat)"
                class="h-7 w-7 rounded-lg flex items-center justify-center text-gray-400 dark:text-white/40 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-all">
                <Trash2 :size="12" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══ CARGOS E PERMISSÕES ══ -->
      <AdminCargos v-else-if="abaAtiva === 'cargos'" :funcionarios="funcionarios" :perfis="perfis" :padroes="padroes" @recarregar="recarregarEquipe" />

      <!-- ══ MÉTODOS ════════════════════════════════════════════ -->
      <div v-else-if="abaAtiva === 'metodos'">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm text-gray-500 dark:text-white/50">{{ metodos.length }} método(s)</p>
          <button @click="modalMetodoAberto = true"
            class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all flex items-center gap-1.5">
            <Plus :size="13" /> Novo Método
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="m in metodos" :key="m.id"
            class="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4 flex items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                :class="m.ativo ? 'bg-green-500/15' : 'bg-gray-100 dark:bg-white/[0.06]'">
                <CreditCard :size="14" :class="m.ativo ? 'text-green-400' : 'text-gray-400 dark:text-white/30'" />
              </div>
              <div>
                <p class="text-sm font-black text-gray-900 dark:text-white">{{ m.nome }}</p>
                <p class="text-[10px]" :class="m.ativo ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-white/30'">
                  {{ m.ativo ? 'Ativo' : 'Inativo' }}
                </p>
              </div>
            </div>
            <button @click="toggleMetodo(m)"
              class="h-8 px-3 rounded-xl text-xs font-black border transition-all"
              :class="m.ativo
                ? 'border-red-500/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                : 'border-green-500/30 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10'">
              {{ m.ativo ? 'Desativar' : 'Ativar' }}
            </button>
          </div>
        </div>
      </div>

    </main>

    <!-- MODAL CATEGORIA -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalCat" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="modalCat = false">
          <div class="bg-white dark:bg-neutral-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-3xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh]">

            <!-- header -->
            <div class="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <h2 class="text-lg font-black text-gray-900 dark:text-white">{{ catForm.id ? 'Editar' : 'Nova' }} Categoria</h2>
              <button @click="modalCat = false" class="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-red-950/40 hover:text-red-500 text-gray-500 dark:text-white/60 flex items-center justify-center transition-all shrink-0">
                <X :size="15" />
              </button>
            </div>

            <!-- conteúdo rolável -->
            <div class="flex-1 overflow-y-auto px-6 pb-2">
              <label for="cNome" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">Nome *</label>
              <input id="cNome" v-model="catForm.nome" type="text" placeholder="Ex: Bebidas"
                class="w-full h-11 px-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25" />
              <div v-if="erroCat" class="mt-2 text-xs text-red-500 font-bold">{{ erroCat }}</div>
            </div>

            <!-- footer flutuante -->
            <div class="px-6 py-4 border-t border-gray-100 dark:border-white/[0.07] shrink-0 flex gap-3">
              <button @click="modalCat = false"
                class="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 text-sm font-black hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
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
          <div class="bg-white dark:bg-neutral-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-3xl w-full max-w-sm shadow-2xl flex flex-col max-h-[90vh]">

            <!-- header -->
            <div class="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <h2 class="text-lg font-black text-gray-900 dark:text-white">Novo Método de Pagamento</h2>
              <button @click="modalMetodoAberto = false" class="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-red-950/40 hover:text-red-500 text-gray-500 dark:text-white/60 flex items-center justify-center transition-all shrink-0">
                <X :size="15" />
              </button>
            </div>

            <!-- conteúdo rolável -->
            <div class="flex-1 overflow-y-auto px-6 pb-2">
              <label for="mNome" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">Nome *</label>
              <input id="mNome" v-model="novoMetodo" type="text" placeholder="Ex: Pix"
                class="w-full h-11 px-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white text-sm outline-none focus:border-orange-500 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25" />
            </div>

            <!-- footer flutuante -->
            <div class="px-6 py-4 border-t border-gray-100 dark:border-white/[0.07] shrink-0 flex gap-3">
              <button @click="modalMetodoAberto = false"
                class="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 text-sm font-black hover:bg-gray-50 dark:hover:bg-white/5 transition-all">
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

    <!-- MODAL QR MOBILE -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalQr" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div class="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-white/[0.08] rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-black text-gray-900 dark:text-white">QR Mobile</h3>
              <button @click="modalQr = false" class="w-8 h-8 rounded-xl hover:bg-gray-100 dark:hover:bg-white/[0.06] flex items-center justify-center text-gray-400">
                <X :size="16" />
              </button>
            </div>
            <p class="text-sm text-gray-500 dark:text-white/50 mb-4">{{ qrFuncionario?.nome }}</p>

            <!-- Seletor de IP (só aparece em localhost com múltiplas interfaces) -->
            <div v-if="qrLocalIps.length > 1" class="mb-3 flex flex-wrap gap-1.5 justify-center">
              <button v-for="ip in qrLocalIps" :key="ip" @click="trocarIpQr(ip)"
                class="text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all"
                :class="qrIpSelecionado === ip
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-gray-100 dark:bg-white/[0.06] border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 hover:border-orange-400/50'">
                {{ ip }}
              </button>
            </div>
            <p v-else-if="qrIpSelecionado" class="text-[10px] font-mono text-orange-400 mb-3">{{ qrIpSelecionado }}</p>

            <div v-if="gerandoQr" class="flex items-center justify-center h-40">
              <Loader2 :size="28" class="animate-spin text-orange-500" />
            </div>
            <img v-else-if="qrDataUrl" :src="qrDataUrl" class="mx-auto rounded-2xl border border-gray-200 dark:border-white/10" />

            <!-- URL completa e clicável para teste -->
            <a
              v-if="qrUrl"
              :href="qrUrl"
              target="_blank"
              class="block mt-3 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] text-[10px] font-mono text-orange-500 hover:text-orange-400 break-all transition-colors"
            >
              {{ qrUrl }}
            </a>

            <p class="text-[10px] text-gray-400 dark:text-white/30 mt-3">
              Válido por 10 horas ou até o caixa fechar · Peça ao funcionário para escanear com a câmera
            </p>
            <button @click="gerarQrMobile(qrFuncionario)" :disabled="gerandoQr" class="mt-4 w-full h-10 rounded-2xl border border-orange-500/30 text-orange-500 text-xs font-black hover:bg-orange-500/10 disabled:opacity-50 transition-all">
              Regenerar QR
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Users, Tag, CreditCard, Plus, Pencil, Trash2, ChefHat, ShieldCheck, X, Loader2 } from 'lucide-vue-next'
import AdminFuncionarios from '~/components/admin/AdminFuncionarios.vue'
import AdminCargos from '~/components/admin/AdminCargos.vue'
import QRCode from 'qrcode'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'

definePageMeta({ layout: false })

const api        = useApi()
const toastStore = useToastStore()

const tabs = [
  { id: 'funcionarios', label: 'Funcionários', icon: Users },
  { id: 'cargos',       label: 'Cargos e permissões', icon: ShieldCheck },
  { id: 'categorias',   label: 'Categorias',   icon: Tag },
  { id: 'metodos',      label: 'Métodos',       icon: CreditCard }
]
const abaAtiva = ref('funcionarios')

// ── Equipe: funcionários, perfis e o padrão de cada função ──
const funcionarios = ref<any[]>([])
const perfis       = ref<any[]>([])
const padroes      = ref<Record<string, Record<string, boolean>>>({})
const loadingFunc  = ref(false)

async function recarregarEquipe() {
  loadingFunc.value = true
  try {
    const [f, p] = await Promise.all([api.get<any[]>('/usuarios'), api.perfis.listar<any>()])
    funcionarios.value = f
    perfis.value = p
  } catch (e: any) {
    toastStore.error(e?.message || 'Erro ao carregar a equipe')
  } finally {
    loadingFunc.value = false
  }
}

// ── Categorias ────────────────────────────────
const categorias   = ref<any[]>([])
const modalCat     = ref(false)
const salvandoCat  = ref(false)
const erroCat      = ref('')
const catForm      = reactive({ id: null as string | null, nome: '' })

async function carregarCategorias() {
  try { categorias.value = await api.get<any[]>('/categorias') } catch {}
}

async function alternarCozinha(cat: any) {
  const novoValor = !cat.vaiCozinha
  try {
    await api.patch(`/categorias/${cat.id}/cozinha`, { vaiCozinha: novoValor })
    cat.vaiCozinha = novoValor
    toastStore.success(novoValor
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

// ── QR Mobile ─────────────────────────────────
const modalQr       = ref(false)
const qrFuncionario = ref<any>(null)
const qrToken       = ref('')
const qrExpiresAt   = ref('')
const qrDataUrl     = ref('')
const qrUrl         = ref('')
const gerandoQr     = ref(false)
const qrLocalIps    = ref<string[]>([])
const qrIpSelecionado = ref('')

async function gerarQrDataUrl(token: string, ip: string) {
  const port = window.location.port ? `:${window.location.port}` : ''
  // baseURL: o sistema vive em /app (nuxt.config)
  const url  = `${window.location.protocol}//${ip}${port}${useRuntimeConfig().app.baseURL}m?t=${token}`
  qrUrl.value = url
  return QRCode.toDataURL(url, { width: 240, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
}

async function trocarIpQr(ip: string) {
  qrIpSelecionado.value = ip
  if (qrToken.value) qrDataUrl.value = await gerarQrDataUrl(qrToken.value, ip)
}

async function gerarQrMobile(f: any) {
  qrFuncionario.value   = f
  qrToken.value         = ''
  qrDataUrl.value       = ''
  qrUrl.value           = ''
  qrLocalIps.value      = []
  qrIpSelecionado.value = ''
  gerandoQr.value       = true
  modalQr.value         = true
  try {
    const res = await api.post<any>(`/usuarios/${f.id}/mobile-token`)
    qrToken.value     = res.token
    qrExpiresAt.value = res.expiresAt

    const hostname = window.location.hostname
    const isLocal  = hostname === 'localhost' || hostname === '127.0.0.1'

    if (isLocal && res.localIps?.length) {
      qrLocalIps.value      = res.localIps
      qrIpSelecionado.value = res.localIps[0]
    } else {
      qrIpSelecionado.value = hostname
    }

    qrDataUrl.value = await gerarQrDataUrl(res.token, qrIpSelecionado.value)
  } catch (e: any) {
    toastStore.error(e?.message || 'Erro ao gerar QR')
    modalQr.value = false
  } finally {
    gerandoQr.value = false
  }
}

onMounted(async () => {
  recarregarEquipe()
  carregarCategorias()
  try { padroes.value = await api.get('/perfis/funcoes') } catch {}
  carregarMetodos()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
