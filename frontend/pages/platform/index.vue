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
        <div class="nav-active flex items-center gap-3 px-3 py-2.5 rounded-xl">
          <div class="size-8 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shrink-0 shadow-md shadow-violet-900/50">
            <UIcon name="i-lucide-store" class="text-white size-3.5" />
          </div>
          <span class="text-sm font-semibold text-white flex-1 truncate">Restaurantes</span>
          <span v-if="tenants.length" class="text-[11px] font-bold text-violet-300 tabular-nums bg-violet-500/20 px-1.5 py-0.5 rounded-lg shrink-0">{{ tenants.length }}</span>
        </div>
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

      <!-- Conteúdo -->
      <main class="flex-1 px-6 lg:px-10 py-8 space-y-8 max-w-[1100px] w-full">

        <!-- LOADING -->
        <div v-if="loading" class="flex items-center justify-center py-48">
          <div class="flex flex-col items-center gap-4">
            <div class="size-12 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shadow-xl shadow-violet-900/40">
              <UIcon name="i-lucide-loader-2" class="animate-spin text-white size-5" />
            </div>
            <p class="text-[11px] font-semibold uppercase tracking-widest text-white/25">Carregando dados</p>
          </div>
        </div>

        <template v-else>

          <!-- PAGE HEADER -->
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.07] mb-4">
                <UIcon name="i-lucide-layout-dashboard" class="size-3 text-violet-400" />
                <span class="text-[11px] font-medium text-white/45">Visão geral</span>
              </div>
              <h1 class="text-3xl font-black text-white tracking-tight leading-none text-balance">Restaurantes</h1>
              <div class="flex items-center gap-2 mt-2 text-sm text-white/40">
                <span class="font-semibold text-white/60 tabular-nums">{{ dashboard?.totais?.ativos ?? 0 }}</span> ativos
                <template v-if="(dashboard?.totais?.suspensos ?? 0) > 0">
                  <span class="text-white/15">·</span>
                  <span class="text-amber-400 font-semibold tabular-nums">{{ dashboard?.totais?.suspensos }} suspensos</span>
                </template>
                <template v-if="(dashboard?.alertas?.length ?? 0) > 0">
                  <span class="text-white/15">·</span>
                  <span class="text-red-400 font-semibold tabular-nums">{{ dashboard?.alertas?.length }} alertas</span>
                </template>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0 pt-8">
              <div class="relative">
                <UIcon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/20 pointer-events-none" />
                <input
                  v-model="busca"
                  placeholder="Buscar restaurante…"
                  class="h-9 pl-8 pr-3 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/80 placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-all w-52"
                />
              </div>
              <button
                @click="abrirModal(null)"
                class="h-9 px-4 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 hover:from-violet-500 hover:to-violet-700 text-white text-sm font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-violet-900/50 shrink-0"
              >
                <UIcon name="i-lucide-plus" class="size-3.5" />
                Novo
              </button>
            </div>
          </div>

          <!-- ══ MÉTRICAS (EduSites stats style) ══ -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              v-for="metric in metrics" :key="metric.label"
              class="p-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] flex flex-col gap-4 hover:bg-white/[0.035] transition-colors"
            >
              <div :class="['size-11 rounded-xl flex items-center justify-center shadow-lg', metric.iconBgClass]">
                <UIcon :name="metric.icon" class="size-5 text-white" />
              </div>
              <div>
                <p :class="['text-4xl font-black leading-none tabular-nums', metric.valueClass]">{{ metric.value }}</p>
                <p :class="['text-sm font-medium mt-1.5', metric.subClass]">{{ metric.label }}</p>
              </div>
            </div>
          </div>

          <!-- ══ ALERTAS ══ -->
          <div v-if="dashboard?.alertas?.length" class="rounded-2xl border border-amber-500/[0.18] bg-amber-500/[0.03] overflow-hidden">
            <div class="flex items-center gap-3 px-5 py-3.5 border-b border-amber-500/[0.10]">
              <div class="size-8 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 shadow-md shadow-amber-900/50 flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-bell-ring" class="text-white size-3.5" />
              </div>
              <div>
                <p class="text-sm font-black text-amber-400">Atenção necessária</p>
                <p class="text-[11px] text-white/30">{{ dashboard.alertas.length }} restaurante(s) requerem ação</p>
              </div>
            </div>
            <NuxtLink
              v-for="a in dashboard.alertas" :key="a.tenant_id"
              :to="`/platform/tenants/${a.tenant_id}`"
              class="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.025] transition-colors group border-b border-amber-500/[0.06] last:border-0"
            >
              <div :class="['size-9 rounded-xl flex items-center justify-center shrink-0 shadow-md', alertaStyle(a.tipo).bgClass]">
                <UIcon :name="alertaStyle(a.tipo).icon" :class="['size-4', alertaStyle(a.tipo).iconColor]" />
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-white/90 truncate">{{ a.nome }}</p>
                <p class="text-[11px] text-white/35 mt-0.5">{{ alertaDescricao(a) }}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span v-if="a.dias !== undefined && a.dias >= 0"
                  class="text-[10px] font-black px-2 py-1 rounded-lg tabular-nums"
                  :class="a.dias <= 7 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'">
                  {{ a.dias }}d
                </span>
                <UIcon name="i-lucide-chevron-right" class="size-4 text-white/15 group-hover:text-white/40 transition-colors" />
              </div>
            </NuxtLink>
          </div>

          <!-- ══ TABELA DE TENANTS ══ -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.07]">
                <UIcon name="i-lucide-store" class="size-3 text-violet-400" />
                <span class="text-[11px] font-medium text-white/45">Todos os restaurantes</span>
              </div>
              <span class="text-[11px] font-medium text-white/25 tabular-nums">{{ tenantsFiltrados.length }} resultado(s)</span>
            </div>

            <div class="rounded-2xl border border-white/[0.07] overflow-hidden">
              <div class="table-header grid items-center px-5 py-3.5"
                style="grid-template-columns: 1fr 168px 136px 116px">
                <span class="col-label">Restaurante</span>
                <span class="col-label hidden md:block text-center">Licença</span>
                <span class="col-label hidden md:block text-center">Plano</span>
                <span class="col-label text-right">Ações</span>
              </div>

              <div v-if="erro" class="flex flex-col items-center py-20">
                <div class="size-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-900 shadow-xl shadow-red-900/40 flex items-center justify-center mb-4">
                  <UIcon name="i-lucide-alert-circle" class="text-white size-6" />
                </div>
                <p class="text-white/40 text-sm font-medium mb-4">{{ erro }}</p>
                <button @click="carregar" class="px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-sm font-semibold transition-colors border border-violet-500/20">
                  Tentar novamente
                </button>
              </div>

              <div v-else-if="!tenantsFiltrados.length" class="flex flex-col items-center py-20">
                <div class="size-14 rounded-2xl bg-gradient-to-br from-violet-600 to-violet-900 shadow-xl shadow-violet-900/40 flex items-center justify-center mb-4">
                  <UIcon name="i-lucide-store" class="text-white size-6" />
                </div>
                <p class="text-white/30 text-sm font-medium mt-1">
                  {{ busca ? `Sem resultados para "${busca}"` : 'Nenhum restaurante cadastrado' }}
                </p>
              </div>

              <div v-else class="divide-y divide-white/[0.04]">
                <div
                  v-for="tenant in tenantsFiltrados" :key="tenant.id"
                  class="tenant-row grid items-center px-5 py-4 group border-l-2 transition-colors"
                  :class="tenant.status === 'suspenso' ? 'border-l-red-500/50 bg-red-500/[0.025] hover:bg-red-500/[0.04]' : 'border-l-transparent hover:bg-white/[0.025]'"
                  style="grid-template-columns: 1fr 168px 136px 116px"
                >
                  <NuxtLink :to="`/platform/tenants/${tenant.id}`" class="flex items-center gap-4 min-w-0">
                    <div :class="['size-10 rounded-xl flex items-center justify-center text-[13px] font-black text-white shrink-0 shadow-md', avatarGradient(tenant.nome)]">
                      {{ tenant.nome.slice(0, 2).toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-sm font-semibold text-white/90 group-hover:text-white transition-colors truncate">{{ tenant.nome }}</span>
                        <span :class="['status-pill', tenant.status === 'ativo' ? 'status-ativo' : 'status-suspenso']">
                          {{ tenant.status === 'ativo' ? 'Ativo' : 'Suspenso' }}
                        </span>
                      </div>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="text-white/25 text-[11px] font-mono truncate">{{ tenant.slug }}</span>
                        <span v-if="tenant.rfid_disponivel" class="text-violet-400/50 text-[10px] font-bold">· RFID</span>
                        <span v-if="tenant.venda_mobile_permitida" class="text-sky-400/50 text-[10px] font-bold">· Mobile</span>
                      </div>
                    </div>
                  </NuxtLink>

                  <div class="hidden md:flex justify-center">
                    <span v-if="tenant.licencas?.[0]" :class="['meta-pill', licencaPillClass(tenant.licencas[0].status)]">
                      {{ licencaLabel(tenant.licencas[0]) }}
                    </span>
                    <span v-else class="text-white/15 text-sm">—</span>
                  </div>

                  <div class="hidden md:flex justify-center">
                    <span v-if="tenant.contratos?.[0]" class="meta-pill meta-pill-indigo">
                      {{ tenant.contratos[0].plano }}
                    </span>
                    <span v-else class="text-white/15 text-sm">—</span>
                  </div>

                  <div class="flex items-center gap-1.5 justify-end">
                    <button
                      @click="toggleRfid(tenant)"
                      :title="tenant.rfid_disponivel ? 'Desativar RFID' : 'Ativar RFID'"
                      :class="['action-btn', tenant.rfid_disponivel
                        ? 'text-white bg-gradient-to-br from-violet-600 to-violet-800 shadow-md shadow-violet-900/40'
                        : 'text-white/25 bg-white/[0.04] hover:bg-white/[0.07] hover:text-white/50']"
                    >
                      <UIcon :name="togglingId === tenant.id ? 'i-lucide-loader-2' : 'i-lucide-credit-card'" :class="['size-3.5', togglingId === tenant.id ? 'animate-spin' : '']" />
                    </button>
                    <button
                      @click="toggleStatus(tenant)"
                      :title="tenant.status === 'ativo' ? 'Suspender' : 'Reativar'"
                      :class="['action-btn', tenant.status === 'ativo'
                        ? 'text-white bg-gradient-to-br from-emerald-600 to-emerald-800 shadow-md shadow-emerald-900/40'
                        : 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20']"
                    >
                      <UIcon :name="tenant.status === 'ativo' ? 'i-lucide-toggle-right' : 'i-lucide-toggle-left'" class="size-3.5" />
                    </button>
                    <NuxtLink
                      :to="`/platform/tenants/${tenant.id}`"
                      class="action-btn text-white/25 bg-white/[0.04] hover:bg-white/[0.07] hover:text-white/70"
                      title="Ver detalhes"
                    >
                      <UIcon name="i-lucide-arrow-right" class="size-3.5" />
                    </NuxtLink>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ══ CARDS INFERIORES ══ -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-10">

            <div class="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <div class="flex items-center gap-4 px-6 py-5 border-b border-white/[0.06]">
                <div class="size-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-900 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/40">
                  <UIcon name="i-lucide-trending-up" class="text-white size-4" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-white">Receita por plano</p>
                  <p class="text-xs text-white/35 mt-0.5">Faturamento mensal recorrente</p>
                </div>
                <p class="text-lg font-black text-emerald-400 tabular-nums shrink-0">{{ formatCurrency(dashboard?.financeiro?.mrr ?? 0) }}</p>
              </div>
              <div class="p-6">
                <div v-if="dashboard?.financeiro?.por_plano?.length" class="space-y-5">
                  <div v-for="p in dashboard.financeiro.por_plano" :key="p.plano">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-semibold text-white/80">{{ p.plano }}</span>
                        <span class="text-[10px] font-bold text-white/30 bg-white/[0.05] px-1.5 py-0.5 rounded-md tabular-nums">{{ p.count }}x</span>
                      </div>
                      <span class="text-sm font-black text-emerald-400 tabular-nums">{{ formatCurrency(p.mrr) }}</span>
                    </div>
                    <div class="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                      <div class="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all"
                        :style="{ width: maxMrr > 0 ? `${(p.mrr / maxMrr) * 100}%` : '0%' }"></div>
                    </div>
                  </div>
                </div>
                <p v-else class="text-sm text-white/20 text-center py-6">Nenhum contrato ativo</p>
              </div>
            </div>

            <div class="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
              <div class="flex items-center gap-4 px-6 py-5 border-b border-white/[0.06]">
                <div class="size-10 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
                  <UIcon name="i-lucide-zap" class="text-white size-4" />
                </div>
                <div>
                  <p class="text-sm font-bold text-white">Recursos habilitados</p>
                  <p class="text-xs text-white/35 mt-0.5">Features ativas por tenant</p>
                </div>
              </div>
              <div class="p-6 space-y-5">
                <div v-for="feat in featCards" :key="feat.label">
                  <div class="flex items-center gap-4">
                    <div :class="['size-9 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0', feat.color]">
                      <UIcon :name="feat.icon" class="text-white size-4" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between mb-1.5">
                        <span class="text-sm font-semibold text-white/70">{{ feat.label }}</span>
                        <span :class="['text-sm font-black tabular-nums', feat.textColor]">
                          {{ feat.count }}<span class="text-white/20 font-normal">/{{ tenants.length }}</span>
                        </span>
                      </div>
                      <div class="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                        <div :class="['h-full rounded-full bg-gradient-to-r transition-all', feat.barColor]"
                          :style="{ width: tenants.length ? `${(feat.count / tenants.length) * 100}%` : '0%' }"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <span class="text-sm text-white/30 font-medium">Receita anual estimada</span>
                  <span class="text-sm font-black text-white/50 tabular-nums">{{ formatCurrency(dashboard?.financeiro?.arr ?? 0) }}</span>
                </div>
              </div>
            </div>

          </div>

        </template>
      </main>
    </div>

    <!-- ══ MODAL CRIAR / EDITAR ══ -->
    <UModal v-model="modalAberto" :ui="{ container: 'items-start pt-12', width: 'max-w-xl', background: 'bg-[#0e0d18]', ring: 'ring-1 ring-white/[0.09]', rounded: 'rounded-2xl' }">
      <UCard :ui="{ background: 'bg-transparent', ring: '', divide: 'divide-white/[0.07]', header: { padding: 'px-5 py-4' }, body: { padding: 'p-0' }, footer: { padding: 'px-5 pb-5 pt-3' } }">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="size-9 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
                <UIcon name="i-lucide-building-2" class="text-white size-4" />
              </div>
              <div>
                <h2 class="text-sm font-bold text-white text-balance">{{ form.id ? 'Editar restaurante' : 'Novo restaurante' }}</h2>
                <p v-if="form.id" class="text-white/25 text-[10px] font-mono">{{ form.slug }}</p>
              </div>
            </div>
            <button @click="fecharModal" class="size-7 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </div>
        </template>

        <div class="flex gap-1 px-5 pt-4 border-b border-white/[0.05] pb-3">
          <UButton
            v-for="aba in abas" :key="aba.id"
            :icon="aba.icon"
            :color="abaAtiva === aba.id ? 'violet' : 'gray'"
            :variant="abaAtiva === aba.id ? 'solid' : 'ghost'"
            size="xs"
            :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-[11px]' }"
            @click="abaAtiva = aba.id"
          >{{ aba.label }}</UButton>
        </div>

        <div v-if="abaAtiva === 'dados'" class="p-5 space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="label-field">Nome do restaurante *</label>
              <UInput v-model="form.nome" @input="autoSlug" placeholder="Ex: Restaurante Tarantela" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
            <div>
              <label class="label-field">Identificador *</label>
              <UInput v-model="form.slug" placeholder="ex: tarantela" size="sm" :ui="{ rounded: 'rounded-xl', base: 'font-mono text-xs' }" class="input-dark" />
              <p class="text-[10px] text-white/20 mt-1">Usado na URL do sistema</p>
            </div>
            <div>
              <label class="label-field">CNPJ</label>
              <UInput v-model="form.cnpj" placeholder="00.000.000/0001-00" size="sm" :ui="{ rounded: 'rounded-xl', base: 'font-mono text-xs' }" class="input-dark" />
            </div>
            <div>
              <label class="label-field">Responsável</label>
              <UInput v-model="form.responsavel" placeholder="Nome do responsável" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
            <div>
              <label class="label-field">E-mail</label>
              <UInput v-model="form.contato" type="email" placeholder="contato@restaurante.com" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
            <div>
              <label class="label-field">Telefone</label>
              <UInput v-model="form.telefone" placeholder="(62) 9 9999-9999" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
            <div>
              <label class="label-field">Endereço</label>
              <UInput v-model="form.endereco" placeholder="Rua, número, bairro" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
            <div class="sm:col-span-2">
              <label class="label-field">Observações</label>
              <UTextarea v-model="form.observacoes" placeholder="Anotações internas..." :rows="2" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
          </div>
          <div class="border-t border-white/[0.06] pt-4 space-y-3">
            <p class="text-[10px] font-bold uppercase tracking-widest text-white/25">Features</p>
            <div v-for="feat in features" :key="feat.key" class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-white/80">{{ feat.label }}</p>
                <p class="text-[11px] text-white/25">{{ feat.desc }}</p>
              </div>
              <UToggle
                :model-value="(form as any)[feat.key]"
                :on-icon="feat.onIcon"
                :color="feat.color as any"
                @update:model-value="(v: boolean) => (form as any)[feat.key] = v"
              />
            </div>
          </div>
        </div>

        <div v-else-if="abaAtiva === 'licenca'" class="p-5">
          <div v-if="!form.id" class="text-center py-10 text-white/25 text-sm">Salve o restaurante primeiro para gerenciar a licença.</div>
          <div v-else class="space-y-4">
            <div>
              <label class="label-field mb-2">Status</label>
              <div class="flex gap-2">
                <UButton v-for="s in licencaStatuses" :key="s.value"
                  :color="licencaForm.status === s.value ? s.color : 'gray'"
                  :variant="licencaForm.status === s.value ? 'soft' : 'ghost'"
                  size="sm" class="flex-1" :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-xs' }"
                  @click="licencaForm.status = s.value">{{ s.label }}</UButton>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label-field">Ativação</label>
                <UInput v-model="licencaForm.dataAtivacao" type="date" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
              </div>
              <div>
                <label class="label-field">Vencimento</label>
                <UInput v-model="licencaForm.dataVencimento" type="date" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
              </div>
            </div>
            <div v-if="licencaAtual" class="text-[10px] text-white/25 pt-1">Criada em {{ formatDate(licencaAtual.created_at) }}</div>
          </div>
        </div>

        <div v-else-if="abaAtiva === 'contrato'" class="p-5 space-y-4">
          <div>
            <label class="label-field">Plano *</label>
            <div class="flex gap-1.5 mb-2 flex-wrap">
              <UButton v-for="p in planosPredef" :key="p"
                :color="contratoForm.plano === p ? 'violet' : 'gray'"
                :variant="contratoForm.plano === p ? 'solid' : 'ghost'"
                size="xs" :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-xs' }"
                @click="contratoForm.plano = p">{{ p }}</UButton>
            </div>
            <UInput v-model="contratoForm.plano" placeholder="Ou escreva o nome do plano..." size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label-field">Valor (R$)</label>
              <UInput v-model="contratoForm.valor" type="number" min="0" step="0.01" placeholder="0,00" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
            <div>
              <label class="label-field">Status</label>
              <div class="flex gap-1.5 mt-0.5">
                <UButton :color="contratoForm.status === 'trial' ? 'sky' : 'gray'" :variant="contratoForm.status === 'trial' ? 'soft' : 'ghost'" size="sm" class="flex-1" :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-xs' }" @click="contratoForm.status = 'trial'">Teste</UButton>
                <UButton :color="contratoForm.status === 'ativo' ? 'green' : 'gray'" :variant="contratoForm.status === 'ativo' ? 'soft' : 'ghost'" size="sm" class="flex-1" :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-xs' }" @click="contratoForm.status = 'ativo'">Ativo</UButton>
              </div>
            </div>
          </div>
          <div>
            <label class="label-field">Ciclo de cobrança</label>
            <div class="grid grid-cols-4 gap-1.5">
              <UButton v-for="c in ciclos" :key="c.value"
                :color="contratoForm.ciclo === c.value ? 'violet' : 'gray'"
                :variant="contratoForm.ciclo === c.value ? 'solid' : 'ghost'"
                size="xs" :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-xs' }"
                @click="contratoForm.ciclo = c.value as any">{{ c.label }}</UButton>
            </div>
          </div>
          <div>
            <label class="label-field">Início do contrato</label>
            <UInput v-model="contratoForm.dataInicio" type="date" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
          </div>
          <UAlert v-if="!form.id" icon="i-lucide-info" color="violet" variant="soft" description="O contrato será criado junto com o restaurante." />
        </div>

        <UAlert v-if="erroModal" color="red" :description="erroModal" variant="soft" class="mx-5 mb-1" />

        <template #footer>
          <div class="flex gap-2">
            <UButton color="gray" variant="ghost" block :ui="{ rounded: 'rounded-xl', font: 'font-semibold' }" @click="fecharModal">Cancelar</UButton>
            <UButton color="violet" block :loading="salvando" :ui="{ rounded: 'rounded-xl', font: 'font-semibold' }" @click="salvar">
              {{ salvando ? 'Salvando...' : (form.id ? 'Salvar alterações' : 'Criar restaurante') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- ══ CONFIRM ══ -->
    <UModal v-model="confirmDialog.show" :ui="{ width: 'max-w-sm', background: 'bg-[#0e0d18]', ring: 'ring-1 ring-white/[0.09]', rounded: 'rounded-2xl' }">
      <UCard :ui="{ ring: '', background: 'bg-transparent', body: { padding: 'p-7' }, footer: { padding: 'px-6 pb-6 pt-0' } }">
        <div class="flex flex-col items-center text-center gap-5">
          <div :class="['size-14 rounded-2xl flex items-center justify-center shadow-xl',
            confirmDialog.type === 'danger' ? 'bg-gradient-to-br from-red-600 to-red-900 shadow-red-900/40' : 'bg-gradient-to-br from-emerald-600 to-emerald-900 shadow-emerald-900/40']">
            <UIcon :name="confirmDialog.type === 'danger' ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle-2'" class="text-white size-6" />
          </div>
          <div>
            <h3 class="text-base font-bold text-white leading-tight text-balance">{{ confirmDialog.title }}</h3>
            <p class="text-sm text-white/40 mt-2 leading-relaxed text-pretty">{{ confirmDialog.message }}</p>
          </div>
        </div>
        <template #footer>
          <div class="flex gap-2">
            <UButton color="gray" variant="ghost" block :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-sm' }"
              @click="confirmDialog.resolve?.(false); confirmDialog.show = false">Cancelar</UButton>
            <UButton :color="confirmDialog.type === 'danger' ? 'red' : 'green'" block :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-sm' }"
              @click="confirmDialog.resolve?.(true); confirmDialog.show = false">Confirmar</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <UNotifications />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { usePlatformAuthStore } from '~/stores/platformAuth'

definePageMeta({ layout: false })

interface Licenca  { id: string; status: string; data_ativacao: string | null; data_vencimento: string | null; created_at: string }
interface Contrato { id: string; plano: string; valor: string | null; ciclo: string; status: string; data_inicio?: string | null }
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
const toast         = useToast()

const tenants    = ref<Tenant[]>([])
const dashboard  = ref<Dashboard | null>(null)
const loading    = ref(false)
const erro       = ref('')
const busca      = ref('')
const togglingId = ref<string | null>(null)

const confirmDialog = reactive({
  show: false, title: '', message: '', type: 'danger' as 'danger' | 'success',
  resolve: null as ((v: boolean) => void) | null,
})
function showConfirm(title: string, message: string, type: 'danger' | 'success' = 'danger'): Promise<boolean> {
  return new Promise(resolve => { Object.assign(confirmDialog, { title, message, type, resolve, show: true }) })
}

const modalAberto         = ref(false)
const abaAtiva            = ref<'dados' | 'licenca' | 'contrato'>('dados')
const salvando            = ref(false)
const erroModal           = ref('')
const licencaAtual        = ref<Licenca | null>(null)
const contratoAtualTenant = ref<Contrato | null>(null)

const abas = [
  { id: 'dados' as const,    label: 'Dados',    icon: 'i-lucide-building-2' },
  { id: 'licenca' as const,  label: 'Licença',  icon: 'i-lucide-file-text'  },
  { id: 'contrato' as const, label: 'Contrato', icon: 'i-lucide-banknote'   },
]
const licencaStatuses: { value: string; label: string; color: 'green' | 'amber' | 'red' }[] = [
  { value: 'ativado',   label: 'Ativada',   color: 'green' },
  { value: 'pendente',  label: 'Pendente',  color: 'amber' },
  { value: 'bloqueado', label: 'Bloqueada', color: 'red'   },
]
const features = [
  { key: 'vendaMobilePermitida', label: 'Venda pelo Celular', desc: 'Acesso via QR Code e dispositivo móvel', color: 'sky',    onIcon: 'i-lucide-check' },
  { key: 'rfidDisponivel',       label: 'RFID',               desc: 'Autenticação por cartão (feature paga)',  color: 'violet', onIcon: 'i-lucide-check' },
]
const planosPredef = ['Básico', 'Profissional', 'Enterprise']
const ciclos = [
  { value: 'mensal', label: 'Mensal' }, { value: 'trimestral', label: 'Trim.' },
  { value: 'semestral', label: 'Semes.' }, { value: 'anual', label: 'Anual' },
]
const form = reactive({ id: null as string | null, nome: '', slug: '', cnpj: '', responsavel: '', contato: '', telefone: '', endereco: '', observacoes: '', vendaMobilePermitida: true, rfidDisponivel: false })
const licencaForm  = reactive({ status: 'pendente', dataAtivacao: '', dataVencimento: '' })
const contratoForm = reactive({ plano: '', valor: '', ciclo: 'mensal' as 'mensal' | 'trimestral' | 'semestral' | 'anual', dataInicio: '', status: 'ativo' as 'trial' | 'ativo' })

const baseUrl = computed(() => (runtimeConfig.public as any).apiUrl as string)
const maxMrr  = computed(() => Math.max(...(dashboard.value?.financeiro?.por_plano?.map(p => p.mrr) ?? [0]), 0))

const tenantsFiltrados = computed(() => {
  const q = busca.value.toLowerCase().trim()
  if (!q) return tenants.value
  return tenants.value.filter(t => t.nome.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q) || (t.responsavel || '').toLowerCase().includes(q))
})

const metrics = computed(() => {
  const vencidas   = dashboard.value?.licencas?.vencidas   ?? 0
  const vencendo   = dashboard.value?.licencas?.vencendo   ?? 0
  const totalVenc  = vencidas + vencendo
  const bloqueadas = dashboard.value?.licencas?.bloqueadas ?? 0
  return [
    { icon: 'i-lucide-store',     value: String(dashboard.value?.totais?.tenants ?? tenants.value.length), label: 'Restaurantes',
      iconBgClass: 'bg-gradient-to-br from-violet-600 to-violet-900 shadow-violet-900/50', valueClass: 'text-white', subClass: 'text-white/40' },
    { icon: 'i-lucide-trending-up', value: formatCurrency(dashboard.value?.financeiro?.mrr ?? 0), label: 'Receita mensal',
      iconBgClass: 'bg-gradient-to-br from-emerald-600 to-emerald-900 shadow-emerald-900/50', valueClass: 'text-emerald-400', subClass: 'text-emerald-500/60' },
    { icon: 'i-lucide-key-round',  value: String(dashboard.value?.licencas?.ativas ?? 0), label: bloqueadas > 0 ? `${bloqueadas} bloqueada(s)` : 'Licenças ativas',
      iconBgClass: bloqueadas > 0 ? 'bg-gradient-to-br from-red-600 to-red-900 shadow-red-900/50' : 'bg-gradient-to-br from-sky-600 to-sky-900 shadow-sky-900/50',
      valueClass: 'text-white', subClass: bloqueadas > 0 ? 'text-red-400/80' : 'text-white/40' },
    { icon: 'i-lucide-clock',      value: String(totalVenc), label: vencidas > 0 ? 'licenças vencidas' : vencendo > 0 ? 'vencem em 30 dias' : 'sem vencimentos',
      iconBgClass: vencidas > 0 ? 'bg-gradient-to-br from-red-600 to-red-900 shadow-red-900/50' : vencendo > 0 ? 'bg-gradient-to-br from-amber-600 to-amber-900 shadow-amber-900/50' : 'bg-gradient-to-br from-slate-600 to-slate-800 shadow-slate-900/40',
      valueClass: vencidas > 0 ? 'text-red-400' : vencendo > 0 ? 'text-amber-400' : 'text-white/50',
      subClass:   vencidas > 0 ? 'text-red-400/70' : vencendo > 0 ? 'text-amber-400/70' : 'text-white/25' },
  ]
})

const featCards = computed(() => [
  { label: 'RFID',    icon: 'i-lucide-credit-card', color: 'from-violet-600 to-violet-900', barColor: 'from-violet-600 to-violet-500', textColor: 'text-violet-400', count: tenants.value.filter(t => t.rfid_disponivel).length },
  { label: 'Celular', icon: 'i-lucide-smartphone',  color: 'from-sky-600 to-sky-900',      barColor: 'from-sky-600 to-sky-500',      textColor: 'text-sky-400',    count: tenants.value.filter(t => t.venda_mobile_permitida).length },
])

const AVATAR_GRADIENTS = [
  'bg-gradient-to-br from-violet-600 to-violet-900',
  'bg-gradient-to-br from-sky-600 to-sky-900',
  'bg-gradient-to-br from-emerald-600 to-emerald-900',
  'bg-gradient-to-br from-amber-600 to-amber-900',
  'bg-gradient-to-br from-rose-600 to-rose-900',
  'bg-gradient-to-br from-indigo-600 to-indigo-900',
]
function avatarGradient(nome: string) { return AVATAR_GRADIENTS[nome.charCodeAt(0) % AVATAR_GRADIENTS.length] }
function licencaPillClass(s: string) { return s === 'ativado' ? 'meta-pill-sky' : s === 'pendente' ? 'meta-pill-amber' : 'meta-pill-red' }
function licencaLabel(lic: Licenca) {
  if (lic.status === 'ativado' && lic.data_vencimento) {
    const d = Math.ceil((new Date(lic.data_vencimento).getTime() - Date.now()) / 86400000)
    if (d < 0) return 'Expirada'; if (d <= 7) return `${d}d restantes`
    return `Até ${formatDate(lic.data_vencimento)}`
  }
  return lic.status === 'ativado' ? 'Ativa' : lic.status === 'pendente' ? 'Pendente' : 'Bloqueada'
}
function alertaStyle(tipo: string) {
  if (tipo === 'licenca_vencida' || tipo === 'licenca_critica') return { icon: 'i-lucide-alert-circle', iconColor: 'text-white', bgClass: 'bg-gradient-to-br from-red-600 to-red-900' }
  if (tipo === 'licenca_vencendo') return { icon: 'i-lucide-clock', iconColor: 'text-white', bgClass: 'bg-gradient-to-br from-amber-600 to-amber-900' }
  return { icon: 'i-lucide-alert-circle', iconColor: 'text-white', bgClass: 'bg-gradient-to-br from-orange-600 to-orange-900' }
}
function alertaDescricao(a: { tipo: string; dias?: number }) {
  if (a.tipo === 'licenca_vencida') return '— licença vencida'
  if (a.tipo === 'licenca_critica') return `— vence em ${a.dias} dia(s)`
  if (a.tipo === 'licenca_vencendo') return `— vence em ${a.dias} dias`
  return '— inadimplente'
}
function formatDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function formatCurrency(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function slugify(s: string) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
function autoSlug() { if (!form.id) form.slug = slugify(form.nome) }

function showToast(type: 'success' | 'error', description: string) {
  toast.add({ title: type === 'success' ? 'Sucesso' : 'Erro', description, color: type === 'success' ? 'green' : 'red', icon: type === 'success' ? 'i-lucide-check-circle-2' : 'i-lucide-alert-circle', timeout: 3000 })
}

async function platformFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const resp = await fetch(`${baseUrl.value}/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${platformAuth.token}`, ...((options.headers as any) || {}) },
  })
  if (resp.status === 401) { platformAuth.logout(); navigateTo('/platform/login'); throw new Error('Sessão expirada') }
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || `Erro ${resp.status}`)
  return data as T
}

