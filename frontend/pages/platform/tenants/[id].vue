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
              <div><h2>Contrato</h2><p>Gerado a cada alteração; envie a versão mais recente ao cliente</p></div>
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
                <div v-if="versaoAtual && !versaoAtual.enviadoEm" class="pf-note warn" style="margin-bottom:12px">
                  <Send :size="16" />
                  <div>
                    <b>{{ versaoAtual.numero > 1 ? `Contrato atualizado (versão ${versaoAtual.numero})` : 'Contrato gerado' }} — envie ao cliente</b>
                    <small style="display:block">{{ versaoAtual.motivo }} em {{ formatDate(versaoAtual.createdAt) }}. Depois de enviar, marque como enviado.</small>
                  </div>
                </div>
                <div class="pf-acts">
                  <button class="pf-btn s k" :disabled="!versaoAtual || pdfOcupado" @click="abrirPdf(versaoAtual!.numero)"><Eye :size="16" /> Ver PDF</button>
                  <button class="pf-btn s" :disabled="!versaoAtual || pdfOcupado" @click="baixarPdf(versaoAtual!.numero)"><Download :size="16" /> Baixar</button>
                  <button class="pf-btn s" :disabled="!versaoAtual || pdfOcupado" @click="compartilharPdf(versaoAtual!.numero)"><Share2 :size="16" /> Compartilhar</button>
                  <button v-if="versaoAtual && !versaoAtual.enviadoEm" class="pf-btn s" @click="marcarEnviado(versaoAtual.numero, true)"><Send :size="16" /> Marcar como enviado</button>
                </div>
                <div v-if="versoes.length" class="pf-versoes">
                  <div v-for="v in versoes" :key="v.numero" class="pf-versao">
                    <span><b>Versão {{ v.numero }}</b> · {{ formatDate(v.createdAt) }} · {{ v.motivo }}</span>
                    <span class="pf-versao-acts">
                      <span v-if="v.enviadoEm" class="pf-pill pf-r ok" :title="`Enviado em ${formatDate(v.enviadoEm)}`"><i />Enviado {{ formatDate(v.enviadoEm) }}</span>
                      <span v-else class="pf-pill pf-r warn"><i />Não enviado</span>
                      <button class="pf-link" @click="abrirPdf(v.numero)">PDF</button>
                    </span>
                  </div>
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
  Eye, EyeOff, Share2, ShieldCheck, Lock, Download, Send,
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
    await Promise.all([carregarAdmin(), carregarVersoes()])
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


// ── Contrato (PDF gerado no servidor, uma versão por alteração) ─────────────

interface VersaoContrato { id: string; numero: number; motivo: string | null; enviadoEm: string | null; createdAt: string }

const runtimeConfig = useRuntimeConfig()
const versoes       = ref<VersaoContrato[]>([])
const versaoAtual   = computed(() => versoes.value[0] ?? null)
const pdfOcupado    = ref(false)

async function carregarVersoes() {
  versoes.value = contratoAtual.value
    ? await platformFetch<VersaoContrato[]>(`/platform/contratos/${route.params.id}/versoes`)
    : []
}

/** O PDF exige o token da plataforma, então vem por fetch e vira um arquivo local. */
async function buscarPdf(numero: number): Promise<File> {
  const base = (runtimeConfig.public as any).apiUrl as string
  const resp = await fetch(`${base}/api/platform/contratos/${route.params.id}/versoes/${numero}/pdf`, {
    headers: { Authorization: `Bearer ${platformAuth.token}` },
  })
  if (!resp.ok) throw new Error((await resp.json().catch(() => null))?.error || `Erro ${resp.status}`)
  const nome = `Contrato-${tenant.value?.codigo ?? ''}-v${numero}.pdf`
  return new File([await resp.blob()], nome, { type: 'application/pdf' })
}

async function comPdf(numero: number, acao: (f: File) => Promise<void> | void) {
  pdfOcupado.value = true
  try { await acao(await buscarPdf(numero)); return true }
  catch (e: any) { if (e?.name !== 'AbortError') showToast('error', e?.message || 'Erro ao gerar o PDF'); return false }
  finally { pdfOcupado.value = false }
}

function abrirPdf(numero: number) {
  // Abre a aba antes do await, senão o navegador bloqueia como pop-up
  const janela = window.open('', '_blank')
  return comPdf(numero, f => {
    const url = URL.createObjectURL(f)
    if (janela) janela.location.href = url
    else window.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }).then(ok => { if (!ok) janela?.close() })
}

function salvarArquivo(f: File) {
  const url = URL.createObjectURL(f)
  const a = Object.assign(document.createElement('a'), { href: url, download: f.name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function baixarPdf(numero: number) { return comPdf(numero, salvarArquivo) }

/** No celular abre o compartilhar do sistema (WhatsApp etc.); no computador baixa o arquivo. */
function compartilharPdf(numero: number) {
  return comPdf(numero, async f => {
    if (navigator.canShare?.({ files: [f] })) {
      await navigator.share({ files: [f], title: f.name, text: `Contrato de prestação de serviços — ${tenant.value?.nome}` })
      if (versaoAtual.value?.numero === numero && !versaoAtual.value.enviadoEm) await marcarEnviado(numero, true)
      return
    }
    salvarArquivo(f)
    showToast('success', 'PDF baixado. Anexe no WhatsApp ou no e-mail do cliente.')
  })
}

async function marcarEnviado(numero: number, enviado: boolean) {
  try {
    const v = await platformFetch<VersaoContrato>(`/platform/contratos/${route.params.id}/versoes/${numero}/enviado`, {
      method: 'POST', body: JSON.stringify({ enviado }),
    })
    versoes.value = versoes.value.map(x => (x.numero === v.numero ? v : x))
    showToast('success', `Versão ${numero} marcada como enviada`)
  } catch (e: any) { showToast('error', e?.message || 'Erro') }
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
