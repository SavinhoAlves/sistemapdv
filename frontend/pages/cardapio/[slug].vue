<template>
  <div class="cdp min-h-dvh pb-28 lg:pb-10 lg:pr-[404px]">
    <!-- Carregando / erro -->
    <div v-if="carregando" class="max-w-2xl mx-auto px-4 pt-10 space-y-3">
      <div class="h-16 rounded-2xl cdp-skel" /><div class="h-10 rounded-2xl cdp-skel" /><div v-for="n in 5" :key="n" class="h-24 rounded-2xl cdp-skel" />
    </div>
    <div v-else-if="erro" class="max-w-md mx-auto px-6 pt-24 text-center">
      <p class="text-lg font-extrabold">Cardápio indisponível</p>
      <p class="cdp-mudo mt-2 text-sm">{{ erro }}</p>
    </div>

    <template v-else-if="c">
      <!-- Topo -->
      <header class="px-5 lg:px-8 pt-7 pb-[18px]">
        <div class="flex items-center gap-4">
          <img v-if="c.restaurante.logo" :src="c.restaurante.logo" alt="" class="size-[60px] shrink-0 rounded-[20px] object-contain cdp-cartao p-1" />
          <span v-else class="size-[60px] shrink-0 rounded-[20px] cdp-ac flex items-center justify-center" aria-hidden="true"><UtensilsCrossed :size="30" /></span>
          <div class="min-w-0">
            <h1 class="text-[26px] font-extrabold tracking-[-.02em] leading-[1.1] truncate">{{ c.restaurante.nome }}</h1>
            <p class="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[13px] cdp-mudo">
              <span class="inline-flex items-center gap-1.5 font-semibold" :class="c.aberto ? 'cdp-ok' : 'text-red-500'">
                <span class="size-[7px] rounded-full" :class="c.aberto ? 'cdp-ponto' : 'bg-red-500'" />{{ c.aberto ? 'Aberto agora' : 'Fechado' }}
              </span>
              <span v-if="c.aberto" class="inline-flex items-center gap-[5px]"><Clock :size="14" /> {{ c.tempoMin }}–{{ c.tempoMin + 15 }} min</span>
              <span v-if="c.aberto && c.entrega" class="inline-flex items-center gap-[5px]"><Bike :size="14" /> {{ c.taxaEntrega ? `Entrega ${moeda(c.taxaEntrega)}` : 'Entrega grátis' }}</span>
              <span v-if="c.pedidoMinimo">Mínimo {{ moeda(c.pedidoMinimo) }}</span>
            </p>
          </div>
          <!-- Conta do cliente -->
          <button type="button" class="ml-auto shrink-0 inline-flex items-center gap-2 px-3.5 py-[9px] rounded-xl border text-sm font-semibold" :class="logado ? 'cdp-entrou' : 'cdp-cartao'" :aria-label="logado ? 'Minha conta' : 'Entrar'" @click="abrirConta()">
            <template v-if="logado"><UserRound :size="18" /><span class="max-[480px]:hidden">{{ perfil.cliente.nome.split(' ')[0] }}</span></template>
            <template v-else><LogIn :size="18" /><span class="max-[480px]:hidden">Entrar</span></template>
          </button>
        </div>
        <p v-if="!c.aberto" class="mt-3 max-w-2xl text-sm rounded-xl px-3 py-2.5 bg-red-500/10 text-red-700 dark:text-red-300">{{ c.motivo }} Você pode olhar o cardápio.</p>
        <p v-else-if="c.mensagem" class="mt-3 max-w-2xl text-sm rounded-xl px-3 py-2.5 bg-orange-500/10 text-orange-800 dark:text-orange-200">{{ c.mensagem }}</p>

        <a v-if="ultimoPedido" :href="`${base}pedido/${ultimoPedido}`" class="mt-3 max-w-2xl flex items-center justify-between rounded-xl px-3 py-2.5 cdp-cartao text-sm">
          <span>Acompanhar seu pedido <b class="font-mono">{{ ultimoPedido }}</b></span><ChevronRight :size="16" />
        </a>
      </header>

      <!-- Busca + categorias (fixas ao rolar) -->
      <div class="sticky top-0 z-20 cdp-barra backdrop-blur-[14px] border-b cdp-linha">
        <div class="px-5 lg:px-8 pt-2.5 pb-3">
          <div class="flex items-center gap-2.5">
            <label class="flex flex-1 max-w-[400px] items-center gap-2.5 h-10 px-3 rounded-xl cdp-busca text-sm">
              <Search :size="18" class="cdp-mudo shrink-0" />
              <input v-model="busca" type="search" placeholder="Buscar no cardápio" aria-label="Buscar no cardápio" class="flex-1 min-w-0 bg-transparent outline-none" />
            </label>
            <div class="flex shrink-0 p-[3px] rounded-xl cdp-cartao" role="group" aria-label="Visualização">
              <button type="button" class="w-[34px] h-8 rounded-[9px] grid place-items-center" :class="vista === 'lista' ? 'cdp-ativo' : 'cdp-mudo'" :aria-pressed="vista === 'lista'" aria-label="Lista" @click="mudarVista('lista')"><List :size="17" /></button>
              <button type="button" class="w-[34px] h-8 rounded-[9px] grid place-items-center" :class="vista === 'grade' ? 'cdp-ativo' : 'cdp-mudo'" :aria-pressed="vista === 'grade'" aria-label="Grade" @click="mudarVista('grade')"><LayoutGrid :size="17" /></button>
            </div>
          </div>
          <!-- Chips: arrastar, rodinha do mouse ou setas quando não cabem -->
          <div class="flex items-center gap-2 mt-2.5">
            <button v-show="setasChips" type="button" class="size-[34px] shrink-0 rounded-full cdp-cartao cdp-mudo grid place-items-center" aria-label="Rolar categorias para a esquerda" @click="rolarChips(-1)"><ChevronLeft :size="16" /></button>
            <nav ref="chipsEl" class="flex flex-1 min-w-0 gap-2 overflow-x-auto scroll-smooth no-scrollbar cursor-grab" aria-label="Categorias">
              <button type="button" class="shrink-0 px-4 py-2 rounded-full border text-[13px] font-semibold transition-colors" :class="catAtiva === null ? 'cdp-chip-on' : 'cdp-cartao cdp-mudo'" :aria-pressed="catAtiva === null" @click="escolherCat(null)">Todos</button>
              <button v-for="cat in c.categorias" :key="cat.id" type="button" class="shrink-0 px-4 py-2 rounded-full border text-[13px] font-semibold transition-colors" :class="catAtiva === cat.id ? 'cdp-chip-on' : 'cdp-cartao cdp-mudo'" :aria-pressed="catAtiva === cat.id" @click="escolherCat(cat.id)">{{ cat.nome }}</button>
            </nav>
            <button v-show="setasChips" type="button" class="size-[34px] shrink-0 rounded-full cdp-cartao cdp-mudo grid place-items-center" aria-label="Rolar categorias para a direita" @click="rolarChips(1)"><ChevronRight :size="16" /></button>
          </div>
        </div>
      </div>

      <!-- Produtos: cada categoria é uma coluna; as colunas deslizam da esquerda para a direita (arrastar, rodinha ou barra) -->
      <main class="px-5 lg:px-8">
        <p v-if="!filtradas.length" class="text-center cdp-mudo py-12">Nada encontrado para “{{ busca }}”. Tente outro nome.</p>
        <div ref="boardEl" class="flex items-start gap-8 overflow-x-auto snap-x snap-proximity scroll-pl-0.5 px-0.5 pt-6 pb-6 cdp-rolagem cursor-grab" :class="{ 'cdp-arrastando': arrastando }">
          <section v-for="cat in filtradas" :key="cat.id" class="flex-none snap-start" :class="unica ? 'w-full' : 'w-[min(86vw,360px)]'">
            <h2 class="text-xl font-extrabold tracking-[-.01em] mb-4">{{ cat.nome }}</h2>
            <div class="grid gap-4 justify-start" :class="unica
              ? (vista === 'grade' ? 'grid-cols-[repeat(auto-fill,minmax(min(100%,150px),230px))]' : 'grid-cols-[repeat(auto-fill,minmax(min(100%,340px),360px))]')
              : (vista === 'grade' ? 'grid-cols-2' : 'grid-cols-1')">
              <article v-for="p in cat.produtos" :key="p.id" class="flex rounded-[22px] cdp-cartao" :class="[vista === 'grade' ? 'flex-col gap-3 p-2.5' : 'gap-4 items-stretch p-3.5 min-h-32 lg:min-h-[140px]', p.esgotado ? 'opacity-50' : '']">
                <button type="button" class="relative shrink-0 overflow-hidden rounded-[14px]" :class="vista === 'grade' ? 'w-full aspect-[4/3]' : 'w-28 lg:w-32'" :aria-label="`Ver ${p.nome}`" @click="abrirProduto(p)">
                  <ProdutoFoto :imagem="p.imagemUrl" :categoria="cat.nome" classe="absolute inset-0 size-full rounded-none cdp-thumb" :tamanho-icone="38" />
                </button>
                <div class="flex-1 min-w-0 flex flex-col">
                  <button type="button" class="text-left" @click="abrirProduto(p)">
                    <h3 class="text-base font-semibold leading-tight">{{ p.nome }}</h3>
                    <p v-if="p.descricao" class="mt-[3px] text-[13px] cdp-mudo line-clamp-2">{{ p.descricao }}</p>
                  </button>
                  <div class="mt-auto pt-2.5 flex items-center justify-between gap-2">
                    <span class="text-[17px] font-extrabold tabular-nums">{{ p.esgotado ? 'Esgotado' : moeda(p.preco) }}</span>
                    <Controle v-if="!p.esgotado" :qtd="noCarrinho(p.id)" :nome="p.nome" @mais="somar(p)" @menos="tirar(p.id)" />
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </main>

      <!-- Seu pedido: fixo à direita no computador -->
      <aside class="hidden lg:flex fixed right-5 top-5 bottom-5 w-[364px] z-10 flex-col rounded-3xl cdp-cartao" aria-label="Seu pedido">
        <h2 class="px-[22px] pt-[22px] text-xl font-extrabold tracking-[-.01em]">Seu pedido</h2>
        <div class="flex-1 overflow-y-auto px-[22px] pt-3">
          <p v-if="!carrinho.length" class="text-center cdp-mudo py-12">Seu carrinho está vazio.</p>
          <div v-for="(i, idx) in carrinho" :key="idx" class="flex items-center gap-3 py-3 border-b cdp-linha">
            <div class="flex-1 min-w-0">
              <b class="block font-semibold">{{ i.nome }}</b>
              <small class="block cdp-mudo">{{ moeda(i.preco) }}<template v-if="i.observacao"> · {{ i.observacao }}</template></small>
            </div>
            <Controle :qtd="i.quantidade" :nome="i.nome" @mais="i.quantidade = Math.min(99, i.quantidade + 1)" @menos="menosItem(idx)" />
          </div>
          <p v-if="carrinho.length && faltaMinimo > 0" class="mt-3 text-xs rounded-xl px-3 py-2 bg-amber-500/10 text-amber-800 dark:text-amber-200">Faltam {{ moeda(faltaMinimo) }} para o pedido mínimo de {{ moeda(c.pedidoMinimo) }}.</p>
        </div>
        <div class="px-[22px] pt-4 pb-5">
          <div class="flex justify-between cdp-mudo mb-1.5"><span>Subtotal</span><span class="tabular-nums">{{ moeda(subtotal) }}</span></div>
          <div v-if="c.entrega" class="flex justify-between cdp-mudo mb-1.5"><span>Entrega</span><span :class="c.taxaEntrega ? 'tabular-nums' : 'cdp-ok font-semibold'">{{ c.taxaEntrega ? moeda(c.taxaEntrega) : 'Grátis' }}</span></div>
          <div class="flex justify-between text-[19px] font-extrabold mt-2.5 mb-3.5"><span>Total</span><span class="tabular-nums">{{ moeda(subtotal + (c.entrega ? c.taxaEntrega ?? 0 : 0)) }}</span></div>
          <button class="w-full p-4 rounded-[18px] cdp-ac font-extrabold text-base disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!qtdItens || faltaMinimo > 0 || !c.aberto" @click="etapa = 'dados'">
            {{ !c.aberto ? 'Restaurante fechado agora' : 'Finalizar pedido' }}
          </button>
        </div>
      </aside>

      <!-- Barra do carrinho (celular) -->
      <div class="lg:hidden fixed bottom-0 inset-x-0 z-30 px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pointer-events-none transition-transform duration-250" :class="qtdItens ? 'translate-y-0' : 'translate-y-[130%]'">
        <button class="pointer-events-auto w-full max-w-[680px] mx-auto flex items-center justify-between px-5 py-[15px] rounded-[18px] cdp-ac font-extrabold shadow-[0_12px_30px_rgba(0,0,0,.35)]" @click="etapa = 'sacola'">
          <span class="inline-flex items-center gap-2"><ShoppingBag :size="18" /><span class="cdp-ac-inv min-w-[26px] h-[26px] px-1.5 rounded-full inline-grid place-items-center text-[13px]">{{ qtdItens }}</span>Ver carrinho</span>
          <span class="tabular-nums">{{ moeda(subtotal) }}</span>
        </button>
      </div>

      <!-- Folha do produto -->
      <Folha v-if="produto" :titulo="produto.nome" @fechar="produto = null">
        <p v-if="produto.descricao" class="text-sm cdp-mudo">{{ produto.descricao }}</p>
        <img v-if="produto.imagemUrl" :src="produto.imagemUrl" alt="" class="w-full max-h-56 object-cover rounded-2xl mt-3" />
        <label class="block mt-4">
          <span class="text-xs font-bold cdp-mudo">Alguma observação?</span>
          <input v-model="obsProduto" maxlength="140" placeholder="Ex.: sem cebola, ponto da carne…" class="mt-1 w-full h-11 px-3 rounded-xl cdp-campo text-sm" />
        </label>
        <template #rodape>
          <div class="flex items-center gap-3">
            <Stepper v-model="qtdProduto" :min="1" />
            <button class="flex-1 h-12 rounded-2xl cdp-ac hover:brightness-110 font-extrabold" @click="adicionar">Adicionar · {{ moeda(produto.preco * qtdProduto) }}</button>
          </div>
        </template>
      </Folha>

      <!-- Sacola e finalização -->
      <Folha v-if="etapa" lateral :titulo="etapa === 'sacola' ? 'Seu pedido' : 'Finalizar pedido'" @fechar="etapa = null">
        <template v-if="etapa === 'sacola'">
          <div v-for="(i, idx) in carrinho" :key="idx" class="flex items-start gap-3 py-3 border-b cdp-linha last:border-0">
            <div class="flex-1 min-w-0">
              <p class="font-bold text-sm">{{ i.nome }}</p>
              <p v-if="i.observacao" class="text-xs cdp-mudo">{{ i.observacao }}</p>
              <p class="text-sm font-extrabold mt-1 tabular-nums">{{ moeda(i.preco * i.quantidade) }}</p>
            </div>
            <Controle :qtd="i.quantidade" :nome="i.nome" @mais="i.quantidade = Math.min(99, i.quantidade + 1)" @menos="menosItem(idx)" />
          </div>
          <p v-if="faltaMinimo > 0" class="mt-3 text-xs rounded-xl px-3 py-2 bg-amber-500/10 text-amber-800 dark:text-amber-200">Faltam {{ moeda(faltaMinimo) }} para o pedido mínimo de {{ moeda(c.pedidoMinimo) }}.</p>
        </template>

        <template v-else>
          <!-- Entrega ou retirada -->
          <div class="grid grid-cols-2 gap-2">
            <button v-if="c.entrega" type="button" class="h-12 rounded-xl border-2 text-sm font-extrabold" :class="f.tipo === 'entrega' ? 'border-orange-500 bg-orange-500/10' : 'cdp-linha'" @click="f.tipo = 'entrega'">Entrega</button>
            <button v-if="c.retirada" type="button" class="h-12 rounded-xl border-2 text-sm font-extrabold" :class="f.tipo === 'retirada' ? 'border-orange-500 bg-orange-500/10' : 'cdp-linha'" @click="f.tipo = 'retirada'">Retirar no local</button>
          </div>

          <!-- Logado: os dados vêm da conta -->
          <div v-if="logado" class="mt-4 rounded-xl cdp-cartao px-3 py-2.5 flex items-center gap-2 text-sm">
            <UserRound :size="16" class="shrink-0 cdp-mudo" />
            <span class="flex-1 min-w-0 truncate"><b>{{ perfil.cliente.nome }}</b> · {{ mascarar(perfil.cliente.telefone) }}</span>
            <button type="button" class="text-xs font-extrabold text-orange-600 dark:text-orange-400" @click="abrirConta()">Minha conta</button>
          </div>
          <button v-else type="button" class="mt-4 w-full rounded-xl px-3 py-2.5 text-left text-xs bg-orange-500/10 text-orange-800 dark:text-orange-200" @click="abrirConta('cadastro')">
            <b>Crie uma conta</b> para salvar seus dados e endereços e pedir mais rápido da próxima vez.
          </button>

          <div class="mt-4 grid grid-cols-1 gap-3">
            <template v-if="!logado">
              <Campo v-model="f.clienteNome" rotulo="Seu nome" autocomplete="name" />
              <Campo v-model="f.clienteTelefone" rotulo="Celular com DDD" tipo="tel" autocomplete="tel" placeholder="(62) 9 9999-9999" @update:model-value="mascararTelefone" />
            </template>
            <!-- Endereços salvos na conta -->
            <div v-if="f.tipo === 'entrega' && logado && perfil.enderecos.length" class="grid gap-2" role="radiogroup" aria-label="Endereço de entrega">
              <span class="text-xs font-bold cdp-mudo">Entregar em</span>
              <button v-for="e in perfil.enderecos" :key="e.id" type="button" role="radio" :aria-checked="enderecoEscolhido === e.id"
                class="rounded-xl border-2 px-3 py-2.5 text-left text-sm" :class="enderecoEscolhido === e.id ? 'border-orange-500 bg-orange-500/10' : 'cdp-linha'" @click="usarEndereco(e.id)">
                <b v-if="e.apelido">{{ e.apelido }} · </b>{{ e.endereco }}, {{ e.numero }} — {{ e.bairro }}
                <span v-if="e.complemento" class="block text-xs cdp-mudo">{{ e.complemento }}</span>
              </button>
              <button type="button" role="radio" :aria-checked="enderecoEscolhido === 'novo'"
                class="rounded-xl border-2 px-3 py-2.5 text-left text-sm font-bold" :class="enderecoEscolhido === 'novo' ? 'border-orange-500 bg-orange-500/10' : 'cdp-linha'" @click="usarEndereco('novo')">
                + Outro endereço
              </button>
            </div>
            <template v-if="f.tipo === 'entrega' && (!logado || enderecoEscolhido === 'novo')">
              <div class="grid grid-cols-[1fr_6rem] gap-3">
                <Campo v-model="f.endereco" rotulo="Rua" autocomplete="address-line1" />
                <Campo v-model="f.numero" rotulo="Número" inputmode="numeric" />
              </div>
              <Campo v-model="f.bairro" rotulo="Bairro" />
              <Campo v-model="f.complemento" rotulo="Complemento (opcional)" placeholder="Apto, bloco, casa" />
              <Campo v-model="f.referencia" rotulo="Ponto de referência (opcional)" />
              <label v-if="logado" class="flex items-center gap-2 text-sm">
                <input v-model="salvarEndereco" type="checkbox" class="size-4 accent-orange-500" /> Salvar este endereço na minha conta
              </label>
            </template>
          </div>

          <!-- Pagamento -->
          <p class="mt-5 text-xs font-bold cdp-mudo">Pagamento {{ f.tipo === 'entrega' ? 'na entrega' : 'na retirada' }}</p>
          <div class="mt-1.5 grid grid-cols-2 gap-2">
            <button v-for="fp in FORMAS" :key="fp.valor" type="button" class="h-11 rounded-xl border-2 text-xs font-extrabold" :class="f.formaPagamento === fp.valor ? 'border-orange-500 bg-orange-500/10' : 'cdp-linha'" @click="f.formaPagamento = fp.valor">{{ fp.rotulo }}</button>
          </div>
          <Campo v-if="f.formaPagamento === 'dinheiro'" v-model="f.trocoPara" class="mt-3" rotulo="Troco para quanto? (deixe vazio se não precisar)" inputmode="decimal" placeholder="Ex.: 100" />
          <Campo v-model="f.observacao" class="mt-3" rotulo="Observação do pedido (opcional)" />

          <!-- Resumo -->
          <dl class="mt-5 text-sm space-y-1 tabular-nums">
            <div class="flex justify-between"><dt class="cdp-mudo">Itens</dt><dd>{{ moeda(subtotal) }}</dd></div>
            <div v-if="f.tipo === 'entrega'" class="flex justify-between"><dt class="cdp-mudo">Entrega</dt><dd>{{ c.taxaEntrega ? moeda(c.taxaEntrega) : 'Grátis' }}</dd></div>
            <div class="flex justify-between text-base font-extrabold pt-1"><dt>Total</dt><dd>{{ moeda(total) }}</dd></div>
          </dl>
          <p v-if="erroEnvio" class="mt-3 text-sm text-red-600 dark:text-red-400 font-bold" role="alert">{{ erroEnvio }}</p>
        </template>

        <template #rodape>
          <button v-if="etapa === 'sacola'" class="w-full h-12 rounded-2xl cdp-ac hover:brightness-110 disabled:opacity-40 font-extrabold"
            :disabled="!qtdItens || faltaMinimo > 0 || !c.aberto" @click="etapa = 'dados'">
            {{ !c.aberto ? 'Restaurante fechado agora' : `Continuar · ${moeda(subtotal)}` }}
          </button>
          <button v-else class="w-full h-12 rounded-2xl cdp-ac hover:brightness-110 disabled:opacity-40 font-extrabold flex items-center justify-center gap-2"
            :disabled="enviando" @click="enviar">
            <Loader2 v-if="enviando" :size="18" class="animate-spin" /> Enviar pedido · {{ moeda(total) }}
          </button>
        </template>
      </Folha>

      <!-- Conta do cliente: entrar / criar conta / minha conta -->
      <Folha v-if="contaAberta" :titulo="logado ? 'Minha conta' : modoConta === 'cadastro' ? 'Criar conta' : 'Entrar'" @fechar="contaAberta = false">
        <template v-if="!logado">
          <div class="grid grid-cols-2 gap-2" role="tablist" aria-label="Entrar ou criar conta">
            <button type="button" role="tab" :aria-selected="modoConta === 'entrar'" class="h-10 rounded-xl border-2 text-sm font-extrabold" :class="modoConta === 'entrar' ? 'border-orange-500 bg-orange-500/10' : 'cdp-linha'" @click="modoConta = 'entrar'; erroConta = ''">Já tenho conta</button>
            <button type="button" role="tab" :aria-selected="modoConta === 'cadastro'" class="h-10 rounded-xl border-2 text-sm font-extrabold" :class="modoConta === 'cadastro' ? 'border-orange-500 bg-orange-500/10' : 'cdp-linha'" @click="modoConta = 'cadastro'; erroConta = ''">Criar conta</button>
          </div>
          <form class="mt-4 grid gap-3" @submit.prevent="enviarConta">
            <Campo v-if="modoConta === 'cadastro'" v-model="fc.nome" rotulo="Seu nome" autocomplete="name" />
            <Campo v-model="fc.telefone" rotulo="Celular com DDD" tipo="tel" autocomplete="tel" placeholder="(62) 9 9999-9999" @update:model-value="v => (fc.telefone = mascarar(String(v)))" />
            <Campo v-model="fc.senha" :rotulo="modoConta === 'cadastro' ? 'Crie uma senha (mín. 6 caracteres)' : 'Senha'" tipo="password" :autocomplete="modoConta === 'cadastro' ? 'new-password' : 'current-password'" />
            <p class="text-xs cdp-mudo">Sua conta vale para este restaurante. Guardamos nome, celular e endereços só para os seus pedidos; você pode apagar a conta quando quiser.</p>
            <p v-if="erroConta" class="text-sm text-red-600 dark:text-red-400 font-bold" role="alert">{{ erroConta }}</p>
            <button type="submit" class="h-12 rounded-2xl cdp-ac hover:brightness-110 disabled:opacity-40 font-extrabold flex items-center justify-center gap-2" :disabled="ocupadoConta">
              <Loader2 v-if="ocupadoConta" :size="18" class="animate-spin" /> {{ modoConta === 'cadastro' ? 'Criar conta' : 'Entrar' }}
            </button>
            <p v-if="modoConta === 'entrar'" class="text-xs cdp-mudo text-center">Esqueceu a senha? Fale com o restaurante.</p>
          </form>
        </template>

        <template v-else>
          <p class="text-sm"><b>{{ perfil.cliente.nome }}</b> · {{ mascarar(perfil.cliente.telefone) }}</p>

          <h3 class="mt-5 text-xs font-extrabold uppercase tracking-widest cdp-mudo">Endereços salvos</h3>
          <p v-if="!perfil.enderecos.length" class="mt-2 text-sm cdp-mudo">Nenhum ainda. No próximo pedido com entrega, deixe marcado "Salvar este endereço".</p>
          <div v-for="e in perfil.enderecos" :key="e.id" class="mt-2 flex items-start gap-2 rounded-xl cdp-cartao px-3 py-2.5 text-sm">
            <span class="flex-1 min-w-0"><b v-if="e.apelido">{{ e.apelido }} · </b>{{ e.endereco }}, {{ e.numero }} — {{ e.bairro }}<span v-if="e.complemento" class="block text-xs cdp-mudo">{{ e.complemento }}</span></span>
            <button type="button" class="text-xs font-extrabold text-red-600 dark:text-red-400 shrink-0" @click="removerEndereco(e.id)">Apagar</button>
          </div>

          <h3 class="mt-5 text-xs font-extrabold uppercase tracking-widest cdp-mudo">Últimos pedidos</h3>
          <p v-if="!perfil.pedidos.length" class="mt-2 text-sm cdp-mudo">Seus pedidos com a conta aparecem aqui.</p>
          <a v-for="p in perfil.pedidos" :key="p.codigo" :href="`${base}pedido/${p.codigo}`" class="mt-2 flex items-center gap-3 rounded-xl cdp-cartao px-3 py-2.5 text-sm">
            <span class="flex-1 min-w-0">
              <b class="font-mono">{{ p.codigo }}</b> · {{ dataCurta(p.criadoEm) }} · {{ STATUS_PEDIDO[p.status] ?? p.status }}
              <span class="block text-xs cdp-mudo truncate">{{ p.resumo }}</span>
            </span>
            <span class="font-extrabold tabular-nums shrink-0">{{ moeda(p.total) }}</span>
          </a>

          <button type="button" class="mt-6 w-full h-11 rounded-2xl cdp-chip text-sm font-extrabold" @click="sair">Sair da conta</button>

          <!-- LGPD: apagar a conta -->
          <details class="mt-4 text-sm">
            <summary class="cursor-pointer text-xs font-bold cdp-mudo">Apagar minha conta</summary>
            <p class="mt-2 text-xs cdp-mudo">Apaga seus dados e endereços salvos. Os pedidos já feitos continuam com o restaurante.</p>
            <div class="mt-2 flex gap-2">
              <input v-model="senhaApagar" type="password" autocomplete="current-password" placeholder="Sua senha" aria-label="Senha para apagar a conta" class="flex-1 min-w-0 h-11 px-3 rounded-xl cdp-campo text-sm" />
              <button type="button" class="h-11 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-extrabold" :disabled="!senhaApagar || apagando" @click="apagarConta">Apagar</button>
            </div>
            <p v-if="erroConta" class="mt-2 text-sm text-red-600 dark:text-red-400 font-bold" role="alert">{{ erroConta }}</p>
          </details>
        </template>
      </Folha>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick, defineComponent, h } from 'vue'
