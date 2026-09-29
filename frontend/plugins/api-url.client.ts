// Ajusta apiUrl/socketUrl dinamicamente para o host que o navegador usou.
// Evita quebrar quando o IP da máquina muda (DHCP): quem acessa por
// localhost usa localhost, quem acessa pela rede usa o IP da barra de endereço.
// A porta continua vindo do .env (NUXT_PUBLIC_API_URL), padrão 3002.
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const host = window.location.hostname
  // Mesmo protocolo da página (https quando o certificado local mkcert está
  // configurado) — câmera do celular (crachá QR) exige contexto seguro
  const protocolo = window.location.protocol
  const porta = (url: string) => {
    try { return new URL(url).port || '3002' } catch { return '3002' }
  }
  config.public.apiUrl = `${protocolo}//${host}:${porta(config.public.apiUrl as string)}`
  config.public.socketUrl = `${protocolo}//${host}:${porta(config.public.socketUrl as string)}`
})
