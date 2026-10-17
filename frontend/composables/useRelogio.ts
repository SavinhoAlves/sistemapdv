import { ref, computed, onMounted, onUnmounted } from 'vue'

/** Relógio ao vivo + saudação por período — usado nas telas de acesso. */
export function useRelogio() {
  const agora = ref(new Date())
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => { timer = setInterval(() => { agora.value = new Date() }, 15000) })
  onUnmounted(() => { if (timer) clearInterval(timer) })

  const hora = computed(() =>
    agora.value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  )
  const data = computed(() =>
    agora.value.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
  )
  const saudacao = computed(() => {
    const h = agora.value.getHours()
    if (h < 5)  return 'Boa noite'
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  })

  return { hora, data, saudacao }
}
