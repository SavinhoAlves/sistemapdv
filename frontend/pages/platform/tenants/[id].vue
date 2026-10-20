<template>
  <PlatformShell ativo="restaurantes" :titulo="tenant?.nome || 'Restaurante'">

    <NuxtLink to="/platform/restaurantes" class="pf-back"><ArrowLeft :size="16" /> Restaurantes</NuxtLink>

    <div v-if="loading" class="pf-loading"><span class="pf-spin" /></div>

    <div v-else-if="erro" class="pf-card">
      <div class="pf-empty">
        <b>{{ erro }}</b>
        <NuxtLink to="/platform/restaurantes" class="pf-btn" style="margin-top:12px">Voltar para a lista</NuxtLink>
      </div>
    </div>

    <template v-else-if="tenant">
      <!-- Cabeçalho -->
      <div class="pf-head">
        <div class="pf-hero">
          <span class="pf-av">{{ tenant.nome.slice(0, 2).toUpperCase() }}</span>
          <div>
            <h1 style="font-size:clamp(26px,3.4vw,38px)">{{ tenant.nome }}</h1>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px">
              <span class="pf-pill" :class="tenant.status === 'ativo' ? 'ok' : 'warn'"><i />{{ tenant.status === 'ativo' ? 'Ativo' : 'Suspenso' }}</span>
              <span class="pf-tag">Cód. {{ tenant.codigo }}</span>
              <span class="pf-tag">{{ tenant.slug }}</span>
              <span style="color:var(--pf-muted);font-size:14px">Cliente desde {{ formatDate(tenant.createdAt) }}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="pf-btn" @click="abrirEdicao('dados')"><Pencil :size="16" /> Editar dados</button>
          <button class="pf-btn" :class="tenant.status === 'ativo' ? 'd' : 'k'" @click="toggleStatus">
            {{ tenant.status === 'ativo' ? 'Suspender' : 'Reativar' }}
          </button>
        </div>
      </div>

      <div class="pf-grid-det">
        <!-- ── Coluna principal ── -->
        <div>
          <!-- Assinatura: plano, situação, vencimento, pagamentos -->
          <div class="pf-card">
            <div class="pf-card-h">
              <div><h2>Assinatura</h2><p>Plano, cobrança e até quando o restaurante entra no sistema</p></div>
              <span class="pf-pill pf-r" :class="pill[1]"><i />{{ pill[0] }}</span>
            </div>
            <div class="pf-pad">
              <div class="pf-big">
                <div class="pf-big-n" :class="pill[1] === 'info' ? 'ok' : pill[1] === 'mute' ? 'warn' : pill[1]">{{ numeroGrande }}</div>
                <div>
                  <small>{{ contratoAtual?.plano ? `Plano ${tenant.plano?.nome ?? contratoAtual.plano}` : 'Sem plano' }}</small>
                  <b>{{ assinatura?.isento ? 'Isento de mensalidade' : assinatura?.valor != null ? `${formatCurrency(assinatura.valor)} / ${rotuloCiclo(assinatura.ciclo)}` : 'Sem valor definido' }}</b>
                  <small>{{ explicacao }}</small>
                </div>
              </div>

              <dl class="pf-kv" style="margin-bottom:18px">
                <template v-if="assinatura?.testeAte && !historico.length"><dt>Teste grátis</dt><dd>até {{ diaBR(assinatura.testeAte) }}</dd></template>
                <template v-if="!assinatura?.isento"><dt>Próximo vencimento</dt><dd>{{ diaBR(assinatura?.proximoVencimento) }}<template v-if="assinatura?.diaVencimento"> · todo dia {{ assinatura.diaVencimento }}</template></dd></template>
                <dt>Acesso liberado até</dt><dd>{{ assinatura?.isento ? 'sem limite' : assinatura?.liberadoAte ? diaBR(assinatura.liberadoAte) : '—' }}</dd>
                <template v-if="contratoAtual?.ajusteMotivo"><dt>Último ajuste</dt><dd>{{ contratoAtual.ajusteMotivo }} <small style="color:var(--pf-muted)">({{ formatDate(contratoAtual.ajusteEm) }})</small></dd></template>
              </dl>

              <div class="pf-acts" style="margin-bottom:18px">
                <button v-if="!assinatura?.isento" class="pf-btn k" @click="abrirPagamento"><Wallet :size="16" /> Registrar pagamento</button>
                <button v-if="!assinatura?.isento" class="pf-btn" @click="abrirAjuste"><CalendarClock :size="16" /> Ajustar vencimento</button>
                <button class="pf-btn" @click="abrirEdicao('contrato')"><Pencil :size="16" /> Editar contrato</button>
              </div>

              <p class="pf-sub">Pagamentos</p>
              <div v-if="!historico.length" style="color:var(--pf-muted)">Nenhum pagamento registrado.</div>
              <div v-else class="pf-scroll">
                <table class="pf-table">
                  <thead><tr><th>Pago em</th><th>Valor</th><th>Período</th><th>Forma</th><th /></tr></thead>
                  <tbody>
                    <tr v-for="(pg, i) in historico" :key="pg.id">
                      <td class="pf-num">{{ diaBR(pg.pagoEm) }}</td>
                      <td class="pf-num"><b>{{ formatCurrency(pg.valor) }}</b></td>
                      <td class="pf-num">{{ pg.periodoInicio ? `${diaBR(pg.periodoInicio)} → ${diaBR(pg.periodoFim)}` : pg.competencia }}</td>
                      <td>{{ FORMAS.find(f => f.valor === pg.forma)?.rotulo ?? '—' }}</td>
                      <td class="act"><button v-if="i === 0" class="pf-btn s" @click="desfazendo = pg">Desfazer</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Contrato (documento) -->
          <div class="pf-card">
            <div class="pf-card-h">
              <div><h2>Contrato</h2><p>Contrato de prestação de serviços em PDF</p></div>
              <span v-if="contratoAtual" class="pf-pill pf-r" :class="contratoTom(contratoAtual.status)"><i />{{ contratoRotulo(contratoAtual.status) }}</span>
            </div>
            <div class="pf-pad">
              <div v-if="!contratoAtual" class="pf-empty" style="padding:20px 0">
                <b>Nenhum contrato</b>
                <button class="pf-btn s" style="margin-top:10px" @click="abrirEdicao('contrato')">Criar contrato</button>
              </div>
              <template v-else>
                <div class="pf-doc">
                  <span class="pf-ico ok"><FileText :size="20" /></span>
                  <div style="min-width:0">
                    <b>Plano {{ contratoAtual.plano }}</b>
                    <small style="display:block;color:var(--pf-muted)">
                      {{ formatDate(contratoAtual.dataInicio) }} até {{ contratoAtual.dataFim ? formatDate(contratoAtual.dataFim) : 'prazo indeterminado' }}
                      <template v-if="contratoAtual.valor && !contratoAtual.isento"> · {{ formatCurrency(contratoAtual.valor) }} / {{ rotuloCiclo(contratoAtual.ciclo) }}</template>
                    </small>
                  </div>
                </div>
                <div class="pf-acts">
                  <button class="pf-btn s k" @click="visualizarContrato"><Eye :size="16" /> Ver PDF</button>
                  <button class="pf-btn s" @click="imprimirContrato"><Printer :size="16" /> Imprimir</button>
                  <button class="pf-btn s" @click="compartilharContrato"><Share2 :size="16" /> Compartilhar</button>
                </div>
              </template>
            </div>
          </div>

          <!-- Administrador -->
          <div class="pf-card">
            <div class="pf-card-h">
              <div><h2>Acesso do administrador</h2><p>Login de quem gerencia o restaurante</p></div>
              <span class="pf-pill pf-r" :class="adminAtual ? 'ok' : 'warn'"><i />{{ adminAtual ? 'Configurado' : 'Sem acesso' }}</span>
            </div>
            <div class="pf-pad" style="display:grid;gap:14px">
              <div v-if="!adminAtual" class="pf-note warn">
                <Lock :size="18" style="flex:none;margin-top:1px" />
                Nenhum administrador configurado. Sem ele, o cliente não entra no sistema e o suporte remoto não funciona.
              </div>
              <div class="pf-form">
                <div class="pf-fld full">
                  <label class="pf-lab" for="adm-nome">Nome do administrador</label>
                  <input id="adm-nome" v-model="adminForm.nome" class="pf-inp" type="text" placeholder="Ex.: João Silva">
                </div>
                <div class="pf-fld full">
                  <label class="pf-lab" for="adm-email">E-mail de acesso</label>
                  <input id="adm-email" v-model="adminForm.email" class="pf-inp" type="email" placeholder="admin@restaurante.com" autocomplete="off">
                </div>
                <div class="pf-fld">
                  <label class="pf-lab" for="adm-senha">Nova senha <small>{{ adminAtual ? '(em branco mantém a atual)' : '(mínimo 6 caracteres)' }}</small></label>
                  <div class="pf-pass">
                    <input id="adm-senha" v-model="adminForm.senha" class="pf-inp" :type="mostrarSenha ? 'text' : 'password'" placeholder="••••••••" autocomplete="new-password">
                    <button type="button" :aria-label="mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'" @click="mostrarSenha = !mostrarSenha">
                      <EyeOff v-if="mostrarSenha" :size="16" /><Eye v-else :size="16" />
                    </button>
                  </div>
                </div>
                <div class="pf-fld">
                  <label class="pf-lab" for="adm-senha2">Confirmar senha</label>
                  <input
                    id="adm-senha2"
                    v-model="adminForm.senhaConfirm"
                    class="pf-inp"
                    :type="mostrarSenha ? 'text' : 'password'"
                    placeholder="••••••••"
                    autocomplete="new-password"
                    :aria-invalid="!!adminForm.senhaConfirm && adminForm.senhaConfirm !== adminForm.senha"
                  >
                </div>
              </div>
              <p v-if="erroAdmin" class="pf-err">{{ erroAdmin }}</p>
              <p v-if="sucessoAdmin" class="pf-ok-msg"><CheckCircle2 :size="16" /> {{ sucessoAdmin }}</p>
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                <small v-if="adminAtual" style="color:var(--pf-muted)">Entra com <b style="color:var(--pf-ink)">{{ tenant.codigo }}-{{ adminAtual.codigo }}</b><template v-if="adminAtual.login"> ou <b style="color:var(--pf-ink)">{{ adminAtual.login }}</b></template> · e-mail <b style="color:var(--pf-ink)">{{ adminAtual.email }}</b></small>
                <button class="pf-btn p" style="margin-left:auto" :disabled="salvandoAdmin" @click="salvarAdmin">
                  <Loader2 v-if="salvandoAdmin" :size="16" class="animate-spin" />
                  <ShieldCheck v-else :size="16" />
                  {{ adminAtual ? 'Atualizar acesso' : 'Criar administrador' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Coluna lateral ── -->
        <div>
          <div class="pf-card">
            <div class="pf-card-h">
              <div><h2>Recursos</h2><p>{{ tenant.plano ? `Seguem o plano ${tenant.plano.nome}` : 'Sem plano: só as liberações abaixo' }}</p></div>
            </div>
            <div class="pf-pad">
              <div v-for="r in recursos" :key="r.chave" class="pf-feat" style="flex-wrap:wrap">
                <span class="pf-ico" :class="r.ativo ? 'ok' : ''" style="background:var(--pf-soft)"><component :is="r.icone" :size="18" /></span>
                <div style="flex:1;min-width:140px">
                  <b>{{ r.rotulo }}</b>
                  <small>{{ r.ativo ? 'Liberado' : 'Bloqueado' }} · {{ r.manual === null ? (tenant.plano ? 'pelo plano' : 'padrão') : 'exceção sua' }}</small>
                </div>
                <div class="pf-seg" style="flex:0 0 100%" role="group" :aria-label="r.rotulo">
                  <button class="mute" :class="{ sel: r.manual === null }" :disabled="salvandoRecurso" @click="definirRecurso(r.chave, null)">{{ tenant.plano ? 'Seguir plano' : 'Padrão' }}</button>
                  <button class="ok" :class="{ sel: r.manual === true }" :disabled="salvandoRecurso" @click="definirRecurso(r.chave, true)">Liberar</button>
                  <button class="bad" :class="{ sel: r.manual === false }" :disabled="salvandoRecurso" @click="definirRecurso(r.chave, false)">Bloquear</button>
                </div>
              </div>
            </div>
          </div>

          <div class="pf-card">
            <div class="pf-card-h">
              <div><h2>Dados</h2><p>Cadastro do restaurante</p></div>
              <button class="pf-btn s pf-r" @click="abrirEdicao('dados')"><Pencil :size="14" /> Editar</button>
            </div>
            <div class="pf-pad">
              <dl v-if="dadosCadastrais.some(c => c.valor)" class="pf-kv">
                <template v-for="campo in dadosCadastrais" :key="campo.label">
                  <template v-if="campo.valor">
                    <dt>{{ campo.label }}</dt>
                    <dd>{{ campo.valor }}</dd>
                  </template>
                </template>
              </dl>
              <p v-else style="color:var(--pf-muted);margin:0">Nenhum dado preenchido.</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ EDIÇÃO (dados / contrato) ══ -->
    <PlatformTenantModal v-model="edicaoAberta" :tenant="tenant" :aba-inicial="edicaoAba" @saved="carregar" />

    <!-- ══ REGISTRAR PAGAMENTO ══ -->
    <PlatformModal v-model="modalPagamento" titulo="Registrar pagamento" :subtitulo="tenant ? `${tenant.nome} · ${periodoDoPagamento}` : ''" pequena>
      <template #icone><Wallet :size="18" /></template>
      <form class="pf-boxm" @submit.prevent="salvarPagamento">
        <div class="pf-form">
          <div class="pf-fld"><label class="pf-lab" for="pg-valor">Valor recebido (R$) *</label><input id="pg-valor" v-model="pag.valor" class="pf-inp pf-num" type="number" min="0.01" step="0.01"></div>
          <div class="pf-fld"><label class="pf-lab" for="pg-data">Pago em *</label><input id="pg-data" v-model="pag.pagoEm" class="pf-inp" type="date"></div>
          <div class="pf-fld full">
            <span class="pf-lab">Forma de pagamento</span>
            <div class="pf-chips">
              <button v-for="f in FORMAS" :key="f.valor" type="button" class="pf-fc" :aria-pressed="pag.forma === f.valor" @click="pag.forma = pag.forma === f.valor ? null : f.valor">{{ f.rotulo }}</button>
            </div>
          </div>
          <div class="pf-fld full"><label class="pf-lab" for="pg-obs">Observação <small>(opcional)</small></label><input id="pg-obs" v-model="pag.observacao" class="pf-inp" type="text" maxlength="300"></div>
        </div>
        <button type="submit" hidden />
      </form>
      <p class="pf-note info" style="margin:0">O próximo vencimento passa para {{ diaBR(vencimentoAposPagar) }} e o acesso é liberado na hora.</p>
      <p v-if="erroAcao" class="pf-err" role="alert">{{ erroAcao }}</p>
      <template #rodape>
        <button class="pf-btn" @click="modalPagamento = false">Cancelar</button>
        <button class="pf-btn p" :disabled="salvandoAcao" @click="salvarPagamento"><Loader2 v-if="salvandoAcao" :size="16" class="animate-spin" /> Registrar</button>
      </template>
    </PlatformModal>

    <!-- ══ AJUSTAR VENCIMENTO ══ -->
    <PlatformModal v-model="modalAjuste" titulo="Ajustar vencimento" subtitulo="Para exceções: cortesia, negociação, prorrogação" pequena>
      <template #icone><CalendarClock :size="18" /></template>
      <form class="pf-boxm" @submit.prevent="salvarAjuste">
        <div class="pf-form">
          <div class="pf-fld full"><label class="pf-lab" for="aj-data">Novo próximo vencimento *</label><input id="aj-data" v-model="ajuste.vencimento" class="pf-inp" type="date"></div>
          <div class="pf-fld full"><label class="pf-lab" for="aj-motivo">Motivo *</label><input id="aj-motivo" v-model="ajuste.motivo" class="pf-inp" type="text" maxlength="300" placeholder="Ex.: cortesia de 1 mês pela indicação"></div>
        </div>
        <button type="submit" hidden />
      </form>
      <p class="pf-note info" style="margin:0">Com a tolerância, o acesso fica liberado até {{ ajuste.vencimento ? diaBR(somarDias(ajuste.vencimento, TOLERANCIA_DIAS)) : '—' }}.</p>
      <p v-if="erroAcao" class="pf-err" role="alert">{{ erroAcao }}</p>
      <template #rodape>
        <button class="pf-btn" @click="modalAjuste = false">Cancelar</button>
        <button class="pf-btn p" :disabled="salvandoAcao" @click="salvarAjuste"><Loader2 v-if="salvandoAcao" :size="16" class="animate-spin" /> Salvar</button>
      </template>
    </PlatformModal>

    <PlatformConfirmDialog
      :model-value="!!desfazendo"
      title="Desfazer este pagamento?"
      :message="desfazendo?.periodoInicio ? `O vencimento volta para ${diaBR(desfazendo.periodoInicio)} e o acesso é recalculado.` : 'O pagamento é apagado e o acesso é recalculado.'"
      type="danger"
      @update:model-value="v => { if (!v) desfazendo = null }"
      @resolved="v => v && desfazerPagamento()"
    />

    <!-- ══ CONFIRMAÇÃO ══ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="confirmDialog.show" class="pf-portal pf-veu" style="align-items:center;z-index:70" @click.self="confirmDialog.resolve?.(false); confirmDialog.show = false">
          <div class="pf-modal sm" role="alertdialog" aria-modal="true">
            <div class="pf-confirm">
              <span class="pf-ico" :class="confirmDialog.type === 'danger' ? 'bad' : 'ok'" style="width:52px;height:52px;border-radius:16px">
                <AlertTriangle v-if="confirmDialog.type === 'danger'" :size="22" />
                <CheckCircle2 v-else :size="22" />
              </span>
              <h2 style="font-size:20px">{{ confirmDialog.title }}</h2>
              <p>{{ confirmDialog.message }}</p>
            </div>
            <div class="pf-modal-f">
              <button class="pf-btn" @click="confirmDialog.resolve?.(false); confirmDialog.show = false">Cancelar</button>
              <button class="pf-btn" :class="confirmDialog.type === 'danger' ? 'd' : 'p'" @click="confirmDialog.resolve?.(true); confirmDialog.show = false">Confirmar</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Aviso -->
    <Transition name="toast">
      <div v-if="toastMsg.text" class="pf-toast" :class="toastMsg.type === 'success' ? 'ok' : 'bad'" role="status">
        <CheckCircle2 v-if="toastMsg.type === 'success'" :size="18" />
        <AlertCircle v-else :size="18" />
        {{ toastMsg.text }}
      </div>
    </Transition>
  </PlatformShell>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, type Component } from 'vue'
import {
  ArrowLeft, CreditCard, Smartphone, Wallet, CalendarClock,
  Loader2, AlertCircle, AlertTriangle, CheckCircle2, Pencil, FileText,
  Eye, EyeOff, Printer, Share2, ShieldCheck, Lock,
} from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import {
  situacaoPill, rotuloCiclo, mesesCiclo, diaBR, TOLERANCIA_DIAS,
  type Tenant as TenantBase, type Contrato,
} from '~/composables/usePlatformTenants'

definePageMeta({ layout: false })

type Tenant = TenantBase & {
  codigo: number
  rfidManual: boolean | null; vendaMobileManual: boolean | null
  plano: { id: string; nome: string; valor: string | number; rfid: boolean; vendaMobile: boolean } | null
}
interface Pagamento {
  id: string; valor: number; pagoEm: string; forma: string | null; observacao: string | null
  competencia: string; periodoInicio: string | null; periodoFim: string | null
}

const FORMAS = [
  { valor: 'pix', rotulo: 'Pix' }, { valor: 'dinheiro', rotulo: 'Dinheiro' }, { valor: 'cartao', rotulo: 'Cartão' },
  { valor: 'boleto', rotulo: 'Boleto' }, { valor: 'transferencia', rotulo: 'Transferência' },
]

const route             = useRoute()
const platformAuth      = usePlatformAuthStore()
const { platformFetch } = usePlatformFetch()

const tenant    = ref<Tenant | null>(null)
const historico = ref<Pagamento[]>([])
const loading   = ref(false)
const erro      = ref('')

const confirmDialog = reactive({
  show: false, title: '', message: '', type: 'danger' as 'danger' | 'success',
  resolve: null as ((v: boolean) => void) | null,
})
function showConfirm(title: string, message: string, type: 'danger' | 'success' = 'danger'): Promise<boolean> {
  return new Promise(resolve => {
    Object.assign(confirmDialog, { title, message, type, resolve, show: true })
  })
}
const toastMsg = reactive({ text: '', type: 'success' as 'success' | 'error' })

// ── Acesso do administrador ───────────────────────────────────────────────────
const adminAtual      = ref<{ id: string; codigo: number; login: string | null; nome: string; email: string; ativo: boolean } | null>(null)
const adminForm       = reactive({ nome: '', email: '', senha: '', senhaConfirm: '' })
const mostrarSenha    = ref(false)
const salvandoAdmin   = ref(false)
const erroAdmin       = ref('')
const sucessoAdmin    = ref('')

async function carregarAdmin() {
  const data = await platformFetch<any>(`/platform/tenants/${route.params.id}/admin`)
  adminAtual.value = data
  if (data) { adminForm.nome = data.nome; adminForm.email = data.email }
  adminForm.senha = ''; adminForm.senhaConfirm = ''
}

async function salvarAdmin() {
  erroAdmin.value = ''; sucessoAdmin.value = ''
  if (!adminForm.email.trim()) { erroAdmin.value = 'E-mail é obrigatório'; return }
  if (adminForm.senha && adminForm.senha.length < 6) { erroAdmin.value = 'Senha deve ter no mínimo 6 caracteres'; return }
  if (adminForm.senha !== adminForm.senhaConfirm) { erroAdmin.value = 'As senhas não conferem'; return }
  if (!adminAtual.value && !adminForm.senha) { erroAdmin.value = 'Defina uma senha para criar o administrador'; return }
  salvandoAdmin.value = true
  try {
    const res = await platformFetch<any>(`/platform/tenants/${route.params.id}/admin`, {
      method: 'PUT',
      body: JSON.stringify({ nome: adminForm.nome, email: adminForm.email, senha: adminForm.senha || undefined }),
    })
    adminAtual.value = res
    adminForm.senha = ''; adminForm.senhaConfirm = ''
    sucessoAdmin.value = adminAtual.value ? 'Credenciais atualizadas' : 'Administrador criado'
    setTimeout(() => { sucessoAdmin.value = '' }, 3000)
  } catch (e: any) {
    erroAdmin.value = e?.message || 'Erro ao salvar'
  } finally {
    salvandoAdmin.value = false
  }
}

// ── Assinatura ────────────────────────────────────────────────────────────────
const contratoAtual = computed<Contrato | null>(() => tenant.value?.contratos?.[0] ?? null)
const assinatura    = computed(() => tenant.value?.assinatura)
const pill          = computed(() => situacaoPill(assinatura.value))

/** Número em destaque: dias até vencer, até bloquear ou de teste. */
const numeroGrande = computed(() => {
  const a = assinatura.value
  if (!a || a.situacao === 'isento') return '∞'
  if (a.situacao === 'tolerancia') return a.diasParaBloquear ?? 0
  if (a.situacao === 'teste' && a.testeAte) return Math.max(0, diasAte(a.testeAte))
  if (a.situacao === 'em_dia') return Math.max(0, a.diasParaVencer ?? 0)
  return 0
})
const explicacao = computed(() => {
  const a = assinatura.value
  if (!a) return ''
  switch (a.situacao) {
    case 'teste':      return `dias de teste grátis (até ${diaBR(a.testeAte)})`
    case 'em_dia':     return a.diasParaVencer === 0 ? 'vence hoje' : `dias até o vencimento (${diaBR(a.proximoVencimento)})`
    case 'tolerancia': return `dias até bloquear: venceu em ${diaBR(a.proximoVencimento)}, tolerância até ${diaBR(a.liberadoAte)}`
    case 'bloqueado':  return a.proximoVencimento || !a.testeAte ? 'Bloqueado: registre o pagamento para liberar' : 'O teste acabou: registre o pagamento para liberar'
    case 'isento':     return 'Acesso sempre liberado'
    case 'suspenso':   return 'Suspenso manualmente: reative no topo da página'
    case 'cancelado':  return 'Contrato rescindido: o acesso fica bloqueado'
    default:           return 'Sem vencimento: edite o contrato ou ajuste o vencimento'
  }
})

function diasAte(iso: string) {
  const hoje = new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10)
  return Math.round((new Date(`${iso}T12:00:00Z`).getTime() - new Date(`${hoje}T12:00:00Z`).getTime()) / 86_400_000)
}
function somarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}
/** Mesma conta do backend: soma meses mantendo o dia de vencimento. */
function somarMeses(iso: string, meses: number, dia: number) {
  const [a, m] = iso.split('-').map(Number)
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1))
  const ultimo = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
  alvo.setUTCDate(Math.min(dia, ultimo))
  return alvo.toISOString().slice(0, 10)
}
const hojeBR = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10)

