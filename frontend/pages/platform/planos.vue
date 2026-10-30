<template>
  <PlatformShell ativo="planos" titulo="Planos">

    <div class="pf-head">
      <div>
        <h1>Planos</h1>
        <p>Os pacotes que você vende. Cada restaurante recebe na hora os recursos do plano que contratou.</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <AlternarVisao v-model="visao" />
        <button class="pf-btn p" @click="abrir(null)"><Plus :size="18" /> Novo plano</button>
      </div>
    </div>

    <div v-if="loading && !planos.length" class="pf-loading"><span class="pf-spin" /></div>

    <div v-else-if="erro" class="pf-card">
      <div class="pf-empty"><b>Não deu para carregar os planos</b><p>{{ erro }}</p><button class="pf-btn" @click="carregar">Tentar novamente</button></div>
    </div>

    <div v-else class="pf-plans" :class="{ lista: visao === 'lista' }">
      <article v-for="p in planos" :key="p.id" class="pf-pc" :class="{ inativo: !p.ativo }">
        <div class="pf-pc-topo">
          <div style="display:flex;align-items:center;gap:8px;justify-content:space-between">
            <span class="pf-bob">Plano</span>
            <span v-if="!p.ativo" class="pf-pill mute"><i />Fora de venda</span>
          </div>
          <h3>{{ p.nome }}</h3>
          <div class="pf-pr">{{ moeda(p.valor) }} <small>por mês</small></div>
          <div class="pf-pr-anual">{{ p.valorAnual ? `${moeda(p.valorAnual)} por ano` : 'Sem plano anual' }}</div>
        </div>
        <ul>
          <li v-for="r in RECURSOS" :key="r.chave" :class="{ off: !p[r.chave] }">
            <span :style="{ color: p[r.chave] ? 'var(--pf-ok)' : 'var(--pf-muted)' }">
              <Check v-if="p[r.chave]" :size="18" /><X v-else :size="18" />
            </span>
            {{ r.rotulo }}
            <span v-if="p[r.chave] && !r.noSistema" class="pf-tag" title="Ainda não existe no PDV">em breve</span>
          </li>
        </ul>
        <p v-if="p.descricao" class="pf-pc-desc">{{ p.descricao }}</p>
        <div class="pf-use" style="margin-bottom:12px">{{ p.qtdRestaurantes ? `${p.qtdRestaurantes} ${p.qtdRestaurantes === 1 ? 'restaurante neste plano' : 'restaurantes neste plano'}` : 'Nenhum restaurante neste plano' }}</div>
        <button class="pf-btn" style="margin-top:auto" @click="abrir(p)">Editar plano</button>
      </article>

      <button class="pf-pc pf-pc-new" @click="abrir(null)">
        <Plus :size="28" />
        <b>Novo plano</b>
        <small>{{ planos.length ? 'Monte outro pacote de recursos' : 'Monte o primeiro pacote para vender' }}</small>
      </button>
    </div>

    <!-- ══ CRIAR / EDITAR ══ -->
    <PlatformModal
      v-model="modal"
      :titulo="editando ? 'Editar plano' : 'Novo plano'"
      subtitulo="Nome, preço e os recursos que o restaurante recebe"
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
          <label class="pf-lab" for="pl-anual">Valor anual (R$) <small>(por ano; vazio = sem plano anual)</small></label>
          <input id="pl-anual" v-model="form.valorAnual" class="pf-inp" type="number" min="0" step="0.01" placeholder="Ex.: 9600,00" :aria-invalid="erroForm === 'valorAnual'">
          <small v-if="Number(form.valor) > 0 && Number(form.valorAnual) > 0" style="color:var(--pf-muted)">
            Equivale a {{ moeda(Number(form.valorAnual) / 12) }} por mês ({{ Math.round((Number(form.valorAnual) / (Number(form.valor) * 12)) * 100) }}% de 12 mensalidades)
          </small>
        </div>
        <div class="pf-fld">
          <label class="pf-lab" for="pl-desc">Descrição <small>(opcional)</small></label>
          <input id="pl-desc" v-model="form.descricao" class="pf-inp" type="text" maxlength="300" placeholder="Ex.: para casas com equipe de salão">
        </div>
        <button type="submit" hidden />
      </form>

      <div class="pf-boxm">
        <p class="pf-sub" style="margin:0">Recursos do plano</p>
        <div>
          <div v-for="r in RECURSOS" :key="r.chave" class="pf-feat">
            <div>
              <b>{{ r.rotulo }}</b>
              <small>{{ r.descricao }}<template v-if="!r.noSistema"> · ainda não existe no PDV</template></small>
            </div>
            <button type="button" class="pf-sw" role="switch" :aria-checked="form[r.chave]" :aria-label="r.rotulo" @click="form[r.chave] = !form[r.chave]" />
          </div>
          <div class="pf-feat">
            <div><b>À venda</b><small>Desligado, o plano some do site; ainda dá para escolher no contrato (ex.: plano de teste) e continua valendo para quem já tem</small></div>
            <button type="button" class="pf-sw" role="switch" :aria-checked="form.ativo" aria-label="Plano ativo" @click="form.ativo = !form.ativo" />
          </div>
        </div>
      </div>

      <div v-if="editando?.qtdRestaurantes" class="pf-note info">
        Ao salvar, {{ editando.qtdRestaurantes === 1 ? 'o restaurante deste plano recebe' : `os ${editando.qtdRestaurantes} restaurantes deste plano recebem` }} os recursos novos na hora.
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
      message="Nenhum restaurante está neste plano. Depois de excluído, ele não volta."
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
import AlternarVisao from '~/components/ui/AlternarVisao.vue'
import { useVisao } from '~/composables/useVisao'

