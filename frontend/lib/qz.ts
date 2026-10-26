/**
 * QZ Tray: programa instalado no computador do caixa (qz.io) que deixa o site
 * imprimir direto na térmica USB, sem a janela do navegador. O servidor monta
 * a ficha em ESC/POS e devolve os bytes; aqui eles vão para a impressora pelo
 * QZ Tray, que escuta em wss://localhost:8181.
 *
 * Sem certificado assinado, o QZ Tray pergunta uma vez se confia no site
 * (marcar "Lembrar" e "Permitir").
 */
import qz from 'qz-tray'

let conectando: Promise<void> | null = null

export class QzIndisponivel extends Error {
  constructor() { super('O QZ Tray não está aberto neste computador. Abra o QZ Tray e tente de novo.') }
}

async function conectar() {
  if (qz.websocket.isActive()) return
  if (!conectando) {
    qz.security.setCertificatePromise((resolve: (c: string) => void) => resolve(''))
    qz.security.setSignaturePromise(() => (resolve: (s: string) => void) => resolve(''))
    conectando = qz.websocket.connect({ retries: 1, delay: 1 })
      .catch(() => { throw new QzIndisponivel() })
      .finally(() => { conectando = null })
  }
  await conectando
}

/** Impressoras instaladas neste computador (a do Windows aparece pelo nome). */
export async function listarImpressorasQz(): Promise<string[]> {
  await conectar()
  const r = await qz.printers.find()
  return (Array.isArray(r) ? r : [r]).filter(Boolean)
}

/** Manda bytes ESC/POS (base64) para a impressora pelo nome. */
export async function imprimirRawQz(impressora: string, base64: string) {
  if (!impressora) throw new Error('Escolha a impressora do QZ Tray nas configurações de impressão')
  await conectar()
  await qz.print(qz.configs.create(impressora), [{ type: 'raw', format: 'command', flavor: 'base64', data: base64 }])
}

/**
 * Chama uma rota de /impressao. Se o destino usa QZ Tray, o servidor devolve
 * { qz: { impressora, dados } } e a impressão sai por aqui; nos outros tipos o
 * servidor já imprimiu.
 */
export async function enviarImpressao<T = any>(api: { post: <R>(url: string, body?: any) => Promise<R> }, rota: string, body?: any): Promise<T> {
  const r: any = await api.post(rota, body)
  if (r?.qz) await imprimirRawQz(r.qz.impressora, r.qz.dados)
  return r
}
