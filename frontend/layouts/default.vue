<template>
  <div class="min-h-screen flex flex-col transition-colors duration-200 com-sidebar">

    <!-- SIDEBAR + NAVBAR GLOBAIS -->
    <Sidebar />
    <Navbar />

    <!-- CONTEÚDO DAS PÁGINAS -->
    <main class="flex-1 overflow-auto relative">
      <!-- Mensalidade vencida (tolerância) ou teste acabando -->
      <AvisoLicenca />
      <slot />
    </main>

  </div>
</template>

<script setup lang="ts">
// O bloqueio de caixa fechado fica nas páginas que operam com caixa
// (components/CaixaFechado.vue), não aqui: a inicial só mostra números.
import Navbar from './Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'
</script>
