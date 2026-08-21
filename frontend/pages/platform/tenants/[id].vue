<template>
  <div class="min-h-screen bg-neutral-950">

    <!-- ══ TOPBAR ══ -->
    <header class="sticky top-0 z-30 border-b border-white/[0.06] bg-neutral-950/80 backdrop-blur-xl">
      <div class="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <NuxtLink to="/platform"
            class="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
            <ArrowLeft :size="14" />
          </NuxtLink>
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-md shadow-violet-500/30 shrink-0">
              <Globe :size="14" class="text-white" />
            </div>
            <div>
              <p class="text-white font-black text-sm leading-none tracking-tight">Plataforma Central</p>
              <p class="text-white/30 text-[10px] font-bold uppercase tracking-widest">PDV · Super Admin</p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-2 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-1.5">
            <div class="w-5 h-5 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Shield :size="10" class="text-violet-400" />
            </div>
            <span class="text-white/70 text-xs font-bold">{{ platformAuth.user?.nome }}</span>
          </div>
          <button @click="handleLogout"
            class="h-8 px-3 rounded-xl text-xs font-black text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all flex items-center gap-1.5">
            <LogOut :size="13" /><span class="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>

    <!-- ══ LOADING ══ -->
    <div v-if="loading" class="flex items-center justify-center py-32">
      <Loader2 :size="32" class="animate-spin text-violet-500" />
    </div>

    <!-- ══ ERRO ══ -->
    <div v-else-if="erro" class="max-w-5xl mx-auto px-6 py-20 text-center">
      <div class="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
        <AlertCircle :size="28" class="text-red-400" />
      </div>
      <p class="text-white font-black text-lg mb-2">{{ erro }}</p>
      <NuxtLink to="/platform" class="text-violet-400 text-sm font-bold hover:text-violet-300 transition-colors inline-flex items-center gap-1.5">
        <ArrowLeft :size="14" /> Voltar para a lista
      </NuxtLink>
    </div>

    <!-- ══ CONTEÚDO ══ -->
    <main v-else-if="tenant" class="max-w-5xl mx-auto px-6 py-8 space-y-6">

      <!-- ── CABEÇALHO DO TENANT ── -->
      <div class="bg-white/[0.03] border border-white/[0.07] rounded-3xl p-6">
        <div class="flex flex-col sm:flex-row sm:items-start gap-5">
          <div class="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
            <Building2 :size="28" class="text-violet-400" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <h1 class="text-2xl font-black text-white tracking-tight">{{ tenant.nome }}</h1>
              <span class="text-xs font-black px-2.5 py-1 rounded-full" :class="statusBadge(tenant.status)">
                {{ tenant.status }}
              </span>
            </div>
            <p class="text-white/30 text-sm font-mono mb-3">{{ tenant.slug }}</p>
            <div class="flex flex-wrap items-center gap-2">
              <span v-if="licencaAtual"
                class="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full"
                :class="licencaBadge(licencaAtual.status)">
                <KeyRound :size="11" /> {{ licencaLabel }}
              </span>
              <span v-if="contratoAtual"
                class="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileText :size="11" /> {{ contratoAtual.plano }}
              </span>
              <span v-if="tenant.rfid_disponivel"
                class="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <CreditCard :size="11" /> RFID
              </span>
              <span v-if="tenant.venda_mobile_permitida"
                class="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Smartphone :size="11" /> Mobile
              </span>
            </div>
          </div>

          <!-- Ações do cabeçalho -->
          <div class="flex flex-wrap gap-2 shrink-0">
            <button @click="abrirModalDados"
              class="h-9 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.09] border border-white/[0.09] text-white text-xs font-black transition-all flex items-center gap-2">
              <Pencil :size="13" /> Editar dados
            </button>
            <button @click="toggleStatus"
              class="h-9 px-4 rounded-xl border text-xs font-black transition-all flex items-center gap-2"
              :class="tenant.status === 'ativo'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'">
              <ToggleRight v-if="tenant.status === 'ativo'" :size="13" />
              <ToggleLeft  v-else :size="13" />
              {{ tenant.status === 'ativo' ? 'Suspender' : 'Reativar' }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── GRID DE SEÇÕES ── -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- DADOS CADASTRAIS -->
        <section class="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <Building2 :size="13" class="text-white/50" />
              </div>
              <h2 class="text-sm font-black text-white uppercase tracking-wide">Dados cadastrais</h2>
            </div>
            <button @click="abrirModalDados" class="text-[11px] text-white/30 hover:text-violet-400 transition-colors font-bold flex items-center gap-1">
              <Pencil :size="11" /> Editar
            </button>
          </div>
          <dl class="space-y-3">
            <div v-for="campo in dadosCadastrais" :key="campo.label" class="flex gap-2">
              <dt class="text-[11px] text-white/30 font-bold w-28 shrink-0 pt-0.5">{{ campo.label }}</dt>
              <dd class="text-sm text-white/80 font-medium break-all" :class="campo.mono ? 'font-mono text-xs' : ''">
                {{ campo.valor || '—' }}
              </dd>
            </div>
          </dl>
        </section>

        <!-- LICENÇA -->
        <section class="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <KeyRound :size="13" class="text-sky-400" />
              </div>
              <h2 class="text-sm font-black text-white uppercase tracking-wide">Licença</h2>
            </div>
            <button v-if="licencaAtual" @click="abrirModalLicenca" class="text-[11px] text-white/30 hover:text-violet-400 transition-colors font-bold flex items-center gap-1">
              <Pencil :size="11" /> Editar
            </button>
          </div>

          <div v-if="!licencaAtual" class="text-center py-6 text-white/25 text-sm">
            Nenhuma licença registrada
          </div>
          <div v-else class="space-y-4">
            <!-- Status badge grande -->
            <div class="flex items-center gap-3 p-3 rounded-xl" :class="licencaBgBlock">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="licencaIconBlock">
                <KeyRound :size="15" :class="licencaIconColor" />
              </div>
              <div>
                <p class="text-sm font-black capitalize" :class="licencaIconColor">{{ licencaStatusLabel }}</p>
                <p class="text-[11px] text-white/40">{{ licencaLabel }}</p>
              </div>
            </div>
            <dl class="space-y-3">
              <div class="flex gap-2">
                <dt class="text-[11px] text-white/30 font-bold w-28 shrink-0 pt-0.5">Ativação</dt>
                <dd class="text-sm text-white/80">{{ formatDate(licencaAtual.data_ativacao) }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-[11px] text-white/30 font-bold w-28 shrink-0 pt-0.5">Vencimento</dt>
                <dd class="text-sm" :class="diasRestantes !== null && diasRestantes <= 7 ? 'text-amber-400 font-bold' : 'text-white/80'">
                  {{ formatDate(licencaAtual.data_vencimento) }}
                  <span v-if="diasRestantes !== null" class="text-[11px] ml-1">
                    ({{ diasRestantes < 0 ? 'expirada' : `${diasRestantes}d restantes` }})
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <!-- CONTRATO -->
        <section class="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <FileText :size="13" class="text-indigo-400" />
              </div>
              <h2 class="text-sm font-black text-white uppercase tracking-wide">Contrato</h2>
            </div>
            <button @click="gerarContratoPDF"
              class="text-[11px] text-white/30 hover:text-emerald-400 transition-colors font-bold flex items-center gap-1">
              <FileDown :size="11" /> Gerar PDF
            </button>
          </div>

          <div v-if="!contratoAtual" class="text-center py-6 text-white/25 text-sm">
            Nenhum contrato registrado
          </div>
          <div v-else class="space-y-3">
            <dl class="space-y-3">
              <div class="flex gap-2">
                <dt class="text-[11px] text-white/30 font-bold w-28 shrink-0 pt-0.5">Plano</dt>
                <dd class="text-sm text-white/80 font-bold">{{ contratoAtual.plano }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-[11px] text-white/30 font-bold w-28 shrink-0 pt-0.5">Valor</dt>
                <dd class="text-sm text-white/80">{{ contratoAtual.valor ? formatCurrency(contratoAtual.valor) : '—' }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-[11px] text-white/30 font-bold w-28 shrink-0 pt-0.5">Ciclo</dt>
                <dd class="text-sm text-white/80 capitalize">{{ contratoAtual.ciclo }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-[11px] text-white/30 font-bold w-28 shrink-0 pt-0.5">Status</dt>
                <dd>
                  <span class="text-xs font-black px-2 py-0.5 rounded-full" :class="contratoStatusBadge(contratoAtual.status)">
                    {{ contratoAtual.status }}
                  </span>
                </dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-[11px] text-white/30 font-bold w-28 shrink-0 pt-0.5">Início</dt>
                <dd class="text-sm text-white/80">{{ formatDate(contratoAtual.data_inicio) }}</dd>
              </div>
              <div class="flex gap-2">
                <dt class="text-[11px] text-white/30 font-bold w-28 shrink-0 pt-0.5">Fim</dt>
                <dd class="text-sm text-white/80">{{ formatDate(contratoAtual.data_fim) }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <!-- FEATURES -->
        <section class="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5">
          <div class="flex items-center gap-2 mb-4">
            <div class="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Zap :size="13" class="text-violet-400" />
            </div>
            <h2 class="text-sm font-black text-white uppercase tracking-wide">Features</h2>
          </div>

          <div class="space-y-3">
            <!-- RFID -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="tenant.rfid_disponivel ? 'bg-violet-500/15' : 'bg-white/[0.05]'">
                  <CreditCard :size="15" :class="tenant.rfid_disponivel ? 'text-violet-400' : 'text-white/25'" />
                </div>
                <div>
                  <p class="text-sm font-bold text-white">RFID</p>
                  <p class="text-[11px] text-white/30">Autenticação por cartão</p>
                </div>
              </div>
              <button @click="toggleRfid" :disabled="togglingRfid"
                class="w-11 h-6 rounded-full transition-all relative shrink-0" :class="tenant.rfid_disponivel ? 'bg-violet-500' : 'bg-white/10'">
                <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" :class="tenant.rfid_disponivel ? 'left-5' : 'left-0.5'" />
                <Loader2 v-if="togglingRfid" :size="10" class="animate-spin absolute inset-0 m-auto text-white/60" />
              </button>
            </div>

            <!-- Venda Mobile -->
            <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center" :class="tenant.venda_mobile_permitida ? 'bg-sky-500/15' : 'bg-white/[0.05]'">
                  <Smartphone :size="15" :class="tenant.venda_mobile_permitida ? 'text-sky-400' : 'text-white/25'" />
                </div>
                <div>
                  <p class="text-sm font-bold text-white">Venda Mobile</p>
                  <p class="text-[11px] text-white/30">Acesso via QR Code</p>
                </div>
              </div>
              <span class="text-[11px] font-black px-2.5 py-1 rounded-full" :class="tenant.venda_mobile_permitida ? 'bg-sky-500/10 text-sky-400' : 'bg-white/[0.06] text-white/25'">
                {{ tenant.venda_mobile_permitida ? 'Ativo' : 'Inativo' }}
              </span>
            </div>

            <!-- Metadados -->
            <div class="mt-4 pt-4 border-t border-white/[0.05] text-[11px] text-white/25 space-y-1">
              <div class="flex justify-between">
                <span>Cadastrado em</span>
                <span class="font-mono">{{ formatDate(tenant.created_at) }}</span>
              </div>
              <div class="flex justify-between">
                <span>ID</span>
                <span class="font-mono text-[10px]">{{ tenant.id }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- ══ MODAL EDITAR ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalAberto" class="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 pt-16 overflow-y-auto"
          @click.self="fecharModal">
          <div class="bg-neutral-900 border border-white/[0.09] rounded-3xl w-full max-w-2xl shadow-2xl">
            <div class="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" :class="modalModo === 'licenca' ? 'bg-sky-500/10' : 'bg-violet-500/10'">
                  <component :is="modalModo === 'licenca' ? KeyRound : Building2" :size="16" :class="modalModo === 'licenca' ? 'text-sky-400' : 'text-violet-400'" />
                </div>
                <h2 class="text-base font-black text-white">{{ modalModo === 'licenca' ? 'Editar Licença' : 'Editar Dados' }}</h2>
              </div>
              <button @click="fecharModal" class="w-8 h-8 rounded-xl bg-white/[0.06] hover:bg-red-500/15 hover:text-red-400 text-white/40 flex items-center justify-center transition-all">
                <X :size="15" />
              </button>
            </div>

            <!-- MODO DADOS -->
            <div v-if="modalModo === 'dados'" class="p-6 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="sm:col-span-2">
                  <label class="label-field">Nome do restaurante *</label>
                  <input v-model="form.nome" type="text" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Slug (URL) *</label>
                  <input v-model="form.slug" type="text" class="input-field font-mono" />
                </div>
                <div>
                  <label class="label-field">CNPJ</label>
                  <input v-model="form.cnpj" type="text" class="input-field font-mono" />
                </div>
                <div>
                  <label class="label-field">Responsável</label>
                  <input v-model="form.responsavel" type="text" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Contato (e-mail)</label>
                  <input v-model="form.contato" type="email" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Telefone</label>
                  <input v-model="form.telefone" type="text" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Endereço</label>
                  <input v-model="form.endereco" type="text" class="input-field" />
                </div>
                <div class="sm:col-span-2">
                  <label class="label-field">Observações</label>
                  <textarea v-model="form.observacoes" rows="2" class="input-field resize-none"></textarea>
                </div>
              </div>
              <div class="border-t border-white/[0.07] pt-4 space-y-3">
                <p class="text-[10px] font-black uppercase tracking-widest text-white/30">Features</p>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-bold text-white">Venda Mobile</p>
                    <p class="text-[11px] text-white/30">Permite acesso via QR Code</p>
                  </div>
                  <button @click="form.vendaMobilePermitida = !form.vendaMobilePermitida"
                    class="w-11 h-6 rounded-full transition-all relative shrink-0" :class="form.vendaMobilePermitida ? 'bg-blue-500' : 'bg-white/10'">
                    <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" :class="form.vendaMobilePermitida ? 'left-5' : 'left-0.5'" />
                  </button>
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-bold text-white">RFID Disponível</p>
                    <p class="text-[11px] text-white/30">Habilita autenticação por cartão</p>
                  </div>
                  <button @click="form.rfidDisponivel = !form.rfidDisponivel"
                    class="w-11 h-6 rounded-full transition-all relative shrink-0" :class="form.rfidDisponivel ? 'bg-violet-500' : 'bg-white/10'">
                    <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" :class="form.rfidDisponivel ? 'left-5' : 'left-0.5'" />
                  </button>
                </div>
              </div>
            </div>

            <!-- MODO LICENÇA -->
            <div v-else-if="modalModo === 'licenca'" class="p-6 space-y-4">
              <div class="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                <p class="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Status</p>
                <div class="flex gap-2">
                  <button v-for="s in licencaStatuses" :key="s.value" @click="licencaForm.status = s.value"
                    class="flex-1 h-10 rounded-xl text-xs font-black border transition-all"
                    :class="licencaForm.status === s.value ? s.activeClass : 'bg-white/[0.03] border-white/[0.07] text-white/40 hover:bg-white/[0.06]'">
                    {{ s.label }}
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="label-field">Data de ativação</label>
                  <input v-model="licencaForm.dataAtivacao" type="date" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Vencimento</label>
                  <input v-model="licencaForm.dataVencimento" type="date" class="input-field" />
                </div>
              </div>
            </div>

            <div v-if="erroModal" class="mx-6 mb-2 text-xs text-red-400 font-bold">{{ erroModal }}</div>

            <div class="flex gap-3 p-6 pt-2 border-t border-white/[0.07] mt-2">
              <button @click="fecharModal"
                class="flex-1 h-11 rounded-2xl border border-white/10 text-white/50 text-sm font-black hover:bg-white/[0.05] transition-all">
                Cancelar
              </button>
              <button @click="salvar" :disabled="salvando"
                class="flex-1 h-11 rounded-2xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 active:scale-95 text-white text-sm font-black transition-all flex items-center justify-center gap-2">
                <Loader2 v-if="salvando" :size="14" class="animate-spin" />
                {{ salvando ? 'Salvando...' : 'Salvar alterações' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg.text"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl"
        :class="toastMsg.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'">
        <CheckCircle2 v-if="toastMsg.type === 'success'" :size="15" />
        <AlertCircle  v-else :size="15" />
        {{ toastMsg.text }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import {
  Globe, Shield, LogOut, ArrowLeft, Building2, CreditCard, Smartphone,
  Loader2, AlertCircle, CheckCircle2, Pencil, X, FileText, KeyRound,
  Zap, ToggleRight, ToggleLeft, FileDown,
} from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'

definePageMeta({ layout: false })

interface Licenca  { id: string; status: string; data_ativacao: string | null; data_vencimento: string | null; created_at: string }
interface Contrato { id: string; plano: string; valor: string | null; ciclo: string; status: string; data_inicio: string | null; data_fim: string | null }
interface Tenant {
  id: string; nome: string; slug: string; cnpj: string | null; contato: string | null
  responsavel: string | null; telefone: string | null; endereco: string | null; observacoes: string | null
  status: string; rfid_disponivel: boolean; venda_mobile_permitida: boolean; created_at: string
  licencas: Licenca[]; contratos: Contrato[]
}

const route        = useRoute()
const platformAuth = usePlatformAuthStore()
const runtimeConfig = useRuntimeConfig()

const tenant     = ref<Tenant | null>(null)
const loading    = ref(false)
const erro       = ref('')
const togglingRfid = ref(false)
const toastMsg   = reactive({ text: '', type: 'success' as 'success' | 'error' })

const modalAberto = ref(false)
const modalModo   = ref<'dados' | 'licenca'>('dados')
const salvando    = ref(false)
const erroModal   = ref('')

const form = reactive({ nome: '', slug: '', cnpj: '', responsavel: '', contato: '', telefone: '', endereco: '', observacoes: '', vendaMobilePermitida: true, rfidDisponivel: false })
const licencaForm = reactive({ status: 'pendente', dataAtivacao: '', dataVencimento: '' })
const licencaStatuses = [
  { value: 'ativado',   label: 'Ativada',   activeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
  { value: 'pendente',  label: 'Pendente',  activeClass: 'bg-amber-500/15  border-amber-500/30  text-amber-400'  },
  { value: 'bloqueado', label: 'Bloqueada', activeClass: 'bg-red-500/15    border-red-500/30    text-red-400'    },
]

const baseUrl       = computed(() => (runtimeConfig.public as any).apiUrl as string)
const licencaAtual  = computed(() => tenant.value?.licencas?.[0] ?? null)
const contratoAtual = computed(() => tenant.value?.contratos?.[0] ?? null)

const diasRestantes = computed(() => {
  if (!licencaAtual.value?.data_vencimento) return null
  return Math.ceil((new Date(licencaAtual.value.data_vencimento).getTime() - Date.now()) / 86400000)
})
const licencaStatusLabel = computed(() => {
  const s = licencaAtual.value?.status
  if (s === 'ativado') return 'Ativa'
  if (s === 'pendente') return 'Pendente'
  return 'Bloqueada'
})
const licencaLabel = computed(() => {
  const lic = licencaAtual.value
  if (!lic) return ''
  if (lic.status === 'ativado' && lic.data_vencimento) {
    const d = diasRestantes.value!
    if (d < 0)  return 'Licença expirada'
    if (d <= 7) return `Vence em ${d} dia(s)`
    return `Válida até ${formatDate(lic.data_vencimento)}`
  }
  if (lic.status === 'pendente') return 'Aguardando ativação'
  return 'Licença bloqueada'
})
const licencaBgBlock    = computed(() => licencaAtual.value?.status === 'ativado' ? 'bg-emerald-500/[0.07]' : licencaAtual.value?.status === 'pendente' ? 'bg-amber-500/[0.07]' : 'bg-red-500/[0.07]')
const licencaIconBlock  = computed(() => licencaAtual.value?.status === 'ativado' ? 'bg-emerald-500/15' : licencaAtual.value?.status === 'pendente' ? 'bg-amber-500/15' : 'bg-red-500/15')
const licencaIconColor  = computed(() => licencaAtual.value?.status === 'ativado' ? 'text-emerald-400' : licencaAtual.value?.status === 'pendente' ? 'text-amber-400' : 'text-red-400')

const dadosCadastrais = computed(() => [
  { label: 'CNPJ',        valor: tenant.value?.cnpj,        mono: true  },
  { label: 'Responsável', valor: tenant.value?.responsavel,  mono: false },
  { label: 'E-mail',      valor: tenant.value?.contato,      mono: false },
  { label: 'Telefone',    valor: tenant.value?.telefone,     mono: false },
  { label: 'Endereço',    valor: tenant.value?.endereco,     mono: false },
  { label: 'Observações', valor: tenant.value?.observacoes,  mono: false },
])

function statusBadge(s: string) { return s === 'ativo' ? 'bg-emerald-500/15 text-emerald-400' : s === 'suspenso' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400' }
function licencaBadge(s: string) { return s === 'ativado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : s === 'pendente' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20' }
function contratoStatusBadge(s: string) { return s === 'ativo' ? 'bg-emerald-500/15 text-emerald-400' : s === 'trial' ? 'bg-sky-500/15 text-sky-400' : s === 'suspenso' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400' }
function formatDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function formatCurrency(v: string | number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)) }
function showToast(type: 'success' | 'error', text: string) { toastMsg.type = type; toastMsg.text = text; setTimeout(() => { toastMsg.text = '' }, 3000) }

async function platformFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${baseUrl.value}/api${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${platformAuth.token}`, ...((options.headers as any) || {}) },
  })
  if (resp.status === 401) { platformAuth.logout(); navigateTo('/platform/login'); throw new Error('Sessão expirada') }
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`)
  return data as T
}

async function carregar() {
  loading.value = true; erro.value = ''
  try { tenant.value = await platformFetch<Tenant>(`/platform/tenants/${route.params.id}`) }
  catch (e: any) { erro.value = e?.message || 'Erro ao carregar' }
  finally { loading.value = false }
}

function abrirModalDados() {
  if (!tenant.value) return
  const t = tenant.value
  Object.assign(form, { nome: t.nome, slug: t.slug, cnpj: t.cnpj || '', responsavel: t.responsavel || '', contato: t.contato || '', telefone: t.telefone || '', endereco: t.endereco || '', observacoes: t.observacoes || '', vendaMobilePermitida: t.venda_mobile_permitida, rfidDisponivel: t.rfid_disponivel })
  modalModo.value = 'dados'; erroModal.value = ''; modalAberto.value = true
}

function abrirModalLicenca() {
  const lic = licencaAtual.value
  licencaForm.status        = lic?.status || 'pendente'
  licencaForm.dataAtivacao  = lic?.data_ativacao?.substring(0, 10)  || ''
  licencaForm.dataVencimento = lic?.data_vencimento?.substring(0, 10) || ''
  modalModo.value = 'licenca'; erroModal.value = ''; modalAberto.value = true
}

function fecharModal() { modalAberto.value = false }

async function salvar() {
  erroModal.value = ''
  salvando.value = true
  try {
    if (modalModo.value === 'dados') {
      if (!form.nome.trim()) { erroModal.value = 'Nome é obrigatório'; salvando.value = false; return }
      await platformFetch(`/platform/tenants/${tenant.value!.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: form.nome, slug: form.slug, cnpj: form.cnpj || null, responsavel: form.responsavel || null, contato: form.contato || null, telefone: form.telefone || null, endereco: form.endereco || null, observacoes: form.observacoes || null, vendaMobilePermitida: form.vendaMobilePermitida, rfidDisponivel: form.rfidDisponivel }),
      })
      showToast('success', 'Dados atualizados!')
    } else {
      await platformFetch(`/platform/tenants/${tenant.value!.id}/licenca`, {
        method: 'PUT',
        body: JSON.stringify({ status: licencaForm.status, dataAtivacao: licencaForm.dataAtivacao || null, dataVencimento: licencaForm.dataVencimento || null }),
      })
      showToast('success', 'Licença atualizada!')
    }
    fecharModal(); await carregar()
  } catch (e: any) { erroModal.value = e?.message || 'Erro ao salvar' }
  finally { salvando.value = false }
}

async function toggleRfid() {
  if (!tenant.value || togglingRfid.value) return
  togglingRfid.value = true
  const novo = !tenant.value.rfid_disponivel
  try {
    await platformFetch(`/platform/tenants/${tenant.value.id}/rfid`, { method: 'PATCH', body: JSON.stringify({ disponivel: novo }) })
    tenant.value.rfid_disponivel = novo
    showToast('success', novo ? 'RFID habilitado' : 'RFID desabilitado')
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
  finally { togglingRfid.value = false }
}

async function toggleStatus() {
  if (!tenant.value) return
  const novoStatus = tenant.value.status === 'ativo' ? 'suspenso' : 'ativo'
  if (!confirm(novoStatus === 'suspenso' ? `Suspender "${tenant.value.nome}"?` : `Reativar "${tenant.value.nome}"?`)) return
  try {
    await platformFetch(`/platform/tenants/${tenant.value.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: novoStatus }) })
    tenant.value.status = novoStatus
    showToast('success', novoStatus === 'suspenso' ? 'Tenant suspenso' : 'Tenant reativado')
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
}

async function handleLogout() {
  const rt = localStorage.getItem('platform_refresh_token')
  if (rt) { try { await platformFetch('/platform/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: rt }) }) } catch {} }
  platformAuth.logout(); navigateTo('/platform/login')
}

// ── GERAÇÃO DE CONTRATO PDF ──────────────────────────────────────────────────

const CONTRATADA = {
  razaoSocial:        'SavioAlves Tecnologia LTDA ME',
  nomeFantasia:       'OmniFlow Systems',
  cnpj:               '45.678.901/0001-23',
  inscricaoEstadual:  'Isento',
  endereco:           'Rua das Flores, 256, Sala 04',
  bairro:             'Setor Bueno',
  cidade:             'Goiânia',
  uf:                 'GO',
  cep:                '74.210-050',
  telefone:           '(62) 9 9912-3456',
  email:              'suporte.savioalves@gmail.com',
  site:               'www.omniflow.com.br',
  representante:      'Sávio Ferreira Alves',
  cpfRepresentante:   '123.456.789-00',
  rgRepresentante:    '1.234.567 SSP/GO',
  cargoRepresentante: 'Administrador',
  foroCidade:         'Goiânia',
  foroUF:             'GO',
}

function gerarContratoPDF() {
  if (!tenant.value) return
  const t = tenant.value
  const c = contratoAtual.value

  const fmtD = (d: string | Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '___/___/______'
  const fmtM = (v: string | number | null | undefined) =>
    v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'a definir em aditivo'

  const plano    = c?.plano || 'Básico'
  const valor    = fmtM(c?.valor)
  const ciclo    = c?.ciclo || 'mensal'
  const cicloMap: Record<string, string> = { mensal: 'mensal', trimestral: 'trimestral', semestral: 'semestral', anual: 'anual' }
  const cicloExtMap: Record<string, string> = { mensal: '30 (trinta) dias', trimestral: '3 (três) meses', semestral: '6 (seis) meses', anual: '12 (doze) meses' }
  const inicio   = c?.data_inicio ? new Date(c.data_inicio) : new Date()
  const fim      = c?.data_fim ? new Date(c.data_fim) : null
  const vigencia = fim
    ? `de ${fmtD(inicio)} a ${fmtD(fim)}`
    : `a partir de ${fmtD(inicio)}, por prazo indeterminado`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Contrato — ${t.nome}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Times New Roman", serif; font-size: 12pt; color: #111; background: #fff; line-height: 1.8; }
    .page { max-width: 820px; margin: 0 auto; padding: 48px 64px; }
    .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #111; padding-bottom: 20px; }
    .header h1 { font-size: 14pt; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
    .header .subtitle { font-size: 11pt; color: #444; margin-top: 4px; }
    .header .doc-num { font-size: 9.5pt; color: #777; margin-top: 6px; font-style: italic; }
    .parties { margin-bottom: 28px; border: 1px solid #ccc; border-radius: 4px; overflow: hidden; }
    .parties-title { background: #f0f0f0; border-bottom: 1px solid #ccc; padding: 8px 16px; font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .party { padding: 12px 16px; font-size: 10.5pt; }
    .party + .party { border-top: 1px solid #eee; }
    .party-role { font-weight: bold; font-size: 10pt; text-transform: uppercase; color: #333; display: block; margin-bottom: 4px; letter-spacing: 0.5px; }
    .party-line { margin: 1px 0; }
    .party-line strong { display: inline-block; min-width: 160px; font-size: 10pt; }
    .clause { margin-bottom: 22px; }
    .clause h3 { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.3px; }
    .clause p { margin-bottom: 8px; text-align: justify; font-size: 11pt; }
    .clause ol { padding-left: 28px; margin-top: 4px; }
    .clause ol li { margin-bottom: 5px; text-align: justify; font-size: 11pt; }
    .clause .paragrafo { margin-top: 6px; font-size: 11pt; text-align: justify; }
    .clause .paragrafo::before { content: "Parágrafo único. "; font-weight: bold; }
    ${t.observacoes ? '.notes-box { background: #fffbe6; border-left: 3px solid #e6c000; padding: 12px 16px; margin-bottom: 28px; font-size: 10.5pt; }' : ''}
    .sig-section { margin-top: 56px; padding-top: 20px; border-top: 1px solid #ccc; }
    .sig-city { font-size: 11pt; margin-bottom: 48px; text-align: right; }
    .sig-lines { display: flex; gap: 56px; margin-bottom: 32px; }
    .sig-line { flex: 1; text-align: center; }
    .sig-line .line { border-top: 1px solid #333; margin-bottom: 6px; }
    .sig-name-label { font-size: 10.5pt; font-weight: bold; }
    .sig-role-label { font-size: 9.5pt; color: #555; margin-top: 2px; }
    .witness-lines { margin-top: 8px; }
    .witness-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-bottom: 28px; letter-spacing: 0.3px; }
    .footer { margin-top: 48px; padding-top: 12px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 8.5pt; color: #999; }
    @media print { body { font-size: 11pt; } .page { padding: 0; } @page { margin: 2.5cm 2cm; } }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <h1>Contrato de Prestação de Serviços de Tecnologia</h1>
    <p class="subtitle">Modalidade SaaS — Sistema de Ponto de Venda · Plano <strong>${plano}</strong></p>
    <p class="doc-num">Ref.: ${t.slug.toUpperCase()}-${inicio.getFullYear()}</p>
  </div>

  <div class="parties">
    <div class="parties-title">Partes Contratantes</div>
    <div class="party">
      <span class="party-role">Contratada</span>
      <p class="party-line"><strong>Razão Social:</strong> ${CONTRATADA.razaoSocial}</p>
      <p class="party-line"><strong>Nome Fantasia:</strong> ${CONTRATADA.nomeFantasia}</p>
      <p class="party-line"><strong>CNPJ:</strong> ${CONTRATADA.cnpj} &nbsp;|&nbsp; <strong>Insc. Estadual:</strong> ${CONTRATADA.inscricaoEstadual}</p>
      <p class="party-line"><strong>Endereço:</strong> ${CONTRATADA.endereco}, ${CONTRATADA.bairro}, ${CONTRATADA.cidade}/${CONTRATADA.uf} — CEP ${CONTRATADA.cep}</p>
      <p class="party-line"><strong>Telefone:</strong> ${CONTRATADA.telefone} &nbsp;|&nbsp; <strong>E-mail:</strong> ${CONTRATADA.email}</p>
      <p class="party-line"><strong>Representante:</strong> ${CONTRATADA.representante}, CPF ${CONTRATADA.cpfRepresentante}, RG ${CONTRATADA.rgRepresentante}</p>
    </div>
    <div class="party">
      <span class="party-role">Contratante</span>
      <p class="party-line"><strong>Razão Social / Nome:</strong> ${t.nome}</p>
      ${t.cnpj ? `<p class="party-line"><strong>CNPJ / CPF:</strong> ${t.cnpj}</p>` : `<p class="party-line"><strong>CNPJ / CPF:</strong> ___________________________________</p>`}
      <p class="party-line"><strong>Endereço:</strong> ${t.endereco || '___________________________________________________________'}</p>
      ${!t.endereco ? `<p class="party-line"><strong>Bairro:</strong> _________________________ <strong>Cidade/UF:</strong> _______________________</p>` : ''}
      <p class="party-line"><strong>Telefone:</strong> ${t.telefone || '_________________________'} &nbsp; <strong>E-mail:</strong> ${t.contato || '_______________________________'}</p>
      <p class="party-line"><strong>Representante:</strong> ${t.responsavel || '_________________________________'} &nbsp; <strong>CPF:</strong> _____________________</p>
    </div>
  </div>

  <div class="clause">
    <h3>Cláusula 1ª — Do Objeto</h3>
    <p>O presente instrumento tem por objeto a prestação de serviços de tecnologia pela CONTRATADA
    à CONTRATANTE, consistindo no licenciamento de uso do sistema de Ponto de Venda (PDV)
    <strong>Restaurante PDV</strong>, na modalidade <em>Software as a Service</em> (SaaS), plano
    <strong>${plano}</strong>, compreendendo:</p>
    <ol>
      <li>Acesso ao sistema via navegador web, com suporte a múltiplos dispositivos;</li>
      <li>Painel administrativo para gestão de produtos, mesas, pedidos e caixa;</li>
      <li>Atualizações de versão disponibilizadas automaticamente durante a vigência;</li>
      <li>Suporte técnico nos canais e horários definidos na Cláusula 4ª;</li>
      <li>Armazenamento dos dados do CONTRATANTE em ambiente seguro com backups periódicos.</li>
    </ol>
  </div>

  <div class="clause">
    <h3>Cláusula 2ª — Da Vigência</h3>
    <p>O presente contrato vigorará ${vigencia}, renovando-se automaticamente por períodos sucessivos de
    ${cicloExtMap[ciclo] || '30 (trinta) dias'}, salvo notificação de não renovação por qualquer das partes,
    realizada com antecedência mínima de 30 (trinta) dias antes do término do período vigente,
    por e-mail ou notificação escrita.</p>
  </div>

  <div class="clause">
    <h3>Cláusula 3ª — Do Valor e Forma de Pagamento</h3>
    <p>Pela prestação dos serviços descritos, a CONTRATANTE pagará à CONTRATADA o valor de
    <strong>${valor}</strong> por ciclo <strong>${cicloMap[ciclo] || ciclo}</strong>, com vencimento no dia
    <strong>10 (dez)</strong> de cada período de referência.</p>
    <p>São aceitos os seguintes meios de pagamento: PIX, transferência bancária (TED/DOC) ou boleto bancário.</p>
    <p class="paragrafo">O não pagamento até a data de vencimento acarretará multa moratória de 2% (dois por cento)
    sobre o valor em aberto, acrescida de juros de mora de 1% (um por cento) ao mês, calculados pro rata die,
    além de correção monetária pelo IGPM/FGV, sem prejuízo da suspensão imediata do acesso ao sistema após
    10 (dez) dias de inadimplência.</p>
  </div>

  <div class="clause">
    <h3>Cláusula 4ª — Das Obrigações da Contratada</h3>
    <p>Compete à CONTRATADA:</p>
    <ol>
      <li>Garantir a disponibilidade do sistema com SLA mínimo de 99% (noventa e nove por cento) ao mês,
      excluídas janelas de manutenção programada comunicadas com antecedência;</li>
      <li>Realizar backups automáticos dos dados da CONTRATANTE com frequência mínima diária;</li>
      <li>Prestar suporte técnico de segunda a sexta-feira, das 08h às 18h (horário de Brasília),
      por meio de e-mail (${CONTRATADA.email}) e WhatsApp (${CONTRATADA.telefone});</li>
      <li>Comunicar à CONTRATANTE, com antecedência mínima de 48 (quarenta e oito) horas, as
      manutenções programadas que impliquem indisponibilidade do sistema;</li>
      <li>Manter a confidencialidade dos dados da CONTRATANTE, não os compartilhando com terceiros,
      salvo por determinação legal ou judicial.</li>
    </ol>
  </div>

  <div class="clause">
    <h3>Cláusula 5ª — Das Obrigações da Contratante</h3>
    <p>Compete à CONTRATANTE:</p>
    <ol>
      <li>Manter em sigilo as credenciais de acesso ao sistema, sendo integralmente responsável
      por uso indevido decorrente de compartilhamento não autorizado;</li>
      <li>Efetuar os pagamentos nas datas e condições acordadas neste instrumento;</li>
      <li>Utilizar o sistema exclusivamente para fins lícitos, em conformidade com a legislação
      brasileira e com os termos deste contrato;</li>
      <li>Notificar a CONTRATADA, imediatamente, sobre qualquer suspeita de violação de segurança,
      acesso não autorizado ou uso indevido do sistema;</li>
      <li>Manter seus dados cadastrais atualizados junto à CONTRATADA.</li>
    </ol>
  </div>

  <div class="clause">
    <h3>Cláusula 6ª — Da Propriedade Intelectual</h3>
    <p>O sistema <strong>Restaurante PDV</strong> e todos os seus componentes — incluindo código-fonte,
    interfaces, algoritmos, documentação e marca — são de propriedade exclusiva da CONTRATADA, protegidos
    pela Lei nº 9.609/1998 (Lei de Software) e pela Lei nº 9.610/1998 (Lei de Direitos Autorais).</p>
    <p class="paragrafo">Este contrato confere à CONTRATANTE licença de uso não exclusiva, intransferível
    e revogável do software, pelo período de vigência contratual. Não implica cessão, transferência ou
    sublicenciamento de quaisquer direitos de propriedade intelectual.</p>
  </div>

  <div class="clause">
    <h3>Cláusula 7ª — Da Confidencialidade e Proteção de Dados (LGPD)</h3>
    <p>As partes comprometem-se a tratar os dados pessoais eventualmente compartilhados em estrita
    conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD),
    adotando medidas técnicas e organizacionais adequadas para proteger as informações contra
    acesso não autorizado, destruição, perda, alteração ou divulgação indevida.</p>
    <p>A CONTRATADA atuará como <em>operadora</em> dos dados inseridos pela CONTRATANTE no sistema,
    processando-os exclusivamente para as finalidades previstas neste contrato. A CONTRATANTE,
    na qualidade de <em>controladora</em>, é responsável pela legalidade do tratamento de dados
    de seus clientes e colaboradores dentro do sistema.</p>
  </div>

  <div class="clause">
    <h3>Cláusula 8ª — Da Limitação de Responsabilidade</h3>
    <p>A CONTRATADA não será responsabilizada por danos indiretos, lucros cessantes ou perda de
    dados decorrentes de:</p>
    <ol>
      <li>Uso inadequado do sistema pela CONTRATANTE ou por terceiros com acesso autorizado por ela;</li>
      <li>Falhas de infraestrutura de terceiros (internet, energia elétrica, provedores de nuvem);</li>
      <li>Eventos de força maior ou caso fortuito, conforme o art. 393 do Código Civil Brasileiro;</li>
      <li>Manutenções programadas devidamente comunicadas.</li>
    </ol>
    <p class="paragrafo">Em qualquer hipótese, a responsabilidade máxima da CONTRATADA fica limitada
    ao valor pago pela CONTRATANTE nos últimos 3 (três) meses de vigência do contrato.</p>
  </div>

  <div class="clause">
    <h3>Cláusula 9ª — Da Rescisão</h3>
    <p>Este contrato poderá ser rescindido:</p>
    <ol>
      <li><strong>Por qualquer das partes</strong>, mediante notificação escrita com antecedência
      mínima de 30 (trinta) dias, sem ônus ou penalidades;</li>
      <li><strong>Por inadimplência</strong> da CONTRATANTE, após decorridos 10 (dez) dias do
      vencimento sem pagamento, independentemente de notificação prévia, não gerando direito
      a restituição de valores já pagos;</li>
      <li><strong>Por descumprimento contratual</strong> de qualquer das partes, após notificação
      e prazo de 5 (cinco) dias úteis para regularização.</li>
    </ol>
    <p class="paragrafo">Rescindido o contrato, a CONTRATADA manterá os dados da CONTRATANTE
    disponíveis para exportação por 30 (trinta) dias, após os quais poderão ser definitivamente
    excluídos.</p>
  </div>

  <div class="clause">
    <h3>Cláusula 10ª — Das Disposições Gerais</h3>
    <ol>
      <li>Este contrato constitui o acordo integral entre as partes, substituindo quaisquer
      entendimentos anteriores sobre o mesmo objeto;</li>
      <li>Qualquer alteração deste instrumento somente terá validade se formalizada por escrito
      e assinada por ambas as partes;</li>
      <li>A tolerância de uma das partes em relação ao descumprimento de qualquer cláusula não
      constituirá novação ou renúncia ao direito de exigi-la futuramente;</li>
      <li>Caso qualquer disposição deste contrato seja considerada inválida, as demais permanecerão
      em pleno vigor.</li>
    </ol>
  </div>

  <div class="clause">
    <h3>Cláusula 11ª — Do Foro</h3>
    <p>Fica eleito o foro da Comarca de <strong>${CONTRATADA.foroCidade}/${CONTRATADA.foroUF}</strong>
    para dirimir quaisquer controvérsias oriundas deste instrumento, com renúncia expressa a qualquer
    outro, por mais privilegiado que seja, ressalvados os casos em que a legislação imponha foro
    diverso de forma imperativa.</p>
  </div>

  ${t.observacoes ? `<div class="notes-box"><strong>Condições específicas / Observações:</strong><br/>${t.observacoes}</div>` : ''}

  <div class="sig-section">
    <p class="sig-city">Goiânia/GO, _______ de __________________ de _______</p>
    <div class="sig-lines">
      <div class="sig-line">
        <div class="line"></div>
        <p class="sig-name-label">${t.nome}</p>
        <p class="sig-role-label">CONTRATANTE</p>
      </div>
      <div class="sig-line">
        <div class="line"></div>
        <p class="sig-name-label">${CONTRATADA.representante}</p>
        <p class="sig-role-label">CONTRATADA — ${CONTRATADA.cargoRepresentante}</p>
      </div>
    </div>
    <div class="witness-lines">
      <p class="witness-title">Testemunhas:</p>
      <div class="sig-lines">
        <div class="sig-line">
          <div class="line"></div>
          <p class="sig-role-label">Nome: ___________________________ CPF: ___________________</p>
        </div>
        <div class="sig-line">
          <div class="line"></div>
          <p class="sig-role-label">Nome: ___________________________ CPF: ___________________</p>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>${CONTRATADA.razaoSocial} · CNPJ ${CONTRATADA.cnpj}</span>
    <span>Documento gerado em ${new Date().toLocaleDateString('pt-BR')} · ${t.nome} · Plano ${plano}</span>
  </div>

</div>
</body>
</html>`

  const janela = window.open('', '_blank')
  if (!janela) { showToast('error', 'Permita popups para gerar o contrato'); return }
  janela.document.write(html)
  janela.document.close()
  janela.onload = () => janela.print()
}

onMounted(() => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) { navigateTo('/platform/login'); return }
  carregar()
})
</script>

<style scoped>
.label-field { @apply block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1.5; }
.input-field  { @apply w-full h-11 px-4 bg-white/[0.05] border border-white/[0.09] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/10 transition-all; }
textarea.input-field { @apply h-auto py-3; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(12px); }
</style>
