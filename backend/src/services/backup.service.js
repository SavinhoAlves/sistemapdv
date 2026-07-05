const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../../backups')
const MYSQLDUMP = process.env.MYSQLDUMP_PATH
  || 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe'
const RETENCAO = Number(process.env.BACKUP_RETENCAO) || 30
const HORA_BACKUP = 3 // 03:00 da manhã

function executarBackup() {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })

    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19)
    const arquivo = path.join(BACKUP_DIR, `backup-${stamp}.sql.gz`)

    const dump = spawn(MYSQLDUMP, [
      `--host=${process.env.DB_HOST || 'localhost'}`,
      `--port=${process.env.DB_PORT || 3306}`,
      `--user=${process.env.DB_USER || 'root'}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      process.env.DB_NAME || 'restaurante_pdv'
    ], {
      // Senha via variável de ambiente para não expor na linha de comando
      env: { ...process.env, MYSQL_PWD: process.env.DB_PASSWORD || '' }
    })

    const gzip = zlib.createGzip()
    const saida = fs.createWriteStream(arquivo)
    dump.stdout.pipe(gzip).pipe(saida)

    let stderr = ''
    dump.stderr.on('data', d => { stderr += d.toString() })

    dump.on('error', err => {
      reject(new Error(`mysqldump não pôde ser executado: ${err.message}`))
    })

    // Espera o processo terminar (código de saída) E o arquivo terminar de gravar
    let codigoSaida = null
    let processoTerminou = false
    let arquivoGravado = false

    function finalizar() {
      if (!processoTerminou || !arquivoGravado) return
      if (codigoSaida !== 0) {
        fs.unlink(arquivo, () => {})
        return reject(new Error(`mysqldump falhou (código ${codigoSaida}): ${stderr.slice(0, 300)}`))
      }
      aplicarRetencao()
      const { size } = fs.statSync(arquivo)
      console.log(`[BACKUP] Gerado: ${path.basename(arquivo)} (${(size / 1024).toFixed(1)} KB)`)
      resolve({ arquivo: path.basename(arquivo), tamanho: size })
    }

    dump.on('close', code => {
      codigoSaida = code
      processoTerminou = true
      finalizar()
    })

    saida.on('close', () => {
      arquivoGravado = true
      finalizar()
    })
  })
}

// Mantém apenas os RETENCAO backups mais recentes
function aplicarRetencao() {
  try {
    const arquivos = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-') && f.endsWith('.sql.gz'))
      .sort()
    while (arquivos.length > RETENCAO) {
      const antigo = arquivos.shift()
      fs.unlinkSync(path.join(BACKUP_DIR, antigo))
      console.log(`[BACKUP] Retenção: removido ${antigo}`)
    }
  } catch (err) {
    console.error('[BACKUP] Erro na retenção:', err.message)
  }
}

function listarBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return []
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.sql.gz'))
    .map(f => {
      const { size, mtime } = fs.statSync(path.join(BACKUP_DIR, f))
      return { arquivo: f, tamanho: size, data: mtime }
    })
    .sort((a, b) => b.data - a.data)
}

// Agenda backup diário às 03:00 (e reagenda a cada execução)
function agendarBackupDiario() {
  const agora = new Date()
  const proximo = new Date(agora)
  proximo.setHours(HORA_BACKUP, 0, 0, 0)
  if (proximo <= agora) proximo.setDate(proximo.getDate() + 1)

  const espera = proximo - agora
  console.log(`[BACKUP] Próximo backup automático: ${proximo.toLocaleString('pt-BR')}`)

  setTimeout(() => {
    executarBackup().catch(err => console.error('[BACKUP] Falha no backup automático:', err.message))
    setInterval(() => {
      executarBackup().catch(err => console.error('[BACKUP] Falha no backup automático:', err.message))
    }, 24 * 60 * 60 * 1000)
  }, espera)
}

module.exports = { executarBackup, listarBackups, agendarBackupDiario }
