import type { CapacitorConfig } from '@capacitor/cli'

// App do entregador. Abre a tela /app/entregador do servidor por dentro (server.url):
// mudanças de tela chegam sem publicar APK novo. O app nativo só acrescenta o GPS
// em segundo plano (@capacitor-community/background-geolocation), que a página
// chama pelo Capacitor injetado.
//
// PDV_URL troca o endereço no build (outro domínio ou ambiente de teste).
const serverUrl = process.env.PDV_URL || 'https://app.restaurantepdv.com.br/app/entregador'

const config: CapacitorConfig = {
  appId: 'br.com.restaurantepdv.entregador',
  appName: 'PDV Entregador',
  webDir: 'www',
  backgroundColor: '#0e1119',
  server: {
    url: serverUrl,
    // Só o PDV abre dentro do app; mapas, WhatsApp e telefone vão para os apps do celular.
    allowNavigation: [new URL(serverUrl).hostname],
    errorPath: 'offline.html',
  },
}

export default config
