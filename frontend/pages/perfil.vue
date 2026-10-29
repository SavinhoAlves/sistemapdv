<template>
  <div class="min-h-screen com-sidebar">
    <div class="mp">
      <!-- CABEÇALHO -->
      <header class="mp-topo">
        <span class="mp-av">{{ inicial }}</span>
        <div class="mp-id">
          <p class="mp-rest">{{ dados?.restaurante }}</p>
          <h1>{{ dados?.nome ?? authStore.usuario?.nome }}</h1>
          <p class="mp-cargo">{{ cargoRotulo }}<template v-if="dados?.funcao && dados.funcao !== cargoRotulo"> · {{ dados.funcao }}</template></p>
          <ul v-if="dados" class="mp-chips">
            <li :class="dados.temSenha ? 'ok' : ''"><KeyRound :size="13" />{{ dados.temSenha ? 'Senha ativa' : 'Sem senha' }}</li>
            <li :class="dados.temCartao ? 'ok' : ''"><CreditCard :size="13" />{{ dados.temCartao ? 'Crachá cadastrado' : 'Sem crachá' }}</li>
            <li :class="dados.temPin ? 'ok' : ''"><Smartphone :size="13" />{{ dados.temPin ? 'PIN do celular' : 'Sem PIN' }}</li>
            <li v-if="dados.biometrias.length" class="ok"><ScanFace :size="13" />Face ID / digital</li>
          </ul>
        </div>
        <dl v-if="dados" class="mp-resumo">
          <div><dt>Código de acesso</dt><dd class="mono">{{ dados.codigoAcesso }}</dd></div>
          <div><dt>Na equipe desde</dt><dd>{{ data(dados.desde) }}</dd></div>
          <div><dt>Último acesso</dt><dd>{{ dados.ultimoLogin ? dataHora(dados.ultimoLogin) : '—' }}</dd></div>
        </dl>
      </header>

      <div v-if="carregando" class="mp-grade"><div class="mp-bloco mp-sk" /><div class="mp-bloco mp-sk" /></div>
      <p v-else-if="erro" class="mp-bloco mp-erro">{{ erro }}</p>

      <div v-else-if="dados" class="mp-grade">
        <div class="mp-col">
          <!-- DADOS PESSOAIS -->
          <section class="mp-bloco">
            <div class="mp-cab">
              <h2>Dados pessoais</h2>
              <button v-if="editando !== 'pessoais'" class="mp-btn mini" :disabled="!!editando" @click="editar('pessoais')"><Pencil :size="14" />Editar</button>
            </div>
            <form v-if="editando === 'pessoais'" class="mp-campos mp-edita" @submit.prevent="salvarDados">
              <label class="largo">Nome completo<input ref="primeiroEdita" v-model="form.nome" maxlength="120" autocomplete="name" required></label>
              <label>CPF<input :value="form.cpf" class="mono" inputmode="numeric" placeholder="000.000.000-00" @input="form.cpf = cpfBR(valor($event))"></label>
              <label>Nascimento<input v-model="form.nascimento" type="date" :max="hoje"></label>
              <label>Telefone<input :value="form.telefone" class="mono" inputmode="tel" placeholder="(00) 00000-0000" autocomplete="tel" @input="form.telefone = telefoneBR(valor($event))"></label>
              <label>E-mail<input v-model="form.email" type="email" autocomplete="email" placeholder="voce@exemplo.com"></label>
              <div class="largo mp-acoes">
                <button type="button" class="mp-btn" :disabled="salvando === 'dados'" @click="cancelarEdicao">Cancelar</button>
                <button class="mp-btn pri" :disabled="salvando === 'dados'">{{ salvando === 'dados' ? 'Salvando…' : 'Salvar' }}</button>
              </div>
            </form>
            <dl v-else class="mp-campos">
              <div class="largo"><dt>Nome completo</dt><dd>{{ dados.nome }}</dd></div>
              <div><dt>CPF</dt><dd :class="{ vazio: !dados.cpf }" class="mono">{{ dados.cpf ? cpfBR(dados.cpf) : 'Não informado' }}</dd></div>
              <div><dt>Nascimento</dt><dd :class="{ vazio: !dados.nascimento }">{{ dados.nascimento ? dataSoBR(dados.nascimento) : 'Não informado' }}</dd></div>
              <div><dt>Telefone</dt><dd :class="{ vazio: !dados.telefone }" class="mono">{{ dados.telefone ? telefoneBR(dados.telefone) : 'Não informado' }}</dd></div>
              <div><dt>E-mail</dt><dd :class="{ vazio: !dados.email }">{{ dados.email || 'Não informado' }}</dd></div>
            </dl>
          </section>

          <!-- ENDEREÇO -->
          <section class="mp-bloco">
            <div class="mp-cab">
              <h2>Endereço</h2>
              <button v-if="editando !== 'endereco'" class="mp-btn mini" :disabled="!!editando" @click="editar('endereco')"><Pencil :size="14" />Editar</button>
            </div>
            <form v-if="editando === 'endereco'" class="mp-campos mp-edita" @submit.prevent="salvarDados">
              <label class="largo">Logradouro<input ref="primeiroEdita" v-model="form.endereco" maxlength="200" autocomplete="street-address" placeholder="Rua, número, bairro"></label>
              <label>Cidade<input v-model="form.cidade" maxlength="200" autocomplete="address-level2"></label>
              <label>UF<input v-model="form.uf" class="uf" maxlength="2" autocomplete="address-level1" placeholder="SP" @input="form.uf = form.uf.replace(/[^a-z]/gi, '').toUpperCase()"></label>
              <label>CEP<input :value="form.cep" class="mono" inputmode="numeric" placeholder="00000-000" autocomplete="postal-code" @input="form.cep = cepBR(valor($event))"></label>
              <div class="largo mp-acoes">
                <button type="button" class="mp-btn" :disabled="salvando === 'dados'" @click="cancelarEdicao">Cancelar</button>
                <button class="mp-btn pri" :disabled="salvando === 'dados'">{{ salvando === 'dados' ? 'Salvando…' : 'Salvar' }}</button>
              </div>
            </form>
            <dl v-else class="mp-campos">
              <div class="largo"><dt>Logradouro</dt><dd :class="{ vazio: !dados.endereco }">{{ dados.endereco || 'Não informado' }}</dd></div>
              <div><dt>Cidade</dt><dd :class="{ vazio: !dados.cidade }">{{ dados.cidade ? `${dados.cidade}${dados.uf ? ` / ${dados.uf}` : ''}` : 'Não informado' }}</dd></div>
              <div><dt>CEP</dt><dd :class="{ vazio: !dados.cep }" class="mono">{{ dados.cep ? cepBR(dados.cep) : 'Não informado' }}</dd></div>
            </dl>
          </section>

          <!-- RESTAURANTE E PLANO (administrador) -->
          <section v-if="dados.empresa" class="mp-bloco">
            <div class="mp-cab">
              <h2>Restaurante e plano</h2>
              <span class="mp-situacao" :class="dados.empresa.situacao">{{ SITUACAO[dados.empresa.situacao] ?? dados.empresa.situacao }}</span>
            </div>
            <div class="mp-plano">
              <div>
                <p class="mp-plano-nome">{{ dados.empresa.plano?.nome ?? 'Sem plano definido' }}</p>
                <p v-if="dados.empresa.plano?.descricao" class="mp-plano-desc">{{ dados.empresa.plano.descricao }}</p>
              </div>
              <div class="mp-plano-valor">
                <template v-if="dados.empresa.isento"><b>Isento</b><small>sem mensalidade</small></template>
                <template v-else><b class="mono">{{ reais(dados.empresa.mensalidade) }}</b><small>por mês · vence dia {{ dados.empresa.diaVencimento }}</small></template>
              </div>
            </div>
            <ul class="mp-recursos">
              <li v-for="r in recursos" :key="r.chave" :class="{ on: r.on }">
                <Check v-if="r.on" :size="14" /><Minus v-else :size="14" />{{ r.rotulo }}
              </li>
            </ul>
            <dl class="mp-campos">
              <div class="largo"><dt>Nome do restaurante</dt><dd>{{ dados.restaurante }}</dd></div>
              <div><dt>CNPJ</dt><dd :class="{ vazio: !dados.empresa.cnpj }" class="mono">{{ dados.empresa.cnpj ? cnpjBR(dados.empresa.cnpj) : 'Não informado' }}</dd></div>
              <div><dt>Responsável</dt><dd :class="{ vazio: !dados.empresa.responsavel }">{{ dados.empresa.responsavel || 'Não informado' }}</dd></div>
              <div><dt>Telefone</dt><dd :class="{ vazio: !dados.empresa.telefone }" class="mono">{{ dados.empresa.telefone ? telefoneBR(dados.empresa.telefone) : 'Não informado' }}</dd></div>
              <div><dt>Cliente desde</dt><dd>{{ data(dados.empresa.clienteDesde) }}</dd></div>
              <div class="largo"><dt>Endereço</dt><dd :class="{ vazio: !enderecoEmpresa }">{{ enderecoEmpresa || 'Não informado' }}</dd></div>
            </dl>
          </section>
        </div>

        <div class="mp-col">
          <!-- ACESSO E SEGURANÇA -->
          <section class="mp-bloco">
            <div class="mp-cab"><h2>Acesso e segurança</h2></div>
            <ul class="mp-itens">
              <li>
                <span class="mp-ic"><UserRound :size="18" /></span>
                <div><b>Entrar no sistema</b><small>Código <span class="mono">{{ dados.codigoAcesso }}</span><template v-if="dados.login"> ou usuário <span class="mono">{{ dados.login }}</span></template></small></div>
              </li>
              <li>
                <span class="mp-ic"><KeyRound :size="18" /></span>
                <div><b>Senha</b><small>{{ dados.temSenha ? 'Usada para entrar e para confirmar trocas aqui.' : 'Seu usuário entra sem senha. Peça ao administrador para cadastrar uma.' }}</small></div>
                <button v-if="dados.temSenha" class="mp-btn" @click="abrirJanela('senha')">Trocar senha</button>
              </li>
              <li>
                <span class="mp-ic"><Smartphone :size="18" /></span>
                <div><b>PIN do celular</b><small>{{ dados.temPin ? 'Confirma ações no celular, no lugar do crachá.' : 'De 4 a 6 números para confirmar ações no celular.' }}</small></div>
                <button v-if="dados.temSenha" class="mp-btn" @click="abrirJanela('pin')">{{ dados.temPin ? 'Trocar PIN' : 'Cadastrar' }}</button>
              </li>
              <li>
                <span class="mp-ic"><CreditCard :size="18" /></span>
                <div><b>Crachá RFID</b><small>{{ dados.temCartao ? 'Cadastrado. Passar o crachá identifica você nas mesas e no caixa.' : 'Nenhum crachá. O administrador cadastra em Admin › Funcionários.' }}</small></div>
              </li>
            </ul>
          </section>

          <!-- APARELHOS -->
          <section class="mp-bloco">
            <div class="mp-cab"><h2>Face ID e digital</h2></div>
            <ul v-if="dados.biometrias.length" class="mp-itens">
              <li v-for="b in dados.biometrias" :key="b.id">
                <span class="mp-ic"><ScanFace :size="18" /></span>
                <div><b>{{ b.aparelho || 'Celular' }}</b><small>Ativado em {{ data(b.createdAt) }}<template v-if="b.usadoEm"> · usado em {{ data(b.usadoEm) }}</template></small></div>
              </li>
            </ul>
            <p v-else class="mp-nota">Nenhum aparelho. No celular, ative pelo menu do seu nome no topo.</p>
          </section>
        </div>
      </div>
    </div>

    <!-- JANELAS: TROCAR SENHA / PIN -->
    <Teleport to="body">
      <div v-if="janela" class="mp-fundo" @click.self="fecharJanela">
        <form class="mp-janela" role="dialog" aria-modal="true" :aria-label="janela === 'senha' ? 'Trocar senha' : 'PIN do celular'" @submit.prevent="janela === 'senha' ? trocarSenha() : salvarPin(false)">
          <header>
            <span class="mp-ic grande"><KeyRound v-if="janela === 'senha'" :size="20" /><Smartphone v-else :size="20" /></span>
            <div>
              <h2>{{ janela === 'senha' ? 'Trocar senha' : dados?.temPin ? 'Trocar PIN do celular' : 'Cadastrar PIN do celular' }}</h2>
              <p>{{ janela === 'senha' ? 'A nova senha vale no próximo acesso, em todos os aparelhos.' : 'Digite a sua senha para confirmar que é você.' }}</p>
            </div>
            <button type="button" class="mp-x" aria-label="Fechar" @click="fecharJanela"><X :size="18" /></button>
          </header>

          <div v-if="janela === 'senha'" class="mp-form">
            <label>Senha atual<input ref="primeiroCampo" v-model="senha.atual" type="password" autocomplete="current-password" required></label>
            <label>Nova senha<input v-model="senha.nova" type="password" autocomplete="new-password" minlength="6" required></label>
            <label>Repita a nova senha<input v-model="senha.repete" type="password" autocomplete="new-password" minlength="6" required></label>
            <p class="mp-regra" :class="{ ok: senha.nova.length >= 6 }"><Check :size="13" /> Pelo menos 6 caracteres</p>
            <p class="mp-regra" :class="{ ok: !!senha.nova && senha.nova === senha.repete }"><Check :size="13" /> As duas senhas novas iguais</p>
          </div>
          <div v-else class="mp-form">
            <label>Senha atual<input ref="primeiroCampo" v-model="pin.senha" type="password" autocomplete="current-password" required></label>
            <label>{{ dados?.temPin ? 'Novo PIN' : 'PIN' }}<input v-model="pin.valor" class="mono pin" inputmode="numeric" pattern="\d{4,6}" maxlength="6" autocomplete="off" required @input="pin.valor = pin.valor.replace(/\D/g, '')"></label>
            <p class="mp-regra" :class="{ ok: /^\d{4,6}$/.test(pin.valor) }"><Check :size="13" /> De 4 a 6 números</p>
          </div>

          <footer>
            <button v-if="janela === 'pin' && dados?.temPin" type="button" class="mp-btn perigo" :disabled="!!salvando" @click="salvarPin(true)">Remover PIN</button>
            <span class="flex-1" />
            <button type="button" class="mp-btn" @click="fecharJanela">Cancelar</button>
            <button class="mp-btn pri" :disabled="!!salvando">{{ salvando ? 'Salvando…' : janela === 'senha' ? 'Trocar senha' : 'Salvar PIN' }}</button>
          </footer>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { KeyRound, CreditCard, Smartphone, ScanFace, UserRound, Check, Minus, X, Pencil } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'
