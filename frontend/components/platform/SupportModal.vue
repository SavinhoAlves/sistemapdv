<template>
  <PlatformModal
    :model-value="modelValue"
    :titulo="modo === 'visualizacao' ? 'Acessar para visualizar' : 'Acessar para auxiliar'"
    :subtitulo="tenant?.nome"
    pequena
    @update:model-value="emit('update:modelValue', $event)"
  >
    <template #icone>
      <Eye v-if="modo === 'visualizacao'" :size="18" />
      <MousePointer2 v-else :size="18" />
    </template>

    <div class="pf-note" :class="modo === 'visualizacao' ? 'info' : 'warn'">
      {{ modo === 'visualizacao' ? 'Só leitura: você vê o sistema do restaurante sem conseguir alterar nada.' : 'Você poderá fazer alterações no sistema do restaurante.' }}
    </div>

    <div class="pf-boxm">
      <span class="pf-lab">Em qual tela o cliente está com problema?</span>
      <div class="pf-rotas">
        <button v-for="r in rotasSuporte" :key="r.rota" type="button" :class="{ sel: rota === r.rota }" @click="rota = r.rota">
          <span>{{ r.label }}</span>
          <small v-if="r.destaque">Resumo do dia ao vivo</small>
        </button>
      </div>
      <div class="pf-fld">
        <label class="pf-lab" for="sp-rota">Outra tela (caminho)</label>
        <input id="sp-rota" v-model="rota" class="pf-inp" type="text" placeholder="/pagina-especifica" style="font-family:ui-monospace,monospace">
      </div>
    </div>

    <template #rodape>
      <button class="pf-btn" @click="emit('update:modelValue', false)">Cancelar</button>
      <button class="pf-btn" :class="modo === 'visualizacao' ? 'k' : 'p'" :disabled="loading" @click="confirmar">
        <Loader2 v-if="loading" :size="16" class="animate-spin" /> Entrar
      </button>
    </template>
  </PlatformModal>
</template>

<script setup lang="ts">
import { Eye, MousePointer2, Loader2 } from 'lucide-vue-next'
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
    // A aba nova abre fora do roteador: precisa do baseURL (o sistema vive em /app)
    if (novaAba) novaAba.location.href = useRuntimeConfig().app.baseURL + rota.value.replace(/^\//, '')
  } catch (e: any) {
    novaAba?.close()
    toast.add({ title: 'Erro', description: e?.message || 'Não foi possível gerar token de suporte', color: 'red', icon: 'i-lucide-alert-circle', timeout: 3000 })
  } finally {
    loading.value = false
  }
}
</script>
