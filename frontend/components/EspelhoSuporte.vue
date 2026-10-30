<template>
  <!-- Espelho ao vivo: o suporte pede para ver esta tela; só grava depois do "Permitir" -->
  <div v-if="pedido" class="esp-fundo" role="dialog" aria-modal="true" aria-labelledby="esp-titulo">
    <div class="esp-caixa">
      <span class="esp-ic"><MonitorUp :size="22" /></span>
      <h2 id="esp-titulo">O suporte quer ver sua tela</h2>
      <p>
        <b>{{ pedido.suporte }}</b>, do suporte RestaurantePDV, pede para acompanhar ao vivo o que aparece nesta tela.
        Senhas não são mostradas e você pode encerrar a qualquer momento.
      </p>
      <div class="esp-acoes">
        <button type="button" class="esp-sec" @click="responder(false)">Recusar</button>
        <button ref="permitirRef" type="button" class="esp-pri" @click="responder(true)">Permitir</button>
      </div>
    </div>
  </div>

  <div v-if="sessao" class="esp-faixa" role="status">
    <span class="esp-ponto" aria-hidden="true" />
    <span>Sua tela está sendo vista pelo suporte</span>
    <button type="button" @click="parar(true)">Encerrar</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { MonitorUp } from 'lucide-vue-next'
import { record } from 'rrweb'
import type { Socket } from 'socket.io-client'
import { EVENTOS } from '~/shared/eventos'
import { useSocket } from '~/services/socket'
import { useAuthStore } from '~/stores/auth'
import { useToastStore } from '~/stores/toast'

const E = EVENTOS.espelho
const auth = useAuthStore()
const toast = useToastStore()
const { getSocket } = useSocket()
const router = useRouter()

const pedido = ref<{ sessao: string; suporte: string } | null>(null)
const sessao = ref<string | null>(null)
const permitirRef = ref<HTMLButtonElement>()

let pararGravacao: (() => void) | undefined
let pararRota: (() => void) | undefined
let fila: unknown[] = []
let envio: ReturnType<typeof setInterval> | null = null

function aoPedido(d: { sessao: string; suporte: string }) {
  // A própria sessão de suporte (aba aberta pela Central) não é espelhada
  if (!auth.token || auth.modoSuporte || sessao.value) return
  pedido.value = d
  nextTick(() => permitirRef.value?.focus())
}
function aoAtendido(d: { sessao: string }) {
  if (pedido.value?.sessao === d.sessao) pedido.value = null
}
function aoEncerrado(d: { sessao: string; motivo?: string }) {
  aoAtendido(d)
  if (sessao.value !== d.sessao) return
  parar(false)
  toast.info('Suporte encerrado', d.motivo)
}
function aoQuadroCompleto(d: { sessao: string }) {
  if (sessao.value === d.sessao) record.takeFullSnapshot(true)
}

// O socket pode ser recriado (troca de token): reata os ouvintes no novo
let ligado: Socket | null = null
function ligar() {
  const s = getSocket()
  if (!s || s === ligado) return
  ligado?.off(E.pedido, aoPedido).off(E.atendido, aoAtendido).off(E.encerrado, aoEncerrado).off(E.quadroCompleto, aoQuadroCompleto)
  ligado = s
  s.on(E.pedido, aoPedido).on(E.atendido, aoAtendido).on(E.encerrado, aoEncerrado).on(E.quadroCompleto, aoQuadroCompleto)
}

function responder(aceitar: boolean) {
  const p = pedido.value
  pedido.value = null
  if (!p) return
  getSocket()?.emit(E.responder, { sessao: p.sessao, aceitar, tela: location.pathname })
  if (aceitar) iniciar(p.sessao)
}

function iniciar(id: string) {
  sessao.value = id
  fila = []
  pararGravacao = record({
    emit: (ev) => { fila.push(ev) },
    maskInputOptions: { password: true },
    // Sem `input: 'last'`: com ele o rrweb só grava ao sair do campo (change)
    sampling: { mousemove: 50, scroll: 150 },
  })
  // Navegação dentro do sistema não gera nova tela inteira: avisa a rota
  pararRota = router.afterEach((to) => record.addCustomEvent('rota', { caminho: to.fullPath }))
  envio = setInterval(enviar, 250)
}

function enviar() {
  if (!sessao.value || !fila.length) return
  const eventos = fila
  fila = []
  getSocket()?.emit(E.gravacao, { sessao: sessao.value, eventos })
}

function parar(avisar: boolean) {
  pararGravacao?.()
  pararGravacao = undefined
  pararRota?.()
  pararRota = undefined
  if (envio) { clearInterval(envio); envio = null }
  fila = []
  if (avisar && sessao.value) getSocket()?.emit(E.encerrar, { sessao: sessao.value })
  sessao.value = null
}

// Saiu do sistema: nada fica gravando
watch(() => auth.token, (t) => { if (!t) { pedido.value = null; if (sessao.value) parar(false) } })

let relogio: ReturnType<typeof setInterval> | null = null
onMounted(() => { ligar(); relogio = setInterval(ligar, 2000) })
onUnmounted(() => { if (relogio) clearInterval(relogio); parar(true) })
</script>

<style scoped>
.esp-fundo { position: fixed; inset: 0; z-index: 10001; display: grid; place-items: center; padding: 16px; background: rgba(0, 0, 0, .55); }
.esp-caixa { width: min(420px, 100%); background: var(--sup-painel); color: var(--txt); border: 1px solid var(--linha); border-radius: 20px; padding: 24px; box-shadow: 0 30px 80px rgba(0, 0, 0, .35); }
.esp-ic { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--acao-fraca); color: var(--acao); margin-bottom: 14px; }
.esp-caixa h2 { margin: 0 0 8px; font-size: 20px; font-weight: 800; letter-spacing: -.02em; }
.esp-caixa p { margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: var(--txt-2); }
.esp-caixa b { color: var(--txt); }
.esp-acoes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.esp-acoes button { min-height: 46px; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; }
.esp-sec { background: transparent; border: 1px solid var(--linha); color: var(--txt); }
.esp-sec:hover { background: var(--sup-elevado); }
.esp-pri { background: var(--acao); border: 0; color: var(--acao-txt); }
.esp-pri:hover { background: var(--acao-hover); }
.esp-faixa { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 10001; display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 14px; border-radius: 999px; background: #B42318; color: #fff; font-size: 13px; font-weight: 700; box-shadow: 0 10px 30px rgba(0, 0, 0, .3); max-width: calc(100% - 32px); }
.esp-faixa button { min-height: 32px; padding: 0 12px; border-radius: 999px; border: 0; background: rgba(255, 255, 255, .2); color: #fff; font-weight: 800; cursor: pointer; }
.esp-faixa button:hover { background: rgba(255, 255, 255, .32); }
.esp-ponto { width: 8px; height: 8px; border-radius: 50%; background: #fff; animation: esp-pulso 1.2s ease-in-out infinite; flex: none; }
@keyframes esp-pulso { 50% { opacity: .3 } }
@media (prefers-reduced-motion: reduce) { .esp-ponto { animation: none } }
</style>
