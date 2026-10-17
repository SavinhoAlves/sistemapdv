<template>
  <div class="p-6 space-y-6 w-full">

    <!-- Cabeçalho -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Suporte</h1>
        <p class="text-gray-500 dark:text-white/40 text-sm mt-0.5">Abra um chamado e acompanhe as respostas da nossa equipe</p>
      </div>
      <button
        @click="abrirFormulario"
        class="flex items-center gap-2 h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wide transition-all shadow-sm shadow-orange-500/30"
      >
        <Plus :size="14" />
        Novo chamado
      </button>
    </div>

    <!-- Formulário -->
    <form
      v-if="formAberto"
      @submit.prevent="enviar"
      class="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.07] rounded-2xl p-5 space-y-4"
    >
      <div>
        <label class="label">Assunto *</label>
        <input v-model="form.titulo" maxlength="120" placeholder="Ex: Impressora não está imprimindo as fichas" class="campo" />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="label">Tipo</label>
          <select v-model="form.tipo" class="campo">
            <option v-for="(rotulo, valor) in TIPOS" :key="valor" :value="valor">{{ rotulo }}</option>
          </select>
        </div>
        <div>
          <label class="label">Prioridade</label>
          <select v-model="form.prioridade" class="campo">
            <option v-for="(p, valor) in PRIORIDADES" :key="valor" :value="valor">{{ p.rotulo }}</option>
          </select>
        </div>
      </div>

      <div>
        <label class="label">Descrição</label>
        <textarea
          v-model="form.descricao"
          rows="5"
          maxlength="4000"
          placeholder="Descreva o problema: o que aconteceu, em qual tela e o que você esperava que acontecesse."
          class="campo resize-y"
        />
      </div>

      <p v-if="erro" class="text-xs text-red-500">{{ erro }}</p>

      <div class="flex justify-end gap-2">
        <button type="button" @click="formAberto = false" class="h-9 px-4 rounded-xl text-xs font-bold text-gray-500 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-all">
          Cancelar
        </button>
        <button type="submit" :disabled="enviando" class="flex items-center gap-2 h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wide transition-all">
          <Loader2 v-if="enviando" :size="14" class="animate-spin" />
          <Send v-else :size="14" />
          Enviar chamado
        </button>
      </div>
    </form>

    <!-- Lista -->
    <div v-if="carregando" class="flex justify-center py-16">
      <Loader2 :size="22" class="animate-spin text-gray-400 dark:text-white/30" />
    </div>

    <div v-else-if="!tickets.length" class="flex flex-col items-center text-center gap-3 py-16">
      <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center">
        <LifeBuoy :size="24" class="text-gray-400 dark:text-white/30" />
      </div>
      <p class="text-sm font-bold text-gray-900 dark:text-white">Nenhum chamado aberto</p>
      <p class="text-xs text-gray-500 dark:text-white/40 max-w-xs">Precisa de ajuda? Clique em "Novo chamado" e nossa equipe vai responder por aqui.</p>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="t in tickets"
        :key="t.id"
        class="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.07] rounded-2xl"
      >
        <button @click="expandido = expandido === t.id ? null : t.id" class="w-full text-left p-4 flex items-start gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full" :class="STATUS[t.status]?.classe">
                {{ STATUS[t.status]?.rotulo ?? t.status }}
              </span>
              <span class="text-[10px] font-bold uppercase tracking-wide" :class="PRIORIDADES[t.prioridade]?.classe">
                {{ PRIORIDADES[t.prioridade]?.rotulo ?? t.prioridade }}
              </span>
              <span class="text-[10px] text-gray-400 dark:text-white/30">{{ TIPOS[t.tipo] ?? t.tipo }}</span>
            </div>
            <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ t.titulo }}</p>
            <p class="text-[11px] text-gray-400 dark:text-white/30 mt-0.5">
              Aberto em {{ formatarData(t.createdAt) }}
              <template v-if="t.updatedAt !== t.createdAt"> · atualizado em {{ formatarData(t.updatedAt) }}</template>
            </p>
          </div>
          <ChevronDown :size="16" class="text-gray-400 dark:text-white/30 shrink-0 mt-1 transition-transform" :class="expandido === t.id ? 'rotate-180' : ''" />
        </button>

        <div v-if="expandido === t.id" class="px-4 pb-4 space-y-3 border-t border-gray-100 dark:border-white/[0.06] pt-3">
          <div v-if="t.descricao">
            <p class="label">Sua mensagem</p>
            <p class="text-xs text-gray-600 dark:text-white/60 whitespace-pre-line">{{ t.descricao }}</p>
          </div>
          <div class="rounded-xl p-3" :class="t.resolucao ? 'bg-emerald-50 dark:bg-emerald-500/[0.07]' : 'bg-gray-50 dark:bg-white/[0.03]'">
            <p class="label">Resposta do suporte</p>
            <p v-if="t.resolucao" class="text-xs text-gray-700 dark:text-white/70 whitespace-pre-line">{{ t.resolucao }}</p>
            <p v-else class="text-xs text-gray-400 dark:text-white/30">Aguardando resposta da equipe.</p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'
