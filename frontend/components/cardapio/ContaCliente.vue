<template>
  <!-- Conta do cliente no cardápio: Meu perfil (dados e endereços) ou Meus pedidos -->
  <section class="px-5 lg:px-8 pb-10">
    <button type="button" class="inline-flex items-center gap-2 mt-[18px] mb-1.5 font-semibold cdp-mudo" @click="emit('voltar')">
      <ArrowLeft :size="18" /> Voltar ao cardápio
    </button>

    <!-- MEU PERFIL -->
    <template v-if="pagina === 'perfil'">
      <div class="flex items-center gap-4 mt-3.5 mb-[22px]">
        <span class="size-16 shrink-0 rounded-full cdp-ac grid place-items-center text-[22px] font-extrabold">
          <template v-if="iniciais">{{ iniciais }}</template><UserRound v-else :size="28" />
        </span>
        <div class="min-w-0">
          <h2 class="text-xl font-extrabold tracking-[-.01em] truncate">{{ perfil.cliente.nome || 'Meu perfil' }}</h2>
          <p class="text-sm cdp-mudo truncate">{{ perfil.cliente.email || mascararTel(perfil.cliente.telefone) }}</p>
        </div>
      </div>

      <div class="grid gap-[18px] items-start grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))]">
        <!-- Dados e contato -->
        <form class="cdp-cartao rounded-[22px] p-5 grid gap-3.5" @submit.prevent="salvarDados">
          <h3 class="flex items-center gap-2 text-[17px] font-extrabold"><UserRound :size="18" class="cdp-ac-txt" /> Dados e contato</h3>
          <label class="cdp-rot">Nome completo<input v-model="d.nome" class="cdp-in" autocomplete="name" /></label>
          <div class="grid grid-cols-2 gap-3">
            <label class="cdp-rot">Nascimento<input v-model="d.nascimento" type="date" class="cdp-in" /></label>
            <label class="cdp-rot">CPF (opcional)<input :value="d.cpf" inputmode="numeric" placeholder="000.000.000-00" class="cdp-in" @input="d.cpf = mascara(($event.target as HTMLInputElement).value, '000.000.000-00')" /></label>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <label class="cdp-rot">Telefone / WhatsApp<input :value="mascararTel(perfil.cliente.telefone)" class="cdp-in opacity-70" readonly title="O celular é o login da conta" /></label>
            <label class="cdp-rot">Telefone alternativo<input :value="d.telefone2" type="tel" inputmode="tel" placeholder="(00) 00000-0000" class="cdp-in" @input="d.telefone2 = mascararTel(($event.target as HTMLInputElement).value)" /></label>
          </div>
          <label class="cdp-rot">E-mail<input v-model="d.email" type="email" autocomplete="email" placeholder="voce@exemplo.com" class="cdp-in" /></label>
          <label class="cdp-rot">Como prefere ser contatado
            <select v-model="d.contatoPreferido" class="cdp-in">
              <option value="whatsapp">WhatsApp</option><option value="ligacao">Ligação</option><option value="email">E-mail</option>
            </select>
          </label>
          <p v-if="erroDados" class="text-sm font-semibold text-red-500" role="alert">{{ erroDados }}</p>
          <button type="submit" class="w-full p-4 rounded-[18px] cdp-ac font-extrabold disabled:opacity-40" :disabled="salvando">{{ salvando ? 'Salvando…' : 'Salvar dados' }}</button>
        </form>

        <!-- Endereços de entrega -->
        <div class="cdp-cartao rounded-[22px] p-5 grid gap-3.5">
          <h3 class="flex items-center gap-2 text-[17px] font-extrabold"><MapPin :size="18" class="cdp-ac-txt" /> Endereços de entrega</h3>
          <p v-if="!perfil.enderecos.length" class="text-sm cdp-mudo">Nenhum endereço cadastrado ainda.</p>
          <div v-for="e in perfil.enderecos" :key="e.id" class="flex justify-between gap-3 rounded-2xl border p-3.5" :class="e.padrao ? 'cdp-borda-ac' : 'cdp-linha'">
            <div class="min-w-0">
              <b>{{ e.apelido || 'Endereço' }}</b><span v-if="e.padrao" class="cdp-tag ml-2">Padrão</span>
              <p class="text-sm mt-0.5">{{ e.endereco }}, {{ e.numero }}<template v-if="e.complemento"> – {{ e.complemento }}</template></p>
              <p class="text-sm cdp-mudo">{{ e.bairro }}<template v-if="e.cidade"> · {{ e.cidade }}<template v-if="e.uf">/{{ e.uf }}</template></template><template v-if="e.cep"> · CEP {{ mascara(e.cep, '00000-000') }}</template></p>
              <small v-if="e.referencia" class="block text-xs cdp-mudo mt-0.5">Ref.: {{ e.referencia }}</small>
              <small v-if="e.latitude != null" class="flex items-center gap-1 text-xs cdp-mudo mt-0.5"><MapPin :size="12" /> Localização salva</small>
            </div>
            <div class="flex gap-0.5 items-start shrink-0">
              <button v-if="!e.padrao" type="button" class="cdp-icone" :aria-label="`Usar ${e.apelido || 'este endereço'} como padrão`" @click="padrao(e.id)"><Star :size="16" /></button>
              <button type="button" class="cdp-icone" :aria-label="`Editar ${e.apelido || 'endereço'}`" @click="abrirForm(e)"><Pencil :size="16" /></button>
              <button type="button" class="cdp-icone" :aria-label="`Excluir ${e.apelido || 'endereço'}`" @click="excluir(e.id)"><Trash2 :size="16" /></button>
            </div>
          </div>

          <button v-if="!formAberto" type="button" class="cdp-fantasma" @click="abrirForm()"><Plus :size="18" /> Novo endereço</button>
          <form v-else class="grid gap-3.5 border-t cdp-linha pt-4" @submit.prevent="salvarEnd">
            <div class="grid grid-cols-2 gap-3">
              <label class="cdp-rot">Apelido<input v-model="fe.apelido" placeholder="Casa, Trabalho…" class="cdp-in" /></label>
              <label class="cdp-rot">CEP<input :value="fe.cep" inputmode="numeric" placeholder="00000-000" autocomplete="postal-code" class="cdp-in" @input="digitarCep(($event.target as HTMLInputElement).value)" /></label>
            </div>
            <label class="cdp-rot">Rua / Avenida<input v-model="fe.endereco" required autocomplete="address-line1" class="cdp-in" /></label>
            <div class="grid grid-cols-2 gap-3">
              <label class="cdp-rot">Número<input v-model="fe.numero" required class="cdp-in" /></label>
              <label class="cdp-rot">Complemento<input v-model="fe.complemento" placeholder="Apto, bloco…" class="cdp-in" /></label>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <label class="cdp-rot">Bairro<input v-model="fe.bairro" required class="cdp-in" /></label>
              <label class="cdp-rot">Cidade<input v-model="fe.cidade" autocomplete="address-level2" class="cdp-in" /></label>
            </div>
            <div class="grid grid-cols-[90px_1fr] gap-3">
              <label class="cdp-rot">UF<input v-model="fe.uf" maxlength="2" class="cdp-in uppercase" /></label>
              <label class="cdp-rot">Ponto de referência<input v-model="fe.referencia" placeholder="Próximo a…" class="cdp-in" /></label>
            </div>
            <button type="button" class="cdp-fantasma" @click="localizar"><LocateFixed :size="18" /> Usar minha localização atual</button>
            <p v-if="msgGeo" class="text-xs cdp-mudo">{{ msgGeo }}</p>
            <p v-if="erroEnd" class="text-sm font-semibold text-red-500" role="alert">{{ erroEnd }}</p>
            <div class="flex gap-2.5">
              <button type="button" class="px-5 rounded-[18px] border cdp-linha font-semibold" @click="formAberto = false">Cancelar</button>
              <button type="submit" class="flex-1 p-4 rounded-[18px] cdp-ac font-extrabold disabled:opacity-40" :disabled="salvando">Salvar endereço</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Sair e LGPD -->
      <div class="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" class="inline-flex items-center gap-2 px-3.5 py-[9px] rounded-xl border cdp-cartao text-sm font-semibold" @click="emit('sair')"><LogOut :size="17" /> Sair da conta</button>
      </div>
      <details class="mt-4 text-sm max-w-md">
        <summary class="cursor-pointer text-xs font-bold cdp-mudo">Apagar minha conta</summary>
        <p class="mt-2 text-xs cdp-mudo">Apaga seus dados e endereços salvos. Os pedidos já feitos continuam com o restaurante.</p>
        <div class="mt-2 flex gap-2">
          <input v-model="senhaApagar" type="password" autocomplete="current-password" placeholder="Sua senha" aria-label="Senha para apagar a conta" class="cdp-in flex-1" />
          <button type="button" class="h-11 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-extrabold" :disabled="!senhaApagar || salvando" @click="apagar">Apagar</button>
        </div>
        <p v-if="erroApagar" class="mt-2 text-sm text-red-500 font-bold" role="alert">{{ erroApagar }}</p>
      </details>
    </template>

    <!-- MEUS PEDIDOS -->
    <template v-else>
      <div class="flex items-center gap-4 mt-3.5 mb-[22px]">
        <span class="size-16 shrink-0 rounded-full cdp-ac grid place-items-center"><Receipt :size="28" /></span>
        <div>
          <h2 class="text-xl font-extrabold tracking-[-.01em]">Meus pedidos</h2>
          <p class="text-sm cdp-mudo">Acompanhe o histórico dos seus pedidos.</p>
        </div>
      </div>
      <div v-if="!perfil.pedidos.length" class="cdp-cartao rounded-[22px] grid justify-items-center text-center gap-3.5 py-9 px-5">
        <ShoppingBag :size="36" class="cdp-ac-txt" />
        <p>Você ainda não fez nenhum pedido.</p>
        <button type="button" class="w-full max-w-[240px] p-4 rounded-[18px] cdp-ac font-extrabold" @click="emit('voltar')">Ver cardápio</button>
      </div>
      <div v-else class="grid gap-3.5">
        <article v-for="p in perfil.pedidos" :key="p.codigo" class="cdp-cartao rounded-[22px] p-[18px] grid gap-2.5 min-[900px]:grid-cols-[200px_1fr_1fr_150px] min-[900px]:items-center min-[900px]:gap-6">
          <div class="grid gap-1.5 justify-items-start">
            <b>Pedido <span class="font-mono">{{ p.codigo }}</span></b>
            <small class="text-xs cdp-mudo">{{ dataHora(p.criadoEm) }}</small>
            <span class="cdp-tag">{{ STATUS[p.status] ?? p.status }}</span>
          </div>
          <ul class="grid gap-1.5 text-sm">
            <li v-for="(i, n) in p.itens" :key="n" class="flex justify-between gap-3"><span>{{ i.quantidade }}× {{ i.nome }}</span><span class="tabular-nums">{{ moeda(i.quantidade * i.preco) }}</span></li>
          </ul>
          <div class="grid gap-1.5">
            <small v-if="p.endereco" class="flex items-center gap-1 text-xs cdp-mudo"><MapPin :size="12" /> {{ p.endereco }}</small>
            <a :href="`${base}pedido/${p.codigo}`" class="text-sm font-semibold cdp-ac-txt">Acompanhar pedido</a>
          </div>
          <div class="flex justify-between border-t cdp-linha pt-3 text-base min-[900px]:border-t-0 min-[900px]:border-l min-[900px]:pt-0 min-[900px]:pl-6 min-[900px]:flex-col min-[900px]:items-end min-[900px]:gap-1">
            <span>Total</span><b class="tabular-nums">{{ moeda(p.total) }}</b>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { ArrowLeft, UserRound, MapPin, Star, Pencil, Trash2, Plus, LocateFixed, LogOut, Receipt, ShoppingBag } from 'lucide-vue-next'

