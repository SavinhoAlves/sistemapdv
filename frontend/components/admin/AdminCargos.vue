<template>
  <div class="space-y-8">
    <!-- Como funciona -->
    <div class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] p-4 text-sm text-gray-600 dark:text-white/60 leading-relaxed">
      Toda pessoa tem uma <b class="text-gray-900 dark:text-white">função</b>, que define a tela inicial e as permissões padrão.
      Quando alguém precisa de uma combinação diferente (ex.: um caixa que não pode estornar), crie um
      <b class="text-gray-900 dark:text-white">perfil</b> e escolha-o no cadastro da pessoa: o perfil substitui as permissões da função.
    </div>

    <!-- Funções -->
    <section>
      <h2 class="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-white/45 mb-3">Funções</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <article v-for="f in FUNCOES" :key="f.valor" class="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4 flex flex-col">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[11px] font-black px-2 py-0.5 rounded-full" :class="f.cor">{{ f.rotulo }}</span>
            <span class="text-[11px] text-gray-400 dark:text-white/40 tabular-nums">{{ qtdFuncao(f.valor) }} pessoa{{ qtdFuncao(f.valor) === 1 ? '' : 's' }}</span>
          </div>
          <p class="text-xs text-gray-600 dark:text-white/60 mt-2 leading-snug">{{ f.descricao }}</p>
          <ul class="mt-3 space-y-1 text-[11px]">
            <li v-for="p in TODAS_PERMISSOES" :key="p.chave" v-show="padroes[f.valor]?.[p.chave]" class="flex items-start gap-1.5 text-gray-700 dark:text-white/70">
              <Check :size="12" class="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />{{ p.rotulo }}
            </li>
          </ul>
        </article>
      </div>
    </section>

    <!-- Perfis -->
    <section>
      <div class="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 class="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-white/45">Perfis personalizados</h2>
          <p class="text-[11px] text-gray-400 dark:text-white/40 mt-0.5">Opcionais. Use quando a função não serve do jeito que é.</p>
        </div>
        <button class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black flex items-center gap-1.5" @click="abrir(null)">
          <Plus :size="14" /> Novo perfil
        </button>
      </div>

      <div v-if="!perfis.length" class="rounded-2xl border border-dashed border-gray-300 dark:border-white/15 p-8 text-center">
        <p class="text-sm font-bold text-gray-700 dark:text-white/75">Nenhum perfil criado</p>
        <p class="text-xs text-gray-400 dark:text-white/40 mt-1">Todos usam as permissões da própria função.</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <article v-for="p in perfis" :key="p.id" class="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-black text-gray-900 dark:text-white">{{ p.nome }}</p>
              <p v-if="p.descricao" class="text-[11px] text-gray-500 dark:text-white/45 mt-0.5">{{ p.descricao }}</p>
              <p class="text-[11px] text-gray-400 dark:text-white/40 mt-0.5 tabular-nums">
                {{ p.totalUsuarios ?? 0 }} pessoa{{ p.totalUsuarios === 1 ? '' : 's' }} · {{ MODOS_VENDA.find(m => m.valor === (p.permissoes?.modo_venda || 'ambos'))?.rotulo }}
              </p>
            </div>
            <div class="flex gap-1 shrink-0">
              <button class="adm-icone" :aria-label="`Editar perfil ${p.nome}`" @click="abrir(p)"><Pencil :size="14" /></button>
              <button class="adm-icone hover:!text-red-500" :aria-label="`Excluir perfil ${p.nome}`" @click="excluir(p)"><Trash2 :size="14" /></button>
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5 mt-3">
            <span v-for="k in ativas(p)" :key="k" class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">{{ rotuloPermissao(k) }}</span>
            <span v-if="!ativas(p).length" class="text-[11px] italic text-gray-400 dark:text-white/35">nenhuma ação liberada</span>
          </div>
        </article>
      </div>
    </section>

    <!-- Modal do perfil -->
    <Teleport to="body">
      <div v-if="modal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="modal = false">
        <div class="bg-white dark:bg-[#161b26] border border-gray-200 dark:border-white/[0.08] rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh]" role="dialog" aria-modal="true" :aria-label="form.id ? 'Editar perfil' : 'Novo perfil'">
          <div class="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 class="text-lg font-black text-gray-900 dark:text-white">{{ form.id ? 'Editar perfil' : 'Novo perfil' }}</h2>
            <button class="adm-icone" aria-label="Fechar" @click="modal = false"><X :size="16" /></button>
          </div>

          <div class="flex-1 overflow-y-auto px-6 pb-4 space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="block">
                <span class="adm-rotulo">Nome *</span>
                <input v-model="form.nome" type="text" placeholder="Ex.: Caixa sem estorno" class="adm-campo" />
              </label>
              <label class="block">
                <span class="adm-rotulo">Descrição</span>
                <input v-model="form.descricao" type="text" placeholder="Para quem é este perfil" class="adm-campo" />
              </label>
            </div>

            <div v-if="!form.id">
              <span class="adm-rotulo">Começar a partir de</span>
              <div class="flex flex-wrap gap-1.5">
                <button v-for="f in FUNCOES" :key="f.valor" type="button"
                  class="h-8 px-3 rounded-lg text-xs font-bold border transition-all"
                  :class="base === f.valor ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 hover:border-orange-400/50'"
                  @click="partirDe(f.valor)">{{ f.rotulo }}</button>
              </div>
              <span class="adm-ajuda">Copia as permissões da função; depois ajuste abaixo.</span>
            </div>

            <div>
              <span class="adm-rotulo">Onde vende</span>
              <div class="grid grid-cols-3 gap-2">
                <button v-for="m in MODOS_VENDA" :key="m.valor" type="button"
                  class="h-9 rounded-xl text-xs font-black border transition-all"
                  :class="form.modo_venda === m.valor ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-white/50 hover:border-orange-400/50'"
                  @click="form.modo_venda = m.valor">{{ m.rotulo }}</button>
              </div>
            </div>

            <div v-for="g in GRUPOS_PERMISSOES" :key="g.grupo">
              <p class="adm-rotulo">{{ g.grupo }}</p>
              <div class="space-y-1">
                <button v-for="i in g.itens" :key="i.chave" type="button" role="switch" :aria-checked="form.permissoes[i.chave]"
                  class="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left transition-all"
                  :class="form.permissoes[i.chave] ? 'bg-orange-500/[0.08] border-orange-500/30' : 'border-gray-100 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.04]'"
                  @click="form.permissoes[i.chave] = !form.permissoes[i.chave]">
                  <span>
                    <span class="block text-xs font-bold" :class="form.permissoes[i.chave] ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-white/50'">{{ i.rotulo }}</span>
                    <span v-if="i.ajuda" class="block text-[10px] text-gray-400 dark:text-white/35">{{ i.ajuda }}</span>
                  </span>
                  <span class="w-9 h-5 rounded-full relative shrink-0 transition-colors" :class="form.permissoes[i.chave] ? 'bg-orange-500' : 'bg-gray-200 dark:bg-white/10'">
                    <span class="absolute top-0.5 size-4 rounded-full bg-white shadow transition-all" :class="form.permissoes[i.chave] ? 'left-[18px]' : 'left-0.5'" />
                  </span>
                </button>
              </div>
            </div>

            <p v-if="erro" class="text-xs text-red-500 font-bold">{{ erro }}</p>
          </div>

          <div class="px-6 py-4 border-t border-gray-100 dark:border-white/[0.07] flex gap-3">
            <button class="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 text-sm font-black hover:bg-gray-50 dark:hover:bg-white/5" @click="modal = false">Cancelar</button>
            <button class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-black" :disabled="salvando" @click="salvar">{{ salvando ? 'Salvando…' : 'Salvar perfil' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'
