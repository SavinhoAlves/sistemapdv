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
            <button @click="buscarAdmin" :disabled="carregandoAdmin"
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
    <template v-else>

      <!-- VENDA DE FICHAS -->
      <div class="flex-1 flex overflow-hidden">

        <!-- PRODUTOS -->
        <div class="flex-1 flex flex-col overflow-hidden">

          <!-- BUSCA + CATEGORIAS -->
          <div class="px-4 pt-3 pb-2 space-y-2 shrink-0">
            <div class="relative">
              <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                id="busca-produto" name="busca-produto"
                v-model="busca" type="text" placeholder="Buscar produto…"
                class="w-full h-9 pl-9 pr-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 outline-none focus:border-orange-400 transition-all"
              />
            </div>
            <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                v-for="cat in ['Todos', ...categorias]" :key="cat"
                @click="categoriaAtiva = cat"
                class="h-7 px-3 rounded-lg text-[11px] font-black whitespace-nowrap shrink-0 transition-all"
                :class="categoriaAtiva === cat
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 hover:border-orange-300'"
              >{{ cat }}</button>
            </div>
          </div>

          <!-- GRID DE PRODUTOS -->
          <div class="flex-1 overflow-y-auto px-4 pb-4">
            <div v-if="!produtosFiltrados.length" class="flex flex-col items-center justify-center h-48 gap-2 text-neutral-400">
              <Package :size="28" class="text-neutral-300 dark:text-neutral-700" />
              <p class="text-sm">Nenhum produto encontrado</p>
            </div>
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
              <button
                v-for="p in produtosFiltrados" :key="p.id"
                @click="adicionarAoCarrinho(p)"
                class="group relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 flex flex-col items-center text-center hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-md active:scale-95 transition-all"
                :class="p.gerenciar_estoque && p.estoque_atual <= 0 ? 'opacity-50 cursor-not-allowed hover:border-neutral-200 dark:hover:border-neutral-800 hover:shadow-none' : ''"
              >
                <!-- BADGE ESTOQUE -->
                <span
                  v-if="p.gerenciar_estoque && p.estoque_atual <= 0"
                  class="absolute top-1.5 right-1.5 text-[9px] font-black bg-red-100 dark:bg-red-950/50 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded-md leading-none"
                >Esgotado</span>
                <span
                  v-else-if="p.gerenciar_estoque && p.estoque_minimo > 0 && p.estoque_atual <= p.estoque_minimo"
                  class="absolute top-1.5 right-1.5 text-[9px] font-black bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md leading-none"
                >{{ p.estoque_atual }} un.</span>

                <div class="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center mb-2.5">
                  <UtensilsCrossed :size="14" class="text-orange-500" />
                </div>
                <p class="text-xs font-black text-neutral-900 dark:text-white leading-snug line-clamp-2">{{ p.nome }}</p>
                <p v-if="p.categoria" class="text-[10px] text-neutral-400 mt-0.5 truncate w-full">{{ p.categoria }}</p>
                <p class="text-sm font-black text-orange-500 mt-1.5">R$ {{ fmt(p.preco) }}</p>
              </button>
            </div>
          </div>
        </div>

        <!-- BACKDROP CARRINHO (mobile) -->
        <div
          v-if="carrinhoAberto"
          @click="carrinhoAberto = false"
          class="fixed inset-0 bg-black/40 z-10 lg:hidden"
        />

        <!-- CARRINHO -->
        <div
          class="fixed right-0 top-0 w-full sm:w-96 lg:w-72 xl:w-80 h-screen bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl dark:shadow-black/60 flex flex-col z-20 transition-transform duration-300 lg:translate-x-0"
          :class="carrinhoAberto ? 'translate-x-0' : 'translate-x-full'"
        >

          <!-- HEADER CARRINHO -->
          <div class="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2">
              <ShoppingCart :size="14" class="text-orange-500" />
              <span class="text-xs font-black text-neutral-900 dark:text-white">Carrinho</span>
              <span v-if="carrinho.length" class="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                {{ carrinho.length }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button v-if="carrinho.length" @click="carrinho = []"
                class="text-[10px] font-black text-red-400 hover:text-red-500 transition-colors">
                Limpar
              </button>
              <button @click="carrinhoAberto = false"
                class="lg:hidden w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition-colors">
                <X :size="14" />
              </button>
            </div>
          </div>

          <!-- ITENS -->
          <div class="flex-1 overflow-y-auto">
            <div v-if="!carrinho.length" class="flex flex-col items-center justify-center h-full gap-2 text-neutral-400 p-6 text-center">
              <ShoppingCart :size="24" class="text-neutral-300 dark:text-neutral-700" />
              <p class="text-xs">Toque em um produto para adicionar</p>
            </div>

            <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800">
              <div v-for="(item, idx) in carrinho" :key="item.produto_id" class="flex items-center gap-2 px-3 py-2.5">
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-black text-neutral-800 dark:text-neutral-200 truncate">{{ item.nome_produto }}</p>
                  <p class="text-[11px] text-orange-500 font-bold">R$ {{ fmt(item.preco_unit) }}</p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  <button @click="decrementar(idx)"
                    class="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors">
                    <Minus :size="10" />
                  </button>
                  <span class="w-6 text-center text-xs font-black text-neutral-900 dark:text-white">{{ item.quantidade }}</span>
                  <button @click="incrementar(idx)"
                    class="w-6 h-6 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors">
                    <Plus :size="10" />
                  </button>
                </div>
                <span class="text-xs font-black text-neutral-700 dark:text-neutral-300 w-14 text-right shrink-0">
                  R$ {{ fmt(item.preco_unit * item.quantidade) }}
                </span>
              </div>
            </div>
          </div>

          <!-- FOOTER: TOTAIS + PAGAMENTO -->
          <div class="border-t border-neutral-100 dark:border-neutral-800 p-3 space-y-3 shrink-0">

            <!-- DESCONTO -->
            <div class="flex items-center gap-2">
              <label for="desconto-venda" class="text-[10px] font-black uppercase tracking-widest text-neutral-400 shrink-0">Desconto R$</label>
              <input
                id="desconto-venda" name="desconto-venda"
                v-model="desconto" type="number" min="0" step="0.01" placeholder="0,00"
                class="flex-1 h-8 px-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs font-bold text-neutral-800 dark:text-neutral-200 outline-none focus:border-orange-400 transition-all text-right"
              />
            </div>

            <!-- TOTAIS -->
            <div class="bg-neutral-50 dark:bg-neutral-800/60 rounded-xl p-2.5 space-y-1">
              <div class="flex justify-between text-[11px] text-neutral-500">
                <span>Subtotal</span><span>R$ {{ fmt(subtotal) }}</span>
              </div>
              <div v-if="descontoNum > 0" class="flex justify-between text-[11px] text-green-500">
                <span>Desconto</span><span>− R$ {{ fmt(descontoNum) }}</span>
              </div>
              <div class="flex justify-between text-sm font-black text-neutral-900 dark:text-white pt-1 border-t border-neutral-200 dark:border-neutral-700">
                <span>Total</span><span>R$ {{ fmt(total) }}</span>
              </div>
            </div>

            <!-- MÉTODO DE PAGAMENTO -->
            <div>
              <p class="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1.5">Pagamento</p>
              <div class="grid grid-cols-2 gap-1.5">
                <button
                  v-for="m in metodos" :key="m.id"
                  @click="metodoSelecionado = m; valorRecebido = ''"
                  class="h-9 rounded-xl border text-[11px] font-black transition-all flex items-center justify-center gap-1.5"
                  :class="metodoSelecionado?.id === m.id
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-orange-300'"
                >
                  <component :is="iconeMetodo(m.nome)" :size="12" />
                  {{ m.nome }}
                </button>
              </div>
            </div>

            <!-- TROCO (só dinheiro) -->
            <Transition name="slide-down">
              <div v-if="metodoSelecionado?.nome === 'Dinheiro'" class="space-y-1.5">
                <label for="valor-recebido" class="text-[10px] font-black uppercase tracking-widest text-neutral-400">Valor recebido</label>
                <input
                  id="valor-recebido" name="valor-recebido"
                  v-model="valorRecebido" type="number" min="0" step="0.01" placeholder="0,00"
                  class="w-full h-9 px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-black text-neutral-900 dark:text-white outline-none focus:border-orange-400 transition-all"
                />
                <div v-if="trocoVal > 0" class="flex justify-between items-center bg-green-50 dark:bg-green-950/30 rounded-xl px-3 py-2">
                  <span class="text-xs font-bold text-green-700 dark:text-green-400">Troco</span>
                  <span class="text-sm font-black text-green-700 dark:text-green-400">R$ {{ fmt(trocoVal) }}</span>
                </div>
                <p v-if="valorRecebidoNum > 0 && valorRecebidoNum < total" class="text-[11px] text-red-500 font-bold text-center">
                  Valor insuficiente — faltam R$ {{ fmt(total - valorRecebidoNum) }}
                </p>
              </div>
            </Transition>

            <!-- CONFIRMAR -->
            <button
              @click="confirmarVenda"
              :disabled="!podePagar || processando"
              class="w-full h-11 rounded-2xl text-white text-sm font-black transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2"
              :class="podePagar ? 'bg-green-500 hover:bg-green-400' : 'bg-neutral-300 dark:bg-neutral-700'"
            >
              <Loader2 v-if="processando" :size="16" class="animate-spin" />
              <CheckCircle2 v-else :size="16" />
              {{ processando ? 'Processando…' : 'Confirmar Venda' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- FAB CARRINHO (mobile, não-admin) -->
    <button
      v-if="!isAdmin"
      @click="carrinhoAberto = true"
      class="fixed bottom-6 right-6 z-30 lg:hidden w-14 h-14 rounded-2xl bg-orange-500 shadow-xl shadow-orange-500/40 flex items-center justify-center transition-all active:scale-95"
    >
      <ShoppingCart :size="22" class="text-white" />
      <span v-if="carrinho.length" class="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 border-2 border-white text-white text-[10px] font-black flex items-center justify-center">
        {{ carrinho.length }}
      </span>
    </button>

    <!-- ══ MODAL FICHA ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="fichaAtual" class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden">

            <!-- CABEÇALHO CUPOM -->
            <div class="px-6 pt-6 pb-4 text-center border-b border-dashed border-neutral-200 dark:border-neutral-700">
              <img
                v-if="configStore.logo_base64"
                :src="configStore.logo_base64"
                class="h-12 mx-auto mb-3 object-contain"
                alt="Logo"
              />
              <div v-else class="w-11 h-11 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-3">
                <UtensilsCrossed :size="18" class="text-white" />
              </div>
              <p class="font-black text-neutral-900 dark:text-white text-sm uppercase tracking-widest leading-tight">
                {{ configStore.nome_restaurante }}
              </p>
              <p class="text-[10px] text-neutral-400 mt-1">
                {{ fichaAtual.numero }} · {{ fmtFichaDateTime(fichaAtual.createdAt) }}
              </p>
              <p class="text-[10px] text-neutral-400">Operador: {{ fichaAtual.operador }}</p>
            </div>

            <!-- ITENS -->
            <div class="px-5 py-3 border-b border-dashed border-neutral-200 dark:border-neutral-700 max-h-48 overflow-y-auto space-y-1.5">
              <div v-for="item in fichaAtual.itens" :key="item.produto_id"
                class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-[11px] font-black text-orange-500 shrink-0">{{ item.quantidade }}×</span>
                  <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{{ item.nome_produto }}</span>
                </div>
                <span class="text-xs font-black text-neutral-900 dark:text-white shrink-0">
                  R$ {{ fmt(item.preco_unit * item.quantidade) }}
                </span>
              </div>
            </div>

            <!-- TOTAIS -->
            <div class="px-5 py-3 border-b border-dashed border-neutral-200 dark:border-neutral-700 space-y-1.5">
              <div class="flex justify-between text-[11px] text-neutral-400">
                <span>Subtotal</span><span>R$ {{ fmt(fichaAtual.total) }}</span>
              </div>
              <div v-if="fichaAtual.desconto > 0" class="flex justify-between text-[11px] text-green-500 font-bold">
                <span>Desconto</span><span>− R$ {{ fmt(fichaAtual.desconto) }}</span>
              </div>
              <div class="flex justify-between text-sm font-black text-neutral-900 dark:text-white">
                <span>TOTAL</span><span>R$ {{ fmt(fichaAtual.totalLiquido) }}</span>
              </div>
              <div class="flex justify-between text-[11px] text-neutral-400 pt-0.5">
                <span>{{ fichaAtual.metodo }}</span>
                <span>Pago R$ {{ fmt(fichaAtual.valorPago) }}</span>
              </div>
              <div v-if="fichaAtual.troco > 0" class="flex justify-between text-[11px] font-black text-green-600 dark:text-green-400">
                <span>Troco</span><span>R$ {{ fmt(fichaAtual.troco) }}</span>
              </div>
            </div>

            <!-- MENSAGEM -->
            <p class="text-center text-[10px] text-neutral-400 py-3 px-5 italic">
              {{ configStore.mensagem_ficha }}
            </p>

            <!-- AÇÕES -->
            <div class="flex gap-2 px-4 pb-4">
              <button @click="imprimirFicha"
                class="flex-1 h-11 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5">
                <Printer :size="13" /> Imprimir
              </button>
              <button @click="fecharFicha"
                class="flex-1 h-11 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5">
                <Plus :size="13" /> Nova Venda
              </button>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

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
  LockKeyhole, Package, ShoppingCart, Plus, Minus, CheckCircle2, Loader2,
  CreditCard, Printer, Search, X, RefreshCw, LayoutGrid,
  Banknote, QrCode, Wallet, ArrowLeftRight, ArrowUpRight, ArrowDownLeft,
  UtensilsCrossed, History, Undo2, ChevronDown
} from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import { useApi } from '~/services/api'
import { useCaixaStore }  from '~/stores/caixa'
import { useToastStore }  from '~/stores/toast'
import { useAuthStore }   from '~/stores/auth'
import { useConfigStore } from '~/stores/configuracoes'

definePageMeta({ layout: false })

const api         = useApi()
const caixaStore  = useCaixaStore()
const toastStore  = useToastStore()
const authStore   = useAuthStore()
const configStore = useConfigStore()

const isAdmin    = computed(() => authStore.usuario?.cargo === 'administrador')
const caixaAberto = computed(() => caixaStore.aberto)

const carrinhoAberto = ref(false)

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
    await Promise.all([buscarAdmin(), carregarProdutos()])
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

async function buscarAdmin() {
  if (!isAdmin.value) return
  carregandoAdmin.value = true
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
    carregandoAdmin.value = false
  }
}

