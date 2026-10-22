<template>
  <PlatformShell ativo="painel" titulo="Visão geral" :contagens="{ restaurantes: tenants.length }">

    <div class="pf-crumb">Clientes</div>
    <div class="pf-head">
      <div>
        <h1>Visão geral</h1>
        <p>Como estão os restaurantes que usam o sistema: licenças, receita e o que pede uma ação sua.</p>
      </div>
      <button class="pf-btn p" @click="modalNovo = true"><Plus :size="18" /> Novo restaurante</button>
    </div>

    <div v-if="loading && !dashboard" class="pf-loading"><span class="pf-spin" /></div>

    <div v-else-if="erro" class="pf-card">
      <div class="pf-empty">
        <b>Não deu para carregar a visão geral</b>
        <p>{{ erro }}</p>
        <button class="pf-btn" @click="carregar">Tentar novamente</button>
      </div>
    </div>

    <template v-else>
      <div class="pf-strip">
        <div class="pf-st">
          <small>Restaurantes</small>
          <strong>{{ dashboard?.totais?.tenants ?? tenants.length }}</strong>
          <em>{{ dashboard?.totais?.ativos ?? 0 }} ativos<template v-if="dashboard?.totais?.suspensos"> · {{ dashboard.totais.suspensos }} suspensos</template></em>
        </div>
        <div class="pf-st">
          <small>Receita do mês</small>
          <strong>{{ moeda(dashboard?.financeiro?.mrr ?? 0) }}</strong>
          <em>{{ moeda(dashboard?.financeiro?.arr ?? 0) }} por ano</em>
        </div>
        <div class="pf-st" :class="{ hot: (dashboard?.licencas?.bloqueadas ?? 0) > 0 }">
          <small>Liberados</small>
          <strong>{{ dashboard?.licencas?.ativas ?? 0 }}</strong>
          <em>{{ dashboard?.licencas?.bloqueadas ? `${dashboard.licencas.bloqueadas} bloqueados` : 'nenhum bloqueado' }}<template v-if="dashboard?.licencas?.teste"> · {{ dashboard.licencas.teste }} em teste</template></em>
        </div>
        <div class="pf-st" :class="{ hot: vencimentos > 0 }">
          <small>Cobranças a acompanhar</small>
          <strong>{{ vencimentos }}</strong>
          <em>{{ dashboard?.licencas?.vencidas ? `${dashboard.licencas.vencidas} em atraso` : 'vencendo nos próximos 5 dias' }}</em>
        </div>
      </div>

      <div class="pf-two">
        <!-- Atenção -->
        <div class="pf-card">
          <div class="pf-card-h">
            <div>
              <h2>Pendências</h2>
              <p>{{ alertas.length ? `${alertas.length} ${alertas.length === 1 ? 'restaurante pede' : 'restaurantes pedem'} uma ação` : 'Nenhum restaurante travado' }}</p>
            </div>
          </div>
          <template v-if="alertas.length">
            <NuxtLink v-for="a in alertas" :key="a.tenantId + a.tipo" :to="(a as any).link ?? `/platform/tenants/${a.tenantId}`" class="pf-att">
              <span class="pf-ico" :class="a.tom"><component :is="a.icone" :size="20" /></span>
              <div>
                <b>{{ a.titulo }}</b>
                <small>{{ a.detalhe }}</small>
              </div>
              <span class="pf-btn s">Abrir</span>
            </NuxtLink>
          </template>
          <div v-else class="pf-empty"><b>Sem pendências</b>Ninguém atrasado nem bloqueado.</div>
        </div>

        <!-- Receita e recursos -->
        <div>
          <div class="pf-card">
            <div class="pf-card-h">
              <div><h2>Receita por plano</h2><p>Quanto os contratos de cada plano somam por mês</p></div>
            </div>
            <div v-if="porPlano.length" class="pf-pad" style="display:grid;gap:16px">
              <div v-for="p in porPlano" :key="p.plano">
                <div style="display:flex;justify-content:space-between;gap:12px">
                  <span><b>{{ p.plano }}</b> <span class="pf-tag">{{ p.count }}×</span></span>
                  <b>{{ moeda(p.mrr) }}</b>
                </div>
                <div class="pf-bar"><i :style="{ width: maxMrr ? `${(p.mrr / maxMrr) * 100}%` : '0%' }" /></div>
              </div>
            </div>
            <div v-else class="pf-empty"><b>Sem contratos ativos</b>A receita aparece quando um restaurante assinar.</div>
          </div>

          <div class="pf-card">
            <div class="pf-card-h">
              <div><h2>Recursos em uso</h2><p>Quantos restaurantes têm cada recurso liberado</p></div>
            </div>
            <div class="pf-pad" style="display:grid;gap:16px">
              <div v-for="r in recursos" :key="r.rotulo">
                <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
                  <span style="display:flex;align-items:center;gap:10px"><component :is="r.icone" :size="18" /> <b>{{ r.rotulo }}</b></span>
                  <span><b>{{ r.qtd }}</b> <span style="color:var(--pf-muted)">de {{ tenants.length }}</span></span>
                </div>
                <div class="pf-bar"><i :style="{ width: tenants.length ? `${(r.qtd / tenants.length) * 100}%` : '0%' }" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <PlatformTenantModal v-model="modalNovo" :tenant="null" @saved="carregar" />
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Component } from 'vue'
import { Plus, Clock, Wallet, CreditCard, Smartphone, Bike, Lock, Hourglass } from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import { usePlatformTenants, moeda } from '~/composables/usePlatformTenants'