// ── Registrar pagamento ──
const modalPagamento = ref(false)
const salvandoAcao   = ref(false)
const erroAcao       = ref('')
const pag = reactive({ valor: '' as string | number, pagoEm: '', forma: 'pix' as string | null, observacao: '' })
const inicioDoPagamento    = computed(() => assinatura.value?.proximoVencimento ?? hojeBR())
const vencimentoAposPagar  = computed(() => somarMeses(inicioDoPagamento.value, mesesCiclo(assinatura.value?.ciclo ?? 'mensal'), assinatura.value?.diaVencimento ?? 10))
const periodoDoPagamento   = computed(() => `${diaBR(inicioDoPagamento.value)} a ${diaBR(vencimentoAposPagar.value)}`)

function abrirPagamento() {
  erroAcao.value = ''
  Object.assign(pag, { valor: assinatura.value?.valor ?? '', pagoEm: hojeBR(), forma: 'pix', observacao: '' })
  modalPagamento.value = true
}
async function salvarPagamento() {
  if (!tenant.value) return
  erroAcao.value = ''
  const valor = Number(String(pag.valor).replace(',', '.'))
  if (!valor || valor <= 0) { erroAcao.value = 'Informe o valor recebido.'; return }
  if (!pag.pagoEm) { erroAcao.value = 'Informe a data do pagamento.'; return }
  salvandoAcao.value = true
  try {
    await platformFetch('/platform/cobranca/pagamentos', {
      method: 'POST',
      body: JSON.stringify({ tenantId: tenant.value.id, valor, pagoEm: pag.pagoEm, forma: pag.forma, observacao: pag.observacao.trim() || null }),
    })
    modalPagamento.value = false
    showToast('success', 'Pagamento registrado e acesso liberado')
    await carregar()
  } catch (e: any) {
    erroAcao.value = e?.message || 'Não deu para registrar o pagamento.'
  } finally {
    salvandoAcao.value = false
  }
}

