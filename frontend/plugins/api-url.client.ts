// Ajusta apiUrl/socketUrl dinamicamente para o host que o navegador usou.
// Evita quebrar quando o IP da máquina muda (DHCP): quem acessa por
// localhost usa localhost, quem acessa pela rede usa o IP da barra de endereço.
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const host = window.location.hostname
  config.public.apiUrl = `http://${host}:3001`
  config.public.socketUrl = `http://${host}:3001`
})
