<template>
  <div class="min-h-screen bg-[#0a0a0f]">

    <!-- ══ TOPBAR ══ -->
    <header class="sticky top-0 z-30 border-b border-white/[0.05]" style="background: rgba(10,10,15,0.85); backdrop-filter: blur(20px);">
      <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="absolute inset-0 rounded-xl bg-violet-600 blur-md opacity-50"></div>
            <div class="relative w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg">
              <Globe :size="13" class="text-white" />
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-white font-black text-sm tracking-tight">Plataforma</span>
            <span class="text-white/25 text-[10px] font-bold uppercase tracking-widest hidden sm:inline">PDV · Super Admin</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 border border-white/[0.06] bg-white/[0.03]">
            <div class="w-5 h-5 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
              <span class="text-[9px] font-black text-violet-400">{{ initials }}</span>
            </div>
            <span class="text-white/60 text-xs font-semibold">{{ platformAuth.user?.nome }}</span>
            <span class="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-400 uppercase tracking-wide">
              {{ platformAuth.user?.role }}
            </span>
          </div>
          <button @click="handleLogout"
            class="h-8 w-8 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-all"
            title="Sair">
            <LogOut :size="14" />
          </button>
        </div>
      </div>
    </header>

    <!-- ══ HERO ══ -->
    <div class="relative overflow-hidden border-b border-white/[0.04]">
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-600/[0.08] blur-3xl"></div>
        <div class="absolute -top-16 right-0 w-80 h-80 rounded-full bg-indigo-600/[0.05] blur-3xl"></div>
      </div>
      <div class="relative max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <p class="text-white/30 text-xs font-bold uppercase tracking-widest mb-1">{{ diaSemana }}, {{ dataHoje }}</p>
          <h1 class="text-2xl font-black text-white tracking-tight">Visão geral</h1>
          <p class="text-white/35 text-sm mt-1">
            <span class="text-violet-400 font-bold">{{ dashboard?.totais?.ativos ?? 0 }}</span> restaurantes ativos
            <span v-if="(dashboard?.alertas?.length ?? 0) > 0">
              · <span class="text-amber-400 font-bold">{{ dashboard?.alertas?.length }}</span> {{ dashboard!.alertas.length === 1 ? 'alerta' : 'alertas' }}
            </span>
          </p>
        </div>
        <button @click="abrirModal(null)"
          class="group h-10 px-5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-sm font-black transition-all flex items-center gap-2 shadow-lg shadow-violet-500/25 self-start sm:self-auto shrink-0">
          <Plus :size="14" />
          Novo restaurante
        </button>
      </div>
    </div>

    <!-- ══ CONTEÚDO ══ -->
    <main class="max-w-6xl mx-auto px-6 py-7 space-y-7">

      <!-- ── LOADING ── -->
      <div v-if="loading" class="flex items-center justify-center py-24">
        <div class="flex flex-col items-center gap-3">
          <Loader2 :size="24" class="animate-spin text-violet-500" />
          <p class="text-white/30 text-xs font-bold">Carregando...</p>
        </div>
      </div>

      <template v-else>

        <!-- ── ALERTAS ── -->
        <div v-if="dashboard?.alertas?.length" class="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05]">
            <div class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
            <p class="text-[11px] font-black uppercase tracking-widest text-white/40">Atenção necessária</p>
            <span class="ml-auto text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
              {{ dashboard.alertas.length }}
            </span>
          </div>
          <NuxtLink v-for="(a, i) in dashboard.alertas" :key="a.tenant_id"
            :to="`/platform/tenants/${a.tenant_id}`"
            class="flex items-center gap-4 px-4 py-3 transition-all hover:bg-white/[0.03] group/alert"
            :class="i < dashboard.alertas.length - 1 ? 'border-b border-white/[0.04]' : ''">
            <div class="w-1 self-stretch rounded-full shrink-0" :class="alertaBarColor(a.tipo)"></div>
            <component :is="alertaStyle(a.tipo).icon" :size="13" :class="alertaStyle(a.tipo).icon_color" class="shrink-0" />
            <div class="flex-1 min-w-0">
              <span class="text-sm font-bold text-white">{{ a.nome }}</span>
              <span class="text-sm font-normal" :class="alertaStyle(a.tipo).text"> {{ alertaDescricao(a) }}</span>
            </div>
            <ChevronRight :size="13" class="text-white/15 group-hover/alert:text-white/40 transition-colors shrink-0" />
          </NuxtLink>
        </div>

        <!-- ── MÉTRICAS ── -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Total -->
          <div class="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <p class="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Restaurantes</p>
            <p class="text-4xl font-black text-white leading-none mb-2">{{ dashboard?.totais?.tenants ?? tenants.length }}</p>
            <div class="flex items-center gap-2">
              <span class="text-[11px] text-emerald-400 font-bold">{{ dashboard?.totais?.ativos ?? 0 }} ativos</span>
              <span v-if="(dashboard?.totais?.suspensos ?? 0) > 0" class="text-[11px] text-amber-400 font-bold">· {{ dashboard?.totais?.suspensos }} suspensos</span>
            </div>
          </div>

          <!-- MRR — destaque -->
          <div class="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
            <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
            <p class="text-[10px] font-black uppercase tracking-widest text-emerald-400/60 mb-3">MRR</p>
            <p class="text-2xl font-black text-emerald-400 leading-none mb-2 truncate">{{ formatCurrency(dashboard?.financeiro?.mrr ?? 0) }}</p>
            <p class="text-[11px] text-white/25">ARR {{ formatCurrency(dashboard?.financeiro?.arr ?? 0) }}</p>
          </div>

          <!-- Licenças -->
          <div class="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
            :class="(dashboard?.licencas?.bloqueadas ?? 0) > 0 ? 'border-red-500/15' : ''">
            <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <p class="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Licenças ativas</p>
            <p class="text-4xl font-black text-white leading-none mb-2">{{ dashboard?.licencas?.ativas ?? 0 }}</p>
            <div class="flex items-center gap-2 flex-wrap">
              <span v-if="(dashboard?.licencas?.pendentes ?? 0) > 0" class="text-[11px] text-amber-400 font-bold">{{ dashboard?.licencas?.pendentes }} pendente(s)</span>
              <span v-if="(dashboard?.licencas?.bloqueadas ?? 0) > 0" class="text-[11px] text-red-400 font-bold">{{ dashboard?.licencas?.bloqueadas }} bloqueada(s)</span>
              <span v-if="!(dashboard?.licencas?.pendentes) && !(dashboard?.licencas?.bloqueadas)" class="text-[11px] text-white/25">tudo ok</span>
            </div>
          </div>

          <!-- Vencimentos -->
          <div class="relative overflow-hidden rounded-2xl border p-5"
            :class="vencClass.card">
            <div class="absolute top-0 left-0 right-0 h-px" :class="vencClass.line"></div>
            <p class="text-[10px] font-black uppercase tracking-widest mb-3" :class="vencClass.label">Vencimentos</p>
            <p class="text-4xl font-black leading-none mb-2" :class="vencClass.number">
              {{ (dashboard?.licencas?.vencidas ?? 0) + (dashboard?.licencas?.vencendo ?? 0) }}
            </p>
            <p class="text-[11px] font-bold" :class="vencClass.sub">
              {{ (dashboard?.licencas?.vencidas ?? 0) > 0
                ? `${dashboard?.licencas?.vencidas} vencida(s)`
                : (dashboard?.licencas?.vencendo ?? 0) > 0
                  ? `${dashboard?.licencas?.vencendo} nos próximos 30d`
                  : 'nenhum nos próximos 30d' }}
            </p>
          </div>
        </div>

        <!-- ── RECEITA POR PLANO + FEATURES ── -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Receita breakdown -->
          <div class="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div class="flex items-center justify-between mb-5">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp :size="13" class="text-emerald-400" />
                </div>
                <span class="text-sm font-black text-white">Receita por plano</span>
              </div>
              <div class="flex items-center gap-4 text-right">
                <div>
                  <p class="text-[9px] font-black uppercase tracking-widest text-white/25">MRR</p>
                  <p class="text-sm font-black text-emerald-400">{{ formatCurrency(dashboard?.financeiro?.mrr ?? 0) }}</p>
                </div>
                <div>
                  <p class="text-[9px] font-black uppercase tracking-widest text-white/25">ARR</p>
                  <p class="text-sm font-black text-white/60">{{ formatCurrency(dashboard?.financeiro?.arr ?? 0) }}</p>
                </div>
              </div>
            </div>

            <div v-if="dashboard?.financeiro?.por_plano?.length" class="space-y-3">
              <div v-for="p in dashboard.financeiro.por_plano" :key="p.plano" class="group/plano">
                <div class="flex items-center justify-between mb-1.5">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-bold text-white/80">{{ p.plano }}</span>
                    <span class="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/[0.06] text-white/40">{{ p.count }}x</span>
                  </div>
                  <span class="text-sm font-black text-emerald-400">{{ formatCurrency(p.mrr) }}<span class="text-white/25 text-[11px] font-normal">/mês</span></span>
                </div>
                <div class="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div class="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                    :style="{ width: maxMrr > 0 ? `${(p.mrr / maxMrr) * 100}%` : '0%' }" />
                </div>
              </div>
            </div>
            <div v-else class="flex items-center justify-center py-8">
              <p class="text-white/20 text-sm">Nenhum contrato ativo</p>
            </div>
          </div>

          <!-- Features stats -->
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col gap-4">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                <Zap :size="13" class="text-white/50" />
              </div>
              <span class="text-sm font-black text-white">Features</span>
            </div>
            <div class="flex-1 space-y-3">
              <div class="flex items-center justify-between p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/10">
                <div class="flex items-center gap-2.5">
                  <CreditCard :size="14" class="text-violet-400" />
                  <span class="text-sm font-bold text-white/80">RFID</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xl font-black text-violet-400">{{ tenants.filter(t => t.rfid_disponivel).length }}</span>
                  <span class="text-[11px] text-white/25">/ {{ tenants.length }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between p-3 rounded-xl bg-sky-500/[0.06] border border-sky-500/10">
                <div class="flex items-center gap-2.5">
                  <Smartphone :size="14" class="text-sky-400" />
                  <span class="text-sm font-bold text-white/80">Mobile</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xl font-black text-sky-400">{{ tenants.filter(t => t.venda_mobile_permitida).length }}</span>
                  <span class="text-[11px] text-white/25">/ {{ tenants.length }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── LISTA DE TENANTS ── -->
        <div>
          <div class="flex items-center justify-between gap-4 mb-4">
            <div class="flex items-center gap-3">
              <h2 class="text-sm font-black text-white uppercase tracking-wide">Restaurantes</h2>
              <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40">{{ tenantsFiltrados.length }}</span>
            </div>
            <div class="relative">
              <Search :size="13" class="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
              <input v-model="busca" type="text" placeholder="Buscar restaurante..."
                class="h-8 pl-8 pr-4 bg-white/[0.04] border border-white/[0.07] rounded-xl text-white text-xs placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.06] transition-all w-44 sm:w-56" />
            </div>
          </div>

          <!-- Erro -->
          <div v-if="erro" class="text-center py-12 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <AlertCircle :size="24" class="text-red-400 mx-auto mb-3" />
            <p class="text-white/50 text-sm font-bold mb-2">{{ erro }}</p>
            <button @click="carregar" class="text-violet-400 text-xs font-bold hover:text-violet-300 transition-colors">Tentar novamente</button>
          </div>

          <!-- Vazio -->
          <div v-else-if="!tenantsFiltrados.length" class="text-center py-12 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <Store :size="24" class="text-white/15 mx-auto mb-3" />
            <p class="text-white/25 text-sm font-bold">Nenhum restaurante encontrado</p>
          </div>

          <!-- Lista -->
          <div v-else class="rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.05]">
            <div v-for="tenant in tenantsFiltrados" :key="tenant.id"
              class="flex flex-col sm:flex-row sm:items-center bg-white/[0.015] hover:bg-white/[0.03] transition-colors group">

              <!-- Avatar + info clicável -->
              <NuxtLink :to="`/platform/tenants/${tenant.id}`"
                class="flex items-center gap-4 px-5 py-4 flex-1 min-w-0 cursor-pointer">
                <!-- Avatar com inicial -->
                <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm select-none"
                  :class="avatarColor(tenant.nome)">
                  {{ tenant.nome[0].toUpperCase() }}
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-sm font-bold text-white group-hover:text-violet-200 transition-colors truncate">{{ tenant.nome }}</span>
                    <!-- Dot de status -->
                    <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="statusDot(tenant.status)"></span>
                    <span v-if="tenant.licencas?.[0]"
                      class="text-[10px] font-black px-1.5 py-0.5 rounded-md shrink-0"
                      :class="licencaBadge(tenant.licencas[0].status)">
                      {{ licencaLabel(tenant.licencas[0]) }}
                    </span>
                    <span v-if="tenant.contratos?.[0]"
                      class="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 shrink-0">
                      {{ tenant.contratos[0].plano }}
                    </span>
                  </div>
                  <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span class="text-white/25 text-[11px] font-mono">{{ tenant.slug }}</span>
                    <span v-if="tenant.responsavel" class="text-white/20 text-[11px]">· {{ tenant.responsavel }}</span>
                  </div>
                </div>

                <!-- Features inline -->
                <div class="hidden md:flex items-center gap-1.5 shrink-0 mr-2">
                  <span v-if="tenant.rfid_disponivel" title="RFID ativo"
                    class="w-6 h-6 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <CreditCard :size="11" class="text-violet-400" />
                  </span>
                  <span v-if="tenant.venda_mobile_permitida" title="Mobile ativo"
                    class="w-6 h-6 rounded-lg bg-sky-500/10 flex items-center justify-center">
                    <Smartphone :size="11" class="text-sky-400" />
                  </span>
                </div>

                <ChevronRight :size="14" class="text-white/[0.08] group-hover:text-white/30 transition-colors shrink-0" />
              </NuxtLink>

              <!-- Ações rápidas -->
              <div class="flex items-center gap-1.5 px-4 pb-3 sm:pb-0 sm:pr-4 pl-[60px] sm:pl-0 shrink-0">
                <button @click="toggleRfid(tenant)" :disabled="togglingId === tenant.id"
                  class="w-7 h-7 rounded-lg flex items-center justify-center border transition-all"
                  :class="tenant.rfid_disponivel
                    ? 'bg-violet-500/15 border-violet-500/25 hover:bg-violet-500/25'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]'"
                  :title="tenant.rfid_disponivel ? 'Desabilitar RFID' : 'Habilitar RFID'">
                  <Loader2 v-if="togglingId === tenant.id" :size="11" class="animate-spin text-violet-400" />
                  <CreditCard v-else :size="11" :class="tenant.rfid_disponivel ? 'text-violet-400' : 'text-white/20'" />
                </button>

                <button @click="toggleStatus(tenant)"
                  class="w-7 h-7 rounded-lg flex items-center justify-center border transition-all group/st"
                  :class="tenant.status === 'ativo'
                    ? 'bg-emerald-500/10 border-emerald-500/15 hover:bg-red-500/10 hover:border-red-500/15'
                    : 'bg-amber-500/10 border-amber-500/15 hover:bg-emerald-500/10 hover:border-emerald-500/15'"
                  :title="tenant.status === 'ativo' ? 'Suspender' : 'Reativar'">
                  <ToggleRight v-if="tenant.status === 'ativo'" :size="11" class="text-emerald-400 group-hover/st:text-red-400 transition-colors" />
                  <ToggleLeft  v-else :size="11" class="text-amber-400 group-hover/st:text-emerald-400 transition-colors" />
                </button>

                <button @click="abrirModal(tenant)"
                  class="h-7 px-2.5 rounded-lg text-[11px] font-black text-white/30 hover:text-white/70 hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/10 transition-all flex items-center gap-1">
                  <Pencil :size="10" /> Editar
                </button>
              </div>
            </div>
          </div>
        </div>

      </template>
    </main>

    <!-- ══ MODAL CRIAR / EDITAR ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modalAberto"
          class="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 overflow-y-auto"
          style="background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);"
          @click.self="fecharModal">
          <div class="bg-[#111118] border border-white/[0.09] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div class="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                  <Building2 :size="15" class="text-violet-400" />
                </div>
                <div>
                  <h2 class="text-sm font-black text-white">{{ form.id ? 'Editar restaurante' : 'Novo restaurante' }}</h2>
                  <p v-if="form.id" class="text-white/25 text-[10px] font-mono">{{ form.slug }}</p>
                </div>
              </div>
              <button @click="fecharModal"
                class="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-red-500/15 hover:text-red-400 text-white/30 flex items-center justify-center transition-all">
                <X :size="13" />
              </button>
            </div>

            <!-- Abas -->
            <div class="flex gap-1 px-5 pt-4 border-b border-white/[0.05] pb-3">
              <button v-for="aba in abas" :key="aba.id" @click="abaAtiva = aba.id"
                class="flex items-center gap-1.5 h-7 px-3 rounded-lg text-[11px] font-black transition-all"
                :class="abaAtiva === aba.id ? 'bg-violet-600 text-white' : 'text-white/35 hover:text-white/60 hover:bg-white/[0.05]'">
                <component :is="aba.icon" :size="10" />{{ aba.label }}
              </button>
            </div>

            <!-- ABA DADOS -->
            <div v-if="abaAtiva === 'dados'" class="p-5 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="sm:col-span-2">
                  <label class="label-field">Nome do restaurante *</label>
                  <input v-model="form.nome" @input="autoSlug" type="text" placeholder="Ex: Restaurante Tarantela" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Slug *</label>
                  <input v-model="form.slug" type="text" placeholder="ex: tarantela" class="input-field font-mono text-xs" />
                  <p class="text-[10px] text-white/20 mt-1">Identificador único da URL</p>
                </div>
                <div>
                  <label class="label-field">CNPJ</label>
                  <input v-model="form.cnpj" type="text" placeholder="00.000.000/0001-00" class="input-field font-mono text-xs" />
                </div>
                <div>
                  <label class="label-field">Responsável</label>
                  <input v-model="form.responsavel" type="text" placeholder="Nome do responsável" class="input-field" />
                </div>
                <div>
                  <label class="label-field">E-mail</label>
                  <input v-model="form.contato" type="email" placeholder="contato@restaurante.com" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Telefone</label>
                  <input v-model="form.telefone" type="text" placeholder="(62) 9 9999-9999" class="input-field" />
                </div>
                <div>
                  <label class="label-field">Endereço</label>
                  <input v-model="form.endereco" type="text" placeholder="Rua, número, bairro" class="input-field" />
                </div>
                <div class="sm:col-span-2">
                  <label class="label-field">Observações</label>
                  <textarea v-model="form.observacoes" rows="2" placeholder="Anotações internas..." class="input-field resize-none"></textarea>
                </div>
              </div>
              <div class="border-t border-white/[0.06] pt-4 space-y-3">
                <p class="text-[10px] font-black uppercase tracking-widest text-white/25">Features</p>
                <div v-for="feat in features" :key="feat.key" class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-bold text-white/80">{{ feat.label }}</p>
                    <p class="text-[11px] text-white/25">{{ feat.desc }}</p>
                  </div>
                  <button @click="(form as any)[feat.key] = !(form as any)[feat.key]"
                    class="w-10 h-5 rounded-full transition-all relative shrink-0"
                    :class="(form as any)[feat.key] ? feat.on : 'bg-white/[0.08]'">
                    <span class="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      :class="(form as any)[feat.key] ? 'left-[22px]' : 'left-0.5'" />
                  </button>
                </div>
              </div>
            </div>

            <!-- ABA LICENÇA -->
            <div v-else-if="abaAtiva === 'licenca'" class="p-5">
              <div v-if="!form.id" class="text-center py-10 text-white/25 text-sm">
                Salve o restaurante primeiro para gerenciar a licença.
              </div>
              <div v-else class="space-y-4">
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
                <div v-if="licencaAtual" class="text-[10px] text-white/25 pt-1">
                  Criada em {{ formatDate(licencaAtual.createdAt) }}
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
                {{ salvando ? 'Salvando...' : (form.id ? 'Salvar' : 'Criar restaurante') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toast.text"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold shadow-2xl border"
        :class="toast.type === 'success'
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 backdrop-blur-xl'
          : 'bg-red-500/10 border-red-500/20 text-red-300 backdrop-blur-xl'">
        <CheckCircle2 v-if="toast.type === 'success'" :size="14" />
        <AlertCircle  v-else :size="14" />
        {{ toast.text }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import {
  Globe, LogOut, Search, Plus, Building2, CreditCard, Smartphone,
  Loader2, AlertCircle, CheckCircle2, Pencil, X, Store, FileText, ChevronRight,
  ToggleRight, ToggleLeft, Clock, TrendingUp, Zap,
} from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'

definePageMeta({ layout: false })

interface Licenca  { id: string; status: string; dataAtivacao: string | null; dataVencimento: string | null; createdAt: string }
interface Contrato { id: string; plano: string; valor: string | null; ciclo: string; status: string }
interface Tenant {
  id: string; nome: string; slug: string; cnpj: string | null; contato: string | null
  responsavel: string | null; telefone: string | null; endereco: string | null; observacoes: string | null
  status: string; rfid_disponivel: boolean; venda_mobile_permitida: boolean; created_at: string
  licencas: Licenca[]; contratos: Contrato[]
}
interface Dashboard {
  totais:     { tenants: number; ativos: number; suspensos: number }
  licencas:   { ativas: number; pendentes: number; bloqueadas: number; vencendo: number; vencidas: number }
  financeiro: { mrr: number; arr: number; por_plano: { plano: string; count: number; mrr: number }[] }
  alertas:    { tenant_id: string; nome: string; tipo: string; dias?: number }[]
}

const platformAuth  = usePlatformAuthStore()
const runtimeConfig = useRuntimeConfig()

const tenants    = ref<Tenant[]>([])
const dashboard  = ref<Dashboard | null>(null)
const loading    = ref(false)
const erro       = ref('')
const busca      = ref('')
const togglingId = ref<string | null>(null)
const toast      = reactive({ text: '', type: 'success' as 'success' | 'error' })

const modalAberto  = ref(false)
const abaAtiva     = ref<'dados' | 'licenca'>('dados')
const salvando     = ref(false)
const erroModal    = ref('')
const licencaAtual = ref<Licenca | null>(null)

const abas = [
  { id: 'dados',   label: 'Dados',   icon: Building2 },
  { id: 'licenca', label: 'Licença', icon: FileText   },
]
const licencaStatuses = [
  { value: 'ativado',   label: 'Ativada',   activeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
  { value: 'pendente',  label: 'Pendente',  activeClass: 'bg-amber-500/15  border-amber-500/30  text-amber-400'  },
  { value: 'bloqueado', label: 'Bloqueada', activeClass: 'bg-red-500/15    border-red-500/30    text-red-400'    },
]
const features = [
  { key: 'vendaMobilePermitida', label: 'Venda Mobile', desc: 'Acesso via QR Code e dispositivo móvel', on: 'bg-sky-500' },
  { key: 'rfidDisponivel', label: 'RFID', desc: 'Autenticação por cartão (feature paga)', on: 'bg-violet-500' },
]
const form = reactive({ id: null as string | null, nome: '', slug: '', cnpj: '', responsavel: '', contato: '', telefone: '', endereco: '', observacoes: '', vendaMobilePermitida: true, rfidDisponivel: false })
const licencaForm = reactive({ status: 'pendente', dataAtivacao: '', dataVencimento: '' })

const baseUrl  = computed(() => (runtimeConfig.public as any).apiUrl as string)
const maxMrr   = computed(() => Math.max(...(dashboard.value?.financeiro?.por_plano?.map(p => p.mrr) ?? [0]), 0))
const initials = computed(() => platformAuth.user?.nome?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? 'SA')

const diaSemana = computed(() => new Date().toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase()))
const dataHoje  = computed(() => new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }))

const vencClass = computed(() => {
  const vencidas = dashboard.value?.licencas?.vencidas ?? 0
  const vencendo = dashboard.value?.licencas?.vencendo ?? 0
  if (vencidas > 0) return { card: 'border-red-500/20 bg-red-500/[0.03]', line: 'bg-gradient-to-r from-transparent via-red-500/30 to-transparent', label: 'text-red-400/60', number: 'text-red-400', sub: 'text-red-400/60' }
  if (vencendo > 0) return { card: 'border-amber-500/20 bg-amber-500/[0.03]', line: 'bg-gradient-to-r from-transparent via-amber-500/30 to-transparent', label: 'text-amber-400/60', number: 'text-amber-400', sub: 'text-amber-400/60' }
  return { card: 'border-white/[0.06] bg-white/[0.02]', line: 'bg-gradient-to-r from-transparent via-white/10 to-transparent', label: 'text-white/30', number: 'text-white', sub: 'text-white/25' }
})

const tenantsFiltrados = computed(() => {
  const q = busca.value.toLowerCase().trim()
  if (!q) return tenants.value
  return tenants.value.filter(t => t.nome.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q) || (t.responsavel || '').toLowerCase().includes(q))
})

// Avatar com cor baseada na letra inicial
const AVATAR_COLORS = [
  'bg-violet-500/20 text-violet-300', 'bg-sky-500/20 text-sky-300',
  'bg-emerald-500/20 text-emerald-300', 'bg-amber-500/20 text-amber-300',
  'bg-rose-500/20 text-rose-300', 'bg-indigo-500/20 text-indigo-300',
  'bg-teal-500/20 text-teal-300', 'bg-orange-500/20 text-orange-300',
]
function avatarColor(nome: string) { return AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length] }
function statusDot(s: string) { return s === 'ativo' ? 'bg-emerald-400' : s === 'suspenso' ? 'bg-amber-400' : 'bg-red-400' }
function licencaBadge(s: string) { return s === 'ativado' ? 'bg-sky-500/10 text-sky-400' : s === 'pendente' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400' }
function licencaLabel(lic: Licenca) {
  if (lic.status === 'ativado' && lic.dataVencimento) {
    const d = Math.ceil((new Date(lic.dataVencimento).getTime() - Date.now()) / 86400000)
    if (d < 0)  return 'Expirada'
    if (d <= 7) return `${d}d restantes`
    return `Até ${formatDate(lic.dataVencimento)}`
  }
  return lic.status === 'ativado' ? 'Ativa' : lic.status === 'pendente' ? 'Pendente' : 'Bloqueada'
}

function alertaBarColor(tipo: string) {
  if (tipo === 'licenca_vencida' || tipo === 'licenca_critica') return 'bg-red-500'
  if (tipo === 'licenca_vencendo') return 'bg-amber-500'
  return 'bg-orange-500'
}
function alertaStyle(tipo: string) {
  if (tipo === 'licenca_vencida' || tipo === 'licenca_critica') return { icon: AlertCircle, icon_color: 'text-red-400', text: 'text-white/50' }
  if (tipo === 'licenca_vencendo') return { icon: Clock, icon_color: 'text-amber-400', text: 'text-white/50' }
  return { icon: AlertCircle, icon_color: 'text-orange-400', text: 'text-white/50' }
}
function alertaDescricao(a: { tipo: string; dias?: number }) {
  if (a.tipo === 'licenca_vencida')  return '— licença vencida'
  if (a.tipo === 'licenca_critica')  return `— vence em ${a.dias} dia(s)`
  if (a.tipo === 'licenca_vencendo') return `— vence em ${a.dias} dias`
  return '— inadimplente'
}

function formatDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function formatCurrency(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function slugify(s: string) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
function autoSlug() { if (!form.id) form.slug = slugify(form.nome) }
function showToast(type: 'success' | 'error', text: string) { toast.type = type; toast.text = text; setTimeout(() => { toast.text = '' }, 3000) }

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
  try {
    const [t, d] = await Promise.all([
      platformFetch<Tenant[]>('/platform/tenants'),
      platformFetch<Dashboard>('/platform/tenants/dashboard'),
    ])
    tenants.value = t; dashboard.value = d
  } catch (e: any) { erro.value = e?.message || 'Erro ao carregar' }
  finally { loading.value = false }
}

function abrirModal(tenant: Tenant | null) {
  erroModal.value = ''; abaAtiva.value = 'dados'; licencaAtual.value = null
  if (tenant) {
    Object.assign(form, { id: tenant.id, nome: tenant.nome, slug: tenant.slug, cnpj: tenant.cnpj || '', responsavel: tenant.responsavel || '', contato: tenant.contato || '', telefone: tenant.telefone || '', endereco: tenant.endereco || '', observacoes: tenant.observacoes || '', vendaMobilePermitida: tenant.venda_mobile_permitida, rfidDisponivel: tenant.rfid_disponivel })
    const lic = tenant.licencas?.[0]
    if (lic) { licencaAtual.value = lic; licencaForm.status = lic.status; licencaForm.dataAtivacao = lic.dataAtivacao?.substring(0, 10) || ''; licencaForm.dataVencimento = lic.dataVencimento?.substring(0, 10) || '' }
    else { licencaForm.status = 'pendente'; licencaForm.dataAtivacao = ''; licencaForm.dataVencimento = '' }
  } else {
    Object.assign(form, { id: null, nome: '', slug: '', cnpj: '', responsavel: '', contato: '', telefone: '', endereco: '', observacoes: '', vendaMobilePermitida: true, rfidDisponivel: false })
    licencaForm.status = 'pendente'; licencaForm.dataAtivacao = ''; licencaForm.dataVencimento = ''
  }
  modalAberto.value = true
}
function fecharModal() { modalAberto.value = false }

async function salvar() {
  erroModal.value = ''
  if (!form.nome.trim()) { erroModal.value = 'Nome é obrigatório'; return }
  if (!form.slug.trim()) { erroModal.value = 'Slug é obrigatório'; return }
  salvando.value = true
  try {
    const payload = { nome: form.nome, slug: form.slug, cnpj: form.cnpj || null, responsavel: form.responsavel || null, contato: form.contato || null, telefone: form.telefone || null, endereco: form.endereco || null, observacoes: form.observacoes || null, vendaMobilePermitida: form.vendaMobilePermitida, rfidDisponivel: form.rfidDisponivel }
    let tenantId = form.id
    if (abaAtiva.value === 'dados' || !form.id) {
      if (form.id) { await platformFetch(`/platform/tenants/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) }) }
      else { const c = await platformFetch<any>('/platform/tenants', { method: 'POST', body: JSON.stringify(payload) }); tenantId = c.id; form.id = c.id }
    }
    if (abaAtiva.value === 'licenca' && tenantId) {
      await platformFetch(`/platform/tenants/${tenantId}/licenca`, { method: 'PUT', body: JSON.stringify({ status: licencaForm.status, dataAtivacao: licencaForm.dataAtivacao || null, dataVencimento: licencaForm.dataVencimento || null }) })
    }
    showToast('success', abaAtiva.value === 'licenca' ? 'Licença atualizada!' : form.id ? 'Salvo!' : 'Restaurante criado!')
    fecharModal(); await carregar()
  } catch (e: any) { erroModal.value = e?.message || 'Erro ao salvar' }
  finally { salvando.value = false }
}

async function toggleRfid(tenant: Tenant) {
  if (togglingId.value) return
  togglingId.value = tenant.id
  const novo = !tenant.rfid_disponivel
  try {
    await platformFetch(`/platform/tenants/${tenant.id}/rfid`, { method: 'PATCH', body: JSON.stringify({ disponivel: novo }) })
    tenant.rfid_disponivel = novo
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
  finally { togglingId.value = null }
}

async function toggleStatus(tenant: Tenant) {
  const novoStatus = tenant.status === 'ativo' ? 'suspenso' : 'ativo'
  if (!confirm(novoStatus === 'suspenso' ? `Suspender "${tenant.nome}"?` : `Reativar "${tenant.nome}"?`)) return
  try {
    await platformFetch(`/platform/tenants/${tenant.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: novoStatus }) })
    tenant.status = novoStatus
    showToast('success', novoStatus === 'suspenso' ? 'Suspenso' : 'Reativado')
    await carregar()
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
}

async function handleLogout() {
  const rt = localStorage.getItem('platform_refresh_token')
  if (rt) { try { await platformFetch('/platform/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: rt }) }) } catch {} }
  platformAuth.logout(); navigateTo('/platform/login')
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
