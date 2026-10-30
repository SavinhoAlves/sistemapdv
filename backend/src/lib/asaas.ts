/**
 * Cliente da API do Asaas (cobrança da mensalidade dos restaurantes).
 *
 * Variáveis no .env do servidor:
 *   ASAAS_API_KEY        chave da conta (sandbox ou produção)
 *   ASAAS_AMBIENTE       'sandbox' (padrão) ou 'producao'
 *   ASAAS_WEBHOOK_TOKEN  token que o Asaas manda no cabeçalho asaas-access-token
 * Sem ASAAS_API_KEY a integração fica desligada e o painel funciona como antes.
 */

const URLS = {
  sandbox: 'https://api-sandbox.asaas.com/v3',
  producao: 'https://api.asaas.com/v3',
} as const

export function asaasConfigurado() {
  return Boolean(process.env.ASAAS_API_KEY)
}

export function asaasAmbiente(): keyof typeof URLS {
  return process.env.ASAAS_AMBIENTE === 'producao' ? 'producao' : 'sandbox'
}

export class AsaasErro extends Error {
  constructor(message: string, public status = 502) { super(message) }
}

export async function asaas<T = any>(caminho: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const chave = process.env.ASAAS_API_KEY
  if (!chave) throw new AsaasErro('Cobrança automática não configurada no servidor (ASAAS_API_KEY)', 503)
  const r = await fetch(URLS[asaasAmbiente()] + caminho, {
    method: init.method ?? 'GET',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'RestaurantePDV', access_token: chave },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  })
  const texto = await r.text()
  const json = texto ? JSON.parse(texto) : {}
  if (!r.ok) {
    const msg = json?.errors?.[0]?.description || `Asaas respondeu ${r.status}`
    throw new AsaasErro(msg, r.status === 401 ? 503 : 502)
  }
  return json as T
}
