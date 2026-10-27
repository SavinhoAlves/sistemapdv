<template>
  <!-- Modo local (Host): IP do Host e terminais autorizados por IP fixo -->
  <div class="space-y-5">
    <!-- Situação da rede -->
    <div class="rounded-2xl border p-4 text-sm" :class="rede?.bloqueado ? 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' : 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'">
      <p class="font-black flex items-center gap-2">
        <component :is="rede?.bloqueado ? ShieldAlert : ShieldCheck" :size="16" />
        {{ rede?.bloqueado ? 'Sistema bloqueado para os terminais' : 'Rede do Host conferida' }}
      </p>
      <p v-if="rede?.motivo" class="mt-1 text-xs">{{ rede.motivo }}</p>
      <p v-else class="mt-1 text-xs">Só este Host e os IPs abaixo acessam o sistema. O Firewall do Windows segue a mesma lista.</p>
    </div>

    <!-- IP do Host -->
    <div class="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-5 space-y-3">
      <div class="flex items-center gap-2"><Server :size="16" class="text-orange-500" /><h3 class="text-sm font-black text-gray-900 dark:text-white">IP deste Host</h3></div>
      <p class="text-xs text-gray-500 dark:text-white/50">IP fixo configurado no Windows deste computador. Se o Host ligar com outro IP, o sistema bloqueia os terminais até você confirmar aqui.</p>
      <div v-if="rede?.noHost" class="flex flex-wrap items-center gap-2">
        <select v-model="hostIp" class="h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-sm font-mono">
          <option v-for="ip in rede.ipsDoHost" :key="ip" :value="ip">{{ ip }}</option>
        </select>
        <button type="button" class="h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black disabled:opacity-50" :disabled="!hostIp || salvando" @click="salvarHost">
          {{ rede.hostIp === hostIp ? 'Confirmar' : 'Usar este IP' }}
        </button>
        <span class="text-xs text-gray-500 dark:text-white/50">Atual: <b class="font-mono">{{ rede.hostIp || 'não configurado' }}</b></span>
      </div>
      <p v-else class="text-xs font-bold text-amber-600 dark:text-amber-400">O IP do Host só pode ser alterado no próprio Host.</p>
    </div>

    <!-- Terminais -->
    <div class="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-2xl p-5 space-y-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2"><Monitor :size="16" class="text-orange-500" /><h3 class="text-sm font-black text-gray-900 dark:text-white">Terminais autorizados</h3></div>
        <button type="button" class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black flex items-center gap-1.5" @click="abrir()"><Plus :size="13" /> Novo terminal</button>
      </div>
      <p v-if="!terminais.length" class="text-sm text-gray-500 dark:text-white/50">Nenhum terminal cadastrado: só este Host acessa o sistema.</p>
      <div v-for="t in terminais" :key="t.id" class="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-white/[0.06] px-3.5 py-2.5">
        <span class="font-mono text-sm font-black text-gray-900 dark:text-white w-28 shrink-0">{{ t.ip }}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ t.nome }}</p>
          <p class="text-[11px] text-gray-500 dark:text-white/40">{{ FUNCOES[t.funcao] }}{{ t.ativo ? '' : ' · desativado' }}</p>
        </div>
        <button type="button" class="size-8 rounded-lg grid place-items-center text-gray-400 hover:text-orange-500" :aria-label="`Editar ${t.nome}`" @click="abrir(t)"><Pencil :size="14" /></button>
        <button type="button" class="size-8 rounded-lg grid place-items-center text-gray-400 hover:text-red-500" :aria-label="`Remover ${t.nome}`" @click="remover(t)"><Trash2 :size="14" /></button>
      </div>

      <!-- Formulário -->
      <form v-if="form" class="grid sm:grid-cols-[8rem_1fr_10rem_auto] gap-2 items-end border-t border-gray-100 dark:border-white/[0.06] pt-3" @submit.prevent="salvar">
        <label class="grid gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">IP
          <input v-model="form.ip" placeholder="10.0.0.3" class="h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-sm font-mono normal-case tracking-normal" />
        </label>
        <label class="grid gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Nome
          <input v-model="form.nome" placeholder="Caixa 2" class="h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-sm normal-case tracking-normal" />
        </label>
        <label class="grid gap-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Função
          <select v-model="form.funcao" class="h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-sm normal-case tracking-normal">
            <option v-for="(rotulo, valor) in FUNCOES" :key="valor" :value="valor">{{ rotulo }}</option>
          </select>
        </label>
        <div class="flex gap-2">
          <button type="button" class="h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-500 dark:text-white/60" @click="form = null">Cancelar</button>
          <button type="submit" class="h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black disabled:opacity-50" :disabled="salvando">Salvar</button>
        </div>
        <label v-if="form.id" class="sm:col-span-4 flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-white/60">
          <input v-model="form.ativo" type="checkbox" class="size-4 accent-orange-500" /> Ativo (desmarque para bloquear sem apagar)
        </label>
        <p v-if="erro" class="sm:col-span-4 text-sm font-bold text-red-500" role="alert">{{ erro }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Server, Monitor, Plus, Pencil, Trash2, ShieldCheck, ShieldAlert } from 'lucide-vue-next'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'

const FUNCOES: Record<string, string> = { caixa: 'Caixa (venda direta)', garcom: 'Garçom (mesas)', cozinha: 'Cozinha', app: 'App do garçom (celular)' }

const api = useApi()
const toast = useToastStore()
const rede = ref<any>(null)
const terminais = ref<any[]>([])
const hostIp = ref('')
const form = ref<any>(null)
const erro = ref('')
const salvando = ref(false)

async function carregar() {
  try {
    rede.value = await api.get('/terminais/rede')
    hostIp.value = rede.value?.hostIp && rede.value.ipsDoHost?.includes(rede.value.hostIp) ? rede.value.hostIp : rede.value?.ipsDoHost?.[0] ?? ''
    terminais.value = await api.get<any[]>('/terminais')
  } catch (e: any) { toast.error(e?.message || 'Erro ao carregar terminais') }
}

async function salvarHost() {
  salvando.value = true
  try { rede.value = { ...rede.value, ...(await api.put('/terminais/host', { ip: hostIp.value })) }; toast.success(`IP do Host: ${hostIp.value}`) }
  catch (e: any) { toast.error(e?.message || 'Não deu para salvar o IP do Host') }
  finally { salvando.value = false }
}

function abrir(t?: any) {
  erro.value = ''
  form.value = t ? { id: t.id, ip: t.ip, nome: t.nome, funcao: t.funcao, ativo: t.ativo } : { ip: '', nome: '', funcao: 'caixa', ativo: true }
}

async function salvar() {
  erro.value = ''; salvando.value = true
  const { id, ...dados } = form.value
  try {
    if (id) await api.put(`/terminais/${id}`, dados)
    else await api.post('/terminais', dados)
    form.value = null
    toast.success('Terminal salvo')
    await carregar()
  } catch (e: any) { erro.value = e?.message || 'Não deu para salvar' }
  finally { salvando.value = false }
}

async function remover(t: any) {
  if (!confirm(`Remover ${t.nome} (${t.ip})? Ele perde o acesso na hora.`)) return
  try { await api.delete(`/terminais/${t.id}`); await carregar() } catch (e: any) { toast.error(e?.message || 'Erro ao remover') }
}

onMounted(carregar)
</script>