// ── Ajustar vencimento ──
const modalAjuste = ref(false)
const ajuste = reactive({ vencimento: '', motivo: '' })
function abrirAjuste() {
  erroAcao.value = ''
  Object.assign(ajuste, { vencimento: assinatura.value?.proximoVencimento ?? hojeBR(), motivo: '' })
  modalAjuste.value = true
}
async function salvarAjuste() {
  if (!tenant.value) return
  erroAcao.value = ''
  if (!ajuste.vencimento) { erroAcao.value = 'Informe a data.'; return }
  if (ajuste.motivo.trim().length < 3) { erroAcao.value = 'Informe o motivo do ajuste.'; return }
  salvandoAcao.value = true
  try {
    await platformFetch(`/platform/cobranca/tenants/${tenant.value.id}/vencimento`, {
      method: 'POST',
      body: JSON.stringify({ vencimento: ajuste.vencimento, motivo: ajuste.motivo.trim() }),
    })
    modalAjuste.value = false
    showToast('success', 'Vencimento ajustado')
    await carregar()
  } catch (e: any) {
    erroAcao.value = e?.message || 'Não deu para ajustar.'
  } finally {
    salvandoAcao.value = false
  }
}

// ── Desfazer pagamento ──
const desfazendo = ref<Pagamento | null>(null)
async function desfazerPagamento() {
  const pg = desfazendo.value
  if (!pg) return
  try {
    await platformFetch(`/platform/cobranca/pagamentos/${pg.id}`, { method: 'DELETE' })
    showToast('success', 'Pagamento desfeito')
    await carregar()
  } catch (e: any) {
    showToast('error', e?.message || 'Não deu para desfazer')
  } finally {
    desfazendo.value = null
  }
}

