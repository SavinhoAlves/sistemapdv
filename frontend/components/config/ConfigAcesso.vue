<template>
  <div class="space-y-4">
    <div v-if="carregando" class="h-40 rounded-2xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
    <p v-else-if="erro" class="text-sm text-red-500">{{ erro }}</p>

    <template v-else-if="a">
      <p class="text-sm text-gray-500 dark:text-white/50">
        {{ a.plano ? 'Recursos do seu plano ' : 'Recursos do seu plano.' }}<b v-if="a.plano" class="text-gray-800 dark:text-white/85">{{ a.plano }}.</b>
        Os incluídos você liga e desliga aqui; para incluir outro, fale com o suporte.
      </p>

      <!-- RFID -->
      <article class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-5">
        <div class="flex items-start gap-4">
          <span class="size-11 rounded-xl flex items-center justify-center shrink-0" :class="a.rfid.disponivel ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-400'"><Nfc :size="20" /></span>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-black text-gray-900 dark:text-white">Cartão RFID</p>
              <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full" :class="selo(a.rfid.disponivel).classe">{{ selo(a.rfid.disponivel).rotulo }}</span>
            </div>
            <p class="text-xs text-gray-500 dark:text-white/50 mt-1 leading-relaxed">
              Funcionários entram e confirmam ações (abrir o PDV de vendas, cancelar item) passando o cartão na leitora.
              O cartão de cada um é cadastrado em Admin → Funcionários. O login por cartão só aparece nos
              aparelhos liberados em Admin → Terminais.
            </p>
          </div>
          <Chave v-if="a.rfid.disponivel" :ligada="a.rfid.ativo" :rotulo="'Cartão RFID'" :ocupado="salvando === 'rfid'" @alternar="alternar('rfid')" />
          <button v-else class="cfg-link" @click="pedir('Cartão RFID')">Quero incluir</button>
        </div>
      </article>

      <!-- Venda pelo celular -->
      <article class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-5">
        <div class="flex items-start gap-4">
          <span class="size-11 rounded-xl flex items-center justify-center shrink-0" :class="a.vendaMobile.disponivel ? 'bg-sky-500/15 text-sky-600 dark:text-sky-300' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-400'"><Smartphone :size="20" /></span>
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <p class="text-sm font-black text-gray-900 dark:text-white">Vendas pelo celular</p>
              <span class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full" :class="selo(a.vendaMobile.disponivel).classe">{{ selo(a.vendaMobile.disponivel).rotulo }}</span>
            </div>
            <p class="text-xs text-gray-500 dark:text-white/50 mt-1 leading-relaxed">
              O garçom lança pedidos e vendas no próprio celular. Você gera um QR para a pessoa, ela lê com o app RestaurantePDV (ou a câmera do celular) e entra já logada.
              Só funciona com o caixa aberto, e o acesso termina quando o caixa fecha.
            </p>
          </div>
          <Chave v-if="a.vendaMobile.disponivel" :ligada="a.vendaMobile.ativa" :rotulo="'Vendas pelo celular'" :ocupado="salvando === 'celular'" @alternar="alternar('celular')" />
          <button v-else class="cfg-link" @click="pedir('Vendas pelo celular')">Quero incluir</button>
        </div>

        <!-- Liberar um celular -->
        <div v-if="a.vendaMobile.disponivel && a.vendaMobile.ativa" class="mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.06]">
          <div v-if="!a.caixaAberto" class="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200">
            <LockKeyhole :size="14" class="shrink-0" /> Abra o caixa (botão na barra superior) para liberar celulares.
          </div>
          <div v-else class="flex flex-wrap items-end gap-2">
            <label class="flex-1 min-w-[12rem]">
              <span class="cfg-rotulo">Liberar o celular de</span>
              <select v-model="escolhido" class="cfg-campo">
                <option value="">Escolha o funcionário</option>
                <option v-for="f in equipe" :key="f.id" :value="f.id">{{ f.nome }} · {{ funcao(f.cargo)?.rotulo }}</option>
              </select>
            </label>
            <button class="h-10 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1.5" :disabled="!escolhido" @click="qr = equipe.find(f => f.id === escolhido) ?? null">
              <QrCode :size="14" /> Gerar QR
            </button>
          </div>
        </div>
      </article>
    </template>

    <QrAcessoCelular :funcionario="qr" @fechar="qr = null" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, defineComponent, h } from 'vue'
