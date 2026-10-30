<template>
  <div class="space-y-4">
    <div v-if="!d" class="h-40 rounded-2xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />

    <template v-else>
      <!-- O cardápio vale para todos os planos; sem Delivery no plano só há retirada -->
      <div v-if="!d.disponivel" class="rounded-2xl border border-dashed border-gray-300 dark:border-white/15 p-4 flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs text-gray-600 dark:text-white/60 max-w-xl"><b class="text-gray-900 dark:text-white">Cardápio com retirada.</b> Seus clientes veem o cardápio e pedem para retirar no balcão. A entrega, com o app do entregador, faz parte do Delivery.</p>
        <button class="h-9 px-4 rounded-xl border border-orange-500/40 text-orange-600 dark:text-orange-400 text-xs font-black" @click="navigateTo({ path: '/suporte', query: { assunto: 'Quero incluir a entrega (delivery) no meu plano' } })">Quero incluir entrega</button>
      </div>
      <!-- Link do cardápio -->
      <article class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-5 flex flex-wrap gap-5 items-center">
        <img v-if="qr" :src="qr" alt="QR code do cardápio" class="size-28 rounded-xl border border-gray-200 dark:border-white/10 bg-white" />
        <div class="flex-1 min-w-[14rem]">
          <p class="text-sm font-black text-gray-900 dark:text-white">Link do seu cardápio</p>
          <p class="text-xs text-gray-500 dark:text-white/50 mt-0.5">Mande no WhatsApp, coloque na bio do Instagram ou imprima o QR para o balcão e as mesas.</p>
          <div class="mt-3 flex gap-2">
            <input :value="link" readonly aria-label="Link do cardápio" class="dlv-campo font-mono text-xs" @focus="($event.target as HTMLInputElement).select()" />
            <button class="h-10 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shrink-0 flex items-center gap-1.5" @click="copiar"><Copy :size="13" /> {{ copiado ? 'Copiado' : 'Copiar' }}</button>
            <a :href="link" target="_blank" rel="noopener" class="h-10 px-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-600 dark:text-white/60 shrink-0 flex items-center gap-1.5"><ExternalLink :size="13" /> Abrir</a>
          </div>
        </div>
      </article>

      <!-- Mensagem pronta para a resposta automática do WhatsApp -->
      <article class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex-1 min-w-[14rem]">
            <p class="text-sm font-black text-gray-900 dark:text-white">Mensagem para o WhatsApp</p>
            <p class="text-xs text-gray-500 dark:text-white/50 mt-1">
              Cole na <b>mensagem de saudação</b> do WhatsApp Business (Ferramentas comerciais → Mensagem de saudação) para quem chamar receber o link na hora.
              Use <code class="dlv-tag">{restaurante}</code> e <code class="dlv-tag">{link}</code>: o sistema troca pelo nome e pelo link do cardápio.
            </p>
          </div>
          <button class="h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shrink-0 flex items-center gap-1.5" @click="copiarMensagem">
            <MessageCircle :size="13" /> {{ mensagemCopiada ? 'Copiada' : 'Copiar mensagem' }}
          </button>
        </div>
        <div class="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
          <label class="block">
            <span class="dlv-rotulo">Texto</span>
            <textarea v-model="whats" rows="8" maxlength="1000" aria-label="Texto da mensagem do WhatsApp" class="dlv-campo dlv-area" />
          </label>
          <div>
            <span class="dlv-rotulo">Como o cliente recebe</span>
            <div class="dlv-whats"><p class="dlv-balao">{{ mensagemPronta }}</p></div>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap justify-end gap-2">
          <button class="h-10 px-4 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-600 dark:text-white/60 disabled:opacity-40" :disabled="whats === MENSAGEM_PADRAO" @click="whats = MENSAGEM_PADRAO">Voltar ao padrão</button>
          <button class="h-10 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-black" :disabled="salvando || !whatsMudou" @click="salvar({ mensagemWhatsapp: whats === MENSAGEM_PADRAO ? null : whats })">Salvar texto</button>
        </div>
      </article>

      <!-- Recebendo pedidos -->
      <article class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-5 flex items-start gap-4">
        <div class="flex-1">
          <p class="text-sm font-black text-gray-900 dark:text-white">Receber pedidos pelo cardápio</p>
          <p class="text-xs text-gray-500 dark:text-white/50 mt-1">Com o caixa fechado o cardápio fica só para consulta. Desligue aqui para pausar mesmo com o caixa aberto.</p>
        </div>
        <button role="switch" :aria-checked="d.ativo" aria-label="Receber pedidos pelo cardápio" class="shrink-0 w-12 h-6 rounded-full relative transition-colors" :class="d.ativo ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-white/15'" @click="salvar({ ativo: !d.ativo })">
          <span class="absolute top-0.5 size-5 rounded-full bg-white shadow transition-all" :class="d.ativo ? 'left-[26px]' : 'left-0.5'" />
        </button>
      </article>

      <!-- Local do restaurante (ponto de partida das rotas) -->
      <article class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm font-black text-gray-900 dark:text-white">Local do restaurante</p>
            <p class="text-xs text-gray-500 dark:text-white/50 mt-1">De onde saem as entregas: define a ordem das paradas e aparece no mapa. Clique no mapa para ajustar.</p>
          </div>
          <button class="h-9 px-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-black text-gray-600 dark:text-white/60 flex items-center gap-1.5 disabled:opacity-50" :disabled="localizando" @click="localizar">
            <MapPin :size="13" /> {{ localizando ? 'Procurando…' : 'Localizar pelo endereço' }}
          </button>
        </div>
        <MapaDelivery class="mt-3" altura="260px" marcavel :marcadores="d.local ? [{ id: 'r', tipo: 'restaurante', ...d.local, titulo: 'Restaurante' }] : []"
          vazio="Use “Localizar pelo endereço” ou clique no mapa" descricao="Mapa para marcar o local do restaurante" @marcar="marcar" />
      </article>

      <!-- Regras -->
      <article class="rounded-2xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-5">
        <p class="text-sm font-black text-gray-900 dark:text-white">Como o cliente recebe</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <label v-if="d.disponivel" class="dlv-opcao"><input type="checkbox" v-model="f.entrega" class="accent-orange-500" /> Entrega</label>
          <label class="dlv-opcao"><input type="checkbox" v-model="f.retirada" class="accent-orange-500" /> Retirada no local</label>
        </div>
        <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label v-if="d.disponivel" class="block"><span class="dlv-rotulo">Taxa de entrega (R$)</span><input v-model.number="f.taxaEntrega" type="number" min="0" step="0.5" class="dlv-campo" /></label>
          <label class="block"><span class="dlv-rotulo">Pedido mínimo (R$)</span><input v-model.number="f.pedidoMinimo" type="number" min="0" step="1" class="dlv-campo" /></label>
          <label class="block"><span class="dlv-rotulo">Tempo de preparo (min)</span><input v-model.number="f.tempoMin" type="number" min="5" max="240" step="5" class="dlv-campo" /></label>
        </div>
        <label class="block mt-3"><span class="dlv-rotulo">Recado no topo do cardápio (opcional)</span><input v-model="f.mensagem" maxlength="200" placeholder="Ex.: Entregamos só no centro e bairros vizinhos" class="dlv-campo" /></label>
        <div class="mt-4 flex justify-end">
          <button class="h-10 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-black" :disabled="salvando || !mudou" @click="salvar({ ...f })">{{ salvando ? 'Salvando…' : 'Salvar' }}</button>
        </div>
      </article>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { Copy, ExternalLink, MapPin, MessageCircle } from 'lucide-vue-next'
