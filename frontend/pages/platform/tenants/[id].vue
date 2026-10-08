<template>
  <div class="min-h-dvh bg-[#0b0b12] flex">

    <!-- ══ SIDEBAR ══ -->
    <aside class="hidden lg:flex flex-col w-60 shrink-0 border-r border-white/[0.06] sticky top-0 h-screen" style="background:#0e0d18">

      <!-- Brand -->
      <div class="h-16 px-5 flex items-center gap-3 border-b border-white/[0.06] shrink-0">
        <div class="size-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shadow-lg shadow-violet-900/60 shrink-0">
          <UIcon name="i-lucide-globe" class="text-white size-4" />
        </div>
        <div>
          <p class="text-sm font-bold text-white leading-none tracking-tight">Plataforma</p>
          <p class="text-[9px] font-semibold uppercase tracking-widest text-white/30 mt-0.5">PDV Central</p>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-5 space-y-1">
        <p class="text-[9px] font-bold uppercase tracking-widest text-white/20 px-3 mb-3">Menu</p>
        <NuxtLink to="/platform" class="nav-active flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div class="size-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shrink-0 shadow-md shadow-violet-900/50">
            <UIcon name="i-lucide-store" class="text-white size-3.5" />
          </div>
          <span class="text-sm font-semibold text-white flex-1 truncate">Restaurantes</span>
        </NuxtLink>
        <NuxtLink to="/platform/tickets" class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors">
          <div class="size-8 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-ticket" class="text-white/40 size-3.5" />
          </div>
          <span class="text-sm font-medium text-white/50 flex-1 truncate">Tickets</span>
        </NuxtLink>
      </nav>

      <!-- User -->
      <div class="px-3 py-4 border-t border-white/[0.06] shrink-0">
        <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group">
          <div class="size-8 rounded-xl bg-gradient-to-br from-violet-700 to-violet-900 flex items-center justify-center shrink-0">
            <span class="text-[11px] font-black text-white">{{ (platformAuth.user?.nome || 'SA')[0] }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-white/80 truncate">{{ platformAuth.user?.nome }}</p>
            <p class="text-[10px] text-white/30 truncate">Super Admin</p>
          </div>
          <button @click="handleLogout" title="Sair"
            class="size-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100">
            <UIcon name="i-lucide-log-out" class="size-3.5" />
          </button>
        </div>
      </div>
    </aside>

    <!-- ══ ÁREA PRINCIPAL ══ -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- Topbar mobile -->
      <header class="lg:hidden sticky top-0 z-30 h-14 flex items-center justify-between px-4 border-b border-white/[0.06] shrink-0 bg-[#0b0b12]/90 backdrop-blur-xl">
        <div class="flex items-center gap-2.5">
          <div class="size-7 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center">
            <UIcon name="i-lucide-globe" class="text-white size-3.5" />
          </div>
          <span class="text-sm font-bold text-white">Plataforma</span>
        </div>
        <button @click="handleLogout" class="size-8 flex items-center justify-center rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <UIcon name="i-lucide-log-out" class="size-4" />
        </button>
      </header>

    <!-- ══ LOADING ══ -->
    <div v-if="loading" class="flex items-center justify-center py-48">
      <div class="flex flex-col items-center gap-3">
        <Loader2 :size="24" class="animate-spin text-violet-500" />
        <p class="text-white/30 text-xs font-bold">Carregando...</p>
      </div>
    </div>

    <!-- ══ ERRO ══ -->
    <div v-else-if="erro" class="px-6 lg:px-10 py-24 text-center">
      <div class="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/15 flex items-center justify-center mx-auto mb-4">
        <AlertCircle :size="22" class="text-red-400" />
      </div>
      <p class="text-white font-black text-base mb-3">{{ erro }}</p>
      <NuxtLink to="/platform" class="text-violet-400 text-sm font-bold hover:text-violet-300 transition-colors inline-flex items-center gap-1.5">
        <ArrowLeft :size="13" /> Voltar para a lista
      </NuxtLink>
    </div>

    <!-- ══ CONTEÚDO ══ -->
    <main v-else-if="tenant" class="max-w-[1100px] w-full px-6 lg:px-10 py-8 space-y-6">

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
            :class="tenant.rfidDisponivel ? 'bg-violet-500/10 text-violet-400 border border-violet-500/15' : 'bg-white/[0.03] text-white/15 border border-white/[0.05]'">
            <CreditCard :size="9" /> RFID
          </span>
          <span class="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg transition-all"
            :class="tenant.vendaMobilePermitida ? 'bg-sky-500/10 text-sky-400 border border-sky-500/15' : 'bg-white/[0.03] text-white/15 border border-white/[0.05]'">
            <Smartphone :size="9" /> Celular
          </span>
          <span v-if="licencaAtual" class="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg border"
            :class="licencaBadge(licencaAtual.status)">
            <KeyRound :size="9" /> {{ licencaStatusLabel }}
          </span>
        </div>
        <!-- Cadastro -->
        <p class="hidden lg:block text-[10px] text-white/15 font-mono shrink-0">{{ formatDate(tenant.createdAt) }}</p>
      </div>

      <!-- ─ GRID PRINCIPAL ─ -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

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
                <p class="text-xs font-bold text-white/60">{{ formatDate(licencaAtual.dataAtivacao) }}</p>
              </div>
              <div class="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <p class="text-[9px] font-black uppercase tracking-widest text-white/20 mb-1">Vencimento</p>
                <p class="text-xs font-bold" :class="diasRestantes !== null && diasRestantes <= 7 ? 'text-amber-400' : 'text-white/60'">
                  {{ formatDate(licencaAtual.dataVencimento) }}
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
                :class="tenant.rfidDisponivel ? 'bg-violet-500/[0.05] border-violet-500/12' : 'bg-white/[0.02] border-white/[0.04]'">
                <div class="flex items-center gap-2">
                  <CreditCard :size="13" :class="tenant.rfidDisponivel ? 'text-violet-400' : 'text-white/20'" />
                  <div>
                    <p class="text-xs font-bold text-white/75">RFID</p>
                    <p class="text-[10px] text-white/25">Autenticação por cartão</p>
                  </div>
                </div>
                <button @click="toggleRfid" :disabled="togglingRfid"
                  class="w-8 h-[18px] rounded-full transition-all relative shrink-0 disabled:opacity-50"
                  :class="tenant.rfidDisponivel ? 'bg-violet-500' : 'bg-white/[0.10]'">
                  <span class="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all"
                    :class="tenant.rfidDisponivel ? 'left-[17px]' : 'left-0.5'" />
                </button>
              </div>
              <!-- Mobile -->
              <div class="flex items-center justify-between py-2 px-3 rounded-xl border transition-all"
                :class="tenant.vendaMobilePermitida ? 'bg-sky-500/[0.05] border-sky-500/12' : 'bg-white/[0.02] border-white/[0.04]'">
                <div class="flex items-center gap-2">
                  <Smartphone :size="13" :class="tenant.vendaMobilePermitida ? 'text-sky-400' : 'text-white/20'" />
                  <div>
                    <p class="text-xs font-bold text-white/75">Venda pelo Celular</p>
                    <p class="text-[10px] text-white/25">Acesso via QR Code</p>
                  </div>
                </div>
                <button @click="toggleMobile" :disabled="togglingMobile"
                  class="w-8 h-[18px] rounded-full transition-all relative shrink-0 disabled:opacity-50"
                  :class="tenant.vendaMobilePermitida ? 'bg-sky-500' : 'bg-white/[0.10]'">
                  <span class="absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all"
                    :class="tenant.vendaMobilePermitida ? 'left-[17px]' : 'left-0.5'" />
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
              :class="{
                'bg-emerald-500/15 text-emerald-400': contratoAtual.status === 'ativo',
                'bg-amber-500/15 text-amber-400':   contratoAtual.status === 'trial',
                'bg-red-500/15 text-red-400':       contratoAtual.status === 'suspenso' || contratoAtual.status === 'cancelado',
              }">
              {{ contratoAtual.status === 'ativo' ? 'Assinado' : contratoAtual.status === 'trial' ? 'Ag. assinatura' : contratoAtual.status === 'cancelado' ? 'Rescindido' : 'Suspenso' }}
            </span>
          </div>
          <button @click="abrirModalContrato"
            class="text-[10px] text-white/20 hover:text-indigo-400 transition-colors font-bold flex items-center gap-1">
            <Pencil :size="9" /> {{ contratoAtual ? 'Editar dados' : 'Criar contrato' }}
          </button>
        </div>

        <!-- Sem contrato -->
        <div v-if="!contratoAtual" class="flex items-center gap-5 px-5 py-6">
          <div class="w-12 h-12 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/10 flex items-center justify-center shrink-0">
            <FileText :size="20" class="text-indigo-400/40" />
          </div>
          <div class="flex-1">
            <p class="text-sm font-bold text-white/40">Nenhum contrato gerado</p>
            <p class="text-[11px] text-white/20 mt-0.5">Gere um contrato de prestação de serviços em PDF, pronto para impressão e assinatura pelas partes.</p>
          </div>
          <button @click="abrirModalContrato"
            class="h-9 px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-black hover:bg-indigo-500/18 transition-all shrink-0 flex items-center gap-1.5">
            <FileText :size="12" /> Gerar contrato
          </button>
        </div>

        <!-- Com contrato -->
        <div v-else class="p-5 space-y-4">

          <!-- Documento card -->
          <div class="flex items-center gap-4 p-4 rounded-xl bg-indigo-500/[0.04] border border-indigo-500/10">
            <div class="size-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-900 shadow-md shadow-indigo-900/50 flex items-center justify-center shrink-0">
              <FileText :size="16" class="text-white" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-black text-indigo-300 leading-tight">Contrato de Prestação de Serviços — Plano {{ contratoAtual.plano }}</p>
              <p class="text-[10px] text-white/30 mt-0.5 font-mono">
                Vigência: {{ formatDate(contratoAtual.dataInicio) }} → {{ contratoAtual.dataFim ? formatDate(contratoAtual.dataFim) : 'Indeterminado' }}
                <span v-if="contratoAtual.valor"> · {{ formatCurrency(contratoAtual.valor) }}/{{ contratoAtual.ciclo }}</span>
              </p>
            </div>
          </div>

          <!-- Ações PDF — destaque principal -->
          <div class="grid grid-cols-3 gap-2">
            <button @click="visualizarContrato"
              class="h-10 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/18 border border-indigo-500/20 text-indigo-400 text-xs font-black transition-all flex items-center justify-center gap-2">
              <Eye :size="13" /> Visualizar PDF
            </button>
            <button @click="imprimirContrato"
              class="h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-white/50 hover:text-white/80 text-xs font-black transition-all flex items-center justify-center gap-2">
              <Printer :size="13" /> Imprimir
            </button>
            <button @click="compartilharContrato"
              class="h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-white/50 hover:text-white/80 text-xs font-black transition-all flex items-center justify-center gap-2">
              <Share2 :size="13" /> Compartilhar
            </button>
          </div>
        </div>
      </section>

      <!-- ─ ACESSO DO ADMINISTRADOR (largura total) ─ -->
      <section class="rounded-2xl border border-white/[0.06] bg-white/[0.015]">
        <div class="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.05]">
          <div class="flex items-center gap-2.5">
            <UserCog :size="11" class="text-white/30" />
            <h2 class="text-[10px] font-black text-white/40 uppercase tracking-widest">Acesso do administrador</h2>
          </div>
          <span v-if="adminAtual" class="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Configurado</span>
          <span v-else class="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Sem acesso</span>
        </div>

        <div class="p-5 space-y-4">
          <!-- Aviso sem admin -->
          <div v-if="!adminAtual" class="flex items-start gap-3 p-3 rounded-xl bg-amber-500/[0.07] border border-amber-500/15 text-[11px] text-amber-300/80">
            <Lock :size="13" class="mt-0.5 shrink-0 text-amber-400" />
            Nenhum administrador configurado. Defina as credenciais abaixo para que o cliente consiga acessar o sistema e para que o suporte remoto funcione.
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1.5">Nome do administrador</label>
              <input v-model="adminForm.nome" type="text" placeholder="Ex: João Silva"
                class="w-full h-9 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors" />
            </div>
            <div class="sm:col-span-2">
              <label class="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1.5">E-mail de acesso</label>
              <input v-model="adminForm.email" type="email" placeholder="admin@restaurante.com" autocomplete="off"
                class="w-full h-9 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors" />
            </div>
            <div>
              <label class="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1.5">
                Nova senha <span class="normal-case font-normal text-white/20">{{ adminAtual ? '(deixe em branco para manter)' : '* mín. 6 caracteres' }}</span>
              </label>
              <div class="relative">
                <input v-model="adminForm.senha" :type="mostrarSenha ? 'text' : 'password'" placeholder="••••••••" autocomplete="new-password"
                  class="w-full h-9 px-3 pr-9 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors" />
                <button type="button" @click="mostrarSenha = !mostrarSenha"
                  class="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                  <Eye :size="13" />
                </button>
              </div>
            </div>
            <div>
              <label class="text-[10px] font-bold text-white/30 uppercase tracking-wider block mb-1.5">Confirmar senha</label>
              <input v-model="adminForm.senhaConfirm" :type="mostrarSenha ? 'text' : 'password'" placeholder="••••••••" autocomplete="new-password"
                :class="['w-full h-9 px-3 rounded-xl bg-white/[0.04] border text-white/80 text-xs placeholder-white/20 outline-none transition-colors',
                  adminForm.senhaConfirm && adminForm.senhaConfirm !== adminForm.senha ? 'border-red-500/40 focus:border-red-500/60' : 'border-white/[0.08] focus:border-indigo-500/40']" />
            </div>
          </div>

          <div v-if="erroAdmin" class="text-xs text-red-400 font-bold">{{ erroAdmin }}</div>
          <div v-if="sucessoAdmin" class="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
            <CheckCircle2 :size="12" /> {{ sucessoAdmin }}
          </div>

          <div class="flex items-center justify-between pt-1">
            <p v-if="adminAtual" class="text-[10px] text-white/20">
              Login atual: <span class="text-white/40 font-mono">{{ adminAtual.email }}</span>
            </p>
            <button @click="salvarAdmin" :disabled="salvandoAdmin"
              class="ml-auto h-9 px-5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/25 text-indigo-400 text-xs font-black transition-all flex items-center gap-2 disabled:opacity-50">
              <Loader2 v-if="salvandoAdmin" :size="12" class="animate-spin" />
              <ShieldCheck v-else :size="12" />
              {{ adminAtual ? 'Atualizar credenciais' : 'Criar administrador' }}
            </button>
          </div>
        </div>
      </section>

    </main>

    </div><!-- /flex-1 área principal -->

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
                <h2 class="text-sm font-black text-white">{{ modalModo === 'licenca' ? 'Editar licença' : modalModo === 'contrato' ? (contratoAtual ? 'Dados do contrato' : 'Gerar contrato') : 'Editar dados' }}</h2>
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
                  <label class="label-field">CNPJ ou CPF</label>
                  <input v-model="form.cnpj" type="text" class="input-field font-mono text-xs" placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <label class="label-field">Responsável</label>
                  <input v-model="form.responsavel" type="text" class="input-field" />
                </div>
                <div>
                  <label class="label-field">CPF do responsável</label>
                  <input v-model="form.cpfResponsavel" type="text" class="input-field font-mono text-xs" placeholder="000.000.000-00" />
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
                  <label class="label-field">Endereço (rua, nº, bairro)</label>
                  <input v-model="form.endereco" type="text" class="input-field" placeholder="Rua das Flores, 123, Centro" />
                </div>
                <div>
                  <label class="label-field">Cidade</label>
                  <input v-model="form.cidade" type="text" class="input-field" />
                </div>
                <div>
                  <label class="label-field">UF</label>
                  <input v-model="form.uf" type="text" maxlength="2" class="input-field font-mono uppercase" placeholder="GO" />
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
              <!-- Aviso documento jurídico -->
              <div class="flex items-start gap-3 p-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15">
                <FileText :size="13" class="text-indigo-400/70 mt-0.5 shrink-0" />
                <p class="text-[11px] text-indigo-300/70 leading-relaxed">Esses dados serão usados para gerar o <strong class="text-indigo-300">Contrato de Prestação de Serviços</strong> em PDF — pronto para impressão e assinatura pelas partes.</p>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="col-span-2">
                  <label class="label-field">Plano *</label>
                  <select v-model="planoOpcao" class="input-field" @change="onPlanoOpcaoChange">
                    <option value="Básico">Básico</option>
                    <option value="Profissional">Profissional</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="personalizado">Personalizado…</option>
                  </select>
                  <input v-if="planoOpcao === 'personalizado'" v-model="contratoForm.plano"
                    type="text" placeholder="Nome do plano" class="input-field mt-2" />
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
  ArrowLeft, Building2, CreditCard, Smartphone,
  Loader2, AlertCircle, AlertTriangle, CheckCircle2, Pencil, X, FileText, KeyRound,
  Zap, ToggleRight, ToggleLeft, Eye, Printer, Share2, ShieldCheck, Lock, UserCog,
} from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'