import { reais } from '~/lib/moeda'
import { cpfBR, telefoneBR, cepBR, cnpjBR, dataSoBR } from '~/lib/documento'

interface Empresa {
  cnpj: string | null; responsavel: string | null; telefone: string | null
  endereco: string | null; cidade: string | null; uf: string | null; tipoComercio: string | null
  situacao: string; clienteDesde: string
  plano: { nome: string; descricao: string | null } | null
  mensalidade: number; isento: boolean; diaVencimento: number
  recursos: { rfid: boolean; celular: boolean; delivery: boolean; nfce: boolean }
}
interface Perfil {
  nome: string; login: string | null; email: string | null; codigoAcesso: string; restaurante: string
  cargo: string; funcao: string | null; ultimoLogin: string | null; desde: string
  temSenha: boolean; temPin: boolean; temCartao: boolean
  biometrias: { id: string; aparelho: string | null; createdAt: string; usadoEm: string | null }[]
  cpf: string | null; telefone: string | null; nascimento: string | null
  cep: string | null; endereco: string | null; cidade: string | null; uf: string | null
  empresa: Empresa | null
}

const authStore = useAuthStore()
const api = useApi()
const toast = useToastStore()

const dados = ref<Perfil | null>(null)
const carregando = ref(true)
const erro = ref('')
const salvando = ref<'' | 'senha' | 'pin' | 'dados'>('')
const senha = ref({ atual: '', nova: '', repete: '' })
const pin = ref({ senha: '', valor: '' })
const janela = ref<'' | 'senha' | 'pin'>('')
const primeiroCampo = ref<HTMLInputElement | null>(null)
// Edição no próprio card: um card por vez, os outros ficam travados
const editando = ref<'' | 'pessoais' | 'endereco'>('')
const form = ref({ nome: '', cpf: '', nascimento: '', telefone: '', email: '', endereco: '', cidade: '', uf: '', cep: '' })
const primeiroEdita = ref<HTMLInputElement | null>(null)
const hoje = new Date().toISOString().slice(0, 10)
const valor = (e: Event) => (e.target as HTMLInputElement).value

