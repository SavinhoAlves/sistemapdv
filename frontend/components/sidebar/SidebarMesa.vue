<template>
  <Transition name="slide">

    <aside v-if="modelValue" class="sm-painel" aria-label="Comanda da mesa">

      <!-- CABEÇALHO -->
      <header class="sm-cabeca">
        <div class="min-w-0">
          <p class="sm-mesa">{{ mesa?.nome_mesa || `Mesa ${mesa?.numero}` }}</p>
          <h2 class="sm-cliente">{{ mesa?.cliente || 'Sem cliente' }}</h2>
          <span v-if="rfidAtivo && garcomRfid" class="sm-garcom">
            <UserRound :size="14" /> {{ garcomRfid.nome }}
          </span>
        </div>
        <button class="sm-fechar" aria-label="Fechar painel" @click="fechar">
          <X :size="20" />
        </button>
      </header>

      <!-- ITENS: a tela imita o cupom impresso -->
      <div ref="listaRef" class="sm-lista">

        <div v-if="loading" class="space-y-2">
          <div v-for="n in 5" :key="n" class="sm-esqueleto" />
        </div>

        <div v-else-if="produtos.length === 0" class="sm-vazio">
          <span class="sm-vazio-icone"><ReceiptText :size="26" /></span>
          <h3>Nenhum item lançado</h3>
          <p>Use “Lançar produtos” para começar a comanda desta mesa.</p>
        </div>

        <template v-else>
          <p class="sm-dica">Segure um item para reimprimir a ficha</p>

          <ul class="sm-itens">
            <li
              v-for="produto in produtos"
              :key="produto.id"
              class="sm-item"
              @contextmenu.prevent="(e) => onContextMenu(e, produto.id)"
              @pointerdown="(e) => onPointerDown(e, produto.id)"
            >
              <div class="sm-item__info">
                <span class="sm-item__nome">{{ produto.nome }}</span>
                <span class="sm-item__unit pdv-valor">{{ moeda(produto.preco_unitario) }} / un</span>
              </div>

              <div class="sm-qtd" @pointerdown.stop>
                <button :aria-label="`Remover uma unidade de ${produto.nome}`" @click.stop="removerItem(produto)">
                  <Minus :size="16" />
                </button>
                <span class="pdv-valor">{{ produto.quantidade }}</span>
                <button :aria-label="`Adicionar uma unidade de ${produto.nome}`" @click.stop="adicionarItem(produto)">
                  <Plus :size="16" />
                </button>
              </div>

              <span class="sm-item__total pdv-valor">{{ moeda(produto.total) }}</span>

              <button
                class="sm-excluir"
                :aria-label="`Excluir ${produto.nome}`"
                @pointerdown.stop
                @click.stop="excluirItem(produto.id)"
              >
                <Trash2 :size="16" />
              </button>
            </li>
          </ul>

          <!-- Abatimentos: linhas do cupom, sem gesto -->
          <ul v-if="abatimentos.length" class="sm-abats">
            <li v-for="abat in abatimentos" :key="'abat-' + abat.id">
              <BadgePercent :size="16" />
              <span class="flex-1 truncate">{{ abat.motivo || 'Abatimento' }}</span>
              <span class="pdv-valor">− {{ moeda(abat.valor) }}</span>
            </li>
          </ul>
        </template>
      </div>

      <!-- RODAPÉ: conta + ações -->
      <footer class="sm-pe">

        <dl class="sm-conta">
          <div v-if="desconto > 0">
            <dt>Abatimento</dt>
            <dd class="pdv-valor">− {{ moeda(desconto) }}</dd>
          </div>

          <div v-if="podeTaxa">
            <dt>
              <button
                class="sm-taxa"
                role="switch"
                :aria-checked="taxaPct > 0"
                :disabled="alternandoTaxa || !pedidoId"
                @click="alternarTaxa"
              >
                <span class="sm-chave" :class="{ on: taxaPct > 0 }"><i /></span>
                Taxa de serviço{{ taxaPct > 0 ? ` (${taxaPct}%)` : '' }}
              </button>
            </dt>
            <dd v-if="taxaPct > 0" class="pdv-valor">+ {{ moeda(taxaValor) }}</dd>
          </div>

          <div v-if="valorPago > 0">
            <dt>Já pago</dt>
            <dd class="pdv-valor sm-pago">− {{ moeda(valorPago) }}</dd>
          </div>
        </dl>

        <div class="sm-total">
          <span>{{ valorPago > 0 ? 'Restante' : 'Total' }}</span>
          <strong class="pdv-valor">{{ moeda(restante) }}</strong>
        </div>

        <div class="sm-secundarias">
          <button class="sm-sec" @click="imprimir">
            <PrinterIcon :size="18" /> Conta
          </button>
          <button class="sm-sec" :disabled="!caixaAberto" @click="caixaAberto ? (modalDesconto = true) : exigirCaixa()">
            <Divide :size="18" /> Desconto
          </button>
          <button class="sm-sec" :disabled="!caixaAberto" @click="caixaAberto ? (modalAbater = true) : exigirCaixa()">
            <BadgePercent :size="18" /> Abater
          </button>
        </div>

        <div class="sm-principais" :class="{ dupla: podeFecharMesa }">
          <button
            class="pdv-botao pdv-botao--confirmar"
            :class="[podeFecharMesa ? 'pdv-botao--neutro' : 'pdv-botao--acao', { 'sm-off': !caixaAberto }]"
            @click="emitirAbrirProdutosComRfid"
          >
            <Plus :size="20" /> {{ podeFecharMesa ? 'Produtos' : 'Lançar produtos' }}
          </button>
          <button
            v-if="podeFecharMesa"
            class="pdv-botao pdv-botao--acao pdv-botao--confirmar"
            :class="{ 'sm-off': !caixaAberto }"
            @click="abrirPagamentoComRfid"
          >
            <CreditCard :size="20" /> Pagar
          </button>
        </div>
      </footer>

      <!-- FOLHA: ABATER -->
      <Transition name="pop">
        <div v-if="modalAbater" class="sm-veu" @click.self="fecharModalAbater">
          <div class="sm-folha" role="dialog" aria-labelledby="sm-abater-titulo">
            <div class="sm-folha__topo">
              <h3 id="sm-abater-titulo">Abater valor</h3>
              <button class="sm-fechar" aria-label="Fechar" @click="fecharModalAbater"><X :size="18" /></button>
            </div>

            <div class="sm-linha-valor">
              <span>Total atual</span>
              <strong class="pdv-valor">{{ moeda(totalLiquido) }}</strong>
            </div>

            <div class="sm-campo">
              <label for="valor-abater" class="pdv-rotulo">Valor a abater</label>
              <div class="sm-campo__wrap">
                <span>R$</span>
                <input
                  id="valor-abater"
                  name="valor-abater"
                  ref="inputAbaterRef"
                  v-model="valorAbater"
                  class="pdv-campo pdv-valor"
                  type="number"
                  min="0.01"
                  :max="totalLiquido"
                  step="0.01"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div v-if="valorAbaterNum > 0" class="sm-linha-valor sm-linha-valor--depois">
              <span>Total após abatimento</span>
              <strong class="pdv-valor">{{ moeda(Math.max(0, totalLiquido - valorAbaterNum)) }}</strong>
            </div>

            <div class="sm-folha__acoes">
              <button class="pdv-botao pdv-botao--neutro" @click="fecharModalAbater">Cancelar</button>
              <button
                class="pdv-botao pdv-botao--acao"
                :disabled="valorAbaterNum <= 0 || valorAbaterNum > totalLiquido || salvandoAbater"
                @click="confirmarAbater"
              >
                {{ salvandoAbater ? 'Salvando…' : 'Confirmar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- FOLHA: DESCONTO -->
      <Transition name="pop">
        <div v-if="modalDesconto" class="sm-veu" @click.self="fecharModalDesconto">
          <div class="sm-folha" role="dialog" aria-labelledby="sm-desconto-titulo">
            <div class="sm-folha__topo">
              <h3 id="sm-desconto-titulo">Aplicar desconto</h3>
              <button class="sm-fechar" aria-label="Fechar" @click="fecharModalDesconto"><X :size="18" /></button>
            </div>

            <div class="sm-alternar" role="group" aria-label="Tipo de desconto">
              <button :class="{ ativo: modoDesconto === 'pct' }" @click="modoDesconto = 'pct'; valorDesconto = ''">Porcentagem (%)</button>
              <button :class="{ ativo: modoDesconto === 'val' }" @click="modoDesconto = 'val'; valorDesconto = ''">Valor (R$)</button>
            </div>

            <div class="sm-campo__wrap">
              <span>{{ modoDesconto === 'pct' ? '%' : 'R$' }}</span>
              <input
                id="valor-desconto"
                name="valor-desconto"
                ref="inputDescontoRef"
                v-model="valorDesconto"
                class="pdv-campo pdv-valor"
                aria-label="Valor do desconto"
                type="number"
                min="0.01"
                :max="modoDesconto === 'pct' ? 100 : totalLiquido"
                step="0.01"
                placeholder="0"
              />
            </div>

            <div v-if="valorDescontoCalc > 0" class="sm-linha-valor sm-linha-valor--depois">
              <span>Total após desconto</span>
              <strong class="pdv-valor">{{ moeda(Math.max(0, totalLiquido - valorDescontoCalc)) }}</strong>
            </div>

            <div class="sm-folha__acoes">
              <button class="pdv-botao pdv-botao--neutro" @click="fecharModalDesconto">Cancelar</button>
              <button
                class="pdv-botao pdv-botao--acao"
                :disabled="valorDescontoCalc <= 0 || salvandoDesconto"
                @click="confirmarDesconto"
              >
                {{ salvandoDesconto ? 'Salvando…' : 'Aplicar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

    </aside>
  </Transition>

  <!-- MODAL PAGAMENTO -->
  <ModalPagamento
    :aberto="modalPagamento"
    :mesa="mesa"
    :pedido-id="pedidoId"
    :total="restante"
    @fechar="modalPagamento = false"
    @pago="onPago"
    @parcial="onParcial"
  />

  <!-- RADIAL (acionado por long press) -->
  <MenuFlutuanteProduto
    :aberto="menuAberto !== null"
    :quantidade="produtoSelecionado?.quantidade || 0"
    :posicao-manual="radialPos"
    @adicionar="handleAdicionar"
    @remover="handleRemover"
    @reimprimir="handleReimprimir"
  />

  <!-- RFID: identificação do garçom para qualquer ação -->
  <ModalRfidAuth
    v-model="rfidModal"
    :mensagem="rfidMensagem"
    :erro="erroModal"
    :identificado="rfidIdentificado"
    :carregando-rfid="carregandoRfid"
    @auth-success="onRfidSuccess"
    @confirmar="onRfidConfirmar"
    @cancelar="onRfidCancelar"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useCaixaStore } from '~/stores/caixa'
import { useConfigStore }      from '~/stores/configuracoes'
import { useImpressorasStore } from '~/stores/impressoras'
import { useAuthStore } from '~/stores/auth'
import {
  X,
  PrinterIcon,
  Divide,
  CreditCard,
  Trash2,
  BadgePercent,
  Plus,
  Minus,
  UserRound,
  ReceiptText,
} from 'lucide-vue-next'
import MenuFlutuanteProduto from '../modals/MenuFlutuanteProduto.vue'
import ModalPagamento from '../modals/ModalPagamento.vue'
import ModalRfidAuth from '../modals/ModalRfidAuth.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'
import { useRfidIdentify } from '~/composables/useRfidIdentify'

// Valores da comanda sempre no formato da moeda (vírgula decimal, R$)
const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const moeda = (v: number | string | null | undefined) => formatoMoeda.format(Number(v ?? 0))

const props = defineProps({
  modelValue:   Boolean,
  mesa:         { type: Object, default: null },
  garcomSessao: { type: Object as () => { id: number; nome: string } | null, default: null }
})

const emit = defineEmits(['update:modelValue', 'abrir-produtos', 'estoque-atualizado', 'mesa-fechada', 'garcom-mismatch'])

const api         = useApi()
const toastStore  = useToastStore()
const caixaStore       = useCaixaStore()
const configStore      = useConfigStore()
const impressorasStore = useImpressorasStore()
const authStore        = useAuthStore()
const {
  rfidAtivo,
  modalAberto:    rfidModal,
  mensagemModal:  rfidMensagem,
  erroModal,
  identificado:   rfidIdentificado,
  carregandoRfid,
  identificarViaRfid,
  onRfidSuccess,
  onRfidConfirmar,
  onRfidCancelar,
} = useRfidIdentify()
const caixaAberto = computed(() => caixaStore.aberto)
const podeFecharMesa = computed(() => authStore.isCaixa || authStore.temPermissao('fecharMesa'))
const podeTaxa       = computed(() => authStore.usuario?.cargo === 'administrador' || authStore.isCaixa)

// Identificação RFID do garçom para a sessão atual (null = sem RFID identificado)
const garcomRfid       = ref<{ id: number; nome: string } | null>(null)
const abrindoProdutos  = ref(false)

async function emitirAbrirProdutosComRfid() {
  if (!caixaAberto.value) { exigirCaixa(); return }
  if (abrindoProdutos.value) return
  abrindoProdutos.value = true
  try {
    // Usa sessão da página se disponível; senão solicita cartão
    let garcom: { id: number; nome: string } | null = props.garcomSessao || null
    if (!garcom) {
      const lido = await identificarViaRfid('Passe o cartão para identificar o garçom', true)
      if (lido) garcom = lido
    }

    if (garcom) {
      const donoDaMesa = props.mesa?.garcom_id
      if (donoDaMesa && donoDaMesa !== garcom.id) {
        emit('garcom-mismatch', garcom)
        return
      }
      garcomRfid.value = { id: garcom.id, nome: garcom.nome }
    }
    emit('abrir-produtos')
  } catch {
    // cancelado ou cartão inválido
  } finally {
    abrindoProdutos.value = false
  }
}

function exigirCaixa() {
  toastStore.warning('Abra o caixa para realizar esta ação')
}

interface ProdutoMesa {
  id: number
  produto_id: number
  pedido_id: number
  nome: string
  quantidade: number
  total: number
  preco_unitario: number
}

// ─── Produtos ─────────────────────────────────────────────
const loading  = ref(false)
const produtos = ref<ProdutoMesa[]>([])
const listaRef = ref<HTMLElement | null>(null)

const pedidoId = computed(() => produtos.value[0]?.pedido_id ?? null)

const totalGeral = computed(() =>
  produtos.value.reduce((acc, p) => acc + Number(p.total || 0), 0)
)

// ─── Abatimento ───────────────────────────────────────────
interface Abatimento { id: number; valor: number; motivo?: string | null }

const abatimentos    = ref<Abatimento[]>([])
const modalAbater    = ref(false)
const valorAbater    = ref<string>('')
const salvandoAbater = ref(false)
const inputAbaterRef = ref<HTMLInputElement | null>(null)

const desconto       = computed(() => abatimentos.value.reduce((s, a) => s + Number(a.valor), 0))
const valorAbaterNum = computed(() => parseFloat(valorAbater.value) || 0)
const totalLiquido   = computed(() => Math.max(0, totalGeral.value - desconto.value))

// ─── Taxa de serviço + pagamentos parciais ────────────────
const taxaPct       = ref(0)
const valorPago     = ref(0)
const alternandoTaxa = ref(false)

const taxaValor  = computed(() => Math.round(totalLiquido.value * taxaPct.value) / 100)
const totalConta = computed(() => totalLiquido.value + taxaValor.value)
const restante   = computed(() => Math.max(0, Math.round((totalConta.value - valorPago.value) * 100) / 100))

async function alternarTaxa() {
  if (!pedidoId.value || alternandoTaxa.value) return
  try {
    await identificarViaRfid('Passe o cartão para alterar a taxa de serviço', true)
  } catch { return }
  alternandoTaxa.value = true
  try {
    const res = await api.patch<{ taxa_pct: number }>(`/pedidos/${pedidoId.value}/taxa-servico`, {
      aplicar: taxaPct.value === 0
    })
    taxaPct.value = Number(res.taxa_pct)
    toastStore.success(taxaPct.value > 0
      ? `Taxa de serviço de ${taxaPct.value}% aplicada`
      : 'Taxa de serviço removida')
  } catch (err: any) {
    toastStore.error(err?.message || 'Erro ao alterar taxa de serviço')
  } finally {
    alternandoTaxa.value = false
  }
}

function fecharModalAbater() {
  modalAbater.value = false
  valorAbater.value = ''
}

async function confirmarAbater() {
  if (!pedidoId.value || valorAbaterNum.value <= 0 || salvandoAbater.value) return
  try {
    await identificarViaRfid('Passe o cartão para aplicar o abatimento', true)
  } catch { return }

  salvandoAbater.value = true
  try {
    await api.patch(`/pedidos/${pedidoId.value}/abater`, { valor: valorAbaterNum.value })
    abatimentos.value.push({ id: Date.now(), valor: valorAbaterNum.value, motivo: 'Abatimento' })
    toastStore.success(`R$ ${valorAbaterNum.value.toFixed(2)} abatido do pedido`)
    fecharModalAbater()
  } catch (err: any) {
    toastStore.error(err?.message || 'Erro ao abater valor')
  } finally {
    salvandoAbater.value = false
  }
}

watch(modalAbater, (aberto) => {
  if (aberto) nextTick(() => inputAbaterRef.value?.focus())
})

// ─── Desconto ─────────────────────────────────────────────
const modalDesconto      = ref(false)
const valorDesconto      = ref('')
const modoDesconto       = ref<'pct' | 'val'>('pct')
const salvandoDesconto   = ref(false)
const inputDescontoRef   = ref<HTMLInputElement | null>(null)

const valorDescontoNum = computed(() => parseFloat(valorDesconto.value) || 0)
const valorDescontoCalc = computed(() => {
  if (modoDesconto.value === 'pct') {
    return Math.min((valorDescontoNum.value / 100) * totalLiquido.value, totalLiquido.value)
  }
  return Math.min(valorDescontoNum.value, totalLiquido.value)
})

function fecharModalDesconto() {
  modalDesconto.value = false
  valorDesconto.value = ''
}

async function confirmarDesconto() {
  if (!pedidoId.value || valorDescontoCalc.value <= 0 || salvandoDesconto.value) return
  try {
    await identificarViaRfid('Passe o cartão para aplicar o desconto', true)
  } catch { return }

  salvandoDesconto.value = true
  const motivo = modoDesconto.value === 'pct'
    ? `Desconto ${valorDescontoNum.value}%`
    : 'Desconto'
  try {
    await api.patch(`/pedidos/${pedidoId.value}/abater`, { valor: valorDescontoCalc.value, motivo })
    abatimentos.value.push({ id: Date.now(), valor: valorDescontoCalc.value, motivo })
    toastStore.success(`${motivo} de R$ ${valorDescontoCalc.value.toFixed(2)} aplicado`)
    fecharModalDesconto()
  } catch (err: any) {
    toastStore.error(err?.message || 'Erro ao aplicar desconto')
  } finally {
    salvandoDesconto.value = false
  }
}

watch(modalDesconto, (v) => { if (v) nextTick(() => inputDescontoRef.value?.focus()) })

// ─── Pagamento ────────────────────────────────────────────
const modalPagamento = ref(false)

async function abrirPagamentoComRfid() {
  if (!caixaAberto.value) { exigirCaixa(); return }
  try {
    await identificarViaRfid('Passe o cartão para processar o pagamento', true)
  } catch { return }
  modalPagamento.value = true
}

function onPago() {
  modalPagamento.value = false
  emit('mesa-fechada')
  fechar()
}

function onParcial() {
  carregarProdutos()
}

// ─── Impressão ────────────────────────────────────────────
function imprimirHtml(html: string) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;'
  document.body.appendChild(iframe)

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow!.focus()
      iframe.contentWindow!.print()
      setTimeout(() => document.body.removeChild(iframe), 2000)
    }, 250)
  }

  const doc = iframe.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()
}