definePageMeta({ layout: false })

interface Licenca  { id: string; status: string; dataAtivacao: string | null; dataVencimento: string | null; createdAt: string }
interface Contrato { id: string; plano: string; valor: string | null; ciclo: string; status: string; dataInicio: string | null; dataFim: string | null }
interface Tenant {
  id: string; nome: string; slug: string; cnpj: string | null; contato: string | null
  responsavel: string | null; telefone: string | null; endereco: string | null; observacoes: string | null
  status: string; rfidDisponivel: boolean; vendaMobilePermitida: boolean; createdAt: string
  licencas: Licenca[]; contratos: Contrato[]
}

const route             = useRoute()
const platformAuth      = usePlatformAuthStore()
const { platformFetch } = usePlatformFetch()

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

// ── Acesso do administrador ───────────────────────────────────────────────────
const adminAtual      = ref<{ id: string; nome: string; email: string; ativo: boolean } | null>(null)
const adminForm       = reactive({ nome: '', email: '', senha: '', senhaConfirm: '' })
const mostrarSenha    = ref(false)
const salvandoAdmin   = ref(false)
const erroAdmin       = ref('')
const sucessoAdmin    = ref('')

async function carregarAdmin() {
  const data = await platformFetch<any>(`/platform/tenants/${route.params.id}/admin`)
  adminAtual.value = data
  if (data) { adminForm.nome = data.nome; adminForm.email = data.email }
  adminForm.senha = ''; adminForm.senhaConfirm = ''
}