const CARGOS: Record<string, string> = { administrador: 'Administrador', garcom: 'Garçom', caixa: 'Caixa', cozinha: 'Cozinha', entregador: 'Entregador' }
const SITUACAO: Record<string, string> = { ativo: 'Ativo', suspenso: 'Suspenso', cancelado: 'Cancelado' }
const cargoRotulo = computed(() => { const c = dados.value?.cargo ?? authStore.usuario?.cargo ?? ''; return CARGOS[c] ?? c })
const inicial = computed(() => ((dados.value?.nome ?? authStore.usuario?.nome ?? 'U').trim()[0] ?? 'U').toUpperCase())
const data = (d: string) => new Date(d).toLocaleDateString('pt-BR')
const dataHora = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const recursos = computed(() => {
  const r = dados.value?.empresa?.recursos
  if (!r) return []
  return [
    { chave: 'rfid', rotulo: 'Crachá RFID', on: r.rfid },
    { chave: 'celular', rotulo: 'Venda pelo celular', on: r.celular },
    { chave: 'delivery', rotulo: 'Delivery', on: r.delivery },
    { chave: 'nfce', rotulo: 'NFC-e', on: r.nfce },
  ]
})
const enderecoEmpresa = computed(() => {
  const e = dados.value?.empresa
  if (!e) return ''
  return [e.endereco, [e.cidade, e.uf].filter(Boolean).join(' / ')].filter(Boolean).join(' — ')
})

