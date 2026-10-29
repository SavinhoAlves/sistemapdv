<template>
  <div class="space-y-4">
    <!-- Barra: busca, filtro por função, novo -->
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-[12rem] max-w-sm">
        <Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30" />
        <input v-model="busca" type="search" placeholder="Buscar por nome, código ou usuário" aria-label="Buscar funcionário" class="adm-campo !pl-9" />
      </div>
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por função">
        <button v-for="f in [{ valor: '', rotulo: 'Todas' }, ...FUNCOES]" :key="f.valor"
          class="h-9 px-3 rounded-xl text-xs font-bold border transition-all"
          :class="filtroFuncao === f.valor ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-gray-900' : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white'"
          :aria-pressed="filtroFuncao === f.valor" @click="filtroFuncao = f.valor">
          {{ f.rotulo }} <span class="opacity-70 tabular-nums">{{ contar(f.valor) }}</span>
        </button>
      </div>
      <label class="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-white/50 ml-1 cursor-pointer">
        <input v-model="mostrarInativos" type="checkbox" class="accent-orange-500" /> Mostrar inativos
      </label>
      <button class="ml-auto h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black flex items-center gap-1.5" @click="abrir(null)">
        <Plus :size="14" /> Novo funcionário
      </button>
    </div>

    <!-- Lista -->
    <div class="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-2xl overflow-hidden">
      <div v-if="carregando" class="p-8 text-center text-sm text-gray-400 dark:text-white/40">Carregando…</div>
      <div v-else-if="!lista.length" class="p-10 text-center">
        <p class="text-sm font-bold text-gray-700 dark:text-white/80">{{ funcionarios.length ? 'Ninguém com esses filtros' : 'Nenhum funcionário cadastrado' }}</p>
        <p class="text-xs text-gray-400 dark:text-white/40 mt-1">{{ funcionarios.length ? 'Ajuste a busca ou a função.' : 'Cadastre quem vai usar o sistema e escolha a função de cada um.' }}</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm min-w-[800px]">
          <thead class="bg-gray-50 dark:bg-white/[0.03]">
            <tr class="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">
              <th class="px-5 py-3 text-left">Funcionário</th>
              <th class="px-4 py-3 text-left">Função e permissões</th>
              <th class="px-4 py-3 text-left">Entra com</th>
              <th class="px-4 py-3 text-left">Último acesso</th>
              <th class="px-4 py-3 text-center">Ativo</th>
              <th class="px-4 py-3 text-center">QR celular</th>
              <th class="px-5 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in lista" :key="f.id" class="border-t border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.03]" :class="f.ativo ? '' : 'opacity-55'">
              <td class="px-5 py-3">
                <div class="flex items-center gap-3">
                  <span class="size-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0" :class="funcao(f.cargo)?.cor">{{ iniciais(f.nome) }}</span>
                  <div class="min-w-0">
                    <p class="font-bold text-gray-900 dark:text-white truncate">{{ f.nome }}<span v-if="f.id === authStore.usuario?.id" class="ml-1.5 text-[10px] font-black text-orange-500">você</span></p>
                    <p v-if="f.email" class="text-[11px] text-gray-400 dark:text-white/40 truncate">{{ f.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="text-[11px] font-black px-2 py-0.5 rounded-full" :class="funcao(f.cargo)?.cor">{{ funcao(f.cargo)?.rotulo ?? f.cargo }}</span>
                <p class="text-[11px] text-gray-400 dark:text-white/40 mt-1">{{ f.perfil ? `Perfil: ${f.perfil.nome}` : 'Permissões padrão da função' }}</p>
              </td>
              <td class="px-4 py-3">
                <p class="font-mono font-black text-gray-900 dark:text-white">{{ f.codigoAcesso }}</p>
                <p class="text-[11px] text-gray-400 dark:text-white/40">
                  {{ [f.login, f.cartaoRfid ? 'cartão RFID' : ''].filter(Boolean).join(' · ') || 'só o código' }}
                </p>
              </td>
              <td class="px-4 py-3 text-xs text-gray-500 dark:text-white/50 whitespace-nowrap">{{ f.ultimoLogin ? relativo(f.ultimoLogin) : 'nunca entrou' }}</td>
              <td class="px-4 py-3 text-center">
                <button role="switch" :aria-checked="f.ativo" :aria-label="`${f.ativo ? 'Desativar' : 'Ativar'} ${f.nome}`"
                  :disabled="f.id === authStore.usuario?.id"
                  class="w-10 h-5 rounded-full relative transition-colors disabled:opacity-40"
                  :class="f.ativo ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/15'" @click="alternarAtivo(f)">
                  <span class="absolute top-0.5 size-4 rounded-full bg-white shadow transition-all" :class="f.ativo ? 'left-[22px]' : 'left-0.5'" />
                </button>
              </td>
              <td class="px-4 py-3 text-center">
                <button v-if="f.cargo !== 'administrador' && f.ativo" class="adm-icone mx-auto" title="QR de acesso pelo celular" :aria-label="`QR de acesso de ${f.nome}`" @click="emit('qr', f)"><QrCode :size="14" /></button>
                <span v-else class="text-gray-300 dark:text-white/20" :title="f.ativo ? 'O administrador entra pelo login' : 'Funcionário inativo'">—</span>
              </td>
              <td class="px-5 py-3 text-right">
                <button class="h-8 px-3 rounded-lg text-xs font-black text-gray-600 dark:text-white/60 hover:bg-gray-100 dark:hover:bg-white/[0.06]" @click="abrir(f)">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="modal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="modal = false">
        <div class="bg-white dark:bg-[#161b26] border border-gray-200 dark:border-white/[0.08] rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]" role="dialog" aria-modal="true" :aria-label="form.id ? 'Editar funcionário' : 'Novo funcionário'">
          <div class="flex items-center justify-between px-6 pt-6 pb-4">
            <div>
              <h2 class="text-lg font-black text-gray-900 dark:text-white">{{ form.id ? 'Editar funcionário' : 'Novo funcionário' }}</h2>
              <p v-if="form.codigoAcesso" class="text-xs text-gray-500 dark:text-white/45 mt-0.5">Código de acesso <b class="font-mono text-gray-900 dark:text-white">{{ form.codigoAcesso }}</b></p>
            </div>
            <button class="adm-icone" aria-label="Fechar" @click="modal = false"><X :size="16" /></button>
          </div>

          <div class="flex-1 overflow-y-auto px-6 pb-4 space-y-6">
            <!-- Identificação -->
            <section class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="block sm:col-span-2">
                <span class="adm-rotulo">Nome *</span>
                <input v-model="form.nome" type="text" placeholder="Nome completo" class="adm-campo" />
              </label>
              <label class="block">
                <span class="adm-rotulo">Nome de usuário</span>
                <input v-model="form.login" type="text" placeholder="ex.: joao" autocapitalize="none" autocomplete="off" spellcheck="false" class="adm-campo" />
                <span class="adm-ajuda">Opcional. Entra com ele ou com o código{{ form.codigoAcesso ? ` ${form.codigoAcesso}` : ', gerado ao salvar' }}.</span>
              </label>
              <label class="block">
                <span class="adm-rotulo">{{ form.id ? 'Nova senha' : 'Senha' }}</span>
                <input v-model="form.senha" type="password" :placeholder="form.id ? 'Deixe vazio para manter' : '••••••••'" autocomplete="new-password" class="adm-campo" />
              </label>
              <label class="block">
                <span class="adm-rotulo">E-mail</span>
                <input v-model="form.email" type="email" placeholder="email@exemplo.com" class="adm-campo" />
              </label>
              <label class="block">
                <span class="adm-rotulo">Cartão RFID</span>
                <div class="flex gap-2">
                  <input v-model="form.cartaoRfid" type="text" placeholder="Clique e passe o cartão no leitor" class="adm-campo font-mono" />
                  <button v-if="form.cartaoRfid" type="button" class="adm-icone border border-gray-200 dark:border-white/10 !h-10 !w-10 shrink-0" aria-label="Remover cartão" @click="form.cartaoRfid = ''"><X :size="14" /></button>
                </div>
              </label>
              <label class="block">
                <span class="adm-rotulo">PIN do celular</span>
                <div class="flex gap-2">
                  <input v-model="form.pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"
                    :placeholder="form.temPin && !form.removerPin ? 'Definido. Digite para trocar' : '4 a 6 números'"
                    class="adm-campo font-mono tracking-widest" @input="form.pin = form.pin.replace(/\D/g, ''); form.removerPin = false" />
                  <button v-if="form.temPin && !form.removerPin && !form.pin" type="button" class="adm-icone border border-gray-200 dark:border-white/10 !h-10 !w-10 shrink-0" aria-label="Remover PIN" @click="form.removerPin = true"><X :size="14" /></button>
                </div>
                <span class="adm-ajuda">{{ form.removerPin ? 'O PIN será removido ao salvar.' : 'Confirma as ações no celular, onde não há leitor de cartão.' }}</span>
              </label>
            </section>

            <!-- Dados pessoais (aparecem em Meu perfil) -->
            <section>
              <p class="adm-rotulo mb-2">Dados pessoais</p>
              <div class="grid grid-cols-1 sm:grid-cols-6 gap-3">
                <label class="block sm:col-span-2">
                  <span class="adm-rotulo">CPF</span>
                  <input :value="form.cpf" inputmode="numeric" placeholder="000.000.000-00" class="adm-campo font-mono" @input="form.cpf = cpfBR(($event.target as HTMLInputElement).value)" />
                </label>
                <label class="block sm:col-span-2">
                  <span class="adm-rotulo">Nascimento</span>
                  <input v-model="form.nascimento" type="date" class="adm-campo" />
                </label>
                <label class="block sm:col-span-2">
                  <span class="adm-rotulo">Telefone</span>
                  <input :value="form.telefone" inputmode="tel" placeholder="(00) 00000-0000" class="adm-campo font-mono" @input="form.telefone = telefoneBR(($event.target as HTMLInputElement).value)" />
                </label>
                <label class="block sm:col-span-2">
                  <span class="adm-rotulo">CEP</span>
                  <input :value="form.cep" inputmode="numeric" placeholder="00000-000" class="adm-campo font-mono" @input="form.cep = cepBR(($event.target as HTMLInputElement).value)" />
                </label>
                <label class="block sm:col-span-4">
                  <span class="adm-rotulo">Endereço</span>
                  <input v-model="form.endereco" type="text" placeholder="Rua, número, complemento, bairro" class="adm-campo" />
                </label>
                <label class="block sm:col-span-4">
                  <span class="adm-rotulo">Cidade</span>
                  <input v-model="form.cidade" type="text" class="adm-campo" />
                </label>
                <label class="block sm:col-span-2">
                  <span class="adm-rotulo">UF</span>
                  <input v-model="form.uf" type="text" maxlength="2" placeholder="RJ" class="adm-campo uppercase" @input="form.uf = form.uf.replace(/[^a-z]/gi, '').toUpperCase()" />
                </label>
              </div>
            </section>

            <!-- Função -->
            <section>
              <p class="adm-rotulo">Função *</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button v-for="f in FUNCOES" :key="f.valor" type="button"
                  class="text-left p-3 rounded-xl border-2 transition-all"
                  :class="form.cargo === f.valor ? 'border-orange-500 bg-orange-500/[0.07]' : 'border-gray-200 dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/20'"
                  :aria-pressed="form.cargo === f.valor" @click="form.cargo = f.valor">
                  <p class="text-sm font-black text-gray-900 dark:text-white">{{ f.rotulo }}</p>
                  <p class="text-[11px] text-gray-500 dark:text-white/50 mt-0.5 leading-snug">{{ f.descricao }}</p>
                  <p class="text-[10px] text-gray-400 dark:text-white/35 mt-1">Abre em: {{ f.inicio }}</p>
                </button>
              </div>
            </section>

            <!-- Permissões -->
            <section>
              <p class="adm-rotulo">Permissões</p>
              <select v-model="form.perfilId" class="adm-campo" aria-label="Perfil de permissões">
                <option :value="null">Padrão da função{{ form.cargo ? ` (${funcao(form.cargo)?.rotulo})` : '' }}</option>
                <option v-for="p in perfis" :key="p.id" :value="p.id">Perfil: {{ p.nome }}</option>
              </select>
              <p class="adm-ajuda">Um perfil troca as permissões da função por uma combinação própria. Crie perfis na aba "Cargos e permissões".</p>

              <div v-if="form.cargo" class="mt-3 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06] p-3">
                <p class="text-[11px] font-bold text-gray-500 dark:text-white/45 mb-2">Com isso, {{ form.nome.split(' ')[0] || 'a pessoa' }} pode:</p>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="p in permitidas" :key="p" class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">{{ rotuloPermissao(p) }}</span>
                  <span v-if="!permitidas.length" class="text-[11px] text-gray-400 dark:text-white/35 italic">nenhuma ação liberada</span>
                </div>
              </div>
            </section>

            <p v-if="erro" class="text-xs text-red-500 font-bold">{{ erro }}</p>
          </div>

          <div class="px-6 py-4 border-t border-gray-100 dark:border-white/[0.07] flex gap-3">
            <button class="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60 text-sm font-black hover:bg-gray-50 dark:hover:bg-white/5" @click="modal = false">Cancelar</button>
            <button class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-sm font-black" :disabled="salvando" @click="salvar">{{ salvando ? 'Salvando…' : 'Salvar' }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { agoraServidor } from '~/lib/relogio'
import { ref, reactive, computed } from 'vue'
import { Search, Plus, QrCode, X } from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'
import { useAuthStore } from '~/stores/auth'
import { FUNCOES, funcao, efetivas, rotuloPermissao, TODAS_PERMISSOES } from '~/lib/permissoes'
import { cpfBR, telefoneBR, cepBR } from '~/lib/documento'

const props = defineProps<{ funcionarios: any[]; perfis: any[]; padroes: Record<string, Record<string, boolean>>; carregando: boolean }>()
const emit = defineEmits<{ (e: 'recarregar'): void; (e: 'qr', f: any): void }>()

const api = useApi()
const toast = useToastStore()
const authStore = useAuthStore()

// ── Lista ──
const busca = ref('')
const filtroFuncao = ref('')
const mostrarInativos = ref(false)
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const contar = (v: string) => props.funcionarios.filter(f => (mostrarInativos.value || f.ativo) && (!v || f.cargo === v)).length
const lista = computed(() => {
  const q = semAcento(busca.value.trim())
  return props.funcionarios
    .filter(f => mostrarInativos.value || f.ativo)
    .filter(f => !filtroFuncao.value || f.cargo === filtroFuncao.value)
    .filter(f => !q || [f.nome, f.codigoAcesso, f.login ?? '', f.email ?? ''].some(v => semAcento(String(v)).includes(q)))
})
const iniciais = (n: string) => n.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase()
function relativo(iso: string) {
  const min = Math.max(0, Math.round((agoraServidor() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  if (min < 1440) return `há ${Math.round(min / 60)} h`
  const d = Math.round(min / 1440)
  return d < 30 ? `há ${d} dia${d === 1 ? '' : 's'}` : new Date(iso).toLocaleDateString('pt-BR')
}

/** Desativar é o "excluir" do sistema: a pessoa não entra mais e o histórico continua no nome dela. */
async function alternarAtivo(f: any) {
  if (f.ativo && !confirm(`Desativar ${f.nome}? A pessoa não consegue mais entrar; o histórico de vendas continua no nome dela.`)) return
  f.ativo = !f.ativo
  try { await api.patch(`/usuarios/${f.id}/ativo`, { ativo: f.ativo }) }
  catch (e: any) { f.ativo = !f.ativo; toast.error(e?.message || 'Erro ao alterar status') }
}
// ── Modal ──
const modal = ref(false)
const salvando = ref(false)
const erro = ref('')
const PESSOAIS_VAZIO = { cpf: '', nascimento: '', telefone: '', cep: '', endereco: '', cidade: '', uf: '' }
const VAZIO = { id: null as string | null, codigoAcesso: '', nome: '', login: '', email: '', senha: '', cartaoRfid: '', pin: '', temPin: false, removerPin: false, cargo: '', perfilId: null as string | null, ...PESSOAIS_VAZIO }
const form = reactive({ ...VAZIO })

function abrir(f: any) {
  erro.value = ''
  Object.assign(form, f
    ? { id: f.id, codigoAcesso: f.codigoAcesso || '', nome: f.nome, login: f.login || '', email: f.email || '', senha: '', cartaoRfid: f.cartaoRfid || '', pin: '', temPin: Boolean(f.temPin), removerPin: false, cargo: f.cargo, perfilId: f.perfilId || null,
        cpf: cpfBR(f.cpf), nascimento: f.nascimento?.slice(0, 10) ?? '', telefone: telefoneBR(f.telefone), cep: cepBR(f.cep), endereco: f.endereco || '', cidade: f.cidade || '', uf: f.uf || '' }
    : { ...VAZIO })
  modal.value = true
}

const permitidas = computed(() => {
  const perfil = props.perfis.find(p => p.id === form.perfilId)?.permissoes
  const ef = efetivas(props.padroes[form.cargo], perfil)
  return TODAS_PERMISSOES.map(p => p.chave).filter(k => ef[k])
})

async function salvar() {
  if (!form.nome.trim()) { erro.value = 'Informe o nome'; return }
  if (!form.cargo) { erro.value = 'Escolha a função'; return }
  if (!form.id && !form.senha && !form.cartaoRfid.trim()) { erro.value = 'Defina uma senha ou um cartão RFID para a pessoa entrar'; return }
  if (form.pin && !/^\d{4,6}$/.test(form.pin)) { erro.value = 'O PIN deve ter de 4 a 6 números'; return }
  salvando.value = true; erro.value = ''
  try {
    const payload = {
      nome: form.nome.trim(), login: form.login.trim().toLowerCase() || null, email: form.email.trim() || null,
      cargo: form.cargo, cartaoRfid: form.cartaoRfid.trim() || null, perfilId: form.perfilId || null,
      cpf: form.cpf, nascimento: form.nascimento || null, telefone: form.telefone, cep: form.cep,
      endereco: form.endereco.trim(), cidade: form.cidade.trim(), uf: form.uf,
      ...(form.senha ? { senha: form.senha } : {}),
      ...(form.pin ? { pin: form.pin } : form.removerPin ? { pin: null } : {}),
    }
    if (form.id) await api.put(`/usuarios/${form.id}`, payload)
    else await api.post('/usuarios', payload)
    toast.success(form.id ? 'Funcionário atualizado' : 'Funcionário cadastrado', form.id ? undefined : 'O código de acesso aparece na lista.')
    modal.value = false
    emit('recarregar')
  } catch (e: any) { erro.value = e?.message || 'Erro ao salvar' }
  finally { salvando.value = false }
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
.adm-campo option { background: var(--sup-cartao); color: var(--txt); }
.adm-icone { height: 2rem; width: 2rem; border-radius: 0.6rem; display: inline-flex; align-items: center; justify-content: center; color: var(--txt-2); }
.adm-icone:hover { background: var(--sup-elevado); color: var(--txt); }
</style>