async function salvarAdmin() {
  erroAdmin.value = ''; sucessoAdmin.value = ''
  if (!adminForm.email.trim()) { erroAdmin.value = 'E-mail é obrigatório'; return }
  if (adminForm.senha && adminForm.senha.length < 6) { erroAdmin.value = 'Senha deve ter no mínimo 6 caracteres'; return }
  if (adminForm.senha !== adminForm.senhaConfirm) { erroAdmin.value = 'As senhas não conferem'; return }
  if (!adminAtual.value && !adminForm.senha) { erroAdmin.value = 'Defina uma senha para criar o administrador'; return }
  salvandoAdmin.value = true
  try {
    const res = await platformFetch<any>(`/platform/tenants/${route.params.id}/admin`, {
      method: 'PUT',
      body: JSON.stringify({ nome: adminForm.nome, email: adminForm.email, senha: adminForm.senha || undefined }),
    })
    adminAtual.value = res
    adminForm.senha = ''; adminForm.senhaConfirm = ''
    sucessoAdmin.value = adminAtual.value ? 'Credenciais atualizadas' : 'Administrador criado'
    setTimeout(() => { sucessoAdmin.value = '' }, 3000)
  } catch (e: any) {
    erroAdmin.value = e?.message || 'Erro ao salvar'
  } finally {
    salvandoAdmin.value = false
  }
}