// ══ PRODUTOS ══
interface Produto {
  id: number
  nome: string
  preco: number
  categoria: string | null
  categoria_id: number | null
  ativo: number
  gerenciar_estoque: number
  estoque_atual: number
  estoque_minimo: number
}
const todosProdutos   = ref<Produto[]>([])
const categorias      = ref<string[]>([])
const categoriaAtiva  = ref('Todos')
const busca           = ref('')

const produtosFiltrados = computed(() => {
  let lista = todosProdutos.value.filter(p => p.ativo)
  if (categoriaAtiva.value !== 'Todos') lista = lista.filter(p => p.categoria === categoriaAtiva.value)
  if (busca.value.trim()) {
    const q = busca.value.toLowerCase()
    lista = lista.filter(p => p.nome.toLowerCase().includes(q))
  }
  return lista
})

// ══ CARRINHO ══
interface CartItem { produto_id: number; nome_produto: string; preco_unit: number; quantidade: number }
const carrinho = ref<CartItem[]>([])

function adicionarAoCarrinho(p: Produto) {
  const idx = carrinho.value.findIndex(i => i.produto_id === p.id)
  const qtdNoCarrinho = idx >= 0 ? carrinho.value[idx].quantidade : 0

  if (p.gerenciar_estoque) {
    if (p.estoque_atual <= 0) {
      toastStore.warning(`${p.nome} está sem estoque`)
      return
    }
    if (qtdNoCarrinho >= p.estoque_atual) {
      toastStore.warning(`Estoque insuficiente — disponível: ${p.estoque_atual}`)
      return
    }
  }

  if (idx >= 0) {
    carrinho.value[idx].quantidade++
  } else {
    carrinho.value.push({ produto_id: p.id, nome_produto: p.nome, preco_unit: Number(p.preco), quantidade: 1 })
  }
}
function incrementar(idx: number) { carrinho.value[idx].quantidade++ }
function decrementar(idx: number) {
  if (carrinho.value[idx].quantidade <= 1) carrinho.value.splice(idx, 1)
  else carrinho.value[idx].quantidade--
}

