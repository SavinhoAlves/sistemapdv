// https://nuxt.com/docs/api/configuration/nuxt-config
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Câmera do celular (login por crachá QR) só funciona em contexto seguro
// (https) — usa o certificado local gerado pelo iniciar.ps1 (mkcert) se
// existir; senão cai pro http normal do dev server
const certDir  = fileURLToPath(new URL('../certs', import.meta.url))
const certPath = `${certDir}/cert.pem`
const keyPath  = `${certDir}/key.pem`
const usaHttps = existsSync(certPath) && existsSync(keyPath)

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
      licenseSecret:   process.env.NUXT_PUBLIC_LICENSE_SECRET   || ''
    }
  },

  app: {
    // Suaviza a troca de páginas (evita o "piscar" ao navegar entre menus).
    // Sem "mode: out-in": esse modo espera a página antiga terminar de sair
    // antes da nova entrar — navegando rápido entre páginas, transições se
    // interrompem umas às outras e isso gera um loop recursivo no
    // scheduler do Vue (RangeError "Maximum call stack size exceeded").
    // Sem o mode, entrada/saída rodam em paralelo (crossfade de 150ms,
    // imperceptível) e não há fila de transição pra interromper.
    pageTransition: { name: 'page' },
    head: {
      title: 'RestaurantePDV',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Sistema PDV para Restaurante' }
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
    port: 3000,
    https: usaHttps ? { key: keyPath, cert: certPath } : undefined
  },
})
