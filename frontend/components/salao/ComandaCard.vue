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

import { Plus } from 'lucide-vue-next'
import { chaveEstado, minutosDesde, duracao, LIMITE_PARADA_MIN, type ComandaResumo as Comanda } from '~/composables/useEstadoComanda'

const props = withDefaults(
  defineProps<{
    comanda: Comanda
    selecionada?: boolean
    /** Mostra o botão "Lançar produtos" no rodapé do card. */
    podeVender?: boolean
    /** Minutos sem lançamento a partir dos quais a comanda vira alerta. */
    limiteParadaMin?: number
  }>(),
  { selecionada: false, podeVender: false, limiteParadaMin: LIMITE_PARADA_MIN },
)

defineEmits<{ (e: 'abrir', comanda: Comanda): void; (e: 'vender', comanda: Comanda): void }>()

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const minutosAbertos = computed(() => minutosDesde(props.comanda.aberta_em))
const minutosParada  = computed(() => minutosDesde(props.comanda.ultimo_lancamento_em ?? props.comanda.aberta_em))

/**
 * Um estado por comanda, escolhido pela urgência. Prato pronto esperando
 * ganha de tudo: é o único que degrada o produto a cada minuto parado.
 */
const estado = computed(() => {
  const c = props.comanda
  const chave = chaveEstado(c, props.limiteParadaMin)
  const selo = {
    pronto:  c.qtd_prontos === 1 ? '1 pronto para entregar' : `${c.qtd_prontos} prontos para entregar`,
    conta:   c.pago > 0 ? `Pago ${moeda.format(c.pago)} de ${moeda.format(c.total)}` : 'Conta pedida',
    cozinha: `${c.qtd_na_cozinha} na cozinha`,
    atencao: `Sem lançamento há ${duracao(minutosParada.value)}`,
    parado:  null,
  }[chave]
  return { chave, selo }
})

const vazia = computed(() => props.comanda.qtd_itens === 0)
</script>

<template>
  <div class="comanda-wrap" :class="{ 'comanda-wrap--sel': selecionada }">
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
        <span class="comanda__tempo pdv-valor">{{ comanda.aberta_em ? duracao(minutosAbertos) : '—' }}</span>
      </span>
    </span>
  </button>

  <!-- Atalho direto para vender: abre o cardápio da mesa sem passar pelo painel -->
  <button
    v-if="podeVender"
    type="button"
    class="comanda__vender"
    :disabled="comanda.status === 'fechando'"
    :title="comanda.status === 'fechando' ? 'Conta pedida — reabra a mesa para lançar' : 'Lançar produtos'"
    @click="$emit('vender', comanda)"
  >
    <Plus :size="16" stroke-width="2.5" />
    Lançar produtos
  </button>
  </div>
</template>

<style scoped>
/* Card = área de abrir (painel) + faixa de ação (vender). Dois botões irmãos,
   nunca um dentro do outro. */
.comanda-wrap {
  display: flex;
  flex-direction: column;
  background: var(--sup-cartao);
  border: 1px solid var(--linha);
  border-radius: var(--r-cartao);
  box-shadow: var(--sombra-cartao);
  overflow: hidden;
}
.comanda-wrap--sel { border-color: var(--linha-forte); }
.comanda-wrap .comanda { border: none; border-radius: 0; box-shadow: none; }

.comanda__vender {
  min-height: var(--toque-min);
  display: flex; align-items: center; justify-content: center; gap: var(--e-2);
  border-top: 1px solid var(--linha);
  background: transparent;
  color: var(--acao);
  font-size: var(--t-micro);
  font-weight: 600;
  cursor: pointer;
  transition: background-color var(--tempo-toque) var(--curva), color var(--tempo-toque) var(--curva);
}
.comanda__vender:hover:not(:disabled)  { background: var(--acao); color: var(--acao-txt); }
.comanda__vender:active:not(:disabled) { background: var(--acao-press); color: var(--acao-txt); }
.comanda__vender:disabled { color: var(--txt-3); cursor: not-allowed; }
.comanda__vender:focus-visible { outline: 2px solid var(--acao); outline-offset: -2px; }

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
