<template>
  <!-- Manual público (sem login): é o link que o gestor compartilha com os restaurantes -->
  <div class="man-pag">
    <div class="man-wrap">
      <header class="man-topo">
        <span class="man-marca"><UtensilsCrossed :size="22" /></span>
        <div>
          <h1>Manual do RestaurantePDV</h1>
          <p>Aulas curtas, com a tela gravada no próprio sistema e o passo a passo.</p>
        </div>
      </header>
      <ManualAulas publico="restaurante" />
      <p class="man-rodape">Dúvidas? No sistema, abra <b>Suporte</b> e fale com a nossa equipe.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { UtensilsCrossed } from 'lucide-vue-next'
import ManualAulas from '~/components/ManualAulas.vue'
import { useTemaDoAparelho } from '~/composables/useTemaDoAparelho'

definePageMeta({ layout: false })
useHead({ title: 'Manual · RestaurantePDV', meta: [{ name: 'description', content: 'Manual de uso do RestaurantePDV: caixa, mesas, venda direta, cozinha, delivery e relatórios.' }] })
useTemaDoAparelho()
</script>

<style>
.man-pag { --man-fundo: #f7f7f8; --man-cartao: #ffffff; --man-linha: #e5e7eb; --man-txt: #111827; --man-mudo: #6b7280; min-height: 100dvh; background: var(--man-fundo); font-family: var(--fonte-texto, system-ui), system-ui, sans-serif; }
html.dark .man-pag { --man-fundo: #0e1119; --man-cartao: #171c27; --man-linha: #2b3345; --man-txt: #f1f4f9; --man-mudo: #a9b3c6; }
.man-wrap { max-width: 900px; margin: 0 auto; padding: 32px 16px 48px; display: grid; gap: 24px; }
.man-topo { display: flex; align-items: center; gap: 14px; }
.man-marca { width: 52px; height: 52px; border-radius: 16px; background: #f97316; color: #fff; display: grid; place-items: center; flex: none; }
.man-topo h1 { font-size: 26px; font-weight: 900; color: var(--man-txt); line-height: 1.1; }
.man-topo p { color: var(--man-mudo); margin-top: 4px; }
.man-rodape { color: var(--man-mudo); text-align: center; font-size: 14px; }
</style>
