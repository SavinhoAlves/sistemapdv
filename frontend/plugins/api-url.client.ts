// Ajusta apiUrl/socketUrl dinamicamente para o host que o navegador usou.
// Evita quebrar quando o IP da máquina muda (DHCP): quem acessa por
// localhost usa localhost, quem acessa pela rede usa o IP da barra de endereço.
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const host = window.location.hostname
  // Mesmo protocolo da página (https quando o certificado local mkcert está
  // configurado) — câmera do celular (crachá QR) exige contexto seguro
  const protocolo = window.location.protocol
  config.public.apiUrl = `${protocolo}//${host}:3001`
  config.public.socketUrl = `${protocolo}//${host}:3001`
})