const form = reactive({ nome: '', slug: '', cnpj: '', cpfResponsavel: '', responsavel: '', contato: '', telefone: '', endereco: '', cidade: '', uf: '', observacoes: '', vendaMobilePermitida: true, rfidDisponivel: false })
const licencaForm = reactive({ status: 'pendente', dataAtivacao: '', dataVencimento: '' })
const licencaStatuses = [
  { value: 'ativado',   label: 'Ativada',   activeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
  { value: 'pendente',  label: 'Pendente',  activeClass: 'bg-amber-500/15  border-amber-500/30  text-amber-400'  },
  { value: 'bloqueado', label: 'Bloqueada', activeClass: 'bg-red-500/15    border-red-500/30    text-red-400'    },
]
const contratoForm = reactive({ plano: '', valor: '', ciclo: 'mensal', dataInicio: '', dataFim: '', status: 'trial', licAtivacao: '', licVencimento: '' })
const contratoStatuses = [
  { value: 'ativo',     label: 'Assinado',             activeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
  { value: 'trial',     label: 'Ag. assinatura',        activeClass: 'bg-amber-500/15   border-amber-500/30   text-amber-400'   },
  { value: 'suspenso',  label: 'Suspenso',              activeClass: 'bg-red-500/15     border-red-500/30     text-red-400'     },
  { value: 'cancelado', label: 'Rescindido',            activeClass: 'bg-red-500/20     border-red-500/40     text-red-300'     },
]
const periodos = [
  { label: '30d',   dias: 30   },
  { label: '90d',   dias: 90   },
  { label: '6 meses', dias: 180 },
  { label: '1 ano', dias: 365  },
]

const licencaAtual  = computed(() => tenant.value?.licencas?.[0] ?? null)
const contratoAtual = computed(() => tenant.value?.contratos?.[0] ?? null)

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
  if (!licencaAtual.value?.dataVencimento) return null
  return Math.ceil((new Date(licencaAtual.value.dataVencimento!).getTime() - Date.now()) / 86400000)
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
  if (lic.status === 'ativado' && lic.dataVencimento) {
    const d = diasRestantes.value!
    if (d < 0)  return 'Licença expirada'
    if (d <= 7) return `Vence em ${d} dia(s)`
    return `Válida até ${formatDate(lic.dataVencimento)}`
  }
  if (lic.status === 'pendente') return 'Aguardando ativação'
  return 'Licença bloqueada'
})
const licencaBgBlock    = computed(() => licencaAtual.value?.status === 'ativado' ? 'bg-emerald-500/[0.07]' : licencaAtual.value?.status === 'pendente' ? 'bg-amber-500/[0.07]' : 'bg-red-500/[0.07]')
const licencaIconBlock  = computed(() => licencaAtual.value?.status === 'ativado' ? 'bg-emerald-500/15' : licencaAtual.value?.status === 'pendente' ? 'bg-amber-500/15' : 'bg-red-500/15')
const licencaIconColor  = computed(() => licencaAtual.value?.status === 'ativado' ? 'text-emerald-400' : licencaAtual.value?.status === 'pendente' ? 'text-amber-400' : 'text-red-400')