async function carregar() {
  loading.value = true; erro.value = ''
  try {
    const [t, d] = await Promise.all([platformFetch<Tenant[]>('/platform/tenants'), platformFetch<Dashboard>('/platform/tenants/dashboard')])
    tenants.value = t; dashboard.value = d
  } catch (e: any) { erro.value = e?.message || 'Erro ao carregar' }
  finally { loading.value = false }
}

function resetContratoForm() {
  contratoForm.plano = ''; contratoForm.valor = ''; contratoForm.ciclo = 'mensal'
  contratoForm.dataInicio = new Date().toISOString().substring(0, 10); contratoForm.status = 'ativo'
}

function abrirModal(tenant: Tenant | null) {
  erroModal.value = ''; abaAtiva.value = 'dados'; licencaAtual.value = null; contratoAtualTenant.value = null
  if (tenant) {
    Object.assign(form, { id: tenant.id, nome: tenant.nome, slug: tenant.slug, cnpj: tenant.cnpj || '', responsavel: tenant.responsavel || '', contato: tenant.contato || '', telefone: tenant.telefone || '', endereco: tenant.endereco || '', observacoes: tenant.observacoes || '', vendaMobilePermitida: tenant.venda_mobile_permitida, rfidDisponivel: tenant.rfid_disponivel })
    const lic = tenant.licencas?.[0]
    if (lic) { licencaAtual.value = lic; licencaForm.status = lic.status; licencaForm.dataAtivacao = lic.data_ativacao?.substring(0, 10) || ''; licencaForm.dataVencimento = lic.data_vencimento?.substring(0, 10) || '' }
    else { licencaForm.status = 'pendente'; licencaForm.dataAtivacao = ''; licencaForm.dataVencimento = '' }
    const con = tenant.contratos?.[0]
    if (con) { contratoAtualTenant.value = con; contratoForm.plano = con.plano; contratoForm.valor = con.valor || ''; contratoForm.ciclo = (con.ciclo as any) || 'mensal'; contratoForm.dataInicio = con.data_inicio?.substring(0, 10) || ''; contratoForm.status = (con.status as any) || 'ativo' }
    else resetContratoForm()
  } else {
    Object.assign(form, { id: null, nome: '', slug: '', cnpj: '', responsavel: '', contato: '', telefone: '', endereco: '', observacoes: '', vendaMobilePermitida: true, rfidDisponivel: false })
    licencaForm.status = 'pendente'; licencaForm.dataAtivacao = ''; licencaForm.dataVencimento = ''; resetContratoForm()
  }
  modalAberto.value = true
}
function fecharModal() { modalAberto.value = false }

