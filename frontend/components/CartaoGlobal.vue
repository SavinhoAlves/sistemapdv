<template>
  <!-- Cartão pedido pela API quando o servidor exige (ver lib/operador.ts) -->
  <ModalRfidAuth
    v-model="modalAberto"
    :mensagem="mensagemModal"
    :erro="erroModal"
    :carregando-rfid="carregandoRfid"
    @auth-success="onRfidSuccess"
  />
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import ModalRfidAuth from '~/components/modals/ModalRfidAuth.vue'
import { useRfidIdentify } from '~/composables/useRfidIdentify'
import { registrarPedidoDeCartao } from '~/lib/operador'

const { modalAberto, mensagemModal, erroModal, carregandoRfid, identificarViaRfid, onRfidSuccess } = useRfidIdentify()

onMounted(() => registrarPedidoDeCartao(mensagem => identificarViaRfid(mensagem)))
onBeforeUnmount(() => registrarPedidoDeCartao(null))
</script>
