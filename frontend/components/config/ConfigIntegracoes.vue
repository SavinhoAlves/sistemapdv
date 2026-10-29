<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm text-gray-500 dark:text-white/50">Conecte a maquininha ou o Pix para a cobrança sair do PDV direto para eles.</p>
      <button class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shrink-0" @click="catalogo = true">
        <Plus :size="14" /> Adicionar integração
      </button>
    </div>

    <!-- Vazio -->
    <div v-if="!instaladas.length" class="rounded-2xl border border-dashed border-gray-300 dark:border-white/15 p-10 text-center">
      <div class="size-12 mx-auto rounded-2xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center mb-3"><Plug :size="20" class="text-gray-400 dark:text-white/40" /></div>
      <p class="text-sm font-black text-gray-800 dark:text-white/85">Nenhuma integração</p>
      <p class="text-xs text-gray-500 dark:text-white/45 mt-1 max-w-sm mx-auto">Sem integração, o pagamento é registrado no PDV e cobrado na maquininha à parte, como hoje.</p>
      <button class="mt-4 h-9 px-4 rounded-xl border border-orange-500/40 text-orange-600 dark:text-orange-400 text-xs font-black hover:bg-orange-500/10" @click="catalogo = true">Ver integrações disponíveis</button>
    </div>

    <!-- Instaladas -->
    <article v-for="i in instaladas" :key="i.id" class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 flex flex-wrap items-center gap-4">
      <span class="size-11 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0" :style="{ background: i.p.cor }">{{ i.p.sigla }}</span>
      <div class="flex-1 min-w-[12rem]">
        <p class="text-sm font-black text-gray-900 dark:text-white">{{ i.p.nome }}</p>
        <p class="text-[11px] text-gray-500 dark:text-white/45 mt-0.5">{{ i.detalhe }}</p>
      </div>
      <span class="text-[10px] font-black uppercase px-2 py-1 rounded-full" :class="SITUACAO[i.situacao].classe">{{ SITUACAO[i.situacao].rotulo }}</span>
      <!-- Pix: a chave é editada em Admin › Métodos -->
      <NuxtLink v-if="i.link" :to="i.link" class="h-8 px-3 rounded-lg text-xs font-black text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06] flex items-center">Configurar em Métodos</NuxtLink>
      <div v-else class="flex items-center gap-1">
        <button v-if="i.situacao !== 'incompleta'" class="h-8 px-3 rounded-lg text-xs font-black text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06]" :disabled="ocupado" @click="pausar(i)">{{ i.situacao === 'ativa' ? 'Pausar' : 'Ativar' }}</button>
        <button class="h-8 px-3 rounded-lg text-xs font-black text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06]" @click="editar(i.p)">Configurar</button>
        <button class="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-500/10" :aria-label="`Remover ${i.p.nome}`" :disabled="ocupado" @click="remover(i)"><Trash2 :size="14" /></button>
      </div>
    </article>

    <!-- Catálogo -->
    <Teleport to="body">
      <div v-if="catalogo" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="catalogo = false">
        <div class="bg-white dark:bg-[#161b26] border border-gray-200 dark:border-white/[0.08] rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]" role="dialog" aria-modal="true" aria-label="Adicionar integração">
          <div class="flex items-center justify-between px-6 pt-6 pb-3">
            <div>
              <h2 class="text-lg font-black text-gray-900 dark:text-white">Adicionar integração</h2>
              <p class="text-xs text-gray-500 dark:text-white/45 mt-0.5">Cada plataforma pede dados diferentes; você informa na próxima tela.</p>
            </div>
            <button class="cfg-icone" aria-label="Fechar" @click="catalogo = false"><X :size="16" /></button>
          </div>
          <div class="flex-1 overflow-y-auto px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button v-for="p in PROVEDORES" :key="p.id" type="button"
              class="text-left rounded-2xl border p-4 flex gap-3 transition-all"
              :class="p.disponivel ? 'border-gray-200 dark:border-white/[0.08] hover:border-orange-500/60 hover:bg-orange-500/[0.04]' : 'border-dashed border-gray-200 dark:border-white/[0.08]'"
              @click="escolher(p)">
              <span class="size-10 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0" :class="p.disponivel ? '' : 'opacity-50'" :style="{ background: p.cor }">{{ p.sigla }}</span>
              <span class="min-w-0">
                <span class="flex items-center gap-2">
                  <span class="text-sm font-black text-gray-900 dark:text-white">{{ p.nome }}</span>
                  <span v-if="instalada(p.id)" class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">Adicionada</span>
                  <span v-else-if="!p.disponivel" class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-gray-500/15 text-gray-500 dark:text-white/50">Em breve</span>
                </span>
                <span class="block text-[11px] text-gray-500 dark:text-white/45 mt-0.5 leading-snug">{{ p.resumo }}</span>
                <span v-if="!p.disponivel" class="block text-[11px] font-bold text-orange-600 dark:text-orange-400 mt-1.5">Quero essa integração →</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Formulário do provedor -->
    <Teleport to="body">
      <div v-if="editando" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="editando = null">
        <div class="bg-white dark:bg-[#161b26] border border-gray-200 dark:border-white/[0.08] rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]" role="dialog" aria-modal="true" :aria-label="editando.nome">
          <div class="flex items-center gap-3 px-6 pt-6 pb-4">
            <span class="size-10 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0" :style="{ background: editando.cor }">{{ editando.sigla }}</span>
            <div class="flex-1">
              <h2 class="text-lg font-black text-gray-900 dark:text-white">{{ editando.nome }}</h2>
              <p class="text-xs text-gray-500 dark:text-white/45">{{ editando.resumo }}</p>
            </div>
            <button class="cfg-icone" aria-label="Fechar" @click="editando = null"><X :size="16" /></button>
          </div>

          <div class="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
            <div v-for="c in editando.campos" :key="c.chave">
              <label :for="`int-${c.chave}`" class="cfg-rotulo">{{ c.rotulo }}{{ c.obrigatorio ? ' *' : '' }}</label>

              <div v-if="c.tipo === 'segredo'" class="relative">
                <input :id="`int-${c.chave}`" v-model="valores[c.chave]" :type="ver[c.chave] ? 'text' : 'password'" autocomplete="off"
                  :placeholder="mpStore.mp.token_salvo ? `Salvo (•••• ${mpStore.mp.token_sufixo}) — preencha só para trocar` : c.placeholder"
                  class="cfg-campo font-mono pr-10" />
                <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" :aria-label="ver[c.chave] ? 'Ocultar' : 'Mostrar'" @click="ver[c.chave] = !ver[c.chave]">
                  <EyeOff v-if="ver[c.chave]" :size="15" /><Eye v-else :size="15" />
                </button>
              </div>

              <div v-else-if="c.tipo === 'dispositivo'" class="flex gap-2">
                <select v-if="dispositivos.length" :id="`int-${c.chave}`" v-model="valores[c.chave]" class="cfg-campo">
                  <option value="">Selecione a maquininha</option>
                  <option v-for="d in dispositivos" :key="d.id" :value="d.id">{{ d.id }}{{ d.pos_id ? ` · ${d.pos_id}` : '' }}</option>
                </select>
                <input v-else :id="`int-${c.chave}`" v-model="valores[c.chave]" :placeholder="c.placeholder" class="cfg-campo font-mono" />
                <button type="button" class="h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-600 dark:text-white/60 flex items-center gap-1.5 shrink-0 disabled:opacity-50" :disabled="buscando" @click="buscarDispositivos">
                  <Loader2 v-if="buscando" :size="13" class="animate-spin" /><RefreshCw v-else :size="13" /> Buscar
                </button>
              </div>

              <input v-else :id="`int-${c.chave}`" v-model="valores[c.chave]" :placeholder="c.placeholder" class="cfg-campo" />
              <p v-if="c.ajuda" class="cfg-ajuda">{{ c.ajuda }}</p>
            </div>
            <p v-if="erroDispositivos" class="text-xs text-red-500">{{ erroDispositivos }}</p>
            <p v-if="editando.comoObter" class="text-[11px] text-gray-500 dark:text-white/45 rounded-xl bg-gray-50 dark:bg-white/[0.04] px-3 py-2">Onde achar o token: {{ editando.comoObter }}</p>
            <p v-if="erro" class="text-xs text-red-500 font-bold">{{ erro }}</p>
          </div>

          <div class="px-6 py-4 border-t border-gray-100 dark:border-white/[0.07] flex gap-3">
            <button class="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 text-sm font-black" @click="editando = null">Cancelar</button>
            <button class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-black" :disabled="ocupado" @click="salvar">{{ ocupado ? 'Salvando…' : 'Salvar e ativar' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus, Plug, Trash2, X, Eye, EyeOff, RefreshCw, Loader2 } from 'lucide-vue-next'
