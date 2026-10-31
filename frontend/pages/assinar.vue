<template>
  <div class="as">
    <div class="page">
      <!-- Resumo do plano -->
      <aside class="hero" aria-label="Plano escolhido">
        <a class="logo" :href="linkInicio">Restaurante<i>PDV</i></a>
        <div class="hero-mid">
          <template v-if="plano">
            <span class="hello">Plano escolhido</span>
            <h2>{{ plano.nome }}</h2>
            <p v-if="plano.descricao" class="desc">{{ plano.descricao }}</p>
            <div v-if="temAnual(plano)" class="ciclo" role="group" aria-label="Forma de cobrança">
              <button type="button" :aria-pressed="ciclo === 'mensal'" :disabled="travado" @click="ciclo = 'mensal'">Mensal</button>
              <button type="button" :aria-pressed="ciclo === 'anual'" :disabled="travado" @click="ciclo = 'anual'">Anual</button>
            </div>
            <div class="preco"><span>R$</span><b>{{ moeda(valorCobrado) }}</b><small>{{ ciclo === 'anual' ? '/ano' : '/mês' }}</small></div>
            <ul class="itens">
              <li>Mesas, cozinha, caixa e Pix</li>
              <li>Cardápio digital</li>
              <li :class="{ nao: !plano.delivery }">Delivery</li>
              <li :class="{ nao: !plano.rfid }">Crachá RFID</li>
              <li :class="{ nao: !plano.vendaMobile }">Venda pelo celular</li>
              <li>Implantação, treinamento e suporte</li>
            </ul>
            <button v-if="planos.length > 1 && !travado" type="button" class="trocar" @click="plano = null">Trocar de plano</button>
          </template>
          <template v-else>
            <span class="hello">Escolha o plano</span>
            <div class="lista">
              <button v-for="p in planos" :key="p.id" type="button" class="opc" @click="escolher(p)">
                <strong>{{ p.nome }}</strong><span>R$ {{ moeda(p.valor) }}/mês</span>
              </button>
              <p v-if="!planos.length && !carregando" class="desc">Nenhum plano disponível para contratação online no momento.</p>
            </div>
          </template>
        </div>
        <span class="copy">Pagamento seguro pelo Asaas · Pix ou cartão de crédito</span>
      </aside>

      <div class="side">
        <div class="top">
          <a class="back" :href="linkInicio"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg><span>Voltar ao site</span></a>
          <a class="logo logo-sm" :href="linkInicio">Restaurante<i>PDV</i></a>
        </div>

        <main class="center">
          <div class="card">
            <ol v-if="passo <= 3" class="passos" aria-label="Etapas">
              <li v-for="(n, i) in ['Responsável', 'Empresa', 'Pagamento']" :key="n" :class="{ atual: passo === i + 1, feito: passo > i + 1 }" :aria-current="passo === i + 1 ? 'step' : undefined">
                <span>{{ i + 1 }}</span>{{ n }}
              </li>
            </ol>

            <p v-if="passo <= 3" class="ja-conta">Já tem uma conta? <NuxtLink to="/login">Entrar</NuxtLink></p>

            <p v-if="erro" class="msg err" role="alert">{{ erro }}</p>

            <!-- 1. Pessoa física: quem responde pelo restaurante e vai administrar o sistema -->
            <form v-if="passo === 1" novalidate @submit.prevent="avancar">
              <div class="head"><h1>Seus dados</h1><p>Você será o administrador do sistema e quem responde pelo contrato.</p></div>
              <div class="field"><label for="r-nome">Nome completo</label><input id="r-nome" v-model.trim="r.nome" autocomplete="name" :aria-invalid="inval === 'r-nome'"></div>
              <div class="grid2">
                <div class="field"><label for="r-cpf">CPF</label><input id="r-cpf" :value="r.cpf" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00" :aria-invalid="inval === 'r-cpf'" @input="r.cpf = cpfBR(($event.target as HTMLInputElement).value)"></div>
                <div class="field"><label for="r-cel">Celular (WhatsApp)</label><input id="r-cel" :value="r.celular" inputmode="tel" autocomplete="tel" placeholder="(00) 00000-0000" :aria-invalid="inval === 'r-cel'" @input="r.celular = telefoneBR(($event.target as HTMLInputElement).value)"></div>
              </div>
              <div class="field"><label for="r-email">E-mail</label><input id="r-email" v-model.trim="r.email" type="email" autocomplete="email" placeholder="voce@restaurante.com.br" :aria-invalid="inval === 'r-email'"><p class="hint">Você entra no sistema com este e-mail. A cobrança também chega aqui.</p></div>
              <div class="grid2">
                <div class="field"><label for="r-senha">Senha</label><input id="r-senha" v-model="r.senha" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" :aria-invalid="inval === 'r-senha'"></div>
                <div class="field"><label for="r-senha2">Confirme a senha</label><input id="r-senha2" v-model="r.senha2" type="password" autocomplete="new-password" :aria-invalid="inval === 'r-senha2'"></div>
              </div>
              <button class="btn" type="submit">Continuar</button>
            </form>

            <!-- 2. Empresa -->
            <form v-else-if="passo === 2" novalidate @submit.prevent="avancar">
              <div class="head"><h1>Dados da empresa</h1><p>Do restaurante que vai usar o sistema.</p></div>
              <div class="grid2">
                <div class="field"><label for="e-nome">Nome do restaurante</label><input id="e-nome" v-model.trim="e.nome" autocomplete="organization" placeholder="Como aparece para os clientes" :aria-invalid="inval === 'e-nome'"></div>
                <div class="field"><label for="e-tipo">Tipo</label>
                  <select id="e-tipo" v-model="e.tipoComercio"><option value="">Escolha…</option><option v-for="t in TIPOS_COMERCIO" :key="t.id" :value="t.id">{{ t.rotulo }}</option></select>
                </div>
              </div>
              <fieldset class="field">
                <legend>A empresa tem CNPJ?</legend>
                <div class="seg">
                  <label><input v-model="e.temCnpj" type="radio" :value="true"> Sim</label>
                  <label><input v-model="e.temCnpj" type="radio" :value="false"> Ainda não (uso meu CPF)</label>
                </div>
              </fieldset>
              <div v-if="e.temCnpj" class="grid2">
                <div class="field"><label for="e-cnpj">CNPJ</label><input id="e-cnpj" :value="e.cnpj" inputmode="numeric" placeholder="00.000.000/0000-00" :aria-invalid="inval === 'e-cnpj'" @input="e.cnpj = cnpjMascara(($event.target as HTMLInputElement).value)"></div>
                <div class="field"><label for="e-razao">Razão social</label><input id="e-razao" v-model.trim="e.razaoSocial" :aria-invalid="inval === 'e-razao'"></div>
              </div>
              <p v-else class="hint nota">O contrato e a cobrança ficam no CPF {{ r.cpf || 'do responsável' }}. Quando tiver CNPJ, é só avisar o suporte.</p>
              <div class="grid3">
                <div class="field">
                  <label for="e-cep">CEP</label>
                  <input id="e-cep" :value="e.cep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" :aria-invalid="inval === 'e-cep'" aria-describedby="e-cep-info" @input="aoDigitarCep(($event.target as HTMLInputElement).value)">
                  <p v-if="cepInfo" id="e-cep-info" class="hint" role="status">{{ cepInfo }}</p>
                </div>
                <div class="field span2"><label for="e-rua">Endereço</label><input id="e-rua" v-model.trim="e.logradouro" autocomplete="address-line1" placeholder="Rua, avenida…" :aria-invalid="inval === 'e-rua'"></div>
              </div>
              <div class="grid3">
                <div class="field"><label for="e-num">Número</label><input id="e-num" v-model.trim="e.numero" :aria-invalid="inval === 'e-num'"></div>
                <div class="field span2"><label for="e-bairro">Bairro</label><input id="e-bairro" v-model.trim="e.bairro"></div>
              </div>
              <div class="grid3">
                <div class="field span2"><label for="e-cidade">Cidade</label><input id="e-cidade" v-model.trim="e.cidade" autocomplete="address-level2" :aria-invalid="inval === 'e-cidade'"></div>
                <div class="field"><label for="e-uf">UF</label>
                  <select id="e-uf" v-model="e.uf" :aria-invalid="inval === 'e-uf'"><option value="">—</option><option v-for="u in UFS" :key="u" :value="u">{{ u }}</option></select>
                </div>
              </div>
              <div class="acoes"><button class="btn ghost" type="button" @click="voltar">Voltar</button><button class="btn" type="submit">Continuar</button></div>
            </form>

            <!-- 3. Pagamento -->
            <form v-else-if="passo === 3" novalidate @submit.prevent="pagar">
              <div class="head"><h1>Pagamento</h1><p>O acesso é liberado assim que o pagamento for confirmado.</p></div>
              <div class="resumo">
                <div><span>Plano</span><b>{{ plano?.nome }} · {{ ciclo === 'anual' ? 'anual' : 'mensal' }}</b></div>
                <div><span>Restaurante</span><b>{{ e.nome }}</b></div>
                <div><span>Total {{ ciclo === 'anual' ? 'por ano' : 'por mês' }}</span><b>R$ {{ moeda(valorCobrado) }}</b></div>
              </div>
              <fieldset class="field">
                <legend>Como quer pagar?</legend>
                <div class="formas">
                  <label :class="{ sel: forma === 'PIX' }"><input v-model="forma" type="radio" value="PIX"><strong>Pix</strong><small>Liberação em segundos. A cada {{ ciclo === 'anual' ? 'ano' : 'mês' }} chega um Pix novo no e-mail.</small></label>
                  <label :class="{ sel: forma === 'CREDIT_CARD' }"><input v-model="forma" type="radio" value="CREDIT_CARD"><strong>Cartão de crédito</strong><small>Cobrado automaticamente a cada {{ ciclo === 'anual' ? 'ano' : 'mês' }}.</small></label>
                </div>
              </fieldset>
              <label class="aceite"><input v-model="aceite" type="checkbox"> Li e aceito as condições do plano e o contrato de licença de uso do RestaurantePDV.</label>
              <div class="acoes"><button class="btn ghost" type="button" :disabled="enviando" @click="voltar">Voltar</button><button class="btn" type="submit" :disabled="enviando"><span class="spin" />{{ enviando ? 'Gerando pagamento…' : 'Ir para o pagamento' }}</button></div>
            </form>

            <!-- 4. Aguardando a confirmação -->
            <div v-else-if="passo === 4" class="estado">
              <span class="anel-wrap" aria-hidden="true"><span class="anel" /><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg></span>
              <h1>Aguardando o pagamento</h1>
              <p>Abrimos o pagamento numa nova aba. Assim que for confirmado, o acesso é liberado aqui mesmo. Pode deixar esta página aberta.</p>
              <p v-if="pendente?.confirmarEmail" class="aviso-email">Enviamos também um link para <b>{{ pendente.email }}</b>. Abra-o para confirmar o seu e-mail: sem a confirmação não dá para entrar no sistema.</p>
              <a class="btn" :href="pendente?.link" target="_blank" rel="noopener">Abrir o pagamento</a>
              <button type="button" class="link sub" @click="recomecar">Corrigir dados ou trocar a forma de pagamento</button>
            </div>

            <!-- 5. Liberado -->
            <div v-else class="estado ok">
              <span class="ok-ic" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
              <h1>Pagamento confirmado!</h1>
              <p>O <b>{{ liberado?.restaurante }}</b> já pode usar o sistema. Entre com o seu e-mail <b>{{ pendente?.email }}</b> e a senha que você criou<template v-if="liberado?.codigoAcesso">, ou com o código <b>{{ liberado.codigoAcesso }}</b></template>.</p>
              <p v-if="pendente?.confirmarEmail" class="aviso-email">Antes de entrar, confirme o seu e-mail pelo link que enviamos para <b>{{ pendente.email }}</b>. Não chegou? Veja a caixa de spam ou peça outro na tela de login.</p>
              <NuxtLink class="btn" to="/login" @click="esquecer">Entrar no sistema</NuxtLink>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { cpfBR, telefoneBR, cepBR, cnpjMascara, cpfValido, cnpjValido } from '~/lib/documento'
