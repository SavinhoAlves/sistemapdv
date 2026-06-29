<template>
  <div class="h-screen flex flex-col bg-neutral-100 dark:bg-neutral-950 overflow-hidden transition-colors duration-200">
    <Navbar />

    <!-- CAIXA FECHADO -->
    <div v-if="!caixaAberto" class="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
      <div class="w-16 h-16 rounded-2xl bg-neutral-200 dark:bg-neutral-900 flex items-center justify-center">
        <LockKeyhole :size="28" class="text-neutral-400 dark:text-neutral-700" />
      </div>
      <h3 class="text-lg font-black text-neutral-700 dark:text-neutral-300">Caixa fechado</h3>
      <p class="text-sm text-neutral-400">O administrador precisa abrir o caixa para iniciar as vendas.</p>
    </div>

    <template v-else>
      <!-- TABS -->
      <div class="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-5 flex items-center gap-1 h-11 shrink-0">
        <button @click="aba = 'venda'"
          class="h-7 px-4 rounded-lg text-xs font-black transition-all"
          :class="aba === 'venda' ? 'bg-orange-500 text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'">
          Venda de Fichas
        </button>
        <button v-if="isAdmin" @click="aba = 'mesas'"
          class="h-7 px-4 rounded-lg text-xs font-black transition-all"
          :class="aba === 'mesas' ? 'bg-orange-500 text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'">
          Fechar Mesa
        </button>
        <div class="ml-auto flex items-center gap-2" v-if="isAdmin">
          <button @click="modalMovimento = 'suprimento'"
            class="h-7 px-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-500 text-xs font-black transition-all flex items-center gap-1">
            <ArrowDownLeft :size="11" /> Suprimento
          </button>
          <button @click="modalMovimento = 'sangria'"
            class="h-7 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-black transition-all flex items-center gap-1">
            <ArrowUpRight :size="11" /> Sangria
          </button>
        </div>
      </div>

      <!-- ══ ABA: VENDA DIRETA ══ -->
      <div v-if="aba === 'venda'" class="flex-1 flex overflow-hidden">

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
                class="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 text-left hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-md active:scale-95 transition-all"
              >
                <div class="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center mb-2.5">
                  <UtensilsCrossed :size="14" class="text-orange-500" />
                </div>
                <p class="text-xs font-black text-neutral-900 dark:text-white leading-snug line-clamp-2">{{ p.nome }}</p>
                <p v-if="p.categoria" class="text-[10px] text-neutral-400 mt-0.5 truncate">{{ p.categoria }}</p>
                <p class="text-sm font-black text-orange-500 mt-1.5">R$ {{ fmt(p.preco) }}</p>
              </button>
            </div>
          </div>
        </div>

        <!-- CARRINHO -->
        <div class="w-72 xl:w-80 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0">

          <!-- HEADER CARRINHO -->
          <div class="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2">
              <ShoppingCart :size="14" class="text-orange-500" />
              <span class="text-xs font-black text-neutral-900 dark:text-white">Carrinho</span>
              <span v-if="carrinho.length" class="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black flex items-center justify-center">
                {{ carrinho.length }}
              </span>
            </div>
            <button v-if="carrinho.length" @click="carrinho = []"
              class="text-[10px] font-black text-red-400 hover:text-red-500 transition-colors">
              Limpar
            </button>
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

      <!-- ══ ABA: MESAS ══ -->
      <div v-else class="flex-1 overflow-y-auto p-5 space-y-5">

        <!-- TOTAIS DO CAIXA -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
            <p class="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">Saldo Inicial</p>
            <p class="text-xl font-black text-neutral-700 dark:text-neutral-300">R$ {{ fmt(totais?.valor_inicial) }}</p>
          </div>
          <div class="bg-white dark:bg-neutral-900 border border-green-200 dark:border-green-900 rounded-2xl p-4">
            <p class="text-[10px] font-black uppercase tracking-widest text-green-500 mb-1">Total Entradas</p>
            <p class="text-xl font-black text-green-600 dark:text-green-400">+ R$ {{ fmt(totais?.total_entradas) }}</p>
          </div>
          <div class="bg-white dark:bg-neutral-900 border border-red-200 dark:border-red-900 rounded-2xl p-4">
            <p class="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Total Saídas</p>
            <p class="text-xl font-black text-red-500 dark:text-red-400">− R$ {{ fmt(totais?.total_saidas) }}</p>
          </div>
          <div class="bg-orange-500 rounded-2xl p-4">
            <p class="text-[10px] font-black uppercase tracking-widest text-orange-100 mb-1">Saldo Atual</p>
            <p class="text-xl font-black text-white">R$ {{ fmt(totais?.saldo_atual) }}</p>
          </div>
        </div>

        <!-- MESAS ABERTAS -->
        <div>
          <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400 mb-3">Mesas para fechamento</h2>
          <div v-if="!mesasAbertas.length" class="flex flex-col items-center justify-center py-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl gap-2 text-center">
            <LayoutGrid :size="28" class="text-neutral-300 dark:text-neutral-700" />
            <p class="text-sm text-neutral-400">Nenhuma mesa aguardando fechamento</p>
          </div>
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <button v-for="mesa in mesasAbertas" :key="mesa.id"
              @click="abrirPagamento(mesa)"
              class="group bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 text-left hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-lg active:scale-95 transition-all">
              <div class="flex items-start justify-between mb-4">
                <div>
                  <p class="text-base font-black text-neutral-900 dark:text-white">{{ mesa.nome_mesa }}</p>
                  <p v-if="mesa.garcom" class="text-xs text-neutral-400 mt-0.5">{{ mesa.garcom }}</p>
                </div>
                <span class="text-[10px] font-black px-2 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">ABERTA</span>
              </div>
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-[11px] text-neutral-400">Total</p>
                  <p class="text-xl font-black text-neutral-900 dark:text-white">R$ {{ fmt(mesa.total_liquido) }}</p>
                  <p v-if="Number(mesa.desconto) > 0" class="text-[11px] text-green-500 font-bold">− R$ {{ fmt(mesa.desconto) }} desc.</p>
                </div>
                <div class="w-10 h-10 rounded-xl bg-orange-500 group-hover:bg-orange-400 flex items-center justify-center transition-colors">
                  <CreditCard :size="16" class="text-white" />
                </div>
              </div>
              <p class="text-[10px] text-neutral-400 mt-3">{{ tempoAberta(mesa.data_abertura) }}</p>
            </button>
          </div>
        </div>

        <!-- EXTRATO DO CAIXA -->
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
          <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <h2 class="text-xs font-black uppercase tracking-widest text-neutral-400">Extrato do caixa</h2>
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-neutral-400">{{ movimentos.length }} transações</span>
              <button @click="buscar" class="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                <RefreshCw :size="12" :class="carregando ? 'animate-spin' : ''" class="text-neutral-500" />
              </button>
            </div>
          </div>
          <div v-if="!movimentos.length" class="flex flex-col items-center justify-center py-10 gap-2 text-neutral-400">
            <ReceiptText :size="24" class="text-neutral-300 dark:text-neutral-700" />
            <p class="text-sm">Nenhuma transação registrada</p>
          </div>
          <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-72 overflow-auto">
            <div v-for="mov in movimentos" :key="mov.id" class="flex items-center gap-3 px-5 py-3">
              <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                :class="{
                  'bg-green-100 dark:bg-green-950/50': mov.tipo === 'pagamento',
                  'bg-blue-100 dark:bg-blue-950/50':  mov.tipo === 'suprimento',
                  'bg-red-100 dark:bg-red-950/50':    mov.tipo === 'sangria',
                  'bg-orange-100 dark:bg-orange-950/50': mov.tipo === 'estorno',
                }">
                <component :is="iconeMovimento(mov.tipo)" :size="13"
                  :class="{
                    'text-green-600 dark:text-green-400': mov.tipo === 'pagamento',
                    'text-blue-600 dark:text-blue-400':  mov.tipo === 'suprimento',
                    'text-red-500':                      mov.tipo === 'sangria',
                    'text-orange-500':                   mov.tipo === 'estorno',
                  }" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">{{ mov.descricao || labelTipo(mov.tipo) }}</p>
                <p class="text-[10px] text-neutral-400 mt-0.5">{{ mov.operador || '—' }} · {{ fmtHora(mov.created_at) }}</p>
              </div>
              <span class="text-sm font-black shrink-0 w-24 text-right"
                :class="['sangria','estorno'].includes(mov.tipo) ? 'text-red-500' : 'text-green-600 dark:text-green-400'">
                {{ ['sangria','estorno'].includes(mov.tipo) ? '−' : '+' }} R$ {{ fmt(mov.valor) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>

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

    <!-- MODAL PAGAMENTO MESA -->
    <ModalPagamento
      v-if="mesaParaPagar"
      :aberto="!!mesaParaPagar"
      :mesa="mesaParaPagar"
      :pedido-id="mesaParaPagar.pedido_id ?? null"
      :total="Number(mesaParaPagar.total_liquido ?? 0)"
      @fechar="mesaParaPagar = null"
      @pago="onPago"
    />

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


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import {
  LockKeyhole, Package, ShoppingCart, Plus, Minus, CheckCircle2, Loader2,
  CreditCard, LayoutGrid, RefreshCw, ReceiptText, Printer, Search,
  Banknote, QrCode, Wallet, ArrowLeftRight, ArrowUpRight, ArrowDownLeft,
  UtensilsCrossed
} from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import ModalPagamento from '~/components/modals/ModalPagamento.vue'
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

// ══ ABA ══
const aba = ref<'venda' | 'mesas'>('venda')

// ══ PRODUTOS ══
interface Produto { id: number; nome: string; preco: number; categoria: string | null; categoria_id: number | null; ativo: number }
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
  if (idx >= 0) { carrinho.value[idx].quantidade++ } else {
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
    await buscar()
    if (configStore.impressora_auto_imprimir) imprimirFicha()
  } catch (e: any) {
    toastStore.error('Erro ao registrar venda', e?.message)
  } finally {
    processando.value = false
  }
}

function fecharFicha() { fichaAtual.value = null }

function imprimirFicha() {
  if (!fichaAtual.value) return
  const ficha    = fichaAtual.value
  const nomeRest = configStore.nome_restaurante || 'Restaurante PDV'
  const logo     = configStore.logo_base64
  const mensagem = configStore.mensagem_ficha || 'Obrigado pela preferência!'
  const dataStr  = fmtFichaDateTime(ficha.createdAt)
  const logoHtml = logo
    ? `<img src="${logo}" style="height:40px;object-fit:contain;margin-bottom:6px;" />`
    : ''

  // Paper width: 58mm → 220px, 80mm → 302px
  const largura  = configStore.impressora_largura === 58 ? 220 : 302
  const copias   = Math.max(1, configStore.impressora_copias || 1)

  // Uma ficha por unidade por cópia
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
    @page { size: ${largura}px auto; margin: 0; }
    .ticket {
      width: ${largura}px;
      margin: 0 auto;
      padding: 16px 12px 20px;
      text-align: center;
      page-break-after: always;
    }
    .ticket:last-child { page-break-after: avoid; }
    .restaurante { font-size: ${largura < 250 ? 10 : 12}px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
    .info { font-size: 9px; color: #666; margin-top: 2px; }
    .sep { border-top: 1px dashed #000; margin: 10px 0; }
    .produto {
      font-size: ${largura < 250 ? 22 : 28}px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      padding: 10px 4px;
      word-break: break-word;
      line-height: 1.15;
    }
    .codigo { font-size: 9px; color: #aaa; margin-top: 4px; }
    .mensagem { font-size: 9px; color: #888; font-style: italic; margin-top: 6px; }
  </style></head><body>
  ${fichas.join('')}
  <script>window.onload = () => { window.print(); }<\/script>
  </body></html>`

  const w = window.open('', '_blank', `width=${largura + 60},height=500`)
  if (w) { w.document.write(html); w.document.close() }
}

// ══ MESAS ══
const carregando    = ref(false)
const mesasAbertas  = ref<any[]>([])
const movimentos    = ref<any[]>([])
const totais        = ref<any>(null)
const mesaParaPagar = ref<any>(null)

function abrirPagamento(mesa: any) { mesaParaPagar.value = mesa }
async function onPago() {
  mesaParaPagar.value = null
  toastStore.success('Pagamento registrado!')
  await buscar()
}

function tempoAberta(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 60) return `Aberta há ${diff} min`
  return `Aberta há ${Math.floor(diff / 60)}h${diff % 60 > 0 ? ` ${diff % 60}min` : ''}`
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
  } catch (e: any) { toastStore.error('Erro', e?.message) }
  finally { salvandoMov.value = false }
}

// ══ FORMATAÇÃO ══
const fmt = (v: any) => Number(v || 0).toFixed(2)
function fmtHora(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
function fmtFichaDateTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function iconeMovimento(tipo: string) {
  if (tipo === 'pagamento')  return Banknote
  if (tipo === 'suprimento') return ArrowDownLeft
  if (tipo === 'sangria')    return ArrowUpRight
  return Banknote
}
function labelTipo(tipo: string) {
  const m: Record<string, string> = { pagamento: 'Pagamento', suprimento: 'Suprimento', sangria: 'Sangria', estorno: 'Estorno' }
  return m[tipo] || tipo
}

// ══ BUSCA DE DADOS ══
async function buscar() {
  carregando.value = true
  try {
    const [statusCaixa, mesas, extrato] = await Promise.all([
      api.get<any>('/caixa/atual'),
      api.get<any[]>('/caixa/mesas-abertas'),
      api.get<any>('/caixa/movimentos')
    ])
    caixaStore.$patch({ aberto: statusCaixa?.aberto || false, caixaAtual: statusCaixa?.caixa || null })
    mesasAbertas.value = mesas
    movimentos.value   = extrato?.movimentos ?? []
    totais.value       = extrato?.totais ?? null
  } catch {
    toastStore.error('Erro ao carregar dados do caixa')
  } finally {
    carregando.value = false
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

onMounted(async () => {
  await Promise.all([buscar(), carregarProdutos(), carregarMetodos(), configStore.carregar()])
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-down-enter-active, .slide-down-leave-active { transition: all .2s ease; }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
