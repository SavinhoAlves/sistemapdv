<template>
  <div />
</template>

<script setup lang="ts">
// O login da plataforma agora fica no login único, na opção "Plataforma".
// Este endereço continua existindo para links antigos e para o "Sair" da Central.
definePageMeta({ layout: false })
navigateTo({ path: '/login', query: { acesso: 'plataforma' } }, { replace: true })
</script>