const dadosCadastrais = computed(() => [
  { label: 'CNPJ / CPF',       valor: tenant.value?.cnpj,                          mono: true  },
  { label: 'Responsável',      valor: tenant.value?.responsavel,                   mono: false },
  { label: 'CPF do responsável', valor: (tenant.value as any)?.cpfResponsavel,     mono: true  },
  { label: 'E-mail',           valor: tenant.value?.contato,                       mono: false },
  { label: 'Telefone',         valor: tenant.value?.telefone,                      mono: false },
  { label: 'Endereço',         valor: tenant.value?.endereco,                      mono: false },
  { label: 'Cidade / UF',      valor: [(tenant.value as any)?.cidade, (tenant.value as any)?.uf].filter(Boolean).join(' — ') || null, mono: false },
  { label: 'Observações',      valor: tenant.value?.observacoes,                   mono: false },
])

function statusBadge(s: string) { return s === 'ativo' ? 'bg-emerald-500/15 text-emerald-400' : s === 'suspenso' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400' }
function licencaBadge(s: string) { return s === 'ativado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : s === 'pendente' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20' }
function contratoStatusBadge(s: string) { return s === 'ativo' ? 'bg-emerald-500/15 text-emerald-400' : s === 'trial' ? 'bg-sky-500/15 text-sky-400' : s === 'suspenso' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400' }
function formatDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function formatCurrency(v: string | number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)) }
function showToast(type: 'success' | 'error', text: string) { toastMsg.type = type; toastMsg.text = text; setTimeout(() => { toastMsg.text = '' }, 3000) }


async function carregar() {
  loading.value = true; erro.value = ''
  try {
    tenant.value = await platformFetch<Tenant>(`/platform/tenants/${route.params.id}`)
    await carregarAdmin()
  }
  catch (e: any) { erro.value = e?.message || 'Erro ao carregar' }
  finally { loading.value = false }
}

function abrirModalDados() {
  if (!tenant.value) return
  const t = tenant.value
  Object.assign(form, { nome: t.nome, slug: t.slug, cnpj: t.cnpj || '', cpfResponsavel: (t as any).cpfResponsavel || '', responsavel: t.responsavel || '', contato: t.contato || '', telefone: t.telefone || '', endereco: t.endereco || '', cidade: (t as any).cidade || '', uf: (t as any).uf || '', observacoes: t.observacoes || '', vendaMobilePermitida: t.vendaMobilePermitida, rfidDisponivel: t.rfidDisponivel })
  modalModo.value = 'dados'; erroModal.value = ''; modalAberto.value = true
}

function abrirModalContrato() {
  const c   = contratoAtual.value
  const lic = licencaAtual.value
  const planoInicial = c?.plano || 'Básico'
  planoOpcao.value = PLANOS_PADRAO.includes(planoInicial) ? planoInicial : 'personalizado'
  Object.assign(contratoForm, {
    plano:         planoInicial,
    valor:         c?.valor || '',
    ciclo:         c?.ciclo || 'mensal',
    dataInicio:    c?.dataInicio?.substring(0, 10) || new Date().toISOString().substring(0, 10),
    dataFim:       c?.dataFim?.substring(0, 10) || '',
    status:        c?.status || 'trial',
    licAtivacao:   lic?.dataAtivacao?.substring(0, 10)  || new Date().toISOString().substring(0, 10),
    licVencimento: lic?.dataVencimento?.substring(0, 10) || '',
  })
  modalModo.value = 'contrato'; erroModal.value = ''; modalAberto.value = true
}

