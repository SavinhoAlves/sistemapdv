<template>
  <div class="min-h-screen com-sidebar">
    <div class="pf2">
      <header class="pf2-topo">
        <span class="pf2-av">{{ inicial }}</span>
        <div class="min-w-0">
          <h1 class="truncate">{{ dados?.nome ?? authStore.usuario?.nome }}</h1>
          <p>{{ cargoRotulo }}<template v-if="dados?.funcao && dados.funcao !== cargoRotulo"> · {{ dados.funcao }}</template><template v-if="dados?.restaurante"> · {{ dados.restaurante }}</template></p>
        </div>
      </header>

      <div v-if="carregando" class="pf2-card pf2-sk" />
      <p v-else-if="erro" class="pf2-card pf2-erro">{{ erro }}</p>

      <template v-else-if="dados">
        <!-- DADOS -->
        <section class="pf2-card">
          <h2>Meus dados</h2>
          <p class="pf2-sub">Para mudar nome, e-mail ou função, fale com o administrador do restaurante.</p>
          <dl class="pf2-dados">
            <div><dt>Nome</dt><dd>{{ dados.nome }}</dd></div>
            <div><dt>Cargo</dt><dd>{{ cargoRotulo }}<template v-if="dados.funcao && dados.funcao !== cargoRotulo"> · {{ dados.funcao }}</template></dd></div>
            <div><dt>Código de acesso</dt><dd class="mono">{{ dados.codigoAcesso }}</dd></div>
            <div v-if="dados.login"><dt>Usuário</dt><dd class="mono">{{ dados.login }}</dd></div>
            <div v-if="dados.email"><dt>E-mail</dt><dd>{{ dados.email }}</dd></div>
            <div><dt>Crachá RFID</dt><dd>{{ dados.temCartao ? 'Cadastrado' : 'Sem crachá' }}</dd></div>
            <div v-if="dados.ultimoLogin"><dt>Último acesso</dt><dd>{{ dataHora(dados.ultimoLogin) }}</dd></div>
          </dl>
        </section>

        <!-- SENHA -->
        <section class="pf2-card">
          <h2>Senha</h2>
          <p class="pf2-sub">{{ dados.temSenha ? 'Use pelo menos 6 caracteres.' : 'Seu usuário entra sem senha. Peça ao administrador para cadastrar uma.' }}</p>
          <form v-if="dados.temSenha" class="pf2-form" @submit.prevent="trocarSenha">
            <label>Senha atual<input v-model="senha.atual" type="password" autocomplete="current-password" required></label>
            <label>Nova senha<input v-model="senha.nova" type="password" autocomplete="new-password" minlength="6" required></label>
            <label>Repita a nova senha<input v-model="senha.repete" type="password" autocomplete="new-password" minlength="6" required></label>
            <div class="pf2-acoes"><button class="pf2-btn pri" :disabled="salvando === 'senha'">{{ salvando === 'senha' ? 'Salvando…' : 'Trocar senha' }}</button></div>
          </form>
        </section>

        <!-- PIN -->
        <section v-if="dados.temSenha" class="pf2-card">
          <h2>PIN do celular</h2>
          <p class="pf2-sub">{{ dados.temPin ? 'Você já tem um PIN. Ele confirma ações no celular, no lugar do crachá.' : 'Cadastre um PIN de 4 a 6 números para confirmar ações no celular, no lugar do crachá.' }}</p>
          <form class="pf2-form" @submit.prevent="salvarPin(false)">
            <label>Senha atual<input v-model="pin.senha" type="password" autocomplete="current-password" required></label>
            <label>{{ dados.temPin ? 'Novo PIN' : 'PIN' }}<input v-model="pin.valor" inputmode="numeric" pattern="\d{4,6}" maxlength="6" autocomplete="off" required></label>
            <div class="pf2-acoes">
              <button v-if="dados.temPin" type="button" class="pf2-btn" :disabled="salvando === 'pin'" @click="salvarPin(true)">Remover PIN</button>
              <button class="pf2-btn pri" :disabled="salvando === 'pin'">{{ salvando === 'pin' ? 'Salvando…' : dados.temPin ? 'Trocar PIN' : 'Cadastrar PIN' }}</button>
            </div>
          </form>
        </section>

        <!-- FACE ID / DIGITAL -->
        <section v-if="dados.biometrias.length" class="pf2-card">
          <h2>Face ID e digital</h2>
          <p class="pf2-sub">Aparelhos onde você confirma ações com o rosto ou a digital.</p>
          <ul class="pf2-lista">
            <li v-for="b in dados.biometrias" :key="b.id">
              <div><b>{{ b.aparelho || 'Celular' }}</b><small>Ativado em {{ data(b.createdAt) }}<template v-if="b.usadoEm"> · usado em {{ data(b.usadoEm) }}</template></small></div>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/services/api'
import { useToastStore } from '~/stores/toast'

interface Perfil {
  nome: string; login: string | null; email: string | null; codigoAcesso: string; restaurante: string
  cargo: string; funcao: string | null; ultimoLogin: string | null
  temSenha: boolean; temPin: boolean; temCartao: boolean
  biometrias: { id: string; aparelho: string | null; createdAt: string; usadoEm: string | null }[]
}

