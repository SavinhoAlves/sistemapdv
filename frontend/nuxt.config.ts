// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: false },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],

  runtimeConfig: {
    public: {
      apiUrl:          process.env.NUXT_PUBLIC_API_URL          || 'http://localhost:3001',
      socketUrl:       process.env.NUXT_PUBLIC_SOCKET_URL       || 'http://localhost:3001',
    }
  },

  app: {
    // Suaviza a troca de páginas (evita o "piscar" ao navegar entre menus)
    pageTransition: { name: 'page' },
    head: {
      title: 'RestaurantePDV',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Sistema PDV para Restaurante' }
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap' }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  ssr: false, // SPA mode para LAN

  nitro: {
    preset: 'node-server'
  },
  devServer: {
    host: '0.0.0.0', // Permite que o servidor aceite conexões de qualquer IP na rede local
    port: 3000
  },
})
