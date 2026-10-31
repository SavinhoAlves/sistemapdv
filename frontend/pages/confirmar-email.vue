<template>
  <div class="ce">
    <header class="top">
      <a class="logo" :href="linkInicio">Restaurante<i>PDV</i></a>
    </header>

    <main class="center">
      <div class="card" :aria-busy="estado === 'carregando'">
        <div v-if="estado === 'carregando'" class="estado">
          <span class="spin" aria-hidden="true" />
          <h1>Confirmando o seu e-mail…</h1>
        </div>

        <div v-else-if="estado === 'ok'" class="estado" role="status">
          <span class="ic ok" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
          <h1>{{ resultado?.jaConfirmado ? 'E-mail já confirmado' : 'E-mail confirmado!' }}</h1>
          <p>O e-mail <b>{{ resultado?.email }}</b>, do restaurante <b>{{ resultado?.restaurante }}</b>, está confirmado. Agora é só entrar com ele e a senha que você criou (se o pagamento da assinatura ainda estiver em análise, o acesso abre assim que ele for confirmado).</p>
          <NuxtLink class="btn" to="/login">Entrar no sistema</NuxtLink>
        </div>

        <div v-else class="estado" role="alert">
          <span class="ic erro" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.1" /></svg></span>
          <h1>Não deu para confirmar</h1>
          <p>{{ erro }}</p>
          <NuxtLink class="btn" to="/login">Ir para o login</NuxtLink>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ehApp, urlDoHost } from '~/lib/hosts'

definePageMeta({ layout: false })
useHead({ title: 'Confirmar e-mail · RestaurantePDV' })

const route = useRoute()
const api = (useRuntimeConfig().public as any).apiUrl as string
const linkInicio = ehApp() ? urlDoHost('', '/') : '/'

const estado = ref<'carregando' | 'ok' | 'erro'>('carregando')
const resultado = ref<{ restaurante: string; email: string; jaConfirmado: boolean } | null>(null)
const erro = ref('')

onMounted(async () => {
  const token = String(route.query.token ?? '')
  if (!token) {
    erro.value = 'O link está incompleto. Abra de novo o botão do e-mail que enviamos.'
    estado.value = 'erro'
    return
  }
  try {
    resultado.value = await $fetch(`${api}/api/publico/confirmar-email`, { method: 'POST', body: { token } })
    estado.value = 'ok'
  } catch (err: any) {
    erro.value = err?.data?.error || 'Falha ao conectar com o servidor. Tente de novo em instantes.'
    estado.value = 'erro'
  }
})
</script>

<style scoped>
.ce {
  --bg:#FBF6EF; --card:#FFFFFF; --ink:#1F1A15; --muted:#6B5D50; --line:#EADFCE;
  --brand:#F07A12; --brand-hover:#E2680A; --tint:#FDEBD8; --danger:#B42318; --ok:#12805C;
  min-height:100vh; background:var(--bg); color:var(--ink); color-scheme:light;
  font:400 16px/1.5 var(--fonte-texto),system-ui,sans-serif; -webkit-font-smoothing:antialiased;
  display:flex; flex-direction:column;
}
.top{padding:20px 24px}
.logo{font-weight:800;font-size:20px;color:var(--ink);text-decoration:none}
.logo i{font-style:normal;color:var(--brand-hover)}
.center{flex:1;display:flex;align-items:center;justify-content:center;padding:16px 16px 64px}
.card{width:100%;max-width:440px;background:var(--card);border:1px solid var(--line);border-radius:24px;padding:32px;box-shadow:0 20px 50px -30px rgba(31,26,21,.35)}
.estado{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.estado h1{margin:0;font-size:24px;line-height:1.25;font-weight:800}
.estado p{margin:0 0 6px;color:var(--muted);font-size:15px}
.estado b{color:var(--ink);word-break:break-word}
.ic{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;margin-bottom:6px}
.ic.ok{background:#E7F6EF;color:var(--ok)}
.ic.erro{background:#FDECEC;color:var(--danger)}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:50px;padding:0 24px;border-radius:14px;background:var(--brand);color:#fff;font-weight:700;font-size:15px;text-decoration:none}
.btn:hover{background:var(--brand-hover)}
.btn:focus-visible,.logo:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.spin{width:28px;height:28px;border-radius:50%;border:3px solid var(--tint);border-top-color:var(--brand);animation:gira .8s linear infinite}
@keyframes gira{to{transform:rotate(360deg)}}
@media (max-width:560px){.card{padding:24px}}
@media (prefers-reduced-motion:reduce){.spin{animation-duration:1.6s}}
</style>
