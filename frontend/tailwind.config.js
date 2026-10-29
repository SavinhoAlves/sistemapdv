const plugin = require('tailwindcss/plugin')
// Cores e fontes da marca: fonte única em design/marca.cjs
const marca = require('./design/marca.cjs')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './composables/**/*.{js,ts}',
    './utils/**/*.{js,ts}',
    './lib/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      colors: {
        // brand e orange são o laranja da marca (orange-* aparece em centenas de telas)
        brand: marca.laranja,
        orange: marca.laranja,
        neutro: marca.neutro,
        surface: {
          50:  '#f8f7f4',
          100: '#f0ede6',
          200: '#e2ddd3',
          300: '#cdc4b5',
          400: '#b5a892',
          500: '#9e8e76',
          600: '#8a7862',
          700: '#726252',
          800: '#5e5145',
          900: '#4e443b',
          950: '#29231e'
        }
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0,0,0,0.08)',
        'card-lg': '0 8px 32px rgba(0,0,0,0.12)',
        'float': '0 16px 48px rgba(0,0,0,0.18)'
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)'
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(16px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 }
        },
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        pulseSoft: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 }
        },
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 }
        }
      }
    }
  },
  plugins: [
    // Variáveis CSS da marca no :root (--marca-*, --neutro-*, --ok-*…), usadas por tokens.css e platform.css
    plugin(({ addBase }) => addBase({ ':root': marca.variaveis() })),
  ]
}
