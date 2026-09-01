<template>
  <div class="min-h-screen bg-[#0a0a0f]">

    <!-- ══ TOPBAR ══ -->
    <header class="sticky top-0 z-30 border-b border-white/[0.05]" style="background: rgba(10,10,15,0.85); backdrop-filter: blur(20px);">
      <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="absolute inset-0 rounded-xl bg-violet-600 blur-md opacity-50"></div>
            <div class="relative w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg">
              <UIcon name="i-lucide-globe" class="text-white w-3.5 h-3.5" />
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-white font-black text-sm tracking-tight">Plataforma</span>
            <span class="text-white/25 text-[10px] font-bold uppercase tracking-widest hidden sm:inline">PDV · Super Administrador</span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <div class="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 border border-white/[0.06] bg-white/[0.03]">
            <UAvatar
              :alt="platformAuth.user?.nome"
              size="xs"
              :ui="{ background: 'bg-violet-500/20', text: 'text-violet-300 text-[9px] font-black' }"
            />
            <span class="text-white/60 text-xs font-semibold">{{ platformAuth.user?.nome }}</span>
            <UBadge color="violet" variant="soft" size="xs" class="font-black">
              {{ platformAuth.user?.role }}
            </UBadge>
          </div>
          <UButton
            icon="i-lucide-log-out"
            color="red"
            variant="ghost"
            size="xs"
            square
            title="Sair"
            @click="handleLogout"
          />
        </div>
      </div>
    </header>

    <!-- ══ CONTEÚDO ══ -->
    <main class="max-w-5xl mx-auto px-6 py-6 space-y-5">

      <!-- LOADING -->
      <div v-if="loading" class="flex items-center justify-center py-32">
        <UIcon name="i-lucide-loader-2" class="animate-spin text-violet-500 w-6 h-6" />
      </div>

      <template v-else>

        <!-- CABEÇALHO DA PÁGINA -->
        <div class="flex items-center gap-3">
          <div>
            <h1 class="text-base font-black text-white tracking-tight">Restaurantes</h1>
            <p class="text-[11px] text-white/30 mt-0.5">
              {{ dashboard?.totais?.ativos ?? 0 }} ativos
              <template v-if="(dashboard?.totais?.suspensos ?? 0) > 0">
                · <span class="text-amber-400">{{ dashboard?.totais?.suspensos }} suspensos</span>
              </template>
              <template v-if="(dashboard?.alertas?.length ?? 0) > 0">
                · <span class="text-red-400">{{ dashboard?.alertas?.length }} {{ dashboard!.alertas.length === 1 ? 'alerta' : 'alertas' }}</span>
              </template>
            </p>
          </div>
          <div class="flex-1" />
          <UInput
            v-model="busca"
            icon="i-lucide-search"
            placeholder="Buscar…"
            size="sm"
            :ui="{ rounded: 'rounded-xl', base: 'w-40 sm:w-52 bg-white/[0.04] border-white/[0.07] text-white/80 placeholder:text-white/15', icon: { base: 'text-white/20' } }"
          />
          <UButton
            icon="i-lucide-plus"
            color="violet"
            size="sm"
            :ui="{ rounded: 'rounded-xl', font: 'font-black' }"
            class="shadow-lg shadow-violet-500/20 shrink-0"
            @click="abrirModal(null)"
          >
            Novo
          </UButton>
        </div>

        <!-- MÉTRICAS -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <UCard
            v-for="metric in metrics"
            :key="metric.label"
            :class="['transition-all', metric.cardClass]"
            :ui="{ base: 'overflow-hidden', body: { padding: 'px-4 py-3' }, ring: '', divide: '' }"
          >
            <div class="flex items-center gap-3">
              <UIcon :name="metric.icon" :class="['w-4 h-4 shrink-0', metric.iconClass]" />
              <div class="min-w-0">
                <p :class="['text-xl font-black leading-none truncate', metric.valueClass]">{{ metric.value }}</p>
                <p :class="['text-[10px] font-bold mt-0.5 truncate', metric.subClass]">{{ metric.label }}</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- ALERTAS -->
        <div v-if="dashboard?.alertas?.length" class="rounded-xl border border-amber-500/15 bg-amber-500/[0.03] overflow-hidden">
          <div class="flex items-center gap-2 px-4 py-2.5 border-b border-amber-500/10">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0"></span>
            <p class="text-[10px] font-black uppercase tracking-widest text-amber-400/70 flex-1">Atenção necessária</p>
            <UBadge color="amber" variant="soft" size="xs" class="font-black">{{ dashboard.alertas.length }}</UBadge>
          </div>
          <NuxtLink
            v-for="(a, i) in dashboard.alertas"
            :key="a.tenant_id"
            :to="`/platform/tenants/${a.tenant_id}`"
            class="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors group/alert"
            :class="i < dashboard.alertas.length - 1 ? 'border-b border-amber-500/[0.08]' : ''"
          >
            <UIcon :name="alertaStyle(a.tipo).icon" :class="['w-3 h-3 shrink-0', alertaStyle(a.tipo).icon_color]" />
            <span class="text-xs font-bold text-white/80">{{ a.nome }}</span>
            <span class="text-xs font-normal text-white/40 flex-1">{{ alertaDescricao(a) }}</span>
            <UIcon name="i-lucide-chevron-right" class="w-3 h-3 text-white/15 group-hover/alert:text-white/35 transition-colors shrink-0" />
          </NuxtLink>
        </div>

        <!-- LISTA DE TENANTS -->
        <div>
          <div v-if="erro" class="text-center py-16 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <UIcon name="i-lucide-alert-circle" class="text-red-400 w-6 h-6 mx-auto mb-3" />
            <p class="text-white/40 text-sm font-bold mb-2">{{ erro }}</p>
            <UButton color="violet" variant="link" size="sm" @click="carregar">Tentar novamente</UButton>
          </div>

          <div v-else-if="!tenantsFiltrados.length" class="text-center py-16 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
            <UIcon name="i-lucide-store" class="text-white/10 w-6 h-6 mx-auto mb-3" />
            <p class="text-white/20 text-sm">Nenhum restaurante encontrado</p>
          </div>

          <div v-else class="rounded-2xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
            <div
              v-for="tenant in tenantsFiltrados"
              :key="tenant.id"
              class="flex items-center gap-3 px-4 py-3.5 bg-white/[0.01] hover:bg-white/[0.03] transition-colors group"
            >
              <!-- Avatar -->
              <UAvatar
                :alt="tenant.nome"
                size="sm"
                :ui="{ background: avatarColor(tenant.nome), text: 'font-black text-sm' }"
              />

              <!-- Info -->
              <NuxtLink :to="`/platform/tenants/${tenant.id}`" class="flex-1 min-w-0 cursor-pointer">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-bold text-white/90 group-hover:text-violet-300 transition-colors truncate">{{ tenant.nome }}</span>
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="statusDot(tenant.status)"></span>
                </div>
                <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span class="text-white/25 text-[10px] font-mono">{{ tenant.slug }}</span>
                  <UBadge
                    v-if="tenant.licencas?.[0]"
                    :color="licencaBadgeColor(tenant.licencas[0].status)"
                    variant="soft"
                    size="xs"
                    class="font-black"
                  >
                    {{ licencaLabel(tenant.licencas[0]) }}
                  </UBadge>
                  <UBadge
                    v-if="tenant.contratos?.[0]"
                    color="indigo"
                    variant="soft"
                    size="xs"
                    class="font-black"
                  >
                    {{ tenant.contratos[0].plano }}
                  </UBadge>
                </div>
              </NuxtLink>

              <!-- Feature pills -->
              <div class="hidden sm:flex items-center gap-1 shrink-0">
                <UBadge
                  :color="tenant.rfid_disponivel ? 'violet' : 'gray'"
                  :variant="tenant.rfid_disponivel ? 'soft' : 'outline'"
                  size="xs"
                  class="gap-1 font-black"
                >
                  <UIcon name="i-lucide-credit-card" class="w-2.5 h-2.5" /> RFID
                </UBadge>
                <UBadge
                  :color="tenant.venda_mobile_permitida ? 'sky' : 'gray'"
                  :variant="tenant.venda_mobile_permitida ? 'soft' : 'outline'"
                  size="xs"
                  class="gap-1 font-black"
                >
                  <UIcon name="i-lucide-smartphone" class="w-2.5 h-2.5" /> Celular
                </UBadge>
              </div>

              <!-- Ações -->
              <div class="flex items-center gap-1.5 shrink-0">
                <UButton
                  :icon="togglingId === tenant.id ? 'i-lucide-loader-2' : 'i-lucide-credit-card'"
                  :color="tenant.rfid_disponivel ? 'violet' : 'gray'"
                  variant="soft"
                  size="xs"
                  square
                  :loading="togglingId === tenant.id"
                  :ui="{ rounded: 'rounded-lg', font: 'font-black text-[10px]' }"
                  title="Alternar RFID"
                  @click="toggleRfid(tenant)"
                />

                <UButton
                  :icon="tenant.status === 'ativo' ? 'i-lucide-toggle-right' : 'i-lucide-toggle-left'"
                  :color="tenant.status === 'ativo' ? 'green' : 'amber'"
                  variant="soft"
                  size="xs"
                  :ui="{ rounded: 'rounded-lg', font: 'font-black text-[10px]' }"
                  :title="tenant.status === 'ativo' ? 'Suspender' : 'Reativar'"
                  @click="toggleStatus(tenant)"
                >
                  {{ tenant.status === 'ativo' ? 'Ativo' : 'Suspenso' }}
                </UButton>

                <UButton
                  :to="`/platform/tenants/${tenant.id}`"
                  icon="i-lucide-chevron-right"
                  color="gray"
                  variant="ghost"
                  size="xs"
                  :ui="{ rounded: 'rounded-lg', font: 'font-black text-[10px]' }"
                >
                  Abrir
                </UButton>
              </div>
            </div>
          </div>
        </div>

        <!-- RODAPÉ: RECEITA + FEATURES -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <UCard :ui="{ ring: '', divide: 'divide-white/[0.05]', background: 'bg-white/[0.015]', body: { padding: 'p-4' }, header: { padding: 'px-4 pt-4 pb-0' } }">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-trending-up" class="text-emerald-400 w-3 h-3" />
                  <span class="text-[10px] font-black text-white/40 uppercase tracking-widest">Receita por plano</span>
                </div>
                <span class="text-xs font-black text-emerald-400">
                  {{ formatCurrency(dashboard?.financeiro?.mrr ?? 0) }}<span class="text-white/20 text-[10px] font-normal">/mês</span>
                </span>
              </div>
            </template>
            <div v-if="dashboard?.financeiro?.por_plano?.length" class="space-y-3 mt-4">
              <div v-for="p in dashboard.financeiro.por_plano" :key="p.plano">
                <div class="flex items-center justify-between mb-1">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-bold text-white/70">{{ p.plano }}</span>
                    <UBadge color="gray" variant="soft" size="xs" class="font-black">{{ p.count }}x</UBadge>
                  </div>
                  <span class="text-xs font-black text-emerald-400">{{ formatCurrency(p.mrr) }}</span>
                </div>
                <UProgress
                  :value="maxMrr > 0 ? (p.mrr / maxMrr) * 100 : 0"
                  color="green"
                  size="xs"
                  :ui="{ progress: { rounded: 'rounded-full' }, background: 'bg-white/[0.05]' }"
                />
              </div>
            </div>
            <p v-else class="text-[11px] text-white/15 text-center py-4 mt-4">Nenhum contrato ativo</p>
          </UCard>

          <UCard :ui="{ ring: '', divide: 'divide-white/[0.05]', background: 'bg-white/[0.015]', body: { padding: 'p-4' }, header: { padding: 'px-4 pt-4 pb-0' } }">
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-zap" class="text-white/30 w-3 h-3" />
                <span class="text-[10px] font-black text-white/40 uppercase tracking-widest">Recursos habilitados</span>
              </div>
            </template>
            <div class="space-y-2.5 mt-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-credit-card" class="text-violet-400 w-3.5 h-3.5" />
                  <span class="text-xs font-bold text-white/70">RFID</span>
                </div>
                <div class="flex items-center gap-2">
                  <UProgress
                    :value="tenants.length ? (tenants.filter(t => t.rfid_disponivel).length / tenants.length) * 100 : 0"
                    color="violet"
                    size="xs"
                    class="w-24"
                    :ui="{ background: 'bg-white/[0.05]' }"
                  />
                  <span class="text-xs font-black text-violet-400 w-6 text-right">{{ tenants.filter(t => t.rfid_disponivel).length }}</span>
                  <span class="text-[10px] text-white/20">/ {{ tenants.length }}</span>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-smartphone" class="text-sky-400 w-3.5 h-3.5" />
                  <span class="text-xs font-bold text-white/70">Celular</span>
                </div>
                <div class="flex items-center gap-2">
                  <UProgress
                    :value="tenants.length ? (tenants.filter(t => t.venda_mobile_permitida).length / tenants.length) * 100 : 0"
                    color="sky"
                    size="xs"
                    class="w-24"
                    :ui="{ background: 'bg-white/[0.05]' }"
                  />
                  <span class="text-xs font-black text-sky-400 w-6 text-right">{{ tenants.filter(t => t.venda_mobile_permitida).length }}</span>
                  <span class="text-[10px] text-white/20">/ {{ tenants.length }}</span>
                </div>
              </div>
              <div class="pt-2 border-t border-white/[0.05] flex justify-between text-[10px] text-white/20">
                <span>Receita anual</span>
                <span class="font-black text-white/35">{{ formatCurrency(dashboard?.financeiro?.arr ?? 0) }}</span>
              </div>
            </div>
          </UCard>
        </div>

      </template>
    </main>

    <!-- ══ MODAL CRIAR / EDITAR ══ -->
    <UModal v-model="modalAberto" :ui="{ container: 'items-start pt-12', width: 'max-w-xl', background: 'bg-[#111118]', ring: 'ring-1 ring-white/[0.09]', rounded: 'rounded-2xl' }">
      <UCard :ui="{ background: 'bg-transparent', ring: '', divide: 'divide-white/[0.07]', header: { padding: 'px-5 py-4' }, body: { padding: 'p-0' }, footer: { padding: 'px-5 pb-5 pt-3' } }">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-building-2" class="text-violet-400 w-4 h-4" />
              </div>
              <div>
                <h2 class="text-sm font-black text-white">{{ form.id ? 'Editar restaurante' : 'Novo restaurante' }}</h2>
                <p v-if="form.id" class="text-white/25 text-[10px] font-mono">{{ form.slug }}</p>
              </div>
            </div>
            <UButton icon="i-lucide-x" color="red" variant="ghost" size="xs" square @click="fecharModal" />
          </div>
        </template>

        <!-- Abas -->
        <div class="flex gap-1 px-5 pt-4 border-b border-white/[0.05] pb-3">
          <UButton
            v-for="aba in abas"
            :key="aba.id"
            :icon="aba.icon"
            :color="abaAtiva === aba.id ? 'violet' : 'gray'"
            :variant="abaAtiva === aba.id ? 'solid' : 'ghost'"
            size="xs"
            :ui="{ rounded: 'rounded-lg', font: 'font-black text-[11px]' }"
            @click="abaAtiva = aba.id"
          >
            {{ aba.label }}
          </UButton>
        </div>

        <!-- ABA DADOS -->
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
            <p class="text-[10px] font-black uppercase tracking-widest text-white/25">Features</p>
            <div v-for="feat in features" :key="feat.key" class="flex items-center justify-between">
              <div>
                <p class="text-sm font-bold text-white/80">{{ feat.label }}</p>
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

        <!-- ABA LICENÇA -->
        <div v-else-if="abaAtiva === 'licenca'" class="p-5">
          <div v-if="!form.id" class="text-center py-10 text-white/25 text-sm">
            Salve o restaurante primeiro para gerenciar a licença.
          </div>
          <div v-else class="space-y-4">
            <div>
              <label class="label-field mb-2">Status</label>
              <div class="flex gap-2">
                <UButton
                  v-for="s in licencaStatuses"
                  :key="s.value"
                  :color="licencaForm.status === s.value ? s.color : 'gray'"
                  :variant="licencaForm.status === s.value ? 'soft' : 'ghost'"
                  size="sm"
                  class="flex-1"
                  :ui="{ rounded: 'rounded-xl', font: 'font-black text-xs' }"
                  @click="licencaForm.status = s.value"
                >
                  {{ s.label }}
                </UButton>
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
            <div v-if="licencaAtual" class="text-[10px] text-white/25 pt-1">
              Criada em {{ formatDate(licencaAtual.created_at) }}
            </div>
          </div>
        </div>

        <!-- ABA CONTRATO -->
        <div v-else-if="abaAtiva === 'contrato'" class="p-5 space-y-4">
          <div>
            <label class="label-field">Plano *</label>
            <div class="flex gap-1.5 mb-2 flex-wrap">
              <UButton
                v-for="p in planosPredef"
                :key="p"
                :color="contratoForm.plano === p ? 'violet' : 'gray'"
                :variant="contratoForm.plano === p ? 'solid' : 'ghost'"
                size="xs"
                :ui="{ rounded: 'rounded-lg', font: 'font-bold text-xs' }"
                @click="contratoForm.plano = p"
              >
                {{ p }}
              </UButton>
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
                <UButton
                  :color="contratoForm.status === 'trial' ? 'sky' : 'gray'"
                  :variant="contratoForm.status === 'trial' ? 'soft' : 'ghost'"
                  size="sm" class="flex-1"
                  :ui="{ rounded: 'rounded-xl', font: 'font-black text-xs' }"
                  @click="contratoForm.status = 'trial'"
                >Teste</UButton>
                <UButton
                  :color="contratoForm.status === 'ativo' ? 'green' : 'gray'"
                  :variant="contratoForm.status === 'ativo' ? 'soft' : 'ghost'"
                  size="sm" class="flex-1"
                  :ui="{ rounded: 'rounded-xl', font: 'font-black text-xs' }"
                  @click="contratoForm.status = 'ativo'"
                >Ativo</UButton>
              </div>
            </div>
          </div>

          <div>
            <label class="label-field">Ciclo de cobrança</label>
            <div class="grid grid-cols-4 gap-1.5">
              <UButton
                v-for="c in ciclos"
                :key="c.value"
                :color="contratoForm.ciclo === c.value ? 'violet' : 'gray'"
                :variant="contratoForm.ciclo === c.value ? 'solid' : 'ghost'"
                size="xs"
                :ui="{ rounded: 'rounded-xl', font: 'font-black text-xs' }"
                @click="contratoForm.ciclo = c.value as any"
              >
                {{ c.label }}
              </UButton>
            </div>
          </div>

          <div>
            <label class="label-field">Início do contrato</label>
            <UInput v-model="contratoForm.dataInicio" type="date" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
          </div>

          <UAlert
            v-if="!form.id"
            icon="i-lucide-info"
            color="violet"
            variant="soft"
            description="O contrato será criado junto com o restaurante. Se deixar o plano em branco, pode ser adicionado depois."
          />
        </div>

        <UAlert v-if="erroModal" color="red" :description="erroModal" variant="soft" class="mx-5 mb-1" />

        <template #footer>
          <div class="flex gap-2">
            <UButton color="gray" variant="ghost" block :ui="{ rounded: 'rounded-xl', font: 'font-black' }" @click="fecharModal">
              Cancelar
            </UButton>
            <UButton
              color="violet"
              block
              :loading="salvando"
              :ui="{ rounded: 'rounded-xl', font: 'font-black' }"
              @click="salvar"
            >
              {{ salvando ? 'Salvando...' : (form.id ? 'Salvar' : 'Criar restaurante') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- ══ CONFIRM DIALOG ══ -->
    <UModal v-model="confirmDialog.show" :ui="{ width: 'max-w-xs', background: 'bg-[#111118]', ring: 'ring-1 ring-white/[0.09]', rounded: 'rounded-2xl' }">
      <UCard :ui="{ ring: '', background: 'bg-transparent', body: { padding: 'p-6' }, footer: { padding: 'px-5 pb-5 pt-0' } }">
        <div class="flex flex-col items-center text-center gap-4">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center border"
            :class="confirmDialog.type === 'danger' ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'">
            <UIcon
              :name="confirmDialog.type === 'danger' ? 'i-lucide-alert-triangle' : 'i-lucide-check-circle-2'"
              :class="confirmDialog.type === 'danger' ? 'text-red-400' : 'text-emerald-400'"
              class="w-5 h-5"
            />
          </div>
          <div>
            <h3 class="text-sm font-black text-white leading-tight">{{ confirmDialog.title }}</h3>
            <p class="text-[12px] text-white/35 mt-1.5 leading-relaxed">{{ confirmDialog.message }}</p>
          </div>
        </div>
        <template #footer>
          <div class="flex gap-2">
            <UButton color="gray" variant="ghost" block :ui="{ rounded: 'rounded-xl', font: 'font-black text-xs' }"
              @click="confirmDialog.resolve?.(false); confirmDialog.show = false">
              Cancelar
            </UButton>
            <UButton
              :color="confirmDialog.type === 'danger' ? 'red' : 'green'"
              block
              :ui="{ rounded: 'rounded-xl', font: 'font-black text-xs' }"
              @click="confirmDialog.resolve?.(true); confirmDialog.show = false"
            >
              Confirmar
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Toast via Nuxt UI -->
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
  return new Promise(resolve => {
    Object.assign(confirmDialog, { title, message, type, resolve, show: true })
  })
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
  { id: 'contrato' as const, label: 'Contrato', icon: 'i-lucide-banknote'  },
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
  { value: 'mensal',      label: 'Mensal'  },
  { value: 'trimestral',  label: 'Trim.'   },
  { value: 'semestral',   label: 'Semes.'  },
  { value: 'anual',       label: 'Anual'   },
]
const form = reactive({ id: null as string | null, nome: '', slug: '', cnpj: '', responsavel: '', contato: '', telefone: '', endereco: '', observacoes: '', vendaMobilePermitida: true, rfidDisponivel: false })
const licencaForm  = reactive({ status: 'pendente', dataAtivacao: '', dataVencimento: '' })
const contratoForm = reactive({ plano: '', valor: '', ciclo: 'mensal' as 'mensal' | 'trimestral' | 'semestral' | 'anual', dataInicio: '', status: 'ativo' as 'trial' | 'ativo' })

const baseUrl  = computed(() => (runtimeConfig.public as any).apiUrl as string)
const maxMrr   = computed(() => Math.max(...(dashboard.value?.financeiro?.por_plano?.map(p => p.mrr) ?? [0]), 0))

const tenantsFiltrados = computed(() => {
  const q = busca.value.toLowerCase().trim()
  if (!q) return tenants.value
  return tenants.value.filter(t => t.nome.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q) || (t.responsavel || '').toLowerCase().includes(q))
})