import { Search, Plus, Minus, ShoppingBag, UtensilsCrossed, ChevronRight, X, Loader2, UserRound, List, LayoutGrid, Clock, Bike, LogIn, ChevronLeft } from 'lucide-vue-next'
import ProdutoFoto from '~/components/ProdutoFoto.vue'
import { useTemaDoAparelho } from '~/composables/useTemaDoAparelho'

definePageMeta({ layout: false })
useHead({
  title: 'Cardápio',
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&display=swap' },
  ],
})
useTemaDoAparelho()

const route = useRoute()
const slug = String(route.params.slug || '')
const config = useRuntimeConfig()
const api = (p: string, o: any = {}) => $fetch<any>(`${config.public.apiUrl}/api/publico${p}`, o)
const base = config.app.baseURL

const moeda = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
// Crédito e débito separados: o pagamento entra certo no caixa e no fechamento das maquininhas
const FORMAS = [{ valor: 'pix', rotulo: 'Pix' }, { valor: 'credito', rotulo: 'Cartão de crédito' }, { valor: 'debito', rotulo: 'Cartão de débito' }, { valor: 'dinheiro', rotulo: 'Dinheiro' }] as const

// ── Pecinhas de interface ──
const Folha = defineComponent({
  props: { titulo: String, lateral: Boolean },
  emits: ['fechar'],
  setup(p, { slots, emit }) {
    // Lateral (sacola no computador): painel à direita, sem escurecer a página
    const fora = p.lateral
      ? 'fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50 lg:inset-auto lg:right-5 lg:top-5 lg:bottom-5 lg:w-[364px] lg:bg-transparent lg:items-stretch lg:justify-end lg:pointer-events-none'
      : 'fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/50'
    const dentro = p.lateral
      ? 'cdp-fundo w-full sm:max-w-lg max-h-[92dvh] rounded-t-3xl sm:rounded-3xl flex flex-col lg:max-w-none lg:max-h-none lg:h-full lg:rounded-3xl lg:border cdp-linha lg:pointer-events-auto'
      : 'cdp-fundo w-full sm:max-w-lg max-h-[92dvh] rounded-t-3xl sm:rounded-3xl flex flex-col'
    return () => h('div', { class: fora, onClick: (e: MouseEvent) => e.target === e.currentTarget && emit('fechar') }, [
      h('div', { class: dentro, role: 'dialog', 'aria-modal': 'true', 'aria-label': p.titulo }, [
        h('div', { class: 'flex items-center justify-between px-5 pt-5 pb-3' }, [
          h('h2', { class: 'text-lg font-extrabold' }, p.titulo),
          h('button', { class: 'size-9 rounded-full cdp-chip flex items-center justify-center', 'aria-label': 'Fechar', onClick: () => emit('fechar') }, [h(X, { size: 18 })]),
        ]),
        h('div', { class: 'flex-1 overflow-y-auto px-5 pb-4' }, slots.default?.()),
        slots.rodape ? h('div', { class: 'px-5 py-4 border-t cdp-linha' }, slots.rodape()) : null,
      ]),
    ])
  },
})
const Stepper = defineComponent({
  props: { modelValue: { type: Number, required: true }, min: { type: Number, default: 1 }, pequeno: Boolean },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    const t = () => (p.pequeno ? 'size-8' : 'size-12')
    return () => h('div', { class: 'flex items-center gap-1 rounded-2xl cdp-chip p-1' }, [
      h('button', { type: 'button', class: `${t()} rounded-xl flex items-center justify-center`, 'aria-label': 'Menos', onClick: () => emit('update:modelValue', Math.max(p.min, p.modelValue - 1)) }, [h(Minus, { size: 16 })]),
      h('span', { class: 'w-7 text-center font-extrabold tabular-nums', 'aria-live': 'polite' }, String(p.modelValue)),
      h('button', { type: 'button', class: `${t()} rounded-xl flex items-center justify-center`, 'aria-label': 'Mais', onClick: () => emit('update:modelValue', Math.min(99, p.modelValue + 1)) }, [h(Plus, { size: 16 })]),
    ])
  },
})
// Botão + do cartão; com o item na sacola vira − quantidade +
const Controle = defineComponent({
  props: { qtd: { type: Number, required: true }, nome: String },
  emits: ['mais', 'menos'],
  setup(p, { emit }) {
    const mais = (cls: string) => h('button', { type: 'button', class: cls, 'aria-label': p.qtd ? `Mais um ${p.nome}` : `Adicionar ${p.nome}`, onClick: () => emit('mais') }, [h(Plus, { size: p.qtd ? 16 : 20, 'stroke-width': 2.5 })])
    return () => p.qtd
      ? h('div', { class: 'flex items-center shrink-0 rounded-full cdp-chip p-[3px]' }, [
          h('button', { type: 'button', class: 'size-8 rounded-full grid place-items-center cdp-mudo', 'aria-label': `Menos um ${p.nome}`, onClick: () => emit('menos') }, [h(Minus, { size: 16, 'stroke-width': 2.5 })]),
          h('b', { class: 'min-w-[26px] text-center font-extrabold tabular-nums', 'aria-live': 'polite' }, String(p.qtd)),
          mais('size-8 rounded-full grid place-items-center cdp-ac'),
        ])
      : mais('size-[38px] shrink-0 rounded-full grid place-items-center cdp-ac active:scale-90 transition-transform')
  },
})
const Campo = defineComponent({
  props: { modelValue: [String, Number], rotulo: String, tipo: { type: String, default: 'text' }, placeholder: String, autocomplete: String, inputmode: String },
  emits: ['update:modelValue'],
  setup(p, { emit }) {
    return () => h('label', { class: 'block' }, [
      h('span', { class: 'text-xs font-bold cdp-mudo' }, p.rotulo),
      h('input', {
        class: 'mt-1 w-full h-11 px-3 rounded-xl cdp-campo text-sm', value: p.modelValue ?? '', type: p.tipo,
        placeholder: p.placeholder, autocomplete: p.autocomplete, inputmode: p.inputmode,
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
      }),
    ])
  },
})