// ── Recursos: plano + exceções do superadmin ──
const salvandoRecurso = ref(false)
const recursos = computed<{ chave: 'rfid' | 'vendaMobile'; rotulo: string; icone: Component; ativo: boolean; manual: boolean | null }[]>(() => {
  const t = tenant.value
  if (!t) return []
  return [
    { chave: 'rfid',        rotulo: 'RFID',               icone: CreditCard, ativo: t.rfidDisponivel,       manual: t.rfidManual },
    { chave: 'vendaMobile', rotulo: 'Venda pelo celular', icone: Smartphone, ativo: t.vendaMobilePermitida, manual: t.vendaMobileManual },
  ]
})
async function definirRecurso(chave: 'rfid' | 'vendaMobile', valor: boolean | null) {
  if (!tenant.value || salvandoRecurso.value) return
  salvandoRecurso.value = true
  try {
    const r = await platformFetch<Pick<Tenant, 'rfidDisponivel' | 'vendaMobilePermitida' | 'rfidManual' | 'vendaMobileManual'>>(
      `/platform/tenants/${tenant.value.id}/recursos`,
      { method: 'PATCH', body: JSON.stringify({ [chave]: valor }) },
    )
    Object.assign(tenant.value, r)
    showToast('success', valor === null ? 'Recurso segue o plano' : valor ? 'Recurso liberado' : 'Recurso bloqueado')
  } catch (e: any) {
    showToast('error', e?.message || 'Não deu para alterar o recurso')
  } finally {
    salvandoRecurso.value = false
  }
}