// ══ PAGAMENTO ══
const desconto          = ref('')
const metodoSelecionado = ref<any>(null)
const valorRecebido     = ref('')
const metodos           = ref<any[]>([])
const processando       = ref(false)

const subtotal       = computed(() => carrinho.value.reduce((s, i) => s + i.preco_unit * i.quantidade, 0))
const descontoNum    = computed(() => Math.min(Math.max(Number(desconto.value) || 0, 0), subtotal.value))
const total          = computed(() => subtotal.value - descontoNum.value)
const valorRecebidoNum = computed(() => Number(valorRecebido.value) || 0)
const trocoVal       = computed(() => metodoSelecionado.value?.nome === 'Dinheiro' ? Math.max(0, valorRecebidoNum.value - total.value) : 0)
const podePagar      = computed(() => {
  if (!carrinho.value.length || !metodoSelecionado.value || total.value <= 0) return false
  if (metodoSelecionado.value.nome === 'Dinheiro') return valorRecebidoNum.value >= total.value
  return true
})

function iconeMetodo(nome: string) {
  const n = (nome || '').toLowerCase()
  if (n.includes('dinheiro'))              return Banknote
  if (n.includes('pix'))                  return QrCode
  if (n.includes('crédito') || n.includes('credito')) return CreditCard
  if (n.includes('débito')  || n.includes('debito'))  return CreditCard
  if (n.includes('transfer'))             return ArrowLeftRight
  return Wallet
}

