<template>
  <PlatformModal
    :model-value="modelValue"
    :titulo="isEdit ? 'Editar restaurante' : 'Novo restaurante'"
    :subtitulo="isEdit ? form.slug : 'Preencha os dados para cadastrar e gerar o contrato'"
    @update:model-value="fechar"
  >
    <template #icone><Store :size="18" /></template>

    <!-- Abas (edição) -->
    <div v-if="isEdit" class="pf-chips" role="tablist">
      <button v-for="aba in abas" :key="aba.id" class="pf-fc" role="tab" :aria-pressed="abaAtiva === aba.id" :aria-selected="abaAtiva === aba.id" @click="abaAtiva = aba.id">
        {{ aba.label }}
      </button>
    </div>

    <!-- Passos (cadastro) -->
    <ol v-else class="pf-steps">
      <li v-for="(s, i) in passos" :key="s.id" :class="{ feito: passo > i, atual: passo === i }">
        <span class="pf-step-n"><Check v-if="passo > i" :size="14" /><template v-else>{{ i + 1 }}</template></span>
        {{ s.label }}
      </li>
    </ol>

    <!-- ════ CADASTRO ════ -->
    <template v-if="!isEdit">
      <!-- Passo 1: estabelecimento -->
      <div v-if="passo === 0" class="pf-boxm">
        <div class="pf-form">
          <div class="pf-fld full"><label class="pf-lab" for="tm-nome">Nome do restaurante *</label><input id="tm-nome" v-model="form.nome" class="pf-inp" placeholder="Ex.: Restaurante Tarantela" @input="autoSlug"></div>
          <div class="pf-fld">
            <label class="pf-lab" for="tm-slug">Login (identificador) *</label>
            <input id="tm-slug" v-model="form.slug" class="pf-inp" placeholder="ex.: tarantela">
            <small style="color:var(--pf-muted)">Usado para entrar no sistema</small>
          </div>
          <div class="pf-fld"><label class="pf-lab" for="tm-cnpj">CNPJ ou CPF</label><input id="tm-cnpj" v-model="form.cnpj" class="pf-inp" placeholder="00.000.000/0001-00"></div>
          <div class="pf-fld"><label class="pf-lab" for="tm-email">E-mail</label><input id="tm-email" v-model="form.contato" class="pf-inp" type="email" placeholder="contato@restaurante.com"></div>
          <div class="pf-fld"><label class="pf-lab" for="tm-tel">Telefone</label><input id="tm-tel" v-model="form.telefone" class="pf-inp" placeholder="(62) 9 9999-9999"></div>
          <div class="pf-fld"><label class="pf-lab" for="tm-resp">Responsável</label><input id="tm-resp" v-model="form.responsavel" class="pf-inp" placeholder="Nome completo"></div>
          <div class="pf-fld"><label class="pf-lab" for="tm-cpfr">CPF do responsável</label><input id="tm-cpfr" v-model="form.cpfResponsavel" class="pf-inp" placeholder="000.000.000-00"></div>
          <div class="pf-fld full"><label class="pf-lab" for="tm-end">Endereço (rua, nº, bairro)</label><input id="tm-end" v-model="form.endereco" class="pf-inp" placeholder="Rua das Flores, 123, Centro"></div>
          <div class="pf-fld"><label class="pf-lab" for="tm-cid">Cidade</label><input id="tm-cid" v-model="form.cidade" class="pf-inp" placeholder="Goiânia"></div>
          <div class="pf-fld"><label class="pf-lab" for="tm-uf">UF</label><input id="tm-uf" v-model="form.uf" class="pf-inp" maxlength="2" placeholder="GO" style="text-transform:uppercase"></div>
        </div>
      </div>

      <!-- Passo 2: acesso do administrador -->
      <template v-else-if="passo === 1">
        <div class="pf-note info">Credenciais que o cliente usa para entrar no sistema. Dá para alterar depois.</div>
        <div class="pf-boxm">
          <div class="pf-form">
            <div class="pf-fld full"><label class="pf-lab" for="tm-aemail">E-mail de acesso *</label><input id="tm-aemail" v-model="adminForm.email" class="pf-inp" type="email" placeholder="admin@restaurante.com" autocomplete="off"></div>
            <div class="pf-fld">
              <label class="pf-lab" for="tm-asenha">Senha inicial * <small>(mínimo 6)</small></label>
              <div class="pf-pass">
                <input id="tm-asenha" v-model="adminForm.senha" class="pf-inp" :type="mostrarSenha ? 'text' : 'password'" placeholder="••••••••" autocomplete="new-password">
                <button type="button" :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'" @click="mostrarSenha = !mostrarSenha">
                  <EyeOff v-if="mostrarSenha" :size="16" /><Eye v-else :size="16" />
                </button>
              </div>
            </div>
            <div class="pf-fld">
              <label class="pf-lab" for="tm-asenha2">Confirmar senha *</label>
              <input
                id="tm-asenha2"
                v-model="adminForm.senhaConfirm"
                class="pf-inp"
                :type="mostrarSenha ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="new-password"
                :aria-invalid="!!adminForm.senhaConfirm && adminForm.senhaConfirm !== adminForm.senha"
              >
            </div>
          </div>
        </div>
      </template>

      <!-- Passo 3: contrato -->
      <template v-else>
        <div class="pf-note info">O contrato de prestação de serviços é gerado ao cadastrar e fica pronto para imprimir e assinar.</div>
        <div class="pf-boxm">
          <div class="pf-fld">
            <span class="pf-lab">Plano *</span>
            <div v-if="planosAtivos.length" class="pf-rotas">
              <button v-for="pl in planosAtivos" :key="pl.id" type="button" :class="{ sel: planoId === pl.id }" @click="escolherPlano(pl)">
                <span>{{ pl.nome }} · {{ moedaBR(pl.valor) }}/mês</span>
                <small>{{ resumoRecursos(pl) }}</small>
              </button>
            </div>
            <small v-else style="color:var(--pf-muted)">
              Nenhum plano criado. Os recursos ficam manuais. <NuxtLink to="/platform/planos" style="color:var(--pf-brand-d)">Criar planos</NuxtLink>
            </small>
            <input v-if="!planosAtivos.length" v-model="contratoForm.plano" class="pf-inp" placeholder="Nome do plano no contrato" aria-label="Nome do plano">
          </div>
          <div class="pf-form">
            <div class="pf-fld"><label class="pf-lab" for="tm-valor">Valor mensal (R$)</label><input id="tm-valor" v-model="contratoForm.valor" class="pf-inp" type="number" min="0" step="0.01" placeholder="0,00"></div>
            <div class="pf-fld">
              <span class="pf-lab">Ciclo de cobrança</span>
              <div class="pf-chips">
                <button v-for="c in ciclos" :key="c.value" type="button" class="pf-fc" :aria-pressed="contratoForm.ciclo === c.value" @click="contratoForm.ciclo = c.value as any">{{ c.label }}</button>
              </div>
            </div>
            <div class="pf-fld"><label class="pf-lab" for="tm-ini">Início do contrato</label><input id="tm-ini" v-model="contratoForm.dataInicio" class="pf-inp" type="date"></div>
            <div class="pf-fld"><label class="pf-lab" for="tm-fim">Fim (opcional)</label><input id="tm-fim" v-model="contratoForm.dataFim" class="pf-inp" type="date"></div>
            <div class="pf-fld full">
              <span class="pf-lab">Situação do contrato</span>
              <div class="pf-seg">
                <button type="button" class="warn" :class="{ sel: contratoForm.status === 'trial' }" @click="contratoForm.status = 'trial'">Ag. assinatura</button>
                <button type="button" class="ok" :class="{ sel: contratoForm.status === 'ativo' }" @click="contratoForm.status = 'ativo'">Assinado</button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- ════ EDIÇÃO: dados ════ -->
    <template v-else-if="abaAtiva === 'dados'">
      <div class="pf-boxm">
        <div class="pf-form">
          <div class="pf-fld full"><label class="pf-lab" for="te-nome">Nome do restaurante *</label><input id="te-nome" v-model="form.nome" class="pf-inp" placeholder="Ex.: Restaurante Tarantela" @input="autoSlug"></div>
          <div class="pf-fld"><label class="pf-lab" for="te-slug">Login (identificador) *</label><input id="te-slug" v-model="form.slug" class="pf-inp" placeholder="ex.: tarantela"></div>
          <div class="pf-fld"><label class="pf-lab" for="te-cnpj">CNPJ ou CPF</label><input id="te-cnpj" v-model="form.cnpj" class="pf-inp" placeholder="00.000.000/0001-00"></div>
          <div class="pf-fld"><label class="pf-lab" for="te-resp">Responsável</label><input id="te-resp" v-model="form.responsavel" class="pf-inp"></div>
          <div class="pf-fld"><label class="pf-lab" for="te-cpfr">CPF do responsável</label><input id="te-cpfr" v-model="form.cpfResponsavel" class="pf-inp" placeholder="000.000.000-00"></div>
          <div class="pf-fld"><label class="pf-lab" for="te-email">E-mail</label><input id="te-email" v-model="form.contato" class="pf-inp" type="email"></div>
          <div class="pf-fld"><label class="pf-lab" for="te-tel">Telefone</label><input id="te-tel" v-model="form.telefone" class="pf-inp"></div>
          <div class="pf-fld full"><label class="pf-lab" for="te-end">Endereço (rua, nº, bairro)</label><input id="te-end" v-model="form.endereco" class="pf-inp"></div>
          <div class="pf-fld"><label class="pf-lab" for="te-cid">Cidade</label><input id="te-cid" v-model="form.cidade" class="pf-inp"></div>
          <div class="pf-fld"><label class="pf-lab" for="te-uf">UF</label><input id="te-uf" v-model="form.uf" class="pf-inp" maxlength="2" style="text-transform:uppercase"></div>
          <div class="pf-fld full"><label class="pf-lab" for="te-obs">Observações</label><textarea id="te-obs" v-model="form.observacoes" class="pf-inp" rows="2" placeholder="Anotações internas" /></div>
        </div>
      </div>
      <div v-if="tenant?.plano" class="pf-note info">Os recursos deste restaurante seguem o plano {{ tenant.plano.nome }}.</div>
      <div v-else class="pf-boxm">
        <p class="pf-sub" style="margin:0">Recursos</p>
        <div>
          <div v-for="feat in features" :key="feat.key" class="pf-feat">
            <div><b>{{ feat.label }}</b><small>{{ feat.desc }}</small></div>
            <button
              type="button"
              class="pf-sw"
              role="switch"
              :aria-checked="!!(form as any)[feat.key]"
              :aria-label="feat.label"
              @click="(form as any)[feat.key] = !(form as any)[feat.key]"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- ════ EDIÇÃO: licença ════ -->
    <div v-else-if="abaAtiva === 'licenca'" class="pf-boxm">
      <div class="pf-fld">
        <span class="pf-lab">Situação</span>
        <div class="pf-seg">
          <button
            v-for="s in licencaStatuses"
            :key="s.value"
            type="button"
            :class="[{ green: 'ok', amber: 'warn', red: 'bad' }[s.color], { sel: licencaForm.status === s.value }]"
            @click="licencaForm.status = s.value"
          >{{ s.label }}</button>
        </div>
      </div>
      <div class="pf-form">
        <div class="pf-fld"><label class="pf-lab" for="tl-at">Ativação</label><input id="tl-at" v-model="licencaForm.dataAtivacao" class="pf-inp" type="date"></div>
        <div class="pf-fld"><label class="pf-lab" for="tl-ve">Vencimento</label><input id="tl-ve" v-model="licencaForm.dataVencimento" class="pf-inp" type="date"></div>
      </div>
      <small v-if="licencaAtual" style="color:var(--pf-muted)">Criada em {{ formatDate(licencaAtual.createdAt) }}</small>
    </div>

    <!-- ════ EDIÇÃO: contrato ════ -->
    <div v-else-if="abaAtiva === 'contrato'" class="pf-boxm">
      <div class="pf-fld">
        <span class="pf-lab">Plano *</span>
        <div class="pf-chips">
          <button v-for="p in planosPredef" :key="p" type="button" class="pf-fc" :aria-pressed="contratoForm.plano === p" @click="contratoForm.plano = p">{{ p }}</button>
        </div>
        <input v-model="contratoForm.plano" class="pf-inp" placeholder="Ou escreva o nome do plano" aria-label="Nome do plano">
      </div>
      <div class="pf-form">
        <div class="pf-fld"><label class="pf-lab" for="tc-valor">Valor (R$)</label><input id="tc-valor" v-model="contratoForm.valor" class="pf-inp" type="number" min="0" step="0.01" placeholder="0,00"></div>
        <div class="pf-fld">
          <span class="pf-lab">Situação</span>
          <div class="pf-seg">
            <button type="button" class="warn" :class="{ sel: contratoForm.status === 'trial' }" @click="contratoForm.status = 'trial'">Ag. assinatura</button>
            <button type="button" class="ok" :class="{ sel: contratoForm.status === 'ativo' }" @click="contratoForm.status = 'ativo'">Assinado</button>
          </div>
        </div>
        <div class="pf-fld full">
          <span class="pf-lab">Ciclo de cobrança</span>
          <div class="pf-chips">
            <button v-for="c in ciclos" :key="c.value" type="button" class="pf-fc" :aria-pressed="contratoForm.ciclo === c.value" @click="contratoForm.ciclo = c.value as any">{{ c.label }}</button>
          </div>
        </div>
        <div class="pf-fld"><label class="pf-lab" for="tc-ini">Início</label><input id="tc-ini" v-model="contratoForm.dataInicio" class="pf-inp" type="date"></div>
        <div class="pf-fld"><label class="pf-lab" for="tc-fim">Fim (opcional)</label><input id="tc-fim" v-model="contratoForm.dataFim" class="pf-inp" type="date"></div>
      </div>
    </div>

    <p v-if="erroModal" class="pf-err" role="alert">{{ erroModal }}</p>

    <template #rodape>
      <template v-if="!isEdit">
        <button v-if="passo > 0" class="pf-btn" @click="passo--">Voltar</button>
        <button class="pf-btn" @click="fechar">Cancelar</button>
        <button v-if="passo < passos.length - 1" class="pf-btn p" @click="avancar">Próximo</button>
        <button v-else class="pf-btn p" :disabled="salvando" @click="salvar">
          <Loader2 v-if="salvando" :size="16" class="animate-spin" />
          {{ salvando ? 'Salvando…' : 'Cadastrar e gerar contrato' }}
        </button>
      </template>
      <template v-else>
        <button class="pf-btn" @click="fechar">Cancelar</button>
        <button class="pf-btn p" :disabled="salvando" @click="salvar">
          <Loader2 v-if="salvando" :size="16" class="animate-spin" />
          {{ salvando ? 'Salvando…' : 'Salvar alterações' }}
        </button>
      </template>
    </template>
  </PlatformModal>
