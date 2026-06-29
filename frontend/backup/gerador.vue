<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

const SEGREDO_MESTRE =
  import.meta.env.VITE_JWT_SECRET

const API_URL =
  import.meta.env.VITE_API_URL

const activeMode =
  ref<'gerar' | 'ativar'>('gerar')

const nomeCliente = ref('')
const diasValidade = ref(30)
const diasPersonalizados = ref(1)

const keyGerada = ref('')
const keyParaAtivar = ref('')

const copiado = ref(false)
const carregandoAtivacao = ref(false)

onMounted(() => {
  authStore.restoreSession()
})

const isMaster = computed(() => {
  if (authStore.usuario?.id === 5) {
    return true
  }

  if (process.client) {
    const saved =
      localStorage.getItem('auth_user')

    if (saved) {
      try {
        const user = JSON.parse(saved)

        return (
          user.id === 5 ||
          user.cargo === 'administrador'
        )

      } catch {
        return false
      }
    }
  }

  return false
})

const gerarChaveMestre = () => {
  if (!nomeCliente.value) {
    return alert('Digite o nome do cliente')
  }

  const diasFinais =
    diasValidade.value === 0
      ? diasPersonalizados.value
      : diasValidade.value

  const dados = {
    c: nomeCliente.value,
    d: diasFinais,
    s: SEGREDO_MESTRE
  }

  const chave = btoa(
    unescape(
      encodeURIComponent(
        JSON.stringify(dados)
      )
    )
  )

  keyGerada.value = chave

  copiado.value = false
}

const processarAtivacaoNoBanco = async () => {
  if (!keyParaAtivar.value) {
    return alert('Cole uma chave válida')
  }

  carregandoAtivacao.value = true

  try {
    const res = await $fetch<any>(
      `${API_URL}/api/sistema/ativar`,
      {
        method: 'POST',
        body: {
          chave: keyParaAtivar.value
        }
      }
    )

    if (res.success) {
      alert('Sistema ativado com sucesso!')
    } else {
      alert(res.message)
    }

  } catch (e: any) {
    console.error(e)

    alert(
      e?.data?.message ||
      'Erro ao conectar ao backend'
    )

  } finally {
    carregandoAtivacao.value = false
  }
}

const copiarKey = () => {
  navigator.clipboard.writeText(
    keyGerada.value
  )

  copiado.value = true

  setTimeout(() => {
    copiado.value = false
  }, 2000)
}
</script>

<template>
  <div class="min-h-screen bg-[#0F172A] flex items-center justify-center p-6">
    
    <div v-if="!isMaster" class="text-center text-white">
      <h1 class="text-2xl font-bold">Acesso Negado</h1>
      <p class="text-slate-400">Esta ferramenta é exclusiva para o desenvolvedor Master.</p>
      <NuxtLink to="/" class="mt-4 inline-block text-blue-400 underline">Voltar ao Início</NuxtLink>
    </div>

    <div v-else class="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl transition-all">
      
      <div class="flex p-1 bg-slate-100 rounded-2xl mb-8">
        <button 
          @click="activeMode = 'gerar'"
          :class="activeMode === 'gerar' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'"
          class="flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all"
        >
          1. Gerar Key
        </button>
        <button 
          @click="activeMode = 'ativar'"
          :class="activeMode === 'ativar' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'"
          class="flex-1 py-3 rounded-xl text-xs font-black uppercase transition-all"
        >
          2. Ativar Banco
        </button>
      </div>

      <div v-if="activeMode === 'gerar'" class="space-y-4 animate-fade-in">
        <div class="text-center mb-6">
          <h2 class="text-xl font-black text-slate-800 uppercase">Criar Licença</h2>
        </div>

        <div>
          <label for="nomeCliente" class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-2">Nome do Cliente</label>
          <input 
            id="nomeCliente"
            v-model="nomeCliente" 
            type="text" 
            placeholder="Ex: Restaurante do João"
            class="w-full p-4 bg-slate-100 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-medium transition-all" 
          />
        </div>

        <div>
          <label for="diasValidade" class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-2">Dias de Validade</label>
          <select 
            id="diasValidade"
            v-model="diasValidade" 
            class="w-full p-4 bg-slate-100 rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-medium transition-all appearance-none"
          >
            <option :value="7">7 Dias (Teste)</option>
            <option :value="30">30 Dias (Mensal)</option>
            <option :value="365">365 Dias (Anual)</option>
            <option :value="9999">Vitalícia</option>
            <option :value="0">Personalizado...</option>
          </select>
        </div>

        <div v-if="diasValidade === 0" class="animate-bounce-in">
          <label for="diasPersonalizados" class="block text-xs font-bold text-blue-500 uppercase mb-2 ml-2">Quantidade de Dias</label>
          <input 
            id="diasPersonalizados"
            v-model="diasPersonalizados" 
            type="number" 
            min="1" 
            class="w-full p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl outline-none font-bold text-blue-600 transition-all" 
          />
        </div>

        <button @click="gerarChaveMestre" class="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100">
          Gerar Chave
        </button>

        <div v-if="keyGerada" class="mt-6 p-6 bg-slate-900 rounded-3xl animate-fade-in">
          <div class="text-blue-400 font-mono text-[10px] break-all mb-4 text-center">{{ keyGerada }}</div>
          <button @click="copiarKey" class="w-full py-3 rounded-xl font-bold text-xs uppercase transition-all" :class="copiado ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-300'">
            {{ copiado ? '✓ COPIADO' : 'COPIAR KEY' }}
          </button>
        </div>
      </div>

      <div v-else class="space-y-4 animate-fade-in">
        <div class="text-center mb-6">
          <h2 class="text-xl font-black text-slate-800 uppercase">Gravar no MySQL</h2>
          <p class="text-[10px] text-slate-400 font-bold uppercase mt-1">Insere os dados na tabela pdv_config</p>
        </div>

        <div>
          <label for="keyParaAtivar" class="block text-xs font-bold text-slate-400 uppercase mb-2 ml-2">Cole a Key Gerada</label>
          <textarea 
            id="keyParaAtivar"
            v-model="keyParaAtivar" 
            placeholder="Cole a sopa de letras aqui..."
            class="w-full h-32 p-4 bg-slate-100 rounded-2xl border-2 border-transparent focus:border-green-500 outline-none font-mono text-xs transition-all resize-none"
          ></textarea>
        </div>

        <button 
          @click="processarAtivacaoNoBanco" 
          :disabled="carregandoAtivacao"
          class="w-full bg-green-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-green-700 shadow-lg shadow-green-100 disabled:opacity-50"
        >
          {{ carregandoAtivacao ? 'GRAVANDO NO BANCO...' : 'ATIVAR SISTEMA AGORA' }}
        </button>
      </div>

    </div>
  </div>
</template>