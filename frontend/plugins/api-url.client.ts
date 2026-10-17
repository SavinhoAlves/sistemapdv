// Ajusta apiUrl/socketUrl dinamicamente para o host que o navegador usou.
// Evita quebrar quando o IP da máquina muda (DHCP): quem acessa por
// localhost usa localhost, quem acessa pela rede usa o IP da barra de endereço.
// A porta continua vindo do .env (NUXT_PUBLIC_API_URL), padrão 3002.
// Em produção (NUXT_PUBLIC_API_URL sem porta) usa a mesma origem da página.
import { urlNaOrigemAtual } from '~/services/url'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  config.public.apiUrl = urlNaOrigemAtual(config.public.apiUrl as string)
  config.public.socketUrl = urlNaOrigemAtual(config.public.socketUrl as string)
})