</template>

<script setup lang="ts">
import { Store, Check, Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { usePlanos, RECURSOS, type Plano } from '~/composables/usePlanos'
interface Licenca  { id: string; status: string; dataAtivacao: string | null; dataVencimento: string | null; createdAt: string }
interface Contrato { id: string; plano: string; valor: string | null; ciclo: string; status: string; dataInicio?: string | null; dataFim?: string | null }
interface Tenant {
  id: string; nome: string; slug: string; cnpj: string | null; contato: string | null
  responsavel: string | null; cpfResponsavel: string | null; telefone: string | null
  endereco: string | null; cidade: string | null; uf: string | null; observacoes: string | null
  status: string; rfidDisponivel: boolean; vendaMobilePermitida: boolean; createdAt: string
  plano?: { id: string; nome: string } | null
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

// Planos criados em Planos e valores; no cadastro, escolher um define o plano
// do restaurante (os recursos passam a seguir o plano) e o nome do contrato.
const { planos, carregar: carregarPlanos } = usePlanos()
const planosAtivos = computed(() => planos.value.filter(pl => pl.ativo))
const planoId = ref<string | null>(null)
const moedaBR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
function resumoRecursos(pl: Plano) {
  const r = RECURSOS.filter(x => pl[x.chave]).map(x => x.rotulo)
  return r.length ? r.join(', ') : 'Sem recursos extras'
}
function escolherPlano(pl: Plano) {
  planoId.value = pl.id
  contratoForm.plano = pl.nome
  contratoForm.valor = String(pl.valor)
}
const ciclos = [
  { value: 'mensal', label: 'Mensal' }, { value: 'trimestral', label: 'Trim.' },
  { value: 'semestral', label: 'Semes.' }, { value: 'anual', label: 'Anual' },
]

// ── Watch: popula/reseta ao abrir ─────────────────────────────────────────────
watch(() => props.modelValue, (open) => {
  if (!open) return
  planoId.value = null
  carregarPlanos()
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
      if (planosAtivos.value.length && !planoId.value) { erroModal.value = 'Escolha o plano do restaurante'; return }
      if (!contratoForm.plano.trim()) { erroModal.value = 'Selecione o plano do contrato'; return }
      const payload = {
        nome: form.nome, slug: form.slug, cnpj: form.cnpj || null, cpfResponsavel: form.cpfResponsavel || null,
        responsavel: form.responsavel || null, contato: form.contato || null, telefone: form.telefone || null,
        endereco: form.endereco || null, cidade: form.cidade || null, uf: form.uf || null, observacoes: form.observacoes || null,
        vendaMobilePermitida: form.vendaMobilePermitida, rfidDisponivel: form.rfidDisponivel,
        contrato: { plano: contratoForm.plano.trim(), valor: parseValor(contratoForm.valor), ciclo: contratoForm.ciclo, dataInicio: contratoForm.dataInicio || null, dataFim: contratoForm.dataFim || null, status: contratoForm.status },
        adminEmail: adminForm.email.trim(), adminSenha: adminForm.senha,
        planoId: planoId.value,
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
