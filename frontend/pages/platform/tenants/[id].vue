<template>
  <div class="min-h-screen bg-[#0a0a0f]">

    <!-- ══ TOPBAR ══ -->
    <header class="sticky top-0 z-30 border-b border-white/[0.05]" style="background: rgba(10,10,15,0.85); backdrop-filter: blur(20px);">
      <div class="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2.5">
          <div class="relative">
            <div class="absolute inset-0 rounded-xl bg-violet-600 blur-md opacity-50"></div>
            <div class="relative w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg">
              <Globe :size="13" class="text-white" />
            </div>
          </div>
          <span class="text-white font-black text-sm tracking-tight hidden sm:inline">Plataforma</span>
          <span class="text-white/25 text-[10px] font-bold uppercase tracking-widest hidden sm:inline">PDV · Super Administrador</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 border border-white/[0.06] bg-white/[0.03]">
            <div class="w-5 h-5 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
              <span class="text-[9px] font-black text-violet-400">{{ initials }}</span>
            </div>
            <span class="text-white/60 text-xs font-semibold">{{ platformAuth.user?.nome }}</span>
          </div>
          <button @click="handleLogout"
            class="h-8 w-8 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all">
            <LogOut :size="14" />
          </button>
        </div>
      </div>
    </header>

    <!-- ══ LOADING ══ -->
    <div v-if="loading" class="flex items-center justify-center py-32">
      <div class="flex flex-col items-center gap-3">
        <Loader2 :size="24" class="animate-spin text-violet-500" />
        <p class="text-white/30 text-xs font-bold">Carregando...</p>
      </div>
    </div>

    <!-- ══ ERRO ══ -->
    <div v-else-if="erro" class="max-w-5xl mx-auto px-6 py-24 text-center">
      <div class="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center mx-auto mb-4">
        <AlertCircle :size="22" class="text-red-400" />
      </div>
      <p class="text-white font-black text-base mb-3">{{ erro }}</p>
      <NuxtLink to="/platform" class="text-violet-400 text-sm font-bold hover:text-violet-300 transition-colors inline-flex items-center gap-1.5">
        <ArrowLeft :size="13" /> Voltar para a lista
      </NuxtLink>
    </div>

    <!-- ══ CONTEÚDO ══ -->
    <main v-else-if="tenant" class="max-w-5xl mx-auto px-6 py-6 space-y-4">

      <!-- ─ BARRA SUPERIOR: voltar + ações ─ -->
      <div class="flex items-center gap-3">
        <NuxtLink to="/platform"
          class="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-white/35 hover:text-white/60 text-xs font-black transition-all">
          <ArrowLeft :size="12" /> Voltar
        </NuxtLink>
        <div class="flex-1" />
        <button @click="abrirModalDados"
          class="h-8 px-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] text-white/55 text-xs font-black transition-all flex items-center gap-1.5">
          <Pencil :size="11" /> Editar dados
        </button>
        <button @click="toggleStatus"
          class="h-8 px-3.5 rounded-xl border text-xs font-black transition-all flex items-center gap-1.5"
          :class="tenant.status === 'ativo'
            ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/15'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15'">
          <ToggleRight v-if="tenant.status === 'ativo'" :size="11" />
          <ToggleLeft  v-else :size="11" />
          {{ tenant.status === 'ativo' ? 'Suspender' : 'Reativar' }}
        </button>
      </div>

      <!-- ─ HERO DO TENANT ─ -->
      <div class="flex items-center gap-4 px-5 py-4 rounded-2xl border border-white/[0.06] bg-white/[0.015]">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-lg font-black select-none"
          :class="avatarColor(tenant.nome)">
          {{ tenant.nome[0].toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-base font-black text-white tracking-tight">{{ tenant.nome }}</h1>
            <span class="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide" :class="statusBadge(tenant.status)">
              {{ tenant.status }}
            </span>
          </div>
          <p class="text-white/25 text-[10px] font-mono mt-0.5">{{ tenant.slug }}</p>
        </div>
        <!-- Feature pills -->
        <div class="hidden sm:flex items-center gap-1.5 shrink-0">
          <span class="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg transition-all"
            :class="tenant.rfid_disponivel ? 'bg-violet-500/10 text-violet-400 border border-violet-500/15' : 'bg-white/[0.03] text-white/15 border border-white/[0.05]'">
            <CreditCard :size="9" /> RFID
          </span>
          <span class="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg transition-all"
            :class="tenant.venda_mobile_permitida ? 'bg-sky-500/10 text-sky-400 border border-sky-500/15' : 'bg-white/[0.03] text-white/15 border border-white/[0.05]'">
            <Smartphone :size="9" /> Celular
          </span>
          <span v-if="licencaAtual" class="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg border"
            :class="licencaBadge(licencaAtual.status)">
            <KeyRound :size="9" /> {{ licencaStatusLabel }}
          </span>
        </div>
        <!-- Cadastro -->
        <p class="hidden lg:block text-[10px] text-white/15 font-mono shrink-0">{{ formatDate(tenant.created_at) }}</p>
      </div>

      <!-- ─ GRID PRINCIPAL ─ -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <!-- LICENÇA (col 1-2) -->
        <section class="lg:col-span-2 rounded-2xl border bg-white/[0.015] flex flex-col"
          :class="licencaAtual?.status === 'pendente' ? 'border-amber-500/20' : licencaAtual?.status === 'bloqueado' ? 'border-red-500/20' : 'border-white/[0.06]'">

          <!-- Cabeçalho da seção -->
          <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.05]">
            <div class="flex items-center gap-2">
              <KeyRound :size="12" class="text-white/30" />
              <h2 class="text-[10px] font-black text-white/40 uppercase tracking-widest">Licença</h2>
            </div>
            <button v-if="licencaAtual" @click="abrirModalLicenca"
              class="text-[10px] text-white/20 hover:text-violet-400 transition-colors font-bold flex items-center gap-1">
              <Pencil :size="9" /> Editar datas
            </button>
          </div>

          <div v-if="!licencaAtual" class="flex-1 flex flex-col items-center justify-center gap-2 py-10">
            <KeyRound :size="22" class="text-white/10" />
            <p class="text-white/20 text-sm">Nenhuma licença registrada</p>
          </div>

          <div v-else class="p-5 flex flex-col gap-4 flex-1">

            <!-- Status + dias restantes -->
            <div class="flex items-center gap-4 p-4 rounded-xl" :class="licencaBgBlock">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" :class="licencaIconBlock">
                <KeyRound :size="17" :class="licencaIconColor" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-black" :class="licencaIconColor">{{ licencaStatusLabel }}</p>
                <p class="text-[11px] text-white/35 mt-0.5 truncate">{{ licencaLabel }}</p>
              </div>
              <div v-if="diasRestantes !== null" class="text-right shrink-0">
                <p class="text-2xl font-black tabular-nums"
                  :class="diasRestantes < 0 ? 'text-red-400' : diasRestantes <= 7 ? 'text-amber-400' : licencaIconColor">
                  {{ diasRestantes < 0 ? 0 : diasRestantes }}
                </p>
                <p class="text-[9px] font-bold uppercase tracking-widest text-white/20">dias</p>
              </div>
            </div>

            <!-- Datas de ativação / vencimento -->
            <div class="grid grid-cols-2 gap-2">
              <div class="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <p class="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Ativação</p>
                <p class="text-xs font-bold text-white/60">{{ formatDate(licencaAtual.data_ativacao) }}</p>
              </div>
              <div class="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <p class="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Vencimento</p>
                <p class="text-xs font-bold" :class="diasRestantes !== null && diasRestantes <= 7 ? 'text-amber-400' : 'text-white/60'">
                  {{ formatDate(licencaAtual.data_vencimento) }}
                </p>
              </div>
            </div>

            <!-- Controles de período -->
            <div class="space-y-2">
              <p class="text-[9px] font-black uppercase tracking-widest text-white/20">
                {{ licencaAtual.status === 'ativado' && diasRestantes !== null && diasRestantes > 0 ? 'Estender' : 'Ativar' }} licença
              </p>
              <!-- Presets + Permanente -->
              <div class="grid grid-cols-5 gap-1.5">
                <button v-for="periodo in periodos" :key="periodo.label"
                  @click="ativarPeriodo(periodo.dias)" :disabled="ativandoLicenca"
                  class="h-9 rounded-xl border text-xs font-black transition-all disabled:opacity-40 flex items-center justify-center"
                  :class="licencaAtual.status === 'ativado' && diasRestantes !== null && diasRestantes > 0
                    ? 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/18'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/18'">
                  <Loader2 v-if="ativandoLicenca" :size="12" class="animate-spin" />
                  <template v-else>{{ periodo.label }}</template>
                </button>
                <button @click="ativarPeriodo(99 * 365)" :disabled="ativandoLicenca"
                  class="h-9 rounded-xl border text-xs font-black transition-all disabled:opacity-40 flex items-center justify-center bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/18">
                  <Loader2 v-if="ativandoLicenca" :size="12" class="animate-spin" />
                  <template v-else>Ilimitado</template>
                </button>
              </div>
              <!-- Dias personalizados -->
              <div class="flex gap-2">
                <input v-model="diasCustomCard" type="number" min="1" placeholder="Número de dias personalizado…"
                  class="flex-1 h-9 rounded-xl border border-white/[0.07] bg-white/[0.03] text-white/65 text-xs px-3 outline-none placeholder:text-white/15 focus:border-sky-500/35 transition-colors"
                  @keydown.enter="diasCustomCard && ativarPeriodo(Number(diasCustomCard))" />
                <button
                  @click="diasCustomCard && ativarPeriodo(Number(diasCustomCard))"
                  :disabled="ativandoLicenca || !diasCustomCard"
                  class="h-9 px-4 rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-400 text-xs font-black hover:bg-sky-500/18 transition-all disabled:opacity-40 shrink-0">
                  Aplicar
                </button>
              </div>
            </div>

          </div>
        </section>

        <!-- COLUNA DIREITA: dados + features -->
        <div class="flex flex-col gap-4">

          <!-- DADOS CADASTRAIS -->
          <section class="rounded-2xl border border-white/[0.06] bg-white/[0.015]">
            <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.05]">
              <div class="flex items-center gap-2">
                <Building2 :size="11" class="text-white/30" />
                <h2 class="text-[10px] font-black text-white/40 uppercase tracking-widest">Dados</h2>
              </div>
              <button @click="abrirModalDados"
                class="text-[10px] text-white/20 hover:text-violet-400 transition-colors font-bold flex items-center gap-1">
                <Pencil :size="9" /> Editar
              </button>
            </div>
            <dl class="p-4 space-y-2.5">
              <template v-for="campo in dadosCadastrais" :key="campo.label">
                <div v-if="campo.valor" class="flex gap-2 items-baseline">
                  <dt class="text-[9px] text-white/20 font-black w-18 shrink-0 uppercase tracking-wide">{{ campo.label }}</dt>
                  <dd class="text-[11px] text-white/60 font-medium break-all leading-tight min-w-0" :class="campo.mono ? 'font-mono text-white/45' : ''">
                    {{ campo.valor }}
                  </dd>
                </div>
              </template>
              <p v-if="dadosCadastrais.every(c => !c.valor)" class="text-[11px] text-white/15 italic">Nenhum dado preenchido</p>
            </dl>
          </section>

          <!-- FEATURES -->
          <section class="rounded-2xl border border-white/[0.06] bg-white/[0.015]">
            <div class="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-white/[0.05]">
              <Zap :size="11" class="text-white/30" />
              <h2 class="text-[10px] font-black text-white/40 uppercase tracking-widest">Features</h2>
            </div>
            <div class="p-4 space-y-2">
              <!-- RFID -->
              <div class="flex items-center justify-between py-2 px-3 rounded-xl border transition-all"
                :class="tenant.rfid_disponivel ? 'bg-violet-500/[0.05] border-violet-500/12' : 'bg-white/[0.02] border-white/[0.04]'">
                <div class="flex items-center gap-2">
                  <CreditCard :size="13" :class="tenant.rfid_disponivel ? 'text-violet-400' : 'text-white/20'" />
                  <div>
                    <p class="text-xs font-bold text-white/75">RFID</p>
                    <p class="text-[10px] text-white/25">Autenticação por cartão</p>
                  </div>
                </div>
                <button @click="toggleRfid" :disabled="togglingRfid"
                  class="w-8 h-[18px] rounded-full transition-all relative shrink-0 disabled:opacity-50"
                  :class="tenant.rfid_disponivel ? 'bg-violet-500' : 'bg-white/[0.10]'">
                  <span class="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all"
                    :class="tenant.rfid_disponivel ? 'left-[17px]' : 'left-0.5'" />
                </button>
              </div>
              <!-- Mobile -->
              <div class="flex items-center justify-between py-2 px-3 rounded-xl border transition-all"
                :class="tenant.venda_mobile_permitida ? 'bg-sky-500/[0.05] border-sky-500/12' : 'bg-white/[0.02] border-white/[0.04]'">
                <div class="flex items-center gap-2">
                  <Smartphone :size="13" :class="tenant.venda_mobile_permitida ? 'text-sky-400' : 'text-white/20'" />
                  <div>
                    <p class="text-xs font-bold text-white/75">Venda pelo Celular</p>
                    <p class="text-[10px] text-white/25">Acesso via QR Code</p>
                  </div>
                </div>
                <button @click="toggleMobile" :disabled="togglingMobile"
                  class="w-8 h-[18px] rounded-full transition-all relative shrink-0 disabled:opacity-50"
                  :class="tenant.venda_mobile_permitida ? 'bg-sky-500' : 'bg-white/[0.10]'">
                  <span class="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all"
                    :class="tenant.venda_mobile_permitida ? 'left-[17px]' : 'left-0.5'" />
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>

      <!-- ─ CONTRATO (largura total) ─ -->
      <section class="rounded-2xl border border-white/[0.06] bg-white/[0.015]">
        <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.05]">
          <div class="flex items-center gap-2.5">
            <FileText :size="11" class="text-white/30" />
            <h2 class="text-[10px] font-black text-white/40 uppercase tracking-widest">Contrato</h2>
            <span v-if="contratoAtual" class="text-[9px] font-black px-2 py-0.5 rounded-full"
              :class="contratoAtual.status === 'ativo' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.05] text-white/20'">
              {{ contratoAtual.status === 'ativo' ? 'Assinado' : 'Não assinado' }}
            </span>
          </div>
          <button @click="abrirModalContrato"
            class="text-[10px] text-white/20 hover:text-violet-400 transition-colors font-bold flex items-center gap-1">
            <Pencil :size="9" /> {{ contratoAtual ? 'Editar' : 'Criar contrato' }}
          </button>
        </div>

        <!-- Sem contrato -->
        <div v-if="!contratoAtual" class="flex items-center gap-4 px-5 py-6">
          <div class="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
            <FileText :size="16" class="text-white/15" />
          </div>
          <div class="flex-1">
            <p class="text-sm font-bold text-white/30">Nenhum contrato registrado</p>
            <p class="text-[11px] text-white/15 mt-0.5">Clique em "Criar contrato" para cadastrar o plano e a validade da licença.</p>
          </div>
          <button @click="abrirModalContrato"
            class="h-9 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 text-xs font-black hover:bg-indigo-500/18 transition-all shrink-0">
            + Criar contrato
          </button>
        </div>

        <!-- Com contrato -->
        <div v-else class="p-5">
          <div class="flex flex-col sm:flex-row sm:items-start gap-4">
            <!-- Plano + valor -->
            <div class="flex items-center gap-4 flex-1 p-4 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/10">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                <FileText :size="16" class="text-indigo-400" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[9px] font-black uppercase tracking-widest text-indigo-400/50 mb-0.5">Plano · {{ contratoAtual.ciclo }}</p>
                <p class="text-base font-black text-indigo-300 leading-tight">{{ contratoAtual.plano }}</p>
                <p class="text-[11px] text-white/30 mt-0.5">
                  {{ formatDate(contratoAtual.data_inicio) }} → {{ contratoAtual.data_fim ? formatDate(contratoAtual.data_fim) : 'Indeterminado' }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-[9px] font-black uppercase tracking-widest text-emerald-400/50 mb-0.5">Valor</p>
                <p class="text-xl font-black text-emerald-400">{{ contratoAtual.valor ? formatCurrency(contratoAtual.valor) : '—' }}</p>
                <p class="text-[9px] text-white/20 mt-0.5">/ {{ contratoAtual.ciclo }}</p>
              </div>
            </div>
            <!-- Ações PDF -->
            <div class="flex sm:flex-col gap-2 sm:w-32">
              <button @click="visualizarContrato"
                class="flex-1 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-white/40 hover:text-white/80 text-xs font-black transition-all flex items-center justify-center gap-1.5">
                <Eye :size="12" /> Visualizar
              </button>
              <button @click="imprimirContrato"
                class="flex-1 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-white/40 hover:text-white/80 text-xs font-black transition-all flex items-center justify-center gap-1.5">
                <Printer :size="12" /> Imprimir
              </button>
              <button @click="compartilharContrato"
                class="flex-1 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-white/40 hover:text-white/80 text-xs font-black transition-all flex items-center justify-center gap-1.5">
                <Share2 :size="12" /> Enviar
              </button>
            </div>
          </div>
        </div>
      </section>

    </main>

    <!-- ══ MODAL EDITAR ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalAberto"
          class="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto"
          style="background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);"
          @click.self="fecharModal">
          <div class="bg-[#111118] border border-white/[0.09] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  :class="modalModo === 'licenca' ? 'bg-sky-500/10' : modalModo === 'contrato' ? 'bg-indigo-500/10' : 'bg-violet-500/10'">
                  <component :is="modalModo === 'licenca' ? KeyRound : modalModo === 'contrato' ? FileText : Building2" :size="14"
                    :class="modalModo === 'licenca' ? 'text-sky-400' : modalModo === 'contrato' ? 'text-indigo-400' : 'text-violet-400'" />
                </div>
                <h2 class="text-sm font-black text-white">{{ modalModo === 'licenca' ? 'Editar licença' : modalModo === 'contrato' ? 'Editar contrato' : 'Editar dados' }}</h2>
              </div>
              <button @click="fecharModal"
                class="w-7 h-7 rounded-xl bg-white/[0.05] hover:bg-red-500/15 hover:text-red-400 text-white/30 flex items-center justify-center transition-all">
                <X :size="13" />
              </button>
            </div>

            <!-- MODO DADOS -->
            <div v-if="modalModo === 'dados'" class="p-5 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="sm:col-span-2">
                  <label class="label-field">Nome *</label>
                  <input v-model="form.nome" type="text" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Identificador</label>
                  <input v-model="form.slug" type="text" class="input-field font-mono text-xs" />
                </div>
                <div>
                  <label class="label-field">CNPJ</label>
                  <input v-model="form.cnpj" type="text" class="input-field font-mono text-xs" />
                </div>
                <div>
                  <label class="label-field">Responsável</label>
                  <input v-model="form.responsavel" type="text" class="input-field" />
                </div>
                <div>
                  <label class="label-field">E-mail</label>
                  <input v-model="form.contato" type="email" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Telefone</label>
                  <input v-model="form.telefone" type="text" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Endereço</label>
                  <input v-model="form.endereco" type="text" class="input-field" />
                </div>
                <div class="sm:col-span-2">
                  <label class="label-field">Observações</label>
                  <textarea v-model="form.observacoes" rows="2" class="input-field resize-none"></textarea>
                </div>
              </div>
              <div class="border-t border-white/[0.06] pt-4 space-y-3">
                <p class="text-[10px] font-black uppercase tracking-widest text-white/25">Features</p>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-bold text-white/80">Venda pelo Celular</p>
                    <p class="text-[11px] text-white/25">Acesso via QR Code</p>
                  </div>
                  <button @click="form.vendaMobilePermitida = !form.vendaMobilePermitida"
                    class="w-10 h-5 rounded-full transition-all relative shrink-0"
                    :class="form.vendaMobilePermitida ? 'bg-sky-500' : 'bg-white/[0.08]'">
                    <span class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      :class="form.vendaMobilePermitida ? 'left-[22px]' : 'left-0.5'" />
                  </button>
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-bold text-white/80">RFID</p>
                    <p class="text-[11px] text-white/25">Autenticação por cartão</p>
                  </div>
                  <button @click="form.rfidDisponivel = !form.rfidDisponivel"
                    class="w-10 h-5 rounded-full transition-all relative shrink-0"
                    :class="form.rfidDisponivel ? 'bg-violet-500' : 'bg-white/[0.08]'">
                    <span class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      :class="form.rfidDisponivel ? 'left-[22px]' : 'left-0.5'" />
                  </button>
                </div>
              </div>
            </div>

            <!-- MODO CONTRATO -->
            <div v-else-if="modalModo === 'contrato'" class="p-5 space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <label class="label-field">Plano *</label>
                  <input v-model="contratoForm.plano" type="text" placeholder="Ex: Básico, Profissional..." class="input-field" />
                </div>
                <div>
                  <label class="label-field">Valor (R$)</label>
                  <input v-model="contratoForm.valor" type="number" min="0" step="0.01" placeholder="0,00" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Ciclo</label>
                  <select v-model="contratoForm.ciclo" class="input-field">
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div>
                  <label class="label-field">Data início</label>
                  <input v-model="contratoForm.dataInicio" type="date" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Data fim</label>
                  <input v-model="contratoForm.dataFim" type="date" class="input-field" />
                </div>
                <div class="col-span-2">
                  <label class="label-field mb-2">Status</label>
                  <div class="flex gap-2">
                    <button v-for="s in contratoStatuses" :key="s.value" @click="contratoForm.status = s.value"
                      class="flex-1 h-9 rounded-xl text-xs font-black border transition-all"
                      :class="contratoForm.status === s.value ? s.activeClass : 'bg-white/[0.03] border-white/[0.07] text-white/30 hover:bg-white/[0.05]'">
                      {{ s.label }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- VALIDADE DA LICENÇA -->
              <div class="pt-4 border-t border-white/[0.06] space-y-3">
                <div class="flex items-center gap-2">
                  <KeyRound :size="11" class="text-sky-400" />
                  <p class="text-[10px] font-black uppercase tracking-widest text-white/40">Validade da licença</p>
                </div>
                <!-- Atalhos rápidos -->
                <div class="grid grid-cols-5 gap-2">
                  <button v-for="p in periodos" :key="p.label" @click="setLicPeriodo(p.dias)"
                    class="h-9 rounded-xl border text-xs font-black transition-all"
                    :class="diasCustomModal === String(p.dias) ? 'bg-sky-500/25 border-sky-500/50 text-sky-300' : 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20'">
                    {{ p.label }}
                  </button>
                  <button @click="setLicPermanente"
                    class="h-9 rounded-xl border text-xs font-black transition-all"
                    :class="contratoForm.licVencimento === '2099-12-31' ? 'bg-violet-500/25 border-violet-500/50 text-violet-300' : 'bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20'">
                    Ilimitado
                  </button>
                </div>
                <!-- Dias personalizados -->
                <div class="flex gap-2">
                  <input v-model="diasCustomModal" type="number" min="1" placeholder="Qtd. de dias…"
                    class="input-field flex-1"
                    @keydown.enter="aplicarDiasCustomModal" />
                  <button @click="aplicarDiasCustomModal"
                    class="h-10 px-4 rounded-xl bg-sky-500/15 border border-sky-500/25 text-sky-400 text-xs font-black hover:bg-sky-500/25 transition-all shrink-0">
                    Aplicar
                  </button>
                </div>
                <!-- Datas manuais -->
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="label-field">Ativação</label>
                    <input v-model="contratoForm.licAtivacao" type="date" class="input-field" />
                  </div>
                  <div>
                    <label class="label-field">Vencimento</label>
                    <input v-model="contratoForm.licVencimento" type="date" class="input-field" />
                  </div>
                </div>
                <p class="text-[10px] text-white/20">
                  Se o vencimento for preenchido, a licença é ativada automaticamente ao salvar.
                </p>
              </div>
            </div>

            <!-- MODO LICENÇA -->
            <div v-else-if="modalModo === 'licenca'" class="p-5 space-y-4">
              <div>
                <label class="label-field mb-2">Status</label>
                <div class="flex gap-2">
                  <button v-for="s in licencaStatuses" :key="s.value" @click="licencaForm.status = s.value"
                    class="flex-1 h-9 rounded-xl text-xs font-black border transition-all"
                    :class="licencaForm.status === s.value ? s.activeClass : 'bg-white/[0.03] border-white/[0.07] text-white/30 hover:bg-white/[0.05]'">
                    {{ s.label }}
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label-field">Ativação</label>
                  <input v-model="licencaForm.dataAtivacao" type="date" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Vencimento</label>
                  <input v-model="licencaForm.dataVencimento" type="date" class="input-field" />
                </div>
              </div>
            </div>

            <div v-if="erroModal" class="mx-5 mb-1 text-xs text-red-400 font-bold">{{ erroModal }}</div>

            <div class="flex gap-2 p-5 pt-3 border-t border-white/[0.06]">
              <button @click="fecharModal"
                class="flex-1 h-10 rounded-xl border border-white/[0.08] text-white/40 text-sm font-black hover:bg-white/[0.04] transition-all">
                Cancelar
              </button>
              <button @click="salvar" :disabled="salvando"
                class="flex-1 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 active:scale-[0.98] text-white text-sm font-black transition-all flex items-center justify-center gap-2">
                <Loader2 v-if="salvando" :size="13" class="animate-spin" />
                {{ salvando ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ CONFIRM DIALOG ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmDialog.show"
          class="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style="background: rgba(0,0,0,0.72); backdrop-filter: blur(6px);"
          @click.self="confirmDialog.resolve?.(false); confirmDialog.show = false">
          <div class="bg-[#111118] border border-white/[0.09] rounded-2xl w-full max-w-xs shadow-2xl">
            <div class="p-6 flex flex-col items-center text-center gap-4">
              <div class="w-12 h-12 rounded-2xl flex items-center justify-center border"
                :class="confirmDialog.type === 'danger'
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/20'">
                <AlertTriangle v-if="confirmDialog.type === 'danger'" :size="20" class="text-red-400" />
                <CheckCircle2  v-else :size="20" class="text-emerald-400" />
              </div>
              <div>
                <h3 class="text-sm font-black text-white leading-tight">{{ confirmDialog.title }}</h3>
                <p class="text-[12px] text-white/35 mt-1.5 leading-relaxed">{{ confirmDialog.message }}</p>
              </div>
            </div>
            <div class="flex gap-2 px-5 pb-5">
              <button
                @click="confirmDialog.resolve?.(false); confirmDialog.show = false"
                class="flex-1 h-10 rounded-xl border border-white/[0.08] text-white/45 text-xs font-black hover:bg-white/[0.05] transition-all">
                Cancelar
              </button>
              <button
                @click="confirmDialog.resolve?.(true); confirmDialog.show = false"
                class="flex-1 h-10 rounded-xl text-xs font-black transition-all"
                :class="confirmDialog.type === 'danger'
                  ? 'bg-red-500 hover:bg-red-400 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-white'">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastMsg.text"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold shadow-2xl border"
        :class="toastMsg.type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 backdrop-blur-xl'
          : 'bg-red-500/10 border-red-500/20 text-red-300 backdrop-blur-xl'">
        <CheckCircle2 v-if="toastMsg.type === 'success'" :size="14" />
        <AlertCircle  v-else :size="14" />
        {{ toastMsg.text }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import {
  Globe, LogOut, ArrowLeft, Building2, CreditCard, Smartphone,
  Loader2, AlertCircle, AlertTriangle, CheckCircle2, Pencil, X, FileText, KeyRound,
  Zap, ToggleRight, ToggleLeft, Eye, Printer, Share2,
} from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'

definePageMeta({ layout: false })

interface Licenca  { id: string; status: string; data_ativacao: string | null; data_vencimento: string | null; created_at: string }
interface Contrato { id: string; plano: string; valor: string | null; ciclo: string; status: string; data_inicio: string | null; data_fim: string | null }
interface Tenant {
  id: string; nome: string; slug: string; cnpj: string | null; contato: string | null
  responsavel: string | null; telefone: string | null; endereco: string | null; observacoes: string | null
  status: string; rfid_disponivel: boolean; venda_mobile_permitida: boolean; created_at: string
  licencas: Licenca[]; contratos: Contrato[]
}

const route        = useRoute()
const platformAuth = usePlatformAuthStore()
const runtimeConfig = useRuntimeConfig()

const tenant         = ref<Tenant | null>(null)
const loading        = ref(false)
const erro           = ref('')
const togglingRfid    = ref(false)
const togglingMobile  = ref(false)
const ativandoLicenca = ref(false)
const diasCustomCard  = ref('')

const confirmDialog = reactive({
  show: false, title: '', message: '', type: 'danger' as 'danger' | 'success',
  resolve: null as ((v: boolean) => void) | null,
})
function showConfirm(title: string, message: string, type: 'danger' | 'success' = 'danger'): Promise<boolean> {
  return new Promise(resolve => {
    Object.assign(confirmDialog, { title, message, type, resolve, show: true })
  })
}
const toastMsg       = reactive({ text: '', type: 'success' as 'success' | 'error' })

const modalAberto = ref(false)
const modalModo   = ref<'dados' | 'licenca' | 'contrato'>('dados')
const salvando    = ref(false)
const erroModal   = ref('')

const form = reactive({ nome: '', slug: '', cnpj: '', responsavel: '', contato: '', telefone: '', endereco: '', observacoes: '', vendaMobilePermitida: true, rfidDisponivel: false })
const licencaForm = reactive({ status: 'pendente', dataAtivacao: '', dataVencimento: '' })
const licencaStatuses = [
  { value: 'ativado',   label: 'Ativada',   activeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
  { value: 'pendente',  label: 'Pendente',  activeClass: 'bg-amber-500/15  border-amber-500/30  text-amber-400'  },
  { value: 'bloqueado', label: 'Bloqueada', activeClass: 'bg-red-500/15    border-red-500/30    text-red-400'    },
]
const contratoForm = reactive({ plano: '', valor: '', ciclo: 'mensal', dataInicio: '', dataFim: '', status: 'ativo', licAtivacao: '', licVencimento: '' })
const contratoStatuses = [
  { value: 'ativo',     label: 'Ativo',     activeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
  { value: 'trial',     label: 'Teste',     activeClass: 'bg-sky-500/15     border-sky-500/30     text-sky-400'     },
  { value: 'suspenso',  label: 'Suspenso',  activeClass: 'bg-amber-500/15  border-amber-500/30  text-amber-400'  },
  { value: 'cancelado', label: 'Cancelado', activeClass: 'bg-red-500/15    border-red-500/30    text-red-400'    },
]
const periodos = [
  { label: '30d',   dias: 30   },
  { label: '90d',   dias: 90   },
  { label: '6 meses', dias: 180 },
  { label: '1 ano', dias: 365  },
]

const baseUrl       = computed(() => (runtimeConfig.public as any).apiUrl as string)
const licencaAtual  = computed(() => tenant.value?.licencas?.[0] ?? null)
const contratoAtual = computed(() => tenant.value?.contratos?.[0] ?? null)
const initials      = computed(() => platformAuth.user?.nome?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? 'SA')

const AVATAR_COLORS = [
  'bg-violet-500/20 text-violet-300', 'bg-sky-500/20 text-sky-300',
  'bg-emerald-500/20 text-emerald-300', 'bg-amber-500/20 text-amber-300',
  'bg-rose-500/20 text-rose-300', 'bg-indigo-500/20 text-indigo-300',
  'bg-teal-500/20 text-teal-300', 'bg-orange-500/20 text-orange-300',
]
const AVATAR_GLOWS = [
  'rgba(124,58,237,0.07)', 'rgba(14,165,233,0.07)',
  'rgba(16,185,129,0.07)', 'rgba(245,158,11,0.07)',
  'rgba(244,63,94,0.07)',  'rgba(99,102,241,0.07)',
  'rgba(20,184,166,0.07)', 'rgba(249,115,22,0.07)',
]
function avatarColor(nome: string) { return AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length] }
const avatarGlow = computed(() => {
  if (!tenant.value) return ''
  const idx = tenant.value.nome.charCodeAt(0) % AVATAR_GLOWS.length
  return `background: radial-gradient(circle, ${AVATAR_GLOWS[idx]} 0%, transparent 70%)`
})

const diasRestantes = computed(() => {
  if (!licencaAtual.value?.data_vencimento) return null
  return Math.ceil((new Date(licencaAtual.value.data_vencimento).getTime() - Date.now()) / 86400000)
})
const licencaStatusLabel = computed(() => {
  const s = licencaAtual.value?.status
  if (s === 'ativado') return 'Ativa'
  if (s === 'pendente') return 'Pendente'
  return 'Bloqueada'
})
const licencaLabel = computed(() => {
  const lic = licencaAtual.value
  if (!lic) return ''
  if (lic.status === 'ativado' && lic.data_vencimento) {
    const d = diasRestantes.value!
    if (d < 0)  return 'Licença expirada'
    if (d <= 7) return `Vence em ${d} dia(s)`
    return `Válida até ${formatDate(lic.data_vencimento)}`
  }
  if (lic.status === 'pendente') return 'Aguardando ativação'
  return 'Licença bloqueada'
})
const licencaBgBlock    = computed(() => licencaAtual.value?.status === 'ativado' ? 'bg-emerald-500/[0.07]' : licencaAtual.value?.status === 'pendente' ? 'bg-amber-500/[0.07]' : 'bg-red-500/[0.07]')
const licencaIconBlock  = computed(() => licencaAtual.value?.status === 'ativado' ? 'bg-emerald-500/15' : licencaAtual.value?.status === 'pendente' ? 'bg-amber-500/15' : 'bg-red-500/15')
const licencaIconColor  = computed(() => licencaAtual.value?.status === 'ativado' ? 'text-emerald-400' : licencaAtual.value?.status === 'pendente' ? 'text-amber-400' : 'text-red-400')

const dadosCadastrais = computed(() => [
  { label: 'CNPJ',        valor: tenant.value?.cnpj,        mono: true  },
  { label: 'Responsável', valor: tenant.value?.responsavel,  mono: false },
  { label: 'E-mail',      valor: tenant.value?.contato,      mono: false },
  { label: 'Telefone',    valor: tenant.value?.telefone,     mono: false },
  { label: 'Endereço',    valor: tenant.value?.endereco,     mono: false },
  { label: 'Observações', valor: tenant.value?.observacoes,  mono: false },
])

function statusBadge(s: string) { return s === 'ativo' ? 'bg-emerald-500/15 text-emerald-400' : s === 'suspenso' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400' }
function licencaBadge(s: string) { return s === 'ativado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : s === 'pendente' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20' }
function contratoStatusBadge(s: string) { return s === 'ativo' ? 'bg-emerald-500/15 text-emerald-400' : s === 'trial' ? 'bg-sky-500/15 text-sky-400' : s === 'suspenso' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400' }
function formatDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function formatCurrency(v: string | number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)) }
function showToast(type: 'success' | 'error', text: string) { toastMsg.type = type; toastMsg.text = text; setTimeout(() => { toastMsg.text = '' }, 3000) }

async function platformFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${baseUrl.value}/api${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${platformAuth.token}`, ...((options.headers as any) || {}) },
  })
  if (resp.status === 401) { platformAuth.logout(); navigateTo('/platform/login'); throw new Error('Sessão expirada') }
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`)
  return data as T
}

async function carregar() {
  loading.value = true; erro.value = ''
  try { tenant.value = await platformFetch<Tenant>(`/platform/tenants/${route.params.id}`) }
  catch (e: any) { erro.value = e?.message || 'Erro ao carregar' }
  finally { loading.value = false }
}

function abrirModalDados() {
  if (!tenant.value) return
  const t = tenant.value
  Object.assign(form, { nome: t.nome, slug: t.slug, cnpj: t.cnpj || '', responsavel: t.responsavel || '', contato: t.contato || '', telefone: t.telefone || '', endereco: t.endereco || '', observacoes: t.observacoes || '', vendaMobilePermitida: t.venda_mobile_permitida, rfidDisponivel: t.rfid_disponivel })
  modalModo.value = 'dados'; erroModal.value = ''; modalAberto.value = true
}

function abrirModalContrato() {
  const c   = contratoAtual.value
  const lic = licencaAtual.value
  Object.assign(contratoForm, {
    plano:         c?.plano || '',
    valor:         c?.valor || '',
    ciclo:         c?.ciclo || 'mensal',
    dataInicio:    c?.data_inicio?.substring(0, 10) || new Date().toISOString().substring(0, 10),
    dataFim:       c?.data_fim?.substring(0, 10) || '',
    status:        c?.status || 'ativo',
    licAtivacao:   lic?.data_ativacao?.substring(0, 10)  || new Date().toISOString().substring(0, 10),
    licVencimento: lic?.data_vencimento?.substring(0, 10) || '',
  })
  modalModo.value = 'contrato'; erroModal.value = ''; modalAberto.value = true
}

const diasCustomModal = ref('')

function setLicPeriodo(dias: number) {
  const hoje = new Date()
  const venc = new Date(hoje.getTime() + dias * 86400000)
  contratoForm.licAtivacao   = hoje.toISOString().substring(0, 10)
  contratoForm.licVencimento = venc.toISOString().substring(0, 10)
  diasCustomModal.value = String(dias)
}

function setLicPermanente() {
  contratoForm.licAtivacao   = new Date().toISOString().substring(0, 10)
  contratoForm.licVencimento = '2099-12-31'
  diasCustomModal.value = ''
}

function aplicarDiasCustomModal() {
  const d = parseInt(diasCustomModal.value)
  if (!d || d <= 0) return
  const hoje = new Date()
  const venc = new Date(hoje.getTime() + d * 86400000)
  contratoForm.licAtivacao   = hoje.toISOString().substring(0, 10)
  contratoForm.licVencimento = venc.toISOString().substring(0, 10)
}

function abrirModalLicenca() {
  const lic = licencaAtual.value
  licencaForm.status        = lic?.status || 'pendente'
  licencaForm.dataAtivacao  = lic?.data_ativacao?.substring(0, 10)  || ''
  licencaForm.dataVencimento = lic?.data_vencimento?.substring(0, 10) || ''
  modalModo.value = 'licenca'; erroModal.value = ''; modalAberto.value = true
}

function fecharModal() { modalAberto.value = false }

async function salvar() {
  erroModal.value = ''
  salvando.value = true
  try {
    if (modalModo.value === 'dados') {
      if (!form.nome.trim()) { erroModal.value = 'Nome é obrigatório'; salvando.value = false; return }
      await platformFetch(`/platform/tenants/${tenant.value!.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: form.nome, slug: form.slug, cnpj: form.cnpj || null, responsavel: form.responsavel || null, contato: form.contato || null, telefone: form.telefone || null, endereco: form.endereco || null, observacoes: form.observacoes || null, vendaMobilePermitida: form.vendaMobilePermitida, rfidDisponivel: form.rfidDisponivel }),
      })
      showToast('success', 'Dados atualizados!')
    } else if (modalModo.value === 'licenca') {
      await platformFetch(`/platform/tenants/${tenant.value!.id}/licenca`, {
        method: 'PUT',
        body: JSON.stringify({ status: licencaForm.status, dataAtivacao: licencaForm.dataAtivacao || null, dataVencimento: licencaForm.dataVencimento || null }),
      })
      showToast('success', 'Licença atualizada!')
    } else if (modalModo.value === 'contrato') {
      if (!contratoForm.plano.trim()) { erroModal.value = 'Plano é obrigatório'; salvando.value = false; return }
      await platformFetch(`/platform/tenants/${tenant.value!.id}/contrato`, {
        method: 'PUT',
        body: JSON.stringify({ plano: contratoForm.plano, valor: contratoForm.valor || null, ciclo: contratoForm.ciclo, dataInicio: contratoForm.dataInicio || null, dataFim: contratoForm.dataFim || null, status: contratoForm.status }),
      })
      if (contratoForm.licVencimento) {
        await platformFetch(`/platform/tenants/${tenant.value!.id}/licenca`, {
          method: 'PUT',
          body: JSON.stringify({ status: 'ativado', dataAtivacao: contratoForm.licAtivacao || new Date().toISOString().substring(0, 10), dataVencimento: contratoForm.licVencimento }),
        })
      }
      showToast('success', 'Contrato e licença atualizados!')
    }
    fecharModal(); await carregar()
  } catch (e: any) { erroModal.value = e?.message || 'Erro ao salvar' }
  finally { salvando.value = false }
}

async function ativarPeriodo(dias: number) {
  if (!tenant.value || ativandoLicenca.value) return
  ativandoLicenca.value = true
  try {
    const hoje = new Date()
    const lic = licencaAtual.value
    const base = lic?.status === 'ativado' && lic.data_vencimento && new Date(lic.data_vencimento) > hoje
      ? new Date(lic.data_vencimento)
      : hoje
    const vencimento = new Date(base.getTime() + dias * 86400000)
    await platformFetch(`/platform/tenants/${tenant.value.id}/licenca`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'ativado',
        dataAtivacao: hoje.toISOString().substring(0, 10),
        dataVencimento: vencimento.toISOString().substring(0, 10),
      }),
    })
    showToast('success', `Licença ${base > hoje ? 'estendida' : 'ativada'} por ${dias} dia(s)!`)
    await carregar()
  } catch (e: any) { showToast('error', e?.message || 'Erro ao ativar') }
  finally { ativandoLicenca.value = false }
}

async function toggleMobile() {
  if (!tenant.value || togglingMobile.value) return
  togglingMobile.value = true
  const novo = !tenant.value.venda_mobile_permitida
  try {
    await platformFetch(`/platform/tenants/${tenant.value.id}/mobile`, { method: 'PATCH', body: JSON.stringify({ permitida: novo }) })
    tenant.value.venda_mobile_permitida = novo
    showToast('success', novo ? 'Venda pelo Celular habilitada' : 'Venda pelo Celular desabilitada')
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
  finally { togglingMobile.value = false }
}

async function toggleRfid() {
  if (!tenant.value || togglingRfid.value) return
  togglingRfid.value = true
  const novo = !tenant.value.rfid_disponivel
  try {
    await platformFetch(`/platform/tenants/${tenant.value.id}/rfid`, { method: 'PATCH', body: JSON.stringify({ disponivel: novo }) })
    tenant.value.rfid_disponivel = novo
    showToast('success', novo ? 'RFID habilitado' : 'RFID desabilitado')
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
  finally { togglingRfid.value = false }
}

async function toggleStatus() {
  if (!tenant.value) return
  const novoStatus = tenant.value.status === 'ativo' ? 'suspenso' : 'ativo'
  const ok = await showConfirm(
    novoStatus === 'suspenso' ? `Suspender "${tenant.value.nome}"?` : `Reativar "${tenant.value.nome}"?`,
    novoStatus === 'suspenso'
      ? 'O tenant ficará inacessível até ser reativado manualmente.'
      : 'O tenant voltará a funcionar normalmente.',
    novoStatus === 'suspenso' ? 'danger' : 'success'
  )
  if (!ok) return
  try {
    await platformFetch(`/platform/tenants/${tenant.value.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: novoStatus }) })
    tenant.value.status = novoStatus
    showToast('success', novoStatus === 'suspenso' ? 'Tenant suspenso' : 'Tenant reativado')
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
}

async function handleLogout() {
  const rt = localStorage.getItem('platform_refresh_token')
  if (rt) { try { await platformFetch('/platform/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: rt }) }) } catch {} }
  platformAuth.logout(); navigateTo('/platform/login')
}

// ── GERAÇÃO DE CONTRATO PDF ──────────────────────────────────────────────────

const CONTRATADA = {
  razaoSocial:        'SavioAlves Tecnologia LTDA ME',
  nomeFantasia:       'OmniFlow Systems',
  cnpj:               '45.678.901/0001-23',
  inscricaoEstadual:  'Isento',
  endereco:           'Rua das Flores, 256, Sala 04',
  bairro:             'Setor Bueno',
  cidade:             'Goiânia',
  uf:                 'GO',
  cep:                '74.210-050',
  telefone:           '(62) 9 9912-3456',
  email:              'suporte.savioalves@gmail.com',
  site:               'www.omniflow.com.br',
  representante:      'Sávio Ferreira Alves',
  cpfRepresentante:   '123.456.789-00',
  rgRepresentante:    '1.234.567 SSP/GO',
  cargoRepresentante: 'Administrador',
  foroCidade:         'Goiânia',
  foroUF:             'GO',
}

function visualizarContrato() { gerarContratoPDF() }

function imprimirContrato() {
  const win = gerarContratoPDF()
  if (win) setTimeout(() => { try { win.print() } catch {} }, 800)
}

async function compartilharContrato() {
  if (!tenant.value) return
  const t = tenant.value
  const c = contratoAtual.value
  const texto = `Contrato PDV — ${t.nome}\nPlano: ${c?.plano || '—'}\nValor: ${c?.valor ? formatCurrency(c.valor) : '—'}/${c?.ciclo || '—'}\nVigência: ${formatDate(c?.data_inicio)} → ${c?.data_fim ? formatDate(c.data_fim) : 'Indeterminado'}\nContato: ${t.contato || '—'}`
  try {
    if (navigator.share) {
      await navigator.share({ title: `Contrato — ${t.nome}`, text: texto })
    } else {
      await navigator.clipboard.writeText(texto)
      showToast('success', 'Resumo copiado para a área de transferência')
    }
  } catch {}
}

function escapeHtml(val: unknown): string {
  if (val == null) return ''
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function gerarContratoPDF(): Window | null {
  if (!tenant.value) return null
  const t = tenant.value
  const c = contratoAtual.value

  const fmtD = (d: string | Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '___/___/______'
  const fmtM = (v: string | number | null | undefined) =>
    v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'a definir em aditivo'

  const plano    = c?.plano || 'Básico'
  const valor    = fmtM(c?.valor)

  // Campos da API sanitizados antes de injetar no HTML
  const esc = escapeHtml
  const sNome       = esc(t.nome)
  const sSlug       = esc(t.slug)
  const sCnpj       = esc(t.cnpj)
  const sEndereco   = esc(t.endereco)
  const sTelefone   = esc(t.telefone)
  const sContato    = esc(t.contato)
  const sResponsavel = esc(t.responsavel)
  const sPlano      = esc(plano)
  const sObs        = t.observacoes ? esc(t.observacoes).replace(/\n/g, '<br>') : ''
  const ciclo    = c?.ciclo || 'mensal'
  const cicloMap: Record<string, string> = { mensal: 'mensal', trimestral: 'trimestral', semestral: 'semestral', anual: 'anual' }
  const cicloExtMap: Record<string, string> = { mensal: '30 (trinta) dias', trimestral: '3 (três) meses', semestral: '6 (seis) meses', anual: '12 (doze) meses' }
  const inicio   = c?.data_inicio ? new Date(c.data_inicio) : new Date()
  const fim      = c?.data_fim ? new Date(c.data_fim) : null
  const vigencia = fim
    ? `de ${fmtD(inicio)} a ${fmtD(fim)}`
    : `a partir de ${fmtD(inicio)}, por prazo indeterminado`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Contrato — ${sNome}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Times New Roman", serif; font-size: 12pt; color: #111; background: #fff; line-height: 1.8; }
    .page { max-width: 820px; margin: 0 auto; padding: 48px 64px; }
    .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #111; padding-bottom: 20px; }
    .header h1 { font-size: 14pt; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; }
    .header .subtitle { font-size: 11pt; color: #444; margin-top: 4px; }
    .header .doc-num { font-size: 9.5pt; color: #777; margin-top: 6px; font-style: italic; }
    .parties { margin-bottom: 28px; border: 1px solid #ccc; border-radius: 4px; overflow: hidden; }
    .parties-title { background: #f0f0f0; border-bottom: 1px solid #ccc; padding: 8px 16px; font-size: 10pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .party { padding: 12px 16px; font-size: 10.5pt; }
    .party + .party { border-top: 1px solid #eee; }
    .party-role { font-weight: bold; font-size: 10pt; text-transform: uppercase; color: #333; display: block; margin-bottom: 4px; letter-spacing: 0.5px; }
    .party-line { margin: 1px 0; }
    .party-line strong { display: inline-block; min-width: 160px; font-size: 10pt; }
    .clause { margin-bottom: 22px; }
    .clause h3 { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.3px; }
    .clause p { margin-bottom: 8px; text-align: justify; font-size: 11pt; }
    .clause ol { padding-left: 28px; margin-top: 4px; }
    .clause ol li { margin-bottom: 5px; text-align: justify; font-size: 11pt; }
    .clause .paragrafo { margin-top: 6px; font-size: 11pt; text-align: justify; }
    .clause .paragrafo::before { content: "Parágrafo único. "; font-weight: bold; }
    ${t.observacoes ? '.notes-box { background: #fffbe6; border-left: 3px solid #e6c000; padding: 12px 16px; margin-bottom: 28px; font-size: 10.5pt; }' : ''}
    .sig-section { margin-top: 56px; padding-top: 20px; border-top: 1px solid #ccc; }
    .sig-city { font-size: 11pt; margin-bottom: 48px; text-align: right; }
    .sig-lines { display: flex; gap: 56px; margin-bottom: 32px; }
    .sig-line { flex: 1; text-align: center; }
    .sig-line .line { border-top: 1px solid #333; margin-bottom: 6px; }
    .sig-name-label { font-size: 10.5pt; font-weight: bold; }
    .sig-role-label { font-size: 9.5pt; color: #555; margin-top: 2px; }
    .witness-lines { margin-top: 8px; }
    .witness-title { font-size: 10pt; font-weight: bold; text-transform: uppercase; margin-bottom: 28px; letter-spacing: 0.3px; }
    .footer { margin-top: 48px; padding-top: 12px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 8.5pt; color: #999; }
    @media print { body { font-size: 11pt; } .page { padding: 0; } @page { margin: 2.5cm 2cm; } }
  </style>
</head>
<body>
<div class="page">

  <div class="header">
    <h1>Contrato de Prestação de Serviços de Tecnologia</h1>
    <p class="subtitle">Modalidade SaaS — Sistema de Ponto de Venda · Plano <strong>${sPlano}</strong></p>
    <p class="doc-num">Ref.: ${sSlug.toUpperCase()}-${inicio.getFullYear()}</p>
  </div>

  <div class="parties">
    <div class="parties-title">Partes Contratantes</div>
    <div class="party">
      <span class="party-role">Contratada</span>
      <p class="party-line"><strong>Razão Social:</strong> ${CONTRATADA.razaoSocial}</p>
      <p class="party-line"><strong>Nome Fantasia:</strong> ${CONTRATADA.nomeFantasia}</p>
      <p class="party-line"><strong>CNPJ:</strong> ${CONTRATADA.cnpj} &nbsp;|&nbsp; <strong>Insc. Estadual:</strong> ${CONTRATADA.inscricaoEstadual}</p>
      <p class="party-line"><strong>Endereço:</strong> ${CONTRATADA.endereco}, ${CONTRATADA.bairro}, ${CONTRATADA.cidade}/${CONTRATADA.uf} — CEP ${CONTRATADA.cep}</p>
      <p class="party-line"><strong>Telefone:</strong> ${CONTRATADA.telefone} &nbsp;|&nbsp; <strong>E-mail:</strong> ${CONTRATADA.email}</p>
      <p class="party-line"><strong>Representante:</strong> ${CONTRATADA.representante}, CPF ${CONTRATADA.cpfRepresentante}, RG ${CONTRATADA.rgRepresentante}</p>
    </div>
    <div class="party">
      <span class="party-role">Contratante</span>
      <p class="party-line"><strong>Razão Social / Nome:</strong> ${sNome}</p>
      ${sCnpj ? `<p class="party-line"><strong>CNPJ / CPF:</strong> ${sCnpj}</p>` : `<p class="party-line"><strong>CNPJ / CPF:</strong> ___________________________________</p>`}
      <p class="party-line"><strong>Endereço:</strong> ${sEndereco || '___________________________________________________________'}</p>
      ${!sEndereco ? `<p class="party-line"><strong>Bairro:</strong> _________________________ <strong>Cidade/UF:</strong> _______________________</p>` : ''}
      <p class="party-line"><strong>Telefone:</strong> ${sTelefone || '_________________________'} &nbsp; <strong>E-mail:</strong> ${sContato || '_______________________________'}</p>
      <p class="party-line"><strong>Representante:</strong> ${sResponsavel || '_________________________________'} &nbsp; <strong>CPF:</strong> _____________________</p>
    </div>
  </div>

  <div class="clause">
    <h3>Cláusula 1ª — Do Objeto</h3>
    <p>O presente instrumento tem por objeto a prestação de serviços de tecnologia pela CONTRATADA
    à CONTRATANTE, consistindo no licenciamento de uso do sistema de Ponto de Venda (PDV)
    <strong>Restaurante PDV</strong>, na modalidade <em>Software as a Service</em> (SaaS), plano
    <strong>${sPlano}</strong>, compreendendo:</p>
    <ol>
      <li>Acesso ao sistema via navegador web, com suporte a múltiplos dispositivos;</li>
      <li>Painel administrativo para gestão de produtos, mesas, pedidos e caixa;</li>
      <li>Atualizações de versão disponibilizadas automaticamente durante a vigência;</li>
      <li>Suporte técnico nos canais e horários definidos na Cláusula 4ª;</li>
      <li>Armazenamento dos dados do CONTRATANTE em ambiente seguro com backups periódicos.</li>
    </ol>
  </div>

  <div class="clause">
    <h3>Cláusula 2ª — Da Vigência</h3>
    <p>O presente contrato vigorará ${vigencia}, renovando-se automaticamente por períodos sucessivos de
    ${cicloExtMap[ciclo] || '30 (trinta) dias'}, salvo notificação de não renovação por qualquer das partes,
    realizada com antecedência mínima de 30 (trinta) dias antes do término do período vigente,
    por e-mail ou notificação escrita.</p>
  </div>

  <div class="clause">
    <h3>Cláusula 3ª — Do Valor e Forma de Pagamento</h3>
    <p>Pela prestação dos serviços descritos, a CONTRATANTE pagará à CONTRATADA o valor de
    <strong>${valor}</strong> por ciclo <strong>${cicloMap[ciclo] || ciclo}</strong>, com vencimento no dia
    <strong>10 (dez)</strong> de cada período de referência.</p>
    <p>São aceitos os seguintes meios de pagamento: PIX, transferência bancária (TED/DOC) ou boleto bancário.</p>
    <p class="paragrafo">O não pagamento até a data de vencimento acarretará multa moratória de 2% (dois por cento)
    sobre o valor em aberto, acrescida de juros de mora de 1% (um por cento) ao mês, calculados pro rata die,
    além de correção monetária pelo IGPM/FGV, sem prejuízo da suspensão imediata do acesso ao sistema após
    10 (dez) dias de inadimplência.</p>
  </div>

  <div class="clause">
    <h3>Cláusula 4ª — Das Obrigações da Contratada</h3>
    <p>Compete à CONTRATADA:</p>
    <ol>
      <li>Garantir a disponibilidade do sistema com SLA mínimo de 99% (noventa e nove por cento) ao mês,
      excluídas janelas de manutenção programada comunicadas com antecedência;</li>
      <li>Realizar backups automáticos dos dados da CONTRATANTE com frequência mínima diária;</li>
      <li>Prestar suporte técnico de segunda a sexta-feira, das 08h às 18h (horário de Brasília),
      por meio de e-mail (${CONTRATADA.email}) e WhatsApp (${CONTRATADA.telefone});</li>
      <li>Comunicar à CONTRATANTE, com antecedência mínima de 48 (quarenta e oito) horas, as
      manutenções programadas que impliquem indisponibilidade do sistema;</li>
      <li>Manter a confidencialidade dos dados da CONTRATANTE, não os compartilhando com terceiros,
      salvo por determinação legal ou judicial.</li>
    </ol>
  </div>

  <div class="clause">
    <h3>Cláusula 5ª — Das Obrigações da Contratante</h3>
    <p>Compete à CONTRATANTE:</p>
    <ol>
      <li>Manter em sigilo as credenciais de acesso ao sistema, sendo integralmente responsável
      por uso indevido decorrente de compartilhamento não autorizado;</li>
      <li>Efetuar os pagamentos nas datas e condições acordadas neste instrumento;</li>
      <li>Utilizar o sistema exclusivamente para fins lícitos, em conformidade com a legislação
      brasileira e com os termos deste contrato;</li>
      <li>Notificar a CONTRATADA, imediatamente, sobre qualquer suspeita de violação de segurança,
      acesso não autorizado ou uso indevido do sistema;</li>
      <li>Manter seus dados cadastrais atualizados junto à CONTRATADA.</li>
    </ol>
  </div>

  <div class="clause">
    <h3>Cláusula 6ª — Da Propriedade Intelectual</h3>
    <p>O sistema <strong>Restaurante PDV</strong> e todos os seus componentes — incluindo código-fonte,
    interfaces, algoritmos, documentação e marca — são de propriedade exclusiva da CONTRATADA, protegidos
    pela Lei nº 9.609/1998 (Lei de Software) e pela Lei nº 9.610/1998 (Lei de Direitos Autorais).</p>
    <p class="paragrafo">Este contrato confere à CONTRATANTE licença de uso não exclusiva, intransferível
    e revogável do software, pelo período de vigência contratual. Não implica cessão, transferência ou
    sublicenciamento de quaisquer direitos de propriedade intelectual.</p>
  </div>

  <div class="clause">
    <h3>Cláusula 7ª — Da Confidencialidade e Proteção de Dados (LGPD)</h3>
    <p>As partes comprometem-se a tratar os dados pessoais eventualmente compartilhados em estrita
    conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD),
    adotando medidas técnicas e organizacionais adequadas para proteger as informações contra
    acesso não autorizado, destruição, perda, alteração ou divulgação indevida.</p>
    <p>A CONTRATADA atuará como <em>operadora</em> dos dados inseridos pela CONTRATANTE no sistema,
    processando-os exclusivamente para as finalidades previstas neste contrato. A CONTRATANTE,
    na qualidade de <em>controladora</em>, é responsável pela legalidade do tratamento de dados
    de seus clientes e colaboradores dentro do sistema.</p>
  </div>

  <div class="clause">
    <h3>Cláusula 8ª — Da Limitação de Responsabilidade</h3>
    <p>A CONTRATADA não será responsabilizada por danos indiretos, lucros cessantes ou perda de
    dados decorrentes de:</p>
    <ol>
      <li>Uso inadequado do sistema pela CONTRATANTE ou por terceiros com acesso autorizado por ela;</li>
      <li>Falhas de infraestrutura de terceiros (internet, energia elétrica, provedores de nuvem);</li>
      <li>Eventos de força maior ou caso fortuito, conforme o art. 393 do Código Civil Brasileiro;</li>
      <li>Manutenções programadas devidamente comunicadas.</li>
    </ol>
    <p class="paragrafo">Em qualquer hipótese, a responsabilidade máxima da CONTRATADA fica limitada
    ao valor pago pela CONTRATANTE nos últimos 3 (três) meses de vigência do contrato.</p>
  </div>

  <div class="clause">
    <h3>Cláusula 9ª — Da Rescisão</h3>
    <p>Este contrato poderá ser rescindido:</p>
    <ol>
      <li><strong>Por qualquer das partes</strong>, mediante notificação escrita com antecedência
      mínima de 30 (trinta) dias, sem ônus ou penalidades;</li>
      <li><strong>Por inadimplência</strong> da CONTRATANTE, após decorridos 10 (dez) dias do
      vencimento sem pagamento, independentemente de notificação prévia, não gerando direito
      a restituição de valores já pagos;</li>
      <li><strong>Por descumprimento contratual</strong> de qualquer das partes, após notificação
      e prazo de 5 (cinco) dias úteis para regularização.</li>
    </ol>
    <p class="paragrafo">Rescindido o contrato, a CONTRATADA manterá os dados da CONTRATANTE
    disponíveis para exportação por 30 (trinta) dias, após os quais poderão ser definitivamente
    excluídos.</p>
  </div>

  <div class="clause">
    <h3>Cláusula 10ª — Das Disposições Gerais</h3>
    <ol>
      <li>Este contrato constitui o acordo integral entre as partes, substituindo quaisquer
      entendimentos anteriores sobre o mesmo objeto;</li>
      <li>Qualquer alteração deste instrumento somente terá validade se formalizada por escrito
      e assinada por ambas as partes;</li>
      <li>A tolerância de uma das partes em relação ao descumprimento de qualquer cláusula não
      constituirá novação ou renúncia ao direito de exigi-la futuramente;</li>
      <li>Caso qualquer disposição deste contrato seja considerada inválida, as demais permanecerão
      em pleno vigor.</li>
    </ol>
  </div>

  <div class="clause">
    <h3>Cláusula 11ª — Do Foro</h3>
    <p>Fica eleito o foro da Comarca de <strong>${CONTRATADA.foroCidade}/${CONTRATADA.foroUF}</strong>
    para dirimir quaisquer controvérsias oriundas deste instrumento, com renúncia expressa a qualquer
    outro, por mais privilegiado que seja, ressalvados os casos em que a legislação imponha foro
    diverso de forma imperativa.</p>
  </div>

  ${sObs ? `<div class="notes-box"><strong>Condições específicas / Observações:</strong><br>${sObs}</div>` : ''}

  <div class="sig-section">
    <p class="sig-city">Goiânia/GO, _______ de __________________ de _______</p>
    <div class="sig-lines">
      <div class="sig-line">
        <div class="line"></div>
        <p class="sig-name-label">${sNome}</p>
        <p class="sig-role-label">CONTRATANTE</p>
      </div>
      <div class="sig-line">
        <div class="line"></div>
        <p class="sig-name-label">${CONTRATADA.representante}</p>
        <p class="sig-role-label">CONTRATADA — ${CONTRATADA.cargoRepresentante}</p>
      </div>
    </div>
    <div class="witness-lines">
      <p class="witness-title">Testemunhas:</p>
      <div class="sig-lines">
        <div class="sig-line">
          <div class="line"></div>
          <p class="sig-role-label">Nome: ___________________________ CPF: ___________________</p>
        </div>
        <div class="sig-line">
          <div class="line"></div>
          <p class="sig-role-label">Nome: ___________________________ CPF: ___________________</p>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>${CONTRATADA.razaoSocial} · CNPJ ${CONTRATADA.cnpj}</span>
    <span>Documento gerado em ${new Date().toLocaleDateString('pt-BR')} · ${sNome} · Plano ${sPlano}</span>
  </div>

</div>
</body>
</html>`

  const janela = window.open('', '_blank')
  if (!janela) { showToast('error', 'Permita popups para gerar o contrato'); return null }
  janela.document.write(html)
  janela.document.close()
  return janela
}

onMounted(() => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) { navigateTo('/platform/login'); return }
  carregar()
})
</script>

<style scoped>
.label-field { @apply block text-[10px] font-black uppercase tracking-widest text-white/30 mb-1.5; }
.input-field  { @apply w-full h-10 px-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all; }
textarea.input-field { @apply h-auto py-2.5; }
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>
