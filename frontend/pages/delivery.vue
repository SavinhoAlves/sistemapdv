<template>
  <div class="min-h-screen transition-colors duration-200 com-sidebar">
    <Sidebar />
    <Navbar />

    <main class="p-4 sm:p-6 w-full relative min-h-[calc(100vh-4rem)]">
      <CaixaFechado acao="receber pedidos do cardápio online" />

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div class="flex items-center gap-3">
          <div>
            <h1 class="text-2xl font-black text-gray-900 dark:text-white">Delivery</h1>
            <p class="text-sm text-gray-500 dark:text-white/50 mt-0.5">Pedidos do cardápio online: aceite, acompanhe e conclua</p>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex rounded-xl border border-gray-200 dark:border-white/10 p-1" role="tablist" aria-label="Visualização">
            <button v-for="v in [{ k: 'quadro', r: 'Quadro' }, { k: 'mapa', r: 'Mapa' }]" :key="v.k" role="tab" :aria-selected="visao === v.k"
              class="h-7 px-3 rounded-lg text-xs font-black" :class="visao === v.k ? 'bg-orange-500 text-white' : 'text-gray-500 dark:text-white/50'" @click="trocarVisao(v.k as any)">{{ v.r }}</button>
          </div>
          <!-- Só depois de carregar a configuração: antes disso não dá para dizer se está pausado -->
          <span v-if="cfg" class="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold border"
            :class="cfg?.ativo ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/50'">
            <span class="size-2 rounded-full" :class="cfg?.ativo ? 'bg-emerald-500' : 'bg-gray-400'" />
            {{ cfg?.ativo ? 'Cardápio recebendo pedidos' : 'Cardápio pausado' }}
          </span>
          <NuxtLink to="/configuracoes?secao=delivery" class="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-600 dark:text-white/60 flex items-center gap-1.5 hover:text-gray-900 dark:hover:text-white">
            <Settings :size="13" /> Ajustes e link
          </NuxtLink>
        </div>
      </div>

      <!-- Mapa: entregadores ao vivo, rastro de 30 min e entregas em andamento -->
      <div v-if="visao === 'mapa'" class="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-4">
        <MapaDelivery :marcadores="marcadoresMapa" :rotas="rotasMapa" :rastros="mapaDados?.rastros?.map((r: any) => ({ id: r.entregadorId, pontos: r.pontos })) ?? []" altura="min(70vh, 640px)"
          vazio="Marque o local do restaurante em Configurações → Delivery para ver o mapa" />
        <aside class="space-y-2">
          <h2 class="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-white/45">Entregadores</h2>
          <p v-if="!entregadores.length" class="text-xs text-gray-500 dark:text-white/45">Nenhum entregador cadastrado. Cadastre em Admin → Funcionários com a função Entregador.</p>
          <div v-for="e in entregadores" :key="e.id" class="rounded-xl bg-white dark:bg-[#171c27] border border-gray-200 dark:border-white/[0.07] p-3">
            <p class="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span class="size-2 rounded-full" :class="e.posicao ? 'bg-emerald-500' : 'bg-gray-400'" />{{ e.nome }}
            </p>
            <p class="text-[11px] text-gray-500 dark:text-white/45 mt-0.5">
              {{ e.entregas ? `${e.entregas} entrega${e.entregas === 1 ? '' : 's'}${e.emRota ? ' · em rota' : ' · aguardando sair'}` : 'Livre' }}
              · {{ e.posicao ? `GPS ${ha(e.posicao.em)}` : 'sem GPS' }}
            </p>
          </div>
        </aside>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        <section v-for="col in COLUNAS" :key="col.chave" class="rounded-2xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.07] p-3 min-h-40">
          <h2 class="flex items-center justify-between px-1 pb-2.5 text-xs font-black uppercase tracking-widest" :class="col.cor">
            {{ col.rotulo }} <span class="tabular-nums text-gray-400 dark:text-white/40">{{ porColuna(col.chave).length }}</span>
          </h2>
          <p v-if="!porColuna(col.chave).length" class="text-xs text-gray-400 dark:text-white/35 px-1 py-6 text-center">{{ col.vazio }}</p>

          <article v-for="p in porColuna(col.chave)" :key="p.id"
            class="rounded-xl bg-white dark:bg-[#171c27] border p-3.5 mb-2.5 last:mb-0"
            :class="p.status === 'recebido' ? 'border-orange-500 shadow-lg shadow-orange-500/10' : 'border-gray-200 dark:border-white/[0.07]'">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-black text-gray-900 dark:text-white truncate">{{ p.clienteNome }}</p>
                <p class="text-[11px] text-gray-500 dark:text-white/45">
                  <span class="font-mono font-bold">{{ p.codigo }}</span>
                  · {{ p.tipo === 'entrega' ? 'Entrega' : 'Retirada' }}<template v-if="p.pedidoNumero"> · nº {{ p.pedidoNumero }}</template>
                </p>
              </div>
              <span class="text-[11px] font-bold tabular-nums shrink-0" :class="minutos(p.criadoEm) > 30 && ativo(p) ? 'text-red-500' : 'text-gray-400 dark:text-white/40'">{{ ha(p.criadoEm) }}</span>
            </div>

            <span v-if="col.chave === 'cozinha'" class="inline-block mt-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
              :class="p.etapa === 'pronto' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'">
              {{ p.etapa === 'pronto' ? 'Pronto' : p.etapa === 'preparando' ? 'Em preparo' : 'Na fila da cozinha' }}
            </span>
            <span v-else-if="p.status === 'recusado' || p.status === 'cancelado'" class="inline-block mt-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400">{{ p.status === 'recusado' ? 'Recusado' : 'Cancelado' }}</span>

            <ul class="mt-2 text-xs text-gray-700 dark:text-white/75 space-y-0.5">
              <li v-for="(i, k) in p.itens" :key="k"><b>{{ i.quantidade }}×</b> {{ i.nome }}<span v-if="i.observacao" class="text-orange-600 dark:text-orange-400"> — {{ i.observacao }}</span></li>
            </ul>
            <p v-if="p.observacao" class="mt-1.5 text-[11px] text-orange-700 dark:text-orange-300">Obs.: {{ p.observacao }}</p>

            <p v-if="p.tipo === 'entrega'" class="mt-2 text-[11px] text-gray-500 dark:text-white/50 flex gap-1">
              <MapPin :size="12" class="shrink-0 mt-0.5" />
              <span>{{ p.endereco }}, {{ p.numero }}<template v-if="p.complemento"> ({{ p.complemento }})</template> — {{ p.bairro }}<template v-if="p.referencia">. {{ p.referencia }}</template></span>
            </p>

            <div class="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-white/[0.06] flex items-center justify-between gap-2 text-xs">
              <a :href="`https://wa.me/55${p.clienteTelefone}`" target="_blank" rel="noopener" class="text-gray-500 dark:text-white/50 hover:text-emerald-600 flex items-center gap-1"><Phone :size="12" />{{ telefone(p.clienteTelefone) }}</a>
              <span class="text-right"><b class="text-gray-900 dark:text-white tabular-nums">{{ moeda(p.total) }}</b>
                <span class="block text-[10px] text-gray-400 dark:text-white/40">{{ FORMA[p.formaPagamento] }}{{ p.trocoPara ? ` · troco p/ ${moeda(p.trocoPara)}` : '' }}</span></span>
            </div>
            <p v-if="p.motivoRecusa" class="mt-1.5 text-[11px] text-red-500">Motivo: {{ p.motivoRecusa }}</p>

            <!-- Entregador -->
            <label v-if="p.tipo === 'entrega' && ['aceito', 'pronto', 'em_rota'].includes(p.status) && !p.entregaConfirmadaEm" class="mt-2.5 flex items-center gap-2 text-xs">
              <Bike :size="13" class="text-gray-400 shrink-0" />
              <select class="dlv-campo !h-8 !text-xs" :value="p.entregador?.id ?? ''" :disabled="ocupado === p.id" aria-label="Entregador"
                @change="atribuir(p, ($event.target as HTMLSelectElement).value)">
                <option value="">Sem entregador</option>
                <option v-for="e in entregadores" :key="e.id" :value="e.id">{{ e.nome }}{{ e.entregas ? ` (${e.entregas})` : '' }}</option>
              </select>
              <span v-if="p.ordemRota && p.status === 'em_rota' && rotaDe(p.entregador?.id).length > 1" class="shrink-0 text-gray-400 dark:text-white/40">{{ p.ordemRota }}ª parada</span>
            </label>
            <p v-if="p.entregaConfirmadaEm" class="mt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Entregue por {{ p.entregador?.nome?.split(' ')[0] ?? 'entregador' }} às {{ hora(p.entregaConfirmadaEm) }}<template v-if="p.status !== 'entregue'"> · acertar pagamento</template></p>
            <p v-else-if="p.tipo === 'entrega' && !p.destino && ativo(p)" class="mt-1 text-[10px] text-gray-400 dark:text-white/35">Endereço sem pino no mapa</p>

            <!-- Mapa do pedido: rota do entregador com as paradas, este pedido em destaque -->
            <button v-if="p.tipo === 'entrega' && p.destino && ativo(p)" class="mt-2 text-[11px] font-black text-orange-600 dark:text-orange-400 flex items-center gap-1"
              :aria-expanded="mapaAberto === p.id" @click="abrirMapaCard(p)">
              <MapPin :size="12" /> {{ mapaAberto === p.id ? 'Esconder mapa' : 'Ver no mapa' }}
            </button>
            <MapaDelivery v-if="mapaAberto === p.id" class="mt-2" altura="200px" :marcadores="marcadoresCard(p)" :rotas="rotasCard(p)"
              :descricao="`Mapa do pedido ${p.codigo}`" vazio="Sem local no mapa" />

            <!-- Ações -->
            <div v-if="p.status === 'recebido'" class="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <button class="h-9 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-black disabled:opacity-50" :disabled="ocupado === p.id" @click="aceitar(p)">Aceitar e mandar para a cozinha</button>
              <button class="h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-black text-gray-600 dark:text-white/60" @click="abrirMotivo(p, 'recusar')">Recusar</button>
            </div>
            <div v-else-if="['aceito', 'pronto', 'em_rota'].includes(p.status)" class="mt-3 flex gap-2">
              <button v-if="p.tipo === 'entrega' && p.status !== 'em_rota' && !p.entregador" class="flex-1 h-9 rounded-lg border border-orange-500/40 text-orange-600 dark:text-orange-400 text-xs font-black disabled:opacity-50" :disabled="ocupado === p.id" @click="saiu(p)">Saiu para entrega</button>
              <button class="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black" @click="abrirConcluir(p)">{{ p.entregaConfirmadaEm ? 'Registrar pagamento' : p.tipo === 'entrega' ? 'Entregue e pago' : 'Retirado e pago' }}</button>
              <button v-if="!p.entregaConfirmadaEm" class="h-9 px-3 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-black text-gray-500 dark:text-white/50 hover:text-red-600 hover:border-red-500/40 disabled:opacity-50" :disabled="ocupado === p.id" aria-label="Cancelar pedido" @click="abrirMotivo(p, 'cancelar')">Cancelar</button>
            </div>
            <!-- Entregue: desfazer a venda (o servidor só aceita depois de estornar o pagamento no Caixa) -->
            <button v-else-if="p.status === 'entregue'" class="mt-2 text-[11px] font-bold text-gray-400 dark:text-white/35 hover:text-red-600 disabled:opacity-50"
              :disabled="ocupado === p.id" @click="abrirMotivo(p, 'cancelar')">Cancelar pedido (estorne o pagamento antes)</button>
          </article>
        </section>
      </div>

      <p v-if="cfg && !cfg.disponivel" class="mt-6 text-sm text-gray-500 dark:text-white/50">Seu plano tem o cardápio com retirada. Para entregar com o app do entregador, fale com o suporte para incluir o Delivery.</p>
    </main>

    <!-- Recusar -->
    <Teleport to="body">
      <div v-if="recusando" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="recusando = null">
        <div class="bg-white dark:bg-[#161b26] rounded-3xl w-full max-w-sm p-6 border border-gray-200 dark:border-white/10" role="dialog" aria-modal="true" :aria-label="modoMotivo === 'recusar' ? 'Recusar pedido' : 'Cancelar pedido'">
          <h2 class="text-lg font-black text-gray-900 dark:text-white">{{ modoMotivo === 'recusar' ? 'Recusar' : 'Cancelar' }} pedido {{ recusando.codigo }}</h2>
          <p class="text-xs text-gray-500 dark:text-white/50 mt-1">O cliente vê este motivo na página do pedido.<template v-if="modoMotivo === 'cancelar'"> Os itens saem da cozinha e o estoque volta.</template></p>
          <div class="flex flex-wrap gap-1.5 mt-4">
            <button v-for="m in (modoMotivo === 'recusar' ? MOTIVOS : MOTIVOS_CANCELAR)" :key="m" class="h-8 px-3 rounded-lg text-xs font-bold border" :class="motivo === m ? 'border-orange-500 bg-orange-500/10 text-orange-700 dark:text-orange-300' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60'" @click="motivo = m">{{ m }}</button>
          </div>
          <input v-model="motivo" placeholder="Ou escreva o motivo" class="dlv-campo mt-3" />
          <div class="mt-5 flex gap-2">
            <button class="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-black text-gray-600 dark:text-white/60" @click="recusando = null">Voltar</button>
            <button class="flex-1 h-11 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-sm font-black disabled:opacity-40" :disabled="motivo.trim().length < 3 || ocupado === recusando.id" @click="confirmarMotivo">{{ modoMotivo === 'recusar' ? 'Recusar' : 'Cancelar pedido' }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Concluir com pagamento -->
    <Teleport to="body">
      <div v-if="concluindo" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="concluindo = null">
        <div class="bg-white dark:bg-[#161b26] rounded-3xl w-full max-w-sm p-6 border border-gray-200 dark:border-white/10" role="dialog" aria-modal="true" aria-label="Concluir pedido">
          <h2 class="text-lg font-black text-gray-900 dark:text-white">Concluir {{ concluindo.codigo }}</h2>
          <p class="text-sm text-gray-500 dark:text-white/50 mt-1">Total <b class="text-gray-900 dark:text-white">{{ moeda(concluindo.total) }}</b> · cliente escolheu {{ FORMA[concluindo.formaPagamento] }}</p>
          <p class="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/45">Como foi pago</p>
          <div class="mt-1.5 grid grid-cols-2 gap-2">
            <button v-for="m in metodos" :key="m.id" class="h-10 rounded-xl border-2 text-xs font-black" :class="metodoId === m.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/60'" @click="metodoId = m.id">{{ m.nome }}</button>
          </div>
          <label v-if="ehDinheiro" class="block mt-3">
            <span class="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/45">Valor recebido</span>
            <input v-model.number="recebido" type="number" min="0" step="0.01" class="dlv-campo mt-1" />
            <span v-if="recebido > concluindo.total" class="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Troco: {{ moeda(recebido - concluindo.total) }}</span>
          </label>
          <p v-if="erroConcluir" class="mt-3 text-xs text-red-500 font-bold">{{ erroConcluir }}</p>
          <div class="mt-5 flex gap-2">
            <button class="flex-1 h-11 rounded-2xl border border-gray-200 dark:border-white/10 text-sm font-black text-gray-600 dark:text-white/60" @click="concluindo = null">Voltar</button>
            <button class="flex-1 h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black disabled:opacity-40" :disabled="!metodoId || ocupado === concluindo.id" @click="concluir">Registrar e concluir</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { minutosDesde, agoraServidor } from '~/lib/relogio'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Bike, Settings, MapPin, Phone } from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import CaixaFechado from '~/components/CaixaFechado.vue'
