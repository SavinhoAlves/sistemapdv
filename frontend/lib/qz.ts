/**
 * QZ Tray: programa instalado no computador do caixa (qz.io) que deixa o site
 * imprimir direto na térmica USB, sem a janela do navegador. O servidor monta
 * a ficha em ESC/POS e devolve os bytes; aqui eles vão para a impressora pelo
 * QZ Tray, que escuta em wss://localhost:8181.
 *
 * Os pedidos vão assinados com o certificado do RestaurantePDV (a chave fica
 * no servidor): o QZ Tray pergunta uma vez se confia e lembra a resposta.
 * Sem certificado configurado no servidor, cai no modo anônimo.
 */
import qz from 'qz-tray'

type Api = { get: <R>(url: string) => Promise<R>; post: <R>(url: string, body?: any) => Promise<R> }

let conectando: Promise<void> | null = null
// Última instância da API (o useApi só pode ser criado dentro de um componente)
let apiAtual: Api | null = null
let segurancaPronta = false

function configurarSeguranca() {
  if (segurancaPronta) return
  segurancaPronta = true
  qz.security.setCertificatePromise((resolve: (c: string) => void) => {
    if (!apiAtual) return resolve('')
    apiAtual.get<{ certificado: string }>('/impressoras/qz/certificado')
      .then(r => resolve(r?.certificado || ''))
      .catch(() => resolve(''))
  })
  qz.security.setSignatureAlgorithm('SHA512')
  qz.security.setSignaturePromise((paraAssinar: string) => (resolve: (s: string) => void) => {
    if (!apiAtual) return resolve('')
    apiAtual.post<{ assinatura: string }>('/impressoras/qz/assinar', { dados: paraAssinar })
      .then(r => resolve(r?.assinatura || ''))
      .catch(() => resolve(''))
  })
}

export class QzIndisponivel extends Error {
  constructor() { super('O QZ Tray não está aberto neste computador. Abra o QZ Tray e tente de novo.') }
}

async function conectar(api?: Api) {
  if (api) apiAtual = api
  configurarSeguranca()
  if (qz.websocket.isActive()) return
  if (!conectando) {
    conectando = qz.websocket.connect({ retries: 1, delay: 1 })
      .catch(() => { throw new QzIndisponivel() })
      .finally(() => { conectando = null })
  }
  await conectando
}

/** Impressoras instaladas neste computador (a do Windows aparece pelo nome). */
export async function listarImpressorasQz(api?: Api): Promise<string[]> {
  await conectar(api)
  const r = await qz.printers.find()
  return (Array.isArray(r) ? r : [r]).filter(Boolean)
}

/** Manda bytes ESC/POS (base64) para a impressora pelo nome. */
export async function imprimirRawQz(impressora: string, base64: string, api?: Api) {
  if (!impressora) throw new Error('Escolha a impressora do QZ Tray nas configurações de impressão')
  await conectar(api)
  await qz.print(qz.configs.create(impressora), [{ type: 'raw', format: 'command', flavor: 'base64', data: base64 }])
}

/**
 * Chama uma rota de /impressao. Se o destino usa QZ Tray, o servidor devolve
 * { qz: { impressora, dados } } e a impressão sai por aqui; nos outros tipos o
 * servidor já imprimiu.
 */
export async function enviarImpressao<T = any>(api: Api, rota: string, body?: any): Promise<T> {
  const r: any = await api.post(rota, body)
  if (r?.qz) await imprimirRawQz(r.qz.impressora, r.qz.dados, api)
  return r
}
