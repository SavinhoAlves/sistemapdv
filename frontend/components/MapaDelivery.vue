<template>
  <div class="mapa-delivery relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/[0.08]" :style="{ height: altura }">
    <div ref="el" class="absolute inset-0" role="region" :aria-label="descricao" />
    <p v-if="!temPontos" class="absolute inset-0 flex items-center justify-center text-xs text-gray-500 dark:text-white/50 pointer-events-none px-6 text-center bg-white/60 dark:bg-black/40">
      {{ vazio }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import 'leaflet/dist/leaflet.css'

/**
 * Mapa do delivery (Leaflet + OpenStreetMap, gratuito).
 * Marcadores em HTML (sem imagens): restaurante, entregadores e paradas
 * numeradas. `rotas` liga as paradas em ordem pela rua (OSRM público), com a
 * linha destacada (contorno branco + laranja, como nos apps de entrega); se o
 * serviço falhar, a linha vai reta entre as paradas. `trajeto` (2 pontos) ainda vale.
 */
export interface PontoMapa { lat: number; lng: number }
export interface RotaMapa { id: string; pontos: PontoMapa[]; destaque?: boolean }
export interface Marcador extends PontoMapa { id: string; tipo: 'restaurante' | 'entregador' | 'parada' | 'destino' | 'feito'; rotulo?: string; titulo?: string }

const props = withDefaults(defineProps<{
  marcadores: Marcador[]
  rastros?: { id: string; pontos: [number, number][] }[]
  trajeto?: { de: PontoMapa; para: PontoMapa } | null
  rotas?: RotaMapa[]
  altura?: string
  descricao?: string
  vazio?: string
  /** Clique no mapa devolve as coordenadas (marcar o local do restaurante) */
  marcavel?: boolean
}>(), { altura: '320px', descricao: 'Mapa das entregas', vazio: 'Sem pontos no mapa ainda', rastros: () => [], trajeto: null, rotas: () => [] })
const emit = defineEmits<{ (e: 'marcar', p: PontoMapa): void }>()

const el = ref<HTMLElement | null>(null)
const temPontos = computed(() => props.marcadores.length > 0)
let L: typeof import('leaflet') | null = null
let mapa: import('leaflet').Map | null = null
let camada: import('leaflet').LayerGroup | null = null
let ajustado = false

// Ícones em SVG (traço branco, desenho do Lucide): emoji não existe em todo aparelho
const svg = (d: string) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const SVG_MOTO = svg('<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>')
const SVG_TALHERES = svg('<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/>')
const CORES: Record<Marcador['tipo'], string> = { restaurante: '#ea580c', entregador: '#0284c7', parada: '#111827', destino: '#16a34a', feito: '#9ca3af' }
function icone(m: Marcador) {
  const cor = CORES[m.tipo]
  const conteudo = m.tipo === 'entregador' ? SVG_MOTO : m.tipo === 'restaurante' ? SVG_TALHERES : (m.rotulo ?? '')
  const tam = m.tipo === 'entregador' || m.tipo === 'restaurante' ? 34 : 28
  return L!.divIcon({
    className: 'md-icone',
    html: `<span style="background:${cor};width:${tam}px;height:${tam}px" class="md-pino">${conteudo}</span>`,
    iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2],
  })
}