const metrics = computed(() => {
  const vencidas = dashboard.value?.licencas?.vencidas ?? 0
  const vencendo = dashboard.value?.licencas?.vencendo ?? 0
  const totalVenc = vencidas + vencendo
  return [
    {
      icon: 'i-lucide-store', value: dashboard.value?.totais?.tenants ?? tenants.value.length,
      label: 'Restaurantes', iconClass: 'text-white/20', valueClass: 'text-white', subClass: 'text-white/30',
      cardClass: 'border border-white/[0.06] bg-white/[0.02]',
    },
    {
      icon: 'i-lucide-trending-up', value: formatCurrency(dashboard.value?.financeiro?.mrr ?? 0),
      label: 'Receita mensal', iconClass: 'text-emerald-400', valueClass: 'text-emerald-400', subClass: 'text-emerald-400/50',
      cardClass: 'border border-emerald-500/20 bg-emerald-500/[0.04]',
    },
    {
      icon: 'i-lucide-key-round',
      value: dashboard.value?.licencas?.ativas ?? 0,
      label: (dashboard.value?.licencas?.bloqueadas ?? 0) > 0 ? `${dashboard.value?.licencas?.bloqueadas} bloqueada(s)` : 'Licenças ativas',
      iconClass: 'text-white/20',
      valueClass: 'text-white',
      subClass: (dashboard.value?.licencas?.bloqueadas ?? 0) > 0 ? 'text-red-400' : 'text-white/30',
      cardClass: (dashboard.value?.licencas?.bloqueadas ?? 0) > 0 ? 'border border-red-500/20 bg-white/[0.02]' : 'border border-white/[0.06] bg-white/[0.02]',
    },
    {
      icon: 'i-lucide-clock', value: totalVenc,
      label: vencidas > 0 ? 'vencidas' : vencendo > 0 ? 'vencendo em 30d' : 'sem vencimentos',
      iconClass: vencidas > 0 ? 'text-red-400/60' : vencendo > 0 ? 'text-amber-400/60' : 'text-white/30',
      valueClass: vencidas > 0 ? 'text-red-400' : vencendo > 0 ? 'text-amber-400' : 'text-white',
      subClass:   vencidas > 0 ? 'text-red-400/60' : vencendo > 0 ? 'text-amber-400/60' : 'text-white/25',
      cardClass:  vencidas > 0 ? 'border border-red-500/20 bg-red-500/[0.03]' : vencendo > 0 ? 'border border-amber-500/20 bg-amber-500/[0.03]' : 'border border-white/[0.06] bg-white/[0.02]',
    },
  ]
})

