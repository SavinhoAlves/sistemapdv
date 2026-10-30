<template>
  <div style="display:grid;gap:14px">
    <!-- Plano -->
    <div class="pf-boxm">
      <div class="pf-fld">
        <span class="pf-lab">Plano *</span>
        <small v-if="planosVisiveis.length && !m.planoId" style="color:var(--pf-muted)">Toque no plano para escolher</small>
        <div v-if="planosVisiveis.length" class="pf-rotas">
          <button v-for="pl in planosVisiveis" :key="pl.id" type="button" :class="{ sel: m.planoId === pl.id }" @click="escolherPlano(pl)">
            <span>{{ pl.nome }} · {{ moeda(pl.valor) }}/mês<template v-if="pl.valorAnual"> · {{ moeda(pl.valorAnual) }}/ano</template></span>
            <small>{{ resumoRecursos(pl) }}</small>
          </button>
        </div>
        <template v-else>
          <small style="color:var(--pf-muted)">
            Nenhum plano criado. <NuxtLink to="/platform/planos" style="color:var(--pf-brand-d)">Crie os planos</NuxtLink> para os recursos e o preço virem dele.
          </small>
          <input v-model="m.plano" class="pf-inp" placeholder="Nome do plano no contrato" aria-label="Nome do plano">
        </template>
      </div>
    </div>

    <!-- Cobrança -->
    <div class="pf-boxm">
      <div class="pf-feat" style="padding-top:0">
        <div><b>Isento de mensalidade</b><small>Sem cobrança e sem vencimento: o acesso fica sempre liberado</small></div>
        <button type="button" class="pf-sw" role="switch" :aria-checked="m.isento" aria-label="Isento de mensalidade" @click="m.isento = !m.isento" />
      </div>

      <div v-if="!m.isento" class="pf-form">
        <div class="pf-fld full">
          <span class="pf-lab">Ciclo de cobrança</span>
          <div class="pf-chips">
            <button v-for="c in CICLOS" :key="c.value" type="button" class="pf-fc" :aria-pressed="m.ciclo === c.value" @click="m.ciclo = c.value; valorManual = false">{{ c.label }}</button>
          </div>
        </div>
        <div class="pf-fld">
          <label class="pf-lab" for="cf-valor">Valor {{ rotuloPorCiclo }} (R$) *</label>
          <input id="cf-valor" v-model="m.valor" class="pf-inp pf-num" type="number" min="0" step="0.01" placeholder="0,00" @input="valorManual = true">
          <small v-if="valorDoPlano !== null" style="color:var(--pf-muted)">
            <template v-if="desconto > 0">Desconto de {{ desconto }}% sobre o plano ({{ moeda(valorDoPlano) }}) · </template>
            <template v-else-if="valorManual && Number(m.valor) !== valorDoPlano">Valor do plano: {{ moeda(valorDoPlano) }} · </template>
            <button v-if="valorManual && Number(m.valor) !== valorDoPlano" type="button" class="pf-link" @click="usarValorDoPlano">usar o do plano</button>
            <template v-else-if="!desconto">Valor do plano</template>
          </small>
        </div>

        <!-- Edição: dia fixo do vencimento -->
        <div v-if="modo === 'edicao'" class="pf-fld">
          <label class="pf-lab" for="cf-dia">Dia do vencimento *</label>
          <input id="cf-dia" v-model.number="m.diaVencimento" class="pf-inp pf-num" type="number" min="1" max="31">
          <small style="color:var(--pf-muted)">Mudar o dia move o próximo vencimento para esse dia, no mesmo mês</small>
        </div>
      </div>
    </div>

    <!-- Cadastro: teste grátis ou fechamento direto -->
    <div v-if="modo === 'cadastro' && !m.isento" class="pf-boxm">
      <div class="pf-feat" style="padding-top:0">
        <div><b>Teste grátis de {{ TESTE_DIAS }} dias</b><small>O cliente usa sem pagar; no fim do teste, se não pagar, o acesso bloqueia</small></div>
        <button type="button" class="pf-sw" role="switch" :aria-checked="m.teste" aria-label="Teste grátis" @click="m.teste = !m.teste" />
      </div>

      <div v-if="m.teste" class="pf-note info">
        Teste de {{ diaBR(m.dataInicio) }} até {{ diaBR(fimTeste) }} ({{ diaSemana(fimTeste) }}). O primeiro vencimento fica para {{ diaBR(vencAposTeste) }} e depois todo dia {{ Number(vencAposTeste.slice(8, 10)) }}.
      </div>
      <template v-else>
        <div class="pf-form">
          <div class="pf-fld">
            <label class="pf-lab" for="cf-venc">Primeiro vencimento *</label>
            <input id="cf-venc" v-model="m.primeiroVencimento" class="pf-inp" type="date">
            <small v-if="m.primeiroVencimento" style="color:var(--pf-muted)">Depois, todo dia {{ Number(m.primeiroVencimento.slice(8, 10)) }}{{ m.ciclo !== 'mensal' ? ` a cada ${mesesCiclo(m.ciclo)} meses` : '' }}</small>
          </div>
        </div>
        <div class="pf-feat">
          <div><b>Já recebi o primeiro pagamento</b><small>Registra agora e o vencimento já passa para o próximo ciclo</small></div>
          <button type="button" class="pf-sw" role="switch" :aria-checked="m.pagarAgora" aria-label="Pagamento recebido" @click="m.pagarAgora = !m.pagarAgora" />
        </div>
        <div v-if="m.pagarAgora" class="pf-form">
          <div class="pf-fld"><label class="pf-lab" for="cf-pg-data">Pago em</label><input id="cf-pg-data" v-model="m.pagamento.pagoEm" class="pf-inp" type="date"></div>
          <div class="pf-fld full">
            <span class="pf-lab">Forma de pagamento</span>
            <div class="pf-chips">
              <button v-for="f in FORMAS" :key="f.valor" type="button" class="pf-fc" :aria-pressed="m.pagamento.forma === f.valor" @click="m.pagamento.forma = f.valor">{{ f.rotulo }}</button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Contrato em papel -->
    <div class="pf-boxm">
      <div class="pf-form">
        <div class="pf-fld"><label class="pf-lab" for="cf-ini">Início do contrato</label><input id="cf-ini" v-model="m.dataInicio" class="pf-inp" type="date"></div>
        <div class="pf-fld"><label class="pf-lab" for="cf-fim">Fim <small>(opcional)</small></label><input id="cf-fim" v-model="m.dataFim" class="pf-inp" type="date"></div>
        <div class="pf-fld full">
          <span class="pf-lab">Situação do contrato</span>
          <div class="pf-seg">
            <button type="button" class="warn" :class="{ sel: m.status === 'trial' }" @click="m.status = 'trial'">Ag. assinatura</button>
            <button type="button" class="ok" :class="{ sel: m.status === 'ativo' }" @click="m.status = 'ativo'">Assinado</button>
            <button v-if="modo === 'edicao'" type="button" class="bad" :class="{ sel: m.status === 'cancelado' }" @click="m.status = 'cancelado'">Rescindido</button>
          </div>
          <small v-if="m.status === 'cancelado'" style="color:var(--pf-bad)">Contrato rescindido bloqueia o acesso do restaurante.</small>
        </div>
        <div class="pf-fld full">
          <label class="pf-lab" for="cf-obs">Condições específicas <small>(saem no contrato)</small></label>
          <textarea id="cf-obs" v-model="m.observacoes" class="pf-inp" rows="2" maxlength="1000" placeholder="Ex.: desconto de lançamento nos 3 primeiros meses" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePlanos, RECURSOS, type Plano } from '~/composables/usePlanos'