// ══ FICHA ══
const fichaAtual = ref<any>(null)

async function confirmarVenda() {
  if (!podePagar.value || processando.value) return
  processando.value = true
  try {
    const resp = await api.post<any>('/vendas', {
      itens: carrinho.value,
      metodo_id: metodoSelecionado.value.id,
      desconto:  descontoNum.value,
      valor_pago: metodoSelecionado.value.nome === 'Dinheiro' ? valorRecebidoNum.value : total.value
    })
    fichaAtual.value = resp.ficha
    carrinho.value = []
    desconto.value = ''
    metodoSelecionado.value = null
    valorRecebido.value = ''
    carrinhoAberto.value = false
    await Promise.all([buscar(), carregarProdutos()])
    if (configStore.impressora_auto_imprimir) imprimirFicha()
  } catch (e: any) {
    toastStore.error('Erro ao registrar venda', e?.message)
  } finally {
    processando.value = false
  }
}

function fecharFicha() { fichaAtual.value = null }

async function imprimirFicha() {
  if (!fichaAtual.value) return
  const ficha    = fichaAtual.value

  // Impressão direta na térmica via backend — sem diálogo do navegador
  if (configStore.impressaoDireta) {
    try {
      await api.post('/impressao/ficha', {
        itens:  ficha.itens.map((i: any) => ({ nome: i.nome_produto, quantidade: i.quantidade })),
        info:   `${fmtFichaDateTime(ficha.createdAt)} · ${ficha.operador || '—'}`,
        codigo: ficha.numero
      })
    } catch (e: any) {
      toastStore.error('Falha na impressão', e?.message)
    }
    return
  }

  const nomeRest = configStore.nome_restaurante || 'Restaurante PDV'
  const logo     = configStore.logo_base64
  const mensagem = configStore.mensagem_ficha || 'Obrigado pela preferência!'
  const dataStr  = fmtFichaDateTime(ficha.createdAt)
  const logoHtml = logo
    ? `<img src="${logo}" style="height:40px;object-fit:contain;margin-bottom:6px;" />`
    : ''

  const mm     = configStore.impressora_largura === 58 ? 58 : 80
  const copias = Math.max(1, configStore.impressora_copias || 1)

  const fichas: string[] = []
  for (const item of ficha.itens) {
    for (let u = 0; u < item.quantidade; u++) {
      for (let c = 0; c < copias; c++) {
        fichas.push(`
          <div class="ticket">
            ${logoHtml}
            <div class="restaurante">${nomeRest}</div>
            <div class="info">${dataStr} · ${ficha.operador || '—'}</div>
            <div class="sep"></div>
            <div class="produto">${item.nome_produto}</div>
            <div class="sep"></div>
            <div class="codigo">${ficha.numero}</div>
            <div class="mensagem">${mensagem}</div>
          </div>
        `)
      }
    }
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fichas</title>
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

function imprimirHtml(html: string) {
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;'
  document.body.appendChild(iframe)

  // onload definido ANTES de escrever o documento
  iframe.onload = () => {
    // delay para o browser processar @page size antes de abrir o diálogo
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
function fmtFichaDateTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

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

async function carregarProdutos() {
  try {
    const rows = await api.get<Produto[]>('/produtos')
    todosProdutos.value = Array.isArray(rows) ? rows.filter(p => p.ativo) : []
    const cats = [...new Set(todosProdutos.value.map(p => p.categoria).filter(Boolean))] as string[]
    categorias.value = cats.sort()
  } catch {}
}

async function carregarMetodos() {
  try {
    metodos.value = await api.get<any[]>('/pagamentos/metodos')
  } catch {}
}

async function atualizarDados() {
  await buscar()
  if (isAdmin.value && caixaAberto.value) {
    buscarAdmin()
  } else if (!isAdmin.value && caixaAberto.value) {
    carregarProdutos()
  }
}

let pollingTimer: ReturnType<typeof setInterval> | null = null

function onVisibilityChange() {
  if (!document.hidden) atualizarDados()
}

onMounted(async () => {
  await Promise.all([buscar(), carregarProdutos(), carregarMetodos(), configStore.carregar()])
  if (isAdmin.value && caixaAberto.value) buscarAdmin()
  pollingTimer = setInterval(() => { if (!document.hidden) atualizarDados() }, 30000)
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-down-enter-active, .slide-down-leave-active { transition: all .2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