async function carregar() {
  try { dados.value = await api.get<Perfil>('/perfil') }
  catch (e: any) { erro.value = e?.message || 'Não deu para carregar o seu perfil' }
  finally { carregando.value = false }
}

async function editar(qual: 'pessoais' | 'endereco') {
  const d = dados.value!
  form.value = {
    nome: d.nome, cpf: cpfBR(d.cpf), nascimento: d.nascimento?.slice(0, 10) ?? '', telefone: telefoneBR(d.telefone), email: d.email ?? '',
    endereco: d.endereco ?? '', cidade: d.cidade ?? '', uf: d.uf ?? '', cep: cepBR(d.cep),
  }
  editando.value = qual
  await nextTick()
  primeiroEdita.value?.focus()
}
function cancelarEdicao() { if (salvando.value !== 'dados') editando.value = '' }

async function salvarDados() {
  const f = form.value
  // Só os campos do card aberto; o servidor guarda CPF, telefone e CEP só com os números
  const corpo = editando.value === 'pessoais'
    ? { nome: f.nome, cpf: f.cpf, nascimento: f.nascimento || null, telefone: f.telefone, email: f.email }
    : { endereco: f.endereco, cidade: f.cidade, uf: f.uf, cep: f.cep }
  salvando.value = 'dados'
  try {
    await api.put('/perfil', corpo)
    const novo = await api.get<Perfil>('/perfil')
    dados.value = novo
    if (authStore.usuario && novo.nome !== authStore.usuario.nome) authStore.usuario.nome = novo.nome
    toast.success('Dados salvos')
    salvando.value = ''
    editando.value = ''
  } catch (e: any) { toast.error(e?.message || 'Não deu para salvar os seus dados') }
  finally { salvando.value = '' }
}