import { Nfc, Smartphone, QrCode, LockKeyhole } from 'lucide-vue-next'
import QrAcessoCelular from '~/components/QrAcessoCelular.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'
import { useCaixaStore } from '~/stores/caixa'
import { funcao } from '~/lib/permissoes'

interface Acesso { plano: string | null; rfid: { disponivel: boolean; ativo: boolean }; vendaMobile: { disponivel: boolean; ativa: boolean }; caixaAberto: boolean }

const api = useApi()
const toast = useToastStore()
const caixaStore = useCaixaStore()

/** Chave liga/desliga com rótulo acessível. */
const Chave = defineComponent({
  props: { ligada: Boolean, rotulo: String, ocupado: Boolean },
  emits: ['alternar'],
  setup(p, { emit }) {
    return () => h('button', {
      role: 'switch', 'aria-checked': p.ligada, 'aria-label': p.rotulo, disabled: p.ocupado,
      class: ['shrink-0 w-12 h-6 rounded-full relative transition-colors disabled:opacity-50', p.ligada ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/15'],
      onClick: () => emit('alternar'),
    }, [h('span', { class: ['absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', p.ligada ? 'left-[26px]' : 'left-0.5'] })])
  },
})

const a = ref<Acesso | null>(null)
const carregando = ref(true)
const erro = ref('')
const salvando = ref<'' | 'rfid' | 'celular'>('')
const equipe = ref<any[]>([])
const escolhido = ref('')
const qr = ref<any>(null)

const selo = (incluido: boolean) => incluido
  ? { rotulo: 'No seu plano', classe: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' }
  : { rotulo: 'Fora do plano', classe: 'bg-gray-500/15 text-gray-500 dark:text-white/50' }

async function carregar() {
  try {
    a.value = await api.get<Acesso>('/configuracoes/acesso')
    // O caixa pode ter aberto depois: confia no store, que a barra atualiza
    if (caixaStore.inicializado) a.value.caixaAberto = caixaStore.aberto
  } catch (e: any) { erro.value = e?.message || 'Erro ao carregar o acesso' }
  finally { carregando.value = false }
}

async function alternar(qual: 'rfid' | 'celular') {
  if (!a.value) return
  salvando.value = qual
  const corpo = qual === 'rfid' ? { rfidAtivo: !a.value.rfid.ativo } : { vendaMobileAtiva: !a.value.vendaMobile.ativa }
  try {
    a.value = await api.put<Acesso>('/configuracoes/acesso', corpo)
    toast.success(qual === 'rfid' ? `Cartão RFID ${a.value.rfid.ativo ? 'ligado' : 'desligado'}` : `Vendas pelo celular ${a.value.vendaMobile.ativa ? 'ligadas' : 'desligadas'}`)
  } catch (e: any) { toast.error(e?.message || 'Erro ao salvar') }
  finally { salvando.value = '' }
}

function pedir(recurso: string) { navigateTo({ path: '/suporte', query: { assunto: `Quero incluir ${recurso} no meu plano` } }) }

onMounted(async () => {
  await carregar()
  try { equipe.value = (await api.get<any[]>('/usuarios')).filter(f => f.ativo && f.cargo !== 'administrador') } catch {}
})
watch(() => caixaStore.aberto, (v) => { if (a.value) a.value.caixaAberto = v })
</script>

<style scoped>
.cfg-rotulo { display: block; margin-bottom: 0.4rem; font-size: 10px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: var(--txt-2); }
.cfg-campo { width: 100%; height: 2.5rem; padding: 0 0.85rem; border-radius: 0.75rem; font-size: 0.85rem; outline: none; background: var(--sup-elevado); border: 1px solid var(--linha); color: var(--txt); }
.cfg-campo option { background: var(--sup-cartao); color: var(--txt); }
.cfg-link { flex-shrink: 0; font-size: 0.75rem; font-weight: 900; color: rgb(234 88 12); }
.cfg-link:hover { text-decoration: underline; }
</style>