import { TIPOS_COMERCIO } from '~/lib/tiposComercio'
import { ehApp, urlDoHost } from '~/lib/hosts'

definePageMeta({ layout: false })

interface Plano { id: string; nome: string; descricao: string | null; valor: number; valorAnual: number | null; rfid: boolean; vendaMobile: boolean; delivery: boolean }
interface Pendente { id: string; link: string; email: string; confirmarEmail?: boolean }

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
// Assinatura em andamento: volta direto para a espera se a página recarregar
const GUARDADO = 'pdv_assinatura'

const route = useRoute()
const config = useRuntimeConfig()
const api = (config.public as any).apiUrl as string
const linkInicio = ehApp() ? urlDoHost('', '/') : '/'

const planos = ref<Plano[]>([])
const plano = ref<Plano | null>(null)
const ciclo = ref<'mensal' | 'anual'>(route.query.ciclo === 'anual' ? 'anual' : 'mensal')
const carregando = ref(true)
const passo = ref(1)
const erro = ref('')
const inval = ref('')
const enviando = ref(false)
const forma = ref<'PIX' | 'CREDIT_CARD'>('PIX')
const aceite = ref(false)
const pendente = ref<Pendente | null>(null)
const liberado = ref<{ restaurante: string; codigoAcesso: string | null } | null>(null)

