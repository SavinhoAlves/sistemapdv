<template>
  <header class="w-full bg-white/95 dark:bg-black/20 backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.08] shrink-0 sticky top-0 z-20">
    <div class="h-14 px-5 flex items-center justify-between gap-4">

      <!-- LOGO (só no mobile — em telas maiores ela vive na Sidebar) -->
      <div class="flex sm:hidden items-center gap-2.5 shrink-0">
        <div class="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
          <UtensilsCrossed :size="13" class="text-white" />
        </div>
        <span class="text-sm font-black text-gray-900 dark:text-white tracking-tight">
          Restaurante <span class="text-orange-500">PDV</span>
        </span>
      </div>

      <!-- espaço central -->
      <div class="flex-1"></div>

      <!-- DIREITA -->
      <div class="flex items-center gap-2 shrink-0">

        <!-- STATUS CAIXA (só admin) -->
        <template v-if="isAdmin">
          <button
            @click="solicitarCaixa"
            class="flex items-center gap-1.5 h-7 px-3 rounded-lg border text-[11px] font-black uppercase tracking-wide transition-all"
            :class="caixaAberto
              ? 'border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/[0.06] text-gray-400 dark:text-white/50 hover:border-red-500/40 hover:text-red-400'
              : 'border-green-500/30 bg-green-500/10 text-green-500 dark:text-green-400 hover:bg-green-500/20'"
          >
            <span
              class="w-1.5 h-1.5 rounded-full shrink-0"
              :class="caixaAberto ? 'bg-green-500 animate-pulse' : 'bg-gray-400 dark:bg-white/20'"
            ></span>
            <span class="sm:hidden">{{ caixaAberto ? 'Aberto' : 'Abrir' }}</span>
            <span class="hidden sm:inline">{{ caixaAberto ? 'Caixa Aberto' : 'Abrir Caixa' }}</span>
          </button>
          <div class="w-px h-5 bg-gray-200 dark:bg-white/10"></div>
        </template>

        <!-- PROFILE DROPDOWN -->
        <div ref="dropdownRef" class="relative">
          <button
            @click="dropdownAberto = !dropdownAberto"
            class="flex items-center gap-2 h-8 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all"
          >
            <div class="w-6 h-6 rounded-md bg-orange-500/15 border border-orange-500/20 flex items-center justify-center shrink-0">
              <span class="text-[11px] font-black text-orange-400">{{ inicial }}</span>
            </div>
            <span class="text-xs font-black text-gray-900 dark:text-white">{{ primeiroNome }}</span>
            <ChevronDown
              :size="12"
              class="text-gray-400 dark:text-white/40 transition-transform duration-200"
              :class="dropdownAberto ? 'rotate-180' : ''"
            />
          </button>

          <!-- MENU -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100 translate-y-0"
            leave-to-class="opacity-0 scale-95 -translate-y-1"
          >
            <div
              v-if="dropdownAberto"
              class="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-neutral-900/90 backdrop-blur-xl border border-gray-200 dark:border-white/[0.08] rounded-2xl shadow-xl shadow-gray-200/80 dark:shadow-black/40 overflow-hidden z-50"
            >
              <!-- INFO USUÁRIO -->
              <div class="px-4 py-3 border-b border-gray-100 dark:border-white/[0.06]">
                <p class="text-xs font-black text-gray-900 dark:text-white">{{ authStore.usuario?.nome }}</p>
                <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">{{ labelCargo }}</p>
              </div>

              <!-- ITENS -->
              <div class="p-1.5">

                <!-- TEMA -->
                <button
                  @click="themeStore.toggle()"
                  class="w-full flex items-center gap-3 h-9 px-3 rounded-xl text-xs font-bold text-gray-500 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white transition-all"
                >
                  <Sun v-if="themeStore.dark" :size="14" />
                  <Moon v-else :size="14" />
                  {{ themeStore.dark ? 'Modo claro' : 'Modo escuro' }}
                </button>

                <div class="h-px bg-gray-100 dark:bg-white/[0.06] my-1" />

                <!-- SAIR -->
                <button
                  @click="authStore.logout()"
                  class="w-full flex items-center gap-3 h-9 px-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all"
                >
                  <LogOut :size="14" />
                  Sair
                </button>

              </div>
            </div>
          </Transition>
        </div>

      </div>
    </div>

    <!-- NAVEGAÇÃO MOBILE (< sm) -->
    <div class="sm:hidden overflow-x-auto nav-scroll border-t border-gray-200 dark:border-white/[0.06]">
      <div class="flex items-center gap-1 px-2 py-1.5 w-max">
        <button
          v-for="item in navItems"
          :key="'mob-' + item.rota"
          @click="router.push(item.rota)"
          class="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
          :class="isAtivo(item.rota)
            ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
            : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/50'"
        >
          <component :is="item.icon" :size="12" stroke-width="2.2" />
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>

  </header>

  <!-- MODAL RFID -->
  <ModalRfidAuth
    v-model="modalRfid"
    mensagem="Aproxime o cartão RFID para liberar o acesso ao caixa"
    @auth-success="handleRfidCaixa"
    @cancelar="cancelarRfid"
  />

  <!-- MODAL SALDO INICIAL -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modalSaldoInicial"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      >
        <div class="bg-white dark:bg-neutral-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
              <Landmark :size="18" class="text-green-400" />
            </div>
            <div>
              <h2 class="text-base font-black text-gray-900 dark:text-white">Saldo inicial do caixa</h2>
              <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Informe o valor de abertura do caixa</p>
            </div>
          </div>

          <label for="saldoInput" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
            Valor (R$) <span class="text-red-400">*</span>
          </label>
          <input
            id="saldoInput"
            name="saldoInput"
            v-model="saldoInicial"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            autofocus
            @keyup.enter="confirmarAbertura"
            class="w-full h-12 px-4 bg-gray-50 dark:bg-white/[0.06] border rounded-2xl text-gray-900 dark:text-white font-bold text-base outline-none transition-all mb-1"
            :class="saldoErro
              ? 'border-red-400 focus:border-red-400'
              : 'border-gray-200 dark:border-white/10 focus:border-orange-500'"
          />
          <p v-if="saldoErro" class="text-[11px] text-red-400 font-bold mb-4">{{ saldoErro }}</p>
          <div v-else class="mb-4" />

          <div class="flex gap-3">
            <button
              @click="modalSaldoInicial = false; acaoCaixa = null; usuarioRfid = null"
              class="flex-1 h-12 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 text-sm font-black transition-all hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              @click="confirmarAbertura"
              :disabled="abrindoCaixa"
              class="flex-1 h-12 rounded-2xl bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white text-sm font-black transition-all active:scale-95"
            >
              {{ abrindoCaixa ? 'Abrindo...' : 'Abrir Caixa' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- MODAL CONFERÊNCIA DE FECHAMENTO -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modalConferencia"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      >
        <div class="bg-white dark:bg-neutral-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-3xl p-6 w-full max-w-sm shadow-2xl">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-2xl bg-red-500/10 flex items-center justify-center shrink-0">
              <Landmark :size="18" class="text-red-400" />
            </div>
            <div>
              <h2 class="text-base font-black text-gray-900 dark:text-white">Fechar caixa</h2>
              <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Conte o dinheiro da gaveta e informe o valor</p>
            </div>
          </div>

          <label for="valorContadoInput" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
            Dinheiro contado (R$) <span class="text-red-400">*</span>
          </label>
          <input
            id="valorContadoInput" name="valorContadoInput"
            v-model="valorContado" type="number" min="0" step="0.01" placeholder="0,00" autofocus
            @keyup.enter="confirmarFechamento"
            class="w-full h-12 px-4 bg-gray-50 dark:bg-white/[0.06] border rounded-2xl text-gray-900 dark:text-white font-bold text-base outline-none transition-all mb-3"
            :class="fechamentoErro
              ? 'border-red-400 focus:border-red-400'
              : 'border-gray-200 dark:border-white/10 focus:border-orange-500'"
          />

          <label for="obsFechamentoInput" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
            Observação (opcional)
          </label>
          <input
            id="obsFechamentoInput" name="obsFechamentoInput"
            v-model="obsFechamento" type="text" maxlength="255" placeholder="Ex: falta justificada por vale"
            class="w-full h-12 px-4 bg-gray-50 dark:bg-white/[0.06] border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white font-medium text-sm outline-none focus:border-orange-500 transition-all mb-1"
          />
          <p v-if="fechamentoErro" class="text-[11px] text-red-400 font-bold mb-4">{{ fechamentoErro }}</p>
          <div v-else class="mb-4" />

          <div class="flex gap-3">
            <button
              @click="cancelarFechamento"
              class="flex-1 h-12 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 text-sm font-black transition-all hover:bg-gray-50 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              @click="confirmarFechamento"
              :disabled="fechandoCaixa"
              class="flex-1 h-12 rounded-2xl bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white text-sm font-black transition-all active:scale-95"
            >
              {{ fechandoCaixa ? 'Fechando...' : 'Fechar Caixa' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- MODAL RESUMO DO FECHAMENTO -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="resumoFechamento"
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      >
        <div class="bg-white dark:bg-neutral-900/90 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] rounded-3xl p-6 w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto">
          <div class="text-center mb-5">
            <div class="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <Landmark :size="20" class="text-green-400" />
            </div>
            <h2 class="text-base font-black text-gray-900 dark:text-white">Caixa fechado</h2>
            <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Aberto em {{ resumoFechamento.caixa.data_abertura ? new Date(resumoFechamento.caixa.data_abertura).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—' }}</p>
          </div>

          <!-- CONFERÊNCIA -->
          <div class="rounded-2xl p-4 mb-3"
            :class="Math.abs(Number(resumoFechamento.caixa.diferenca || 0)) < 0.005
              ? 'bg-green-500/10'
              : 'bg-red-500/10'">
            <div class="flex justify-between text-xs text-gray-500 dark:text-white/50 mb-1">
              <span>Esperado em gaveta</span><span>R$ {{ fmtValor(resumoFechamento.totais.esperado_dinheiro) }}</span>
            </div>
            <div class="flex justify-between text-xs text-gray-500 dark:text-white/50 mb-1">
              <span>Contado</span><span>R$ {{ fmtValor(resumoFechamento.caixa.valor_contado) }}</span>
            </div>
            <div class="flex justify-between text-sm font-black"
              :class="Number(resumoFechamento.caixa.diferenca || 0) < -0.005
                ? 'text-red-400'
                : 'text-green-400'">
              <span>Diferença</span>
              <span>{{ Number(resumoFechamento.caixa.diferenca || 0) >= 0 ? '+' : '−' }} R$ {{ fmtValor(Math.abs(Number(resumoFechamento.caixa.diferenca || 0))) }}</span>
            </div>
          </div>

          <!-- VENDAS POR MÉTODO -->
          <div class="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 mb-3 space-y-1">
            <p class="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">Vendas por método</p>
            <div v-if="!resumoFechamento.porMetodo?.length" class="text-xs text-gray-400 dark:text-white/40">Sem vendas registradas</div>
            <div v-for="m in resumoFechamento.porMetodo" :key="m.metodo" class="flex justify-between text-xs">
              <span class="text-gray-500 dark:text-white/50">{{ m.metodo }} ({{ m.qtd }})</span>
              <span class="font-bold text-gray-900 dark:text-white">R$ {{ fmtValor(m.total) }}</span>
            </div>
            <div v-if="resumoFechamento.vendas" class="flex justify-between text-xs pt-1 border-t border-gray-200 dark:border-white/[0.06] mt-1">
              <span class="text-gray-500 dark:text-white/50">{{ resumoFechamento.vendas.quantidade }} vendas · ticket médio</span>
              <span class="font-bold text-gray-900 dark:text-white">R$ {{ fmtValor(resumoFechamento.vendas.ticket_medio) }}</span>
            </div>
          </div>

          <!-- TOTAIS -->
          <div class="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 mb-5 space-y-1">
            <div class="flex justify-between text-xs">
              <span class="text-gray-500 dark:text-white/50">Saldo inicial</span>
              <span class="font-bold text-gray-900 dark:text-white">R$ {{ fmtValor(resumoFechamento.totais.valor_inicial) }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-500 dark:text-white/50">Entradas</span>
              <span class="font-bold text-green-500 dark:text-green-400">+ R$ {{ fmtValor(resumoFechamento.totais.total_entradas) }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-500 dark:text-white/50">Saídas</span>
              <span class="font-bold text-red-500 dark:text-red-400">− R$ {{ fmtValor(resumoFechamento.totais.total_saidas) }}</span>
            </div>
            <div class="flex justify-between text-sm font-black text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-white/[0.06]">
              <span>Saldo final</span>
              <span>R$ {{ fmtValor(resumoFechamento.totais.saldo_atual) }}</span>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              @click="imprimirFechamento"
              class="flex-1 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-white/80 text-sm font-black transition-all active:scale-95"
            >
              Imprimir
            </button>
            <button
              @click="resumoFechamento = null"
              class="flex-1 h-12 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-black transition-all active:scale-95"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.nav-scroll::-webkit-scrollbar { display: none; }
.nav-scroll { -ms-overflow-style: none; scrollbar-width: none; }
</style>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  LogOut, UtensilsCrossed, Sun, Moon, ChevronDown, Landmark
} from 'lucide-vue-next'

import { useAuthStore }   from '~/stores/auth'
import { useToastStore }  from '~/stores/toast'
import { useCaixaStore }  from '~/stores/caixa'
import { useThemeStore }  from '~/stores/theme'
import { useConfigStore }      from '~/stores/configuracoes'
import { useImpressorasStore } from '~/stores/impressoras'
import { useNavItems }    from '~/composables/useNavItems'
import { useApi }         from '~/services/api'
import ModalRfidAuth      from '~/components/modals/ModalRfidAuth.vue'

const router      = useRouter()
const route       = useRoute()
const authStore   = useAuthStore()
const toastStore  = useToastStore()
const caixaStore  = useCaixaStore()
const themeStore  = useThemeStore()
const configStore      = useConfigStore()
const impressorasStore = useImpressorasStore()
const api              = useApi()
const config      = useRuntimeConfig()

const cargo    = computed(() => authStore.usuario?.cargo)
const isAdmin  = computed(() => cargo.value === 'administrador')
const isGarcom = computed(() => cargo.value === 'garcom')
const isCaixa  = computed(() => cargo.value === 'caixa')
const isCozinha = computed(() => cargo.value === 'cozinha')

const inicial      = computed(() => (authStore.usuario?.nome || 'U')[0].toUpperCase())
const primeiroNome = computed(() => authStore.usuario?.nome?.split(' ')[0] || '')
const caixaAberto  = computed(() => caixaStore.aberto)

const LABEL_CARGO: Record<string, string> = {
  administrador: 'Administrador',
  garcom:        'Garçom',
  caixa:         'Caixa',
  cozinha:       'Cozinheiro',
}
const labelCargo = computed(() =>
  LABEL_CARGO[authStore.usuario?.cargo ?? ''] ?? authStore.usuario?.cargo ?? ''
)

// Navegação mobile (< sm)
const { navItems } = useNavItems()

function isAtivo(rota: string) {
  if (rota === '/') return route.path === '/'
  return route.path.startsWith(rota)
}

// ======================
// DROPDOWN PROFILE
// ======================
const dropdownAberto = ref(false)
const dropdownRef    = ref<HTMLElement | null>(null)

function fecharDropdown(e: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    dropdownAberto.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', fecharDropdown))
onBeforeUnmount(() => document.removeEventListener('mousedown', fecharDropdown))

// ======================
// CAIXA
// ======================
const modalRfid        = ref(false)
const acaoCaixa        = ref<'abrir' | 'fechar' | null>(null)
const modalSaldoInicial = ref(false)
const saldoInicial     = ref('')
const saldoErro        = ref('')
const abrindoCaixa     = ref(false)
const usuarioRfid      = ref<any>(null)

const solicitarCaixa = async () => {
  await configStore.carregar()
  acaoCaixa.value = caixaStore.aberto ? 'fechar' : 'abrir'

  if (!configStore.rfid_ativo) {
    if (acaoCaixa.value === 'abrir') {
      usuarioRfid.value = authStore.usuario
      saldoInicial.value = ''
      saldoErro.value = ''
      modalSaldoInicial.value = true
    } else {
      valorContado.value = ''
      obsFechamento.value = ''
      fechamentoErro.value = ''
      modalConferencia.value = true
    }
    return
  }

  modalRfid.value = true
}

const cancelarRfid = () => {
  modalRfid.value = false
  acaoCaixa.value = null
  usuarioRfid.value = null
}

const handleRfidCaixa = async (rfidBuffer: string) => {
  try {
    const resposta = await $fetch<any>(
      `${config.public.apiUrl}/api/auth/rfid`,
      { method: 'POST', body: { rfid: rfidBuffer.trim(), slug: (config.public as any).tenantSlug } }
    )

    if (!resposta?.usuario) {
      toastStore.error('Cartão não reconhecido')
      return
    }

    modalRfid.value = false

    if (acaoCaixa.value === 'abrir') {
      // Guarda o usuário e abre modal de saldo inicial
      usuarioRfid.value = resposta.usuario
      saldoInicial.value = ''
      saldoErro.value = ''
      modalSaldoInicial.value = true
    } else if (acaoCaixa.value === 'fechar') {
      // Fechamento cego: conta a gaveta antes de ver o valor esperado
      valorContado.value = ''
      obsFechamento.value = ''
      fechamentoErro.value = ''
      modalConferencia.value = true
    }

  } catch (error: any) {
    toastStore.error('Erro ao operar o caixa', error?.data?.error)
    acaoCaixa.value = null
    await sincronizarCaixa()
  }
}

// ======================
// FECHAMENTO COM CONFERÊNCIA
// ======================
const modalConferencia = ref(false)
const valorContado     = ref('')
const obsFechamento    = ref('')
const fechamentoErro   = ref('')
const fechandoCaixa    = ref(false)
const resumoFechamento = ref<any>(null)

const fmtValor = (v: any) => Number(v || 0).toFixed(2)

const cancelarFechamento = () => {
  modalConferencia.value = false
  acaoCaixa.value = null
}

const confirmarFechamento = async () => {
  const valor = Number(valorContado.value)
  if (valorContado.value === '' || isNaN(valor) || valor < 0) {
    fechamentoErro.value = 'Informe o valor contado na gaveta'
    return
  }
  fechandoCaixa.value = true
  fechamentoErro.value = ''
  try {
    const resp = await api.post<any>('/caixa/fechar', {
      caixa_id: caixaStore.caixaAtual?.id,
      valor_contado: valor,
      observacao: obsFechamento.value || undefined
    })
    modalConferencia.value = false
    resumoFechamento.value = resp.resumo
    toastStore.success('Caixa fechado com sucesso')
  } catch (error: any) {
    fechamentoErro.value = error?.message || 'Erro ao fechar o caixa'
  } finally {
    fechandoCaixa.value = false
    acaoCaixa.value = null
    await sincronizarCaixa()
  }
}

const imprimirFechamento = async () => {
  const resumo = resumoFechamento.value
  if (!resumo) return
  await configStore.carregar()

  // Térmica direta via backend
  if (impressorasStore.impressaoDiretaPara('caixa')) {
    try {
      await api.post('/impressao/fechamento', { caixa_id: resumo.caixa.id })
      toastStore.success('Resumo enviado à impressora')
    } catch (e: any) {
      toastStore.error('Falha na impressão', e?.message)
    }
    return
  }

  // Impressão pelo navegador
  const mm  = configStore.impressora_largura === 58 ? 58 : 80
  const dif = Number(resumo.caixa.diferenca || 0)
  const logo = configStore.logo_base64
  const logoHtml = logo
    ? `<img src="${logo}" style="height:30px;object-fit:contain;display:block;margin:0 auto 2mm;" />`
    : ''
  const fmtData = (v: any) => v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
  const linha = (esq: string, dir: string, bold = false) =>
    `<div class="par${bold ? ' bold' : ''}"><span>${esq}</span><span>${dir}</span></div>`

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fechamento</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: monospace; background: #fff; }
    @page { size: ${mm}mm auto; margin: 0; }
    .cupom { width: ${mm}mm; margin: 0 auto; padding: 4mm 3mm 6mm; font-size: 7pt; }
    .centro { text-align: center; }
    .titulo { font-size: 8pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
    .sep { border-top: 1px dashed #000; margin: 2mm 0; }
    .par { display: flex; justify-content: space-between; gap: 2mm; }
    .bold { font-weight: 900; }
    .secao { font-weight: 900; margin-top: 1mm; }
  </style></head><body>
  <div class="cupom">
    ${logoHtml}
    <div class="centro titulo">${configStore.nome_restaurante}</div>
    <div class="centro bold">FECHAMENTO DE CAIXA</div>
    <div class="centro">Sessão de ${fmtData(resumo.caixa.data_abertura)}</div>
    <div class="sep"></div>
    ${linha('Abertura', fmtData(resumo.caixa.data_abertura))}
    ${linha('Fechamento', fmtData(resumo.caixa.fechado_em))}
    ${resumo.caixa.operador ? linha('Aberto por', resumo.caixa.operador) : ''}
    ${resumo.caixa.fechado_por_nome ? linha('Fechado por', resumo.caixa.fechado_por_nome) : ''}
    <div class="sep"></div>
    ${linha('Saldo inicial', 'R$ ' + fmtValor(resumo.totais.valor_inicial))}
    ${linha('Entradas', '+R$ ' + fmtValor(resumo.totais.total_entradas))}
    ${linha('Saidas', '-R$ ' + fmtValor(resumo.totais.total_saidas))}
    ${linha('Saldo final', 'R$ ' + fmtValor(resumo.totais.saldo_atual), true)}
    <div class="sep"></div>
    <div class="secao">VENDAS POR METODO</div>
    ${(resumo.porMetodo || []).map((m: any) => linha(`${m.metodo} (${m.qtd})`, 'R$ ' + fmtValor(m.total))).join('')}
    ${resumo.vendas ? linha('Vendas / ticket medio', `${resumo.vendas.quantidade} / R$ ${fmtValor(resumo.vendas.ticket_medio)}`) : ''}
    <div class="sep"></div>
    <div class="secao">CONFERENCIA (DINHEIRO)</div>
    ${linha('Esperado em gaveta', 'R$ ' + fmtValor(resumo.totais.esperado_dinheiro))}
    ${linha('Contado', 'R$ ' + fmtValor(resumo.caixa.valor_contado))}
    ${linha('Diferenca', (dif >= 0 ? '+' : '-') + 'R$ ' + fmtValor(Math.abs(dif)), true)}
    ${resumo.caixa.observacao_fechamento ? `<div class="sep"></div><div>Obs: ${resumo.caixa.observacao_fechamento}</div>` : ''}
  </div>
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
  doc.open()
  doc.write(html)
  doc.close()
}

const confirmarAbertura = async () => {
  const valor = Number(saldoInicial.value)
  if (!saldoInicial.value || isNaN(valor) || valor <= 0) {
    saldoErro.value = 'Informe o saldo inicial do caixa'
    return
  }
  abrindoCaixa.value = true
  saldoErro.value = ''
  try {
    await api.post('/caixa/abrir', { usuario_id: usuarioRfid.value.id, valor_inicial: valor })
    toastStore.success('Caixa aberto com sucesso')
    modalSaldoInicial.value = false
  } catch (error: any) {
    saldoErro.value = error?.message || 'Erro ao abrir o caixa'
  } finally {
    abrindoCaixa.value = false
    acaoCaixa.value = null
    usuarioRfid.value = null
    await sincronizarCaixa()
  }
}

const sincronizarCaixa = async () => {
  try {
    const resposta = await api.get<any>('/caixa/atual')
    caixaStore.aberto     = resposta?.aberto || false
    caixaStore.caixaAtual = resposta?.caixa  || null
  } catch {
    caixaStore.aberto     = false
    caixaStore.caixaAtual = null
  } finally {
    caixaStore.inicializado = true
  }
}

onMounted(sincronizarCaixa)
</script>