async function imprimir() {
  const mesa   = props.mesa
  const itens  = produtos.value
  const abats  = abatimentos.value
  const total  = totalGeral.value
  const liquido = totalLiquido.value
  const data   = new Date().toLocaleString('pt-BR')

  if (impressorasStore.impressaoDiretaPara('caixa')) {
    try {
      await api.post('/impressao/conta', {
        mesa: `Mesa ${mesa?.nome_mesa || mesa?.numero || mesa?.id}`,
        itens: itens.map(p => ({ nome: p.nome, quantidade: p.quantidade, total: p.total })),
        subtotal: total,
        abatimentos: abats.map(a => ({ motivo: a.motivo, valor: a.valor })),
        taxa_pct: taxaPct.value,
        taxa_valor: taxaValor.value,
        pago: valorPago.value,
        restante: restante.value
      })
    } catch (err: any) {
      toastStore.error('Falha na impressão', err?.message)
    }
    return
  }

  const linhasItens = itens.map(p =>
    `<tr>
      <td>${p.nome}</td>
      <td style="text-align:center">${p.quantidade}</td>
      <td style="text-align:right">R$ ${Number(p.preco_unitario).toFixed(2)}</td>
      <td style="text-align:right">R$ ${Number(p.total).toFixed(2)}</td>
    </tr>`
  ).join('')

  const linhasAbat = abats.map(a =>
    `<tr style="color:#7c3aed">
      <td colspan="3">${a.motivo || 'Abatimento'}</td>
      <td style="text-align:right">− R$ ${Number(a.valor).toFixed(2)}</td>
    </tr>`
  ).join('')

  const linhaTaxa = taxaPct.value > 0
    ? `<tr>
        <td colspan="3">Taxa de serviço (${taxaPct.value}%)</td>
        <td style="text-align:right">+ R$ ${taxaValor.value.toFixed(2)}</td>
      </tr>`
    : ''
  const linhaPago = valorPago.value > 0
    ? `<tr>
        <td colspan="3">Já pago</td>
        <td style="text-align:right">− R$ ${valorPago.value.toFixed(2)}</td>
      </tr>`
    : ''

  const logo       = configStore.logo_base64
  const nomeRest   = configStore.nome_restaurante || 'Restaurante PDV'
  const logoAltura = ({ pequena: '24px', media: '36px', grande: '96px' } as Record<string, string>)[configStore.logo_tamanho] ?? '36px'
  const logoHtml   = logo
    ? `<img src="${logo}" style="height:${logoAltura};object-fit:contain;display:block;margin:0 auto 4px;" />`
    : ''

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Conta - Mesa ${mesa?.nome_mesa || mesa?.numero}</title>
  <style>
    body { font-family: monospace; font-size: 13px; padding: 16px; max-width: 320px; margin: 0 auto }
    .cabecalho { text-align: center; margin-bottom: 12px }
    h1 { font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 2px }
    .sub { text-align: center; color: #666; margin-bottom: 12px; font-size: 12px }
    table { width: 100%; border-collapse: collapse }
    th { border-bottom: 1px solid #000; padding: 4px 0; font-size: 11px }
    td { padding: 3px 0 }
    .sep { border-top: 1px dashed #000; margin: 8px 0 }
    .total { font-weight: bold; font-size: 15px }
    .liquido { font-weight: bold; font-size: 17px }
  </style></head><body>
  <div class="cabecalho">
    ${logoHtml}
    <h1>${nomeRest}</h1>
    <div style="font-size:11px;color:#888;margin-top:1px">CONTA DA MESA</div>
  </div>
  <div class="sub">Mesa #${mesa?.nome_mesa || mesa?.numero || mesa?.id} &nbsp;|&nbsp; ${data}</div>
  <table>
    <thead><tr>
      <th style="text-align:left">Item</th>
      <th>Qtd</th>
      <th style="text-align:right">Unit.</th>
      <th style="text-align:right">Total</th>
    </tr></thead>
    <tbody>${linhasItens}</tbody>
  </table>
  <div class="sep"></div>
  <table>
    <tbody>
      <tr class="total">
        <td colspan="3">Subtotal</td>
        <td style="text-align:right">R$ ${total.toFixed(2)}</td>
      </tr>
      ${linhasAbat}
      ${linhaTaxa}
      ${linhaPago}
      ${(abats.length || taxaPct.value > 0 || valorPago.value > 0)
        ? `<tr class="liquido"><td colspan="3">Total a pagar</td><td style="text-align:right">R$ ${restante.value.toFixed(2)}</td></tr>`
        : ''}
    </tbody>
  </table>
  </body></html>`

  imprimirHtml(html)
}

// ─── Long press / Radial ──────────────────────────────────
const LONG_PRESS_MS = 460

let longPressTimer: ReturnType<typeof setTimeout> | null = null
let pointerStartX = 0
let pointerStartY = 0

const menuAberto = ref<number | null>(null)
const radialPos  = ref<{ x: number; y: number } | null>(null)

const produtoSelecionado = computed(() =>
  menuAberto.value !== null
    ? (produtos.value.find(p => p.id === menuAberto.value) ?? null)
    : null
)

function fecharRadial() {
  menuAberto.value = null
  radialPos.value  = null
}

function onPointerDown(e: PointerEvent, id: number) {
  if (e.button !== 0) return
  if (menuAberto.value !== null) {
    fecharRadial()
    return
  }

  pointerStartX = e.clientX
  pointerStartY = e.clientY

  window.addEventListener('pointermove', onGlobalMove, { passive: true })
  window.addEventListener('pointerup',   onGlobalEnd)
  window.addEventListener('pointercancel', onGlobalEnd)

  longPressTimer = setTimeout(() => {
    menuAberto.value = id
    radialPos.value  = { x: pointerStartX, y: pointerStartY }
    navigator.vibrate?.(40)
  }, LONG_PRESS_MS)
}

function onContextMenu(e: MouseEvent, id: number) {
  e.stopPropagation()
  menuAberto.value = id
  radialPos.value  = { x: e.clientX, y: e.clientY }
}

function onGlobalMove(e: PointerEvent) {
  const dx = e.clientX - pointerStartX
  const dy = e.clientY - pointerStartY
  if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
    cancelLongPress()
    detach()
  }
}

function onGlobalEnd() {
  detach()
  cancelLongPress()
}

function cancelLongPress() {
  if (longPressTimer !== null) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

function detach() {
  window.removeEventListener('pointermove',   onGlobalMove)
  window.removeEventListener('pointerup',     onGlobalEnd)
  window.removeEventListener('pointercancel', onGlobalEnd)
}

async function adicionarItem(produto: ProdutoMesa) {
  if (!caixaAberto.value) { exigirCaixa(); return }
  try {
    const rfid = await identificarViaRfid('Passe o cartão para adicionar item', true)
    if (rfid) garcomRfid.value = { id: rfid.id, nome: rfid.nome }
  } catch { return }

  const preco = Number(produto.preco_unitario)
  produto.quantidade++
  produto.total = Number(produto.total) + preco

  try {
    await api.post('/pedidos/adicionar', {
      mesa_id:    props.mesa.id,
      produto_id: produto.produto_id,
      quantidade: 1,
      ...(garcomRfid.value ? { garcom_id: garcomRfid.value.id } : {})
    })
  } catch {
    produto.quantidade--
    produto.total = Number(produto.total) - preco
    toastStore.error('Erro ao adicionar item')
  }
}

async function removerItem(produto: ProdutoMesa) {
  if (!caixaAberto.value) { exigirCaixa(); return }
  try {
    const rfid = await identificarViaRfid('Passe o cartão para remover item', true)
    if (rfid) garcomRfid.value = { id: rfid.id, nome: rfid.nome }
  } catch { return }

  const preco = Number(produto.preco_unitario)

  if (produto.quantidade <= 1) {
    await excluirItem(produto.id)
    return
  }

  produto.quantidade--
  produto.total = Number(produto.total) - preco

  try {
    await api.patch(`/pedidos/itens/${produto.id}/decrementar`)
    emit('estoque-atualizado')
  } catch {
    produto.quantidade++
    produto.total = Number(produto.total) + preco
    toastStore.error('Erro ao remover item')
  }
}

async function excluirItem(id: number, silencioso = false) {
  if (!caixaAberto.value) { if (!silencioso) exigirCaixa(); return }
  if (!silencioso) {
    try {
      const rfid = await identificarViaRfid('Passe o cartão para excluir item', true)
      if (rfid) garcomRfid.value = { id: rfid.id, nome: rfid.nome }
    } catch { return }
  }

  const idx  = produtos.value.findIndex(p => p.id === id)
  const item = produtos.value[idx]

  produtos.value = produtos.value.filter(p => p.id !== id)

  try {
    await api.delete(`/pedidos/itens/${id}`)
    emit('estoque-atualizado')
    if (!silencioso) toastStore.success('Item excluído com sucesso!')
  } catch (err) {
    if (item !== undefined) {
      const lista = [...produtos.value]
      lista.splice(idx, 0, item)
      produtos.value = lista
    }
    if (!silencioso) toastStore.error('Erro ao excluir item')
    throw err
  }
}

function handleAdicionar() {
  if (produtoSelecionado.value) adicionarItem(produtoSelecionado.value)
  fecharRadial()
}

function handleRemover() {
  if (produtoSelecionado.value) removerItem(produtoSelecionado.value)
  fecharRadial()
}

async function handleReimprimir() {
  const produto = produtoSelecionado.value
  fecharRadial()
  if (!produto) return

  await configStore.carregar()

  const mesa    = props.mesa
  const dataStr = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  const ref     = `P${String(produto.pedido_id).padStart(6, '0')}`

  if (impressorasStore.impressaoDiretaPara('cozinha')) {
    try {
      await api.post('/impressao/ficha', {
        itens:   [{ nome: produto.nome, quantidade: produto.quantidade }],
        info:    `${dataStr} · ${mesa?.nome_mesa || `Mesa ${mesa?.numero}`}`,
        codigo:  ref,
        destino: 'cozinha'
      })
    } catch (err: any) {
      toastStore.error('Falha na impressão', err?.message)
    }
    return
  }

  const nomeRest   = configStore.nome_restaurante || 'Restaurante PDV'
  const logo       = configStore.logo_base64
  const mensagem   = configStore.mensagem_ficha || 'Obrigado pela preferência!'
  const mm         = configStore.impressora_largura === 58 ? 58 : 80
  const copias     = Math.max(1, configStore.impressora_copias || 1)
  const logoAltura = ({ pequena: '6mm', media: '10mm', grande: '28mm' } as Record<string, string>)[configStore.logo_tamanho] ?? '10mm'

  const logoHtml = logo
    ? `<img src="${logo}" style="height:${logoAltura};object-fit:contain;margin-bottom:2mm;" />`
    : ''

  const fichas: string[] = []
  for (let u = 0; u < produto.quantidade; u++) {
    for (let c = 0; c < copias; c++) {
      fichas.push(`
        <div class="ticket">
          ${logoHtml}
          <div class="restaurante">${nomeRest}</div>
          <div class="info">${dataStr} · ${mesa?.nome_mesa || `Mesa ${mesa?.numero}`}</div>
          <div class="sep"></div>
          <div class="produto">${produto.nome}</div>
          <div class="sep"></div>
          <div class="codigo">${ref}</div>
          <div class="mensagem">${mensagem}</div>
        </div>
      `)
    }
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reimpressão</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: monospace; background: #fff; }
    @page { size: ${mm}mm auto; margin: 0; }
    .ticket {
      width: ${mm}mm;
      margin: 0 auto;
      padding: 4mm 3mm 5mm;
      text-align: center;
      page-break-after: always;
    }
    .ticket:last-child { page-break-after: avoid; }
    .restaurante { font-size: ${mm < 70 ? 7 : 8}pt; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
    .info { font-size: 6pt; color: #666; margin-top: 1mm; }
    .sep { border-top: 1px dashed #000; margin: 3mm 0; }
    .produto {
      font-size: ${mm < 70 ? 16 : 20}pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      padding: 3mm 1mm;
      word-break: break-word;
      line-height: 1.15;
    }
    .codigo { font-size: 6pt; color: #aaa; margin-top: 1mm; }
    .mensagem { font-size: 6pt; color: #888; font-style: italic; margin-top: 2mm; }
  </style></head><body>
  ${fichas.join('')}
  </body></html>`

  imprimirHtml(html)
}

const carregarProdutos = async () => {
  if (!props.mesa?.id) return
  try {
    loading.value  = true
    produtos.value = []
    const [itens, pedido] = await Promise.all([
      api.get<ProdutoMesa[]>(`/mesas/${props.mesa.id}/produtos`),
      api.get<{ abatimentos: Abatimento[]; taxa_pct: number; pago: number } | null>(`/pedidos/mesa/${props.mesa.id}`)
    ])
    produtos.value    = Array.isArray(itens) ? itens : []
    abatimentos.value = pedido?.abatimentos ?? []
    taxaPct.value     = Number(pedido?.taxa_pct ?? 0)
    valorPago.value   = Number(pedido?.pago ?? 0)
  } catch (error) {
    console.error(error)
    produtos.value = []
  } finally {
    loading.value = false
  }
}

const fechar = () => emit('update:modelValue', false)

watch(
  [() => props.modelValue, () => props.mesa?.id],
  ([aberto, mesaId]) => {
    garcomRfid.value = null // limpa sempre que muda de mesa ou fecha
    if (aberto && mesaId) {
      fecharRadial()
      carregarProdutos()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  cancelLongPress()
  detach()
  fecharRadial()
})

defineExpose({ recarregar: carregarProdutos, lancarProdutos: emitirAbrirProdutosComRfid })
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.16,1,0.3,1);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* ── Painel da mesa sobre tokens ────────────────────────────────────────────
   A comanda na tela imita o cupom: itens em linhas, valores monoespaçados,
   linha tracejada antes da conta. Sem blur, sem gradiente; o laranja fica
   na ação principal (Pagar, ou Lançar produtos para quem não fecha mesa). */
.sm-painel {
  position: fixed; right: 0; top: 0; z-index: 30;
  width: 100%; height: 100vh;
  display: flex; flex-direction: column;
  overflow: hidden;
  background: var(--sup-painel);
  border-left: 1px solid var(--linha);
  box-shadow: var(--sombra-folha);
  color: var(--txt);
}
@media (min-width: 1024px) { .sm-painel { width: 420px; } }

.sm-cabeca {
  display: flex; align-items: flex-start; justify-content: space-between; gap: var(--e-3);
  padding: var(--e-5) var(--e-5) var(--e-4);
  border-bottom: 1px solid var(--linha);
  flex-shrink: 0;
}
.sm-mesa { font-size: var(--t-micro); font-weight: 600; color: var(--txt-2); }
.sm-cliente {
  margin-top: 2px;
  font-size: var(--t-titulo); font-weight: 700; letter-spacing: -0.02em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sm-garcom {
  margin-top: var(--e-2);
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--sup-elevado);
  font-size: var(--t-micro); color: var(--txt-2);
}
.sm-fechar {
  width: 44px; height: 44px; flex-shrink: 0;
  display: grid; place-items: center;
  border-radius: var(--r-controle);
  color: var(--txt-2);
}
.sm-fechar:hover { background: var(--sup-elevado); color: var(--txt); }

/* Lista */
.sm-lista { flex: 1; overflow-y: auto; overflow-x: hidden; padding: var(--e-3) var(--e-4) var(--e-4); }
.sm-esqueleto { height: 64px; border-radius: var(--r-controle); background: var(--sup-cartao); animation: sm-pulsar 1.4s ease-in-out infinite; }
@keyframes sm-pulsar { 50% { opacity: .55; } }

.sm-vazio {
  height: 100%; min-height: 240px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--e-2); text-align: center;
}
.sm-vazio-icone {
  width: 56px; height: 56px; margin-bottom: var(--e-2);
  display: grid; place-items: center;
  border-radius: var(--r-cartao);
  background: var(--sup-cartao); border: 1px solid var(--linha);
  color: var(--txt-2);
}
.sm-vazio h3 { font-size: var(--t-destaque); font-weight: 600; }
.sm-vazio p  { max-width: 30ch; font-size: var(--t-micro); color: var(--txt-2); }

.sm-dica { padding: 0 var(--e-1) var(--e-2); font-size: var(--t-micro); color: var(--txt-3); }

.sm-itens { list-style: none; margin: 0; padding: 0; }
.sm-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: var(--e-2);
  min-height: 64px;
  padding: var(--e-2) var(--e-1);
  border-bottom: 1px solid var(--linha);
  user-select: none;
  touch-action: pan-y;
}
.sm-item:last-child { border-bottom: none; }
.sm-item__info { display: flex; flex-direction: column; min-width: 0; }
.sm-item__nome {
  font-size: var(--t-corpo); font-weight: 600; line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.sm-item__unit { font-size: var(--t-micro); color: var(--txt-3); }
.sm-item__total { min-width: 76px; text-align: right; font-size: var(--t-corpo); font-weight: 600; }

/* Stepper de quantidade: alvos de 40px, número tabular no meio */
.sm-qtd {
  display: flex; align-items: center;
  border: 1px solid var(--linha);
  border-radius: var(--r-controle);
  background: var(--sup-cartao);
}
.sm-qtd button {
  width: 40px; height: 40px;
  display: grid; place-items: center;
  color: var(--txt-2);
  border-radius: 9px;
}
.sm-qtd button:hover  { background: var(--sup-elevado); color: var(--txt); }
.sm-qtd button:active { background: var(--sup-pressed); }
.sm-qtd span { min-width: 24px; text-align: center; font-weight: 600; }

.sm-excluir {
  width: 40px; height: 40px;
  display: grid; place-items: center;
  border-radius: var(--r-controle);
  color: var(--txt-3);
}
.sm-excluir:hover { background: var(--st-atencao-bg); color: var(--st-atencao); }

.sm-abats {
  list-style: none; margin: var(--e-2) 0 0; padding: var(--e-3) var(--e-1) 0;
  border-top: 1px dashed var(--linha-forte);
}
.sm-abats li {
  display: flex; align-items: center; gap: var(--e-2);
  min-height: 40px;
  font-size: var(--t-corpo);
  color: var(--st-conta);
}

/* Rodapé */
.sm-pe {
  flex-shrink: 0;
  padding: var(--e-4) var(--e-5) var(--e-5);
  border-top: 1px dashed var(--linha-forte);
  background: var(--sup-painel);
}
.sm-conta { margin: 0; display: flex; flex-direction: column; gap: 2px; }
.sm-conta > div { display: flex; align-items: center; justify-content: space-between; min-height: 32px; }
.sm-conta dt { font-size: var(--t-micro); color: var(--txt-2); }
.sm-conta dd { margin: 0; font-size: var(--t-corpo); color: var(--txt-2); }
.sm-pago { color: var(--st-pronto) !important; }

.sm-taxa {
  display: inline-flex; align-items: center; gap: var(--e-2);
  min-height: 36px;
  font-size: var(--t-micro); color: var(--txt-2);
}
.sm-taxa:disabled { opacity: .45; }
.sm-chave {
  position: relative; width: 36px; height: 20px; border-radius: 999px;
  background: var(--sup-pressed);
  transition: background-color var(--tempo-toque) var(--curva);
}
.sm-chave i {
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff; box-shadow: var(--sombra-cartao);
  transition: transform var(--tempo-toque) var(--curva);
}
.sm-chave.on   { background: var(--st-conta); }
.sm-chave.on i { transform: translateX(16px); }

.sm-total {
  display: flex; align-items: baseline; justify-content: space-between; gap: var(--e-3);
  margin: var(--e-2) 0 var(--e-4);
}
.sm-total span { font-size: var(--t-corpo); font-weight: 500; color: var(--txt-2); }
.sm-total strong { font-size: var(--t-valor-forte); font-weight: 700; line-height: 1; }

.sm-secundarias { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--e-2); margin-bottom: var(--e-2); }
.sm-sec {
  min-height: var(--toque-min);
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border-radius: var(--r-controle);
  border: 1px solid var(--linha);
  background: var(--sup-cartao);
  color: var(--txt-2);
  font-size: var(--t-micro); font-weight: 600;
}
.sm-sec:hover:not(:disabled) { background: var(--sup-elevado); color: var(--txt); }
.sm-sec:disabled { opacity: .45; cursor: not-allowed; }

.sm-principais { display: grid; grid-template-columns: 1fr; gap: var(--e-2); }
.sm-principais.dupla { grid-template-columns: 1fr 1fr; }
.sm-principais .pdv-botao { width: 100%; }
.sm-off { opacity: .45; cursor: not-allowed; }

/* Folhas (abater / desconto) */
.sm-veu {
  position: absolute; inset: 0; z-index: 10;
  display: flex; align-items: flex-end;
  background: #00000073;
}
.sm-folha {
  width: 100%;
  display: flex; flex-direction: column; gap: var(--e-4);
  padding: var(--e-5);
  background: var(--sup-cartao);
  border-top: 1px solid var(--linha);
  border-radius: var(--r-folha) var(--r-folha) 0 0;
  box-shadow: var(--sombra-folha);
}
.sm-folha__topo { display: flex; align-items: center; justify-content: space-between; }
.sm-folha__topo h3 { font-size: var(--t-destaque); font-weight: 700; }
.sm-folha__acoes { display: grid; grid-template-columns: 1fr 1fr; gap: var(--e-2); }
.sm-folha__acoes .pdv-botao:disabled { opacity: .45; cursor: not-allowed; }

.sm-linha-valor {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--e-3) var(--e-4);
  border-radius: var(--r-controle);
  background: var(--sup-elevado);
  font-size: var(--t-micro); color: var(--txt-2);
}
.sm-linha-valor strong { font-size: var(--t-valor); color: var(--txt); font-weight: 600; }
.sm-linha-valor--depois { background: var(--st-pronto-bg); color: var(--st-pronto); }
.sm-linha-valor--depois strong { color: var(--st-pronto); }

