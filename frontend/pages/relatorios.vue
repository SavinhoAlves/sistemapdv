<template>
  <div class="min-h-screen transition-colors duration-200 com-sidebar">
    <Sidebar />
    <Navbar />

    <main class="p-6 max-w-6xl mx-auto">

      <!-- ══ HEADER ══════════════════════════════════════════════════ -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div class="flex items-center gap-3">
          <div class="w-1 h-8 bg-orange-500 rounded-full shrink-0"></div>
          <div>
            <h1 class="text-2xl font-black text-gray-900 dark:text-white">Relatórios</h1>
            <p class="text-sm text-gray-500 dark:text-white/50 mt-0.5">{{ labelContexto }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button @click="imprimirRelatorio"
            class="h-9 px-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-white/60 text-xs font-black transition-all flex items-center gap-1.5 hover:text-gray-800 dark:hover:text-white">
            <Printer :size="13" /> Imprimir
          </button>
          <button @click="exportarCSV"
            class="h-9 px-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-white/60 text-xs font-black transition-all flex items-center gap-1.5 hover:text-gray-800 dark:hover:text-white">
            <Download :size="13" /> CSV
          </button>
        </div>
      </div>

      <!-- ══ PERÍODO ══════════════════════════════════════════════════ -->
      <div class="flex flex-wrap items-center gap-2 mb-6 no-print">
        <div class="flex bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-xl p-1 gap-0.5">
          <button v-for="a in atalhos" :key="a.tipo" @click="aplicarAtalho(a.tipo)"
            class="h-8 px-3 rounded-lg text-xs font-black transition-all"
            :class="periodoAtivo === a.tipo
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70'">
            {{ a.label }}
          </button>
        </div>
        <div class="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/[0.08] rounded-xl px-3 h-9">
          <CalendarDays :size="12" class="text-gray-400 dark:text-white/40 shrink-0" />
          <input v-model="dataInicio" type="date" @change="periodoAtivo = 'custom'; buscar()"
            class="bg-transparent text-xs font-bold text-gray-700 dark:text-white/80 outline-none w-[7rem]" />
          <span class="text-gray-300 dark:text-white/25 text-xs">–</span>
          <input v-model="dataFim" type="date" @change="periodoAtivo = 'custom'; buscar()"
            class="bg-transparent text-xs font-bold text-gray-700 dark:text-white/80 outline-none w-[7rem]" />
        </div>
        <button @click="buscar" :disabled="carregando"
          class="h-9 w-9 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white transition-all active:scale-95 flex items-center justify-center">
          <RefreshCw :size="14" :class="carregando ? 'animate-spin' : ''" />
        </button>
      </div>

      <!-- ══ SKELETON ══════════════════════════════════════════════════ -->
      <div v-if="carregando" class="space-y-5">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div v-for="n in 4" :key="n" class="h-24 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div class="h-64 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
          <div class="lg:col-span-2 h-64 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse" />
        </div>
      </div>

      <template v-else-if="geral">

        <!-- ══ KPIs ══════════════════════════════════════════════════ -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div class="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
            <div class="h-0.5 bg-gradient-to-r from-green-400 to-emerald-500"></div>
            <div class="p-5">
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Faturamento</p>
              <p class="text-2xl font-black text-gray-900 dark:text-white mt-2 leading-none">R$ {{ fmt(kpi.faturamento) }}</p>
              <p v-if="garcomSelecionado === 'todos'" class="text-[11px] mt-2 font-bold" :class="variacaoClass(kpi.faturamento, geral.anterior?.faturamento)">
                {{ variacaoTexto(kpi.faturamento, geral.anterior?.faturamento) }}
              </p>
              <p v-else class="text-[11px] mt-2 text-gray-400 dark:text-white/40">{{ pctTotal(kpi.faturamento, geral.resumo.faturamento) }}% do total</p>
            </div>
          </div>
          <div class="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
            <div class="h-0.5 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
            <div class="p-5">
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Vendas</p>
              <p class="text-2xl font-black text-gray-900 dark:text-white mt-2 leading-none">{{ kpi.qtdPagamentos }}</p>
              <p v-if="garcomSelecionado === 'todos'" class="text-[11px] mt-2 font-bold" :class="variacaoClass(kpi.qtdPagamentos, geral.anterior?.qtdPagamentos)">
                {{ variacaoTexto(kpi.qtdPagamentos, geral.anterior?.qtdPagamentos) }}
              </p>
              <p v-else class="text-[11px] mt-2 text-gray-400 dark:text-white/40">{{ pctTotal(kpi.qtdPagamentos, geral.resumo.qtdPagamentos) }}% do total</p>
            </div>
          </div>
          <div class="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
            <div class="h-0.5 bg-gradient-to-r from-purple-400 to-violet-500"></div>
            <div class="p-5">
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Ticket Médio</p>
              <p class="text-2xl font-black text-gray-900 dark:text-white mt-2 leading-none">R$ {{ fmt(kpi.ticketMedio) }}</p>
              <p class="text-[11px] mt-2 text-gray-400 dark:text-white/40">por atendimento</p>
            </div>
          </div>
          <div class="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
            <div class="h-0.5 bg-gradient-to-r from-orange-400 to-amber-500"></div>
            <div class="p-5">
              <p class="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Pedidos</p>
              <p class="text-2xl font-black text-gray-900 dark:text-white mt-2 leading-none">{{ kpi.qtdPedidos ?? '—' }}</p>
              <p class="text-[11px] mt-2 text-gray-400 dark:text-white/40">no período</p>
            </div>
          </div>
        </div>

        <!-- SEM DADOS -->
        <div v-if="!geral.resumo.qtdPagamentos" class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
            <BarChart2 :size="24" class="text-gray-300 dark:text-white/25" />
          </div>
          <h3 class="text-base font-black text-gray-700 dark:text-white/80">Nenhuma venda neste período</h3>
          <p class="text-sm text-gray-400 dark:text-white/40 mt-1">Tente ampliar o período de busca.</p>
          <button @click="aplicarAtalho('mes')"
            class="mt-5 h-9 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black transition-all">
            Ver este mês
          </button>
        </div>

        <template v-else>

          <!-- ══ FUNCIONÁRIOS + PRODUTOS ══════════════════════════════ -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

            <!-- RANKING FUNCIONÁRIOS -->
            <div class="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                <h2 class="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Funcionários</h2>
                <button v-if="garcomSelecionado !== 'todos'" @click="selecionarGarcom('todos')"
                  class="text-[10px] font-black text-orange-400 hover:text-orange-500 transition-colors">
                  Ver todos
                </button>
              </div>

              <!-- BOTÃO TODOS -->
              <button @click="selecionarGarcom('todos')"
                class="w-full flex items-center gap-3 px-5 py-3 border-b border-gray-100 dark:border-white/[0.05] transition-colors"
                :class="garcomSelecionado === 'todos'
                  ? 'bg-orange-500/10 dark:bg-orange-500/15'
                  : 'hover:bg-gray-50 dark:hover:bg-white/5'">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  :class="garcomSelecionado === 'todos' ? 'bg-orange-500' : 'bg-gray-100 dark:bg-white/[0.06]'">
                  <Users :size="14" :class="garcomSelecionado === 'todos' ? 'text-white' : 'text-gray-500 dark:text-white/40'" />
                </div>
                <div class="flex-1 text-left">
                  <p class="text-xs font-black" :class="garcomSelecionado === 'todos' ? 'text-orange-500' : 'text-gray-900 dark:text-white'">
                    Todos
                  </p>
                  <p class="text-[10px] text-gray-400 dark:text-white/40">{{ geral.porFuncionario?.length ?? 0 }} funcionário(s)</p>
                </div>
                <div class="text-right shrink-0">
                  <p class="text-xs font-black" :class="garcomSelecionado === 'todos' ? 'text-orange-500' : 'text-gray-900 dark:text-white'">
                    R$ {{ fmt(geral.resumo.faturamento) }}
                  </p>
                  <p class="text-[10px] text-gray-400 dark:text-white/40">{{ geral.resumo.qtdPagamentos }} vendas</p>
                </div>
              </button>

              <!-- LISTA DE FUNCIONÁRIOS -->
              <div v-if="!geral.porFuncionario?.length" class="p-6 text-center text-xs text-gray-400 dark:text-white/40">
                Sem dados de funcionários
              </div>
              <div v-else class="divide-y divide-gray-100 dark:divide-white/[0.05]">
                <button v-for="(f, i) in geral.porFuncionario" :key="f.id"
                  @click="selecionarGarcom(f.id)"
                  class="w-full flex items-center gap-3 px-5 py-3.5 transition-colors text-left group"
                  :class="garcomSelecionado === f.id
                    ? 'bg-orange-500/10 dark:bg-orange-500/15'
                    : 'hover:bg-gray-50 dark:hover:bg-white/5'">
                  <!-- AVATAR -->
                  <div class="relative shrink-0">
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                      :class="garcomSelecionado === f.id
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/60'">
                      {{ f.nome[0].toUpperCase() }}
                    </div>
                    <span v-if="i === 0" class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-orange-500 flex items-center justify-center">
                      <span class="text-[7px] font-black text-white">1</span>
                    </span>
                  </div>
                  <!-- INFO -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2 mb-1">
                      <p class="text-xs font-black truncate"
                        :class="garcomSelecionado === f.id ? 'text-orange-500' : 'text-gray-900 dark:text-white'">
                        {{ f.nome.split(' ')[0] }}
                      </p>
                      <p class="text-xs font-black shrink-0"
                        :class="garcomSelecionado === f.id ? 'text-orange-500' : 'text-gray-900 dark:text-white'">
                        R$ {{ fmt(f.totalFaturado) }}
                      </p>
                    </div>
                    <!-- BARRA DE SHARE -->
                    <div class="flex items-center gap-2">
                      <div class="flex-1 h-1 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div class="h-full rounded-full transition-all duration-500"
                          :class="garcomSelecionado === f.id ? 'bg-orange-500' : 'bg-orange-400/50'"
                          :style="{ width: pctTotal(f.totalFaturado, geral.resumo.faturamento) + '%' }" />
                      </div>
                      <span class="text-[10px] text-gray-400 dark:text-white/40 shrink-0 w-8 text-right">
                        {{ pctTotal(f.totalFaturado, geral.resumo.faturamento) }}%
                      </span>
                    </div>
                    <p class="text-[10px] text-gray-400 dark:text-white/40 mt-0.5 capitalize">
                      {{ f.cargo }} · {{ f.qtdPagamentos }}x
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <!-- PRODUTOS MAIS VENDIDOS -->
            <div class="lg:col-span-2 bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
              <div class="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
                <div>
                  <h2 class="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Produtos mais vendidos</h2>
                  <p v-if="garcomSelecionado !== 'todos'" class="text-[10px] text-orange-400 font-bold mt-0.5">
                    de {{ nomeGarcomSelecionado }}
                  </p>
                </div>
                <span class="text-[11px] text-gray-400 dark:text-white/40">{{ produtos?.ranking.length ?? 0 }} itens</span>
              </div>

              <div v-if="carregandoProdutos" class="p-5 space-y-3">
                <div v-for="n in 5" :key="n" class="h-10 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse" />
              </div>
              <div v-else-if="!produtos?.ranking.length" class="flex flex-col items-center justify-center py-16 text-center px-5">
                <div class="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-3">
                  <Package :size="20" class="text-gray-300 dark:text-white/25" />
                </div>
                <p class="text-sm font-black text-gray-700 dark:text-white/80">Nenhum produto vendido</p>
                <p class="text-xs text-gray-400 dark:text-white/40 mt-1">Tente ampliar o período ou mudar o funcionário.</p>
              </div>
              <div v-else class="divide-y divide-gray-100 dark:divide-white/[0.05] max-h-[420px] overflow-auto">
                <div v-for="(p, i) in produtos.ranking" :key="p.id"
                  class="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <!-- RANK -->
                  <div class="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
                    :class="i === 0 ? 'bg-orange-500 text-white' : i === 1 ? 'bg-orange-500/20 text-orange-400' : i === 2 ? 'bg-orange-500/10 text-orange-400' : 'bg-gray-50 dark:bg-white/[0.03] text-gray-300 dark:text-white/25'">
                    {{ i + 1 }}
                  </div>
                  <!-- PRODUTO -->
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-black text-gray-900 dark:text-white truncate">{{ p.nome }}</p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-[10px] text-gray-400 dark:text-white/40 shrink-0">{{ p.categoria || 'Sem categoria' }}</span>
                      <div class="flex-1 h-1.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div class="h-full bg-orange-400 rounded-full transition-all duration-500"
                          :style="{ width: pctDe(p.qtdVendida, produtos.ranking, 'qtdVendida') + '%' }" />
                      </div>
                    </div>
                  </div>
                  <!-- NÚMEROS -->
                  <div class="text-right shrink-0">
                    <p class="text-sm font-black text-gray-900 dark:text-white">{{ p.qtdVendida }}<span class="text-[10px] font-bold text-gray-400 dark:text-white/40">x</span></p>
                    <p class="text-[10px] text-orange-500 font-bold">R$ {{ fmt(p.totalGerado) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ══ MÉTODOS + HORÁRIO ══════════════════════════════════════ -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">

            <!-- MÉTODOS DE PAGAMENTO -->
            <div class="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/[0.08] rounded-2xl p-5">
              <h2 class="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-4">Como pagaram</h2>
              <div v-if="!geral.metodos.length" class="text-sm text-gray-400 dark:text-white/40">Sem dados</div>
              <div v-else class="space-y-4">
                <div v-for="m in geral.metodos" :key="m.metodo">
                  <div class="flex justify-between items-center mb-1.5">
                    <span class="text-xs font-bold text-gray-700 dark:text-white/80">{{ m.metodo }}</span>
                    <div class="text-right">
                      <span class="text-xs font-black text-orange-500">R$ {{ fmt(m.total) }}</span>
                      <span class="text-[10px] text-gray-400 dark:text-white/40 ml-1.5">{{ m.qtd }}x</span>
                    </div>
                  </div>
                  <div class="h-2 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-700"
                      :style="{ width: pctDe(m.total, geral.metodos, 'total') + '%' }" />
                  </div>
                </div>
              </div>
            </div>

            <!-- HORÁRIO DE PICO -->
            <div class="bg-white dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/[0.08] rounded-2xl p-5">
              <h2 class="text-xs font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-4">Horário de pico</h2>
              <div v-if="!geral.horarios?.length" class="flex items-center justify-center h-20 text-sm text-gray-400 dark:text-white/40">Sem dados</div>
              <div v-else>
                <div class="flex items-end gap-px h-20">
                  <div v-for="h in horasCompletas" :key="h.hora" class="flex-1 flex flex-col items-center group">
                    <div class="relative w-full">
                      <div class="w-full rounded-sm transition-all duration-300 cursor-default"
                        :class="h.qtd > 0 ? 'bg-orange-400 hover:bg-orange-500' : 'bg-gray-100 dark:bg-white/[0.06]'"
                        :style="{ height: Math.max(h.qtd > 0 ? 3 : 2, (h.qtd / maxHorario) * 72) + 'px' }" />
                      <div v-if="h.qtd > 0" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-10">
                        {{ h.hora }}h · {{ h.qtd }}x
                      </div>
                    </div>
                  </div>
                </div>
                <div class="flex justify-between mt-2">
                  <span class="text-[9px] text-gray-400 dark:text-white/30">0h</span>
                  <span class="text-[9px] text-gray-400 dark:text-white/30">6h</span>
                  <span class="text-[9px] text-gray-400 dark:text-white/30">12h</span>
                  <span class="text-[9px] text-gray-400 dark:text-white/30">18h</span>
                  <span class="text-[9px] text-gray-400 dark:text-white/30">23h</span>
                </div>
              </div>
            </div>
          </div>

          <!-- ══ AUDITORIA (admin only) ════════════════════════════════ -->
          <div v-if="isAdmin" class="no-print">
            <button @click="toggleAuditoria"
              class="w-full flex items-center justify-between px-5 py-3.5 bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] text-xs font-black text-gray-500 dark:text-white/40 hover:bg-gray-50 dark:hover:bg-white/[0.07] transition-all">
              <span class="flex items-center gap-2">
                <ShieldCheck :size="13" class="text-orange-400" />
                Trilha de auditoria
                <span v-if="auditoria !== null" class="text-gray-400 dark:text-white/30 font-normal">· {{ auditoria.length }} operações sensíveis</span>
              </span>
              <ChevronDown :size="14" class="transition-transform duration-200" :class="mostrarAuditoria ? 'rotate-180' : ''" />
            </button>
            <div v-if="mostrarAuditoria" class="mt-3 bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
              <div v-if="carregandoAuditoria" class="p-6 text-center text-xs text-gray-400 dark:text-white/40">Carregando...</div>
              <div v-else-if="!auditoria?.length" class="p-8 text-center text-xs text-gray-400 dark:text-white/40">
                Nenhuma operação sensível no período
              </div>
              <div v-else class="overflow-auto max-h-72">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 dark:bg-white/[0.04] sticky top-0">
                    <tr>
                      <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Data</th>
                      <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Usuário</th>
                      <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Ação</th>
                      <th class="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="reg in auditoria" :key="reg.id"
                      class="border-t border-gray-100 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/5">
                      <td class="px-4 py-3 text-[11px] text-gray-400 dark:text-white/40 whitespace-nowrap">{{ fmtDateTime(reg.created_at) }}</td>
                      <td class="px-4 py-3 text-xs font-bold text-gray-600 dark:text-white/80">{{ reg.usuario || '—' }}</td>
                      <td class="px-4 py-3">
                        <span class="text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap" :class="infoAcao(reg.acao).cor">
                          {{ infoAcao(reg.acao).label }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-xs text-gray-500 dark:text-white/60 max-w-xs truncate">{{ fmtDetalhes(reg.detalhes) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </template>
      </template>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  CalendarDays, RefreshCw, BarChart2, ShieldCheck, Package,
  ChevronDown, Printer, Download, Users
} from 'lucide-vue-next'
import Navbar  from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import { useApi }        from '~/services/api'
import { useToastStore } from '~/stores/toast'
import { useAuthStore }  from '~/stores/auth'

definePageMeta({ layout: false })

const api        = useApi()
const toastStore = useToastStore()
const authStore  = useAuthStore()
const isAdmin    = computed(() => authStore.usuario?.cargo === 'administrador')

// ── Estado ────────────────────────────────────────────────────────
const garcomSelecionado  = ref<'todos' | number>('todos')
const periodoAtivo       = ref('hoje')
const carregando         = ref(false)
const carregandoProdutos = ref(false)
const carregandoAuditoria = ref(false)
const mostrarAuditoria   = ref(false)

// ── Datas ─────────────────────────────────────────────────────────
function toISO(d: Date) { return d.toISOString().slice(0, 10) }
function subDias(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() - n); return r }

const agora = new Date(); agora.setHours(0, 0, 0, 0)
const dataInicio = ref(toISO(agora))
const dataFim    = ref(toISO(agora))

const atalhos = [
  { tipo: 'hoje',      label: 'Hoje' },
  { tipo: 'ontem',     label: 'Ontem' },
  { tipo: 'anteontem', label: 'Anteontem' },
  { tipo: 'semana',    label: 'Esta semana' },
  { tipo: 'mes',       label: 'Este mês' },
]

function aplicarAtalho(tipo: string) {
  const h = new Date(); h.setHours(0, 0, 0, 0)
  if      (tipo === 'hoje')      { dataInicio.value = dataFim.value = toISO(h) }
  else if (tipo === 'ontem')     { dataInicio.value = dataFim.value = toISO(subDias(h, 1)) }
  else if (tipo === 'anteontem') { dataInicio.value = dataFim.value = toISO(subDias(h, 2)) }
  else if (tipo === 'semana')    { dataInicio.value = toISO(subDias(h, 6)); dataFim.value = toISO(h) }
  else if (tipo === 'mes')       { dataInicio.value = toISO(new Date(h.getFullYear(), h.getMonth(), 1)); dataFim.value = toISO(h) }
  periodoAtivo.value = tipo
  buscar()
}

const labelPeriodo = computed(() => {
  const a = atalhos.find(a => a.tipo === periodoAtivo.value)
  if (a) return a.label
  const i = fmtDia(dataInicio.value), f = fmtDia(dataFim.value)
  return i === f ? i : `${i} → ${f}`
})

const labelContexto = computed(() =>
  garcomSelecionado.value === 'todos'
    ? `Todos os funcionários · ${labelPeriodo.value}`
    : `${nomeGarcomSelecionado.value} · ${labelPeriodo.value}`
)

// ── Dados ─────────────────────────────────────────────────────────
interface GeralData    { resumo: any; anterior: any; evolucao: any[]; metodos: any[]; horarios: any[]; porFuncionario: any[] }
interface ProdutosData { ranking: any[]; porCategoria: any[]; semVenda: any[] }

const geral    = ref<GeralData | null>(null)
const produtos = ref<ProdutosData | null>(null)
const auditoria = ref<any[] | null>(null)

// KPIs computados — usa dados do porFuncionario quando garçom selecionado
const kpi = computed(() => {
  if (!geral.value) return { faturamento: 0, qtdPagamentos: 0, ticketMedio: 0, qtdPedidos: 0 }
  if (garcomSelecionado.value === 'todos') {
    return {
      faturamento:    geral.value.resumo.faturamento,
      qtdPagamentos:  geral.value.resumo.qtdPagamentos,
      ticketMedio:    geral.value.resumo.ticketMedio,
      qtdPedidos:     geral.value.resumo.qtdPedidos ?? null
    }
  }
  const f = geral.value.porFuncionario?.find((f: any) => f.id === garcomSelecionado.value)
  if (!f) return { faturamento: 0, qtdPagamentos: 0, ticketMedio: 0, qtdPedidos: null }
  const ticket = f.qtdPagamentos > 0 ? f.totalFaturado / f.qtdPagamentos : 0
  return { faturamento: f.totalFaturado, qtdPagamentos: f.qtdPagamentos, ticketMedio: ticket, qtdPedidos: f.qtdPedidos ?? null }
})

const nomeGarcomSelecionado = computed(() => {
  if (garcomSelecionado.value === 'todos') return 'Todos'
  const f = geral.value?.porFuncionario?.find((f: any) => f.id === garcomSelecionado.value)
  return f ? f.nome.split(' ')[0] : 'Funcionário'
})

function qsBase() {
  return `?dataInicio=${dataInicio.value}&dataFim=${dataFim.value}&metodoId=todos&categoriaId=todos&funcionarioId=todos`
}

async function buscar() {
  carregando.value = true
  try {
    // geral sempre sem filtro de garçom (para ter o ranking completo de funcionários)
    const [g, p] = await Promise.all([
      api.get<GeralData>(`/relatorios${qsBase()}&garcomId=todos`),
      api.get<ProdutosData>(`/relatorios/produtos${qsBase()}&garcomId=${garcomSelecionado.value}`)
    ])
    geral.value    = g
    produtos.value = p
    // reset audit when period changes
    auditoria.value = null
    mostrarAuditoria.value = false
  } catch (e: any) {
    toastStore.error('Erro ao carregar relatório', e?.message)
  } finally {
    carregando.value = false
  }
}

async function buscarProdutos() {
  carregandoProdutos.value = true
  try {
    produtos.value = await api.get<ProdutosData>(
      `/relatorios/produtos${qsBase()}&garcomId=${garcomSelecionado.value}`
    )
  } catch {} finally {
    carregandoProdutos.value = false
  }
}

function selecionarGarcom(id: 'todos' | number) {
  garcomSelecionado.value = id
  buscarProdutos()
}

async function toggleAuditoria() {
  mostrarAuditoria.value = !mostrarAuditoria.value
  if (mostrarAuditoria.value && auditoria.value === null) {
    carregandoAuditoria.value = true
    try {
      auditoria.value = await api.get<any[]>(
        `/relatorios/auditoria?dataInicio=${dataInicio.value}&dataFim=${dataFim.value}&limite=300`
      )
    } catch { auditoria.value = [] }
    finally { carregandoAuditoria.value = false }
  }
}

// ── Helpers ───────────────────────────────────────────────────────
const fmt = (v: any) => Number(v || 0).toFixed(2)

function fmtDia(iso: string) {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00')
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}
function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function variacaoClass(atual: number, anterior: number) {
  if (!anterior) return 'text-gray-300 dark:text-white/30'
  return atual >= anterior ? 'text-green-400' : 'text-red-400'
}
function variacaoTexto(atual: number, anterior: number) {
  if (!anterior) return 'sem período anterior'
  const pct = ((atual - anterior) / anterior) * 100
  return (pct >= 0 ? '↑ ' : '↓ ') + Math.abs(pct).toFixed(1) + '% vs anterior'
}
function pctTotal(valor: any, total: any) {
  const t = Number(total)
  return t > 0 ? Math.round((Number(valor) / t) * 100) : 0
}
function pctDe(valor: any, lista: any[], campo: string) {
  const max = Math.max(...lista.map(i => Number(i[campo])))
  return max > 0 ? (Number(valor) / max) * 100 : 0
}

const horasCompletas = computed(() => {
  const horarios = geral.value?.horarios || []
  return Array.from({ length: 24 }, (_, h) => {
    const found = horarios.find((x: any) => Number(x.hora) === h)
    return { hora: h, qtd: found ? Number(found.qtd) : 0 }
  })
})
const maxHorario = computed(() => Math.max(...horasCompletas.value.map(h => h.qtd), 1))

const ACOES: Record<string, { label: string; cor: string }> = {
  caixa_abrir:      { label: 'Abertura de caixa',   cor: 'bg-green-500/15 text-green-400' },
  caixa_fechar:     { label: 'Fechamento de caixa', cor: 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/60' },
  caixa_sangria:    { label: 'Sangria',             cor: 'bg-red-500/15 text-red-400' },
  caixa_suprimento: { label: 'Suprimento',          cor: 'bg-blue-500/15 text-blue-400' },
  item_excluir:     { label: 'Item excluído',       cor: 'bg-red-500/15 text-red-400' },
  item_decrementar: { label: 'Item decrementado',   cor: 'bg-orange-500/15 text-orange-400' },
  pedido_abater:    { label: 'Abatimento',          cor: 'bg-amber-500/15 text-amber-400' },
  venda_desconto:   { label: 'Venda c/ desconto',   cor: 'bg-amber-500/15 text-amber-400' },
}
function infoAcao(acao: string) {
  return ACOES[acao] || { label: acao, cor: 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/40' }
}
function fmtDetalhes(d: any) {
  if (!d) return '—'
  return Object.entries(d)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => {
      const n = k.replace(/_/g, ' ')
      const val = typeof v === 'number' && ['valor', 'desconto', 'subtotal'].includes(n)
        ? 'R$ ' + Number(v).toFixed(2) : String(v)
      return `${n}: ${val}`
    }).join(' · ')
}

function imprimirRelatorio() { globalThis.print() }

function exportarCSV() {
  const rows: string[][] = []
  const n = (v: any) => Number(v || 0).toFixed(2).replace('.', ',')
  const esc = (v: any) => { const s = String(v ?? ''); return /[;\n"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

  rows.push(['Período', labelPeriodo.value])
  rows.push(['Funcionário', garcomSelecionado.value === 'todos' ? 'Todos' : nomeGarcomSelecionado.value])
  rows.push([])
  rows.push(['FATURAMENTO', n(kpi.value.faturamento)])
  rows.push(['VENDAS', String(kpi.value.qtdPagamentos)])
  rows.push(['TICKET MÉDIO', n(kpi.value.ticketMedio)])
  rows.push([])
  if (geral.value?.porFuncionario?.length) {
    rows.push(['FUNCIONÁRIOS'])
    rows.push(['Nome', 'Cargo', 'Faturamento (R$)', 'Vendas'])
    geral.value.porFuncionario.forEach((f: any) =>
      rows.push([f.nome, f.cargo, n(f.totalFaturado), String(f.qtdPagamentos)]))
    rows.push([])
  }
  if (produtos.value?.ranking.length) {
    rows.push(['PRODUTOS MAIS VENDIDOS'])
    rows.push(['#', 'Produto', 'Categoria', 'Qtd', 'Total (R$)'])
    produtos.value.ranking.forEach((p: any, i: number) =>
      rows.push([String(i + 1), p.nome, p.categoria || '—', String(p.qtdVendida), n(p.totalGerado)]))
    rows.push([])
  }
  if (geral.value?.metodos.length) {
    rows.push(['MÉTODOS DE PAGAMENTO'])
    rows.push(['Método', 'Qtd', 'Total (R$)'])
    geral.value.metodos.forEach((m: any) => rows.push([m.metodo, String(m.qtd), n(m.total)]))
  }

  if (!rows.length) { toastStore.error('Sem dados para exportar'); return }
  const csv = rows.map(r => r.map(esc).join(';')).join('\n')
  const nome = `relatorio-${garcomSelecionado.value}-${dataInicio.value}.csv`
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click()
  URL.revokeObjectURL(url)
}

onMounted(buscar)
</script>

<style>
@media print {
  .no-print, nav, aside, header { display: none !important; }
  body, .min-h-screen { background: white !important; }
  .min-h-screen { padding-left: 0 !important; }
  main { max-width: 100% !important; padding: 0 !important; }
}
</style>