definePageMeta({ layout: false })

const platformAuth = usePlatformAuthStore()
const visao = useVisao('painel-planos')
const toast = useToast()
const { planos, loading, erro, carregar, salvar, excluir } = usePlanos()

const modal    = ref(false)
const editando = ref<Plano | null>(null)
const salvando = ref(false)
const msgErro  = ref('')
const erroForm = ref<'nome' | 'valor' | 'valorAnual' | null>(null)
const confirmarExclusao = ref(false)

const form = reactive({ nome: '', valor: '' as string | number, valorAnual: '' as string | number, descricao: '', rfid: false, vendaMobile: false, delivery: false, nfce: false, ativo: true })

function abrir(p: Plano | null) {
  editando.value = p
  msgErro.value = ''
  erroForm.value = null
  Object.assign(form, p
    ? { nome: p.nome, valor: p.valor, valorAnual: p.valorAnual ?? '', descricao: p.descricao ?? '', rfid: p.rfid, vendaMobile: p.vendaMobile, delivery: p.delivery, nfce: p.nfce, ativo: p.ativo }
    : { nome: '', valor: '', valorAnual: '', descricao: '', rfid: false, vendaMobile: false, delivery: false, nfce: false, ativo: true })
  modal.value = true
}

async function salvarPlano() {
  msgErro.value = ''
  erroForm.value = null
  const valor = Number(String(form.valor).replace(',', '.'))
  if (!form.nome.trim()) { msgErro.value = 'Informe o nome do plano.'; erroForm.value = 'nome'; return }
  if (form.valor === '' || Number.isNaN(valor) || valor < 0) { msgErro.value = 'Informe um valor válido.'; erroForm.value = 'valor'; return }
  const valorAnual = form.valorAnual === '' || form.valorAnual == null ? null : Number(String(form.valorAnual).replace(',', '.'))
  if (valorAnual != null && (Number.isNaN(valorAnual) || valorAnual < 0)) { msgErro.value = 'Informe um valor anual válido ou deixe vazio.'; erroForm.value = 'valorAnual'; return }

  salvando.value = true
  try {
    await salvar({
      nome: form.nome.trim(), valor, valorAnual, descricao: form.descricao.trim() || null,
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