.sm-campo { display: flex; flex-direction: column; gap: 6px; }
.sm-campo__wrap { position: relative; }
.sm-campo__wrap > span {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  font-weight: 600; color: var(--txt-3); pointer-events: none;
}
.sm-campo__wrap .pdv-campo { min-height: var(--toque-conf); padding-left: 44px; font-size: var(--t-valor); font-weight: 600; }

.sm-alternar {
  display: grid; grid-template-columns: 1fr 1fr; gap: 3px; padding: 3px;
  background: var(--sup-painel);
  border: 1px solid var(--linha);
  border-radius: var(--r-controle);
}
.sm-alternar button { min-height: 42px; border-radius: 7px; font-size: var(--t-micro); font-weight: 600; color: var(--txt-2); }
.sm-alternar button.ativo { background: var(--sup-elevado); color: var(--txt); box-shadow: var(--sombra-cartao); }

.pop-enter-active, .pop-leave-active { transition: opacity var(--tempo-folha) var(--curva); }
.pop-enter-active .sm-folha, .pop-leave-active .sm-folha { transition: transform var(--tempo-folha) var(--curva); }
.pop-enter-from, .pop-leave-to { opacity: 0; }
.pop-enter-from .sm-folha, .pop-leave-to .sm-folha { transform: translateY(24px); }
</style>
