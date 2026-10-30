import os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { prisma, semEscopoDeTenant } from './prisma'

/**
 * Modo local (Host): o sistema roda num computador Windows do restaurante, numa
 * rede cabeada só dos terminais (IPs fixos, sem roteador). Liga com MODO_LOCAL=1.
 *
 * Trava de rede, em duas camadas:
 *  1. aqui no servidor: só atende o próprio Host e os IPs cadastrados em
 *     Admin › Terminais (rotas HTTP e conexão em tempo real);
 *  2. no Firewall do Windows: uma regra de entrada que só aceita esses IPs na
 *     porta do sistema (atualizada a cada mudança no cadastro).
 *
 * Se o Host ligar com um IP diferente do configurado (outra rede, placa trocada),
 * o sistema fica bloqueado para os terminais até o administrador confirmar o
 * novo IP no próprio Host.
 */
const execFileAsync = promisify(execFile)

export const modoLocal = () => process.env.MODO_LOCAL === '1'

const REGRA_FIREWALL = 'RestaurantePDV - Terminais'

/** "::ffff:10.0.0.3" → "10.0.0.3"; "::1" → "127.0.0.1" */
export function normalizarIp(ip: string | undefined | null): string {
  if (!ip) return ''
  let v = ip.trim()
  if (v.startsWith('::ffff:')) v = v.slice(7)
  if (v === '::1') v = '127.0.0.1'
  return v
}

export const ipValido = (ip: string) =>
  /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(ip)

/** IPv4 das placas de rede deste computador (sem loopback). */
export function ipsDoHost(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i): i is os.NetworkInterfaceInfo => !!i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address)
}

interface Estado {
  hostIp: string | null
  permitidos: Set<string>
  bloqueado: boolean
  motivo: string | null
}

const estado: Estado = { hostIp: null, permitidos: new Set(), bloqueado: false, motivo: null }

export function estadoRede() {
  return {
    modoLocal: modoLocal(),
    hostIp: estado.hostIp,
    ipsDoHost: ipsDoHost(),
    bloqueado: estado.bloqueado,
    motivo: estado.motivo,
    terminais: [...estado.permitidos],
  }
}

/** Relê o IP do Host e os terminais ativos; confere a rede; atualiza o firewall. */
export async function recarregarRede() {
  if (!modoLocal()) return
  const [cfg, terminais] = await semEscopoDeTenant(async () => Promise.all([
    prisma.configuracoes.findFirst({ select: { hostIp: true } }),
    // Aparelhos autorizados por chave não têm IP e não entram na trava de rede
    prisma.terminal.findMany({ where: { ativo: true, ip: { not: null } }, select: { ip: true } }),
  ]))
  estado.hostIp = cfg?.hostIp ?? null
  estado.permitidos = new Set(terminais.map((t) => t.ip!))

  const locais = ipsDoHost()
  if (!estado.hostIp) {
    estado.bloqueado = true
    estado.motivo = 'O IP do Host ainda não foi configurado. Configure em Admin › Terminais, no próprio Host.'
  } else if (!locais.includes(estado.hostIp)) {
    estado.bloqueado = true
    estado.motivo = `Este Host está com IP ${locais.join(', ') || 'nenhum'}, mas foi configurado para ${estado.hostIp}. Confirme a rede em Admin › Terminais, no próprio Host.`
  } else {
    estado.bloqueado = false
    estado.motivo = null
  }
  await sincronizarFirewall().catch((e) => console.warn('[rede-local] firewall não atualizado:', e?.message ?? e))
}

/** O próprio Host (loopback ou um IP das placas dele) sempre entra, para poder configurar. */
export function ehOProprioHost(ip: string) {
  return ip === '127.0.0.1' || ipsDoHost().includes(ip)
}

/** null = pode entrar; texto = motivo do bloqueio. */
export function bloqueioPara(ipBruto: string | undefined | null): string | null {
  if (!modoLocal()) return null
  const ip = normalizarIp(ipBruto)
  if (ehOProprioHost(ip)) return null
  if (estado.bloqueado) return estado.motivo ?? 'Sistema bloqueado: rede do Host não confere.'
  if (!estado.permitidos.has(ip)) return `Terminal não autorizado (IP ${ip || 'desconhecido'}). Peça ao administrador para cadastrar este IP no Host.`
  return null
}

/**
 * Regra de entrada do Firewall do Windows: só os IPs cadastrados chegam na porta
 * do sistema. Exige o serviço rodando como administrador (o instalador cuida disso).
 */
async function sincronizarFirewall() {
  if (process.platform !== 'win32' || process.env.FIREWALL_AUTOMATICO === '0') return
  const porta = String(parseInt(process.env.PORT ?? '80', 10))
  const remotos = [...estado.permitidos].filter(ipValido)
  const ps = [
    `Remove-NetFirewallRule -DisplayName '${REGRA_FIREWALL}' -ErrorAction SilentlyContinue`,
    remotos.length && !estado.bloqueado
      ? `New-NetFirewallRule -DisplayName '${REGRA_FIREWALL}' -Direction Inbound -Action Allow -Protocol TCP -LocalPort ${porta} -RemoteAddress ${remotos.map((r) => `'${r}'`).join(',')} -Profile Any | Out-Null`
      : '',
  ].filter(Boolean).join('; ')
  await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps], { timeout: 15000 })
}

/** Página simples para o navegador do terminal bloqueado. */
export function paginaBloqueio(motivo: string) {
  const texto = motivo.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acesso bloqueado</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1119;color:#f1f4f9;font:16px/1.5 system-ui,sans-serif}main{max-width:460px;padding:32px;text-align:center}h1{font-size:22px;margin:0 0 12px}p{color:#a9b3c6}</style>
</head><body><main><h1>Acesso bloqueado</h1><p>${texto}</p></main></body></html>`
}