async function salvar() {
  erroModal.value = ''
  if (!form.nome.trim()) { erroModal.value = 'Nome é obrigatório'; return }
  if (!form.slug.trim()) { erroModal.value = 'Identificador é obrigatório'; return }
  salvando.value = true
  try {
    let msg = ''
    if (!form.id) {
      const payload: any = { nome: form.nome, slug: form.slug, cnpj: form.cnpj || null, responsavel: form.responsavel || null, contato: form.contato || null, telefone: form.telefone || null, endereco: form.endereco || null, observacoes: form.observacoes || null, vendaMobilePermitida: form.vendaMobilePermitida, rfidDisponivel: form.rfidDisponivel }
      if (contratoForm.plano.trim()) payload.contrato = { plano: contratoForm.plano.trim(), valor: contratoForm.valor ? parseFloat(contratoForm.valor) : null, ciclo: contratoForm.ciclo, dataInicio: contratoForm.dataInicio || null, status: contratoForm.status }
      const c = await platformFetch<any>('/platform/tenants', { method: 'POST', body: JSON.stringify(payload) })
      form.id = c.id; msg = contratoForm.plano.trim() ? 'Restaurante e contrato criados!' : 'Restaurante criado!'
    } else {
      const tid = form.id
      if (abaAtiva.value === 'dados') {
        await platformFetch(`/platform/tenants/${tid}`, { method: 'PUT', body: JSON.stringify({ nome: form.nome, slug: form.slug, cnpj: form.cnpj || null, responsavel: form.responsavel || null, contato: form.contato || null, telefone: form.telefone || null, endereco: form.endereco || null, observacoes: form.observacoes || null, vendaMobilePermitida: form.vendaMobilePermitida, rfidDisponivel: form.rfidDisponivel }) })
        msg = 'Dados atualizados!'
      } else if (abaAtiva.value === 'licenca') {
        await platformFetch(`/platform/tenants/${tid}/licenca`, { method: 'PUT', body: JSON.stringify({ status: licencaForm.status, dataAtivacao: licencaForm.dataAtivacao || null, dataVencimento: licencaForm.dataVencimento || null }) })
        msg = 'Licença atualizada!'
      } else if (abaAtiva.value === 'contrato') {
        if (!contratoForm.plano.trim()) { erroModal.value = 'Informe o nome do plano'; salvando.value = false; return }
        await platformFetch(`/platform/tenants/${tid}/contrato`, { method: 'PUT', body: JSON.stringify({ plano: contratoForm.plano.trim(), valor: contratoForm.valor ? parseFloat(contratoForm.valor) : null, ciclo: contratoForm.ciclo, dataInicio: contratoForm.dataInicio || null, status: contratoForm.status }) })
        msg = 'Contrato atualizado!'
      }
    }
    showToast('success', msg); fecharModal(); await carregar()
  } catch (e: any) { erroModal.value = e?.message || 'Erro ao salvar' }
  finally { salvando.value = false }
}