const AVATAR_COLORS = [
  'bg-violet-500/20 text-violet-300', 'bg-sky-500/20 text-sky-300',
  'bg-emerald-500/20 text-emerald-300', 'bg-amber-500/20 text-amber-300',
  'bg-rose-500/20 text-rose-300', 'bg-indigo-500/20 text-indigo-300',
]
function avatarColor(nome: string) { return AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length] }
function statusDot(s: string) { return s === 'ativo' ? 'bg-emerald-400' : s === 'suspenso' ? 'bg-amber-400' : 'bg-red-400' }
function licencaBadgeColor(s: string): 'sky' | 'yellow' | 'red' { return s === 'ativado' ? 'sky' : s === 'pendente' ? 'yellow' : 'red' }
function licencaLabel(lic: Licenca) {
  if (lic.status === 'ativado' && lic.data_vencimento) {
    const d = Math.ceil((new Date(lic.data_vencimento).getTime() - Date.now()) / 86400000)
    if (d < 0)  return 'Expirada'
    if (d <= 7) return `${d}d restantes`
    return `Até ${formatDate(lic.data_vencimento)}`
  }
  return lic.status === 'ativado' ? 'Ativa' : lic.status === 'pendente' ? 'Pendente' : 'Bloqueada'
}
function alertaStyle(tipo: string) {
  if (tipo === 'licenca_vencida' || tipo === 'licenca_critica') return { icon: 'i-lucide-alert-circle', icon_color: 'text-red-400' }
  if (tipo === 'licenca_vencendo') return { icon: 'i-lucide-clock', icon_color: 'text-amber-400' }
  return { icon: 'i-lucide-alert-circle', icon_color: 'text-orange-400' }
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

function showToast(type: 'success' | 'error', description: string) {
  toast.add({
    title: type === 'success' ? 'Sucesso' : 'Erro',
    description,
    color: type === 'success' ? 'green' : 'red',
    icon: type === 'success' ? 'i-lucide-check-circle-2' : 'i-lucide-alert-circle',
    timeout: 3000,
  })
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
    const [t, d] = await Promise.all([
      platformFetch<Tenant[]>('/platform/tenants'),
      platformFetch<Dashboard>('/platform/tenants/dashboard'),
    ])
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
    licencaForm.status = 'pendente'; licencaForm.dataAtivacao = ''; licencaForm.dataVencimento = ''
    resetContratoForm()
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
      if (contratoForm.plano.trim()) {
        payload.contrato = { plano: contratoForm.plano.trim(), valor: contratoForm.valor ? parseFloat(contratoForm.valor) : null, ciclo: contratoForm.ciclo, dataInicio: contratoForm.dataInicio || null, status: contratoForm.status }
      }
      const c = await platformFetch<any>('/platform/tenants', { method: 'POST', body: JSON.stringify(payload) })
      form.id = c.id
      msg = contratoForm.plano.trim() ? 'Restaurante e contrato criados!' : 'Restaurante criado!'
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
    showToast('success', msg)
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
  const ok = await showConfirm(
    novoStatus === 'suspenso' ? `Suspender "${tenant.nome}"?` : `Reativar "${tenant.nome}"?`,
    novoStatus === 'suspenso' ? 'O tenant ficará inacessível até ser reativado manualmente.' : 'O tenant voltará a funcionar normalmente.',
    novoStatus === 'suspenso' ? 'danger' : 'success'
  )
  if (!ok) return
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
.input-dark :deep(input),
.input-dark :deep(textarea) {
  @apply bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/20 focus:border-violet-500/50 focus:bg-white/[0.06];
}
</style>
