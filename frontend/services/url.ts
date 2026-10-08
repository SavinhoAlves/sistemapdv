// Monta a URL da API/socket no host que o navegador usou.
// Com porta (LAN, ex.: http://localhost:3002) → mesmo host, aquela porta.
// Sem porta (produção, ex.: https://app.dominio.com.br) → mesma origem da
// página, pois a API fica atrás do Nginx em /api e /socket.io.
export function urlNaOrigemAtual(configurada: string): string {
  // Mesmo protocolo da página (https quando o certificado local mkcert está
  // configurado) — câmera do celular (crachá QR) exige contexto seguro
  const { protocol, hostname } = window.location
  let porta = '3002'
  try {
    porta = new URL(configurada).port
  } catch { /* URL inválida: mantém a porta padrão da LAN */ }
  return porta ? `${protocol}//${hostname}:${porta}` : `${protocol}//${hostname}`
}
