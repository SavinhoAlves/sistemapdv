const { query } = require('../database/connection')

// Usa LICENSE_SECRET se definido, caso contrário cai no JWT_SECRET para compatibilidade
const SEGREDO = process.env.LICENSE_SECRET || process.env.JWT_SECRET

// Cache curto para não consultar o banco a cada requisição
const CACHE_TTL = 60 * 1000
let cache = null // { ts, resultado }

function decodificarChave(chave) {
  try {
    return JSON.parse(Buffer.from(chave, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

async function verificarLicenca(forcar = false) {
  const agora = Date.now()
  if (!forcar && cache && agora - cache.ts < CACHE_TTL) {
    return cache.resultado
  }

  const rows = await query(
    `SELECT * FROM pdv_config ORDER BY data_ativacao DESC LIMIT 1`
  )

  // Suspensão remota (painel central de suporte, via sync periódico) — cache
  // local em sync_config, atualizado por sync.service.js. Sem linha ainda
  // (sync nunca rodou) conta como não-bloqueado, fail-open igual ao resto
  // do mecanismo de sync.
  const [syncCfg] = await query(
    `SELECT licenca_bloqueada_remoto FROM sync_config WHERE id = 1`
  )
  const bloqueadoRemoto = !!syncCfg?.licenca_bloqueada_remoto

  let resultado
  if (!rows.length) {
    resultado = {
      valida: false,
      semLicenca: true,
      expirado: false,
      assinaturaInvalida: false,
      bloqueadoRemoto,
      licenca: null,
      dados: null
    }
  } else {
    const lic = rows[0]
    const dados = decodificarChave(lic.chave_ativacao)
    const assinaturaInvalida = !dados || !dados.s || dados.s !== SEGREDO
    const expirado = new Date(lic.data_vencimento) < new Date()

    resultado = {
      valida: !assinaturaInvalida && !expirado && !bloqueadoRemoto,
      semLicenca: false,
      expirado,
      assinaturaInvalida,
      bloqueadoRemoto,
      licenca: lic,
      dados
    }
  }

  cache = { ts: agora, resultado }
  return resultado
}

function limparCacheLicenca() {
  cache = null
}

module.exports = { verificarLicenca, limparCacheLicenca, decodificarChave, SEGREDO }