async function abrirJanela(qual: 'senha' | 'pin') {
  senha.value = { atual: '', nova: '', repete: '' }
  pin.value = { senha: '', valor: '' }
  janela.value = qual
  await nextTick()
  primeiroCampo.value?.focus()
}
function fecharJanela() { if (!salvando.value) janela.value = '' }
const aoTeclar = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return
  if (janela.value) fecharJanela()
  else if (editando.value) cancelarEdicao()
}

async function trocarSenha() {
  if (senha.value.nova !== senha.value.repete) return toast.error('As duas senhas novas não são iguais')
  salvando.value = 'senha'
  try {
    await api.post('/perfil/senha', { senhaAtual: senha.value.atual, novaSenha: senha.value.nova })
    toast.success('Senha trocada')
    salvando.value = ''
    fecharJanela()
  } catch (e: any) { toast.error(e?.message || 'Não deu para trocar a senha') }
  finally { salvando.value = '' }
}

async function salvarPin(remover: boolean) {
  if (remover && !pin.value.senha) return toast.error('Digite a sua senha atual para remover o PIN')
  salvando.value = 'pin'
  try {
    await api.post('/perfil/pin', { senhaAtual: pin.value.senha, pin: remover ? '' : pin.value.valor })
    if (dados.value) dados.value.temPin = !remover
    toast.success(remover ? 'PIN removido' : 'PIN salvo')
    salvando.value = ''
    fecharJanela()
  } catch (e: any) { toast.error(e?.message || 'Não deu para salvar o PIN') }
  finally { salvando.value = '' }
}