import { FUNCOES, GRUPOS_PERMISSOES, TODAS_PERMISSOES, MODOS_VENDA, rotuloPermissao, efetivas } from '~/lib/permissoes'

const props = defineProps<{ funcionarios: any[]; perfis: any[]; padroes: Record<string, Record<string, boolean>> }>()
const emit = defineEmits<{ (e: 'recarregar'): void }>()
const api = useApi()
const toast = useToastStore()

const qtdFuncao = (v: string) => props.funcionarios.filter(f => f.ativo && f.cargo === v).length
const ativas = (p: any) => TODAS_PERMISSOES.map(x => x.chave).filter(k => p.permissoes?.[k] === true)

const modal = ref(false)
const salvando = ref(false)
const erro = ref('')
const base = ref('')
const form = reactive({ id: null as string | null, nome: '', descricao: '', modo_venda: 'ambos' as string, permissoes: {} as Record<string, boolean> })

function partirDe(f: string) {
  base.value = f
  form.permissoes = efetivas(props.padroes[f])
}
function abrir(p: any) {
  erro.value = ''
  base.value = ''
  if (p) {
    const { modo_venda, ...perms } = p.permissoes || {}
    Object.assign(form, { id: p.id, nome: p.nome, descricao: p.descricao || '', modo_venda: modo_venda || 'ambos', permissoes: efetivas({}, perms) })
  } else {
    Object.assign(form, { id: null, nome: '', descricao: '', modo_venda: 'ambos' })
    partirDe('caixa')
  }
  modal.value = true
}