import MapaDelivery from '~/components/MapaDelivery.vue'
import { useApi } from '~/services/api'
import { useSocket } from '~/services/socket'
import { useToastStore } from '~/stores/toast'
import { EVENTOS, type PayloadDelivery, type PayloadPosicao } from '~/shared/eventos'

definePageMeta({ layout: false })

const api = useApi()
const socket = useSocket()
const toast = useToastStore()

const COLUNAS = [
  { chave: 'novos',     rotulo: 'Novos',            cor: 'text-orange-600 dark:text-orange-400',   vazio: 'Nenhum pedido esperando' },
  { chave: 'cozinha',   rotulo: 'Na cozinha',       cor: 'text-amber-600 dark:text-amber-400',     vazio: 'Nada em preparo' },
  { chave: 'rota',      rotulo: 'Em rota',          cor: 'text-sky-600 dark:text-sky-400',         vazio: 'Ninguém na rua' },
  { chave: 'feitos',    rotulo: 'Finalizados (12 h)', cor: 'text-gray-500 dark:text-white/45',     vazio: 'Nada finalizado ainda' },
] as const
const FORMA: Record<string, string> = { pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito', cartao: 'Cartão', dinheiro: 'Dinheiro' }
const MOTIVOS = ['Fora da área de entrega', 'Item em falta', 'Fechando agora', 'Muito movimento']
const MOTIVOS_CANCELAR = ['Cliente desistiu', 'Cliente não atendeu', 'Endereço não encontrado', 'Item em falta']

const pedidos = ref<any[]>([])
const cfg = ref<any>(null)
const ocupado = ref<string | null>(null)

function porColuna(c: string) {
  return pedidos.value.filter(p =>
    c === 'novos' ? p.status === 'recebido'
    : c === 'cozinha' ? p.status === 'aceito' || p.status === 'pronto'
    : c === 'rota' ? p.status === 'em_rota'
    : ['entregue', 'recusado', 'cancelado'].includes(p.status),
  ).sort((a, b) => (c === 'feitos' ? b.criadoEm.localeCompare(a.criadoEm) : a.criadoEm.localeCompare(b.criadoEm)))
}
const ativo = (p: any) => !['entregue', 'recusado', 'cancelado'].includes(p.status)
const minutos = (iso: string) => minutosDesde(iso, agora.value)
const ha = (iso: string) => { const m = minutos(iso); return m < 1 ? 'agora' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}` }
const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const telefone = (t: string) => (t.length >= 10 ? `(${t.slice(0, 2)}) ${t.slice(2, -4)}-${t.slice(-4)}` : t)

async function carregar() {
  try {
    const [ps, es] = await Promise.all([api.get<any[]>('/delivery/pedidos'), api.get<any[]>('/delivery/entregadores')])
    pedidos.value = ps
    entregadores.value = es
  } catch {}
  if (visao.value === 'mapa') carregarMapa()
}

// ── Entregadores e mapa ──
const entregadores = ref<any[]>([])
const visao = ref<'quadro' | 'mapa'>('quadro')
const mapaDados = ref<any>(null)
async function carregarMapa() { try { mapaDados.value = await api.get('/delivery/mapa') } catch {} }
function trocarVisao(v: 'quadro' | 'mapa') { visao.value = v; if (v === 'mapa') carregarMapa() }
const atribuir = (p: any, entregadorId: string) =>
  acao(p, () => api.post(`/delivery/pedidos/${p.id}/atribuir`, { entregadorId: entregadorId || null }), entregadorId ? 'Entregador definido' : 'Entregador removido').then(() => carregar())
// ── Rotas: as entregas ativas de cada entregador, na ordem da rota ──
const ATIVOS_ROTA = ['aceito', 'pronto', 'em_rota']
function rotaDe(entregadorId?: string | null) {
  if (!entregadorId) return []
  return pedidos.value
    .filter(x => x.entregador?.id === entregadorId && x.tipo === 'entrega' && ATIVOS_ROTA.includes(x.status) && !x.entregaConfirmadaEm)
    .sort((a, b) => (a.ordemRota ?? 999) - (b.ordemRota ?? 999))
}
const origem = (entregadorId?: string | null) => {
  const pos = entregadores.value.find(e => e.id === entregadorId)?.posicao
  const r = mapaDados.value?.restaurante
  return pos ? { lat: pos.lat, lng: pos.lng } : r ? { lat: r.lat, lng: r.lng } : null
}
const rotasMapa = computed(() => entregadores.value.map((e) => {
  const paradas = rotaDe(e.id).filter(x => x.destino).map(x => x.destino)
  const de = origem(e.id)
  return { id: e.id, pontos: de ? [de, ...paradas] : paradas, destaque: e.emRota }
}).filter(r => r.pontos.length > 1))

// Mapa no card do pedido
const mapaAberto = ref<string | null>(null)
async function abrirMapaCard(p: any) {
  mapaAberto.value = mapaAberto.value === p.id ? null : p.id
  if (mapaAberto.value && !mapaDados.value) await carregarMapa()
}
function marcadoresCard(p: any) {
  const m: any[] = []
  const r = mapaDados.value?.restaurante
  if (r) m.push({ id: 'r', tipo: 'restaurante', lat: r.lat, lng: r.lng, titulo: r.nome })
  const ent = entregadores.value.find(e => e.id === p.entregador?.id)
  if (ent?.posicao) m.push({ id: ent.id, tipo: 'entregador', lat: ent.posicao.lat, lng: ent.posicao.lng, titulo: ent.nome })
  const paradas = p.entregador ? rotaDe(p.entregador.id) : [p]
  const varias = paradas.length > 1
  paradas.forEach((x, i) => {
    if (!x.destino) return
    const n = x.ordemRota ?? i + 1
    m.push(x.id === p.id
      ? { id: x.id, tipo: 'destino', ...x.destino, rotulo: varias ? String(n) : '★', titulo: `${x.codigo} · ${x.clienteNome}` }
      : { id: x.id, tipo: 'parada', ...x.destino, rotulo: String(n), titulo: `${n}. ${x.codigo} · ${x.bairro ?? ''}` })
  })
  return m
}
function rotasCard(p: any) {
  const paradas = (p.entregador ? rotaDe(p.entregador.id) : [p]).filter((x: any) => x.destino).map((x: any) => x.destino)
  const de = origem(p.entregador?.id)
  return de && paradas.length ? [{ id: p.id, pontos: [de, ...paradas], destaque: p.status === 'em_rota' }] : []
}

const marcadoresMapa = computed(() => {
  const d = mapaDados.value
  if (!d) return []
  const m: any[] = []
  if (d.restaurante) m.push({ id: 'r', tipo: 'restaurante', lat: d.restaurante.lat, lng: d.restaurante.lng, titulo: d.restaurante.nome })
  for (const e of d.entregas) if (e.destino) m.push({ id: e.id, tipo: e.status === 'em_rota' ? 'parada' : 'destino', ...e.destino, rotulo: e.ordemRota ? String(e.ordemRota) : '•', titulo: `${e.codigo} · ${e.clienteNome} · ${e.bairro}` })
  for (const e of d.entregadores) if (e.posicao) m.push({ id: e.id, tipo: 'entregador', lat: e.posicao.lat, lng: e.posicao.lng, titulo: e.nome })
  return m
})

async function acao(p: any, fn: () => Promise<any>, ok?: string) {
  ocupado.value = p.id
  try {
    const r = await fn()
    const i = pedidos.value.findIndex(x => x.id === p.id)
    if (i >= 0 && r?.id) pedidos.value[i] = r
    if (ok) toast.success(ok)
    return true
  } catch (e: any) { toast.error(e?.message || 'Não deu certo'); return false }
  finally { ocupado.value = null }
}
const aceitar = (p: any) => acao(p, () => api.post(`/delivery/pedidos/${p.id}/aceitar`), `Pedido ${p.codigo} na cozinha`)
const saiu = (p: any) => acao(p, () => api.post(`/delivery/pedidos/${p.id}/saiu`), 'Cliente avisado: saiu para entrega')

// Recusar (antes de aceitar) e cancelar (depois) pedem motivo, que o cliente vê
const recusando = ref<any>(null)
const modoMotivo = ref<'recusar' | 'cancelar'>('recusar')
const motivo = ref('')
function abrirMotivo(p: any, modo: 'recusar' | 'cancelar') { recusando.value = p; modoMotivo.value = modo; motivo.value = '' }
async function confirmarMotivo() {
  const p = recusando.value
  const ok = await acao(p, () => api.post(`/delivery/pedidos/${p.id}/${modoMotivo.value}`, { motivo: motivo.value.trim() }),
    modoMotivo.value === 'recusar' ? 'Pedido recusado' : `Pedido ${p.codigo} cancelado`)
  if (ok) recusando.value = null
}

const concluindo = ref<any>(null)
const metodos = ref<any[]>([])
const metodoId = ref('')
const recebido = ref(0)
const erroConcluir = ref('')
const ehDinheiro = computed(() => metodos.value.find(m => m.id === metodoId.value)?.nome.toLowerCase().includes('dinheiro'))
async function abrirConcluir(p: any) {
  erroConcluir.value = ''
  if (!metodos.value.length) { try { metodos.value = await api.get<any[]>('/pagamentos/metodos') } catch {} }
  // Pedido antigo com "cartao": o caixa escolhe crédito ou débito
  const nome = ({ pix: 'pix', credito: 'credito', debito: 'debito', dinheiro: 'dinheiro' } as Record<string, string>)[p.formaPagamento]
  const semAcento = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  metodoId.value = nome ? metodos.value.find(m => semAcento(m.nome).includes(nome))?.id ?? '' : ''
  recebido.value = p.trocoPara ?? p.total
  concluindo.value = p
}
async function concluir() {
  const p = concluindo.value
  erroConcluir.value = ''
  ocupado.value = p.id
  try {
    const r = await api.post<any>(`/delivery/pedidos/${p.id}/concluir`, {
      metodoId: metodoId.value,
      ...(ehDinheiro.value ? { valorRecebido: Number(recebido.value) || p.total } : {}),
      idempotencyKey: `delivery-${p.id}`,
    })
    const i = pedidos.value.findIndex(x => x.id === p.id)
    if (i >= 0) pedidos.value[i] = r
    toast.success(`Pedido ${p.codigo} concluído`)
    concluindo.value = null
  } catch (e: any) { erroConcluir.value = e?.message || 'Erro ao registrar o pagamento' }
  finally { ocupado.value = null }
}

// ── Tempo real: som e aviso quando chega pedido; polling como rede de segurança ──
const agora = ref(agoraServidor())
let timers: any[] = []
const desinscrever: Array<() => void> = []
function bip() {
  try {
    const ctx = new AudioContext()
    ;[0, 0.18].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.frequency.value = 880; g.gain.setValueAtTime(0.18, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15)
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.16)
    })
  } catch {}
}
onMounted(async () => {
  carregar()
  // Falhou ao carregar: não mostra pausado nem fora do plano (não sabemos)
  try { cfg.value = await api.get('/delivery/config') } catch { cfg.value = null }
  desinscrever.push(socket.on(EVENTOS.delivery.recebido, (d: PayloadDelivery) => {
    bip()
    toast.success(`Novo pedido de ${d.clienteNome}`, `${d.tipo === 'entrega' ? 'Entrega' : 'Retirada'} · ${moeda(d.totalCentavos / 100)}`)
    carregar()
  }))
  desinscrever.push(socket.on(EVENTOS.delivery.atualizado, () => carregar()))
  desinscrever.push(socket.on(EVENTOS.item.statusAlterado, () => carregar()))
  // Posição ao vivo: move o entregador no mapa sem recarregar tudo
  desinscrever.push(socket.on(EVENTOS.delivery.posicao, (p: PayloadPosicao) => {
    const e = mapaDados.value?.entregadores.find((x: any) => x.id === p.usuarioId)
    if (e) { e.posicao = { lat: p.lat, lng: p.lng, em: p.em }; mapaDados.value.rastros.find((r: any) => r.entregadorId === p.usuarioId)?.pontos.push([p.lat, p.lng]) }
  }))
  timers = [setInterval(() => { if (!document.hidden) carregar() }, 20000), setInterval(() => { agora.value = agoraServidor() }, 30000)]
})
onUnmounted(() => { timers.forEach(clearInterval); desinscrever.forEach(f => f()) })
</script>

<style scoped>
.dlv-campo { width: 100%; height: 2.6rem; padding: 0 0.8rem; border-radius: 0.75rem; font-size: 0.85rem; outline: none; background: var(--sup-elevado); border: 1px solid var(--linha); color: var(--txt); }
.dlv-campo:focus { border-color: rgb(249 115 22 / 0.6); }
</style>
