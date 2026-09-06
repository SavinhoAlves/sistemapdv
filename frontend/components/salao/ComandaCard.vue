<script setup lang="ts">
import { computed } from 'vue'

/**
 * Card de comanda para a tela de salão.
 *
 * O card anterior mostrava: rótulo de 10px, um avatar grande com a inicial do
 * cliente, o nome do cliente e o nome do garçom. Não mostrava o valor da
 * conta, nem há quanto tempo estava aberta, nem se havia prato pronto
 * esperando entrega. O maior bloco visual da célula — o avatar — carregava a
 * menor densidade de informação da tela.
 *
 * Aqui a hierarquia segue a pergunta que o operador faz de longe:
 *
 *   1. Esta comanda precisa de mim agora?   → faixa de estado + selo
 *   2. Quanto está?                          → total, monoespaçado tabular
 *   3. Qual é?                               → nome / cliente
 *   4. Quem atende e desde quando?           → rodapé
 */

interface Comanda {
  id: string
  numero: number
  nome: string
  cliente: string | null
  status: 'aberta' | 'fechando' | 'fechada'
  garcom: { id: string; nome: string } | null
  total: number
  pago: number
  restante: number
  qtd_itens: number
  qtd_prontos: number
  qtd_na_cozinha: number
  aberta_em: string | null
  ultimo_lancamento_em: string | null
}

const props = withDefaults(
  defineProps<{
    comanda: Comanda
    selecionada?: boolean
    /** Minutos sem lançamento a partir dos quais a comanda vira alerta. */
    limiteParadaMin?: number
  }>(),
  { selecionada: false, limiteParadaMin: 45 },
)

defineEmits<{ (e: 'abrir', comanda: Comanda): void }>()

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const minutosAbertos = computed(() => {
  if (!props.comanda.aberta_em) return 0
  return Math.floor((Date.now() - new Date(props.comanda.aberta_em).getTime()) / 60000)
})

const minutosParada = computed(() => {
  const ref = props.comanda.ultimo_lancamento_em ?? props.comanda.aberta_em
  if (!ref) return 0
  return Math.floor((Date.now() - new Date(ref).getTime()) / 60000)
})

function duracao(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  return `${h}h${String(min % 60).padStart(2, '0')}`
}

/**
 * Um estado por comanda, escolhido pela urgência. Prato pronto esperando
 * ganha de tudo: é o único que degrada o produto a cada minuto parado.
 */
const estado = computed(() => {
  const c = props.comanda
  if (c.qtd_prontos > 0) {
    return {
      chave: 'pronto',
      selo: c.qtd_prontos === 1 ? '1 pronto para entregar' : `${c.qtd_prontos} prontos para entregar`,
    }
  }
  if (c.status === 'fechando') {
    return {
      chave: 'conta',
      selo: c.pago > 0 ? `Pago ${moeda.format(c.pago)} de ${moeda.format(c.total)}` : 'Conta pedida',
    }
  }
  if (c.qtd_na_cozinha > 0) {
    return { chave: 'cozinha', selo: `${c.qtd_na_cozinha} na cozinha` }
  }
  if (minutosParada.value >= props.limiteParadaMin) {
    return { chave: 'atencao', selo: `Sem lançamento há ${duracao(minutosParada.value)}` }
  }
  return { chave: 'parado', selo: null }
})

const vazia = computed(() => props.comanda.qtd_itens === 0)
</script>

<template>
  <button
    type="button"
    class="comanda"
    :class="[`comanda--${estado.chave}`, { 'comanda--sel': selecionada }]"
    :aria-label="`${comanda.nome}, ${moeda.format(comanda.total)}${estado.selo ? ', ' + estado.selo : ''}`"
    @click="$emit('abrir', comanda)"
  >
    <span class="pdv-faixa" :class="`pdv-faixa--${estado.chave}`" aria-hidden="true" />

    <span class="comanda__corpo">
      <!-- Identificação -->
      <span class="comanda__topo">
        <span class="comanda__nome">{{ comanda.nome }}</span>
        <span v-if="comanda.cliente" class="comanda__cliente">{{ comanda.cliente }}</span>
      </span>

      <!-- O número. É o motivo do card existir, então é o maior elemento. -->
      <span class="comanda__total pdv-valor" :class="{ 'comanda__total--vazia': vazia }">
        {{ moeda.format(comanda.total) }}
      </span>

      <!-- Parcial: só aparece quando existe, sem ocupar linha à toa -->
      <span v-if="comanda.pago > 0 && comanda.restante > 0" class="comanda__restante pdv-valor">
        falta {{ moeda.format(comanda.restante) }}
      </span>

      <!-- Estado. Um selo, nunca dois. -->
      <span v-if="estado.selo" class="comanda__selo">{{ estado.selo }}</span>

      <!-- Rodapé: quem e desde quando -->
      <span class="comanda__pe">
        <span class="comanda__garcom">{{ comanda.garcom?.nome ?? 'Sem garçom' }}</span>
        <span class="comanda__tempo pdv-valor">{{ duracao(minutosAbertos) }}</span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.comanda {
  display: flex;
  gap: var(--e-3);
  width: 100%;
  min-height: 148px;
  padding: var(--e-3);
  text-align: left;
  background: var(--sup-cartao);
  border: 1px solid var(--linha);
  border-radius: var(--r-cartao);
  box-shadow: var(--sombra-cartao);
  cursor: pointer;
  transition: background-color var(--tempo-toque) var(--curva),
              border-color var(--tempo-toque) var(--curva);
}
.comanda:active { background: var(--sup-pressed); }

/* Selecionado é borda, não gradiente laranja. O laranja é da ação. */
.comanda--sel { border-color: var(--linha-forte); background: var(--sup-elevado); }

.comanda:focus-visible { outline: 2px solid var(--acao); outline-offset: 2px; }

.comanda__corpo {
  display: flex;
  flex-direction: column;
  gap: var(--e-1);
  flex: 1;
  min-width: 0;
}

.comanda__topo { display: flex; flex-direction: column; min-width: 0; }

.comanda__nome {
  font-size: var(--t-destaque);
  font-weight: 600;
  color: var(--txt);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.comanda__cliente {
  font-size: var(--t-micro);
  color: var(--txt-2);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.comanda__total {
  margin-top: auto;
  font-size: var(--t-valor);
  font-weight: 600;
  color: var(--txt);
}
.comanda__total--vazia { color: var(--txt-3); font-weight: 400; }

.comanda__restante { font-size: var(--t-micro); color: var(--st-conta); }

.comanda__selo {
  align-self: flex-start;
  max-width: 100%;
  padding: 3px var(--e-2);
  border-radius: 6px;
  font-size: var(--t-micro);
  font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.comanda--pronto  .comanda__selo { background: var(--st-pronto-bg);  color: var(--st-pronto); }
.comanda--cozinha .comanda__selo { background: var(--st-cozinha-bg); color: var(--st-cozinha); }
.comanda--conta   .comanda__selo { background: var(--st-conta-bg);   color: var(--st-conta); }
.comanda--atencao .comanda__selo { background: var(--st-atencao-bg); color: var(--st-atencao); }

.comanda__pe {
  display: flex;
  justify-content: space-between;
  gap: var(--e-2);
  padding-top: var(--e-1);
  font-size: var(--t-micro);
  color: var(--txt-3);
}
.comanda__garcom { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.comanda__tempo { flex-shrink: 0; }
</style>
