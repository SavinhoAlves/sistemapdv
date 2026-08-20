import { watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useSocket } from '~/services/socket'

// Conexão do socket vive aqui, não em cada página. Antes cada página
// (mesas, dashboard, caixa, vendas) chamava connect()/disconnect() no
// próprio mount/unmount; navegando rápido entre elas, múltiplos ciclos de
// conectar/desconectar disparavam quase ao mesmo tempo e o Transition de
// página do Nuxt não lidava bem com isso (loop de atualização, RangeError
// "Maximum call stack size exceeded"). Conectando uma vez por sessão
// autenticada — e só isso — elimina essa classe de bug: as páginas agora
// só registram/removem listeners de evento, nunca mexem na conexão.
export default defineNuxtPlugin(() => {
  const authStore = useAuthStore()
  const socket = useSocket()

  if (authStore.token) socket.connect()

  watch(() => authStore.token, (token, tokenAnterior) => {
    if (!token) {
      socket.disconnect()
    } else if (tokenAnterior && token !== tokenAnterior) {
      // Token trocou (ex: login RFID) — reconecta com as novas credenciais
      socket.disconnect()
      socket.connect()
    } else {
      socket.connect()
    }
  })
})