// ── Edição (modal compartilhado com a lista) ──
const edicaoAberta = ref(false)
const edicaoAba    = ref<'dados' | 'contrato'>('dados')
function abrirEdicao(aba: 'dados' | 'contrato') { edicaoAba.value = aba; edicaoAberta.value = true }

const contratoStatuses = [
  { value: 'ativo',     label: 'Assinado',       tom: 'ok' },
  { value: 'trial',     label: 'Ag. assinatura', tom: 'warn' },
  { value: 'suspenso',  label: 'Suspenso',       tom: 'bad' },
  { value: 'cancelado', label: 'Rescindido',     tom: 'bad' },
]
const contratoTom = (s: string) => contratoStatuses.find(c => c.value === s)?.tom ?? 'mute'
const contratoRotulo = (s: string) => contratoStatuses.find(c => c.value === s)?.label ?? s

const dadosCadastrais = computed(() => [
  { label: 'CNPJ / CPF',         valor: tenant.value?.cnpj },
  { label: 'Responsável',        valor: tenant.value?.responsavel },
  { label: 'CPF do responsável', valor: tenant.value?.cpfResponsavel },
  { label: 'E-mail',             valor: tenant.value?.contato },
  { label: 'Telefone',           valor: tenant.value?.telefone },
  { label: 'Endereço',           valor: tenant.value?.endereco },
  { label: 'Cidade / UF',        valor: [tenant.value?.cidade, tenant.value?.uf].filter(Boolean).join(' — ') || null },
  { label: 'Observações',        valor: tenant.value?.observacoes },
])

function formatDate(d: string | null | undefined) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR') }
function formatCurrency(v: string | number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)) }
function showToast(type: 'success' | 'error', text: string) { toastMsg.type = type; toastMsg.text = text; setTimeout(() => { toastMsg.text = '' }, 3000) }

async function carregar() {
  loading.value = !tenant.value
  erro.value = ''
  try {
    const [t, h] = await Promise.all([
      platformFetch<Tenant>(`/platform/tenants/${route.params.id}`),
      platformFetch<Pagamento[]>(`/platform/cobranca/tenants/${route.params.id}/historico`),
    ])
    tenant.value = t
    historico.value = h
    await carregarAdmin()
  }
  catch (e: any) { erro.value = e?.message || 'Erro ao carregar' }
  finally { loading.value = false }
}