const diasCustomModal = ref('')

const PLANOS_PADRAO = ['Básico', 'Profissional', 'Enterprise']
const planoOpcao   = ref('Básico')

function onPlanoOpcaoChange() {
  if (planoOpcao.value !== 'personalizado') contratoForm.plano = planoOpcao.value
}

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
  licencaForm.dataAtivacao  = lic?.dataAtivacao?.substring(0, 10)  || ''
  licencaForm.dataVencimento = lic?.dataVencimento?.substring(0, 10) || ''
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
        body: JSON.stringify({ nome: form.nome, slug: form.slug, cnpj: form.cnpj || null, cpfResponsavel: form.cpfResponsavel || null, responsavel: form.responsavel || null, contato: form.contato || null, telefone: form.telefone || null, endereco: form.endereco || null, cidade: form.cidade || null, uf: form.uf || null, observacoes: form.observacoes || null, vendaMobilePermitida: form.vendaMobilePermitida, rfidDisponivel: form.rfidDisponivel }),
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
    const base = lic?.status === 'ativado' && lic.dataVencimento && new Date(lic.dataVencimento) > hoje
      ? new Date(lic.dataVencimento)
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
  const novo = !tenant.value.vendaMobilePermitida
  try {
    await platformFetch(`/platform/tenants/${tenant.value.id}/mobile`, { method: 'PATCH', body: JSON.stringify({ permitida: novo }) })
    tenant.value.vendaMobilePermitida = novo
    showToast('success', novo ? 'Venda pelo Celular habilitada' : 'Venda pelo Celular desabilitada')
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
  finally { togglingMobile.value = false }
}

