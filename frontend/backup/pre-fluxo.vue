<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const solicitarRFID = ref(false)
const rfidInput = ref('')
const rfidInputField = ref<HTMLInputElement | null>(null)

/**
 * Realiza o logout do sistema.
 */
const handleLogout = () => {
  if (confirm('Deseja realmente sair do sistema?')) {
    console.log(`[AUTH] Usuário ${authStore.usuario?.nome} realizou logout.`);
    authStore.logout()
  }
}

/**
 * Redireciona para a index sem alterar o estado do caixa.
 */
const irParaIndex = () => {
  console.log(`[NAVEGAÇÃO] Usuário ${authStore.usuario?.nome} optou por apenas navegar sem abrir caixa.`);
  navigateTo('/')
}

/**
 * Ativa o modo de leitura e garante o foco no input invisível.
 */
const ativarLeituraRFID = async () => {
  console.log('[SISTEMA] Solicitando validação RFID para abertura de caixa.');
  solicitarRFID.value = true
  await nextTick()
  rfidInputField.value?.focus()
}

/**
 * Valida o cartão aproximado contra o registro do usuário logado.
 */
const validarRFID = async () => {
  console.log('[RFID] Processando leitura de cartão...');
  
  // O objeto de usuário contém o campo cartao_rfid para comparação
  if (rfidInput.value === authStore.usuario?.cartao_rfid) {
    console.log('[RFID] Validação bem-sucedida. Iniciando abertura de caixa no servidor.');
    
    // Abre o caixa com valor 0
    const sucesso = await authStore.abrirCaixa(0)
    
    if (sucesso) {
      console.log('[CAIXA] Caixa aberto com sucesso. Redirecionando para PDV.');
      irParaIndex()
    } else {
      console.error('[CAIXA] Erro ao comunicar abertura de caixa com o servidor.');
    }
  } else {
    console.warn(`[RFID] Tentativa de acesso negada para usuário ${authStore.usuario?.id}.`);
    alert('Acesso negado: Cartão RFID não confere.')
    rfidInput.value = ''
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
    <div class="bg-white p-8 rounded-[32px] shadow-2xl max-w-md w-full text-center">
      <h2 class="text-xl font-black mb-1 uppercase tracking-tight text-[#1A1A1A]">
        Olá, {{ authStore.usuario?.nome?.split(' ')[0] }}
      </h2>
      <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-8">
        Configuração de Turno
      </p>

      <div class="grid grid-cols-2 gap-4">
        <button 
          @click="ativarLeituraRFID"
          class="flex flex-col items-center justify-center aspect-square p-4 border-2 rounded-3xl transition-all active:scale-95"
          :class="solicitarRFID 
            ? 'border-blue-500 bg-blue-50 text-blue-600' 
            : 'border-orange-50 bg-orange-50/30 text-orange-500 hover:border-orange-200'"
        >
          <span class="text-3xl mb-2">🔓</span>
          <span class="text-[10px] font-black uppercase leading-tight">Abrir<br/>Caixa</span>
        </button>

        <button 
          @click="irParaIndex"
          class="flex flex-col items-center justify-center aspect-square p-4 border-2 border-gray-50 bg-gray-50/50 rounded-3xl hover:border-gray-200 transition-all active:scale-95 text-gray-400"
        >
          <span class="text-3xl mb-2">🧭</span>
          <span class="text-[10px] font-black uppercase leading-tight">Apenas<br/>Navegar</span>
        </button>
      </div>

      <div v-if="solicitarRFID" class="mt-6">
        <div class="p-4 bg-blue-600 rounded-2xl animate-pulse">
          <p class="text-[10px] font-black text-white uppercase tracking-tighter">
            Aproxime o cartão agora
          </p>
        </div>
        <input 
          ref="rfidInputField"
          v-model="rfidInput" 
          @keyup.enter="validarRFID" 
          type="password" 
          class="opacity-0 h-0 w-0 absolute"
        />
        <button @click="solicitarRFID = false" class="mt-4 text-[9px] font-bold text-gray-400 uppercase hover:underline">
          Cancelar
        </button>
      </div>

      <div class="mt-10 pt-6 border-t border-gray-50">
        <button 
          @click="handleLogout"
          class="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
        >
          Encerrar Sessão
        </button>
      </div>
    </div>
  </div>
</template>