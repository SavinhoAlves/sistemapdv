<template>
  <div class="min-h-screen transition-colors duration-200 com-sidebar">
    <Sidebar />
    <Navbar />

    <main class="max-w-6xl mx-auto px-6 py-8">

      <!-- HEADER -->
      <div class="flex items-center gap-3 mb-7">
        <div class="w-1 h-8 bg-orange-500 rounded-full shrink-0"></div>
        <div>
          <h1 class="text-2xl font-black text-gray-900 dark:text-white">Configurações</h1>
          <p class="text-sm text-gray-500 dark:text-white/50 mt-0.5">Personalize o sistema e as fichas impressas</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        <!-- ══ COLUNA ESQUERDA: formulário ══ -->
        <div class="lg:col-span-2 space-y-6">

          <!-- ══ CARD: IDENTIDADE ══ -->
          <div class="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06] flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <UtensilsCrossed :size="14" class="text-orange-500" />
              </div>
              <div>
                <h2 class="text-sm font-black text-gray-900 dark:text-white">Identidade</h2>
                <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Nome e logotipo exibidos nas fichas impressas</p>
              </div>
            </div>

            <div class="p-6 space-y-6">

              <!-- NOME DO ESTABELECIMENTO -->
              <div>
                <label for="nome-restaurante" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
                  Nome do estabelecimento
                </label>
                <input
                  id="nome-restaurante" v-model="form.nome_restaurante"
                  type="text" maxlength="100" placeholder="Ex: Restaurante do Chef"
                  class="w-full h-12 px-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white font-bold text-sm outline-none focus:border-orange-500/70 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25"
                />
              </div>

              <!-- LOGOTIPO -->
              <div class="border-t border-gray-100 dark:border-white/[0.06] pt-6">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-4">Logotipo</label>
                <div class="flex items-center gap-5">

                  <!-- Preview -->
                  <div class="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-300 dark:border-white/20 flex items-center justify-center shrink-0 overflow-hidden bg-gray-50 dark:bg-white/[0.04] transition-colors">
                    <img v-if="form.logo_base64" :src="form.logo_base64" class="w-full h-full object-contain p-2" alt="Logo" />
                    <div v-else class="flex flex-col items-center gap-1.5 text-gray-400 dark:text-white/25">
                      <ImageIcon :size="28" />
                      <span class="text-[10px] font-bold">Sem logo</span>
                    </div>
                  </div>

                  <!-- Ações -->
                  <div class="flex flex-col gap-2.5 flex-1">
                    <button @click="inputLogoRef?.click()"
                      class="h-10 px-5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-black transition-all active:scale-95 flex items-center gap-2 w-fit">
                      <Upload :size="13" />
                      {{ form.logo_base64 ? 'Trocar logo' : 'Enviar logo' }}
                    </button>
                    <button v-if="form.logo_base64" @click="form.logo_base64 = null"
                      class="h-10 px-5 rounded-xl border border-red-500/30 text-red-400 text-xs font-black hover:bg-red-500/10 transition-all flex items-center gap-2 w-fit">
                      <Trash2 :size="13" />
                      Remover logo
                    </button>
                    <p class="text-[11px] text-gray-400 dark:text-white/35 leading-relaxed">
                      PNG, JPG ou WebP · máx. 1 MB<br>
                      Recomendado: 200×200 px, fundo transparente
                    </p>
                    <input id="input-logo" name="input-logo" ref="inputLogoRef" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" aria-label="Enviar logo" @change="onLogoChange" />
                  </div>
                </div>
              </div>

              <!-- TAMANHO NA IMPRESSÃO (só com logo) -->
              <Transition name="slide-down-mp">
                <div v-if="form.logo_base64" class="border-t border-gray-100 dark:border-white/[0.06] pt-6">
                  <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-3">
                    Tamanho na impressão
                  </label>
                  <div class="grid grid-cols-4 gap-2">
                    <button v-for="op in tamanhoLogos" :key="op.value"
                      @click="form.logo_tamanho = op.value as typeof form.logo_tamanho"
                      class="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all"
                      :class="form.logo_tamanho === op.value
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'"
                    >
                      <div class="flex items-end justify-center" style="height:26px">
                        <template v-if="op.value === 'personalizado'">
                          <Ruler :size="18" :class="form.logo_tamanho === op.value ? 'text-orange-400' : 'text-gray-300 dark:text-white/20'" />
                        </template>
                        <template v-else>
                          <div class="rounded bg-current"
                            :style="{ width: op.w, height: op.h }"
                            :class="form.logo_tamanho === op.value ? 'text-orange-400' : 'text-gray-300 dark:text-white/20'" />
                        </template>
                      </div>
                      <p class="text-[11px] font-black"
                        :class="form.logo_tamanho === op.value ? 'text-orange-400' : 'text-gray-500 dark:text-white/40'">
                        {{ op.label }}
                      </p>
                    </button>
                  </div>

                  <!-- Altura personalizada -->
                  <Transition name="slide-down-mp">
                    <div v-if="form.logo_tamanho === 'personalizado'" class="mt-4">
                      <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
                        Altura em pixels
                      </label>
                      <div class="flex items-center gap-3 max-w-xs">
                        <input
                          v-model.number="form.logo_altura_custom"
                          type="number" min="50" max="600" step="10"
                          class="flex-1 h-10 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-sm font-mono outline-none focus:border-orange-500/70 transition-all"
                        />
                        <span class="text-sm font-black text-gray-400 dark:text-white/40">px</span>
                      </div>
                      <p class="text-[10px] text-gray-400 dark:text-white/35 mt-1.5">Mínimo: 50 px · Máximo: 600 px - (Tamanho recomendado: 250 px)</p>
                    </div>
                  </Transition>
                </div>
              </Transition>

            </div>
          </div>

          <!-- ══ CARD: MODO DE OPERAÇÃO ══ -->
          <div class="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06] flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <LayoutGrid :size="14" class="text-orange-500" />
              </div>
              <div>
                <h2 class="text-sm font-black text-gray-900 dark:text-white">Modo de operação</h2>
                <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Selecione um ou ambos os modos de venda disponíveis</p>
              </div>
            </div>
            <div class="p-6">
              <div class="grid grid-cols-2 gap-4">

                <!-- Opção: Mesas -->
                <button
                  @click="toggleModo('mesas')"
                  class="flex flex-col items-start gap-3 p-5 rounded-2xl border-2 transition-all text-left"
                  :class="modoAtivo('mesas')
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'"
                >
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    :class="modoAtivo('mesas') ? 'bg-orange-500/20' : 'bg-gray-100 dark:bg-white/[0.06]'">
                    <LayoutGrid :size="18"
                      :class="modoAtivo('mesas') ? 'text-orange-500' : 'text-gray-400 dark:text-white/40'" />
                  </div>
                  <div>
                    <p class="text-sm font-black"
                      :class="modoAtivo('mesas') ? 'text-orange-500' : 'text-gray-700 dark:text-white/80'">
                      Mesas
                    </p>
                    <p class="text-[11px] leading-snug mt-1"
                      :class="modoAtivo('mesas') ? 'text-orange-400/80' : 'text-gray-400 dark:text-white/40'">
                      Abertura de mesa, pedidos individuais e fechamento de conta
                    </p>
                  </div>
                  <div v-if="modoAtivo('mesas')"
                    class="flex items-center gap-1.5 text-[10px] font-black text-orange-500 uppercase tracking-wider">
                    <CheckCircle :size="11" />
                    Ativo
                  </div>
                </button>

                <!-- Opção: Venda Direta -->
                <button
                  @click="toggleModo('direta')"
                  class="flex flex-col items-start gap-3 p-5 rounded-2xl border-2 transition-all text-left"
                  :class="modoAtivo('direta')
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'"
                >
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    :class="modoAtivo('direta') ? 'bg-orange-500/20' : 'bg-gray-100 dark:bg-white/[0.06]'">
                    <Receipt :size="18"
                      :class="modoAtivo('direta') ? 'text-orange-500' : 'text-gray-400 dark:text-white/40'" />
                  </div>
                  <div>
                    <p class="text-sm font-black"
                      :class="modoAtivo('direta') ? 'text-orange-500' : 'text-gray-700 dark:text-white/80'">
                      Venda direta
                    </p>
                    <p class="text-[11px] leading-snug mt-1"
                      :class="modoAtivo('direta') ? 'text-orange-400/80' : 'text-gray-400 dark:text-white/40'">
                      Ficha por produto, sem abertura de mesas — ideal para bares e lanchonetes
                    </p>
                  </div>
                  <div v-if="modoAtivo('direta')"
                    class="flex items-center gap-1.5 text-[10px] font-black text-orange-500 uppercase tracking-wider">
                    <CheckCircle :size="11" />
                    Ativo
                  </div>
                </button>

              </div>
              <p v-if="form.modo_venda === 'ambos'" class="mt-3 text-[11px] text-orange-500/80 font-bold flex items-center gap-1.5">
                <CheckCircle :size="12" />
                Ambos os modos ativos — o operador escolhe ao iniciar a venda
              </p>
            </div>
          </div>

          <!-- ══ CARD: FICHAS ══ -->
          <div class="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06] flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                <FileText :size="14" class="text-blue-500" />
              </div>
              <div>
                <h2 class="text-sm font-black text-gray-900 dark:text-white">Fichas</h2>
                <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Texto exibido ao final de cada ficha impressa</p>
              </div>
            </div>
            <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label for="mensagem-ficha" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
                  Mensagem de rodapé
                </label>
                <input
                  id="mensagem-ficha" v-model="form.mensagem_ficha"
                  type="text" maxlength="200" placeholder="Ex: Obrigado pela preferência!"
                  class="w-full h-12 px-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white font-bold text-sm outline-none focus:border-orange-500/70 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25"
                />
              </div>
              <div>
                <label for="taxa-servico" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
                  Taxa de serviço (%)
                </label>
                <input
                  id="taxa-servico" name="taxa-servico" v-model.number="form.taxa_servico_pct"
                  type="number" min="0" max="30" step="0.5" placeholder="10"
                  class="w-full h-12 px-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white font-bold text-sm outline-none focus:border-orange-500/70 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25"
                />
                <p class="text-[10px] text-gray-500 dark:text-white/40 mt-1.5">Percentual sugerido ao aplicar a taxa na conta da mesa (opcional para o cliente).</p>
              </div>
            </div>
          </div>

          <!-- ══ CARD: IMPRESSORA ══ -->
          <div class="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06] flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <Printer :size="14" class="text-purple-500" />
              </div>
              <div>
                <h2 class="text-sm font-black text-gray-900 dark:text-white">Impressora</h2>
                <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Configurações de impressão das fichas</p>
              </div>
            </div>

            <div class="p-6 space-y-6">

              <!-- LARGURA DO PAPEL + CÓPIAS lado a lado -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">

                <!-- LARGURA DO PAPEL -->
                <div>
                  <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-3">
                    Largura do papel
                  </label>
                  <div class="grid grid-cols-2 gap-3">
                    <button
                      v-for="op in larguras" :key="op.value"
                      @click="form.impressora_largura = op.value"
                      class="flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left"
                      :class="form.impressora_largura === op.value
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 text-gray-600 dark:text-white/80'"
                    >
                      <div class="shrink-0 flex items-end gap-0.5 h-8">
                        <div class="bg-current rounded-sm w-1"
                          :style="{ height: op.value === 58 ? '60%' : '100%' }"
                          :class="form.impressora_largura === op.value ? 'text-orange-500' : 'text-gray-300 dark:text-white/20'"
                        />
                        <div class="bg-current rounded-sm"
                          :style="{ width: op.value === 58 ? '18px' : '26px', height: '100%' }"
                          :class="form.impressora_largura === op.value ? 'text-orange-400' : 'text-gray-200 dark:text-white/10'"
                        />
                      </div>
                      <div>
                        <p class="text-sm font-black"
                          :class="form.impressora_largura === op.value ? 'text-orange-400' : 'text-gray-600 dark:text-white/80'">
                          {{ op.label }}
                        </p>
                        <p class="text-[10px] text-gray-400 dark:text-white/40 mt-0.5">{{ op.desc }}</p>
                      </div>
                    </button>
                  </div>
                </div>

                <!-- CÓPIAS -->
                <div>
                  <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-3">
                    Cópias por ficha
                  </label>
                  <div class="flex items-center gap-3">
                    <button @click="form.impressora_copias = Math.max(1, form.impressora_copias - 1)"
                      class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 font-black text-gray-500 dark:text-white/60">
                      <Minus :size="14" />
                    </button>
                    <div class="flex-1 h-12 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] flex items-center justify-center">
                      <span class="text-2xl font-black text-gray-900 dark:text-white">{{ form.impressora_copias }}</span>
                    </div>
                    <button @click="form.impressora_copias = Math.min(5, form.impressora_copias + 1)"
                      class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 flex items-center justify-center transition-all active:scale-95 font-black text-gray-500 dark:text-white/60">
                      <Plus :size="14" />
                    </button>
                  </div>
                  <p class="text-xs text-gray-400 dark:text-white/40 mt-2">
                    {{ form.impressora_copias === 1 ? '1 via por produto' : `${form.impressora_copias} vias por produto` }}
                  </p>
                </div>

              </div>

              <!-- AUTO-IMPRIMIR -->
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-sm font-black text-gray-900 dark:text-white">Imprimir automaticamente</p>
                  <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Abre a impressão assim que a venda é confirmada, sem precisar clicar em "Imprimir"</p>
                </div>
                <button
                  @click="form.impressora_auto_imprimir = !form.impressora_auto_imprimir"
                  class="shrink-0 w-12 h-6 rounded-full transition-all relative"
                  :class="form.impressora_auto_imprimir ? 'bg-orange-500' : 'bg-gray-200 dark:bg-white/10'"
                >
                  <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                    :class="form.impressora_auto_imprimir ? 'left-[26px]' : 'left-0.5'" />
                </button>
              </div>

              <!-- CONEXÃO DA IMPRESSORA (ESC/POS) -->
              <div class="border-t border-gray-100 dark:border-white/[0.06] pt-6">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-3">
                  Conexão da impressora térmica
                </label>
                <div class="grid grid-cols-3 gap-3 mb-4">
                  <button v-for="op in tiposImpressora" :key="op.value"
                    @click="form.impressora_tipo = op.value"
                    class="p-3 rounded-2xl border-2 transition-all text-left"
                    :class="form.impressora_tipo === op.value
                      ? 'border-orange-500 bg-orange-500/10'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'">
                    <p class="text-xs font-black"
                      :class="form.impressora_tipo === op.value ? 'text-orange-400' : 'text-gray-600 dark:text-white/80'">
                      {{ op.label }}
                    </p>
                    <p class="text-[10px] text-gray-400 dark:text-white/40 mt-0.5 leading-tight">{{ op.desc }}</p>
                  </button>
                </div>

                <div v-if="form.impressora_tipo === 'rede'" class="grid grid-cols-3 gap-3">
                  <div class="col-span-2">
                    <label for="imp-host" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">IP da impressora</label>
                    <input id="imp-host" name="imp-host" v-model="form.impressora_host" type="text" placeholder="Ex: 192.168.1.200"
                      class="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-sm font-mono outline-none focus:border-orange-500/70 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25" />
                  </div>
                  <div>
                    <label for="imp-porta" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">Porta</label>
                    <input id="imp-porta" name="imp-porta" v-model.number="form.impressora_porta" type="number" placeholder="9100"
                      class="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-sm font-mono outline-none focus:border-orange-500/70 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25" />
                  </div>
                </div>

                <div v-if="form.impressora_tipo === 'windows'">
                  <label for="imp-share" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">Nome da impressora no Windows</label>
                  <input id="imp-share" name="imp-share" v-model="form.impressora_host" type="text" placeholder="Ex: EPSON TM-T20 Receipt (como aparece em Impressoras e Scanners)"
                    class="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-sm outline-none focus:border-orange-500/70 transition-all placeholder:text-gray-400 dark:placeholder:text-white/25" />
                </div>

                <div v-if="form.impressora_tipo !== 'navegador'" class="mt-4 flex items-center gap-3">
                  <button @click="testarImpressora" :disabled="testandoImpressora"
                    class="h-10 px-5 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-black transition-all active:scale-95 flex items-center gap-1.5">
                    <Loader2 v-if="testandoImpressora" :size="13" class="animate-spin" />
                    <Printer v-else :size="13" />
                    {{ testandoImpressora ? 'Imprimindo...' : 'Imprimir Teste' }}
                  </button>
                  <p class="text-[10px] text-gray-400 dark:text-white/40 leading-tight">Salve as configurações antes de testar.<br>Funciona com qualquer impressora ESC/POS (Epson, Elgin, Bematech, Tanca…).</p>
                </div>
              </div>

            </div>
          </div>

          <!-- ══ CARD: INTEGRAÇÕES ══ -->
          <div class="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06] flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Plug :size="14" class="text-emerald-500" />
              </div>
              <div>
                <h2 class="text-sm font-black text-gray-900 dark:text-white">Integrações</h2>
                <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Conecte uma maquininha para enviar cobranças automaticamente</p>
              </div>
            </div>

            <div class="p-6 space-y-6">

              <!-- MERCADO PAGO POINT -->
              <div class="rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">

                <!-- cabeçalho da integração -->
                <div class="flex items-center justify-between gap-4 px-5 py-4 bg-gray-50 dark:bg-white/[0.04]">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-[#009EE3]/10 flex items-center justify-center shrink-0">
                      <CreditCard :size="16" class="text-[#009EE3]" />
                    </div>
                    <div>
                      <p class="text-sm font-black text-gray-900 dark:text-white">Mercado Pago Point</p>
                      <p class="text-[11px] text-gray-500 dark:text-white/40">Débito, crédito e Pix direto na maquininha</p>
                    </div>
                  </div>
                  <button
                    @click="mp.ativado = !mp.ativado"
                    class="shrink-0 w-12 h-6 rounded-full transition-all relative"
                    :class="mp.ativado ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-white/10'"
                  >
                    <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                      :class="mp.ativado ? 'left-[26px]' : 'left-0.5'" />
                  </button>
                </div>

                <!-- campos (visíveis só quando ativado) -->
                <Transition name="slide-down-mp">
                  <div v-if="mp.ativado" class="p-5 space-y-4 border-t border-gray-100 dark:border-white/[0.06]">

                    <!-- Access Token -->
                    <div>
                      <label for="mp-access-token" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
                        Access Token
                      </label>
                      <div class="flex gap-2">
                        <div class="relative flex-1">
                          <input
                            id="mp-access-token"
                            name="mp-access-token"
                            v-model="mp.access_token"
                            :type="mostrarToken ? 'text' : 'password'"
                            :placeholder="mpStore.mp.token_salvo ? `Token salvo (•••• ${mpStore.mp.token_sufixo})` : 'APP_USR-...'"
                            class="w-full h-11 px-4 pr-10 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-sm outline-none focus:border-emerald-400/70 transition-all font-mono placeholder:text-gray-400 dark:placeholder:text-white/25"
                          />
                          <button
                            @click="mostrarToken = !mostrarToken"
                            type="button"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60"
                          >
                            <Eye v-if="!mostrarToken" :size="15" />
                            <EyeOff v-else :size="15" />
                          </button>
                        </div>
                      </div>
                      <p class="text-[10px] text-gray-400 dark:text-white/40 mt-1.5">
                        Obtenha em <span class="font-mono">mercadopago.com.br → Credenciais → Access Token de produção</span>
                      </p>
                    </div>

                    <!-- Dispositivo -->
                    <div>
                      <label for="mp-device-id" class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/40 mb-2">
                        Maquininha (Device ID)
                      </label>
                      <div class="flex gap-2">
                        <div class="relative flex-1">
                          <select
                            v-if="mp.dispositivos.length > 0"
                            id="mp-device-id"
                            name="mp-device-id"
                            v-model="mp.device_id"
                            class="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 !bg-gray-50 dark:!bg-white/[0.06] text-gray-900 dark:text-white text-sm outline-none focus:border-emerald-400/70 transition-all appearance-none"
                          >
                            <option value="">Selecione a maquininha</option>
                            <option v-for="d in mp.dispositivos" :key="d.id" :value="d.id">
                              {{ d.id }} {{ d.pos_id ? `· ${d.pos_id}` : '' }}
                            </option>
                          </select>
                          <input
                            v-else
                            id="mp-device-id"
                            name="mp-device-id"
                            v-model="mp.device_id"
                            placeholder="PAX_A910__SMARTPOS123456"
                            class="w-full h-11 px-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.06] text-gray-900 dark:text-white text-sm outline-none focus:border-emerald-400/70 transition-all font-mono placeholder:text-gray-400 dark:placeholder:text-white/25"
                          />
                        </div>
                        <button
                          @click="buscarDispositivos"
                          :disabled="mp.buscandoDispositivos"
                          class="h-11 px-4 rounded-xl bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-white/60 text-xs font-black transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Loader2 v-if="mp.buscandoDispositivos" :size="13" class="animate-spin" />
                          <RefreshCw v-else :size="13" />
                          Buscar
                        </button>
                      </div>
                      <p v-if="mp.erroDispositivos" class="text-[10px] text-red-500 mt-1.5">{{ mp.erroDispositivos }}</p>
                      <p class="text-[10px] text-gray-400 dark:text-white/40 mt-1.5">
                        Clique em "Buscar" após salvar o token para listar as maquininhas vinculadas à conta.
                      </p>
                    </div>

                    <!-- Status da integração -->
                    <div
                      v-if="mpStore.mp.token_salvo && mpStore.mp.device_id"
                      class="flex items-center gap-2 text-xs font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 rounded-xl px-4 py-3"
                    >
                      <CheckCircle :size="14" />
                      Integração configurada — maquininha pronta para receber cobranças
                    </div>

                  </div>
                </Transition>

              </div>

            </div>
          </div>

          <!-- ══ CARD: ACESSO ══ -->
          <div class="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06] flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck :size="14" class="text-violet-500" />
              </div>
              <div>
                <h2 class="text-sm font-black text-gray-900 dark:text-white">Acesso</h2>
                <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Métodos de autenticação disponíveis no login</p>
              </div>
            </div>
            <div class="p-6">
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    :class="form.rfid_ativo ? 'bg-violet-500/10' : 'bg-gray-100 dark:bg-white/[0.06]'">
                    <CreditCard :size="16" :class="form.rfid_ativo ? 'text-violet-500' : 'text-gray-400 dark:text-white/30'" />
                  </div>
                  <div>
                    <p class="text-sm font-black text-gray-900 dark:text-white">Autenticação por cartão RFID</p>
                    <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Exibe a aba de cartão na tela de login e permite entrada por leitora</p>
                  </div>
                </div>
                <button
                  @click="form.rfid_ativo = !form.rfid_ativo"
                  class="shrink-0 w-12 h-6 rounded-full transition-all relative"
                  :class="form.rfid_ativo ? 'bg-violet-500' : 'bg-gray-200 dark:bg-white/10'"
                >
                  <span class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                    :class="form.rfid_ativo ? 'left-[26px]' : 'left-0.5'" />
                </button>
              </div>
            </div>
          </div>

          <!-- SALVAR -->
          <div class="flex justify-end pb-8">
            <button
              @click="salvar"
              :disabled="salvando"
              class="h-12 px-8 rounded-2xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-black text-sm transition-all active:scale-95 flex items-center gap-2"
            >
              <Loader2 v-if="salvando" :size="15" class="animate-spin" />
              <Save v-else :size="15" />
              {{ salvando ? 'Salvando…' : 'Salvar configurações' }}
            </button>
          </div>

        </div>

        <!-- ══ COLUNA DIREITA: preview sticky ══ -->
        <div class="lg:sticky lg:top-20">
          <div class="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
            <div class="px-6 py-5 border-b border-gray-100 dark:border-white/[0.06] flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
                <Eye :size="14" class="text-green-500" />
              </div>
              <div>
                <h2 class="text-sm font-black text-gray-900 dark:text-white">Preview da Ficha</h2>
                <p class="text-[11px] text-gray-500 dark:text-white/40 mt-0.5">Como ficará a ficha individual de cada produto</p>
              </div>
            </div>
            <div class="p-6 flex justify-center">
              <div
                class="border border-dashed border-gray-300 dark:border-white/20 rounded-2xl p-4 font-mono text-center space-y-2 transition-all"
                :style="{ width: form.impressora_largura === 58 ? '180px' : '220px' }"
              >
                <img v-if="form.logo_base64" :src="form.logo_base64" :class="logoAlturaPreview" :style="logoEstiloPreview" class="mx-auto object-contain transition-all duration-200" />
                <div v-else class="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center mx-auto">
                  <UtensilsCrossed :size="16" class="text-white" />
                </div>
                <p class="font-black text-gray-700 dark:text-white/80 uppercase tracking-widest leading-tight"
                  :class="form.impressora_largura === 58 ? 'text-[9px]' : 'text-[11px]'">
                  {{ form.nome_restaurante || 'Restaurante PDV' }}
                </p>
                <p class="text-[8px] text-gray-400 dark:text-white/40">28/06/26 14:30 · Operador</p>
                <div class="border-t border-b border-dashed border-gray-300 dark:border-white/20 py-2 my-1">
                  <p class="font-black text-gray-900 dark:text-white uppercase"
                    :class="form.impressora_largura === 58 ? 'text-base' : 'text-lg'">
                    PRODUTO
                  </p>
                </div>
                <p class="text-[8px] text-gray-400 dark:text-white/40">F1234567890</p>
                <p class="text-[8px] text-gray-400 dark:text-white/30 italic">{{ form.mensagem_ficha || 'Obrigado pela preferência!' }}</p>
                <div v-if="form.impressora_copias > 1" class="flex items-center justify-center gap-1 pt-1">
                  <span v-for="c in form.impressora_copias" :key="c"
                    class="w-4 h-4 rounded bg-orange-500/10 border border-orange-500/30" />
                  <span class="text-[8px] text-orange-500 font-bold ml-1">{{ form.impressora_copias }}×</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

    </main>
  </div>
</template>

<style scoped>
.slide-down-mp-enter-active, .slide-down-mp-leave-active { transition: all 0.22s ease }
.slide-down-mp-enter-from, .slide-down-mp-leave-to { opacity: 0; transform: translateY(-6px) }
</style>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import {
  ImageIcon, Upload, Trash2, Save, Loader2, UtensilsCrossed, Printer, FileText, Eye, EyeOff,
  Minus, Plus, Plug, CreditCard, RefreshCw, CheckCircle, LayoutGrid, Receipt, Ruler, ShieldCheck
} from 'lucide-vue-next'
import Navbar from '~/layouts/Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
import { useConfigStore }      from '~/stores/configuracoes'
import { useIntegracoesStore } from '~/stores/integracoes'
import { useToastStore }       from '~/stores/toast'
import { useApi }              from '~/services/api'

definePageMeta({ layout: false })

const configStore = useConfigStore()
const mpStore     = useIntegracoesStore()
const toastStore  = useToastStore()
const api         = useApi()

const inputLogoRef = ref<HTMLInputElement | null>(null)
const salvando     = ref(false)
const mostrarToken = ref(false)


const mp = reactive({
  ativado:             false,
  access_token:        '',
  device_id:           null as string | null,
  dispositivos:        [] as any[],
  buscandoDispositivos: false,
  erroDispositivos:    ''
})

const larguras = [
  { value: 58, label: '58 mm', desc: 'Bobina pequena' },
  { value: 80, label: '80 mm', desc: 'Bobina padrão' }
]

const tamanhoLogos = [
  { value: 'pequena',      label: 'Pequena',      w: '18px', h: '8px'  },
  { value: 'media',        label: 'Média',        w: '26px', h: '14px' },
  { value: 'grande',       label: 'Grande',       w: '34px', h: '24px' },
  { value: 'personalizado', label: 'Personalizado', w: '34px', h: '24px' }
]

const logoAlturaPreview = computed(() => {
  if (form.logo_tamanho === 'personalizado') return ''
  return ({ pequena: 'h-6', media: 'h-10', grande: 'h-24' } as Record<string, string>)[form.logo_tamanho] ?? 'h-10'
})

const logoEstiloPreview = computed(() => {
  if (form.logo_tamanho !== 'personalizado') return {}
  const px = Math.min(80, Math.round(Math.max(50, form.logo_altura_custom) / 5))
  return { height: `${px}px` }
})

const tiposImpressora = [
  { value: 'navegador' as const, label: 'Navegador', desc: 'Janela de impressão do navegador' },
  { value: 'rede' as const,      label: 'Rede',      desc: 'Térmica com Ethernet/Wi-Fi (porta 9100)' },
  { value: 'windows' as const,   label: 'USB',       desc: 'Térmica USB instalada no Windows' }
]
const testandoImpressora = ref(false)

const form = reactive({
  nome_restaurante:         '',
  logo_base64:              null as string | null,
  logo_tamanho:             'media' as 'pequena' | 'media' | 'grande' | 'personalizado',
  logo_altura_custom:       320,
  mensagem_ficha:           '',
  impressora_largura:       80,
  impressora_copias:        1,
  impressora_auto_imprimir: false,
  impressora_tipo:          'navegador' as 'navegador' | 'rede' | 'windows',
  impressora_host:          '',
  impressora_porta:         9100,
  taxa_servico_pct:         10,
  modo_venda:               'mesas' as 'mesas' | 'direta' | 'ambos',
  rfid_ativo:               true
})

onMounted(async () => {
  await configStore.carregar()
  form.nome_restaurante         = configStore.nome_restaurante
  form.logo_base64              = configStore.logo_base64
  form.logo_tamanho             = configStore.logo_tamanho
  form.logo_altura_custom       = configStore.logo_altura_custom
  form.mensagem_ficha           = configStore.mensagem_ficha
  form.impressora_largura       = configStore.impressora_largura
  form.impressora_copias        = configStore.impressora_copias
  form.impressora_auto_imprimir = configStore.impressora_auto_imprimir
  form.impressora_tipo          = configStore.impressora_tipo
  form.impressora_host          = configStore.impressora_host
  form.impressora_porta         = configStore.impressora_porta
  form.taxa_servico_pct         = configStore.taxa_servico_pct
  form.modo_venda               = configStore.modo_venda
  form.rfid_ativo               = configStore.rfid_ativo

  await mpStore.carregar()
  mp.ativado   = mpStore.mp.ativado
  mp.device_id = mpStore.mp.device_id

})

function modoAtivo(modo: 'mesas' | 'direta') {
  return form.modo_venda === modo || form.modo_venda === 'ambos'
}

function toggleModo(modo: 'mesas' | 'direta') {
  const outra = modo === 'mesas' ? 'direta' : 'mesas'
  if (form.modo_venda === 'ambos') {
    form.modo_venda = outra
  } else if (form.modo_venda === modo) {
    // não desativa o único modo ativo
  } else {
    form.modo_venda = 'ambos'
  }
}

async function buscarDispositivos() {
  mp.buscandoDispositivos = true
  mp.erroDispositivos     = ''
  try {
    const data = await mpStore.listarDispositivos()
    mp.dispositivos = data?.devices ?? []
    if (mp.dispositivos.length === 0) mp.erroDispositivos = 'Nenhuma maquininha encontrada nesta conta'
  } catch (e: any) {
    mp.erroDispositivos = e?.message || 'Erro ao buscar dispositivos'
  } finally {
    mp.buscandoDispositivos = false
  }
}

function onLogoChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 1_000_000) {
    toastStore.error('Logo muito grande', 'Use uma imagem menor que 1 MB')
    return
  }
  const reader = new FileReader()
  reader.onload = () => { form.logo_base64 = reader.result as string }
  reader.readAsDataURL(file)
  ;(e.target as HTMLInputElement).value = ''
}