const authStore = useAuthStore()
const api = useApi()
const toast = useToastStore()

const dados = ref<Perfil | null>(null)
const carregando = ref(true)
const erro = ref('')
const salvando = ref<'' | 'senha' | 'pin'>('')
const senha = ref({ atual: '', nova: '', repete: '' })
const pin = ref({ senha: '', valor: '' })

const CARGOS: Record<string, string> = { administrador: 'Administrador', garcom: 'Garçom', caixa: 'Caixa', cozinha: 'Cozinha', entregador: 'Entregador' }
const cargoRotulo = computed(() => { const c = dados.value?.cargo ?? authStore.usuario?.cargo ?? ''; return CARGOS[c] ?? c })
const inicial = computed(() => ((dados.value?.nome ?? authStore.usuario?.nome ?? 'U').trim()[0] ?? 'U').toUpperCase())
const data = (d: string) => new Date(d).toLocaleDateString('pt-BR')
const dataHora = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

async function carregar() {
  try { dados.value = await api.get<Perfil>('/perfil') }
  catch (e: any) { erro.value = e?.message || 'Não deu para carregar o seu perfil' }
  finally { carregando.value = false }
}

async function trocarSenha() {
  if (senha.value.nova !== senha.value.repete) return toast.error('As duas senhas novas não são iguais')
  salvando.value = 'senha'
  try {
    await api.post('/perfil/senha', { senhaAtual: senha.value.atual, novaSenha: senha.value.nova })
    senha.value = { atual: '', nova: '', repete: '' }
    toast.success('Senha trocada')
  } catch (e: any) { toast.error(e?.message || 'Não deu para trocar a senha') }
  finally { salvando.value = '' }
}

async function salvarPin(remover: boolean) {
  if (remover && !pin.value.senha) return toast.error('Digite a sua senha atual para remover o PIN')
  salvando.value = 'pin'
  try {
    await api.post('/perfil/pin', { senhaAtual: pin.value.senha, pin: remover ? '' : pin.value.valor })
    pin.value = { senha: '', valor: '' }
    if (dados.value) dados.value.temPin = !remover
    toast.success(remover ? 'PIN removido' : 'PIN salvo')
  } catch (e: any) { toast.error(e?.message || 'Não deu para salvar o PIN') }
  finally { salvando.value = '' }
}

onMounted(carregar)
</script>

<style scoped>
.pf2{padding:28px clamp(16px,2.5vw,32px) 48px;max-width:760px;display:flex;flex-direction:column;gap:16px}
.mono{font-family:var(--fonte-numero)}
.pf2-topo{display:flex;align-items:center;gap:16px;margin-bottom:4px}
.pf2-av{width:56px;height:56px;flex:none;border-radius:50%;background:var(--acao);color:#0E1119;display:grid;place-items:center;font-weight:800;font-size:22px}
.pf2-topo h1{font-size:clamp(24px,2.4vw,30px);font-weight:800;letter-spacing:-.03em;color:var(--txt)}
.pf2-topo p{margin:2px 0 0;font-size:14px;color:var(--txt-2)}
.pf2-card{background:var(--sup-cartao);border:1px solid var(--linha);border-radius:16px;padding:20px 22px}
.pf2-card h2{font-size:15px;font-weight:700;color:var(--txt)}
.pf2-sub{margin:2px 0 16px;font-size:13px;color:var(--txt-3)}
.pf2-sk{height:220px;animation:pulse 1.5s ease-in-out infinite}
.pf2-erro{color:var(--st-atencao)}
.pf2-dados{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px 24px;margin:0}
.pf2-dados dt{font-size:12px;color:var(--txt-3)}
.pf2-dados dd{margin:2px 0 0;font-size:15px;font-weight:600;color:var(--txt);word-break:break-word}
.pf2-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.pf2-form label{display:grid;gap:6px;font-size:13px;font-weight:600;color:var(--txt-2)}
.pf2-form input{height:46px;padding:0 12px;border-radius:var(--r-controle);border:1px solid var(--linha-forte, var(--linha));background:var(--sup-fundo);color:var(--txt);font:500 15px var(--fonte-texto)}
.pf2-form input:focus{outline:none;border-color:var(--acao);box-shadow:0 0 0 3px var(--acao-fraca)}
.pf2-acoes{grid-column:1/-1;display:flex;justify-content:flex-end;gap:8px}
.pf2-btn{height:42px;padding:0 18px;border-radius:var(--r-controle);border:1px solid var(--linha);font-weight:700;font-size:14px;color:var(--txt)}
.pf2-btn:hover{background:var(--sup-elevado)}
.pf2-btn.pri{background:var(--acao);border-color:var(--acao);color:#0E1119}
.pf2-btn.pri:hover{background:var(--acao-hover)}
.pf2-btn[disabled]{opacity:.6}
.pf2-lista{list-style:none;margin:0;padding:0}
.pf2-lista li{padding:10px 0;border-top:1px solid var(--linha)}
.pf2-lista li:first-child{border-top:0;padding-top:0}
.pf2-lista b{display:block;font-size:14px;color:var(--txt)}
.pf2-lista small{font-size:12px;color:var(--txt-3)}
</style>
