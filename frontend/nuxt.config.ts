// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/google-fonts',
  ],

  googleFonts: {
    download: true,
    inject: true,
    families: {
      Sora: [300, 400, 500, 600, 700, 800, 900],
      'JetBrains Mono': [400, 500, 600, 700],
    },
  },

  ui: {
    global: true,
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: '',
  },

  runtimeConfig: {
    public: {
      apiUrl:      process.env.NUXT_PUBLIC_API_URL      || 'http://localhost:3002',
      socketUrl:   process.env.NUXT_PUBLIC_SOCKET_URL   || 'http://localhost:3002',
      tenantSlug:  process.env.NUXT_PUBLIC_TENANT_SLUG  || 'tarantela',
    }
  },

  app: {
    // Sistema na raiz de app.<domínio> e Central na raiz de painel.<domínio>
    // (o site de apresentação fica no domínio principal). Endereços antigos
    // com /app/ são redirecionados pelo nginx. Dá para trocar com NUXT_APP_BASE_URL.
    baseURL: '/',
    // Suaviza a troca de páginas (evita o "piscar" ao navegar entre menus)
    pageTransition: { name: 'page' },
    head: {
      title: 'RestaurantePDV',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Sistema PDV para Restaurante' },
        { name: 'theme-color', content: '#FF7A00' }
      ],
      // Ícone da marca: garfo e faca cruzados, brancos no laranja (public/favicon.*)
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    }
  },

  css: ['~/assets/css/tokens.css', '~/assets/css/main.css', '~/assets/css/auth.css', '~/assets/css/platform.css'],

  ssr: false, // SPA mode para LAN

  nitro: {
    preset: 'node-server'
  },
  devServer: {
    host: '0.0.0.0', // Permite que o servidor aceite conexões de qualquer IP na rede local
    port: 3000
  },
})
