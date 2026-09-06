import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useSocket } from '~/services/socket'
import { EVENTOS } from '~/shared/eventos'

/**
 * Assinatura de eventos de tempo real.
 *
 * Três problemas que isto resolve:
 *
 * 1. `services/socket.ts` fazia `socket?.on(event, handler)`. Se a página
 *    montasse antes de `connect()` resolver, `socket` era null, o listener
 *    não era registrado e não havia retry. Falha silenciosa.
 *
 * 2. `cozinha.vue` chamava `socket.disconnect()` no onUnmounted. Como a
 *    instância é global, sair da tela da cozinha derrubava a conexão de toda
 *    a aplicação — inclusive do salão aberto em outro tablet do mesmo login.
 *    Aqui nenhuma página encosta na conexão; só registra e remove listeners.
 *
 * 3. O polling era a fonte primária (15–30s em seis telas). Aqui ele vira
 *    rede de segurança em 120s, e só roda quando o socket está desconectado.
 */

type Handler = (payload: any) => void

interface Opcoes {
  /** Recarga completa. Roda na reconexão e no fallback. */
  recarregar: () => void | Promise<void>
  /** Intervalo do fallback em ms. Só dispara com o socket caído. */
  fallbackMs?: number
}

export function useRealtime(assinaturas: Record<string, Handler>, opcoes: Opcoes) {
  const socket = useSocket()
  const conectado = ref(false)

  const remover: Array<() => void> = []
  let timer: ReturnType<typeof setInterval> | null = null
  let tentativaRegistro: ReturnType<typeof setTimeout> | null = null

  function registrar() {
    const s = socket.getSocket()
    if (!s) {
      // O plugin ainda não conectou. Tenta de novo em vez de desistir calado.
      tentativaRegistro = setTimeout(registrar, 250)
      return
    }

    for (const [evento, handler] of Object.entries(assinaturas)) {
      s.on(evento, handler)
      remover.push(() => s.off(evento, handler))
    }

    const onConectar = () => {
      conectado.value = true
      // Reconectou: o que passou enquanto estava fora não chega por evento.
      opcoes.recarregar()
    }
    const onDesconectar = () => { conectado.value = false }

    s.on('connect', onConectar)
    s.on('disconnect', onDesconectar)
    remover.push(() => { s.off('connect', onConectar); s.off('disconnect', onDesconectar) })

    conectado.value = s.connected
  }

  onMounted(() => {
    registrar()

    const intervalo = opcoes.fallbackMs ?? 120_000
    timer = setInterval(() => {
      // Só busca quando o tempo real não está entregando e a aba está visível.
      if (!conectado.value && !document.hidden) opcoes.recarregar()
    }, intervalo)

    // Voltar para a aba é o momento mais provável de estar desatualizado.
    document.addEventListener('visibilitychange', aoVoltar)
  })

  function aoVoltar() {
    if (!document.hidden) opcoes.recarregar()
  }

  onBeforeUnmount(() => {
    if (tentativaRegistro) clearTimeout(tentativaRegistro)
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', aoVoltar)
    remover.forEach((fn) => fn())
    // NÃO chama socket.disconnect(). A conexão pertence ao plugin.
  })

  return { conectado }
}

/**
 * Assinatura pronta para a tela de salão. Aplica o payload do evento
 * diretamente na comanda correspondente, sem refetch — os payloads agora
 * carregam os totais em centavos justamente para isso.
 */
export function useRealtimeSalao(
  comandas: { value: any[] },
  recarregar: () => void | Promise<void>,
) {
  function aplicar(payload: any) {
    const i = comandas.value.findIndex((c) => c.id === payload.comandaId)
    if (i === -1) return recarregar()
    comandas.value[i] = {
      ...comandas.value[i],
      total: payload.totalCentavos / 100,
      pago: payload.pagoCentavos / 100,
      restante: payload.restanteCentavos / 100,
      qtd_itens: payload.qtdItens,
      qtd_prontos: payload.qtdProntos,
      status: payload.status,
    }
  }

  return useRealtime(
    {
      [EVENTOS.comanda.aberta]: () => recarregar(),
      [EVENTOS.comanda.atualizada]: aplicar,
      [EVENTOS.comanda.fechada]: (p) => {
        comandas.value = comandas.value.filter((c) => c.id !== p.comandaId)
      },
      [EVENTOS.item.lancado]: () => recarregar(),
      [EVENTOS.item.removido]: () => recarregar(),
      [EVENTOS.item.statusAlterado]: () => recarregar(),
      [EVENTOS.pagamento.registrado]: () => recarregar(),
      [EVENTOS.pagamento.estornado]: () => recarregar(),
    },
    { recarregar },
  )
}
