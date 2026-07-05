<template>
  <header class="w-full bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 shrink-0 transition-colors duration-200">
    <div class="h-14 px-5 flex items-center justify-between gap-4">

      <!-- LOGO (só no mobile — em telas maiores ela vive na Sidebar) -->
      <div class="flex sm:hidden items-center gap-2.5 shrink-0">
        <div class="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
          <UtensilsCrossed :size="13" class="text-white" />
        </div>
        <span class="text-sm font-black text-neutral-900 dark:text-white tracking-tight">
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
              ? 'border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 hover:border-red-400 dark:hover:border-red-800 hover:text-red-500 dark:hover:text-red-400'
              : 'border-green-300 dark:border-green-800/60 bg-green-50 dark:bg-green-950/60 text-green-600 dark:text-green-500 hover:bg-green-100 dark:hover:bg-green-900/40'"
          >
            <span
              class="w-1.5 h-1.5 rounded-full shrink-0"
              :class="caixaAberto ? 'bg-green-500 animate-pulse' : 'bg-neutral-400 dark:bg-neutral-600'"
            ></span>
            <span class="sm:hidden">{{ caixaAberto ? 'Aberto' : 'Abrir' }}</span>
            <span class="hidden sm:inline">{{ caixaAberto ? 'Caixa Aberto' : 'Abrir Caixa' }}</span>
          </button>
          <div class="w-px h-5 bg-neutral-200 dark:bg-neutral-800"></div>
        </template>

        <!-- PROFILE DROPDOWN -->
        <div ref="dropdownRef" class="relative">
          <button
            @click="dropdownAberto = !dropdownAberto"
            class="flex items-center gap-2 h-8 px-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all"
          >
            <div class="w-6 h-6 rounded-md bg-orange-100 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/20 flex items-center justify-center shrink-0">
              <span class="text-[11px] font-black text-orange-600 dark:text-orange-400">{{ inicial }}</span>
            </div>
            <span class="hidden md:block text-xs font-black text-neutral-800 dark:text-neutral-200">{{ primeiroNome }}</span>
            <ChevronDown
              :size="12"
              class="text-neutral-400 transition-transform duration-200"
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
              class="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 overflow-hidden z-50"
            >
              <!-- INFO USUÁRIO -->
              <div class="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <p class="text-xs font-black text-neutral-900 dark:text-white">{{ authStore.usuario?.nome }}</p>
                <p class="text-[11px] text-neutral-400 dark:text-neutral-600 capitalize mt-0.5">{{ authStore.usuario?.cargo }}</p>
              </div>

              <!-- ITENS -->
              <div class="p-1.5">

                <!-- TEMA -->
                <button
                  @click="themeStore.toggle()"
                  class="w-full flex items-center gap-3 h-9 px-3 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-all"
                >
                  <Sun v-if="themeStore.dark" :size="14" />
                  <Moon v-else :size="14" />
                  {{ themeStore.dark ? 'Modo claro' : 'Modo escuro' }}
                </button>

                <div class="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />

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
    <div class="sm:hidden overflow-x-auto nav-scroll border-t border-neutral-100 dark:border-neutral-800">
      <div class="flex items-center gap-1 px-2 py-1.5 w-max">
        <button
          v-for="item in navItems"
          :key="'mob-' + item.rota"
          @click="router.push(item.rota)"
          class="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap"
          :class="isAtivo(item.rota)
            ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/30'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'"
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
        <div class="bg-white dark:bg-neutral-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
          <div class="flex items-center gap-3 mb-5">
            <div class="w-10 h-10 rounded-2xl bg-green-100 dark:bg-green-950/50 flex items-center justify-center shrink-0">
              <Landmark :size="18" class="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 class="text-base font-black text-neutral-900 dark:text-white">Saldo inicial do caixa</h2>
              <p class="text-[11px] text-neutral-400 mt-0.5">Informe o valor de abertura do caixa</p>
            </div>
          </div>

          <label for="saldoInput" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">
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
            class="w-full h-12 px-4 bg-neutral-100 dark:bg-neutral-800 border rounded-2xl text-neutral-900 dark:text-white font-bold text-base outline-none transition-all mb-1"
            :class="saldoErro
              ? 'border-red-400 focus:border-red-400'
              : 'border-neutral-200 dark:border-neutral-700 focus:border-orange-500'"
          />
          <p v-if="saldoErro" class="text-[11px] text-red-400 font-bold mb-4">{{ saldoErro }}</p>
          <div v-else class="mb-4" />

          <div class="flex gap-3">
            <button
              @click="modalSaldoInicial = false; acaoCaixa = null; usuarioRfid = null"
              class="flex-1 h-12 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-sm font-black transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800"
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

import { useAuthStore }  from '~/stores/auth'
import { useToastStore } from '~/stores/toast'
import { useCaixaStore } from '~/stores/caixa'
import { useThemeStore } from '~/stores/theme'
import { useApi }        from '~/services/api'
import ModalRfidAuth     from '~/components/modals/ModalRfidAuth.vue'

const router      = useRouter()
const route       = useRoute()
const authStore   = useAuthStore()
const toastStore  = useToastStore()
const caixaStore  = useCaixaStore()
const themeStore  = useThemeStore()
const api         = useApi()
const config      = useRuntimeConfig()

const cargo    = computed(() => authStore.usuario?.cargo)
const isAdmin  = computed(() => cargo.value === 'administrador')
const isGarcom = computed(() => cargo.value === 'garcom')
const isCaixa  = computed(() => cargo.value === 'caixa')
const isCozinha = computed(() => cargo.value === 'cozinha')

const inicial      = computed(() => (authStore.usuario?.nome || 'U')[0].toUpperCase())
const primeiroNome = computed(() => authStore.usuario?.nome?.split(' ')[0] || '')
const caixaAberto  = computed(() => caixaStore.aberto)

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

const solicitarCaixa = () => {
  acaoCaixa.value = caixaStore.aberto ? 'fechar' : 'abrir'
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
      { method: 'POST', body: { rfid: rfidBuffer.trim() } }
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
      await api.post('/caixa/fechar', { caixa_id: caixaStore.caixaAtual?.id })
      toastStore.success('Caixa fechado com sucesso')
      acaoCaixa.value = null
      await sincronizarCaixa()
    }

  } catch (error: any) {
    toastStore.error('Erro ao operar o caixa', error?.data?.error)
    acaoCaixa.value = null
    await sincronizarCaixa()
  }
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
  }
}

onMounted(sincronizarCaixa)
</script>