// ── Cardápio ──
const c = ref<any>(null)
const carregando = ref(true)
const erro = ref('')
const busca = ref('')
// Lista ou grade: a escolha fica no aparelho
const vista = ref<'lista' | 'grade'>('lista')
function mudarVista(v: 'lista' | 'grade') { vista.value = v; try { localStorage.setItem('cardapio:vista', v) } catch {} }
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
// Chip de categoria: Todos (null) ou só a escolhida
const catAtiva = ref<string | null>(null)
const filtradas = computed(() => {
  if (!c.value) return []
  const q = semAcento(busca.value.trim())
  if (!q) return catAtiva.value ? c.value.categorias.filter((cat: any) => cat.id === catAtiva.value) : c.value.categorias
  return c.value.categorias
    .filter((cat: any) => !catAtiva.value || cat.id === catAtiva.value)
    .map((cat: any) => ({ ...cat, produtos: cat.produtos.filter((p: any) => semAcento(`${p.nome} ${p.descricao ?? ''}`).includes(q)) }))
    .filter((cat: any) => cat.produtos.length)
})
// Uma categoria só: ocupa a largura toda
const unica = computed(() => filtradas.value.length === 1)

// Chips e colunas: arrastar com o mouse; a rodinha vertical vira rolagem lateral
const chipsEl = ref<HTMLElement | null>(null)
const boardEl = ref<HTMLElement | null>(null)
const setasChips = ref(false)
const arrastando = ref(false)
function medirChips() { const el = chipsEl.value; setasChips.value = !!el && el.scrollWidth > el.clientWidth + 2 }
function rolarChips(d: number) { chipsEl.value?.scrollBy({ left: d * 260, behavior: 'smooth' }) }
function escolherCat(id: string | null) {
  catAtiva.value = id
  nextTick(() => { if (boardEl.value) boardEl.value.scrollLeft = 0 })
}
function arrastavel(el: HTMLElement, marcar = false, rodinha: () => boolean = () => true) {
  let x0 = 0, s0 = 0, ativo = false, moveu = false
  el.addEventListener('wheel', (e) => {
    if (el.scrollWidth > el.clientWidth && rodinha() && Math.abs(e.deltaY) > Math.abs(e.deltaX)) { el.scrollLeft += e.deltaY; e.preventDefault() }
  }, { passive: false })
  el.addEventListener('mousedown', (e) => { if (e.button !== 0) return; ativo = true; moveu = false; x0 = e.clientX; s0 = el.scrollLeft })
  window.addEventListener('mousemove', (e) => {
    if (!ativo) return
    const d = e.clientX - x0
    if (!moveu && Math.abs(d) > 5) { moveu = true; if (marcar) arrastando.value = true; el.style.scrollBehavior = 'auto' }
    if (moveu) el.scrollLeft = s0 - d
  })
  window.addEventListener('mouseup', () => { if (!ativo) return; ativo = false; if (marcar) arrastando.value = false; el.style.scrollBehavior = '' })
  // Soltar depois de arrastar não conta como clique no produto
  el.addEventListener('click', (e) => { if (moveu) { e.stopPropagation(); e.preventDefault(); moveu = false } }, true)
  el.addEventListener('dragstart', e => e.preventDefault())
}
// Nas colunas, a rodinha só desliza para o lado quando a página não tem rolagem vertical
const paginaSemRolagem = () => document.documentElement.scrollHeight <= document.documentElement.clientHeight + 1
watch(chipsEl, (el) => { if (el) { arrastavel(el); nextTick(medirChips) } })
watch(boardEl, (el) => { if (el) arrastavel(el, true, paginaSemRolagem) })
watch(() => c.value?.categorias?.length, () => nextTick(medirChips))
onMounted(() => window.addEventListener('resize', medirChips))
onBeforeUnmount(() => window.removeEventListener('resize', medirChips))