async function salvar() {
  if (!form.nome.trim()) { erro.value = 'Dê um nome ao perfil'; return }
  salvando.value = true; erro.value = ''
  try {
    // Todas as chaves explícitas: o perfil define tudo, sem depender do padrão da função
    const payload = { nome: form.nome.trim(), descricao: form.descricao.trim(), permissoes: { ...efetivas({}, form.permissoes), modo_venda: form.modo_venda } }
    if (form.id) await api.perfis.atualizar(form.id, payload)
    else await api.perfis.criar(payload)
    toast.success(form.id ? 'Perfil atualizado' : 'Perfil criado', 'Vale a partir do próximo login de cada pessoa.')
    modal.value = false
    emit('recarregar')
  } catch (e: any) { erro.value = e?.message || 'Erro ao salvar' }
  finally { salvando.value = false }
}

async function excluir(p: any) {
  const n = p.totalUsuarios ?? 0
  if (!confirm(`Excluir o perfil "${p.nome}"?${n ? ` ${n} pessoa${n === 1 ? '' : 's'} volta${n === 1 ? '' : 'm'} para as permissões da própria função.` : ''}`)) return
  try { await api.perfis.excluir(p.id); toast.success('Perfil excluído'); emit('recarregar') }
  catch (e: any) { toast.error(e?.message || 'Erro ao excluir perfil') }
}
</script>

<style scoped>
.adm-rotulo { display: block; margin-bottom: 0.4rem; font-size: 10px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: var(--txt-2); }
.adm-ajuda { display: block; margin-top: 0.3rem; font-size: 11px; color: var(--txt-3); }
.adm-campo {
  width: 100%; height: 2.5rem; padding: 0 0.85rem; border-radius: 0.75rem; font-size: 0.85rem; outline: none;
  background: var(--sup-elevado); border: 1px solid var(--linha); color: var(--txt);
}
.adm-campo::placeholder { color: var(--txt-3); }
.adm-campo:focus { border-color: rgb(249 115 22 / 0.6); }
.adm-icone { height: 2rem; width: 2rem; border-radius: 0.6rem; display: inline-flex; align-items: center; justify-content: center; color: var(--txt-2); }
.adm-icone:hover { background: var(--sup-elevado); color: var(--txt); }
</style>
