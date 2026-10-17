<template>
  <PlatformShell ativo="planos" titulo="Planos e valores">

    <div class="pf-crumb">Sistema</div>
    <div class="pf-head">
      <div>
        <h1>Planos e valores</h1>
        <p>Defina o que cada plano inclui e quanto custa por mês. Os recursos de cada restaurante seguem o plano dele.</p>
      </div>
      <button class="pf-btn p" @click="abrir(null)"><Plus :size="18" /> Novo plano</button>
    </div>

    <div v-if="loading && !planos.length" class="pf-loading"><span class="pf-spin" /></div>

    <div v-else-if="erro" class="pf-card">
      <div class="pf-empty"><b>Não foi possível carregar os planos</b><p>{{ erro }}</p><button class="pf-btn" @click="carregar">Tentar novamente</button></div>
    </div>

    <div v-else class="pf-plans">
      <article v-for="p in planos" :key="p.id" class="pf-pc" :class="{ inativo: !p.ativo }">
        <div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
          <h3>{{ p.nome }}</h3>
          <span v-if="!p.ativo" class="pf-pill mute"><i />Inativo</span>
        </div>
        <div class="pf-pr">{{ moeda(p.valor) }} <small>/ mês</small></div>
        <div class="pf-use">{{ p.qtdRestaurantes }} {{ p.qtdRestaurantes === 1 ? 'restaurante usa' : 'restaurantes usam' }}</div>
        <p v-if="p.descricao" class="pf-use" style="margin:0">{{ p.descricao }}</p>
        <ul>
          <li v-for="r in RECURSOS" :key="r.chave" :class="{ off: !p[r.chave] }">
            <span :style="{ color: p[r.chave] ? 'var(--pf-ok)' : 'var(--pf-muted)' }">
              <Check v-if="p[r.chave]" :size="18" /><X v-else :size="18" />
            </span>
            {{ r.rotulo }}
            <span v-if="p[r.chave] && !r.noSistema" class="pf-tag" title="Ainda não existe no PDV">em breve</span>
          </li>
        </ul>
        <button class="pf-btn" style="margin-top:auto" @click="abrir(p)">Editar plano</button>
      </article>

      <button class="pf-pc pf-pc-new" @click="abrir(null)">
        <Plus :size="28" />
        <b>Novo plano</b>
        <small v-if="!planos.length">Crie o primeiro pacote para vender aos restaurantes</small>
      </button>
    </div>

    <!-- ══ CRIAR / EDITAR ══ -->
    <PlatformModal
      v-model="modal"
      :titulo="editando ? 'Editar plano' : 'Novo plano'"
      subtitulo="Nome, valor e o que está incluído"
      pequena
    >
      <template #icone><Tag :size="18" /></template>
      <form class="pf-boxm" @submit.prevent="salvarPlano">
        <div class="pf-fld">
          <label class="pf-lab" for="pl-nome">Nome do plano *</label>
          <input id="pl-nome" v-model="form.nome" class="pf-inp" type="text" maxlength="60" placeholder="Ex.: Profissional" :aria-invalid="erroForm === 'nome'">
        </div>
        <div class="pf-fld">
          <label class="pf-lab" for="pl-valor">Valor mensal (R$) *</label>
          <input id="pl-valor" v-model="form.valor" class="pf-inp" type="number" min="0" step="0.01" placeholder="0,00" :aria-invalid="erroForm === 'valor'">
        </div>
        <div class="pf-fld">
          <label class="pf-lab" for="pl-desc">Descrição <small>(opcional)</small></label>
          <input id="pl-desc" v-model="form.descricao" class="pf-inp" type="text" maxlength="300" placeholder="Para quem é este plano">
        </div>
        <button type="submit" hidden />
      </form>

      <div class="pf-boxm">
        <p class="pf-sub" style="margin:0">Inclui</p>
        <div>
          <div v-for="r in RECURSOS" :key="r.chave" class="pf-feat">
            <div>
              <b>{{ r.rotulo }}</b>
              <small>{{ r.descricao }}<template v-if="!r.noSistema"> · ainda não existe no PDV</template></small>
            </div>
            <button type="button" class="pf-sw" role="switch" :aria-checked="form[r.chave]" :aria-label="r.rotulo" @click="form[r.chave] = !form[r.chave]" />
          </div>
          <div class="pf-feat">
            <div><b>Disponível para novos clientes</b><small>Planos inativos continuam valendo para quem já usa</small></div>
            <button type="button" class="pf-sw" role="switch" :aria-checked="form.ativo" aria-label="Plano ativo" @click="form.ativo = !form.ativo" />
          </div>
        </div>
      </div>

      <div v-if="editando?.qtdRestaurantes" class="pf-note info">
        Mudar os recursos atualiza na hora {{ editando.qtdRestaurantes === 1 ? 'o restaurante que usa' : `os ${editando.qtdRestaurantes} restaurantes que usam` }} este plano.
      </div>
      <p v-if="msgErro" class="pf-err" role="alert">{{ msgErro }}</p>

      <template #rodape>
        <button
          v-if="editando"
          class="pf-btn d"
          :disabled="salvando || editando.qtdRestaurantes > 0"
          :title="editando.qtdRestaurantes > 0 ? 'Troque o plano dos restaurantes antes de excluir' : undefined"
          @click="confirmarExclusao = true"
        >
          Excluir
        </button>
        <button v-else class="pf-btn" @click="modal = false">Cancelar</button>
        <button class="pf-btn p" :disabled="salvando" @click="salvarPlano">
          <Loader2 v-if="salvando" :size="16" class="animate-spin" /> Salvar plano
        </button>
      </template>
    </PlatformModal>

    <PlatformConfirmDialog
      v-model="confirmarExclusao"
      :title="`Excluir o plano ${editando?.nome ?? ''}?`"
      message="Nenhum restaurante usa este plano. Isso não pode ser desfeito."
      type="danger"
      @resolved="v => v && excluirPlano()"
    />
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus, Check, X, Tag, Loader2 } from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import { usePlanos, RECURSOS, type Plano } from '~/composables/usePlanos'
import { moeda } from '~/composables/usePlatformTenants'