async function toggleRfid(tenant: Tenant) {
  if (togglingId.value) return
  togglingId.value = tenant.id
  try {
    await platformFetch(`/platform/tenants/${tenant.id}/rfid`, { method: 'PATCH', body: JSON.stringify({ disponivel: !tenant.rfid_disponivel }) })
    tenant.rfid_disponivel = !tenant.rfid_disponivel
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
  finally { togglingId.value = null }
}

async function toggleStatus(tenant: Tenant) {
  const novoStatus = tenant.status === 'ativo' ? 'suspenso' : 'ativo'
  const ok = await showConfirm(
    novoStatus === 'suspenso' ? `Suspender "${tenant.nome}"?` : `Reativar "${tenant.nome}"?`,
    novoStatus === 'suspenso' ? 'O tenant ficará inacessível até ser reativado manualmente.' : 'O tenant voltará a funcionar normalmente.',
    novoStatus === 'suspenso' ? 'danger' : 'success'
  )
  if (!ok) return
  try {
    await platformFetch(`/platform/tenants/${tenant.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: novoStatus }) })
    tenant.status = novoStatus
    showToast('success', novoStatus === 'suspenso' ? 'Tenant suspenso' : 'Tenant reativado')
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
.nav-active { background: rgba(109,40,217,0.12); }

.table-header { background: rgba(255,255,255,0.025); border-bottom: 1px solid rgba(255,255,255,0.055); }
.col-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.28); }

.tenant-row { background: transparent; transition: background-color 0.1s, box-shadow 0.1s; }
.tenant-row:hover { background: rgba(255,255,255,0.018); box-shadow: inset 3px 0 0 rgba(139,92,246,0.5); }

.status-pill { display: inline-flex; align-items: center; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; flex-shrink: 0; }
.status-ativo    { background: rgba(16,185,129,0.12); color: rgb(52,211,153);  border: 1px solid rgba(16,185,129,0.2); }
.status-suspenso { background: rgba(245,158,11,0.12); color: rgb(251,191,36);  border: 1px solid rgba(245,158,11,0.2); }

.meta-pill { display: inline-flex; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px; white-space: nowrap; }
.meta-pill-sky    { background: rgba(14,165,233,0.1);  color: rgb(125,211,252); border: 1px solid rgba(14,165,233,0.18); }
.meta-pill-amber  { background: rgba(245,158,11,0.1);  color: rgb(252,211,77);  border: 1px solid rgba(245,158,11,0.18); }
.meta-pill-red    { background: rgba(239,68,68,0.1);   color: rgb(252,165,165); border: 1px solid rgba(239,68,68,0.18);  }
.meta-pill-indigo { background: rgba(99,102,241,0.1);  color: rgb(165,180,252); border: 1px solid rgba(99,102,241,0.18); }

.action-btn { width: 30px; height: 30px; border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; cursor: pointer; flex-shrink: 0; }

.label-field { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.30); margin-bottom: 6px; }

.input-dark :deep(input), .input-dark :deep(textarea) { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); }
.input-dark :deep(input)::placeholder, .input-dark :deep(textarea)::placeholder { color: rgba(255,255,255,0.18); }
.input-dark :deep(input):focus, .input-dark :deep(textarea):focus { border-color: rgba(139,92,246,0.5); background: rgba(255,255,255,0.06); }
</style>