async function toggleStatus() {
  if (!tenant.value) return
  const novoStatus = tenant.value.status === 'ativo' ? 'suspenso' : 'ativo'
  const ok = await showConfirm(
    novoStatus === 'suspenso' ? `Suspender "${tenant.value.nome}"?` : `Reativar "${tenant.value.nome}"?`,
    novoStatus === 'suspenso'
      ? 'O restaurante fica sem acesso até ser reativado manualmente, mesmo com a mensalidade em dia.'
      : 'O acesso volta a seguir a assinatura (vencimento e pagamentos).',
    novoStatus === 'suspenso' ? 'danger' : 'success'
  )
  if (!ok) return
  try {
    await platformFetch(`/platform/tenants/${tenant.value.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: novoStatus }) })
    showToast('success', novoStatus === 'suspenso' ? 'Restaurante suspenso' : 'Restaurante reativado')
    await carregar()
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
}


// ── GERAÇÃO DE CONTRATO PDF ──────────────────────────────────────────────────

const CONTRATADA = {
  razaoSocial:        'SavioAlves Tecnologia LTDA ME',
  nomeFantasia:       'OmniFlow Systems',
  cnpj:               '45.678.901/0001-23',
  inscricaoEstadual:  'Isento',
  endereco:           'Rua das Flores, 256, Sala 04',
  bairro:             'Setor Bueno',
  cidade:             'Goiânia',
  uf:                 'GO',
  cep:                '74.210-050',
  telefone:           '(62) 9 9912-3456',
  email:              'suporte.savioalves@gmail.com',
  site:               'www.omniflow.com.br',
  representante:      'Sávio Ferreira Alves',
  cpfRepresentante:   '123.456.789-00',
  rgRepresentante:    '1.234.567 SSP/GO',
  cargoRepresentante: 'Administrador',
  foroCidade:         'Goiânia',
  foroUF:             'GO',
}

function visualizarContrato() { gerarContratoPDF() }

function imprimirContrato() {
  const win = gerarContratoPDF()
  if (win) setTimeout(() => { try { win.print() } catch {} }, 800)
}

async function compartilharContrato() {
  if (!tenant.value) return
  const t = tenant.value
  const c = contratoAtual.value
  const texto = `Contrato PDV — ${t.nome}\nPlano: ${c?.plano || '—'}\nValor: ${c?.valor ? formatCurrency(c.valor) : '—'}/${c?.ciclo || '—'}\nVigência: ${formatDate(c?.dataInicio)} → ${c?.dataFim ? formatDate(c.dataFim) : 'Indeterminado'}\nContato: ${t.contato || '—'}`
  try {
    if (navigator.share) {
      await navigator.share({ title: `Contrato — ${t.nome}`, text: texto })
    } else {
      await navigator.clipboard.writeText(texto)
      showToast('success', 'Resumo copiado para a área de transferência')
    }
  } catch {}
}

function escapeHtml(val: unknown): string {
  if (val == null) return ''
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function gerarContratoPDF(): Window | null {
  if (!tenant.value) return null
  const t = tenant.value
  const c = contratoAtual.value

  const fmtD = (d: string | Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '___/___/______'
  const fmtM = (v: string | number | null | undefined) =>
    v ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'a definir em aditivo'

  const plano    = c?.plano || 'Básico'
  const valor    = fmtM(c?.valor)

  // Campos da API sanitizados antes de injetar no HTML
  const esc = escapeHtml
  const sNome          = esc(t.nome)
  const sSlug          = esc(t.slug)
  const sCnpj          = esc(t.cnpj)
  const sCpfResponsavel = esc((t as any).cpfResponsavel)
  const sEndereco      = esc(t.endereco)
  const sCidade        = esc((t as any).cidade)
  const sUF            = esc((t as any).uf)
  const sTelefone      = esc(t.telefone)
  const sContato       = esc(t.contato)
  const sResponsavel   = esc(t.responsavel)
  const sPlano         = esc(plano)
  const sObs        = t.observacoes ? esc(t.observacoes).replace(/\n/g, '<br>') : ''
  const ciclo    = c?.ciclo || 'mensal'
  const cicloMap: Record<string, string> = { mensal: 'mensal', trimestral: 'trimestral', semestral: 'semestral', anual: 'anual' }
  const cicloExtMap: Record<string, string> = { mensal: '30 (trinta) dias', trimestral: '3 (três) meses', semestral: '6 (seis) meses', anual: '12 (doze) meses' }
  const inicio   = c?.dataInicio ? new Date(c.dataInicio) : new Date()
  const fim      = c?.dataFim ? new Date(c.dataFim) : null
  const vigencia = fim
    ? `de ${fmtD(inicio)} a ${fmtD(fim)}`
    : `a partir de ${fmtD(inicio)}, por prazo indeterminado`

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Contrato — ${sNome}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; font-size: 11pt; color: #1a1a2e; background: #fff; line-height: 1.75; }
    .page { max-width: 820px; margin: 0 auto; }
    .header-bar { background: linear-gradient(135deg, #1a1f3c 0%, #2d3680 100%); padding: 26px 48px; display: flex; align-items: center; justify-content: space-between; }
    .brand-block { display: flex; align-items: center; gap: 12px; }
    .brand-icon { width: 38px; height: 38px; background: rgba(255,255,255,0.12); border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; }
    .brand-name { color: #fff; font-size: 17pt; font-weight: 900; letter-spacing: -0.5px; line-height: 1; display: block; }
    .brand-sub { color: rgba(255,255,255,0.4); font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; display: block; margin-top: 3px; }
    .header-ref { text-align: right; }
    .doc-type { color: rgba(255,255,255,0.75); font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; display: block; }
    .doc-num { color: rgba(255,255,255,0.4); font-size: 8pt; font-weight: 600; margin-top: 4px; display: block; }
    .title-section { background: #f5f6ff; border-bottom: 1px solid #dde0f5; padding: 22px 48px; text-align: center; }
    .contract-title { font-size: 12.5pt; font-weight: 900; color: #1a1f3c; text-transform: uppercase; letter-spacing: 0.8px; }
    .contract-subtitle { font-size: 9.5pt; color: #6b7280; margin-top: 4px; }
    .plano-badge { display: inline-flex; align-items: center; background: #ede9fe; color: #4f46e5; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 3px 12px; border-radius: 999px; margin-top: 8px; }
    .body { padding: 32px 48px 48px; }
    .section-label { font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .section-label::before { content: ''; display: block; width: 18px; height: 2px; background: #4f46e5; border-radius: 2px; flex-shrink: 0; }
    .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 32px; }
    .party-card { border-radius: 10px; border: 1px solid #dde0f5; overflow: hidden; }
    .party-card-header { padding: 10px 16px; font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
    .party-card-contratada .party-card-header { background: #1a1f3c; color: #fff; }
    .party-card-contratante .party-card-header { background: #4f46e5; color: #fff; }
    .party-card-body { padding: 14px 16px; background: #fafaff; }
    .pfield { margin-bottom: 5px; font-size: 9.5pt; color: #374151; line-height: 1.45; }
    .pfield strong { font-weight: 700; color: #1a1f3c; font-size: 8.5pt; }
    .clauses-label { font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #9ca3af; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
    .clauses-label::before { content: ''; display: block; width: 18px; height: 2px; background: #4f46e5; border-radius: 2px; flex-shrink: 0; }
    .clause { margin-bottom: 22px; }
    .clause-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .clause-num { width: 26px; height: 26px; border-radius: 7px; background: #1a1f3c; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 8.5pt; font-weight: 900; flex-shrink: 0; text-align: center; line-height: 26px; }
    .clause-title { font-size: 10pt; font-weight: 800; color: #1a1f3c; text-transform: uppercase; letter-spacing: 0.4px; }
    .clause p { margin-bottom: 8px; text-align: justify; font-size: 10.5pt; color: #374151; }
    .clause ol { padding-left: 22px; margin-top: 6px; margin-bottom: 8px; }
    .clause ol li { margin-bottom: 5px; text-align: justify; font-size: 10.5pt; color: #374151; }
    .clause .paragrafo { margin-top: 8px; font-size: 10.5pt; text-align: justify; color: #374151; padding: 10px 14px; background: #f5f6ff; border-left: 3px solid #4f46e5; border-radius: 0 6px 6px 0; }
    .clause .paragrafo::before { content: "Parágrafo único. "; font-weight: 800; }
    .notes-box { background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-bottom: 28px; font-size: 10.5pt; color: #374151; }
    .sig-section { margin-top: 44px; padding-top: 20px; border-top: 2px solid #dde0f5; }
    .sig-city { font-size: 10.5pt; color: #374151; margin-bottom: 50px; text-align: center; }
    .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 32px; }
    .sig-block { text-align: center; }
    .sig-line-el { border-top: 1.5px solid #374151; margin-bottom: 8px; }
    .sig-name { font-size: 10pt; font-weight: 700; color: #1a1f3c; }
    .sig-role { font-size: 8.5pt; color: #6b7280; margin-top: 2px; }
    .witness-label { font-size: 8.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 24px; }
    .witness-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
    .witness-block { text-align: center; }
    .witness-field { font-size: 9pt; color: #6b7280; margin-top: 6px; }
    .footer { padding: 14px 48px; background: #f5f6ff; border-top: 1px solid #dde0f5; display: flex; justify-content: space-between; align-items: center; font-size: 8pt; color: #9ca3af; }
    .footer-brand { font-weight: 800; color: #1a1f3c; }
    @media print {
      body { font-size: 10.5pt; }
      .page { padding: 0; }
      @page { margin: 2cm 1.8cm; }
      .header-bar, .party-card-contratada .party-card-header, .party-card-contratante .party-card-header, .clause-num, .clause .paragrafo, .title-section, .footer { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
<div class="page">

  <div class="header-bar">
    <div class="brand-block">
      <div class="brand-icon">⚡</div>
      <div>
        <span class="brand-name">Restaurante PDV</span>
        <span class="brand-sub">Sistema de Gestão PDV</span>
      </div>
    </div>
    <div class="header-ref">
      <span class="doc-type">Contrato de Prestação de Serviços</span>
      <span class="doc-num">Ref.: ${sSlug.toUpperCase()}-${inicio.getFullYear()}</span>
    </div>
  </div>

  <div class="title-section">
    <div class="contract-title">Contrato de Prestação de Serviços de Tecnologia</div>
    <div class="contract-subtitle">Modalidade SaaS — Sistema de Ponto de Venda</div>
    <div class="plano-badge">Plano ${sPlano}</div>
  </div>

  <div class="body">

    <div class="section-label">Partes Contratantes</div>
    <div class="parties-grid">
      <div class="party-card party-card-contratada">
        <div class="party-card-header">Contratada</div>
        <div class="party-card-body">
          <p class="pfield"><strong>Razão Social:</strong> ${CONTRATADA.razaoSocial}</p>
          <p class="pfield"><strong>Nome Fantasia:</strong> ${CONTRATADA.nomeFantasia}</p>
          <p class="pfield"><strong>CNPJ:</strong> ${CONTRATADA.cnpj} · IE ${CONTRATADA.inscricaoEstadual}</p>
          <p class="pfield"><strong>Endereço:</strong> ${CONTRATADA.endereco}, ${CONTRATADA.bairro}, ${CONTRATADA.cidade}/${CONTRATADA.uf} — CEP ${CONTRATADA.cep}</p>
          <p class="pfield"><strong>Contato:</strong> ${CONTRATADA.telefone} · ${CONTRATADA.email}</p>
          <p class="pfield"><strong>Representante:</strong> ${CONTRATADA.representante} · CPF ${CONTRATADA.cpfRepresentante}</p>
        </div>
      </div>
      <div class="party-card party-card-contratante">
        <div class="party-card-header">Contratante</div>
        <div class="party-card-body">
          <p class="pfield"><strong>Razão Social / Nome:</strong> ${sNome}</p>
          <p class="pfield"><strong>CNPJ / CPF:</strong> ${sCnpj || '___________________________________'}</p>
          <p class="pfield"><strong>Endereço:</strong> ${sEndereco || '______________________________________'}</p>
          <p class="pfield"><strong>Cidade / UF:</strong> ${sCidade || '_______________________'} / ${sUF || '___'}</p>
          <p class="pfield"><strong>Contato:</strong> ${sTelefone || '_______________________'} · ${sContato || '_______________________________'}</p>
          <p class="pfield"><strong>Representante:</strong> ${sResponsavel || '______________________________'} · CPF ${sCpfResponsavel || '___________________'}</p>
        </div>
      </div>
    </div>

    <div class="clauses-label">Cláusulas Contratuais</div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">1</div>
        <div class="clause-title">Do Objeto</div>
      </div>
      <p>O presente instrumento tem por objeto a prestação de serviços de tecnologia pela CONTRATADA
      à CONTRATANTE, consistindo no licenciamento de uso do sistema de Ponto de Venda (PDV)
      <strong>Restaurante PDV</strong>, na modalidade <em>Software as a Service</em> (SaaS), plano
      <strong>${sPlano}</strong>, compreendendo:</p>
      <ol>
        <li>Acesso ao sistema via navegador web, com suporte a múltiplos dispositivos;</li>
        <li>Painel administrativo para gestão de produtos, mesas, pedidos e caixa;</li>
        <li>Atualizações de versão disponibilizadas automaticamente durante a vigência;</li>
        <li>Suporte técnico nos canais e horários definidos na Cláusula 4ª;</li>
        <li>Armazenamento dos dados do CONTRATANTE em ambiente seguro com backups periódicos.</li>
      </ol>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">2</div>
        <div class="clause-title">Da Vigência</div>
      </div>
      <p>O presente contrato vigorará ${vigencia}, renovando-se automaticamente por períodos sucessivos de
      ${cicloExtMap[ciclo] || '30 (trinta) dias'}, salvo notificação de não renovação por qualquer das partes,
      realizada com antecedência mínima de 30 (trinta) dias antes do término do período vigente,
      por e-mail ou notificação escrita.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">3</div>
        <div class="clause-title">Do Valor e Forma de Pagamento</div>
      </div>
      <p>Pela prestação dos serviços descritos, a CONTRATANTE pagará à CONTRATADA o valor de
      <strong>${valor}</strong> por ciclo <strong>${cicloMap[ciclo] || ciclo}</strong>, com vencimento no dia
      <strong>${c?.diaVencimento ?? 10}</strong> de cada período de referência.</p>
      <p>São aceitos os seguintes meios de pagamento: PIX, transferência bancária (TED/DOC) ou boleto bancário.</p>
      <p class="paragrafo">O não pagamento até a data de vencimento acarretará multa moratória de 2% (dois por cento)
      sobre o valor em aberto, acrescida de juros de mora de 1% (um por cento) ao mês, calculados pro rata die,
      além de correção monetária pelo IGPM/FGV, sem prejuízo da suspensão automática do acesso ao sistema após
      ${TOLERANCIA_DIAS} (cinco) dias de inadimplência.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">4</div>
        <div class="clause-title">Das Obrigações da Contratada</div>
      </div>
      <p>Compete à CONTRATADA:</p>
      <ol>
        <li>Garantir a disponibilidade do sistema com SLA mínimo de 99% (noventa e nove por cento) ao mês,
        excluídas janelas de manutenção programada comunicadas com antecedência;</li>
        <li>Realizar backups automáticos dos dados da CONTRATANTE com frequência mínima diária;</li>
        <li>Prestar suporte técnico de segunda a sexta-feira, das 08h às 18h (horário de Brasília),
        por meio de e-mail (${CONTRATADA.email}) e WhatsApp (${CONTRATADA.telefone});</li>
        <li>Comunicar à CONTRATANTE, com antecedência mínima de 48 (quarenta e oito) horas, as
        manutenções programadas que impliquem indisponibilidade do sistema;</li>
        <li>Manter a confidencialidade dos dados da CONTRATANTE, não os compartilhando com terceiros,
        salvo por determinação legal ou judicial.</li>
      </ol>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">5</div>
        <div class="clause-title">Das Obrigações da Contratante</div>
      </div>
      <p>Compete à CONTRATANTE:</p>
      <ol>
        <li>Manter em sigilo as credenciais de acesso ao sistema, sendo integralmente responsável
        por uso indevido decorrente de compartilhamento não autorizado;</li>
        <li>Efetuar os pagamentos nas datas e condições acordadas neste instrumento;</li>
        <li>Utilizar o sistema exclusivamente para fins lícitos, em conformidade com a legislação
        brasileira e com os termos deste contrato;</li>
        <li>Notificar a CONTRATADA, imediatamente, sobre qualquer suspeita de violação de segurança,
        acesso não autorizado ou uso indevido do sistema;</li>
        <li>Manter seus dados cadastrais atualizados junto à CONTRATADA.</li>
      </ol>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">6</div>
        <div class="clause-title">Da Propriedade Intelectual</div>
      </div>
      <p>O sistema <strong>Restaurante PDV</strong> e todos os seus componentes — incluindo código-fonte,
      interfaces, algoritmos, documentação e marca — são de propriedade exclusiva da CONTRATADA, protegidos
      pela Lei nº 9.609/1998 (Lei de Software) e pela Lei nº 9.610/1998 (Lei de Direitos Autorais).</p>
      <p class="paragrafo">Este contrato confere à CONTRATANTE licença de uso não exclusiva, intransferível
      e revogável do software, pelo período de vigência contratual. Não implica cessão, transferência ou
      sublicenciamento de quaisquer direitos de propriedade intelectual.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">7</div>
        <div class="clause-title">Da Confidencialidade e Proteção de Dados (LGPD)</div>
      </div>
      <p>As partes comprometem-se a tratar os dados pessoais eventualmente compartilhados em estrita
      conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD),
      adotando medidas técnicas e organizacionais adequadas para proteger as informações contra
      acesso não autorizado, destruição, perda, alteração ou divulgação indevida.</p>
      <p>A CONTRATADA atuará como <em>operadora</em> dos dados inseridos pela CONTRATANTE no sistema,
      processando-os exclusivamente para as finalidades previstas neste contrato. A CONTRATANTE,
      na qualidade de <em>controladora</em>, é responsável pela legalidade do tratamento de dados
      de seus clientes e colaboradores dentro do sistema.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">8</div>
        <div class="clause-title">Da Limitação de Responsabilidade</div>
      </div>
      <p>A CONTRATADA não será responsabilizada por danos indiretos, lucros cessantes ou perda de
      dados decorrentes de:</p>
      <ol>
        <li>Uso inadequado do sistema pela CONTRATANTE ou por terceiros com acesso autorizado por ela;</li>
        <li>Falhas de infraestrutura de terceiros (internet, energia elétrica, provedores de nuvem);</li>
        <li>Eventos de força maior ou caso fortuito, conforme o art. 393 do Código Civil Brasileiro;</li>
        <li>Manutenções programadas devidamente comunicadas.</li>
      </ol>
      <p class="paragrafo">Em qualquer hipótese, a responsabilidade máxima da CONTRATADA fica limitada
      ao valor pago pela CONTRATANTE nos últimos 3 (três) meses de vigência do contrato.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">9</div>
        <div class="clause-title">Da Rescisão</div>
      </div>
      <p>Este contrato poderá ser rescindido:</p>
      <ol>
        <li><strong>Por qualquer das partes</strong>, mediante notificação escrita com antecedência
        mínima de 30 (trinta) dias, sem ônus ou penalidades;</li>
        <li><strong>Por inadimplência</strong> da CONTRATANTE, após decorridos ${TOLERANCIA_DIAS} (cinco) dias do
        vencimento sem pagamento, independentemente de notificação prévia, não gerando direito
        a restituição de valores já pagos;</li>
        <li><strong>Por descumprimento contratual</strong> de qualquer das partes, após notificação
        e prazo de 5 (cinco) dias úteis para regularização.</li>
      </ol>
      <p class="paragrafo">Rescindido o contrato, a CONTRATADA manterá os dados da CONTRATANTE
      disponíveis para exportação por 30 (trinta) dias, após os quais poderão ser definitivamente
      excluídos.</p>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">10</div>
        <div class="clause-title">Das Disposições Gerais</div>
      </div>
      <ol>
        <li>Este contrato constitui o acordo integral entre as partes, substituindo quaisquer
        entendimentos anteriores sobre o mesmo objeto;</li>
        <li>Qualquer alteração deste instrumento somente terá validade se formalizada por escrito
        e assinada por ambas as partes;</li>
        <li>A tolerância de uma das partes em relação ao descumprimento de qualquer cláusula não
        constituirá novação ou renúncia ao direito de exigi-la futuramente;</li>
        <li>Caso qualquer disposição deste contrato seja considerada inválida, as demais permanecerão
        em pleno vigor.</li>
      </ol>
    </div>

    <div class="clause">
      <div class="clause-header">
        <div class="clause-num">11</div>
        <div class="clause-title">Do Foro</div>
      </div>
      <p>Fica eleito o foro da Comarca de <strong>${CONTRATADA.foroCidade}/${CONTRATADA.foroUF}</strong>
      para dirimir quaisquer controvérsias oriundas deste instrumento, com renúncia expressa a qualquer
      outro, por mais privilegiado que seja, ressalvados os casos em que a legislação imponha foro
      diverso de forma imperativa.</p>
    </div>

    ${sObs ? `<div class="notes-box"><strong>Condições específicas / Observações:</strong><br>${sObs}</div>` : ''}

    <div class="sig-section">
      <p class="sig-city">${CONTRATADA.foroCidade}/${CONTRATADA.foroUF}, _______ de __________________ de _______</p>
      <div class="sig-grid">
        <div class="sig-block">
          <div class="sig-line-el"></div>
          <div class="sig-name">${sNome}</div>
          <div class="sig-role">CONTRATANTE</div>
        </div>
        <div class="sig-block">
          <div class="sig-line-el"></div>
          <div class="sig-name">${CONTRATADA.representante}</div>
          <div class="sig-role">CONTRATADA — ${CONTRATADA.cargoRepresentante}</div>
        </div>
      </div>
      <div style="margin-top:8px;">
        <div class="witness-label">Testemunhas:</div>
        <div class="witness-grid">
          <div class="witness-block">
            <div class="sig-line-el"></div>
            <div class="witness-field">Nome: ___________________________ CPF: ___________________</div>
          </div>
          <div class="witness-block">
            <div class="sig-line-el"></div>
            <div class="witness-field">Nome: ___________________________ CPF: ___________________</div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <div class="footer">
    <span><span class="footer-brand">Restaurante PDV</span> · ${CONTRATADA.razaoSocial} · CNPJ ${CONTRATADA.cnpj}</span>
    <span>Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${sNome} · Plano ${sPlano}</span>
  </div>

</div>
</body>
</html>`

  const janela = window.open('', '_blank')
  if (!janela) { showToast('error', 'Permita popups para gerar o contrato'); return null }
  janela.document.write(html)
  janela.document.close()
  return janela
}

onMounted(() => {
  platformAuth.restore()
  if (!platformAuth.isAuthenticated) { navigateTo('/platform/login'); return }
  carregar()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.toast-enter-active, .toast-leave-active { transition: opacity .2s ease, transform .2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>
