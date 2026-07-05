const net = require('net')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')

// ============================================================
// ESC/POS genérico — subconjunto suportado por praticamente
// todas as térmicas (Epson, Elgin, Bematech, Tanca, genéricas).
// Acentos são removidos para não depender de code page do modelo.
// ============================================================

const ESC = 0x1b
const GS = 0x1d

function semAcentos(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '')
}

class CupomEscPos {
  constructor(largura = 80) {
    this.colunas = largura === 58 ? 32 : 48
    this.partes = [Buffer.from([ESC, 0x40])] // init
  }
  _txt(s) { this.partes.push(Buffer.from(semAcentos(s) + '\n', 'ascii')) }
  alinhar(modo) { // 0 esq, 1 centro, 2 dir
    this.partes.push(Buffer.from([ESC, 0x61, modo]))
    return this
  }
  negrito(on) {
    this.partes.push(Buffer.from([ESC, 0x45, on ? 1 : 0]))
    return this
  }
  duplo(on) {
    this.partes.push(Buffer.from([GS, 0x21, on ? 0x11 : 0x00]))
    return this
  }
  linha(s = '') { this._txt(s); return this }
  separador() { this._txt('-'.repeat(this.colunas)); return this }
  parQuantia(esq, dir) {
    const e = semAcentos(esq), d = semAcentos(dir)
    const espacos = Math.max(1, this.colunas - e.length - d.length)
    this._txt(e + ' '.repeat(espacos) + d)
    return this
  }
  pular(n = 1) { this.partes.push(Buffer.from('\n'.repeat(n), 'ascii')); return this }
  cortar() {
    this.partes.push(Buffer.from('\n\n\n', 'ascii'))
    this.partes.push(Buffer.from([GS, 0x56, 0x42, 0x00])) // corte parcial
    return this
  }
  buffer() { return Buffer.concat(this.partes) }
}

// ============================================================
// Transportes
// ============================================================

function enviarRede(buffer, host, porta = 9100) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    socket.setTimeout(5000)
    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error(`Sem resposta da impressora em ${host}:${porta} (timeout de 5s)`))
    })
    socket.on('error', err => {
      reject(new Error(`Falha ao conectar na impressora ${host}:${porta} — ${err.code || err.message}`))
    })
    socket.connect(porta, host, () => {
      socket.end(buffer, () => resolve())
    })
  })
}

// Impressora USB compartilhada no Windows (nome do compartilhamento)
function enviarWindows(buffer, compartilhamento) {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), `pdv-print-${Date.now()}.bin`)
    fs.writeFileSync(tmp, buffer)
    const destino = compartilhamento.startsWith('\\\\')
      ? compartilhamento
      : `\\\\localhost\\${compartilhamento}`
    execFile('cmd.exe', ['/c', 'copy', '/b', tmp, destino], (err, _out, stderr) => {
      fs.unlink(tmp, () => {})
      if (err) {
        return reject(new Error(
          `Falha ao imprimir em "${destino}". A impressora precisa estar compartilhada no Windows. ${stderr || err.message}`
        ))
      }
      resolve()
    })
  })
}

async function enviarParaImpressora(buffer, config) {
  if (config.impressora_tipo === 'rede') {
    if (!config.impressora_host) throw new Error('Informe o IP da impressora de rede nas configurações')
    return enviarRede(buffer, config.impressora_host, Number(config.impressora_porta) || 9100)
  }
  if (config.impressora_tipo === 'windows') {
    if (!config.impressora_host) throw new Error('Informe o nome do compartilhamento da impressora nas configurações')
    return enviarWindows(buffer, config.impressora_host)
  }
  throw new Error('Impressão direta desativada — o tipo configurado é "navegador"')
}

// ============================================================
// Cupom de teste
// ============================================================

function montarCupomTeste(config) {
  const c = new CupomEscPos(Number(config.impressora_largura) || 80)
  c.alinhar(1).duplo(true).linha(config.nome_restaurante || 'Restaurante PDV').duplo(false)
  c.linha('TESTE DE IMPRESSAO').pular()
  c.alinhar(0).separador()
  c.parQuantia('Data', new Date().toLocaleString('pt-BR'))
  c.parQuantia('Largura', `${config.impressora_largura || 80}mm`)
  c.parQuantia('Conexao', config.impressora_tipo === 'rede'
    ? `${config.impressora_host}:${config.impressora_porta || 9100}`
    : String(config.impressora_host || ''))
  c.separador()
  c.negrito(true).parQuantia('ITEM DE EXEMPLO 1x', 'R$ 10,00').negrito(false)
  c.separador()
  c.alinhar(1).linha(config.mensagem_ficha || 'Obrigado pela preferencia!')
  c.linha('Se este cupom saiu legivel,')
  c.linha('a impressora esta pronta!')
  c.cortar()
  return c.buffer()
}

module.exports = { CupomEscPos, enviarParaImpressora, montarCupomTeste }
