<template>
  <div class="min-h-screen bg-neutral-100 dark:bg-neutral-950 transition-colors duration-200 com-sidebar">
    <Sidebar />
    <Navbar />

    <main class="p-6 max-w-7xl mx-auto">

      <!-- HEADER -->
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-black text-neutral-900 dark:text-white">Relatórios</h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {{ fmtDia(dataInicio) }}
            <span v-if="dataInicio !== dataFim"> → {{ fmtDia(dataFim) }}</span>
            <span v-if="totalRegistros !== null" class="ml-2 text-orange-500 font-black">· {{ totalRegistros }} pagamento(s)</span>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 no-print">
          <div class="flex bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1 gap-0.5">
            <button v-for="a in atalhos" :key="a.label" @click="aplicarAtalho(a)"
              class="h-7 px-3 rounded-lg text-xs font-black transition-all"
              :class="periodoAtivo === a.label ? 'bg-orange-500 text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'">
              {{ a.label }}
            </button>
          </div>
          <div class="flex items-center gap-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 h-9">
            <CalendarDays :size="13" class="text-neutral-400 shrink-0" />
            <input id="filtro-data-inicio" name="filtro-data-inicio" v-model="dataInicio" type="date" @change="periodoAtivo = 'custom'; buscarTudo()"
              class="bg-transparent text-xs font-bold text-neutral-700 dark:text-neutral-300 outline-none w-[7rem]" />
            <span class="text-neutral-300 dark:text-neutral-700 text-xs">–</span>
            <input id="filtro-data-fim" name="filtro-data-fim" v-model="dataFim" type="date" @change="periodoAtivo = 'custom'; buscarTudo()"
              class="bg-transparent text-xs font-bold text-neutral-700 dark:text-neutral-300 outline-none w-[7rem]" />
          </div>
          <button @click="buscarTudo" :disabled="carregando"
            class="h-9 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-black transition-all active:scale-95 flex items-center gap-1.5">
            <RefreshCw :size="13" :class="carregando ? 'animate-spin' : ''" /> Atualizar
          </button>
          <button @click="imprimirRelatorio" title="Imprimir ou salvar como PDF"
            class="h-9 px-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white no-print">
            <Printer :size="13" /> Imprimir
          </button>
          <button @click="exportarCSV" title="Exportar a aba atual em CSV (abre no Excel)"
            class="h-9 px-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white no-print">
            <Download :size="13" /> CSV
          </button>
        </div>
      </div>

      <!-- TABS + FILTROS -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 no-print">
        <div class="flex gap-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1 w-fit shrink-0">
          <button v-for="tab in tabs" :key="tab.id" @click="abaAtiva = tab.id"
            class="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-black transition-all"
            :class="abaAtiva === tab.id ? 'bg-orange-500 text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'">
            <component :is="tab.icon" :size="12" /> {{ tab.label }}
          </button>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex items-center gap-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 h-9">
            <Users :size="12" class="text-neutral-400 shrink-0" />
            <select id="filtro-garcom" name="filtro-garcom" v-model="filtros.garcomId" @change="buscarTudo"
              class="bg-transparent text-xs font-bold text-neutral-700 dark:text-neutral-300 outline-none min-w-[9rem]">
              <option value="todos">Todos os funcionários</option>
              <option v-for="f in opcoesFilters.funcionarios" :key="f.id" :value="f.id">{{ f.nome }}</option>
            </select>
          </div>

          <div v-if="abaAtiva === 'geral' || abaAtiva === 'mesas'"
            class="flex items-center gap-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 h-9">
            <CreditCard :size="12" class="text-neutral-400 shrink-0" />
            <select id="filtro-metodo" name="filtro-metodo" v-model="filtros.metodoId" @change="buscarTudo"
              class="bg-transparent text-xs font-bold text-neutral-700 dark:text-neutral-300 outline-none min-w-[9rem]">
              <option value="todos">Todos os métodos</option>
              <option v-for="m in opcoesFilters.metodos" :key="m.id" :value="m.id">{{ m.nome }}</option>
            </select>
          </div>

          <div v-if="abaAtiva === 'produtos'"
            class="flex items-center gap-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 h-9">
            <Tag :size="12" class="text-neutral-400 shrink-0" />
            <select id="filtro-categoria" name="filtro-categoria" v-model="filtros.categoriaId" @change="buscarTudo"
              class="bg-transparent text-xs font-bold text-neutral-700 dark:text-neutral-300 outline-none min-w-[9rem]">
              <option value="todos">Todas as categorias</option>
              <option v-for="c in opcoesFilters.categorias" :key="c.id" :value="c.id">{{ c.nome }}</option>
            </select>
          </div>

          <div v-if="abaAtiva === 'caixa'"
            class="flex items-center gap-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 h-9">
            <UserCheck :size="12" class="text-neutral-400 shrink-0" />
            <select id="filtro-funcionario" name="filtro-funcionario" v-model="filtros.funcionarioId" @change="buscarTudo"
              class="bg-transparent text-xs font-bold text-neutral-700 dark:text-neutral-300 outline-none min-w-[9rem]">
              <option value="todos">Todos os operadores</option>
              <option v-for="f in opcoesFilters.funcionarios" :key="f.id" :value="f.id">{{ f.nome }}</option>
            </select>
          </div>

          <button v-if="filtrosAtivos" @click="limparFiltros"
            class="h-9 px-3 rounded-xl border border-orange-300 dark:border-orange-800 text-orange-500 text-xs font-black hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-all flex items-center gap-1.5">
            <X :size="12" /> Limpar
          </button>
        </div>
      </div>

      <!-- SKELETON -->
      <div v-if="carregando" class="space-y-4">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="n in 4" :key="n" class="h-28 rounded-2xl bg-white dark:bg-neutral-900 animate-pulse" />
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 h-56 rounded-2xl bg-white dark:bg-neutral-900 animate-pulse" />
          <div class="h-56 rounded-2xl bg-white dark:bg-neutral-900 animate-pulse" />
        </div>
      </div>

      <template v-else>

        <!-- ═══ VISÃO GERAL ════════════════════════════════════════ -->
        <div v-if="abaAtiva === 'geral' && geral">

          <!-- KPIs -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
              <p class="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Faturamento</p>
              <p class="text-2xl font-black text-neutral-900 dark:text-white mt-2 leading-none">R$ {{ fmt(geral.resumo.faturamento) }}</p>
              <p class="text-[11px] mt-2 font-bold" :class="variacaoClass(geral.resumo.faturamento, geral.anterior.faturamento)">
                {{ variacaoTexto(geral.resumo.faturamento, geral.anterior.faturamento) }} vs anterior
              </p>
            </div>
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
              <p class="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Pagamentos</p>
              <p class="text-2xl font-black text-neutral-900 dark:text-white mt-2 leading-none">{{ geral.resumo.qtdPagamentos }}</p>
              <p class="text-[11px] mt-2 font-bold" :class="variacaoClass(geral.resumo.qtdPagamentos, geral.anterior.qtdPagamentos)">
                {{ variacaoTexto(geral.resumo.qtdPagamentos, geral.anterior.qtdPagamentos) }} vs anterior
              </p>
            </div>
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
              <p class="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Ticket Médio</p>
              <p class="text-2xl font-black text-neutral-900 dark:text-white mt-2 leading-none">R$ {{ fmt(geral.resumo.ticketMedio) }}</p>
              <p class="text-[11px] mt-2 text-neutral-400">por atendimento</p>
            </div>
            <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
              <p class="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Abatimentos</p>
              <p class="text-2xl font-black text-red-500 mt-2 leading-none">− R$ {{ fmt(geral.resumo.totalAbatido) }}</p>
              <p class="text-[11px] mt-2 text-neutral-400">{{ geral.resumo.qtdAbatimentos }} desconto(s)</p>
            </div>
          </div>

          <!-- EMPTY -->
          <div v-if="!geral.resumo.qtdPagamentos" class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4">
              <BarChart2 :size="24" class="text-neutral-300 dark:text-neutral-700" />
            </div>
            <h3 class="text-base font-black text-neutral-700 dark:text-neutral-300">Nenhum dado no período</h3>
            <p class="text-sm text-neutral-400 mt-1 max-w-xs">Não há registros para o período selecionado.</p>
            <button @click="aplicarAtalho({ label: '30 dias', dias: 29 })"
              class="mt-5 h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all">
              Ver últimos 30 dias
            </button>
          </div>

          <template v-else>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
              <!-- EVOLUÇÃO -->
              <div class="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <div class="flex items-center justify-between mb-4">
                  <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Faturamento diário</h2>
                  <span class="text-xs font-black text-orange-500">R$ {{ fmt(geral.resumo.faturamento) }}</span>
                </div>
                <div v-if="!geral.evolucao.length" class="h-28 flex items-center justify-center text-sm text-neutral-400">Sem dados</div>
                <div v-else class="flex items-end gap-1 h-28">
                  <div v-for="dia in geral.evolucao" :key="dia.dia" class="flex-1 flex flex-col items-center gap-0.5 group min-w-0">
                    <div class="relative w-full">
                      <div class="w-full bg-orange-400 hover:bg-orange-500 rounded-t transition-all cursor-default"
                        :style="{ height: barAltura(dia.total, geral.evolucao) + 'px' }" />
                      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-10 shadow-lg">
                        {{ fmtDia(dia.dia) }} · R$ {{ fmt(dia.total) }} ({{ dia.qtd }}x)
                      </div>
                    </div>
                    <span v-if="geral.evolucao.length <= 14" class="text-[9px] text-neutral-400 dark:text-neutral-600 truncate w-full text-center">
                      {{ fmtDiaCurto(dia.dia) }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- MÉTODOS -->
              <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600 mb-4">Métodos</h2>
                <div v-if="!geral.metodos.length" class="text-sm text-neutral-400">Sem dados</div>
                <div v-else class="space-y-3.5">
                  <div v-for="m in geral.metodos" :key="m.metodo">
                    <div class="flex justify-between items-center mb-1.5">
                      <span class="text-xs font-bold text-neutral-700 dark:text-neutral-300">{{ m.metodo }}</span>
                      <div class="text-right">
                        <span class="text-xs font-black text-orange-500">R$ {{ fmt(m.total) }}</span>
                        <span class="text-[10px] text-neutral-400 ml-1">{{ m.qtd }}x</span>
                      </div>
                    </div>
                    <div class="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div class="h-full bg-orange-400 rounded-full transition-all duration-500"
                        :style="{ width: pctDe(m.total, geral.metodos, 'total') + '%' }" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- FUNCIONÁRIOS + HORÁRIO -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div v-if="geral.porFuncionario?.length" class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
                <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Desempenho por Funcionário</h2>
                </div>
                <div class="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <div v-for="(f, i) in geral.porFuncionario" :key="f.id"
                    class="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                    <span class="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
                      :class="i === 0 ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-500' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'">
                      {{ i + 1 }}
                    </span>
                    <div class="flex-1 min-w-0">
                      <p class="text-xs font-black text-neutral-800 dark:text-neutral-200 truncate">{{ f.nome }}</p>
                      <p class="text-[10px] text-neutral-400 capitalize">{{ f.cargo }} · {{ f.qtdPedidos }} pedido(s)</p>
                    </div>
                    <div class="text-right shrink-0">
                      <p class="text-xs font-black text-orange-500">R$ {{ fmt(f.totalFaturado) }}</p>
                      <p class="text-[10px] text-neutral-400">{{ f.qtdPagamentos }} pgto(s)</p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="geral.horarios?.length" class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600 mb-4">Horário de Pico</h2>
                <div class="flex items-end gap-px h-24">
                  <div v-for="h in horasCompletas(geral.horarios)" :key="h.hora" class="flex-1 flex flex-col items-center gap-0.5 group">
                    <div class="relative w-full">
                      <div class="w-full rounded-t transition-all cursor-default"
                        :class="h.qtd > 0 ? 'bg-orange-400 hover:bg-orange-500' : 'bg-neutral-100 dark:bg-neutral-800'"
                        :style="{ height: Math.max(h.qtd > 0 ? 4 : 2, (h.qtd / maxHorario(geral.horarios)) * 80) + 'px' }" />
                      <div v-if="h.qtd > 0" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex bg-neutral-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-10">
                        {{ h.hora }}h — {{ h.qtd }}x
                      </div>
                    </div>
                    <span v-if="h.hora % 6 === 0" class="text-[9px] text-neutral-400">{{ h.hora }}h</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- ═══ PRODUTOS ════════════════════════════════════════════ -->
        <div v-else-if="abaAtiva === 'produtos' && produtos">
          <div v-if="!produtos.ranking.length" class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4">
              <Package :size="24" class="text-neutral-300 dark:text-neutral-700" />
            </div>
            <h3 class="text-base font-black text-neutral-700 dark:text-neutral-300">Nenhum produto vendido</h3>
            <p class="text-sm text-neutral-400 mt-1">Tente ampliar o período de análise.</p>
            <button @click="aplicarAtalho({ label: '30 dias', dias: 29 })"
              class="mt-5 h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all">
              Ver últimos 30 dias
            </button>
          </div>
          <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div class="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
              <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Ranking de Produtos</h2>
                <span class="text-[11px] font-bold text-neutral-400">{{ produtos.ranking.length }} vendidos</span>
              </div>
              <div class="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[520px] overflow-auto">
                <div v-for="(p, i) in produtos.ranking" :key="p.id"
                  class="flex items-center gap-4 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                  <span class="w-6 text-center text-[11px] font-black"
                    :class="i < 3 ? 'text-orange-500' : 'text-neutral-300 dark:text-neutral-700'">{{ i + 1 }}</span>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-black text-neutral-800 dark:text-neutral-200 truncate">{{ p.nome }}</p>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span class="text-[10px] text-neutral-400 shrink-0">{{ p.categoria || 'Sem categoria' }}</span>
                      <div class="flex-1 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                        <div class="h-full bg-orange-400 rounded-full" :style="{ width: pctDe(p.qtdVendida, produtos.ranking, 'qtdVendida') + '%' }" />
                      </div>
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-xs font-black text-orange-500">R$ {{ fmt(p.totalGerado) }}</p>
                    <p class="text-[10px] text-neutral-400">{{ p.qtdVendida }}x · R$ {{ fmt(p.precoMedio) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-5">
              <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600 mb-4">Por Categoria</h2>
                <div v-if="!produtos.porCategoria.length" class="text-sm text-neutral-400">Sem dados</div>
                <div v-else class="space-y-3.5">
                  <div v-for="cat in produtos.porCategoria" :key="cat.categoria">
                    <div class="flex justify-between items-center mb-1">
                      <span class="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">{{ cat.categoria }}</span>
                      <span class="text-xs font-black text-orange-500 ml-2 shrink-0">R$ {{ fmt(cat.totalGerado) }}</span>
                    </div>
                    <div class="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div class="h-full bg-orange-400 rounded-full" :style="{ width: pctDe(cat.totalGerado, produtos.porCategoria, 'totalGerado') + '%' }" />
                    </div>
                    <p class="text-[10px] text-neutral-400 mt-0.5">{{ cat.qtdProdutos }} produto(s) · {{ cat.qtdVendida }}x</p>
                  </div>
                </div>
              </div>

              <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
                <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Sem venda</h2>
                  <span class="text-[11px] font-bold text-neutral-400">{{ produtos.semVenda.length }}</span>
                </div>
                <div v-if="!produtos.semVenda.length" class="py-6 text-center text-xs text-green-500 font-black">Todos foram vendidos!</div>
                <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-52 overflow-auto">
                  <div v-for="p in produtos.semVenda" :key="p.id" class="flex items-center gap-3 px-5 py-2.5">
                    <div class="w-1.5 h-1.5 rounded-full bg-red-300 dark:bg-red-800 shrink-0" />
                    <div class="min-w-0">
                      <p class="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">{{ p.nome }}</p>
                      <p class="text-[10px] text-neutral-400">{{ p.categoria }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ MESAS ════════════════════════════════════════════════ -->
        <div v-else-if="abaAtiva === 'mesas' && mesas">
          <div v-if="!mesas.resumo.mesasAtendidas" class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4">
              <LayoutGrid :size="24" class="text-neutral-300 dark:text-neutral-700" />
            </div>
            <h3 class="text-base font-black text-neutral-700 dark:text-neutral-300">Nenhuma mesa atendida</h3>
            <p class="text-sm text-neutral-400 mt-1">Tente ampliar o período de análise.</p>
            <button @click="aplicarAtalho({ label: '30 dias', dias: 29 })"
              class="mt-5 h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all">
              Ver últimos 30 dias
            </button>
          </div>
          <template v-else>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <p class="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Mesas Atendidas</p>
                <p class="text-2xl font-black text-neutral-900 dark:text-white mt-2">{{ mesas.resumo.mesasAtendidas }}</p>
                <p class="text-[11px] text-neutral-400 mt-2">no período</p>
              </div>
              <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <p class="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Faturamento</p>
                <p class="text-2xl font-black text-neutral-900 dark:text-white mt-2">R$ {{ fmt(mesas.resumo.faturamentoTotal) }}</p>
                <p class="text-[11px] text-neutral-400 mt-2">total</p>
              </div>
              <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <p class="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Ticket Médio</p>
                <p class="text-2xl font-black text-neutral-900 dark:text-white mt-2">R$ {{ fmt(mesas.resumo.ticketMedioGeral) }}</p>
                <p class="text-[11px] text-neutral-400 mt-2">por mesa</p>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div class="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
                <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Ranking de Mesas</h2>
                </div>
                <table class="w-full text-sm">
                  <thead class="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th class="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">#</th>
                      <th class="px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Mesa</th>
                      <th class="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400">Pgtos</th>
                      <th class="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400">Ticket Médio</th>
                      <th class="px-5 py-3 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(m, i) in mesas.ranking" :key="m.id"
                      class="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td class="px-5 py-3 text-xs font-black" :class="i < 3 ? 'text-orange-500' : 'text-neutral-300 dark:text-neutral-700'">{{ i + 1 }}</td>
                      <td class="px-5 py-3 text-xs font-bold text-neutral-800 dark:text-neutral-200">{{ m.nome_mesa }}</td>
                      <td class="px-5 py-3 text-right text-xs text-neutral-500">{{ m.qtdPagamentos }}</td>
                      <td class="px-5 py-3 text-right text-xs text-neutral-500">R$ {{ fmt(m.ticketMedio) }}</td>
                      <td class="px-5 py-3 text-right text-xs font-black text-orange-500">R$ {{ fmt(m.totalFaturado) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
                <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Abatimentos</h2>
                </div>
                <div v-if="!mesas.abatimentos.length" class="py-10 text-center text-xs text-neutral-400">Nenhum abatimento</div>
                <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <div v-for="a in mesas.abatimentos" :key="a.nome_mesa" class="flex items-center justify-between px-5 py-3">
                    <div>
                      <p class="text-xs font-bold text-neutral-700 dark:text-neutral-300">{{ a.nome_mesa }}</p>
                      <p class="text-[10px] text-neutral-400">{{ a.qtdAbatimentos }} desconto(s)</p>
                    </div>
                    <span class="text-xs font-black text-red-500">− R$ {{ fmt(a.totalAbatido) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- ═══ CAIXA ════════════════════════════════════════════════ -->
        <div v-else-if="abaAtiva === 'caixa' && caixa">
          <div v-if="!caixa.resumo.qtdCaixas" class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4">
              <Landmark :size="24" class="text-neutral-300 dark:text-neutral-700" />
            </div>
            <h3 class="text-base font-black text-neutral-700 dark:text-neutral-300">Nenhum caixa no período</h3>
            <p class="text-sm text-neutral-400 mt-1">Tente ampliar o período de análise.</p>
            <button @click="aplicarAtalho({ label: '30 dias', dias: 29 })"
              class="mt-5 h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all">
              Ver últimos 30 dias
            </button>
          </div>
          <template v-else>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <p class="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Caixas</p>
                <p class="text-2xl font-black text-neutral-900 dark:text-white mt-2">{{ caixa.resumo.qtdCaixas }}</p>
                <p class="text-[11px] text-neutral-400 mt-2">no período</p>
              </div>
              <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <p class="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Total Inicial</p>
                <p class="text-2xl font-black text-neutral-900 dark:text-white mt-2">R$ {{ fmt(caixa.resumo.totalInicial) }}</p>
                <p class="text-[11px] text-neutral-400 mt-2">suprimento</p>
              </div>
              <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <p class="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Total Fechamento</p>
                <p class="text-2xl font-black text-neutral-900 dark:text-white mt-2">R$ {{ fmt(caixa.resumo.totalFechamento) }}</p>
                <p class="text-[11px] text-neutral-400 mt-2">encerramento</p>
              </div>
              <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <p class="text-[11px] font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Resultado</p>
                <p class="text-2xl font-black mt-2"
                  :class="(caixa.resumo.totalFechamento - caixa.resumo.totalInicial) >= 0 ? 'text-green-500' : 'text-red-500'">
                  {{ caixa.resumo.totalFechamento - caixa.resumo.totalInicial >= 0 ? '+' : '' }}R$ {{ fmt(caixa.resumo.totalFechamento - caixa.resumo.totalInicial) }}
                </p>
                <p class="text-[11px] text-neutral-400 mt-2">diferença</p>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
                <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600 mb-4">Por Tipo</h2>
                <div v-if="!caixa.totaisPorTipo.length" class="text-sm text-neutral-400">Sem movimentos</div>
                <div v-else class="space-y-3">
                  <div v-for="t in caixa.totaisPorTipo" :key="t.tipo" class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="text-[10px] font-black px-2 py-0.5 rounded-full" :class="corMovimento(t.tipo)">{{ t.tipo }}</span>
                      <span class="text-[11px] text-neutral-400">{{ t.qtd }}x</span>
                    </div>
                    <span class="text-xs font-black" :class="['sangria','estorno'].includes(t.tipo) ? 'text-red-500' : 'text-green-600'">
                      {{ ['sangria','estorno'].includes(t.tipo) ? '−' : '+' }} R$ {{ fmt(t.total) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
                <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
                  <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Histórico de Caixas</h2>
                </div>
                <div class="overflow-auto">
                  <table class="w-full text-sm">
                    <thead class="bg-neutral-50 dark:bg-neutral-800/50">
                      <tr>
                        <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Operador</th>
                        <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Abertura</th>
                        <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Fechamento</th>
                        <th class="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400">Inicial</th>
                        <th class="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400">Final</th>
                        <th class="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400">Dif.</th>
                        <th class="px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-neutral-400">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="c in caixa.historico" :key="c.id"
                        class="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                        <td class="px-4 py-3 text-xs font-bold text-neutral-700 dark:text-neutral-300">{{ c.operador || '—' }}</td>
                        <td class="px-4 py-3 text-[11px] text-neutral-500">{{ fmtDateTime(c.data_abertura) }}</td>
                        <td class="px-4 py-3 text-[11px] text-neutral-500">{{ c.fechado_em ? fmtDateTime(c.fechado_em) : '—' }}</td>
                        <td class="px-4 py-3 text-right text-[11px] text-neutral-500">R$ {{ fmt(c.valor_inicial) }}</td>
                        <td class="px-4 py-3 text-right text-[11px] text-neutral-500">{{ c.valor_fechamento != null ? 'R$ ' + fmt(c.valor_fechamento) : '—' }}</td>
                        <td class="px-4 py-3 text-right text-[11px] font-black" :class="Number(c.diferenca) >= 0 ? 'text-green-500' : 'text-red-500'">
                          {{ c.diferenca != null ? (Number(c.diferenca) >= 0 ? '+' : '') + 'R$ ' + fmt(c.diferenca) : '—' }}
                        </td>
                        <td class="px-4 py-3 text-center">
                          <span class="text-[10px] font-black px-2 py-0.5 rounded-full"
                            :class="c.status === 'aberto' ? 'bg-green-100 dark:bg-green-950/50 text-green-600' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'">
                            {{ c.status }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div v-if="caixa.movimentos.length" class="mt-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
              <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Movimentos</h2>
                <span class="text-[11px] text-neutral-400">{{ caixa.movimentos.length }} registro(s)</span>
              </div>
              <div class="overflow-auto max-h-64">
                <table class="w-full text-sm">
                  <thead class="bg-neutral-50 dark:bg-neutral-800/50 sticky top-0">
                    <tr>
                      <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Tipo</th>
                      <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Operador</th>
                      <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Descrição</th>
                      <th class="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400">Valor</th>
                      <th class="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-neutral-400">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="mov in caixa.movimentos" :key="mov.created_at + mov.tipo + mov.valor"
                      class="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                      <td class="px-4 py-3">
                        <span class="text-[10px] font-black px-2 py-0.5 rounded-full" :class="corMovimento(mov.tipo)">{{ mov.tipo }}</span>
                      </td>
                      <td class="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{{ mov.operador || '—' }}</td>
                      <td class="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400 max-w-xs truncate">{{ mov.descricao || '—' }}</td>
                      <td class="px-4 py-3 text-right text-xs font-black"
                        :class="['sangria','estorno'].includes(mov.tipo) ? 'text-red-500' : 'text-green-600'">
                        {{ ['sangria','estorno'].includes(mov.tipo) ? '−' : '+' }} R$ {{ fmt(mov.valor) }}
                      </td>
                      <td class="px-4 py-3 text-right text-[11px] text-neutral-400">{{ fmtDateTime(mov.created_at) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </template>
        </div>

        <!-- ═══ AUDITORIA ════════════════════════════════════════════ -->
        <div v-else-if="abaAtiva === 'auditoria'">
          <div v-if="!auditoria || !auditoria.length" class="flex flex-col items-center justify-center py-20 text-center">
            <div class="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mb-4">
              <ShieldCheck :size="24" class="text-neutral-300 dark:text-neutral-700" />
            </div>
            <h3 class="text-base font-black text-neutral-700 dark:text-neutral-300">Nenhum registro no período</h3>
            <p class="text-sm text-neutral-400 mt-1">Operações sensíveis (cancelamentos, descontos, caixa) aparecem aqui.</p>
          </div>
          <div v-else class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
            <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Trilha de Auditoria</h2>
              <span class="text-[11px] text-neutral-400">{{ auditoria.length }} registro(s)</span>
            </div>
            <div class="overflow-auto max-h-[32rem]">
              <table class="w-full text-sm">
                <thead class="bg-neutral-50 dark:bg-neutral-800/50 sticky top-0">
                  <tr>
                    <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Data</th>
                    <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Usuário</th>
                    <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Ação</th>
                    <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-neutral-400">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="reg in auditoria" :key="reg.id"
                    class="border-t border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td class="px-4 py-3 text-[11px] text-neutral-500 whitespace-nowrap">{{ fmtDateTime(reg.created_at) }}</td>
                    <td class="px-4 py-3 text-xs font-bold text-neutral-700 dark:text-neutral-300">{{ reg.usuario || '—' }}</td>
                    <td class="px-4 py-3">
                      <span class="text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap" :class="infoAcao(reg.acao).cor">
                        {{ infoAcao(reg.acao).label }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{{ fmtDetalhes(reg.detalhes) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  CalendarDays, RefreshCw, BarChart2, Package, LayoutGrid, Landmark,
  Users, CreditCard, Tag, UserCheck, X, ShieldCheck, Printer, Download
} from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: false })

const api        = useApi()
const toastStore = useToastStore()
const authStore  = useAuthStore()
const isAdmin    = computed(() => authStore.usuario?.cargo === 'administrador')

const hoje    = new Date()
const dataFim = ref(hoje.toISOString().slice(0, 10))
const dataInicio = ref((() => {
  const d = new Date(hoje); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10)
})())
const carregando   = ref(false)
const periodoAtivo = ref('7 dias')
const abaAtiva     = ref('geral')

const filtros = ref({ garcomId: 'todos', metodoId: 'todos', categoriaId: 'todos', funcionarioId: 'todos' })
const filtrosAtivos = computed(() => Object.values(filtros.value).some(v => v !== 'todos'))
function limparFiltros() {
  filtros.value = { garcomId: 'todos', metodoId: 'todos', categoriaId: 'todos', funcionarioId: 'todos' }
  buscarTudo()
}

const tabs = computed(() => [
  { id: 'geral',    label: 'Visão Geral', icon: BarChart2  },
  { id: 'produtos', label: 'Produtos',    icon: Package    },
  { id: 'mesas',    label: 'Mesas',       icon: LayoutGrid },
  { id: 'caixa',    label: 'Caixa',       icon: Landmark   },
  ...(isAdmin.value ? [{ id: 'auditoria', label: 'Auditoria', icon: ShieldCheck }] : [])
])
const atalhos = [
  { label: 'Hoje',    dias: 0 },
  { label: '7 dias',  dias: 6 },
  { label: '30 dias', dias: 29 },
  { label: 'Mês',     mes: true }
]

interface Filtros      { funcionarios: any[]; metodos: any[]; categorias: any[] }
interface GeralData    { resumo: any; anterior: any; evolucao: any[]; metodos: any[]; horarios: any[]; porFuncionario: any[] }
interface ProdutosData { ranking: any[]; porCategoria: any[]; semVenda: any[] }
interface MesasData    { resumo: any; ranking: any[]; abatimentos: any[] }
interface CaixaData    { resumo: any; historico: any[]; movimentos: any[]; totaisPorTipo: any[] }

const opcoesFilters = ref<Filtros>({ funcionarios: [], metodos: [], categorias: [] })
const geral    = ref<GeralData | null>(null)
const produtos = ref<ProdutosData | null>(null)
const mesas    = ref<MesasData | null>(null)
const caixa    = ref<CaixaData | null>(null)
const auditoria = ref<any[] | null>(null)

const totalRegistros = computed(() => geral.value?.resumo.qtdPagamentos ?? null)

function aplicarAtalho(a: any) {
  periodoAtivo.value = a.label
  const fim = new Date()
  dataFim.value = fim.toISOString().slice(0, 10)
  if (a.mes) {
    dataInicio.value = new Date(fim.getFullYear(), fim.getMonth(), 1).toISOString().slice(0, 10)
  } else {
    const ini = new Date(fim); ini.setDate(ini.getDate() - (a.dias || 0))
    dataInicio.value = ini.toISOString().slice(0, 10)
  }
  buscarTudo()
}

function qs() {
  const f = filtros.value
  return `?dataInicio=${dataInicio.value}&dataFim=${dataFim.value}` +
    `&garcomId=${f.garcomId}&metodoId=${f.metodoId}&categoriaId=${f.categoriaId}&funcionarioId=${f.funcionarioId}`
}

async function buscarTudo() {
  carregando.value = true
  try {
    const [g, p, m, c] = await Promise.all([
      api.get<GeralData>(`/relatorios${qs()}`),
      api.get<ProdutosData>(`/relatorios/produtos${qs()}`),
      api.get<MesasData>(`/relatorios/mesas${qs()}`),
      api.get<CaixaData>(`/relatorios/caixa${qs()}`)
    ])
    geral.value = g; produtos.value = p; mesas.value = m; caixa.value = c
  } catch (e: any) {
    toastStore.error('Erro ao carregar relatório', e?.message)
  } finally {
    carregando.value = false
  }

  // Auditoria: separada para um 403 (não-admin) não derrubar os demais relatórios
  if (isAdmin.value) {
    try {
      auditoria.value = await api.get<any[]>(
        `/relatorios/auditoria?dataInicio=${dataInicio.value}&dataFim=${dataFim.value}&limite=300`
      )
    } catch { auditoria.value = null }
  }
}

async function carregarFiltros() {
  try { opcoesFilters.value = await api.get<Filtros>('/relatorios/filtros') } catch {}
}

const fmt = (v: any) => Number(v || 0).toFixed(2)

function fmtDia(iso: string) {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00')
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtDiaCurto(iso: string) {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00')
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function variacaoClass(atual: number, anterior: number) {
  if (!anterior) return 'text-neutral-400'
  return atual >= anterior ? 'text-green-500' : 'text-red-500'
}
function variacaoTexto(atual: number, anterior: number) {
  if (!anterior) return '—'
  const pct = ((atual - anterior) / anterior) * 100
  return (pct >= 0 ? '↑ ' : '↓ ') + Math.abs(pct).toFixed(1) + '%'
}
function barAltura(valor: any, lista: any[]) {
  const max = Math.max(...lista.map(d => Number(d.total)))
  return max > 0 ? Math.max(4, (Number(valor) / max) * 96) : 4
}
function pctDe(valor: any, lista: any[], campo: string) {
  const max = Math.max(...lista.map(i => Number(i[campo])))
  return max > 0 ? (Number(valor) / max) * 100 : 0
}
function horasCompletas(horarios: any[]) {
  return Array.from({ length: 24 }, (_, h) => {
    const found = horarios.find(x => Number(x.hora) === h)
    return { hora: h, qtd: found ? Number(found.qtd) : 0 }
  })
}
function maxHorario(horarios: any[]) {
  return Math.max(...horarios.map(h => Number(h.qtd)), 1)
}
const ACOES: Record<string, { label: string; cor: string }> = {
  caixa_abrir:      { label: 'Abertura de caixa',   cor: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400' },
  caixa_fechar:     { label: 'Fechamento de caixa', cor: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400' },
  caixa_sangria:    { label: 'Sangria',             cor: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400' },
  caixa_suprimento: { label: 'Suprimento',          cor: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' },
  item_excluir:     { label: 'Item excluído',       cor: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400' },
  item_decrementar: { label: 'Item decrementado',   cor: 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400' },
  pedido_abater:    { label: 'Abatimento',          cor: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' },
  venda_desconto:   { label: 'Venda c/ desconto',   cor: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' }
}
function infoAcao(acao: string) {
  return ACOES[acao] || { label: acao, cor: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500' }
}
function fmtDetalhes(d: any) {
  if (!d) return '—'
  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => {
      const nome = k.replace(/_/g, ' ')
      const valor = typeof v === 'number' && ['valor', 'valor inicial', 'valor fechamento', 'desconto', 'subtotal'].includes(nome)
        ? 'R$ ' + Number(v).toFixed(2)
        : String(v)
      return `${nome}: ${valor}`
    })
    .join(' · ')
}

function corMovimento(tipo: string) {
  if (tipo === 'pagamento')  return 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
  if (tipo === 'suprimento') return 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'
  if (tipo === 'sangria')    return 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400'
  if (tipo === 'estorno')    return 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'
  return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
}

// ─── imprimir / exportar ─────────────────────────────────
function imprimirRelatorio() {
  window.print()
}

function csvEscape(v: any) {
  const s = v === null || v === undefined ? '' : String(v)
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function linhasCSV(titulo: string, cabecalho: string[], linhas: any[][]) {
  if (!linhas.length) return []
  return [titulo, cabecalho.join(';'), ...linhas.map(l => l.map(csvEscape).join(';')), '']
}

function exportarCSV() {
  const partes: string[] = []
  const num = (v: any) => Number(v || 0).toFixed(2).replace('.', ',')

  if (abaAtiva.value === 'geral' && geral.value) {
    partes.push(...linhasCSV('Evolução diária', ['Dia', 'Total (R$)', 'Pagamentos'],
      geral.value.evolucao.map(d => [fmtDia(d.dia), num(d.total), d.qtd])))
    partes.push(...linhasCSV('Por método de pagamento', ['Método', 'Qtd', 'Total (R$)'],
      geral.value.metodos.map(m => [m.metodo, m.qtd, num(m.total)])))
    partes.push(...linhasCSV('Por funcionário', ['Funcionário', 'Qtd', 'Total (R$)'],
      (geral.value.porFuncionario || []).map(f => [f.nome, f.qtd, num(f.total)])))
  } else if (abaAtiva.value === 'produtos' && produtos.value) {
    partes.push(...linhasCSV('Ranking de produtos', ['Produto', 'Categoria', 'Qtd vendida', 'Total (R$)'],
      produtos.value.ranking.map(p => [p.nome, p.categoria || '—', p.qtd, num(p.total)])))
    partes.push(...linhasCSV('Sem venda no período', ['Produto', 'Categoria'],
      produtos.value.semVenda.map(p => [p.nome, p.categoria || '—'])))
  } else if (abaAtiva.value === 'mesas' && mesas.value) {
    partes.push(...linhasCSV('Ranking de mesas', ['Mesa', 'Atendimentos', 'Total (R$)'],
      mesas.value.ranking.map(m => [m.nome_mesa || m.mesa || m.id, m.qtd ?? m.atendimentos ?? '', num(m.total)])))
  } else if (abaAtiva.value === 'caixa' && caixa.value) {
    partes.push(...linhasCSV('Histórico de caixas', ['Operador', 'Abertura', 'Fechamento', 'Inicial (R$)', 'Final (R$)', 'Status'],
      caixa.value.historico.map(c => [c.operador || '—', fmtDateTime(c.data_abertura), fmtDateTime(c.fechado_em), num(c.valor_inicial), c.valor_fechamento != null ? num(c.valor_fechamento) : '', c.status])))
    partes.push(...linhasCSV('Movimentos', ['Tipo', 'Operador', 'Descrição', 'Valor (R$)', 'Data'],
      caixa.value.movimentos.map(m => [m.tipo, m.operador || '—', m.descricao || '', num(m.valor), fmtDateTime(m.created_at)])))
  } else if (abaAtiva.value === 'auditoria' && auditoria.value) {
    partes.push(...linhasCSV('Trilha de auditoria', ['Data', 'Usuário', 'Ação', 'Detalhes'],
      auditoria.value.map(r => [fmtDateTime(r.created_at), r.usuario || '—', infoAcao(r.acao).label, fmtDetalhes(r.detalhes)])))
  }

  if (!partes.length) {
    toastStore.error('Nada para exportar', 'A aba atual não tem dados no período selecionado.')
    return
  }

  const nome = `relatorio-${abaAtiva.value}-${dataInicio.value}-a-${dataFim.value}.csv`
  // BOM para o Excel abrir com acentuação correta
  const blob = new Blob(['﻿' + partes.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(async () => {
  await carregarFiltros()
  await buscarTudo()
})
</script>

<style>
@media print {
  .no-print, nav, aside, header { display: none !important; }
  body, .min-h-screen { background: white !important; }
  .min-h-screen { padding-left: 0 !important; }
  main { max-width: 100% !important; padding: 0 !important; }
}
</style>