const r = reactive({ nome: '', cpf: '', celular: '', email: '', senha: '', senha2: '' })
const cepInfo = ref('')
const e = reactive({ nome: '', tipoComercio: '', temCnpj: true, cnpj: '', razaoSocial: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' })

const temAnual = (p: Plano) => Number(p.valorAnual) > 0
const valorCobrado = computed(() => plano.value ? (ciclo.value === 'anual' && temAnual(plano.value) ? Number(plano.value.valorAnual) : Number(plano.value.valor)) : 0)
const travado = computed(() => passo.value >= 4)
const moeda = (v: number | null) => Number(v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// CEP completo: preenche cidade e UF (e rua e bairro, se ainda vazios) pelo ViaCEP.
// Sem resposta, os campos continuam para preencher à mão.
let cepConsultado = ''
async function aoDigitarCep(v: string) {
  e.cep = cepBR(v)
  const cep = e.cep.replace(/\D/g, '')
  if (cep.length !== 8) { cepInfo.value = ''; cepConsultado = ''; return }
  if (cep === cepConsultado) return
  cepConsultado = cep
  cepInfo.value = 'Buscando o endereço…'
  try {
    const d = await $fetch<{ erro?: boolean; localidade?: string; uf?: string; logradouro?: string; bairro?: string }>(`https://viacep.com.br/ws/${cep}/json/`, { timeout: 6000 })
    if (cep !== cepConsultado) return
    if (d.erro || !d.localidade) { cepInfo.value = 'CEP não encontrado. Preencha cidade e UF.'; return }
    e.cidade = d.localidade
    e.uf = d.uf ?? e.uf
    if (!e.logradouro && d.logradouro) e.logradouro = d.logradouro
    if (!e.bairro && d.bairro) e.bairro = d.bairro
    // Cidade e UF já aparecem nos campos: o aviso só fica para busca e erro
    cepInfo.value = ''
    if (inval.value === 'e-cidade' || inval.value === 'e-uf') { inval.value = ''; erro.value = '' }
  } catch {
    if (cep === cepConsultado) cepInfo.value = 'Não deu para buscar o CEP agora. Preencha cidade e UF.'
  }
}

function escolher(p: Plano) {
  plano.value = p
  if (!temAnual(p)) ciclo.value = 'mensal'
}

function falha(texto: string, campo = '') {
  erro.value = texto
  inval.value = campo
  if (campo) nextTick(() => document.getElementById(campo)?.focus())
  return false
}

function validar1() {
  if (r.nome.split(/\s+/).length < 2) return falha('Informe o nome completo.', 'r-nome')
  if (!cpfValido(r.cpf)) return falha('CPF inválido.', 'r-cpf')
  if (![10, 11].includes(r.celular.replace(/\D/g, '').length)) return falha('Celular inválido (com DDD).', 'r-cel')
  if (!/^\S+@\S+\.\S+$/.test(r.email)) return falha('E-mail inválido.', 'r-email')
  if (r.senha.length < 8) return falha('A senha precisa ter pelo menos 8 caracteres.', 'r-senha')
  if (r.senha !== r.senha2) return falha('As senhas não conferem.', 'r-senha2')
  return true
}
function validar2() {
  if (e.nome.length < 2) return falha('Informe o nome do restaurante.', 'e-nome')
  if (e.temCnpj && !cnpjValido(e.cnpj)) return falha('CNPJ inválido.', 'e-cnpj')
  if (e.temCnpj && e.razaoSocial.length < 3) return falha('Informe a razão social.', 'e-razao')
  if (e.cep.replace(/\D/g, '').length !== 8) return falha('CEP inválido.', 'e-cep')
  if (e.logradouro.length < 3) return falha('Informe o endereço.', 'e-rua')
  if (!e.numero) return falha('Informe o número (ou s/n).', 'e-num')
  if (e.cidade.length < 2) return falha('Informe a cidade.', 'e-cidade')
  if (!e.uf) return falha('Escolha a UF.', 'e-uf')
  return true
}

function avancar() {
  erro.value = ''; inval.value = ''
  if (!plano.value) return falha('Escolha o plano ao lado.')
  if (passo.value === 1 && !validar1()) return
  if (passo.value === 2 && !validar2()) return
  passo.value++
  window.scrollTo({ top: 0 })
}
function voltar() { erro.value = ''; inval.value = ''; passo.value-- }

async function pagar() {
  erro.value = ''
  if (!aceite.value) return falha('Aceite as condições para continuar.')
  enviando.value = true
  // Abre a aba já no clique (depois do await o navegador bloquearia o pop-up)
  const aba = window.open('about:blank', '_blank')
  try {
    const res = await $fetch<{ id: string; link: string; confirmarEmail?: boolean }>(`${api}/api/publico/assinar`, {
      method: 'POST',
      body: {
        planoId: plano.value!.id, ciclo: ciclo.value, forma: forma.value, aceite: true,
        responsavel: { nome: r.nome, cpf: r.cpf, email: r.email, celular: r.celular, senha: r.senha },
        empresa: {
          nome: e.nome, tipoComercio: e.tipoComercio || undefined, cnpj: e.temCnpj ? e.cnpj : '', razaoSocial: e.temCnpj ? e.razaoSocial : '',
          cep: e.cep, logradouro: e.logradouro, numero: e.numero, bairro: e.bairro, cidade: e.cidade, uf: e.uf,
        },
      },
    })
    pendente.value = { id: res.id, link: res.link, email: r.email, confirmarEmail: !!res.confirmarEmail }
    try { localStorage.setItem(GUARDADO, JSON.stringify(pendente.value)) } catch { /* só não volta sozinho */ }
    if (aba) aba.location.href = res.link
    passo.value = 4
    acompanhar()
  } catch (err: any) {
    aba?.close()
    falha(err?.data?.error || 'Não deu para gerar o pagamento. Tente de novo.')
  } finally {
    enviando.value = false
  }
}

let timer: ReturnType<typeof setInterval> | null = null
function acompanhar() {
  if (timer) clearInterval(timer)
  const conferir = async () => {
    if (!pendente.value) return
    try {
      const s = await $fetch<{ liberado: boolean; restaurante: string; codigoAcesso?: string | null }>(`${api}/api/publico/assinatura/${pendente.value.id}`)
      if (s.liberado) {
        liberado.value = { restaurante: s.restaurante, codigoAcesso: s.codigoAcesso ?? null }
        passo.value = 5
        if (timer) clearInterval(timer)
      }
    } catch (err: any) {
      if (err?.status === 404) recomecar()
    }
  }
  conferir()
  timer = setInterval(conferir, 5000)
}

// Volta ao formulário (os dados preenchidos ficam); enviar de novo com o mesmo
// documento, e-mail e senha reaproveita o cadastro
function recomecar() {
  if (timer) clearInterval(timer)
  passo.value = r.nome ? 3 : 1
}
function esquecer() { try { localStorage.removeItem(GUARDADO) } catch { /* nada */ } }

onMounted(async () => {
  try {
    const salvo = JSON.parse(localStorage.getItem(GUARDADO) || 'null')
    if (salvo?.id && salvo?.link) { pendente.value = salvo; passo.value = 4; acompanhar() }
  } catch { /* começa do zero */ }
  try {
    planos.value = (await $fetch<Plano[]>(`${api}/api/publico/planos`)).filter(p => Number(p.valor) > 0)
    const pedido = planos.value.find(p => p.id === route.query.plano) ?? (planos.value.length === 1 ? planos.value[0] : null)
    if (pedido) escolher(pedido)
  } catch { erro.value = 'Não deu para carregar os planos. Recarregue a página.' }
  carregando.value = false
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.as {
  --bg:#FBF6EF; --panel:#F4E7D6; --card:#FFFFFF; --ink:#1F1A15; --muted:#6B5D50; --line:#EADFCE; --line-2:#E3D6C3;
  --brand:#F07A12; --brand-hover:#E2680A; --brand-text:#B4500A; --tint:#FDEBD8; --danger:#B42318; --ok:#12805C;
  min-height:100vh; background:var(--bg); color:var(--ink); color-scheme:light;
  font:400 16px/1.5 var(--fonte-texto),system-ui,sans-serif; -webkit-font-smoothing:antialiased; overflow-x:hidden;
}
.as *,.as *::before,.as *::after{box-sizing:border-box}
.as h1,.as h2{font-family:var(--fonte-texto);margin:0}
.as :where(button){font:inherit;color:inherit}

.page{min-height:100vh;display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:16px;padding:16px}
.hero{background:var(--panel);border-radius:28px;padding:clamp(28px,4vw,48px);display:flex;flex-direction:column;justify-content:space-between;gap:36px}
.logo{align-self:flex-start;font-weight:800;font-size:20px;letter-spacing:-.02em;color:var(--ink);text-decoration:none}
.logo i{font-style:normal;color:var(--brand-hover)}
.hero-mid{display:flex;flex-direction:column;gap:14px;max-width:440px}
.hello{font-size:14px;font-weight:600;color:var(--brand-text)}
.hero h2{font-size:clamp(34px,3.6vw,48px);line-height:1;font-weight:800;letter-spacing:-.045em}
.desc{margin:0;color:var(--muted);font-size:15px}
.ciclo{display:inline-flex;align-self:flex-start;padding:4px;border-radius:999px;background:var(--bg);gap:4px}
.ciclo button{border:0;background:none;padding:6px 14px;border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;color:var(--muted)}
.ciclo button[aria-pressed=true]{background:var(--card);color:var(--ink);box-shadow:0 1px 3px rgba(31,26,21,.12)}
.preco{display:flex;align-items:baseline;gap:4px}
.preco span{font-weight:600;color:var(--muted)}
.preco b{font-size:44px;font-weight:800;letter-spacing:-.04em}
.preco small{color:var(--muted);font-size:15px}
.itens{list-style:none;margin:4px 0 0;padding:0;display:grid;gap:8px;font-size:14.5px}
.itens li{display:flex;gap:10px;align-items:center}
.itens li::before{content:'';width:18px;height:18px;flex:none;border-radius:50%;background:var(--brand) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%231F1A15' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 6 9 17l-5-5'/%3E%3C/svg%3E") center/11px no-repeat}
.itens li.nao{color:var(--muted);text-decoration:line-through}
.itens li.nao::before{background:var(--line-2)}
.trocar{align-self:flex-start;border:0;background:none;padding:0;color:var(--brand-text);font-weight:600;font-size:14px;cursor:pointer}
.lista{display:grid;gap:10px}
.opc{display:flex;justify-content:space-between;align-items:center;gap:12px;text-align:left;padding:16px 18px;border-radius:16px;border:1px solid transparent;background:var(--bg);cursor:pointer}
.opc:hover{border-color:var(--brand)}
.opc span{color:var(--muted);font-size:14px}
.copy{font-size:13px;color:var(--muted)}

.side{display:flex;flex-direction:column;padding:clamp(12px,3vw,32px);gap:20px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:40px}
.back{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px 0 10px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--ink);text-decoration:none;font-weight:500;font-size:14px}
.back:hover{background:#F7EFE4}
.logo-sm{display:none}
.center{flex:1;display:flex;align-items:flex-start;justify-content:center}
.card{width:100%;max-width:520px;padding-top:clamp(0px,4vh,40px)}

.ja-conta{margin:0 0 16px;font-size:14px;color:var(--muted)}
.ja-conta a{color:var(--brand-text);font-weight:600;text-decoration:none}
.ja-conta a:hover{text-decoration:underline}
.passos{list-style:none;margin:0 0 24px;padding:0;display:flex;gap:6px;flex-wrap:wrap}
.passos li{display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border-radius:999px;background:var(--panel);color:var(--muted);font-size:13.5px;font-weight:600}
.passos li span{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--bg);font-size:12px}
.passos li.atual{background:var(--ink);color:#fff}
.passos li.atual span{background:var(--brand);color:var(--ink)}
.passos li.feito span{background:var(--brand);color:var(--ink)}

.head{display:flex;flex-direction:column;gap:6px;margin-bottom:22px}
.card h1{font-size:30px;line-height:1.05;font-weight:800;letter-spacing:-.04em}
.head p{margin:0;font-size:15px;color:var(--muted)}

form{display:flex;flex-direction:column}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0 12px}
.span2{grid-column:span 2}
.field{margin:0 0 14px;border:0;padding:0;min-width:0}
label,legend{display:block;font-weight:500;font-size:13.5px;margin-bottom:6px;color:var(--ink);padding:0}
input:not([type=radio]):not([type=checkbox]),select{width:100%;min-height:50px;padding:0 14px;font:400 16px var(--fonte-texto),sans-serif;color:var(--ink);background:var(--card);border:1px solid var(--line-2);border-radius:14px;transition:border-color .15s,box-shadow .15s}
input::placeholder{color:#9C8E80}
input:focus-visible,select:focus-visible{outline:none;border-color:var(--brand);box-shadow:0 0 0 4px rgba(240,122,18,.15)}
[aria-invalid=true]{border-color:var(--danger) !important}
.hint{margin:6px 2px 0;font-size:13px;color:var(--muted)}
.hint.nota{margin:-4px 0 14px}
.seg{display:flex;gap:8px;flex-wrap:wrap}
.seg label{display:flex;align-items:center;gap:8px;margin:0;min-height:44px;padding:0 14px;border:1px solid var(--line-2);border-radius:12px;background:var(--card);cursor:pointer;font-size:14.5px}
.seg label:has(input:checked){border-color:var(--brand);background:var(--tint)}
.seg input,.formas input,.aceite input{accent-color:var(--brand);width:18px;height:18px}
.resumo{display:grid;gap:8px;padding:16px 18px;border-radius:16px;background:var(--panel);margin-bottom:18px;font-size:14.5px}
.resumo div{display:flex;justify-content:space-between;gap:12px}
.resumo span{color:var(--muted)}
.formas{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.formas label{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:center;margin:0;padding:14px;border:1px solid var(--line-2);border-radius:16px;background:var(--card);cursor:pointer}
.formas label.sel{border-color:var(--brand);background:var(--tint)}
.formas strong{font-size:15px}
.formas small{grid-column:2;color:var(--muted);font-size:13px;line-height:1.35}
.aceite{display:flex;gap:10px;align-items:flex-start;font-weight:400;font-size:14px;color:var(--muted);margin:4px 0 6px;cursor:pointer}
.acoes{display:grid;grid-template-columns:1fr 2fr;gap:10px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:52px;margin-top:8px;border:0;border-radius:14px;background:var(--brand);color:var(--ink);font:600 15px var(--fonte-texto),sans-serif;text-decoration:none;cursor:pointer;transition:background .15s}
.btn:hover{background:var(--brand-hover)}
.btn[disabled]{opacity:.7;cursor:progress}
.btn.ghost{background:transparent;border:1px solid var(--line)}
.btn.ghost:hover{background:var(--panel)}
.spin{width:18px;height:18px;border:2.5px solid rgba(31,26,21,.25);border-top-color:var(--ink);border-radius:50%;animation:s .7s linear infinite;display:none}
.btn[disabled] .spin{display:block}
@keyframes s{to{transform:rotate(360deg)}}
.msg{margin:0 0 16px;padding:12px 14px;border-radius:14px;font-size:14px}
.msg.err{color:var(--danger);background:#FDECEC;border:1px solid #F3B9BC}
.link{color:var(--brand-text);font-weight:600;border:0;background:none;padding:0;cursor:pointer;font-size:14px}
.link.sub{display:block;margin:14px auto 0;color:var(--muted);font-weight:500}
a:focus-visible,button:focus-visible{outline:2px solid var(--brand);outline-offset:2px}

.estado{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding-top:24px}
.estado p{margin:0 0 6px;color:var(--muted);font-size:15px}
.estado b{color:var(--ink)}
.estado .aviso-email{padding:12px 14px;border-radius:14px;background:var(--tint);color:var(--ink);font-size:14.5px}
.anel-wrap{position:relative;width:56px;height:56px;border-radius:18px;background:var(--tint);color:var(--brand-text);display:grid;place-items:center;margin-bottom:6px}
.anel{position:absolute;inset:0;border-radius:18px;border:2px solid var(--brand);animation:aguardo 1.8s ease-out infinite}
@keyframes aguardo{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.6);opacity:0}}
.ok-ic{width:56px;height:56px;border-radius:18px;background:#E7F6EF;color:var(--ok);display:grid;place-items:center;margin-bottom:6px}

@media (max-width:980px){
  .page{grid-template-columns:1fr;padding:0}
  .hero{border-radius:0 0 28px 28px;gap:20px}
  .hero > .logo,.hero > .copy{display:none}
  .logo-sm{display:block;font-size:18px}
  .side{order:-1;padding-bottom:0}
}
@media (max-width:560px){
  .grid2,.grid3,.formas,.acoes{grid-template-columns:1fr}
  .span2{grid-column:auto}
  .side{padding:14px 16px 0}
  .card h1{font-size:26px}
}
@media (prefers-reduced-motion:reduce){.anel{animation:none}.spin{animation-duration:1.5s}}
</style>
