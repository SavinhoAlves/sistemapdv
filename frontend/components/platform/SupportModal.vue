<template>
  <UModal :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)"
    :ui="{ width: 'sm:max-w-sm', rounded: 'rounded-2xl' }">
    <UCard :ui="{ background: 'bg-[#0e0d14]', ring: 'ring-1 ring-white/[0.08]', rounded: 'rounded-2xl', body: { padding: 'p-5' }, header: { padding: 'px-5 pt-5 pb-0' } }">
      <template #header>
        <div class="flex items-center gap-3 mb-4">
          <div :class="['size-9 rounded-xl flex items-center justify-center shrink-0',
            modo === 'visualizacao' ? 'bg-sky-500/10' : 'bg-amber-500/10']">
            <UIcon :name="modo === 'visualizacao' ? 'i-lucide-eye' : 'i-lucide-wrench'"
              :class="['size-4', modo === 'visualizacao' ? 'text-sky-400' : 'text-amber-400']" />
          </div>
          <div>
            <p class="text-sm font-black text-white">
              {{ modo === 'visualizacao' ? 'Modo visualização' : 'Modo ação' }}
            </p>
            <p class="text-[11px] text-white/30">{{ tenant?.nome }}</p>
          </div>
        </div>
        <p class="text-[11px] text-white/40 mb-3">Em qual tela o cliente está com problema?</p>
      </template>

      <div class="space-y-1.5">
        <button
          v-for="r in rotasSuporte" :key="r.rota"
          @click="rota = r.rota"
          :class="['w-full flex items-center gap-3 rounded-xl transition-colors text-left border',
            r.destaque ? 'px-3 py-3' : 'px-3 py-2.5',
            rota === r.rota
              ? (modo === 'visualizacao' ? 'bg-sky-500/15 border-sky-500/25' : 'bg-amber-500/15 border-amber-500/25')
              : r.destaque
                ? 'bg-white/[0.05] border-white/[0.10] hover:bg-white/[0.08]'
                : 'bg-white/[0.03] border-transparent hover:bg-white/[0.06]']"
        >
          <div :class="['shrink-0 flex items-center justify-center rounded-lg',
            r.destaque ? 'size-7' : 'size-5',
            rota === r.rota
              ? (modo === 'visualizacao' ? 'bg-sky-500/20' : 'bg-amber-500/20')
              : r.destaque ? 'bg-white/[0.08]' : 'bg-transparent']">
            <UIcon :name="r.icone" :class="[
              r.destaque ? 'size-4' : 'size-3.5',
              rota === r.rota
                ? (modo === 'visualizacao' ? 'text-sky-400' : 'text-amber-400')
                : r.destaque ? 'text-white/60' : 'text-white/30']" />
          </div>
          <div>
            <span :class="['font-semibold block leading-tight text-xs',
              rota === r.rota ? 'text-white/90' : r.destaque ? 'text-white/70' : 'text-white/50']">
              {{ r.label }}
            </span>
            <span v-if="r.destaque" class="text-[10px] text-white/25">Resumo do dia com dados ao vivo</span>
          </div>
          <UIcon v-if="r.destaque && rota !== r.rota" name="i-lucide-star" class="size-3 text-white/20 ml-auto" />
        </button>

        <div class="pt-1">
          <label class="text-[10px] font-bold text-white/25 uppercase tracking-wider block mb-1.5">Outra tela (caminho)</label>
          <input v-model="rota" type="text" placeholder="/pagina-especifica"
            class="w-full h-9 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/80 text-xs placeholder-white/20 outline-none focus:border-indigo-500/40 transition-colors font-mono" />
        </div>
      </div>

      <template #footer>
        <div class="flex gap-2 pt-1">
          <button @click="emit('update:modelValue', false)"
            class="flex-1 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] text-white/40 text-xs font-bold transition-colors">
            Cancelar
          </button>
          <button @click="confirmar" :disabled="loading"
            :class="['flex-1 h-9 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50',
              modo === 'visualizacao'
                ? 'bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/25 text-sky-400'
                : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/25 text-amber-400']">
            <UIcon v-if="loading" name="i-lucide-loader-2" class="size-3.5 animate-spin" />
            <UIcon v-else :name="modo === 'visualizacao' ? 'i-lucide-eye' : 'i-lucide-wrench'" class="size-3.5" />
            Entrar
          </button>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

interface Tenant {
  id: string; nome: string; slug: string
}

const props = defineProps<{
  modelValue: boolean
  tenant: Tenant | null
  modo: 'visualizacao' | 'auxiliar'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const authStore           = useAuthStore()
const toast               = useToast()
const { platformFetch }   = usePlatformFetch()

const rota    = ref('/')
const loading = ref(false)

watch(() => props.modelValue, (open) => { if (open) rota.value = '/' })

const rotasSuporte = [
  { label: 'Tempo Real',    rota: '/',             icone: 'i-lucide-activity',      destaque: true  },
  { label: 'Mesas',         rota: '/mesas',         icone: 'i-lucide-layout-grid',   destaque: false },
  { label: 'Caixa',         rota: '/caixa',         icone: 'i-lucide-calculator',    destaque: false },
  { label: 'Vendas',        rota: '/vendas',        icone: 'i-lucide-shopping-cart', destaque: false },
  { label: 'Configurações', rota: '/configuracoes', icone: 'i-lucide-settings',      destaque: false },
  { label: 'Relatórios',    rota: '/relatorios',    icone: 'i-lucide-bar-chart-2',   destaque: false },
  { label: 'Administração', rota: '/admin',         icone: 'i-lucide-shield',        destaque: false },
]

async function confirmar() {
  if (!props.tenant) return
  loading.value = true
  const novaAba = window.open('about:blank', '_blank')
  try {
    const res = await platformFetch<any>(`/platform/tenants/${props.tenant.id}/support-token`, { method: 'POST', body: '{}' })
    authStore.entrarComoSuporte(res.access_token, res.tenantNome, {
      id: res.usuario.id, nome: res.usuario.nome, cargo: res.usuario.cargo,
    }, props.modo)
    emit('update:modelValue', false)
    if (novaAba) novaAba.location.href = rota.value
  } catch (e: any) {
    novaAba?.close()
    toast.add({ title: 'Erro', description: e?.message || 'Não foi possível gerar token de suporte', color: 'red', icon: 'i-lucide-alert-circle', timeout: 3000 })
  } finally {
    loading.value = false
  }
}
</script>