definePageMeta({ layout: false })

const platformAuth = usePlatformAuthStore()
const { tenants, dashboard, loading, erro, carregar } = usePlatformTenants()
const modalNovo = ref(false)

const vencimentos = computed(() => (dashboard.value?.licencas?.vencidas ?? 0) + (dashboard.value?.licencas?.vencendo ?? 0))
const porPlano = computed(() => dashboard.value?.financeiro?.porPlano ?? [])
const maxMrr = computed(() => Math.max(0, ...porPlano.value.map(p => p.mrr)))

const recursos = computed<{ rotulo: string; icone: Component; qtd: number }[]>(() => [
  { rotulo: 'RFID',              icone: CreditCard, qtd: tenants.value.filter(t => t.rfidDisponivel).length },
  { rotulo: 'Venda pelo celular', icone: Smartphone, qtd: tenants.value.filter(t => t.vendaMobilePermitida).length },
  { rotulo: 'Delivery',          icone: Bike,       qtd: tenants.value.filter(t => t.deliveryDisponivel).length },
])

const nDias = (n?: number) => `${n ?? 0} ${n === 1 ? 'dia' : 'dias'}`

/** Alertas do backend (situação da assinatura) traduzidos para a lista de pendências. */
const alertas = computed(() => (dashboard.value?.alertas ?? []).map(a => {
  const valor = a.valor ? `${moeda(a.valor)} · ` : ''
  if (a.tipo === 'tolerancia')
    return { ...a, tom: 'warn', icone: Wallet as Component, titulo: `${a.nome}: mensalidade atrasada`, detalhe: `${valor}bloqueia em ${nDias(a.dias)} se não pagar` }
  if (a.tipo === 'vencendo')
    return { ...a, tom: 'warn', icone: Clock as Component, titulo: `${a.nome}: vence ${a.dias === 0 ? 'hoje' : `em ${nDias(a.dias)}`}`, detalhe: `${valor}lembre o cliente do pagamento` }
  if (a.tipo === 'teste_acabando')
    return { ...a, tom: 'info', icone: Hourglass as Component, titulo: `${a.nome}: teste ${a.dias === 0 ? 'acaba hoje' : `acaba em ${nDias(a.dias)}`}`, detalhe: 'Hora de fechar o contrato' }
  return { ...a, tom: 'bad', icone: Lock as Component, titulo: `${a.nome}: bloqueado`, detalhe: 'Registre o pagamento para liberar o acesso' }
}))

onMounted(() => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) { navigateTo('/platform/login'); return }
  carregar()
})
</script>
