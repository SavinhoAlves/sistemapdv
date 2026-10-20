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

      <!-- Passo 3: contrato (assinatura) -->
      <template v-else>
        <div class="pf-note info">Ao cadastrar, o contrato é gerado e o acesso já segue a cobrança: teste grátis, primeiro vencimento e tolerância de 5 dias.</div>
        <PlatformContratoForm ref="contratoRef" v-model="contrato" modo="cadastro" />
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
    </template>

    <!-- ════ EDIÇÃO: contrato ════ -->
    <PlatformContratoForm v-else-if="abaAtiva === 'contrato'" ref="contratoRef" v-model="contrato" modo="edicao" />

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
import type { ContratoModelo } from './ContratoForm.vue'
import type { Tenant } from '~/composables/usePlatformTenants'

const props = defineProps<{ modelValue: boolean; tenant: Tenant | null; abaInicial?: 'dados' | 'contrato' }>()
const emit  = defineEmits<{ 'update:modelValue': [boolean]; 'saved': [] }>()

const toast             = useToast()
const { platformFetch } = usePlatformFetch()

const isEdit = computed(() => props.tenant !== null)

// ── Estado do form ────────────────────────────────────────────────────────────
const form = reactive({
  nome: '', slug: '', cnpj: '', responsavel: '', cpfResponsavel: '', contato: '',
  telefone: '', endereco: '', cidade: '', uf: '', observacoes: '',
})
const adminForm    = reactive({ email: '', senha: '', senhaConfirm: '' })
const mostrarSenha = ref(false)

const hoje = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10)
function contratoVazio(): ContratoModelo {
  return {
    planoId: null, plano: '', valor: '', ciclo: 'mensal', dataInicio: hoje(), dataFim: '', status: 'trial',
    isento: false, observacoes: '', diaVencimento: 10,
    teste: true, primeiroVencimento: hoje(), pagarAgora: false, pagamento: { pagoEm: hoje(), forma: 'pix' },
  }
}
const contrato    = ref<ContratoModelo>(contratoVazio())
const contratoRef = ref<{ payload: () => any; validar: () => string | null } | null>(null)

const abaAtiva  = ref<'dados' | 'contrato'>('dados')
const passo     = ref(0)
const salvando  = ref(false)
const erroModal = ref('')

// ── Constantes ────────────────────────────────────────────────────────────────
const passos = [
  { id: 'estabelecimento', label: 'Estabelecimento' },
  { id: 'acesso',          label: 'Acesso admin'    },
  { id: 'contrato',        label: 'Contrato'        },
]
const abas = [
  { id: 'dados' as const,    label: 'Dados'    },
  { id: 'contrato' as const, label: 'Contrato e cobrança' },
]

// ── Watch: popula/reseta ao abrir ─────────────────────────────────────────────
watch(() => props.modelValue, (open) => {
  if (!open) return
  erroModal.value = ''
  abaAtiva.value = props.abaInicial ?? 'dados'
  passo.value = 0
  mostrarSenha.value = false

  if (props.tenant) {
    const t = props.tenant
    Object.assign(form, {
      nome: t.nome, slug: t.slug, cnpj: t.cnpj || '', responsavel: t.responsavel || '',
      cpfResponsavel: t.cpfResponsavel || '', contato: t.contato || '', telefone: t.telefone || '',
      endereco: t.endereco || '', cidade: t.cidade || '', uf: t.uf || '', observacoes: t.observacoes || '',
    })
    const con = t.contratos?.[0]
    contrato.value = {
      ...contratoVazio(),
      planoId: t.planoId ?? null,
      plano: t.plano?.nome ?? con?.plano ?? '',
      valor: con?.valor ?? '',
      ciclo: (con?.ciclo as ContratoModelo['ciclo']) || 'mensal',
      dataInicio: con?.dataInicio?.slice(0, 10) || '',
      dataFim: con?.dataFim?.slice(0, 10) || '',
      status: (con?.status as ContratoModelo['status']) || 'trial',
      isento: con?.isento ?? false,
      observacoes: con?.observacoes ?? '',
      diaVencimento: con?.diaVencimento ?? 10,
    }
  } else {
    Object.assign(form, { nome: '', slug: '', cnpj: '', responsavel: '', cpfResponsavel: '', contato: '', telefone: '', endereco: '', cidade: '', uf: '', observacoes: '' })
    contrato.value = contratoVazio()
    Object.assign(adminForm, { email: '', senha: '', senhaConfirm: '' })
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function slugify(s: string) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }
function autoSlug() { if (!isEdit.value) form.slug = slugify(form.nome) }
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

const dadosPayload = () => ({
  nome: form.nome, slug: form.slug, cnpj: form.cnpj || null, cpfResponsavel: form.cpfResponsavel || null,
  responsavel: form.responsavel || null, contato: form.contato || null, telefone: form.telefone || null,
  endereco: form.endereco || null, cidade: form.cidade || null, uf: form.uf || null, observacoes: form.observacoes || null,
})

async function salvar() {
  erroModal.value = ''
  const precisaContrato = !isEdit.value || abaAtiva.value === 'contrato'
  const invalido = precisaContrato ? contratoRef.value?.validar() : null
  if (invalido) { erroModal.value = invalido; return }

  salvando.value = true
  try {
    if (!isEdit.value) {
      const created = await platformFetch<any>('/platform/tenants', {
        method: 'POST',
        body: JSON.stringify({ ...dadosPayload(), adminEmail: adminForm.email.trim(), adminSenha: adminForm.senha, contrato: contratoRef.value!.payload() }),
      })
      fechar()
      emit('saved')
      toast.add({ title: 'Cliente cadastrado', description: 'Contrato gerado (versão 1). Envie o PDF ao cliente pelo card Contrato.', color: 'green', icon: 'i-lucide-check-circle-2', timeout: 5000 })
      navigateTo(`/platform/tenants/${created.id}`)
      return
    }
    const tid = props.tenant!.id
    // A API diz se a edição mudou o texto do contrato (nova versão a reenviar)
    const reenviar = (v?: { numero: number; nova: boolean } | null) =>
      v?.nova ? `O contrato passou para a versão ${v.numero}. Reenvie o PDF atualizado ao cliente.` : undefined
    if (abaAtiva.value === 'dados') {
      const res = await platformFetch<any>(`/platform/tenants/${tid}`, { method: 'PUT', body: JSON.stringify(dadosPayload()) })
      const aviso = reenviar(res.contratoVersao)
      toast.add({ title: 'Dados atualizados', description: aviso, color: 'green', icon: aviso ? 'i-lucide-file-text' : 'i-lucide-check-circle-2', timeout: aviso ? 8000 : 3000 })
    } else {
      const res = await platformFetch<any>(`/platform/tenants/${tid}/contrato`, { method: 'PUT', body: JSON.stringify(contratoRef.value!.payload()) })
      const aviso = reenviar(res.contratoVersao)
      toast.add({ title: 'Contrato atualizado', description: aviso ?? 'Cobrança e acesso recalculados. O texto do contrato não mudou.', color: 'green', icon: aviso ? 'i-lucide-file-text' : 'i-lucide-check-circle-2', timeout: aviso ? 8000 : 3000 })
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
