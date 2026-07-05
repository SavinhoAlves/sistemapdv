<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col transition-colors duration-200 com-sidebar">

    <!-- SIDEBAR + NAVBAR GLOBAIS -->
    <Sidebar />
    <Navbar />

    <!-- CONTEÚDO DAS PÁGINAS -->
    <main class="flex-1 overflow-auto">
      <slot />
    </main>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from './Navbar.vue'
import Sidebar from '~/components/Sidebar.vue'

const router = useRouter()

const modalRfidAberto = ref(false)
const rotaDestinoTemporaria = ref('')

const handleRfidSuccess = async (rfidBuffer: string) => {
  try {
    const config = useRuntimeConfig()

    const resposta = await $fetch<any>(
      `${config.public.apiUrl}/api/auth/rfid`,
      {
        method: 'POST',
        body: {
          rfid: rfidBuffer
        }
      }
    )

    if (resposta?.usuario) {
      modalRfidAberto.value = false

      if (rotaDestinoTemporaria.value) {
        router.push(rotaDestinoTemporaria.value)
      }
    }
  } catch (error) {
    console.error('Falha na validação do RFID:', error)
  }
}
</script>