const props = defineProps<{ pagina: 'perfil' | 'pedidos'; perfil: any; slug: string; token: string }>()
const emit = defineEmits<{ voltar: []; recarregar: []; sair: []; apagada: [] }>()

const config = useRuntimeConfig()
const base = config.app.baseURL
const api = (p: string, o: any = {}) => $fetch<any>(`${config.public.apiUrl}/api/publico/cardapio/${encodeURIComponent(props.slug)}/conta${p}`, {
  ...o, headers: { ...(o.headers ?? {}), Authorization: `Bearer ${props.token}` },
})
const msgErro = (e: any, padrao: string) => e?.data?.error || padrao

const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const STATUS: Record<string, string> = { recebido: 'Recebido', aceito: 'Em preparo', pronto: 'Pronto', em_rota: 'A caminho', entregue: 'Entregue', recusado: 'Não aceito', cancelado: 'Cancelado' }

// Máscara simples: "0" é dígito, o resto é literal
function mascara(v: string, padrao: string) {
  const d = String(v ?? '').replace(/\D/g, ''); let o = '', i = 0
  for (const ch of padrao) { if (i >= d.length) break; o += ch === '0' ? d[i++] : ch }
  return o
}
const mascararTel = (v: string) => mascara(v, String(v ?? '').replace(/\D/g, '').length > 10 ? '(00) 00000-0000' : '(00) 0000-0000')
const iniciais = computed(() => String(props.perfil.cliente.nome || '').split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join(''))

