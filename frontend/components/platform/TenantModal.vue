<template>
  <UModal :model-value="modelValue" @update:model-value="fechar"
    :ui="{ container: 'items-start pt-8', width: 'max-w-2xl', background: 'bg-[#0e0d18]', ring: 'ring-1 ring-white/[0.09]', rounded: 'rounded-2xl' }">
    <UCard :ui="{ background: 'bg-transparent', ring: '', divide: 'divide-white/[0.07]', header: { padding: 'px-5 py-4' }, body: { padding: 'p-0' }, footer: { padding: 'px-5 pb-5 pt-3' } }">

      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="size-9 rounded-xl bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
              <UIcon name="i-lucide-file-text" class="text-white size-4" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-white text-balance">{{ isEdit ? 'Editar restaurante' : 'Cadastrar novo cliente' }}</h2>
              <p class="text-white/30 text-[10px]">{{ isEdit ? form.slug : 'Preencha os dados para gerar o contrato automaticamente' }}</p>
            </div>
          </div>
          <button @click="fechar" class="size-7 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors">
            <UIcon name="i-lucide-x" class="size-3.5" />
          </button>
        </div>
      </template>

      <!-- ── TABS (edição) ── -->
      <div v-if="isEdit" class="flex gap-1 px-5 pt-4 border-b border-white/[0.05] pb-3">
        <UButton v-for="aba in abas" :key="aba.id"
          :icon="aba.icon"
          :color="abaAtiva === aba.id ? 'violet' : 'gray'"
          :variant="abaAtiva === aba.id ? 'solid' : 'ghost'"
          size="xs" :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-[11px]' }"
          @click="abaAtiva = aba.id">{{ aba.label }}</UButton>
      </div>

      <!-- ── STEPPER (criação) ── -->
      <div v-else class="flex items-center gap-0 px-5 pt-5 pb-4 border-b border-white/[0.05]">
        <template v-for="(s, i) in passos" :key="s.id">
          <div class="flex items-center gap-2 min-w-0">
            <div :class="['size-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 transition-colors',
              passo > i ? 'bg-violet-600 text-white' : passo === i ? 'bg-violet-600/20 border border-violet-500/50 text-violet-400' : 'bg-white/[0.06] text-white/25']">
              <UIcon v-if="passo > i" name="i-lucide-check" class="size-3" />
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span :class="['text-xs font-semibold truncate transition-colors', passo === i ? 'text-white/80' : passo > i ? 'text-violet-400' : 'text-white/25']">{{ s.label }}</span>
          </div>
          <div v-if="i < passos.length - 1" class="flex-1 h-px mx-3 transition-colors" :class="passo > i ? 'bg-violet-600/50' : 'bg-white/[0.07]'" />
        </template>
      </div>

      <!-- ════ CRIAÇÃO — passos ════ -->
      <div v-if="!isEdit" class="p-5 space-y-4 max-h-[62vh] overflow-y-auto">

        <!-- Passo 1: Estabelecimento -->
        <template v-if="passo === 0">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="label-field">Nome do restaurante / comércio *</label>
              <UInput v-model="form.nome" @input="autoSlug" placeholder="Ex: Restaurante Tarantela" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
            <div>
              <label class="label-field">Identificador (slug) *</label>
              <UInput v-model="form.slug" placeholder="ex: tarantela" size="sm" :ui="{ rounded: 'rounded-xl', base: 'font-mono text-xs' }" class="input-dark" />
              <p class="text-[10px] text-white/20 mt-1">Usado na URL do sistema</p>
            </div>
            <div>
              <label class="label-field">CNPJ ou CPF</label>
              <UInput v-model="form.cnpj" placeholder="00.000.000/0001-00" size="sm" :ui="{ rounded: 'rounded-xl', base: 'font-mono text-xs' }" class="input-dark" />
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
              <label class="label-field">Nome do responsável</label>
              <UInput v-model="form.responsavel" placeholder="Nome completo" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
            <div>
              <label class="label-field">CPF do responsável</label>
              <UInput v-model="form.cpfResponsavel" placeholder="000.000.000-00" size="sm" :ui="{ rounded: 'rounded-xl', base: 'font-mono text-xs' }" class="input-dark" />
            </div>
            <div class="sm:col-span-2">
              <label class="label-field">Logradouro (rua, número, bairro)</label>
              <UInput v-model="form.endereco" placeholder="Rua das Flores, 123, Centro" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
            <div>
              <label class="label-field">Cidade</label>
              <UInput v-model="form.cidade" placeholder="Goiânia" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
            <div>
              <label class="label-field">UF</label>
              <UInput v-model="form.uf" placeholder="GO" maxlength="2" size="sm" :ui="{ rounded: 'rounded-xl', base: 'uppercase font-mono' }" class="input-dark" />
            </div>
          </div>
        </template>

        <!-- Passo 2: Acesso admin -->
        <template v-else-if="passo === 1">
          <div class="p-3 rounded-xl bg-rose-500/[0.05] border border-rose-500/10 text-[11px] text-rose-300/60 leading-relaxed">
            Defina as credenciais que o cliente usará para acessar o sistema. O e-mail e a senha podem ser alterados posteriormente.
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="label-field">E-mail de acesso *</label>
              <UInput v-model="adminForm.email" type="email" placeholder="admin@restaurante.com" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" autocomplete="off" />
            </div>
            <div>
              <label class="label-field">Senha inicial * <span class="text-white/20 normal-case font-normal">(mín. 6 caracteres)</span></label>
              <UInput v-model="adminForm.senha" :type="mostrarSenha ? 'text' : 'password'" placeholder="••••••••" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" autocomplete="new-password"
                :trailing-icon="mostrarSenha ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                @click:trailing="mostrarSenha = !mostrarSenha" />
            </div>
            <div>
              <label class="label-field">Confirmar senha *</label>
              <UInput v-model="adminForm.senhaConfirm" :type="mostrarSenha ? 'text' : 'password'" placeholder="••••••••" size="sm"
                :ui="{ rounded: 'rounded-xl', icon: { trailing: { color: adminForm.senhaConfirm && adminForm.senhaConfirm !== adminForm.senha ? 'text-red-400' : 'text-emerald-400' } } }"
                :trailing-icon="adminForm.senhaConfirm ? (adminForm.senhaConfirm === adminForm.senha ? 'i-lucide-check-circle-2' : 'i-lucide-x-circle') : undefined"
                class="input-dark" autocomplete="new-password" />
            </div>
          </div>
        </template>

        <!-- Passo 3: Contrato -->
        <template v-else>
          <div class="p-3 rounded-xl bg-indigo-500/[0.05] border border-indigo-500/10 text-[11px] text-indigo-300/60 leading-relaxed">
            Um <strong class="text-indigo-300">Contrato de Prestação de Serviços</strong> será gerado automaticamente e ficará disponível para impressão e assinatura.
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="label-field">Plano *</label>
              <div class="flex gap-1.5 mb-2 flex-wrap">
                <UButton v-for="p in planosPredef" :key="p"
                  :color="contratoForm.plano === p ? 'violet' : 'gray'"
                  :variant="contratoForm.plano === p ? 'solid' : 'ghost'"
                  size="xs" :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-xs' }"
                  @click="contratoForm.plano = p">{{ p }}</UButton>
              </div>
              <UInput v-model="contratoForm.plano" placeholder="Ou escreva o nome..." size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
            <div>
              <label class="label-field">Valor mensal (R$)</label>
              <UInput v-model="contratoForm.valor" type="number" min="0" step="0.01" placeholder="0,00" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
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
            <div>
              <label class="label-field">Fim do contrato (opcional)</label>
              <UInput v-model="contratoForm.dataFim" type="date" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
            </div>
            <div class="sm:col-span-2">
              <label class="label-field">Status do contrato</label>
              <div class="flex gap-1.5 mt-0.5">
                <UButton :color="contratoForm.status === 'trial' ? 'amber' : 'gray'" :variant="contratoForm.status === 'trial' ? 'soft' : 'ghost'" size="sm" class="flex-1" :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-xs' }" @click="contratoForm.status = 'trial'">Ag. assinatura</UButton>
                <UButton :color="contratoForm.status === 'ativo' ? 'green' : 'gray'" :variant="contratoForm.status === 'ativo' ? 'soft' : 'ghost'" size="sm" class="flex-1" :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-xs' }" @click="contratoForm.status = 'ativo'">Assinado</UButton>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ════ EDIÇÃO — abas ════ -->
      <div v-else-if="abaAtiva === 'dados'" class="p-5 space-y-4">
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
            <label class="label-field">CNPJ ou CPF</label>
            <UInput v-model="form.cnpj" placeholder="00.000.000/0001-00" size="sm" :ui="{ rounded: 'rounded-xl', base: 'font-mono text-xs' }" class="input-dark" />
          </div>
          <div>
            <label class="label-field">Nome do responsável</label>
            <UInput v-model="form.responsavel" placeholder="Nome do responsável" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
          </div>
          <div>
            <label class="label-field">CPF do responsável</label>
            <UInput v-model="form.cpfResponsavel" placeholder="000.000.000-00" size="sm" :ui="{ rounded: 'rounded-xl', base: 'font-mono text-xs' }" class="input-dark" />
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
            <label class="label-field">Endereço (rua, nº, bairro)</label>
            <UInput v-model="form.endereco" placeholder="Rua das Flores, 123, Centro" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
          </div>
          <div>
            <label class="label-field">Cidade</label>
            <UInput v-model="form.cidade" placeholder="Goiânia" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
          </div>
          <div>
            <label class="label-field">UF</label>
            <UInput v-model="form.uf" placeholder="GO" maxlength="2" size="sm" :ui="{ rounded: 'rounded-xl', base: 'uppercase font-mono' }" class="input-dark" />
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
        <div class="space-y-4">
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
          <div v-if="licencaAtual" class="text-[10px] text-white/25 pt-1">Criada em {{ formatDate(licencaAtual.createdAt) }}</div>
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
              <UButton :color="contratoForm.status === 'trial' ? 'amber' : 'gray'" :variant="contratoForm.status === 'trial' ? 'soft' : 'ghost'" size="sm" class="flex-1" :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-xs' }" @click="contratoForm.status = 'trial'">Ag. assinatura</UButton>
              <UButton :color="contratoForm.status === 'ativo' ? 'green' : 'gray'" :variant="contratoForm.status === 'ativo' ? 'soft' : 'ghost'" size="sm" class="flex-1" :ui="{ rounded: 'rounded-xl', font: 'font-semibold text-xs' }" @click="contratoForm.status = 'ativo'">Assinado</UButton>
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
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label-field">Início</label>
            <UInput v-model="contratoForm.dataInicio" type="date" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
          </div>
          <div>
            <label class="label-field">Fim (opcional)</label>
            <UInput v-model="contratoForm.dataFim" type="date" size="sm" :ui="{ rounded: 'rounded-xl' }" class="input-dark" />
          </div>
        </div>
      </div>

      <UAlert v-if="erroModal" color="red" :description="erroModal" variant="soft" class="mx-5 mb-1" />

      <template #footer>
        <div class="flex gap-2">
          <!-- Criação: navegação por passos -->
          <template v-if="!isEdit">
            <UButton v-if="passo > 0" color="gray" variant="ghost" :ui="{ rounded: 'rounded-xl', font: 'font-semibold' }" @click="passo--">
              Voltar
            </UButton>
            <UButton color="gray" variant="ghost" :ui="{ rounded: 'rounded-xl', font: 'font-semibold' }" @click="fechar" :class="passo === 0 ? 'flex-1' : ''">
              Cancelar
            </UButton>
            <UButton v-if="passo < passos.length - 1" color="violet" block :ui="{ rounded: 'rounded-xl', font: 'font-semibold' }" @click="avancar">
              Próximo
            </UButton>
            <UButton v-else color="violet" block :loading="salvando" :ui="{ rounded: 'rounded-xl', font: 'font-semibold' }" @click="salvar">
              {{ salvando ? 'Salvando...' : 'Cadastrar e gerar contrato' }}
            </UButton>
          </template>
          <!-- Edição: salvar direto -->
          <template v-else>
            <UButton color="gray" variant="ghost" block :ui="{ rounded: 'rounded-xl', font: 'font-semibold' }" @click="fechar">Cancelar</UButton>
            <UButton color="violet" block :loading="salvando" :ui="{ rounded: 'rounded-xl', font: 'font-semibold' }" @click="salvar">
              {{ salvando ? 'Salvando...' : 'Salvar alterações' }}
            </UButton>
          </template>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<script setup lang="ts">