onMounted(() => { carregar(); window.addEventListener('keydown', aoTeclar) })
onBeforeUnmount(() => window.removeEventListener('keydown', aoTeclar))
</script>

<style scoped>
.mp{padding:28px clamp(16px,2.5vw,40px) 48px;display:flex;flex-direction:column;gap:20px;max-width:1440px}
.mono{font-family:var(--fonte-numero)}

/* Cabeçalho */
.mp-topo{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px 24px;padding:24px 28px;border-radius:var(--r-cartao,16px);background:var(--sup-cartao);border:1px solid var(--linha)}
.mp-av{width:84px;height:84px;border-radius:50%;background:var(--acao);color:#0E1119;display:grid;place-items:center;font-weight:800;font-size:34px}
.mp-id{min-width:0}
.mp-rest{font-size:12px;font-weight:600;color:var(--txt-3);text-transform:uppercase;letter-spacing:.08em}
.mp-id h1{margin-top:2px;font-size:clamp(24px,2.6vw,32px);font-weight:800;letter-spacing:-.03em;color:var(--txt);overflow-wrap:anywhere}
.mp-cargo{margin-top:2px;font-size:15px;color:var(--txt-2)}
.mp-chips{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0;padding:0;list-style:none}
.mp-chips li{display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:600;color:var(--txt-3);background:var(--sup-elevado);border:1px solid var(--linha)}
.mp-chips li.ok{color:var(--st-pronto);background:var(--st-pronto-bg);border-color:transparent}
.mp-resumo{display:grid;gap:12px;margin:0;padding-left:24px;border-left:1px solid var(--linha);min-width:200px}
.mp-resumo dt{font-size:12px;color:var(--txt-3)}
.mp-resumo dd{margin:1px 0 0;font-size:15px;font-weight:700;color:var(--txt)}

/* Grade */
.mp-grade{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(320px,1fr);gap:20px;align-items:start}
.mp-col{display:flex;flex-direction:column;gap:20px;min-width:0}
.mp-bloco{background:var(--sup-cartao);border:1px solid var(--linha);border-radius:var(--r-cartao,16px);padding:22px 24px}
.mp-cab{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}
.mp-cab h2{font-size:16px;font-weight:700;color:var(--txt)}
.mp-sk{height:260px;animation:pulse 1.5s ease-in-out infinite}
.mp-erro{color:var(--st-atencao)}
.mp-nota{margin-top:16px;font-size:13px;color:var(--txt-3)}

.mp-campos{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:18px 28px;margin:0}
.mp-campos .largo{grid-column:1/-1}
.mp-campos dt{font-size:12px;color:var(--txt-3)}
.mp-campos dd{margin:3px 0 0;font-size:15px;font-weight:600;color:var(--txt);overflow-wrap:anywhere}
.mp-campos dd.vazio{font-weight:500;color:var(--txt-3);font-style:italic;font-family:var(--fonte-texto)}

/* Plano */
.mp-situacao{font-size:12px;font-weight:700;padding:4px 10px;border-radius:999px;background:var(--st-pronto-bg);color:var(--st-pronto)}
.mp-situacao.suspenso,.mp-situacao.cancelado{background:var(--st-atencao-bg);color:var(--st-atencao)}
.mp-plano{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;border-radius:12px;background:var(--acao-fraca);border:1px solid var(--linha)}
.mp-plano-nome{font-size:18px;font-weight:800;color:var(--txt)}
.mp-plano-desc{margin-top:2px;font-size:13px;color:var(--txt-2)}
.mp-plano-valor{text-align:right;flex:none}
.mp-plano-valor b{display:block;font-size:20px;font-weight:800;color:var(--txt)}
.mp-plano-valor small{font-size:12px;color:var(--txt-3)}
.mp-recursos{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 22px;padding:0;list-style:none}
.mp-recursos li{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--txt-3);padding:6px 10px;border-radius:8px;border:1px dashed var(--linha)}
.mp-recursos li.on{color:var(--txt);border-style:solid;background:var(--sup-elevado)}
.mp-recursos li.on svg{color:var(--st-pronto)}

/* Itens de acesso */
.mp-itens{list-style:none;margin:0;padding:0}
.mp-itens li{display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid var(--linha)}
.mp-itens li:first-child{border-top:0;padding-top:0}
.mp-itens li:last-child{padding-bottom:0}
.mp-itens li>div{flex:1;min-width:0}
.mp-itens b{display:block;font-size:14px;color:var(--txt)}
.mp-itens small{display:block;margin-top:2px;font-size:13px;color:var(--txt-3)}
.mp-ic{width:38px;height:38px;flex:none;border-radius:10px;display:grid;place-items:center;background:var(--sup-elevado);color:var(--txt-2)}
.mp-ic.grande{width:44px;height:44px;background:var(--acao-fraca);color:var(--acao)}