async function testarImpressora() {
  testandoImpressora.value = true
  try {
    await api.post('/impressao/teste')
    toastStore.success('Cupom de teste enviado!', 'Verifique a impressora.')
  } catch (e: any) {
    toastStore.error('Falha na impressão', e?.message)
  } finally {
    testandoImpressora.value = false
  }
}

async function salvar() {
  if (!form.nome_restaurante.trim()) {
    toastStore.error('Informe o nome do estabelecimento')
    return
  }
  salvando.value = true
  try {
    await Promise.all([
      configStore.salvar({
        nome_restaurante:         form.nome_restaurante.trim(),
        logo_base64:              form.logo_base64,
        logo_tamanho:             form.logo_tamanho,
        logo_altura_custom:       form.logo_altura_custom,
        mensagem_ficha:           form.mensagem_ficha.trim() || 'Obrigado pela preferência!',
        impressora_largura:       form.impressora_largura,
        impressora_copias:        form.impressora_copias,
        impressora_auto_imprimir: form.impressora_auto_imprimir,
        impressora_tipo:          form.impressora_tipo,
        impressora_host:          form.impressora_host.trim(),
        impressora_porta:         form.impressora_porta || 9100,
        taxa_servico_pct:         Math.min(30, Math.max(0, Number(form.taxa_servico_pct) || 0)),
        modo_venda:               form.modo_venda,
        rfid_ativo:               form.rfid_ativo
      }),
      mpStore.salvar({
        ativado:      mp.ativado,
        access_token: mp.access_token || undefined,
        device_id:    mp.device_id || null
      })
    ])
    mp.access_token = ''
    mpStore.carregado = false
    await mpStore.carregar()
    toastStore.success('Configurações salvas!')
  } catch (e: any) {
    toastStore.error('Erro ao salvar', e?.message)
  } finally {
    salvando.value = false
  }
}
</script>
