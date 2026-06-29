<template>
  <div class="min-h-screen bg-[#FFFDF2] flex flex-col items-center justify-center p-6 text-center">
    <div class="w-full max-w-sm bg-white rounded-[32px] shadow-2xl border border-[#F2EBBF] p-8 space-y-4">
      
      <!-- Animação simples de carregamento -->
      <div class="w-12 h-12 border-4 border-[#FF7A00] border-t-transparent rounded-full animate-spin mx-auto"></div>
      
      <h1 class="text-xl font-black text-[#1A1A1A] uppercase tracking-tight">
        Saindo do Sistema...
      </h1>
      
      <p class="text-gray-400 text-xs font-medium">
        Limpando suas credenciais e encerrando a sessão com segurança.
      </p>

    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { navigateTo } from 'nuxt/app'
import { useAuthStore } from '../stores/auth'

definePageMeta({ layout: false })

const authStore = useAuthStore()

onMounted(() => {
  // Executa um pequeno delay apenas para o usuário ver o feedback visual de "Saindo..."
  setTimeout(() => {
    // 1. Limpa o Pinia (token, usuario, caixaAtivo)
    // 2. Remove os itens do LocalStorage ('auth_token', 'auth_user')
    // 3. Redireciona automaticamente para '/login'
    authStore.logout()
  }, 1000)
})
</script>