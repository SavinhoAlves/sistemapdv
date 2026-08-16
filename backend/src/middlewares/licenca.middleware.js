const { verificarLicenca } = require('../services/licenca.service')
const { query }            = require('../database/connection')

// Bloqueia a API quando a licença está ausente, expirada ou com assinatura inválida,
// ou quando a central marcou o cliente como suspenso.
// Em erro inesperado (ex.: falha transitória de banco) libera a requisição —
// a rota em si vai falhar de qualquer forma se o banco estiver fora.
// Rotas de ativação e status são sempre públicas — sem isso o PDV não consegue se ativar
const ROTAS_PUBLICAS = ['/sistema/ativar', '/sistema/status-licenca']

async function exigirLicenca(req, res, next) {
  if (ROTAS_PUBLICAS.some(r => req.path.startsWith(r))) return next()

  try {
    // Suspensão/revogação pela central têm prioridade — verificadas via sync_config
    const syncRows = await query('SELECT suspenso, licenca_bloqueada_remoto FROM sync_config WHERE id = 1').catch(() => [])
    if (syncRows[0]?.suspenso) {
      return res.status(403).json({ error: 'Sistema suspenso pelo suporte', licenca: false, suspenso: true })
    }
    if (syncRows[0]?.licenca_bloqueada_remoto) {
      return res.status(403).json({ error: 'Licença revogada pela central', licenca: false, revogado: true })
    }

    const lic = await verificarLicenca()

    if (lic.valida) return next()

    const motivo = lic.semLicenca
      ? 'Sistema sem licença ativa'
      : lic.bloqueadoRemoto
        ? 'Licença suspensa pelo suporte'
        : lic.expirado
          ? 'Licença expirada'
          : 'Licença inválida'

    return res.status(403).json({ error: motivo, licenca: false })
  } catch (err) {
    console.error('[LICENÇA] Erro na verificação:', err.message)
    return next()
  }
}

module.exports = { exigirLicenca }
