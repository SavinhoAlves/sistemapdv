/**
 * Endereço → coordenadas pelo Nominatim (OpenStreetMap), gratuito.
 *
 * Regras de uso do serviço público: no máximo 1 consulta por segundo e um
 * User-Agent que identifique a aplicação. As chamadas passam por uma fila
 * com intervalo de 1,1 s e os resultados ficam em cache na memória — o
 * mesmo endereço não é consultado duas vezes. Se o serviço falhar, devolve
 * null: o pedido segue sem pino no mapa.
 */
export interface Coordenadas { lat: number; lng: number }

const URL_BASE = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'RestaurantePDV/1.0 (+https://restaurantepdv.com.br)'
const INTERVALO_MS = 1100
const cache = new Map<string, Coordenadas | null>()
let fila: Promise<unknown> = Promise.resolve()
let ultima = 0

async function consultar(q: string): Promise<Coordenadas | null> {
  const espera = Math.max(0, ultima + INTERVALO_MS - Date.now())
  if (espera) await new Promise((r) => setTimeout(r, espera))
  ultima = Date.now()
  const url = `${URL_BASE}?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`
  try {
    const r = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'pt-BR' }, signal: AbortSignal.timeout(6000) })
    if (!r.ok) return null
    const [primeiro] = (await r.json()) as Array<{ lat: string; lon: string }>
    return primeiro ? { lat: Number(primeiro.lat), lng: Number(primeiro.lon) } : null
  } catch {
    return null
  }
}

/** Tenta o endereço completo e, sem resultado, sem o número (rua + bairro + cidade). */
export function geocodificar(partes: { rua?: string | null; numero?: string | null; bairro?: string | null; cidade?: string | null; uf?: string | null }) {
  const juntar = (xs: (string | null | undefined)[]) => xs.map((x) => x?.trim()).filter(Boolean).join(', ')
  const completo = juntar([partes.rua && partes.numero ? `${partes.rua}, ${partes.numero}` : partes.rua, partes.bairro, partes.cidade, partes.uf, 'Brasil'])
  const semNumero = juntar([partes.rua, partes.bairro, partes.cidade, partes.uf, 'Brasil'])
  const chave = completo.toLowerCase()
  if (cache.has(chave)) return Promise.resolve(cache.get(chave)!)

  const tarefa = fila.then(async () => {
    let c = await consultar(completo)
    if (!c && semNumero !== completo) c = await consultar(semNumero)
    if (cache.size > 5000) cache.clear()
    cache.set(chave, c)
    return c
  })
  fila = tarefa.catch(() => null)
  return tarefa
}

/** Distância em metros entre dois pontos (haversine). */
export function distancia(a: Coordenadas, b: Coordenadas) {
  const R = 6371000, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