// ── Sacola (guardada no aparelho por restaurante) ──
interface ItemSacola { produtoId: string; nome: string; preco: number; quantidade: number; observacao: string }
const CHAVE = `cardapio:${slug}`
const carrinho = ref<ItemSacola[]>([])
const qtdItens = computed(() => carrinho.value.reduce((s, i) => s + i.quantidade, 0))
const subtotal = computed(() => carrinho.value.reduce((s, i) => s + i.preco * i.quantidade, 0))
const noCarrinho = (id: string) => carrinho.value.filter(i => i.produtoId === id).reduce((s, i) => s + i.quantidade, 0)
const faltaMinimo = computed(() => Math.max(0, (c.value?.pedidoMinimo ?? 0) - subtotal.value))
watch(carrinho, (v) => { try { localStorage.setItem(CHAVE, JSON.stringify(v)) } catch {} }, { deep: true })

const produto = ref<any>(null)
const qtdProduto = ref(1)
const obsProduto = ref('')
// + no cartão: soma direto na sacola (sem observação); a observação fica no detalhe do produto
function somar(p: any) {
  const i = carrinho.value.find(x => x.produtoId === p.id && !x.observacao)
  if (i) i.quantidade = Math.min(99, i.quantidade + 1)
  else carrinho.value.push({ produtoId: p.id, nome: p.nome, preco: p.preco, quantidade: 1, observacao: '' })
}
function menosItem(idx: number) {
  const i = carrinho.value[idx]
  if (--i.quantidade <= 0) carrinho.value.splice(idx, 1)
}
function tirar(id: string) {
  const idx = carrinho.value.map(x => x.produtoId).lastIndexOf(id)
  if (idx >= 0) menosItem(idx)
}
function abrirProduto(p: any) { produto.value = p; qtdProduto.value = 1; obsProduto.value = '' }
function adicionar() {
  const p = produto.value
  const obs = obsProduto.value.trim()
  const igual = carrinho.value.find(i => i.produtoId === p.id && i.observacao === obs)
  if (igual) igual.quantidade = Math.min(99, igual.quantidade + qtdProduto.value)
  else carrinho.value.push({ produtoId: p.id, nome: p.nome, preco: p.preco, quantidade: qtdProduto.value, observacao: obs })
  produto.value = null
}

