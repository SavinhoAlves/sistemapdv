<template>
  <div v-if="visivel" class="aviso" role="status">
    <AlertTriangle :size="18" class="shrink-0" />
    <p>{{ texto }}</p>
    <button type="button" aria-label="Dispensar aviso" @click="dispensar"><X :size="16" /></button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { AlertTriangle, X } from 'lucide-vue-next'

/** Aviso que /api/sistema/status-licenca manda: mensalidade na tolerância ou teste acabando. */
export interface AvisoLicencaDados { tipo: 'tolerancia' | 'teste' | 'vencendo'; dias: number; liberadoAte: string; bloqueioEm?: string }

const aviso = useState<AvisoLicencaDados | null>('licenca_aviso', () => null)

// Dispensado vale só para o dia e para esta aba
const CHAVE = 'aviso_licenca_dispensado'
const hoje = new Date().toISOString().slice(0, 10)
const dispensadoHoje = ref(false)
try { dispensadoHoje.value = sessionStorage.getItem(CHAVE) === hoje } catch {}
function dispensar() {
  dispensadoHoje.value = true
  try { sessionStorage.setItem(CHAVE, hoje) } catch {}
}

const data = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')
const emDias = (n: number) => (n <= 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`)

const visivel = computed(() => !!aviso.value && !dispensadoHoje.value)
const texto = computed(() => {
  const a = aviso.value
  if (!a) return ''
  if (a.tipo === 'vencendo')
    return `A mensalidade vence ${emDias(a.dias)} (${data(a.liberadoAte)}).${a.bloqueioEm ? ` Sem pagamento, o acesso é bloqueado em ${data(a.bloqueioEm)}.` : ''}`
  return a.tipo === 'tolerancia'
    ? `A mensalidade está vencida. O acesso será bloqueado ${emDias(a.dias)} (${data(a.liberadoAte)}) se o pagamento não for registrado.`
    : `O período de teste termina ${emDias(a.dias)} (${data(a.liberadoAte)}). Fale com o suporte para continuar usando o sistema.`
})
</script>

<style scoped>
.aviso {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: var(--e-3);
  padding: var(--e-2) var(--e-4);
  background: var(--st-atencao-bg); color: var(--st-atencao);
  border-bottom: 1px solid var(--linha);
  font-size: var(--t-micro); font-weight: 600;
}
.aviso p { flex: 1; margin: 0; }
.aviso button { display: grid; place-items: center; width: 32px; height: 32px; border-radius: var(--r-controle); color: inherit; }
.aviso button:hover { background: color-mix(in srgb, currentColor 12%, transparent); }
</style>
