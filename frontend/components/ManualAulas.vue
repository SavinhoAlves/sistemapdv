<template>
  <div class="man">
    <!-- Índice -->
    <nav class="man-indice" aria-label="Aulas">
      <a v-for="a in aulas" :key="a.id" :href="`#aula-${a.id}`" @click.prevent="ir(a.id)">{{ a.titulo }}</a>
    </nav>

    <article v-for="a in aulas" :id="`aula-${a.id}`" :key="a.id" class="man-aula">
      <header>
        <h2>{{ a.titulo }}</h2>
        <p>{{ a.resumo }}</p>
      </header>
      <!-- GIF só carrega ao rolar até a aula (cada um tem ~1,5 MB) -->
      <img :src="base + a.gif.replace(/^\//, '')" :alt="`Demonstração: ${a.titulo}`" loading="lazy" class="man-gif" width="1568" height="662" />
      <ol>
        <li v-for="(p, i) in a.passos" :key="i">{{ p }}</li>
      </ol>
      <p v-if="a.dica" class="man-dica"><b>Dica:</b> {{ a.dica }}</p>
    </article>
  </div>
</template>

<script setup lang="ts">
import { AULAS, type AulaManual } from '~/lib/aulasManual'

const props = withDefaults(defineProps<{ publico?: 'restaurante' | 'todos' }>(), { publico: 'todos' })
const aulas: AulaManual[] = props.publico === 'todos' ? AULAS : AULAS.filter(a => a.para === props.publico)
const base = useRuntimeConfig().app.baseURL
function ir(id: string) { document.getElementById(`aula-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
</script>

<style scoped>
.man { display: grid; gap: 28px; }
.man-indice { display: flex; flex-wrap: wrap; gap: 8px; }
.man-indice a { padding: 6px 12px; border-radius: 999px; border: 1px solid var(--man-linha); font-size: 13px; font-weight: 700; color: var(--man-txt); text-decoration: none; }
.man-indice a:hover { border-color: #f97316; color: #f97316; }
.man-aula { border: 1px solid var(--man-linha); background: var(--man-cartao); border-radius: 20px; padding: 20px; scroll-margin-top: 16px; }
.man-aula h2 { font-size: 20px; font-weight: 900; color: var(--man-txt); }
.man-aula header p { margin-top: 4px; color: var(--man-mudo); font-size: 14px; }
.man-gif { margin-top: 14px; width: 100%; height: auto; border-radius: 12px; border: 1px solid var(--man-linha); background: #0e1119; }
.man-aula ol { margin-top: 14px; padding-left: 22px; display: grid; gap: 6px; color: var(--man-txt); font-size: 15px; line-height: 1.5; list-style: decimal; }
.man-dica { margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: rgb(249 115 22 / 0.1); color: var(--man-txt); font-size: 14px; }
</style>
