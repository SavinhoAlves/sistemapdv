const net = require('net')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { Jimp } = require('jimp')

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
  alto(on) { // altura dupla, largura normal — preserva as colunas
    this.partes.push(Buffer.from([GS, 0x21, on ? 0x01 : 0x00]))
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
  // Insere um bloco de imagem raster (GS v 0) já convertido — ver logoParaRasterEscPos
  imagem(rasterBuffer) {
    if (rasterBuffer) this.partes.push(rasterBuffer)
    return this
  }
  buffer() { return Buffer.concat(this.partes) }
}

// ============================================================
// Logo em bitmap (ESC/POS não imprime <img>, só matriz de pontos)
// Converte o PNG/JPEG salvo em Configurações para o comando de
// imagem raster GS v 0, no mesmo número de pontos da bobina.
// ============================================================

function larguraPontos(largura) {
  return Number(largura) === 58 ? 384 : 576 // 203dpi: 58mm≈384pt, 80mm≈576pt
}

async function logoParaRasterEscPos(logoBase64, largura) {
  if (!logoBase64) return null
  try {
    const base64 = logoBase64.includes(',') ? logoBase64.split(',')[1] : logoBase64
    const buffer = Buffer.from(base64, 'base64')
    const origem = await Jimp.read(buffer)

    const larguraPx = larguraPontos(largura)
    const alturaMaxPx = 160 // ~20mm a 203dpi — evita gastar bobina com logo gigante
    origem.scaleToFit({ w: larguraPx, h: alturaMaxPx })

    // Funde num fundo branco opaco (a térmica não entende transparência)
    // e centraliza horizontalmente, como o resto do cupom
    const canvas = new Jimp({ width: larguraPx, height: origem.bitmap.height, color: 0xffffffff })
    const x = Math.round((larguraPx - origem.bitmap.width) / 2)
    canvas.blit({ src: origem, x, y: 0 })
    // normalize() estica o contraste para a faixa real de tons da logo —
    // sem isso, logos claras/pastel (cinza médio bem próximo do branco)
    // saem quase invisíveis, já que a térmica só imprime preto ou nada
    canvas.greyscale().normalize()

    const widthBytes = larguraPx / 8 // 384 e 576 já são múltiplos de 8
    const altura = canvas.bitmap.height

    // Threshold simples perderia cores de tom médio (ex: laranja da marca
    // vira um cinza médio ~144, mais claro que o corte de 128 e some do
    // cupom). Dithering Floyd-Steinberg difunde o "erro" de arredondamento
    // para os vizinhos, então tons médios viram uma trama de pontos em vez
    // de simplesmente desaparecer.
    const cinza = new Float32Array(larguraPx * altura)
    canvas.scan(0, 0, larguraPx, altura, (xx, yy, idx) => {
      cinza[yy * larguraPx + xx] = canvas.bitmap.data[idx]
    })

    const dados = Buffer.alloc(widthBytes * altura)
    for (let yy = 0; yy < altura; yy++) {
      for (let xx = 0; xx < larguraPx; xx++) {
        const i = yy * larguraPx + xx
        const antigo = cinza[i]
        const escuro = antigo < 128
        if (escuro) {
          const byteIdx = yy * widthBytes + (xx >> 3)
          dados[byteIdx] |= (0x80 >> (xx & 7))
        }
        const erro = antigo - (escuro ? 0 : 255)
        if (xx + 1 < larguraPx) cinza[i + 1] += erro * 7 / 16
        if (yy + 1 < altura) {
          if (xx > 0) cinza[i - 1 + larguraPx] += erro * 3 / 16
          cinza[i + larguraPx] += erro * 5 / 16
          if (xx + 1 < larguraPx) cinza[i + 1 + larguraPx] += erro * 1 / 16
        }
      }
    }

    const xL = widthBytes & 0xff, xH = (widthBytes >> 8) & 0xff
    const yL = altura & 0xff, yH = (altura >> 8) & 0xff

    return Buffer.concat([
      Buffer.from([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]),
      dados
    ])
  } catch (err) {
    console.error('[IMPRESSAO] Falha ao converter logo para impressão termica:', err.message)
    return null
  }
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

// Impressora instalada no Windows: envia RAW direto ao spooler pelo nome
// da impressora (não precisa estar compartilhada). Caminhos UNC (\\pc\nome)
// continuam funcionando via copy /b para impressoras de outra máquina.
function enviarWindows(buffer, impressora) {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), `pdv-print-${Date.now()}.bin`)
    fs.writeFileSync(tmp, buffer)

    if (impressora.startsWith('\\\\')) {
      execFile('cmd.exe', ['/c', 'copy', '/b', tmp, impressora], (err, _out, stderr) => {
        fs.unlink(tmp, () => {})
        if (err) {
          return reject(new Error(
            `Falha ao imprimir em "${impressora}". Verifique se o compartilhamento existe e está acessível. ${stderr || err.message}`
          ))
        }
        resolve()
      })
      return
    }

    const script = path.join(__dirname, '..', '..', 'scripts', 'print-raw.ps1')
    execFile('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', script, '-PrinterName', impressora, '-FilePath', tmp
    ], (err, _out, stderr) => {
      fs.unlink(tmp, () => {})
      if (err) {
        return reject(new Error(
          `Falha ao imprimir em "${impressora}". Confira se o nome é exatamente o da impressora instalada no Windows. ${stderr || err.message}`
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
    if (!config.impressora_host) throw new Error('Informe o nome da impressora instalada no Windows nas configurações')
    return enviarWindows(buffer, config.impressora_host)
  }
  throw new Error('Impressão direta desativada — o tipo configurado é "navegador"')
}

// ============================================================
// Cupom de teste
// ============================================================

function montarCupomTeste(config, logoRaster) {
  const c = new CupomEscPos(Number(config.impressora_largura) || 80)
  c.alinhar(1).imagem(logoRaster)
  c.duplo(true).linha(config.nome_restaurante || 'Restaurante PDV').duplo(false)
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

// ============================================================
// Fichas de produto (caixa e reimpressão da mesa)
// Uma ficha por unidade × cópias configuradas, com corte entre elas.
// ============================================================

function montarFichas(config, { itens, info, codigo }, logoRaster) {
  const copias = Math.max(1, Number(config.impressora_copias) || 1)
  const c = new CupomEscPos(Number(config.impressora_largura) || 80)
  for (const item of itens) {
    const unidades = Math.max(1, Number(item.quantidade) || 1)
    for (let u = 0; u < unidades; u++) {
      for (let k = 0; k < copias; k++) {
        c.alinhar(1)
        c.imagem(logoRaster)
        c.negrito(true).linha(config.nome_restaurante || 'Restaurante PDV').negrito(false)
        if (info) c.linha(info)
        c.separador()
        c.duplo(true).negrito(true).linha(String(item.nome).toUpperCase()).negrito(false).duplo(false)
        c.separador()
        if (codigo) c.linha(codigo)
        c.linha(config.mensagem_ficha || 'Obrigado pela preferencia!')
        c.cortar()
      }
    }
  }
  return c.buffer()
}

// ============================================================
// Conta da mesa
// ============================================================

function dinheiro(v) {
  return 'R$ ' + Number(v || 0).toFixed(2).replace('.', ',')
}

function montarConta(config, conta, logoRaster) {
  const c = new CupomEscPos(Number(config.impressora_largura) || 80)
  c.alinhar(1)
  c.imagem(logoRaster)
  c.duplo(true).linha(config.nome_restaurante || 'Restaurante PDV').duplo(false)
  c.negrito(true).linha('CONTA DA MESA').negrito(false)
  c.linha(`${conta.mesa || ''}  ${new Date().toLocaleString('pt-BR')}`.trim())
  c.alinhar(0).separador()
  for (const item of conta.itens || []) {
    c.parQuantia(`${item.quantidade}x ${item.nome}`, dinheiro(item.total))
  }
  c.separador()
  c.negrito(true).parQuantia('Subtotal', dinheiro(conta.subtotal)).negrito(false)
  for (const a of conta.abatimentos || []) {
    c.parQuantia(a.motivo || 'Abatimento', '-' + dinheiro(a.valor))
  }
  if (Number(conta.taxa_pct) > 0) {
    c.parQuantia(`Taxa de servico (${conta.taxa_pct}%)`, '+' + dinheiro(conta.taxa_valor))
  }
  if (Number(conta.pago) > 0) {
    c.parQuantia('Ja pago', '-' + dinheiro(conta.pago))
  }
  c.separador()
  c.negrito(true).alto(true).parQuantia('TOTAL', dinheiro(conta.restante)).alto(false).negrito(false)
  c.pular()
  c.alinhar(1).linha(config.mensagem_ficha || 'Obrigado pela preferencia!')
  c.cortar()
  return c.buffer()
}

// ============================================================
// Resumo de fechamento de caixa
// ============================================================

function dataHora(v) {
  const d = v ? new Date(v) : new Date()
  return isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

function montarFechamento(config, resumo, logoRaster) {
  const { caixa, totais, porMetodo, vendas } = resumo
  const c = new CupomEscPos(Number(config.impressora_largura) || 80)

  c.alinhar(1)
  c.imagem(logoRaster)
  c.duplo(true).linha(config.nome_restaurante || 'Restaurante PDV').duplo(false)
  c.negrito(true).linha('FECHAMENTO DE CAIXA').negrito(false)
  c.linha(`Caixa #${caixa.id}`)
  c.alinhar(0).separador()
  c.parQuantia('Abertura', dataHora(caixa.data_abertura))
  c.parQuantia('Fechamento', dataHora(caixa.fechado_em))
  if (caixa.operador) c.parQuantia('Aberto por', caixa.operador)
  if (caixa.fechado_por_nome) c.parQuantia('Fechado por', caixa.fechado_por_nome)
  c.separador()
  c.parQuantia('Saldo inicial', dinheiro(totais.valor_inicial))
  c.parQuantia('Entradas', '+' + dinheiro(totais.total_entradas))
  c.parQuantia('  Suprimentos', '+' + dinheiro(totais.total_suprimentos))
  c.parQuantia('Saidas', '-' + dinheiro(totais.total_saidas))
  c.parQuantia('  Sangrias', '-' + dinheiro(totais.total_sangrias))
  c.parQuantia('  Estornos', '-' + dinheiro(totais.total_estornos))
  c.negrito(true).parQuantia('Saldo final', dinheiro(totais.saldo_atual)).negrito(false)
  c.separador()
  c.negrito(true).linha('VENDAS POR METODO').negrito(false)
  for (const m of porMetodo || []) {
    c.parQuantia(`${m.metodo} (${m.qtd})`, dinheiro(m.total))
  }
  if (vendas) {
    c.parQuantia('Total de vendas', String(vendas.quantidade))
    c.parQuantia('Ticket medio', dinheiro(vendas.ticket_medio))
  }
  c.separador()
  c.negrito(true).linha('CONFERENCIA (DINHEIRO)').negrito(false)
  c.parQuantia('Esperado em gaveta', dinheiro(totais.esperado_dinheiro))
  if (caixa.valor_contado !== null && caixa.valor_contado !== undefined) {
    c.parQuantia('Contado', dinheiro(caixa.valor_contado))
    const dif = Number(caixa.diferenca || 0)
    c.negrito(true).parQuantia('Diferenca', (dif >= 0 ? '+' : '-') + dinheiro(Math.abs(dif))).negrito(false)
  } else {
    c.linha('Fechado sem conferencia')
  }
  if (caixa.observacao_fechamento) {
    c.separador()
    c.linha(`Obs: ${caixa.observacao_fechamento}`)
  }
  c.pular()
  c.alinhar(1).linha(dataHora())
  c.cortar()
  return c.buffer()
}

module.exports = { CupomEscPos, enviarParaImpressora, montarCupomTeste, montarFichas, montarConta, montarFechamento, logoParaRasterEscPos }
