<template>
  <div class="pf">
    <div class="pf-shell">

      <aside class="pf-rail">
        <nav class="pf-rail-in" aria-label="Navegação principal">
          <NuxtLink to="/platform" class="pf-logo">
            <span class="pf-logo-m"><UtensilsCrossed :size="20" /></span>
            <span>Restaurante <i>PDV</i></span>
          </NuxtLink>

          <template v-for="grupo in NAV" :key="grupo.nome">
            <div class="pf-grp">{{ grupo.nome }}</div>
            <template v-for="item in grupo.itens" :key="item.rotulo">
              <NuxtLink
                v-if="item.rota"
                :to="item.rota"
                class="pf-nv"
                :class="{ ativo: ativo === item.chave }"
                :aria-current="ativo === item.chave ? 'page' : undefined"
              >
                <component :is="item.icone" :size="20" />
                <span class="pf-nv-txt">{{ item.rotulo }}</span>
                <span v-if="contagens?.[item.chave]" class="pf-n" :class="{ hot: item.chave === 'tickets' }">
                  {{ contagens[item.chave] }}
                </span>
              </NuxtLink>
              <span v-else class="pf-nv breve" title="Em desenvolvimento">
                <component :is="item.icone" :size="20" />
                <span class="pf-nv-txt">{{ item.rotulo }}</span>
                <span class="pf-breve">Em breve</span>
              </span>
            </template>
          </template>

          <div class="pf-me">
            <span class="pf-av0">{{ inicial }}</span>
            <div class="pf-me-info">
              <b>{{ platformAuth.user?.nome || 'Administrador' }}</b>
              <small>Super admin</small>
            </div>
            <button class="pf-ib" :aria-label="themeStore.dark ? 'Mudar para tema claro' : 'Mudar para tema escuro'" @click="themeStore.toggle()">
              <Sun v-if="themeStore.dark" :size="18" />
              <Moon v-else :size="18" />
            </button>
            <div class="relative">
              <button class="pf-ib" aria-label="Minha conta" :aria-expanded="menuConta" @click.stop="menuConta = !menuConta">
                <MoreVertical :size="18" />
              </button>
              <div v-if="menuConta" class="pf-menu" style="top:auto;bottom:calc(100% + 6px)" @click.stop>
                <button @click="menuConta = false; modalSenha = true"><KeyRound :size="16" /> Alterar minha senha</button>
                <button @click="sair"><LogOut :size="16" /> Sair</button>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      <main class="pf-main">
        <div class="pf-top"><span class="pf-bob">Central do Restaurante PDV · {{ titulo }}</span></div>
        <slot />
      </main>
    </div>

    <PlatformChangePasswordModal v-model="modalSenha" />
    <UNotifications />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Component } from 'vue'
import {
  UtensilsCrossed, LayoutDashboard, Store, Wallet, Bike, FlaskConical, Ticket,
  MessageCircle, Tag, Database, Sun, Moon, MoreVertical, KeyRound, LogOut,
} from 'lucide-vue-next'
import { usePlatformAuthStore } from '~/stores/platformAuth'
import { useThemeStore } from '~/stores/theme'

/**
 * Moldura das páginas da plataforma: navegação agrupada à esquerda,
 * conteúdo à direita. Itens sem rota ainda não existem no backend e
 * aparecem como "Em breve" (Testes, Avisos, Backups).
 */
defineProps<{
  ativo: 'painel' | 'restaurantes' | 'tickets' | 'planos' | 'cobranca' | 'delivery'
  titulo: string
  contagens?: Partial<Record<string, number>>
}>()

interface ItemNav { chave: string; rotulo: string; icone: Component; rota?: string }

const NAV: { nome: string; itens: ItemNav[] }[] = [
  { nome: 'Clientes', itens: [
    { chave: 'painel',       rotulo: 'Visão geral',   icone: LayoutDashboard, rota: '/platform' },
    { chave: 'restaurantes', rotulo: 'Restaurantes',  icone: Store,           rota: '/platform/restaurantes' },
    { chave: 'cobranca',     rotulo: 'Cobranças',     icone: Wallet,          rota: '/platform/mensalidades' },
    { chave: 'delivery',     rotulo: 'Delivery',      icone: Bike,            rota: '/platform/delivery' },
    { chave: 'demos',        rotulo: 'Testes', icone: FlaskConical },
  ] },
  { nome: 'Atendimento', itens: [
    { chave: 'tickets', rotulo: 'Chamados', icone: Ticket,        rota: '/platform/tickets' },
    { chave: 'avisos',  rotulo: 'Avisos',   icone: MessageCircle },
  ] },
  { nome: 'Configuração', itens: [
    { chave: 'planos',  rotulo: 'Planos',  icone: Tag, rota: '/platform/planos' },
    { chave: 'backups', rotulo: 'Backups', icone: Database },
  ] },
]

const platformAuth = usePlatformAuthStore()
const themeStore   = useThemeStore()
const { platformFetch } = usePlatformFetch()

const modalSenha = ref(false)
const menuConta  = ref(false)
const inicial    = computed(() => (platformAuth.user?.nome || 'A').trim().charAt(0).toUpperCase())

async function sair() {
  menuConta.value = false
  const rt = localStorage.getItem('platform_refresh_token')
  if (rt) { try { await platformFetch('/platform/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: rt }) }) } catch {} }
  platformAuth.logout()
  navigateTo('/platform/login')
}

function fecharMenu() { menuConta.value = false }
onMounted(() => document.addEventListener('click', fecharMenu))
onUnmounted(() => document.removeEventListener('click', fecharMenu))
</script>
