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
 * numeradas. `trajeto` liga dois pontos pela rua (OSRM público); se o
 * serviço falhar, a linha vai reta.
 */
export interface PontoMapa { lat: number; lng: number }
export interface Marcador extends PontoMapa { id: string; tipo: 'restaurante' | 'entregador' | 'parada' | 'destino' | 'feito'; rotulo?: string; titulo?: string }

const props = withDefaults(defineProps<{
  marcadores: Marcador[]
  rastros?: { id: string; pontos: [number, number][] }[]
  trajeto?: { de: PontoMapa; para: PontoMapa } | null
  altura?: string
  descricao?: string
  vazio?: string
  /** Clique no mapa devolve as coordenadas (marcar o local do restaurante) */
  marcavel?: boolean
}>(), { altura: '320px', descricao: 'Mapa das entregas', vazio: 'Sem pontos no mapa ainda', rastros: () => [], trajeto: null })
const emit = defineEmits<{ (e: 'marcar', p: PontoMapa): void }>()

const el = ref<HTMLElement | null>(null)
const temPontos = computed(() => props.marcadores.length > 0)
let L: typeof import('leaflet') | null = null
let mapa: import('leaflet').Map | null = null
let camada: import('leaflet').LayerGroup | null = null
let ajustado = false

const CORES: Record<Marcador['tipo'], string> = { restaurante: '#ea580c', entregador: '#0284c7', parada: '#111827', destino: '#16a34a', feito: '#9ca3af' }
function icone(m: Marcador) {
  const cor = CORES[m.tipo]
  const conteudo = m.tipo === 'entregador' ? '🛵' : m.tipo === 'restaurante' ? '🍽' : (m.rotulo ?? '')
  const tam = m.tipo === 'entregador' || m.tipo === 'restaurante' ? 34 : 28
  return L!.divIcon({
    className: 'md-icone',
    html: `<span style="background:${cor};width:${tam}px;height:${tam}px" class="md-pino">${conteudo}</span>`,
    iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2],
  })
}

async function rotaPelaRua(a: PontoMapa, b: PontoMapa): Promise<[number, number][] | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const j = await r.json()
    return j.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]: [number, number]) => [lat, lng]) ?? null
  } catch { return null }
}

let ultimoTrajeto = ''
async function desenhar() {
  if (!L || !mapa || !camada) return
  camada.clearLayers()
  for (const r of props.rastros) if (r.pontos.length > 1) L.polyline(r.pontos, { color: '#0284c7', weight: 3, opacity: 0.5, dashArray: '4 6' }).addTo(camada)
  if (props.trajeto) {
    const { de, para } = props.trajeto
    const chave = `${de.lat.toFixed(4)},${de.lng.toFixed(4)}>${para.lat.toFixed(4)},${para.lng.toFixed(4)}`
    const reta: [number, number][] = [[de.lat, de.lng], [para.lat, para.lng]]
    const linha = L.polyline(reta, { color: '#ea580c', weight: 4, opacity: 0.8 }).addTo(camada)
    // Só consulta a rota pela rua quando o trecho mudou
    if (chave !== ultimoTrajeto) {
      ultimoTrajeto = chave
      const pelaRua = await rotaPelaRua(de, para)
      if (pelaRua) linha.setLatLngs(pelaRua)
    }
  }
  for (const m of props.marcadores) {
    const mk = L.marker([m.lat, m.lng], { icon: icone(m), title: m.titulo ?? '', zIndexOffset: m.tipo === 'entregador' ? 1000 : 0 }).addTo(camada)
    if (m.titulo) mk.bindTooltip(m.titulo, { direction: 'top', offset: [0, -14] })
  }
  if (!ajustado && props.marcadores.length) {
    ajustado = true
    if (props.marcadores.length === 1) mapa.setView([props.marcadores[0].lat, props.marcadores[0].lng], 15)
    else mapa.fitBounds(L.latLngBounds(props.marcadores.map(m => [m.lat, m.lng] as [number, number])), { padding: [36, 36], maxZoom: 16 })
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
watch(() => [props.marcadores, props.rastros, props.trajeto], desenhar, { deep: true })
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