// ── Dados ──
const d = reactive({ nome: '', nascimento: '', cpf: '', telefone2: '', email: '', contatoPreferido: 'whatsapp' })
watch(() => props.perfil.cliente, (c) => Object.assign(d, {
  nome: c.nome ?? '', nascimento: c.nascimento ?? '', cpf: c.cpf ? mascara(c.cpf, '000.000.000-00') : '',
  telefone2: c.telefone2 ? mascararTel(c.telefone2) : '', email: c.email ?? '', contatoPreferido: c.contatoPreferido ?? 'whatsapp',
}), { immediate: true })
const salvando = ref(false)
const erroDados = ref('')
async function salvarDados() {
  erroDados.value = ''; salvando.value = true
  try { await api('', { method: 'PUT', body: { ...d } }); emit('recarregar') }
  catch (e) { erroDados.value = msgErro(e, 'Não deu para salvar. Tente de novo.') }
  finally { salvando.value = false }
}

// ── Endereços ──
const formAberto = ref(false)
const editando = ref<string | null>(null)
const vazio = () => ({ apelido: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', referencia: '', latitude: null as number | null, longitude: null as number | null })
const fe = reactive(vazio())
const erroEnd = ref('')
const msgGeo = ref('')
function abrirForm(e?: any) {
  editando.value = e?.id ?? null
  Object.assign(fe, vazio(), e ? {
    apelido: e.apelido ?? '', cep: e.cep ? mascara(e.cep, '00000-000') : '', endereco: e.endereco, numero: e.numero,
    complemento: e.complemento ?? '', bairro: e.bairro, cidade: e.cidade ?? '', uf: e.uf ?? '', referencia: e.referencia ?? '',
    latitude: e.latitude ?? null, longitude: e.longitude ?? null,
  } : {})
  erroEnd.value = ''; msgGeo.value = e?.latitude != null ? 'Localização salva neste endereço.' : ''
  formAberto.value = true
}
// CEP completo: busca rua, bairro, cidade e UF no ViaCEP (só preenche o que está vazio)
async function digitarCep(v: string) {
  fe.cep = mascara(v, '00000-000')
  const cep = fe.cep.replace(/\D/g, '')
  if (cep.length !== 8) return
  try {
    const r = await $fetch<any>(`https://viacep.com.br/ws/${cep}/json/`)
    if (r?.erro) return
    fe.endereco ||= r.logradouro || ''; fe.bairro ||= r.bairro || ''; fe.cidade ||= r.localidade || ''; fe.uf ||= r.uf || ''
  } catch {}
}
function localizar() {
  if (!navigator.geolocation) { msgGeo.value = 'Seu navegador não suporta localização.'; return }
  msgGeo.value = 'Obtendo localização…'
  navigator.geolocation.getCurrentPosition(
    (p) => { fe.latitude = Number(p.coords.latitude.toFixed(6)); fe.longitude = Number(p.coords.longitude.toFixed(6)); msgGeo.value = `Localização capturada (precisão de cerca de ${Math.round(p.coords.accuracy)} m).` },
    () => { msgGeo.value = 'Não foi possível obter a localização. Verifique a permissão do navegador.' },
    { timeout: 10000 },
  )
}
async function salvarEnd() {
  erroEnd.value = ''; salvando.value = true
  try {
    const body = { ...fe, uf: fe.uf.toUpperCase() }
    await api(editando.value ? `/enderecos/${editando.value}` : '/enderecos', { method: editando.value ? 'PUT' : 'POST', body })
    formAberto.value = false
    emit('recarregar')
  } catch (e) { erroEnd.value = msgErro(e, 'Não deu para salvar o endereço.') }
  finally { salvando.value = false }
}
async function padrao(id: string) { try { await api(`/enderecos/${id}/padrao`, { method: 'POST' }); emit('recarregar') } catch {} }
async function excluir(id: string) {
  if (!confirm('Excluir este endereço?')) return
  try { await api(`/enderecos/${id}`, { method: 'DELETE' }); emit('recarregar') } catch {}
}

// ── Apagar conta (LGPD) ──
const senhaApagar = ref('')
const erroApagar = ref('')
async function apagar() {
  erroApagar.value = ''; salvando.value = true
  try { await api('/apagar', { method: 'POST', body: { senha: senhaApagar.value } }); emit('apagada') }
  catch (e) { erroApagar.value = msgErro(e, 'Não deu para apagar a conta') }
  finally { salvando.value = false }
}
</script>