import { CICLOS, mesesCiclo, diaBR, moeda } from '~/composables/usePlatformTenants'

export interface ContratoModelo {
  planoId: string | null; plano: string; valor: string | number
  ciclo: 'mensal' | 'trimestral' | 'semestral' | 'anual'
  dataInicio: string; dataFim: string; status: 'trial' | 'ativo' | 'suspenso' | 'cancelado'
  isento: boolean; observacoes: string; diaVencimento: number
  // Só no cadastro
  teste: boolean; primeiroVencimento: string; pagarAgora: boolean
  pagamento: { pagoEm: string; forma: string }
}

const props = defineProps<{ modo: 'cadastro' | 'edicao' }>()
const m = defineModel<ContratoModelo>({ required: true })

const TESTE_DIAS = 7
const FORMAS = [
  { valor: 'pix', rotulo: 'Pix' }, { valor: 'dinheiro', rotulo: 'Dinheiro' }, { valor: 'cartao', rotulo: 'Cartão' },
  { valor: 'boleto', rotulo: 'Boleto' }, { valor: 'transferencia', rotulo: 'Transferência' },
]

const { planos, carregar } = usePlanos()
carregar()
// Planos à venda + o atual (mesmo fora de venda, para continuar aparecendo)
const planosVisiveis = computed(() => planos.value.filter(pl => pl.ativo || pl.id === m.value.planoId))
const planoEscolhido = computed(() => planos.value.find(pl => pl.id === m.value.planoId) ?? null)