interface Licenca  { id: string; status: string; dataAtivacao: string | null; dataVencimento: string | null; createdAt: string }
interface Contrato { id: string; plano: string; valor: string | null; ciclo: string; status: string; dataInicio?: string | null; dataFim?: string | null }
interface Tenant {
  id: string; nome: string; slug: string; cnpj: string | null; contato: string | null
  responsavel: string | null; cpfResponsavel: string | null; telefone: string | null
  endereco: string | null; cidade: string | null; uf: string | null; observacoes: string | null
  status: string; rfidDisponivel: boolean; vendaMobilePermitida: boolean; createdAt: string
  licencas: Licenca[]; contratos: Contrato[]
}

const props = defineProps<{ modelValue: boolean; tenant: Tenant | null }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean]; 'saved': [] }>()

const toast             = useToast()
const { platformFetch } = usePlatformFetch()

const isEdit = computed(() => props.tenant !== null)

// ── Estado do form ────────────────────────────────────────────────────────────
const form = reactive({
  nome: '', slug: '', cnpj: '', responsavel: '', cpfResponsavel: '', contato: '',
  telefone: '', endereco: '', cidade: '', uf: '', observacoes: '',
  vendaMobilePermitida: true, rfidDisponivel: false,
})
const licencaForm  = reactive({ status: 'pendente', dataAtivacao: '', dataVencimento: '' })
const contratoForm = reactive({ plano: 'Básico', valor: '', ciclo: 'mensal' as 'mensal' | 'trimestral' | 'semestral' | 'anual', dataInicio: new Date().toISOString().substring(0, 10), dataFim: '', status: 'trial' as 'trial' | 'ativo' })
const adminForm    = reactive({ email: '', senha: '', senhaConfirm: '' })
const mostrarSenha = ref(false)