.mp-btn{height:40px;padding:0 16px;flex:none;border-radius:var(--r-controle);border:1px solid var(--linha);font-weight:700;font-size:14px;color:var(--txt);white-space:nowrap}
.mp-btn:hover{background:var(--sup-elevado)}
.mp-btn.pri{background:var(--acao);border-color:var(--acao);color:#0E1119}
.mp-btn.pri:hover{background:var(--acao-hover)}
.mp-btn.perigo{color:var(--st-atencao)}
.mp-btn[disabled]{opacity:.6}
.mp-btn.mini{height:34px;padding:0 12px;font-size:13px;display:inline-flex;align-items:center;gap:6px}

/* Card em edição */
.mp-edita label{display:grid;gap:6px;font-size:12px;color:var(--txt-3)}
.mp-edita input{height:44px;padding:0 12px;border-radius:var(--r-controle);border:1px solid var(--linha-forte, var(--linha));background:var(--sup-fundo);color:var(--txt);font:600 15px var(--fonte-texto);min-width:0}
.mp-edita input.mono{font-family:var(--fonte-numero)}
.mp-edita input.uf{text-transform:uppercase}
.mp-edita input:focus{outline:none;border-color:var(--acao);box-shadow:0 0 0 3px var(--acao-fraca)}
.mp-acoes{display:flex;justify-content:flex-end;gap:8px}

/* Janela */
.mp-fundo{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:16px;background:rgba(8,10,16,.55)}
.mp-janela{width:min(480px,100%);max-height:calc(100vh - 32px);overflow:auto;background:var(--sup-cartao);border:1px solid var(--linha);border-radius:var(--r-folha,20px);box-shadow:var(--sombra-folha)}
.mp-janela header{display:flex;align-items:flex-start;gap:14px;padding:22px 22px 6px}
.mp-janela header>div{flex:1;min-width:0}
.mp-janela h2{font-size:18px;font-weight:800;color:var(--txt)}
.mp-janela header p{margin-top:2px;font-size:13px;color:var(--txt-3)}
.mp-x{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:var(--txt-3)}
.mp-x:hover{background:var(--sup-elevado);color:var(--txt)}
.mp-form{display:grid;gap:14px;padding:16px 22px 4px}
.mp-form label{display:grid;gap:6px;font-size:13px;font-weight:600;color:var(--txt-2)}
.mp-form input{height:48px;padding:0 14px;border-radius:var(--r-controle);border:1px solid var(--linha-forte, var(--linha));background:var(--sup-fundo);color:var(--txt);font:500 15px var(--fonte-texto)}
.mp-form input.pin{font-family:var(--fonte-numero);letter-spacing:.4em;font-size:18px}
.mp-form input:focus{outline:none;border-color:var(--acao);box-shadow:0 0 0 3px var(--acao-fraca)}
.mp-regra{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--txt-3)}
.mp-regra.ok{color:var(--st-pronto)}
.mp-janela footer{display:flex;align-items:center;gap:8px;padding:20px 22px 22px}

@media (max-width:1100px){
  .mp-grade{grid-template-columns:1fr}
}
@media (max-width:760px){
  .mp-topo{grid-template-columns:auto 1fr;padding:20px}
  .mp-av{width:64px;height:64px;font-size:26px}
  .mp-resumo{grid-column:1/-1;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));padding:16px 0 0;border-left:0;border-top:1px solid var(--linha)}
  .mp-bloco{padding:18px}
  .mp-plano{flex-direction:column;align-items:flex-start}
  .mp-plano-valor{text-align:left}
  .mp-itens li{flex-wrap:wrap}
  .mp-itens li>div{flex-basis:calc(100% - 52px)}
  .mp-itens li>.mp-btn{margin-left:52px}
  .mp-acoes .mp-btn{flex:1}
  .mp-janela footer{flex-wrap:wrap}
  .mp-janela footer>span{display:none}
  .mp-janela footer .mp-btn{flex:1}
  .mp-janela footer .perigo{order:3;flex-basis:100%}
}
</style>