// ── Finalização ──
const etapa = ref<null | 'sacola' | 'dados'>(null)
const f = reactive({
  tipo: 'entrega' as 'entrega' | 'retirada', clienteNome: '', clienteTelefone: '', endereco: '', numero: '', bairro: '',
  complemento: '', referencia: '', formaPagamento: 'pix' as 'pix' | 'credito' | 'debito' | 'dinheiro', trocoPara: '', observacao: '',
})
const total = computed(() => subtotal.value + (f.tipo === 'entrega' ? c.value?.taxaEntrega ?? 0 : 0))
function mascararTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  f.clienteTelefone = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d
}
const enviando = ref(false)
const erroEnvio = ref('')
const ultimoPedido = ref<string | null>(null)

// ── Conta do cliente (celular + senha, deste restaurante) ──
const CHAVE_CONTA = `${CHAVE}:conta`
const token = ref<string | null>(null)
const perfil = ref<any>(null)
const logado = computed(() => Boolean(token.value && perfil.value))
const comToken = (o: any = {}) => (token.value ? { ...o, headers: { ...(o.headers ?? {}), Authorization: `Bearer ${token.value}` } } : o)
const contaAberta = ref(false)
const modoConta = ref<'entrar' | 'cadastro'>('entrar')
const fc = reactive({ nome: '', telefone: '', senha: '' })
const erroConta = ref('')
const ocupadoConta = ref(false)
const senhaApagar = ref('')
const apagando = ref(false)