import { useIntegracoesStore } from '~/stores/integracoes'
import { useToastStore } from '~/stores/toast'
import { useApi } from '~/services/api'
import { PROVEDORES, provedor, type Provedor } from '~/lib/integracoes'

const mpStore = useIntegracoesStore()
const toast = useToastStore()
const api = useApi()

const SITUACAO = {
  ativa:      { rotulo: 'Ativa',      classe: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  pausada:    { rotulo: 'Pausada',    classe: 'bg-gray-500/15 text-gray-600 dark:text-white/55' },
  incompleta: { rotulo: 'Incompleta', classe: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
} as const

// Chave Pix do restaurante (Admin › Métodos): com ela, o QR já aparece na venda
const pixChave = ref('')

// Mercado Pago tem backend próprio; o Pix vem da chave cadastrada no Admin
const instaladas = computed(() => {
  const lista: { id: string; p: Provedor; situacao: keyof typeof SITUACAO; detalhe: string; link?: string }[] = []
  if (pixChave.value) lista.push({ id: 'pix', p: provedor('pix')!, situacao: 'ativa', detalhe: `Chave ${pixChave.value} · QR na venda direta e no cardápio online`, link: '/admin?aba=metodos' })
  const m = mpStore.mp
  if (!m.token_salvo && !m.ativado) return lista
  const completa = m.token_salvo && !!m.device_id
  return [...lista, {
    id: 'mercadopago_point', p: provedor('mercadopago_point')!,
    situacao: (!completa ? 'incompleta' : m.ativado ? 'ativa' : 'pausada') as keyof typeof SITUACAO,
    detalhe: completa ? `Maquininha ${m.device_id} · token •••• ${m.token_sufixo}` : 'Falta escolher a maquininha',
  }]
})
const instalada = (id: string) => instaladas.value.some(i => i.id === id)

const catalogo = ref(false)
const editando = ref<Provedor | null>(null)
const valores = reactive<Record<string, string>>({})
const ver = reactive<Record<string, boolean>>({})
const ocupado = ref(false)
const erro = ref('')
const dispositivos = ref<any[]>([])
const buscando = ref(false)
const erroDispositivos = ref('')

function escolher(p: Provedor) {
  catalogo.value = false
  if (p.link) { navigateTo(p.link); return }
  if (!p.disponivel) {
    navigateTo({ path: '/suporte', query: { assunto: `Quero a integração com ${p.nome}` } })
    return
  }
  editar(p)
}
function editar(p: Provedor) {
  erro.value = ''; erroDispositivos.value = ''
  for (const c of p.campos) valores[c.chave] = c.tipo === 'segredo' ? '' : (c.chave === 'device_id' ? mpStore.mp.device_id ?? '' : '')
  editando.value = p
}

async function buscarDispositivos() {
  buscando.value = true; erroDispositivos.value = ''
  try {
    // A busca usa o token salvo: salva antes se um token novo foi digitado
    if (valores.access_token?.trim()) await mpStore.salvar({ ativado: mpStore.mp.ativado, access_token: valores.access_token.trim(), device_id: valores.device_id || null })
    const r = await mpStore.listarDispositivos()
    dispositivos.value = r?.devices ?? []
    if (!dispositivos.value.length) erroDispositivos.value = 'Nenhuma maquininha encontrada nesta conta'
  } catch (e: any) { erroDispositivos.value = e?.message || 'Erro ao buscar maquininhas' }
  finally { buscando.value = false }
}

async function recarregar() { mpStore.carregado = false; await mpStore.carregar() }

async function salvar() {
  if (!editando.value) return
  if (!mpStore.mp.token_salvo && !valores.access_token?.trim()) { erro.value = 'Informe o Access Token'; return }
  if (!valores.device_id?.trim()) { erro.value = 'Escolha a maquininha'; return }
  ocupado.value = true; erro.value = ''
  try {
    await mpStore.salvar({ ativado: true, access_token: valores.access_token?.trim() || undefined, device_id: valores.device_id.trim() })
    await recarregar()
    toast.success('Integração ativa', 'As cobranças podem ser enviadas para a maquininha.')
    editando.value = null
  } catch (e: any) { erro.value = e?.message || 'Erro ao salvar' }
  finally { ocupado.value = false }
}

async function pausar(i: any) {
  ocupado.value = true
  try { await mpStore.salvar({ ativado: i.situacao !== 'ativa', device_id: mpStore.mp.device_id }); await recarregar() }
  catch (e: any) { toast.error(e?.message || 'Erro ao alterar') }
  finally { ocupado.value = false }
}

async function remover(i: any) {
  if (!confirm(`Remover ${i.p.nome}? O token salvo é apagado e as cobranças voltam a ser feitas na maquininha à parte.`)) return
  ocupado.value = true
  try { await api.delete('/integracoes/mp'); await recarregar(); toast.success('Integração removida') }
  catch (e: any) { toast.error(e?.message || 'Erro ao remover') }
  finally { ocupado.value = false }
}

onMounted(() => {
  mpStore.carregar()
  api.get<{ chave?: string }>('/pagamentos/pix').then(r => { pixChave.value = r?.chave ?? '' }).catch(() => {})
})
</script>

<style scoped>
.cfg-rotulo { display: block; margin-bottom: 0.4rem; font-size: 10px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: var(--txt-2); }
.cfg-ajuda { margin-top: 0.3rem; font-size: 11px; color: var(--txt-3); }
.cfg-campo { width: 100%; height: 2.5rem; padding: 0 0.85rem; border-radius: 0.75rem; font-size: 0.85rem; outline: none; background: var(--sup-elevado); border: 1px solid var(--linha); color: var(--txt); }
.cfg-campo::placeholder { color: var(--txt-3); }
.cfg-campo:focus { border-color: rgb(249 115 22 / 0.6); }
.cfg-campo option { background: var(--sup-cartao); color: var(--txt); }
.cfg-icone { height: 2rem; width: 2rem; border-radius: 0.6rem; display: inline-flex; align-items: center; justify-content: center; color: var(--txt-2); }
.cfg-icone:hover { background: var(--sup-elevado); color: var(--txt); }
</style>
