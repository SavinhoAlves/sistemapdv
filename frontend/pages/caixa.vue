<template>
  <div
    class="h-screen flex flex-col bg-neutral-100 dark:bg-neutral-950 overflow-hidden transition-colors duration-200 com-sidebar"
    :class="caixaAberto && !isAdmin ? 'lg:pr-72 xl:pr-80' : ''"
  >
    <Sidebar />
    <Navbar />

    <!-- CAIXA FECHADO (operador) -->
    <div v-if="!caixaAberto && !isAdmin" class="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <div class="w-16 h-16 rounded-2xl bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center">
        <LockKeyhole :size="28" class="text-neutral-400 dark:text-neutral-700" />
      </div>
      <h3 class="text-lg font-black text-neutral-700 dark:text-neutral-300">Caixa fechado</h3>
      <p class="text-sm text-neutral-400">O administrador precisa abrir o caixa para iniciar as vendas.</p>
    </div>

    <!-- ══ PAINEL ADMIN ══ -->
    <template v-else-if="isAdmin">
      <div class="flex-1 overflow-y-auto">

        <!-- HEADER + ABAS + AÇÕES -->
        <div class="px-4 sm:px-6 pt-5 pb-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div>
              <h2 class="text-base font-black text-neutral-900 dark:text-white">Painel do Caixa</h2>
              <p v-if="aba === 'atual' && caixaAberto && caixaStore.caixaAtual?.data_abertura" class="text-xs text-neutral-400 mt-0.5">
                Aberto às {{ fmtHora(caixaStore.caixaAtual.data_abertura) }}
              </p>
            </div>
            <div class="flex items-center gap-1 bg-neutral-200/70 dark:bg-neutral-900 rounded-xl p-1">
              <button @click="aba = 'atual'"
                class="h-7 px-3 rounded-lg text-[11px] font-black transition-all"
                :class="aba === 'atual'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'">
                Caixa Atual
              </button>
              <button @click="abrirHistorico"
                class="h-7 px-3 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5"
                :class="aba === 'historico'
                  ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'">
                <History :size="11" /> Histórico
              </button>
            </div>
          </div>
          <div v-if="aba === 'atual' && caixaAberto" class="flex items-center gap-2">
            <button @click="modalMovimento = 'suprimento'"
              class="h-8 px-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black transition-all flex items-center gap-1.5">
              <ArrowDownLeft :size="12" /> Suprimento
            </button>
            <button @click="modalMovimento = 'sangria'"
              class="h-8 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 dark:text-red-400 text-xs font-black transition-all flex items-center gap-1.5">
              <ArrowUpRight :size="12" /> Sangria
            </button>
            <button @click="buscarAdmin(true)" :disabled="carregandoAdmin"
              class="h-8 px-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-400 text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-50">
              <RefreshCw :size="12" :class="carregandoAdmin ? 'animate-spin' : ''" /> Atualizar
            </button>
          </div>
        </div>

        <!-- ABA ATUAL — CAIXA FECHADO -->
        <div v-if="aba === 'atual' && !caixaAberto" class="flex flex-col items-center justify-center gap-4 text-center px-8 py-20">
          <div class="w-16 h-16 rounded-2xl bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center">
            <LockKeyhole :size="28" class="text-neutral-400 dark:text-neutral-700" />
          </div>
          <h3 class="text-lg font-black text-neutral-700 dark:text-neutral-300">Caixa fechado</h3>
          <p class="text-sm text-neutral-400">Use o botão "Abrir Caixa" na barra superior para iniciar as vendas,<br class="hidden sm:block" /> ou consulte os fechamentos anteriores na aba Histórico.</p>
        </div>

        <div v-else-if="aba === 'atual'" class="px-4 sm:px-6 pb-4 sm:pb-6 pt-1 space-y-4">

          <!-- KPI: SALDO -->
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5">
              <p class="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Saldo Inicial</p>
              <p class="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white mt-2 leading-none">R$ {{ fmt(totaisCaixa?.valor_inicial) }}</p>
            </div>
            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5">
              <p class="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Entradas</p>
              <p class="text-xl sm:text-2xl font-black text-green-600 dark:text-green-400 mt-2 leading-none">R$ {{ fmt(totaisCaixa?.total_entradas) }}</p>
            </div>
            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 sm:p-5">
              <p class="text-[10px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Saídas</p>
              <p class="text-xl sm:text-2xl font-black text-red-500 dark:text-red-400 mt-2 leading-none">R$ {{ fmt(totaisCaixa?.total_saidas) }}</p>
            </div>
            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-green-200 dark:border-green-900/60 p-4 sm:p-5">
              <p class="text-[10px] font-black uppercase tracking-widest text-green-500 dark:text-green-600">Dinheiro em Gaveta</p>
              <p class="text-xl sm:text-2xl font-black text-green-600 dark:text-green-400 mt-2 leading-none">R$ {{ fmt(totaisCaixa?.esperado_dinheiro) }}</p>
            </div>
            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-orange-200 dark:border-orange-900/60 p-4 sm:p-5">
              <p class="text-[10px] font-black uppercase tracking-widest text-orange-400 dark:text-orange-600">Saldo Atual</p>
              <p class="text-xl sm:text-2xl font-black text-orange-500 mt-2 leading-none">R$ {{ fmt(totaisCaixa?.saldo_atual) }}</p>
            </div>
          </div>

          <!-- VENDAS POR MÉTODO + MESAS ABERTAS -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <!-- VENDAS POR MÉTODO -->
            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                <h3 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Vendas por Método</h3>
                <span v-if="vendasResumo?.quantidade" class="text-[11px] font-bold text-neutral-400 truncate">
                  {{ vendasResumo.quantidade }} vendas · ticket R$ {{ fmt(vendasResumo.ticket_medio) }}
                </span>
              </div>
              <div v-if="carregandoAdmin" class="p-4 space-y-2">
                <div v-for="n in 3" :key="n" class="h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
              </div>
              <div v-else-if="!porMetodo.length" class="flex flex-col items-center justify-center py-10 text-center px-5">
                <Wallet :size="24" class="text-neutral-300 dark:text-neutral-700 mb-2" />
                <p class="text-xs text-neutral-400">Nenhuma venda registrada</p>
              </div>
              <div v-else class="divide-y divide-neutral-50 dark:divide-neutral-800 max-h-72 overflow-y-auto">
                <div v-for="m in porMetodo" :key="m.metodo"
                  class="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                      <component :is="iconeMetodo(m.metodo)" :size="13" class="text-orange-500" />
                    </div>
                    <p class="text-sm font-black text-neutral-900 dark:text-white truncate">{{ m.metodo }}</p>
                    <span class="text-[10px] font-black text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded-md px-1.5 py-0.5 shrink-0">{{ m.qtd }}</span>
                  </div>
                  <p class="text-sm font-black text-neutral-900 dark:text-white shrink-0 ml-3">R$ {{ fmt(m.total) }}</p>
                </div>
              </div>
              <div v-if="porMetodo.length && vendasResumo" class="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span class="text-xs font-bold text-neutral-400">Total em vendas</span>
                <span class="text-sm font-black text-neutral-900 dark:text-white">R$ {{ fmt(vendasResumo.total) }}</span>
              </div>
            </div>

            <!-- MESAS ABERTAS -->
            <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h3 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Mesas Abertas</h3>
                <span class="text-xs font-black text-orange-500">{{ mesasAbertas.length }}</span>
              </div>
              <div v-if="carregandoAdmin" class="p-4 space-y-2">
                <div v-for="n in 3" :key="n" class="h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
              </div>
              <div v-else-if="!mesasAbertas.length" class="flex flex-col items-center justify-center py-10 text-center px-5">
                <LayoutGrid :size="24" class="text-neutral-300 dark:text-neutral-700 mb-2" />
                <p class="text-xs text-neutral-400">Nenhuma mesa aberta</p>
              </div>
              <div v-else class="divide-y divide-neutral-50 dark:divide-neutral-800 max-h-72 overflow-y-auto">
                <div v-for="mesa in mesasAbertas" :key="mesa.id"
                  class="flex items-center justify-between px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <div class="min-w-0">
                    <p class="text-sm font-black text-neutral-900 dark:text-white truncate">{{ mesa.nome_mesa }}</p>
                    <p class="text-[11px] text-neutral-400 mt-0.5">{{ mesa.cliente || '—' }}{{ mesa.garcom ? ` · ${mesa.garcom}` : '' }}</p>
                  </div>
                  <p class="text-sm font-black text-orange-500 shrink-0 ml-3">R$ {{ fmt(mesa.total_liquido) }}</p>
                </div>
              </div>
              <div v-if="mesasAbertas.length" class="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <span class="text-xs font-bold text-neutral-400">Total em aberto</span>
                <span class="text-sm font-black text-neutral-900 dark:text-white">
                  R$ {{ fmt(mesasAbertas.reduce((s: number, m: any) => s + Number(m.total_liquido || 0), 0)) }}
                </span>
              </div>
            </div>

          </div>

          <!-- MOVIMENTOS -->
          <div class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Movimentos do Caixa</h3>
              <div class="flex gap-1.5 overflow-x-auto scrollbar-none">
                <button v-for="f in filtrosMov" :key="f.id" @click="filtroMov = f.id"
                  class="h-6 px-2.5 rounded-lg text-[10px] font-black whitespace-nowrap shrink-0 transition-all"
                  :class="filtroMov === f.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'">
                  {{ f.label }}
                </button>
              </div>
            </div>
            <div v-if="carregandoAdmin" class="p-4 space-y-2">
              <div v-for="n in 5" :key="n" class="h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
            </div>
            <div v-else-if="!movimentosFiltrados.length" class="flex flex-col items-center justify-center py-10 text-center px-5">
              <ArrowLeftRight :size="24" class="text-neutral-300 dark:text-neutral-700 mb-2" />
              <p class="text-xs text-neutral-400">Sem movimentos registrados</p>
            </div>
            <div v-else class="divide-y divide-neutral-50 dark:divide-neutral-800 max-h-96 overflow-y-auto">
              <div v-for="mov in movimentosFiltrados" :key="mov.id"
                class="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  :class="['pagamento','suprimento'].includes(mov.tipo) ? 'bg-green-50 dark:bg-green-950/40' : 'bg-red-50 dark:bg-red-950/40'">
                  <ArrowDownLeft v-if="['pagamento','suprimento'].includes(mov.tipo)" :size="13" class="text-green-600 dark:text-green-400" />
                  <ArrowUpRight v-else :size="13" class="text-red-500 dark:text-red-400" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-black text-neutral-900 dark:text-white">{{ labelMovimento(mov.tipo) }}</p>
                  <p class="text-[11px] text-neutral-400 truncate">{{ mov.descricao || '—' }} · {{ mov.operador || '—' }}</p>
                </div>
                <span
                  v-if="mov.tipo === 'pagamento' && mov.pagamento_status === 'estornado'"
                  class="text-[9px] font-black uppercase text-red-400 bg-red-50 dark:bg-red-950/40 rounded-md px-1.5 py-0.5 shrink-0">
                  Estornado
                </span>
                <button
                  v-else-if="mov.tipo === 'pagamento' && mov.pagamento_id"
                  @click="movEstorno = mov"
                  class="h-7 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 dark:text-red-400 text-[10px] font-black transition-all flex items-center gap-1 shrink-0">
                  <Undo2 :size="10" /> Estornar
                </button>
                <div class="text-right shrink-0 w-24">
                  <p class="text-sm font-black"
                    :class="['pagamento','suprimento'].includes(mov.tipo) ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'">
                    {{ ['pagamento','suprimento'].includes(mov.tipo) ? '+' : '−' }} R$ {{ fmt(mov.valor) }}
                  </p>
                  <p class="text-[10px] text-neutral-400">{{ fmtHora(mov.created_at) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ABA HISTÓRICO -->
        <div v-else class="px-4 sm:px-6 pb-4 sm:pb-6 pt-1 space-y-3">
          <div v-if="carregandoHist" class="space-y-3">
            <div v-for="n in 4" :key="n" class="h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </div>
          <div v-else-if="!historico.length" class="flex flex-col items-center justify-center py-20 text-center">
            <History :size="28" class="text-neutral-300 dark:text-neutral-700 mb-2" />
            <p class="text-sm text-neutral-400">Nenhum caixa registrado ainda</p>
          </div>
          <div v-else v-for="cx in historico" :key="cx.id"
            class="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <button @click="toggleDetalhe(cx.id)"
              class="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-black text-neutral-900 dark:text-white">Caixa #{{ cx.id }}</p>
                  <span class="text-[9px] font-black uppercase rounded-md px-1.5 py-0.5"
                    :class="cx.status === 'aberto'
                      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40'
                      : 'text-neutral-500 bg-neutral-100 dark:bg-neutral-800'">
                    {{ cx.status }}
                  </span>
                </div>
                <p class="text-[11px] text-neutral-400 mt-0.5 truncate">
                  {{ fmtDataCurta(cx.data_abertura) }} → {{ cx.fechado_em ? fmtDataCurta(cx.fechado_em) : 'em aberto' }} · {{ cx.operador || '—' }}
                </p>
              </div>
              <div class="flex items-center gap-4 shrink-0">
                <div class="text-right hidden sm:block">
                  <p class="text-[10px] text-neutral-400 uppercase font-black">Fechamento</p>
                  <p class="text-sm font-black text-neutral-900 dark:text-white">R$ {{ fmt(cx.valor_fechamento) }}</p>
                </div>
                <div class="text-right">
                  <p class="text-[10px] text-neutral-400 uppercase font-black">Diferença</p>
                  <p v-if="cx.diferenca === null || cx.diferenca === undefined" class="text-sm font-black text-neutral-400">—</p>
                  <p v-else class="text-sm font-black"
                    :class="Number(cx.diferenca) < -0.005 ? 'text-red-500' : 'text-green-600 dark:text-green-400'">
                    {{ Number(cx.diferenca) >= 0 ? '+' : '−' }} R$ {{ fmt(Math.abs(Number(cx.diferenca))) }}
                  </p>
                </div>
                <ChevronDown :size="14" class="text-neutral-400 transition-transform" :class="expandido === cx.id ? 'rotate-180' : ''" />
              </div>
            </button>

            <!-- DETALHES -->
            <div v-if="expandido === cx.id" class="border-t border-neutral-100 dark:border-neutral-800 px-5 py-4">
              <div v-if="!detalhes[cx.id]" class="space-y-2">
                <div v-for="n in 3" :key="n" class="h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
              </div>
              <template v-else>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div class="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-3">
                    <p class="text-[9px] font-black uppercase tracking-widest text-neutral-400">Saldo Inicial</p>
                    <p class="text-sm font-black text-neutral-900 dark:text-white mt-1">R$ {{ fmt(detalhes[cx.id].totais.valor_inicial) }}</p>
                  </div>
                  <div class="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-3">
                    <p class="text-[9px] font-black uppercase tracking-widest text-neutral-400">Entradas</p>
                    <p class="text-sm font-black text-green-600 dark:text-green-400 mt-1">R$ {{ fmt(detalhes[cx.id].totais.total_entradas) }}</p>
                  </div>
                  <div class="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-3">
                    <p class="text-[9px] font-black uppercase tracking-widest text-neutral-400">Saídas</p>
                    <p class="text-sm font-black text-red-500 mt-1">R$ {{ fmt(detalhes[cx.id].totais.total_saidas) }}</p>
                  </div>
                  <div class="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-3">
                    <p class="text-[9px] font-black uppercase tracking-widest text-neutral-400">Dinheiro Esperado</p>
                    <p class="text-sm font-black text-neutral-900 dark:text-white mt-1">R$ {{ fmt(detalhes[cx.id].totais.esperado_dinheiro) }}</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Vendas por Método</p>
                    <p v-if="!detalhes[cx.id].porMetodo?.length" class="text-xs text-neutral-400">Sem vendas</p>
                    <div v-else class="space-y-1.5">
                      <div v-for="m in detalhes[cx.id].porMetodo" :key="m.metodo" class="flex justify-between text-xs">
                        <span class="text-neutral-500 dark:text-neutral-400">{{ m.metodo }} ({{ m.qtd }})</span>
                        <span class="font-black text-neutral-800 dark:text-neutral-200">R$ {{ fmt(m.total) }}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">
                      Movimentos ({{ detalhes[cx.id].movimentos.length }})
                    </p>
                    <div class="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                      <div v-for="mv in detalhes[cx.id].movimentos" :key="mv.id" class="flex justify-between gap-2 text-xs">
                        <span class="text-neutral-500 dark:text-neutral-400 truncate">{{ labelMovimento(mv.tipo) }} · {{ mv.descricao || '—' }}</span>
                        <span class="font-black shrink-0"
                          :class="['pagamento','suprimento'].includes(mv.tipo) ? 'text-green-600 dark:text-green-400' : 'text-red-500'">
                          {{ ['pagamento','suprimento'].includes(mv.tipo) ? '+' : '−' }} R$ {{ fmt(mv.valor) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p v-if="detalhes[cx.id].caixa.observacao_fechamento" class="text-[11px] text-neutral-400 italic mt-4">
                  Obs: {{ detalhes[cx.id].caixa.observacao_fechamento }}
                </p>
              </template>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ POS: VENDA DE FICHAS (operador/caixa) ══ -->
    <VendaDireta v-else @venda-registrada="buscar" />

    <!-- MODAL SANGRIA / SUPRIMENTO -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalMovimento" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="modalMovimento = null">
          <div class="bg-white dark:bg-neutral-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 class="text-lg font-black text-neutral-900 dark:text-white mb-1 capitalize">{{ modalMovimento }}</h2>
            <p class="text-xs text-neutral-500 mb-5">
              {{ modalMovimento === 'sangria' ? 'Retirada de dinheiro do caixa' : 'Entrada de dinheiro no caixa' }}
            </p>
            <label for="mov-valor" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Valor (R$)</label>
            <input id="mov-valor" name="mov-valor" v-model="movForm.valor" type="number" min="0.01" step="0.01" placeholder="0,00"
              class="w-full h-12 px-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-neutral-900 dark:text-white font-bold text-sm outline-none focus:border-orange-500 transition-all mb-3" />
            <label for="mov-desc" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Descrição (opcional)</label>
            <input id="mov-desc" name="mov-desc" v-model="movForm.descricao" type="text" placeholder="Ex: Troco inicial"
              class="w-full h-12 px-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-neutral-900 dark:text-white font-medium text-sm outline-none focus:border-orange-500 transition-all mb-5" />
            <div class="flex gap-3">
              <button @click="modalMovimento = null"
                class="flex-1 h-12 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-sm font-black hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">
                Cancelar
              </button>
              <button @click="registrarMovimento" :disabled="salvandoMov || !movForm.valor"
                class="flex-1 h-12 rounded-2xl text-white text-sm font-black transition-all active:scale-95 disabled:opacity-40"
                :class="modalMovimento === 'sangria' ? 'bg-red-500 hover:bg-red-400' : 'bg-blue-500 hover:bg-blue-400'">
                {{ salvandoMov ? 'Salvando…' : 'Confirmar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- MODAL ESTORNO -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="movEstorno" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" @click.self="movEstorno = null">
          <div class="bg-white dark:bg-neutral-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <h2 class="text-lg font-black text-neutral-900 dark:text-white mb-1">Estornar pagamento</h2>
            <p class="text-xs text-neutral-500 mb-1 truncate">{{ movEstorno.descricao || 'Pagamento' }}</p>
            <p class="text-base font-black text-red-500 mb-5">R$ {{ fmt(movEstorno.valor) }}</p>

            <label for="estorno-motivo" class="block text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Motivo (opcional)</label>
            <input id="estorno-motivo" name="estorno-motivo" v-model="motivoEstorno" type="text" maxlength="120" placeholder="Ex: cobrança duplicada"
              class="w-full h-12 px-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl text-neutral-900 dark:text-white font-medium text-sm outline-none focus:border-orange-500 transition-all mb-3" />

            <p class="text-[11px] text-neutral-400 mb-5">
              O pagamento sai dos totais do caixa. Em vendas de balcão, o pedido é cancelado e o estoque gerenciado é devolvido.
            </p>

            <div class="flex gap-3">
              <button @click="movEstorno = null"
                class="flex-1 h-12 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 text-sm font-black hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all">
                Cancelar
              </button>
              <button @click="confirmarEstorno" :disabled="estornando"
                class="flex-1 h-12 rounded-2xl bg-red-500 hover:bg-red-400 text-white text-sm font-black transition-all active:scale-95 disabled:opacity-40">
                {{ estornando ? 'Estornando…' : 'Confirmar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import {
  LockKeyhole, RefreshCw, LayoutGrid, Wallet,
  ArrowLeftRight, ArrowUpRight, ArrowDownLeft,
  History, Undo2, ChevronDown
} from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import VendaDireta from '~/components/venda/VendaDireta.vue'
import { useApi } from '~/services/api'
import { useCaixaStore }  from '~/stores/caixa'
import { useToastStore }  from '~/stores/toast'
import { useAuthStore }   from '~/stores/auth'
import { useSocket }      from '~/services/socket'
import { iconeMetodo } from '~/composables/useIconeMetodo'

definePageMeta({ layout: false })

const api         = useApi()
const caixaStore  = useCaixaStore()
const toastStore  = useToastStore()
const authStore   = useAuthStore()
const socket      = useSocket()

const isAdmin    = computed(() => authStore.usuario?.cargo === 'administrador')
const caixaAberto = computed(() => caixaStore.aberto)

// ══ ADMIN: PAINEL DO CAIXA ══
const aba             = ref<'atual' | 'historico'>('atual')
const movimentos      = ref<any[]>([])
const totaisCaixa     = ref<any>(null)
const porMetodo       = ref<any[]>([])
const vendasResumo    = ref<any>(null)
const mesasAbertas    = ref<any[]>([])
const carregandoAdmin = ref(false)

// Filtro do extrato
const filtroMov  = ref('todos')
const filtrosMov = [
  { id: 'todos',      label: 'Todos' },
  { id: 'pagamento',  label: 'Vendas' },
  { id: 'suprimento', label: 'Suprimentos' },
  { id: 'sangria',    label: 'Sangrias' },
  { id: 'estorno',    label: 'Estornos' }
]
const movimentosFiltrados = computed(() =>
  filtroMov.value === 'todos'
    ? movimentos.value
    : movimentos.value.filter(m => m.tipo === filtroMov.value)
)

// Estorno de pagamento
const movEstorno    = ref<any>(null)
const motivoEstorno = ref('')
const estornando    = ref(false)

async function confirmarEstorno() {
  if (!movEstorno.value || estornando.value) return
  estornando.value = true
  try {
    await api.post('/caixa/estorno', {
      movimento_id: movEstorno.value.id,
      motivo: motivoEstorno.value || undefined
    })
    toastStore.success('Pagamento estornado')
    movEstorno.value = null
    motivoEstorno.value = ''
    await buscarAdmin()
  } catch (e: any) {
    toastStore.error('Erro ao estornar', e?.message)
  } finally {
    estornando.value = false
  }
}

// Histórico de caixas
const historico      = ref<any[]>([])
const carregandoHist = ref(false)
const expandido      = ref<number | null>(null)
const detalhes       = ref<Record<number, any>>({})

function abrirHistorico() {
  aba.value = 'historico'
  carregarHistorico()
}

async function carregarHistorico() {
  carregandoHist.value = true
  try {
    const rows = await api.get<any[]>('/caixa/historico')
    historico.value = Array.isArray(rows) ? rows : []
  } catch {
    toastStore.error('Erro ao carregar histórico')
  } finally {
    carregandoHist.value = false
  }
}

async function toggleDetalhe(id: number) {
  if (expandido.value === id) { expandido.value = null; return }
  expandido.value = id
  if (!detalhes.value[id]) {
    try {
      detalhes.value[id] = await api.get<any>(`/caixa/historico/${id}`)
    } catch {
      toastStore.error('Erro ao carregar detalhes do caixa')
    }
  }
}

function fmtDataCurta(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function labelMovimento(tipo: string) {
  const map: Record<string, string> = {
    pagamento: 'Pagamento', suprimento: 'Suprimento', sangria: 'Sangria', estorno: 'Estorno'
  }
  return map[tipo] || tipo
}

function fmtHora(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// mostrarLoading só deve ser true na carga inicial (ou clique manual em
// "Atualizar") — do contrário, o polling em segundo plano troca os dados
// reais pelos skeletons a cada atualização
async function buscarAdmin(mostrarLoading = false) {
  if (!isAdmin.value) return
  if (mostrarLoading) carregandoAdmin.value = true
  try {
    const [mov, mesas] = await Promise.all([
      api.get<any>('/caixa/movimentos'),
      api.get<any[]>('/caixa/mesas-abertas')
    ])
    movimentos.value   = mov?.movimentos || []
    totaisCaixa.value  = mov?.totais || null
    porMetodo.value    = mov?.porMetodo || []
    vendasResumo.value = mov?.vendas || null
    mesasAbertas.value = Array.isArray(mesas) ? mesas : []
  } catch {
    toastStore.error('Erro ao carregar dados do painel')
  } finally {
    if (mostrarLoading) carregandoAdmin.value = false
  }
}

// ══ MOVIMENTOS ══
const modalMovimento = ref<'sangria' | 'suprimento' | null>(null)
const salvandoMov    = ref(false)
const movForm        = reactive({ valor: '', descricao: '' })

async function registrarMovimento() {
  if (!movForm.valor || Number(movForm.valor) <= 0) return
  salvandoMov.value = true
  try {
    await api.post('/caixa/movimento', { tipo: modalMovimento.value, valor: Number(movForm.valor), descricao: movForm.descricao || undefined })
    toastStore.success(`${modalMovimento.value === 'sangria' ? 'Sangria' : 'Suprimento'} registrado!`)
    modalMovimento.value = null; movForm.valor = ''; movForm.descricao = ''
    await buscar()
    if (isAdmin.value) buscarAdmin()
  } catch (e: any) { toastStore.error('Erro', e?.message) }
  finally { salvandoMov.value = false }
}

// ══ FORMATAÇÃO ══
const fmt = (v: any) => Number(v || 0).toFixed(2)

// ══ BUSCA DE DADOS ══
async function buscar() {
  try {
    const statusCaixa = await api.get<any>('/caixa/atual')
    caixaStore.aberto     = statusCaixa?.aberto || false
    caixaStore.caixaAtual = statusCaixa?.caixa  || null
  } catch {
    toastStore.error('Erro ao carregar dados do caixa')
  }
}

async function atualizarDados() {
  await buscar()
  if (isAdmin.value && caixaAberto.value) buscarAdmin()
}

let pollingTimer: ReturnType<typeof setInterval> | null = null
const desinscrever: Array<() => void> = []

function onVisibilityChange() {
  if (!document.hidden) atualizarDados()
}

onMounted(async () => {
  await buscar()
  if (isAdmin.value && caixaAberto.value) buscarAdmin(true)
  pollingTimer = setInterval(() => { if (!document.hidden) atualizarDados() }, 30000)
  document.addEventListener('visibilitychange', onVisibilityChange)

  // Tempo real via socket (conexão é gerenciada globalmente em
  // plugins/socket.client.ts); o polling acima continua como rede de segurança
  desinscrever.push(socket.on('caixa:atualizado', () => atualizarDados()))
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  desinscrever.forEach(fn => fn())
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