function mascarar(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  return d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d
}
function guardarToken(t: string | null) {
  token.value = t
  try { t ? localStorage.setItem(CHAVE_CONTA, t) : localStorage.removeItem(CHAVE_CONTA) } catch {}
}
async function carregarPerfil() {
  if (!token.value) return
  try {
    perfil.value = await api(`/cardapio/${encodeURIComponent(slug)}/conta`, comToken())
    // Logado: nome e celular vêm da conta
    f.clienteNome = perfil.value.cliente.nome
    f.clienteTelefone = mascarar(perfil.value.cliente.telefone)
  } catch (e: any) {
    if (e?.status === 401 || e?.statusCode === 401) { guardarToken(null); perfil.value = null }
  }
}
function abrirConta(modo: 'entrar' | 'cadastro' = 'entrar') {
  modoConta.value = modo; erroConta.value = ''; senhaApagar.value = ''
  fc.senha = ''
  if (!fc.telefone && f.clienteTelefone) fc.telefone = f.clienteTelefone
  if (!fc.nome && f.clienteNome) fc.nome = f.clienteNome
  contaAberta.value = true
}
async function enviarConta() {
  erroConta.value = ''
  if (fc.telefone.replace(/\D/g, '').length < 10) { erroConta.value = 'Informe o celular com DDD'; return }
  if (modoConta.value === 'cadastro' && fc.nome.trim().length < 2) { erroConta.value = 'Informe seu nome'; return }
  if (modoConta.value === 'cadastro' && fc.senha.length < 6) { erroConta.value = 'A senha precisa de pelo menos 6 caracteres'; return }
  ocupadoConta.value = true
  try {
    const r = await api(`/cardapio/${encodeURIComponent(slug)}/conta/${modoConta.value === 'cadastro' ? 'cadastro' : 'entrar'}`, {
      method: 'POST', body: modoConta.value === 'cadastro' ? { nome: fc.nome, telefone: fc.telefone, senha: fc.senha } : { telefone: fc.telefone, senha: fc.senha },
    })
    guardarToken(r.token)
    await carregarPerfil()
    fc.senha = ''
    contaAberta.value = false
  } catch (e: any) {
    erroConta.value = e?.data?.error || 'Não deu certo. Tente de novo.'
  } finally { ocupadoConta.value = false }
}
function sair() { guardarToken(null); perfil.value = null; enderecoEscolhido.value = 'novo'; contaAberta.value = false }
async function removerEndereco(id: string) {
  try {
    await api(`/cardapio/${encodeURIComponent(slug)}/conta/enderecos/${id}`, comToken({ method: 'DELETE' }))
    perfil.value.enderecos = perfil.value.enderecos.filter((e: any) => e.id !== id)
    if (enderecoEscolhido.value === id) enderecoEscolhido.value = 'novo'
  } catch {}
}
async function apagarConta() {
  erroConta.value = ''
  apagando.value = true
  try {
    await api(`/cardapio/${encodeURIComponent(slug)}/conta/apagar`, comToken({ method: 'POST', body: { senha: senhaApagar.value } }))
    sair()
  } catch (e: any) { erroConta.value = e?.data?.error || 'Não deu para apagar a conta' }
  finally { apagando.value = false }
}