// Rota pela rua com várias paradas em ordem (OSRM aceita até ~25 pontos)
async function rotaPelaRua(pontos: PontoMapa[]): Promise<[number, number][] | null> {
  try {
    const coords = pontos.slice(0, 25).map(p => `${p.lng},${p.lat}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const j = await r.json()
    return j.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]: [number, number]) => [lat, lng]) ?? null
  } catch { return null }
}

// Geometria pela rua já consultada, por sequência de pontos (~100 m de precisão):
// o entregador andando não refaz a consulta a cada posição
const cacheRua = new Map<string, [number, number][] | null>()
const chaveRota = (pts: PontoMapa[]) => pts.map(p => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`).join('>')
const todasRotas = computed<RotaMapa[]>(() => [
  ...props.rotas,
  ...(props.trajeto ? [{ id: 'trajeto', pontos: [props.trajeto.de, props.trajeto.para], destaque: true }] : []),
].filter(r => r.pontos.length > 1))

let geracao = 0
async function desenhar() {
  if (!L || !mapa || !camada) return
  const minha = ++geracao
  camada.clearLayers()
  for (const r of props.rastros) if (r.pontos.length > 1) L.polyline(r.pontos, { color: '#0284c7', weight: 3, opacity: 0.5, dashArray: '4 6' }).addTo(camada)
  // Linhas primeiro (com o traçado reto), marcadores por cima; a rua chega depois
  const linhas = todasRotas.value.map((rota) => {
    const reta = rota.pontos.map(p => [p.lat, p.lng] as [number, number])
    const forte = rota.destaque !== false
    // Contorno branco por baixo + linha colorida: destaca a rota sobre o mapa
    const contorno = L!.polyline(reta, { color: '#ffffff', weight: forte ? 10 : 7, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(camada!)
    const linha = L!.polyline(reta, { color: forte ? '#ea580c' : '#6b7280', weight: forte ? 6 : 4, opacity: forte ? 0.95 : 0.7, lineCap: 'round', lineJoin: 'round' }).addTo(camada!)
    return { rota, contorno, linha }
  })
  for (const m of props.marcadores) {
    const mk = L.marker([m.lat, m.lng], { icon: icone(m), title: m.titulo ?? '', zIndexOffset: m.tipo === 'entregador' ? 1000 : 0 }).addTo(camada)
    if (m.titulo) mk.bindTooltip(m.titulo, { direction: 'top', offset: [0, -14] })
  }
  if (!ajustado && props.marcadores.length) {
    ajustado = true
    if (props.marcadores.length === 1) mapa.setView([props.marcadores[0].lat, props.marcadores[0].lng], 15)
    else mapa.fitBounds(L.latLngBounds(props.marcadores.map(m => [m.lat, m.lng] as [number, number])), { padding: [36, 36], maxZoom: 16 })
  }
  for (const { rota, contorno, linha } of linhas) {
    const chave = chaveRota(rota.pontos)
    if (!cacheRua.has(chave)) cacheRua.set(chave, await rotaPelaRua(rota.pontos))
    if (minha !== geracao) return // outro redesenho começou enquanto esperava a rua
    const pelaRua = cacheRua.get(chave)
    if (pelaRua) { contorno.setLatLngs(pelaRua); linha.setLatLngs(pelaRua) }
  }
}

/** Reenquadra todos os pontos (ex.: botão "centralizar"). */
function enquadrar() { ajustado = false; desenhar() }
defineExpose({ enquadrar })

onMounted(async () => {
  L = await import('leaflet')
  mapa = L.map(el.value!, { zoomControl: true, attributionControl: true }).setView([-15.78, -47.93], 4)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa)
  camada = L.layerGroup().addTo(mapa)
  if (props.marcavel) mapa.on('click', (e: any) => emit('marcar', { lat: e.latlng.lat, lng: e.latlng.lng }))
  desenhar()
})
watch(() => [props.marcadores, props.rastros, props.trajeto, props.rotas], desenhar, { deep: true })
onUnmounted(() => { mapa?.remove(); mapa = null })
</script>

<style>
.md-icone { background: none; border: 0; }
.md-pino { display: flex; align-items: center; justify-content: center; border-radius: 9999px; color: #fff; font: 800 13px/1 system-ui, sans-serif; border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,.35); }
/* Tema escuro: escurece os blocos do mapa sem trocar de servidor */
html.dark .mapa-delivery .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.9) contrast(0.9); }
html.dark .mapa-delivery .leaflet-container { background: #0e1119; }
.mapa-delivery .leaflet-control-attribution { font-size: 9px; }
</style>
