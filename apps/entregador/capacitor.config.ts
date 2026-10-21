import type { CapacitorConfig } from '@capacitor/cli'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

// App da equipe (garçom e entregador). Abre a tela /app/acesso do servidor por
// dentro (server.url): ler o QR ou entrar com código e senha, e cada cargo vai
// para a sua tela. Mudanças de tela chegam sem publicar APK novo. O app nativo
// só acrescenta o GPS do entregador em segundo plano
// (@capacitor-community/background-geolocation) e a câmera para ler o QR.
//
// PDV_URL troca o endereço no build (outro domínio ou ambiente de teste).
const serverUrl = process.env.PDV_URL || 'https://app.restaurantepdv.com.br/app/acesso'

// A tela "Sem conexão" (offline.html) roda dentro do app; o botão "Tentar de novo"
// precisa saber o endereço do sistema para voltar a ele.
writeFileSync(join(__dirname, 'www', 'destino.js'), `window.PDV_URL = ${JSON.stringify(serverUrl)}\n`)

const config: CapacitorConfig = {
  appId: 'br.com.restaurantepdv.entregador',
  appName: 'RestaurantePDV',
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
