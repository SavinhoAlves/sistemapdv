const { verificarLicenca } = require('../services/licenca.service')

// Bloqueia a API quando a licença está ausente, expirada ou com assinatura inválida.
// Em erro inesperado (ex.: falha transitória de banco) libera a requisição —
// a rota em si vai falhar de qualquer forma se o banco estiver fora.
async function exigirLicenca(req, res, next) {
  try {
    const lic = await verificarLicenca()

    if (lic.valida) return next()

    const motivo = lic.semLicenca
      ? 'Sistema sem licença ativa'
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