import MapaDelivery from '~/components/MapaDelivery.vue'
import QRCode from 'qrcode'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'

const api = useApi()
const toast = useToastStore()
const d = ref<any>(null)
const f = reactive({ entrega: true, retirada: true, taxaEntrega: 0, pedidoMinimo: 0, tempoMin: 40, mensagem: '' })
const salvando = ref(false)
const copiado = ref(false)
const qr = ref('')

const link = computed(() => (d.value ? `${window.location.origin}${useRuntimeConfig().app.baseURL}cardapio/${d.value.slug}` : ''))
const mudou = computed(() => d.value && (['entrega', 'retirada', 'taxaEntrega', 'pedidoMinimo', 'tempoMin', 'mensagem'] as const).some(k => (f as any)[k] !== (d.value[k] ?? '')))

// ── Mensagem do WhatsApp: vazio no servidor = texto padrão ──
const MENSAGEM_PADRAO = [
  'Oi! 👋',
  'Obrigado por entrar em contato com {restaurante} 😁',
  '📲 Para fazer seu pedido com mais rapidez e praticidade, é só acessar o link abaixo',
  '👇 {link}',
  'Qualquer dúvida, conte comigo!',
].join('\n')
const whats = ref(MENSAGEM_PADRAO)
const whatsMudou = computed(() => d.value && whats.value !== (d.value.mensagemWhatsapp || MENSAGEM_PADRAO))
const mensagemPronta = computed(() => whats.value
  .replaceAll('{restaurante}', d.value?.nomeRestaurante || 'nosso restaurante')
  .replaceAll('{link}', link.value))