const abaAtiva            = ref<'dados' | 'licenca' | 'contrato'>('dados')
const passo               = ref(0)
const salvando            = ref(false)
const erroModal           = ref('')
const licencaAtual        = ref<Licenca | null>(null)
const contratoAtualTenant = ref<Contrato | null>(null)

// ── Constantes ────────────────────────────────────────────────────────────────
const passos = [
  { id: 'estabelecimento', label: 'Estabelecimento' },
  { id: 'acesso',          label: 'Acesso admin'    },
  { id: 'contrato',        label: 'Contrato'        },
]
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

// ── Watch: popula/reseta ao abrir ─────────────────────────────────────────────
watch(() => props.modelValue, (open) => {
  if (!open) return
  erroModal.value = ''
  abaAtiva.value = 'dados'
  passo.value = 0
  mostrarSenha.value = false
  licencaAtual.value = null
  contratoAtualTenant.value = null

  if (props.tenant) {
    const t = props.tenant
    Object.assign(form, {
      nome: t.nome, slug: t.slug, cnpj: t.cnpj || '', responsavel: t.responsavel || '',
      cpfResponsavel: t.cpfResponsavel || '', contato: t.contato || '', telefone: t.telefone || '',
      endereco: t.endereco || '', cidade: t.cidade || '', uf: t.uf || '', observacoes: t.observacoes || '',
      vendaMobilePermitida: t.vendaMobilePermitida, rfidDisponivel: t.rfidDisponivel,
    })
    const lic = t.licencas?.[0]
    if (lic) {
      licencaAtual.value = lic
      licencaForm.status = lic.status
      licencaForm.dataAtivacao = lic.dataAtivacao?.substring(0, 10) || ''
      licencaForm.dataVencimento = lic.dataVencimento?.substring(0, 10) || ''
    } else {
      licencaForm.status = 'pendente'; licencaForm.dataAtivacao = ''; licencaForm.dataVencimento = ''
    }
    const con = t.contratos?.[0]
    if (con) {
      contratoAtualTenant.value = con
      contratoForm.plano = con.plano; contratoForm.valor = con.valor || ''
      contratoForm.ciclo = (con.ciclo as any) || 'mensal'
      contratoForm.dataInicio = con.dataInicio?.substring(0, 10) || ''
      contratoForm.dataFim = con.dataFim?.substring(0, 10) || ''
      contratoForm.status = (con.status as any) || 'trial'
    } else {
      resetContratoForm()
    }
  } else {
    Object.assign(form, { nome: '', slug: '', cnpj: '', responsavel: '', cpfResponsavel: '', contato: '', telefone: '', endereco: '', cidade: '', uf: '', observacoes: '', vendaMobilePermitida: true, rfidDisponivel: false })
    licencaForm.status = 'pendente'; licencaForm.dataAtivacao = ''; licencaForm.dataVencimento = ''
    resetContratoForm()
    Object.assign(adminForm, { email: '', senha: '', senhaConfirm: '' })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function resetContratoForm() {
  contratoForm.plano = 'Básico'; contratoForm.valor = ''; contratoForm.ciclo = 'mensal'
  contratoForm.dataInicio = new Date().toISOString().substring(0, 10)
  contratoForm.dataFim = ''; contratoForm.status = 'trial'
}
function slugify(s: string) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
function autoSlug() { if (!isEdit.value) form.slug = slugify(form.nome) }
function formatDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function fechar() { emit('update:modelValue', false) }

function avancar() {
  erroModal.value = ''
  if (passo.value === 0) {
    if (!form.nome.trim()) { erroModal.value = 'Nome é obrigatório'; return }
    if (!form.slug.trim()) { erroModal.value = 'Identificador é obrigatório'; return }
  } else if (passo.value === 1) {
    if (!adminForm.email.trim()) { erroModal.value = 'E-mail do administrador é obrigatório'; return }
    if (adminForm.senha.length < 6) { erroModal.value = 'Senha deve ter no mínimo 6 caracteres'; return }
    if (adminForm.senha !== adminForm.senhaConfirm) { erroModal.value = 'As senhas não conferem'; return }
  }
  passo.value++
}

function parseValor(v: string) { return v ? parseFloat(v.replace(',', '.')) : null }

async function salvar() {
  erroModal.value = ''
  salvando.value = true
  try {
    if (!isEdit.value) {
      if (!contratoForm.plano.trim()) { erroModal.value = 'Selecione o plano do contrato'; return }
      const payload = {
        nome: form.nome, slug: form.slug, cnpj: form.cnpj || null, cpfResponsavel: form.cpfResponsavel || null,
        responsavel: form.responsavel || null, contato: form.contato || null, telefone: form.telefone || null,
        endereco: form.endereco || null, cidade: form.cidade || null, uf: form.uf || null, observacoes: form.observacoes || null,
        vendaMobilePermitida: form.vendaMobilePermitida, rfidDisponivel: form.rfidDisponivel,
        contrato: { plano: contratoForm.plano.trim(), valor: parseValor(contratoForm.valor), ciclo: contratoForm.ciclo, dataInicio: contratoForm.dataInicio || null, dataFim: contratoForm.dataFim || null, status: contratoForm.status },
        adminEmail: adminForm.email.trim(), adminSenha: adminForm.senha,
      }
      const created = await platformFetch<any>('/platform/tenants', { method: 'POST', body: JSON.stringify(payload) })
      fechar()
      emit('saved')
      toast.add({ title: 'Sucesso', description: 'Cliente cadastrado! Contrato disponível para impressão.', color: 'green', icon: 'i-lucide-check-circle-2', timeout: 3000 })
      navigateTo(`/platform/tenants/${created.id}`)
      return
    }
    const tid = props.tenant!.id
    if (abaAtiva.value === 'dados') {
      await platformFetch(`/platform/tenants/${tid}`, { method: 'PUT', body: JSON.stringify({ nome: form.nome, slug: form.slug, cnpj: form.cnpj || null, cpfResponsavel: form.cpfResponsavel || null, responsavel: form.responsavel || null, contato: form.contato || null, telefone: form.telefone || null, endereco: form.endereco || null, cidade: form.cidade || null, uf: form.uf || null, observacoes: form.observacoes || null, vendaMobilePermitida: form.vendaMobilePermitida, rfidDisponivel: form.rfidDisponivel }) })
      toast.add({ title: 'Sucesso', description: 'Dados atualizados!', color: 'green', icon: 'i-lucide-check-circle-2', timeout: 3000 })
    } else if (abaAtiva.value === 'licenca') {
      await platformFetch(`/platform/tenants/${tid}/licenca`, { method: 'PUT', body: JSON.stringify({ status: licencaForm.status, dataAtivacao: licencaForm.dataAtivacao || null, dataVencimento: licencaForm.dataVencimento || null }) })
      toast.add({ title: 'Sucesso', description: 'Licença atualizada!', color: 'green', icon: 'i-lucide-check-circle-2', timeout: 3000 })
    } else if (abaAtiva.value === 'contrato') {
      if (!contratoForm.plano.trim()) { erroModal.value = 'Informe o nome do plano'; return }
      await platformFetch(`/platform/tenants/${tid}/contrato`, { method: 'PUT', body: JSON.stringify({ plano: contratoForm.plano.trim(), valor: parseValor(contratoForm.valor), ciclo: contratoForm.ciclo, dataInicio: contratoForm.dataInicio || null, dataFim: contratoForm.dataFim || null, status: contratoForm.status }) })
      toast.add({ title: 'Sucesso', description: 'Contrato atualizado!', color: 'green', icon: 'i-lucide-check-circle-2', timeout: 3000 })
    }
    fechar()
    emit('saved')
  } catch (e: any) {
    erroModal.value = e?.message || 'Erro ao salvar'
  } finally {
    salvando.value = false
  }
}
</script>

<style scoped>
.label-field { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: rgba(255,255,255,0.30); margin-bottom: 6px; }
.input-dark :deep(input), .input-dark :deep(textarea) { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.85); }
.input-dark :deep(input)::placeholder, .input-dark :deep(textarea)::placeholder { color: rgba(255,255,255,0.18); }
.input-dark :deep(input):focus, .input-dark :deep(textarea):focus { border-color: rgba(139,92,246,0.5); background: rgba(255,255,255,0.06); }
</style>