async function toggleRfid() {
  if (!tenant.value || togglingRfid.value) return
  togglingRfid.value = true
  const novo = !tenant.value.rfidDisponivel
  try {
    await platformFetch(`/platform/tenants/${tenant.value.id}/rfid`, { method: 'PATCH', body: JSON.stringify({ disponivel: novo }) })
    tenant.value.rfidDisponivel = novo
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
  const texto = `Contrato PDV — ${t.nome}\nPlano: ${c?.plano || '—'}\nValor: ${c?.valor ? formatCurrency(c.valor) : '—'}/${c?.ciclo || '—'}\nVigência: ${formatDate(c?.dataInicio)} → ${c?.dataFim ? formatDate(c.dataFim) : 'Indeterminado'}\nContato: ${t.contato || '—'}`
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
  const sNome          = esc(t.nome)
  const sSlug          = esc(t.slug)
  const sCnpj          = esc(t.cnpj)
  const sCpfResponsavel = esc((t as any).cpfResponsavel)
  const sEndereco      = esc(t.endereco)
  const sCidade        = esc((t as any).cidade)
  const sUF            = esc((t as any).uf)
  const sTelefone      = esc(t.telefone)
  const sContato       = esc(t.contato)
  const sResponsavel   = esc(t.responsavel)
  const sPlano         = esc(plano)
  const sObs        = t.observacoes ? esc(t.observacoes).replace(/\n/g, '<br>') : ''
  const ciclo    = c?.ciclo || 'mensal'
  const cicloMap: Record<string, string> = { mensal: 'mensal', trimestral: 'trimestral', semestral: 'semestral', anual: 'anual' }
  const cicloExtMap: Record<string, string> = { mensal: '30 (trinta) dias', trimestral: '3 (três) meses', semestral: '6 (seis) meses', anual: '12 (doze) meses' }
  const inicio   = c?.dataInicio ? new Date(c.dataInicio) : new Date()
  const fim      = c?.dataFim ? new Date(c.dataFim) : null
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
    body { font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; font-size: 11pt; color: #1a1a2e; background: #fff; line-height: 1.75; }
    .page { max-width: 820px; margin: 0 auto; }
    .header-bar { background: linear-gradient(135deg, #1a1f3c 0%, #2d3680 100%); padding: 26px 48px; display: flex; align-items: center; justify-content: space-between; }
    .brand-block { display: flex; align-items: center; gap: 12px; }
    .brand-icon { width: 38px; height: 38px; background: rgba(255,255,255,0.12); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; }
    .brand-name { color: #fff; font-size: 17pt; font-weight: 900; letter-spacing: -0.5px; line-height: 1; display: block; }
    .brand-sub { color: rgba(255,255,255,0.4); font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; display: block; margin-top: 3px; }
    .header-ref { text-align: right; }
    .doc-type { color: rgba(255,255,255,0.75); font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; display: block; }
    .doc-num { color: rgba(255,255,255,0.4); font-size: 8pt; font-weight: 600; margin-top: 4px; display: block; }
    .title-section { background: #f5f6ff; border-bottom: 1px solid #dde0f5; padding: 22px 48px; text-align: center; }
    .contract-title { font-size: 12.5pt; font-weight: 900; color: #1a1f3c; text-transform: uppercase; letter-spacing: 0.8px; }
    .contract-subtitle { font-size: 9.5pt; color: #6b7280; margin-top: 4px; }
    .plano-badge { display: inline-flex; align-items: center; background: #ede9fe; color: #4f46e5; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 3px 12px; border-radius: 999px; margin-top: 8px; }
    .body { padding: 32px 48px 48px; }
    .section-label { font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .section-label::before { content: ''; display: block; width: 18px; height: 2px; background: #4f46e5; border-radius: 2px; flex-shrink: 0; }
    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 32px; }
    .party-card { border-radius: 10px; border: 1px solid #dde0f5; overflow: hidden; }
    .party-card-header { padding: 10px 16px; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
    .party-card-contratada .party-card-header { background: #1a1f3c; color: #fff; }
    .party-card-contratante .party-card-header { background: #4f46e5; color: #fff; }
    .party-card-body { padding: 14px 16px; background: #fafaff; }
    .pfield { margin-bottom: 5px; font-size: 9.5pt; color: #374151; line-height: 1.45; }
    .pfield strong { font-weight: 700; color: #1a1f3c; font-size: 8.5pt; }
    .clauses-label { font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
    .clauses-label::before { content: ''; display: block; width: 18px; height: 2px; background: #4f46e5; border-radius: 2px; flex-shrink: 0; }
    .clause { margin-bottom: 22px; }
    .clause-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .clause-num { width: 26px; height: 26px; border-radius: 7px; background: #1a1f3c; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 8.5pt; font-weight: 900; flex-shrink: 0; text-align: center; line-height: 26px; }
    .clause-title { font-size: 10pt; font-weight: 800; color: #1a1f3c; text-transform: uppercase; letter-spacing: 0.4px; }
    .clause p { margin-bottom: 8px; text-align: justify; font-size: 10.5pt; color: #374151; }
    .clause ol { padding-left: 22px; margin-top: 6px; margin-bottom: 8px; }
    .clause ol li { margin-bottom: 5px; text-align: justify; font-size: 10.5pt; color: #374151; }
    .clause .paragrafo { margin-top: 8px; font-size: 10.5pt; text-align: justify; color: #374151; padding: 10px 14px; background: #f5f6ff; border-left: 3px solid #4f46e5; border-radius: 0 6px 6px 0; }
    .clause .paragrafo::before { content: "Parágrafo único. "; font-weight: 800; }
    .notes-box { background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-bottom: 28px; font-size: 10.5pt; color: #374151; }
    .sig-section { margin-top: 44px; padding-top: 20px; border-top: 2px solid #dde0f5; }
    .sig-city { font-size: 10.5pt; color: #374151; margin-bottom: 50px; text-align: center; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 32px; }
    .sig-block { text-align: center; }
    .sig-line-el { border-top: 1.5px solid #374151; margin-bottom: 8px; }
    .sig-name { font-size: 10pt; font-weight: 700; color: #1a1f3c; }
    .sig-role { font-size: 8.5pt; color: #6b7280; margin-top: 2px; }
    .witness-label { font-size: 8.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 24px; }
    .witness-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
    .witness-block { text-align: center; }
    .witness-field { font-size: 9pt; color: #6b7280; margin-top: 6px; }
    .footer { padding: 14px 48px; background: #f5f6ff; border-top: 1px solid #dde0f5; display: flex; justify-content: space-between; align-items: center; font-size: 8pt; color: #9ca3af; }
    .footer-brand { font-weight: 800; color: #1a1f3c; }
    @media print {
      body { font-size: 10.5pt; }
      .page { padding: 0; }
      @page { margin: 2cm 1.8cm; }
      .header-bar, .party-card-contratada .party-card-header, .party-card-contratante .party-card-header, .clause-num, .clause .paragrafo, .title-section, .footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header-bar">
    <div class="brand-block">
      <div class="brand-icon">⚡</div>
      <div>
        <span class="brand-name">Restaurante PDV</span>
        <span class="brand-sub">Sistema de Gestão PDV</span>
      </div>
    </div>
    <div class="header-ref">
      <span class="doc-type">Contrato de Prestação de Serviços</span>
      <span class="doc-num">Ref.: ${sSlug.toUpperCase()}-${inicio.getFullYear()}</span>
    </div>
  </div>

  <div class="title-section">
    <div class="contract-title">Contrato de Prestação de Serviços de Tecnologia</div>
    <div class="contract-subtitle">Modalidade SaaS — Sistema de Ponto de Venda</div>
    <div class="plano-badge">Plano ${sPlano}</div>
  </div>

  <div class="body">

    <div class="section-label">Partes Contratantes</div>
    <div class="parties-grid">
      <div class="party-card party-card-contratada">
        <div class="party-card-header">Contratada</div>
        <div class="party-card-body">
          <p class="pfield"><strong>Razão Social:</strong> ${CONTRATADA.razaoSocial}</p>
          <p class="pfield"><strong>Nome Fantasia:</strong> ${CONTRATADA.nomeFantasia}</p>
          <p class="pfield"><strong>CNPJ:</strong> ${CONTRATADA.cnpj} · IE ${CONTRATADA.inscricaoEstadual}</p>
          <p class="pfield"><strong>Endereço:</strong> ${CONTRATADA.endereco}, ${CONTRATADA.bairro}, ${CONTRATADA.cidade}/${CONTRATADA.uf} — CEP ${CONTRATADA.cep}</p>
          <p class="pfield"><strong>Contato:</strong> ${CONTRATADA.telefone} · ${CONTRATADA.email}</p>
          <p class="pfield"><strong>Representante:</strong> ${CONTRATADA.representante} · CPF ${CONTRATADA.cpfRepresentante}</p>
        </div>
      </div>
      <div class="party-card party-card-contratante">
        <div class="party-card-header">Contratante</div>
        <div class="party-card-body">
          <p class="pfield"><strong>Razão Social / Nome:</strong> ${sNome}</p>
          <p class="pfield"><strong>CNPJ / CPF:</strong> ${sCnpj || '___________________________________'}</p>
          <p class="pfield"><strong>Endereço:</strong> ${sEndereco || '______________________________________'}</p>
          <p class="pfield"><strong>Cidade / UF:</strong> ${sCidade || '_______________________'} / ${sUF || '___'}</p>
          <p class="pfield"><strong>Contato:</strong> ${sTelefone || '_______________________'} · ${sContato || '_______________________________'}</p>
          <p class="pfield"><strong>Representante:</strong> ${sResponsavel || '______________________________'} · CPF ${sCpfResponsavel || '___________________'}</p>
        </div>
      </div>
    </div>

    <div class="clauses-label">Cláusulas Contratuais</div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">1</div>
        <div class="clause-title">Do Objeto</div>
      </div>
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
      <div class="clause-header">
        <div class="clause-num">2</div>
        <div class="clause-title">Da Vigência</div>
      </div>
      <p>O presente contrato vigorará ${vigencia}, renovando-se automaticamente por períodos sucessivos de
      ${cicloExtMap[ciclo] || '30 (trinta) dias'}, salvo notificação de não renovação por qualquer das partes,
      realizada com antecedência mínima de 30 (trinta) dias antes do término do período vigente,
      por e-mail ou notificação escrita.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">3</div>
        <div class="clause-title">Do Valor e Forma de Pagamento</div>
      </div>
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
      <div class="clause-header">
        <div class="clause-num">4</div>
        <div class="clause-title">Das Obrigações da Contratada</div>
      </div>
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
      <div class="clause-header">
        <div class="clause-num">5</div>
        <div class="clause-title">Das Obrigações da Contratante</div>
      </div>
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
      <div class="clause-header">
        <div class="clause-num">6</div>
        <div class="clause-title">Da Propriedade Intelectual</div>
      </div>
      <p>O sistema <strong>Restaurante PDV</strong> e todos os seus componentes — incluindo código-fonte,
      interfaces, algoritmos, documentação e marca — são de propriedade exclusiva da CONTRATADA, protegidos
      pela Lei nº 9.609/1998 (Lei de Software) e pela Lei nº 9.610/1998 (Lei de Direitos Autorais).</p>
      <p class="paragrafo">Este contrato confere à CONTRATANTE licença de uso não exclusiva, intransferível
      e revogável do software, pelo período de vigência contratual. Não implica cessão, transferência ou
      sublicenciamento de quaisquer direitos de propriedade intelectual.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">7</div>
        <div class="clause-title">Da Confidencialidade e Proteção de Dados (LGPD)</div>
      </div>
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
      <div class="clause-header">
        <div class="clause-num">8</div>
        <div class="clause-title">Da Limitação de Responsabilidade</div>
      </div>
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
      <div class="clause-header">
        <div class="clause-num">9</div>
        <div class="clause-title">Da Rescisão</div>
      </div>
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
      <div class="clause-header">
        <div class="clause-num">10</div>
        <div class="clause-title">Das Disposições Gerais</div>
      </div>
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
      <div class="clause-header">
        <div class="clause-num">11</div>
        <div class="clause-title">Do Foro</div>
      </div>
      <p>Fica eleito o foro da Comarca de <strong>${CONTRATADA.foroCidade}/${CONTRATADA.foroUF}</strong>
      para dirimir quaisquer controvérsias oriundas deste instrumento, com renúncia expressa a qualquer
      outro, por mais privilegiado que seja, ressalvados os casos em que a legislação imponha foro
      diverso de forma imperativa.</p>
    </div>

    ${sObs ? `<div class="notes-box"><strong>Condições específicas / Observações:</strong><br>${sObs}</div>` : ''}

    <div class="sig-section">
      <p class="sig-city">${CONTRATADA.foroCidade}/${CONTRATADA.foroUF}, _______ de __________________ de _______</p>
      <div class="sig-grid">
        <div class="sig-block">
          <div class="sig-line-el"></div>
          <div class="sig-name">${sNome}</div>
          <div class="sig-role">CONTRATANTE</div>
        </div>
        <div class="sig-block">
          <div class="sig-line-el"></div>
          <div class="sig-name">${CONTRATADA.representante}</div>
          <div class="sig-role">CONTRATADA — ${CONTRATADA.cargoRepresentante}</div>
        </div>
      </div>
      <div style="margin-top:8px;">
        <div class="witness-label">Testemunhas:</div>
        <div class="witness-grid">
          <div class="witness-block">
            <div class="sig-line-el"></div>
            <div class="witness-field">Nome: ___________________________ CPF: ___________________</div>
          </div>
          <div class="witness-block">
            <div class="sig-line-el"></div>
            <div class="witness-field">Nome: ___________________________ CPF: ___________________</div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <div class="footer">
    <span><span class="footer-brand">Restaurante PDV</span> · ${CONTRATADA.razaoSocial} · CNPJ ${CONTRATADA.cnpj}</span>
    <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${sNome} · Plano ${sPlano}</span>
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
/* Select precisa de bg sólido — browser nativo pode ignorar bg transparente */
select.input-field { background-color: #16161f; color-scheme: dark; }
select.input-field option { background-color: #14141f; color: white; }
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
.nav-active { @apply bg-white/[0.06]; }
</style>