function resumoRecursos(pl: Plano) {
  const r = RECURSOS.filter(x => pl[x.chave]).map(x => x.rotulo)
  return r.length ? r.join(', ') : 'Sem recursos extras'
}

// ── Valor: segue o plano (× meses do ciclo, ou o valor anual dele) até alguém digitar outro (desconto). Trocar o ciclo volta para o valor do plano ──
const valorManual = ref(props.modo === 'edicao')
// No anual, usa o valor anual do plano quando ele tem um (definido em Planos)
const valorDoPlano = computed(() => {
  const pl = planoEscolhido.value
  if (!pl) return null
  if (m.value.ciclo === 'anual' && Number(pl.valorAnual) > 0) return Number(pl.valorAnual)
  return Math.round(pl.valor * mesesCiclo(m.value.ciclo) * 100) / 100
})
const desconto = computed(() => {
  const v = Number(m.value.valor), p = valorDoPlano.value
  return p && v > 0 && v < p ? Math.round((1 - v / p) * 100) : 0
})
const rotuloPorCiclo = computed(() => ({ mensal: 'mensal', trimestral: 'do trimestre', semestral: 'do semestre', anual: 'do ano' }[m.value.ciclo]))

function escolherPlano(pl: Plano) {
  m.value.planoId = pl.id
  m.value.plano = pl.nome
  valorManual.value = false
}
function usarValorDoPlano() { valorManual.value = false; if (valorDoPlano.value !== null) m.value.valor = valorDoPlano.value }

watch([valorDoPlano, valorManual], ([v, manual]) => { if (!manual && v !== null) m.value.valor = v }, { immediate: true })

// Contrato antigo (plano só como texto): já marca o plano de mesmo nome, em vez de parecer
// escolhido sem estar. Sem valor no contrato, passa a usar o do plano.
watch(planosVisiveis, (pls) => {
  if (m.value.planoId || !m.value.plano.trim()) return
  const nome = m.value.plano.trim().toLowerCase()
  const pl = pls.find(x => x.nome.trim().toLowerCase() === nome)
  if (!pl) return
  m.value.planoId = pl.id
  if (!(Number(String(m.value.valor).replace(',', '.')) > 0)) valorManual.value = false
}, { immediate: true })

// ── Teste: 7 dias a partir do início (seg → dom); 1º vencimento no dia seguinte ──
function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}
const fimTeste = computed(() => somarDias(m.value.dataInicio || new Date().toISOString().slice(0, 10), TESTE_DIAS - 1))
const vencAposTeste = computed(() => somarDias(fimTeste.value, 1))
const diaSemana = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' })

/** Corpo para a API (cadastro inclui teste, 1º vencimento e pagamento inicial). */
function payload() {
  const c = m.value
  const valor = c.valor === '' ? null : Number(String(c.valor).replace(',', '.'))
  const base = {
    planoId: c.planoId, plano: c.plano.trim() || null, valor, ciclo: c.ciclo,
    dataInicio: c.dataInicio || null, dataFim: c.dataFim || null, status: c.status,
    isento: c.isento, observacoes: c.observacoes.trim() || null,
  }
  if (props.modo === 'edicao') return { ...base, diaVencimento: c.diaVencimento }
  return {
    ...base,
    teste: !c.isento && c.teste,
    primeiroVencimento: c.teste ? null : c.primeiroVencimento || null,
    pagamentoInicial: !c.isento && !c.teste && c.pagarAgora && valor
      ? { valor, pagoEm: c.pagamento.pagoEm, forma: c.pagamento.forma }
      : null,
  }
}

/** Mensagem de erro, ou null se dá para salvar. */
function validar(): string | null {
  const c = m.value
  if (planosVisiveis.value.length && !c.planoId) return 'Escolha o plano do restaurante'
  if (!planosVisiveis.value.length && !c.plano.trim()) return 'Informe o nome do plano'
  if (!c.isento) {
    const v = Number(String(c.valor).replace(',', '.'))
    if (c.valor === '' || Number.isNaN(v) || v < 0) return 'Informe o valor da mensalidade'
    if (props.modo === 'cadastro' && !c.teste && !c.primeiroVencimento) return 'Informe o primeiro vencimento'
    if (props.modo === 'edicao' && (!Number.isInteger(c.diaVencimento) || c.diaVencimento < 1 || c.diaVencimento > 31)) return 'O dia do vencimento vai de 1 a 31'
  }
  return null
}

defineExpose({ payload, validar })
</script>