// Endereço da entrega: um salvo na conta ou um novo (que pode ser salvo)
const enderecoEscolhido = ref<string>('novo')
const salvarEndereco = ref(true)
function usarEndereco(id: string) {
  enderecoEscolhido.value = id
  const e = perfil.value?.enderecos.find((x: any) => x.id === id)
  if (e) Object.assign(f, { endereco: e.endereco, numero: e.numero, bairro: e.bairro, complemento: e.complemento ?? '', referencia: e.referencia ?? '' })
  else Object.assign(f, { endereco: '', numero: '', bairro: '', complemento: '', referencia: '' })
}
const STATUS_PEDIDO: Record<string, string> = { recebido: 'Aguardando', aceito: 'Em preparo', pronto: 'Pronto', em_rota: 'A caminho', entregue: 'Entregue', recusado: 'Não aceito', cancelado: 'Cancelado' }
const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

async function enviar() {
  erroEnvio.value = ''
  if (f.clienteNome.trim().length < 2) { erroEnvio.value = 'Informe seu nome'; return }
  if (f.clienteTelefone.replace(/\D/g, '').length < 10) { erroEnvio.value = 'Informe o celular com DDD'; return }
  if (f.tipo === 'entrega' && (!f.endereco.trim() || !f.numero.trim() || !f.bairro.trim())) { erroEnvio.value = 'Informe rua, número e bairro'; return }
  const troco = f.formaPagamento === 'dinheiro' && f.trocoPara.trim() ? Number(f.trocoPara.replace(',', '.')) : null
  if (troco !== null && (!Number.isFinite(troco) || troco < total.value)) { erroEnvio.value = `O troco precisa ser para um valor acima de ${moeda(total.value)}`; return }
  enviando.value = true
  try {
    const r = await api(`/cardapio/${encodeURIComponent(slug)}/pedidos`, comToken({
      method: 'POST',
      body: {
        ...f, trocoPara: troco,
        // Logado com endereço novo: guarda na conta se ele deixou marcado
        ...(logado.value && f.tipo === 'entrega' && enderecoEscolhido.value === 'novo' ? { salvarEndereco: salvarEndereco.value } : {}),
        itens: carrinho.value.map(i => ({ produtoId: i.produtoId, quantidade: i.quantidade, ...(i.observacao ? { observacao: i.observacao } : {}) })),
      },
    }))
    try {
      localStorage.removeItem(CHAVE)
      localStorage.setItem(`${CHAVE}:ultimo`, r.codigo)
    } catch {}
    carrinho.value = []
    navigateTo(`/pedido/${r.codigo}`)
  } catch (e: any) {
    erroEnvio.value = e?.data?.error || 'Não deu para enviar. Confira a conexão e tente de novo.'
  } finally {
    enviando.value = false
  }
}