const mensagemCopiada = ref(false)
async function copiarMensagem() {
  try { await navigator.clipboard.writeText(mensagemPronta.value); mensagemCopiada.value = true; setTimeout(() => (mensagemCopiada.value = false), 2000) } catch {}
}

function preencher() {
  whats.value = d.value.mensagemWhatsapp || MENSAGEM_PADRAO
  Object.assign(f, { entrega: d.value.entrega, retirada: d.value.retirada, taxaEntrega: d.value.taxaEntrega, pedidoMinimo: d.value.pedidoMinimo, tempoMin: d.value.tempoMin, mensagem: d.value.mensagem ?? '' }) }

async function salvar(dados: Record<string, unknown>) {
  salvando.value = true
  try { d.value = await api.put('/delivery/config', dados); preencher(); toast.success('Delivery atualizado') }
  catch (e: any) { toast.error(e?.message || 'Erro ao salvar') }
  finally { salvando.value = false }
}
const localizando = ref(false)
async function localizar() {
  localizando.value = true
  try { d.value = await api.post('/delivery/config/localizar'); toast.success('Local encontrado', 'Confira o pino e clique no mapa se precisar ajustar.') }
  catch (e: any) { toast.error(e?.message || 'Não achei o endereço') }
  finally { localizando.value = false }
}
function marcar(p: { lat: number; lng: number }) { salvar({ local: { lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) } }) }

async function copiar() {
  try { await navigator.clipboard.writeText(link.value); copiado.value = true; setTimeout(() => (copiado.value = false), 2000) } catch {}
}

onMounted(async () => {
  try {
    d.value = await api.get('/delivery/config')
    preencher()
    qr.value = await QRCode.toDataURL(link.value, { width: 224, margin: 1 })
  } catch (e: any) { toast.error(e?.message || 'Erro ao carregar o delivery') }
})
</script>

<style scoped>
.dlv-rotulo { display: block; margin-bottom: 0.35rem; font-size: 10px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: var(--txt-2); }
.dlv-campo { width: 100%; height: 2.5rem; padding: 0 0.8rem; border-radius: 0.75rem; font-size: 0.85rem; outline: none; background: var(--sup-elevado); border: 1px solid var(--linha); color: var(--txt); }
.dlv-area { height: auto; padding: 0.65rem 0.8rem; line-height: 1.45; resize: vertical; }
.dlv-tag { padding: 0 0.3rem; border-radius: 0.3rem; background: var(--sup-elevado); font-size: 0.7rem; }
/* Prévia no estilo de conversa do WhatsApp */
.dlv-whats { min-height: 100%; padding: 0.9rem; border-radius: 0.75rem; background: #e5ddd5; }
.dlv-balao { max-width: 22rem; padding: 0.55rem 0.7rem; border-radius: 0.6rem 0.6rem 0.6rem 0.15rem; background: #ffffff; color: #111b21; font-size: 0.82rem; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; box-shadow: 0 1px 1px rgb(0 0 0 / 0.12); }
:global(html.dark) .dlv-whats { background: #0b141a; }
:global(html.dark) .dlv-balao { background: #202c33; color: #e9edef; }
.dlv-campo:focus { border-color: rgb(249 115 22 / 0.6); }
.dlv-opcao { display: inline-flex; align-items: center; gap: 0.5rem; height: 2.4rem; padding: 0 0.9rem; border-radius: 0.75rem; border: 1px solid var(--linha); font-size: 0.8rem; font-weight: 700; color: var(--txt); cursor: pointer; }
</style>
