<template>
  <!-- Trajeto da entrega para o cliente: do aceite até receber. Em rota, o
       entregador ao vivo e as paradas numeradas até a sua (1ª, 2ª…). -->
  <div>
    <template v-if="rota.emRota">
      <p class="text-sm font-black">{{ rota.entregador.nome }} está a caminho</p>
      <p class="text-sm cdp-mudo mt-0.5">
        <template v-if="rota.paradasAntes === 0">Sua entrega é a próxima.</template>
        <template v-else>Sua entrega é a <b class="cdp-txt">{{ rota.minhaParada }}ª parada</b>: {{ rota.paradasAntes === 1 ? 'falta 1 entrega' : `faltam ${rota.paradasAntes} entregas` }} antes da sua.</template>
        <template v-if="rota.entregador.posicao"> Posição de {{ hora(rota.entregador.posicao.em) }}.</template>
      </p>
    </template>
    <template v-else>
      <p class="text-sm font-black">Caminho da entrega</p>
      <p class="text-sm cdp-mudo mt-0.5">Quando o pedido sair, você acompanha o entregador aqui, ao vivo.</p>
    </template>

    <MapaDelivery v-if="marcadores.length" class="mt-3" :marcadores="marcadores" :rotas="rotas" :altura="altura"
      descricao="Mapa com o trajeto do entregador até o seu endereço" />

    <!-- Legenda das paradas: as dos outros clientes são aproximadas e sem nome -->
    <ol v-if="rota.emRota && rota.paradasAntes > 0" class="mt-3 flex flex-wrap gap-1.5 text-xs" aria-label="Paradas da rota">
      <li v-for="p in rota.paradas" :key="p.ordem" class="ae-parada">
        <span class="ae-num">{{ p.ordem }}ª</span> parada
      </li>
      <li class="ae-parada ae-voce"><span class="ae-num">{{ rota.minhaParada }}ª</span> você</li>
    </ol>
    <p v-if="rota.emRota && rota.paradasAntes > 0" class="mt-2 text-[11px] cdp-mudo">As outras paradas aparecem só pela região, sem o endereço.</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MapaDelivery from '~/components/MapaDelivery.vue'

const props = withDefaults(defineProps<{ rota: any; restaurante?: string; altura?: string }>(), { restaurante: 'Restaurante', altura: '260px' })

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

// Restaurante, o entregador, as paradas antes (aproximadas, numeradas) e o endereço DESTE cliente
const marcadores = computed(() => {
  const r = props.rota
  const m: any[] = []
  if (r.restaurante) m.push({ id: 'r', tipo: 'restaurante', ...r.restaurante, titulo: props.restaurante })
  for (const p of r.paradas ?? []) if (p.local) m.push({ id: `p${p.ordem}`, tipo: 'parada', ...p.local, rotulo: `${p.ordem}ª`, titulo: `${p.ordem}ª parada` })
  if (r.destino) {
    const n = r.emRota && r.paradasAntes > 0 ? `${r.minhaParada}ª` : '★'
    m.push({ id: 'd', tipo: 'destino', ...r.destino, rotulo: n, titulo: r.emRota && r.paradasAntes > 0 ? `Sua entrega · ${r.minhaParada}ª parada` : 'Seu endereço' })
  }
  if (r.entregador?.posicao) m.push({ id: 'e', tipo: 'entregador', lat: r.entregador.posicao.lat, lng: r.entregador.posicao.lng, titulo: r.entregador.nome })
  return m
})

// Trajeto: do entregador (ou do restaurante, antes de sair) pelas paradas, na ordem, até o cliente
const rotas = computed(() => {
  const r = props.rota
  if (!r?.destino) return []
  const de = r.entregador?.posicao ?? r.restaurante
  if (!de) return []
  const meio = (r.paradas ?? []).filter((p: any) => p.local).map((p: any) => p.local)
  return [{ id: 'cliente', pontos: [{ lat: de.lat, lng: de.lng }, ...meio, r.destino], destaque: Boolean(r.emRota) }]
})
</script>

<style scoped>
.ae-parada { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 4px; border-radius: 999px; background: var(--cdp-chip); }
.ae-num { display: inline-grid; place-items: center; min-width: 22px; height: 22px; padding: 0 4px; border-radius: 999px; background: #111827; color: #fff; font-weight: 800; font-size: 11px; }
.ae-voce { font-weight: 800; }
.ae-voce .ae-num { background: #16a34a; }
</style>