import { Plus, Send, Loader2, LifeBuoy, ChevronDown } from 'lucide-vue-next'

interface Ticket {
  id: string
  tipo: string
  prioridade: string
  status: string
  titulo: string
  descricao: string | null
  resolucao: string | null
  createdAt: string
  updatedAt: string
}

const TIPOS: Record<string, string> = {
  bug:        'Problema no sistema',
  instalacao: 'Instalação / equipamentos',
  cobranca:   'Financeiro / cobrança',
  outro:      'Outro assunto',
}

const PRIORIDADES: Record<string, { rotulo: string; classe: string }> = {
  baixa:   { rotulo: 'Baixa',   classe: 'text-gray-400 dark:text-white/40' },
  media:   { rotulo: 'Média',   classe: 'text-blue-500 dark:text-blue-400' },
  alta:    { rotulo: 'Alta',    classe: 'text-amber-500 dark:text-amber-400' },
  urgente: { rotulo: 'Urgente', classe: 'text-red-500 dark:text-red-400' },
}

const STATUS: Record<string, { rotulo: string; classe: string }> = {
  aberto:       { rotulo: 'Aberto',       classe: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  em_andamento: { rotulo: 'Em andamento', classe: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  resolvido:    { rotulo: 'Resolvido',    classe: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  fechado:      { rotulo: 'Fechado',      classe: 'bg-gray-500/15 text-gray-500 dark:text-white/40' },
}

const api        = useApi()
const toastStore = useToastStore()

const tickets    = ref<Ticket[]>([])
const carregando = ref(true)
const expandido  = ref<string | null>(null)
const formAberto = ref(false)
const enviando   = ref(false)
const erro       = ref('')
const form       = reactive({ titulo: '', tipo: 'bug', prioridade: 'media', descricao: '' })

function formatarData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function abrirFormulario() {
  Object.assign(form, { titulo: '', tipo: 'bug', prioridade: 'media', descricao: '' })
  erro.value = ''
  formAberto.value = true
}

async function carregar() {
  carregando.value = true
  try {
    tickets.value = await api.get<Ticket[]>('/suporte/tickets')
  } catch (e: any) {
    toastStore.error(e?.message || 'Erro ao carregar chamados')
  } finally {
    carregando.value = false
  }
}

async function enviar() {
  erro.value = ''
  if (form.titulo.trim().length < 3) { erro.value = 'Informe o assunto do chamado'; return }

  enviando.value = true
  try {
    const novo = await api.post<Ticket>('/suporte/tickets', {
      titulo:     form.titulo.trim(),
      tipo:       form.tipo,
      prioridade: form.prioridade,
      descricao:  form.descricao.trim() || undefined,
    })
    tickets.value.unshift(novo)
    formAberto.value = false
    toastStore.success('Chamado enviado', 'Nossa equipe vai responder por aqui.')
  } catch (e: any) {
    erro.value = e?.message || 'Erro ao enviar chamado'
  } finally {
    enviando.value = false
  }
}

onMounted(carregar)
</script>

<style scoped>
.label { display: block; margin-bottom: 0.375rem; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; color: rgb(156 163 175); }
.campo {
  width: 100%; padding: 0.55rem 0.75rem; border-radius: 0.75rem; font-size: 0.8rem;
  background: rgb(249 250 251); border: 1px solid rgb(229 231 235); color: rgb(17 24 39); outline: none;
}
.campo:focus { border-color: rgb(249 115 22 / 0.6); }
:global(.dark) .campo { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); }
:global(.dark) .campo option { background: #171717; }
</style>