definePageMeta({ layout: false })

const platformAuth = usePlatformAuthStore()
const toast = useToast()
const { planos, loading, erro, carregar, salvar, excluir } = usePlanos()

const modal    = ref(false)
const editando = ref<Plano | null>(null)
const salvando = ref(false)
const msgErro  = ref('')
const erroForm = ref<'nome' | 'valor' | null>(null)
const confirmarExclusao = ref(false)

const form = reactive({ nome: '', valor: '' as string | number, descricao: '', rfid: false, vendaMobile: false, delivery: false, nfce: false, ativo: true })

function abrir(p: Plano | null) {
  editando.value = p
  msgErro.value = ''
  erroForm.value = null
  Object.assign(form, p
    ? { nome: p.nome, valor: p.valor, descricao: p.descricao ?? '', rfid: p.rfid, vendaMobile: p.vendaMobile, delivery: p.delivery, nfce: p.nfce, ativo: p.ativo }
    : { nome: '', valor: '', descricao: '', rfid: false, vendaMobile: false, delivery: false, nfce: false, ativo: true })
  modal.value = true
}

async function salvarPlano() {
  msgErro.value = ''
  erroForm.value = null
  const valor = Number(String(form.valor).replace(',', '.'))
  if (!form.nome.trim()) { msgErro.value = 'Informe o nome do plano.'; erroForm.value = 'nome'; return }
  if (form.valor === '' || Number.isNaN(valor) || valor < 0) { msgErro.value = 'Informe um valor válido.'; erroForm.value = 'valor'; return }

  salvando.value = true
  try {
    await salvar({
      nome: form.nome.trim(), valor, descricao: form.descricao.trim() || null,
      rfid: form.rfid, vendaMobile: form.vendaMobile, delivery: form.delivery, nfce: form.nfce, ativo: form.ativo,
    }, editando.value?.id)
    modal.value = false
    toast.add({ title: 'Plano salvo', color: 'green', timeout: 3000 })
    await carregar()
  } catch (e: any) {
    msgErro.value = e?.message || 'Não foi possível salvar o plano.'
  } finally {
    salvando.value = false
  }
}

async function excluirPlano() {
  if (!editando.value) return
  salvando.value = true
  try {
    await excluir(editando.value.id)
    modal.value = false
    toast.add({ title: 'Plano excluído', color: 'green', timeout: 3000 })
    await carregar()
  } catch (e: any) {
    msgErro.value = e?.message || 'Não foi possível excluir o plano.'
  } finally {
    salvando.value = false
  }
}

onMounted(() => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) { navigateTo('/platform/login'); return }
  carregar()
})
</script>