onMounted(async () => {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || '[]')
    if (Array.isArray(salvo)) carrinho.value = salvo
    ultimoPedido.value = localStorage.getItem(`${CHAVE}:ultimo`)
    token.value = localStorage.getItem(CHAVE_CONTA)
    if (localStorage.getItem('cardapio:vista') === 'grade') vista.value = 'grade'
  } catch {}
  // Conta: traz nome, celular e endereços salvos (token vencido sai sozinho)
  carregarPerfil().then(() => {
    const primeiro = perfil.value?.enderecos?.[0]
    if (primeiro) usarEndereco(primeiro.id)
  })
  try {
    c.value = await api(`/cardapio/${encodeURIComponent(slug)}`)
    useHead({ title: `${c.value.restaurante.nome} · Cardápio` })
    if (!c.value.entrega) f.tipo = 'retirada'
    else if (!c.value.retirada) f.tipo = 'entrega'
    // Itens que saíram do cardápio somem da sacola salva
    const ativos = new Map(c.value.categorias.flatMap((cat: any) => cat.produtos).filter((p: any) => !p.esgotado).map((p: any) => [p.id, p]))
    carrinho.value = carrinho.value.filter(i => ativos.has(i.produtoId)).map(i => ({ ...i, preco: (ativos.get(i.produtoId) as any).preco }))
  } catch (e: any) {
    erro.value = e?.data?.error || 'Confira o link com o restaurante.'
  } finally {
    carregando.value = false
  }
})
</script>

<style>
/* Global (prefixo .cdp): as folhas são componentes de render function e não recebem o atributo do scoped */
.cdp-ativo { background: var(--cdp-txt); color: var(--cdp-fundo); }
.cdp { background: var(--cdp-fundo); color: var(--cdp-txt); font: 400 15px/1.45 'Bricolage Grotesque', system-ui, sans-serif; }
.cdp :focus-visible { outline: 2px solid var(--cdp-ac); outline-offset: 2px; }
.cdp-ac { background: var(--cdp-ac); color: var(--cdp-acx); }
.cdp-ac-inv { background: var(--cdp-acx); color: var(--cdp-ac); }
.cdp-ok { color: var(--cdp-ok); }
.cdp-ponto { background: var(--cdp-ok); box-shadow: 0 0 0 4px color-mix(in srgb, var(--cdp-ok) 22%, transparent); }
.cdp-chip-on { background: var(--cdp-txt); color: var(--cdp-fundo); border-color: var(--cdp-txt); }
.cdp-entrou { background: var(--cdp-cartao); border-color: var(--cdp-ac); color: var(--cdp-ac); }
.cdp-busca { background: var(--cdp-cartao); border: 1px solid var(--cdp-linha); }
.cdp-busca:focus-within { border-color: var(--cdp-ac); }
.cdp-thumb { background-image: linear-gradient(145deg, var(--cdp-chip), color-mix(in srgb, var(--cdp-ac) 24%, var(--cdp-chip))); color: var(--cdp-ac) !important; }
.cdp-arrastando { cursor: grabbing; scroll-snap-type: none; user-select: none; }
.cdp-arrastando * { cursor: grabbing !important; }
.cdp-fundo { background: var(--cdp-fundo); color: var(--cdp-txt); }
.cdp-barra { background: color-mix(in srgb, var(--cdp-fundo) 88%, transparent); }
.cdp-cartao { background: var(--cdp-cartao); border: 1px solid var(--cdp-linha); }
.cdp-campo { background: var(--cdp-cartao); border: 1px solid var(--cdp-linha); color: var(--cdp-txt); outline: none; }
.cdp-campo:focus { border-color: var(--cdp-ac); }
.cdp-chip { background: var(--cdp-chip); color: var(--cdp-txt); }
.cdp-linha { border-color: var(--cdp-linha); }
.cdp-mudo { color: var(--cdp-mudo); }
.cdp-skel { background: var(--cdp-chip); animation: pulse 1.4s ease-in-out infinite; }
/* Barra de rolagem fina e visível sob as colunas */
.cdp-rolagem { scrollbar-width: thin; scrollbar-color: var(--cdp-mudo) var(--cdp-chip); }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { scrollbar-width: none; }
</style>

<style>
/* Tokens do cardápio: seguem o tema do aparelho do cliente (useTemaDoAparelho) */
:root { --cdp-fundo: #f7f4ef; --cdp-cartao: #ffffff; --cdp-chip: #efebe4; --cdp-linha: #e2ddd3; --cdp-txt: #1b1812; --cdp-mudo: #6c6759; --cdp-ac: #e8550a; --cdp-acx: #ffffff; --cdp-ok: #0f9d6a; }
html.dark { --cdp-fundo: #0d1017; --cdp-cartao: #161a24; --cdp-chip: #1e2330; --cdp-linha: #272d3c; --cdp-txt: #f4f0ea; --cdp-mudo: #9aa2b5; --cdp-ac: #ff6a1a; --cdp-acx: #1a0c03; --cdp-ok: #34d399; }
</style>
