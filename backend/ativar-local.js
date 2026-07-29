// Ativa a licença LOCALMENTE, escrevendo direto na tabela pdv_config — sem
// HTTP, sem certificado e sem depender do IP da máquina (que muda no DHCP).
// Usa a mesma conexão e o mesmo segredo do backend, então a licença gravada
// é aceita por licenca.service.js exatamente como uma ativação normal.
//
// Uso (rodar dentro de backend/):
//   node ativar-local.js "Nome do Cliente" 365      → gera uma chave assinada
//                                                       com o segredo local e ativa
//   node ativar-local.js --chave <base64>           → ativa uma chave já pronta
//                                                       (ex.: gerada no painel central)
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const { pool, query } = require('./src/database/connection')

// Mesmo critério de licenca.service.js: LICENSE_SECRET, caindo em JWT_SECRET
const SEGREDO = process.env.LICENSE_SECRET || process.env.JWT_SECRET

function semAcentos(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function gerarChave(nome, dias) {
  const payload = JSON.stringify({ c: semAcentos(nome), d: Number(dias), s: SEGREDO })
  return Buffer.from(payload, 'utf8').toString('base64')
}

function uso() {
  console.error('Uso: node ativar-local.js "Nome do Cliente" <dias>')
  console.error('  ou: node ativar-local.js --chave <base64>')
  process.exit(1)
}

async function main() {
  if (!SEGREDO) {
    console.error('LICENSE_SECRET/JWT_SECRET não definido no backend/.env')
    process.exit(1)
  }

  const args = process.argv.slice(2)
  let chave

  const idxChave = args.indexOf('--chave')
  if (idxChave !== -1) {
    chave = args[idxChave + 1]
    if (!chave) uso()
  } else {
    const nome = args[0]
    const dias = Number(args[1])
    if (!nome || !dias || dias <= 0) uso()
    chave = gerarChave(nome, dias)
  }

  // Valida igual ao POST /api/sistema/ativar antes de gravar
  let dados
  try {
    dados = JSON.parse(Buffer.from(chave, 'base64').toString('utf8'))
  } catch {
    console.error('Chave inválida ou corrompida')
    process.exit(1)
  }
  if (!dados.c || !dados.d || !dados.s) {
    console.error('Estrutura da chave inválida')
    process.exit(1)
  }
  if (dados.s !== SEGREDO) {
    console.error('Chave não autorizada — o segredo dela não confere com o LICENSE_SECRET deste backend')
    process.exit(1)
  }

  const agora = new Date()
  const vencimento = new Date(agora)
  vencimento.setDate(vencimento.getDate() + Number(dados.d))

  // Substitui qualquer licença anterior (pdv_config guarda uma só linha ativa)
  await query('DELETE FROM pdv_config')
  await query(
    `INSERT INTO pdv_config
       (chave_ativacao, status_licenca, data_ativacao, data_vencimento, ultima_verificacao, host_fingerprint)
     VALUES (?, 'ativado', ?, ?, ?, NULL)`,
    [chave, agora, vencimento, agora]
  )

  console.log(`✓ Licença ativada para "${dados.c}"`)
  console.log(`  Válida até ${vencimento.toISOString().slice(0, 10)} (${dados.d} dias)`)
  console.log(`  Gravada em pdv_config — reinicie o backend ou aguarde ~1min (cache de licença) para refletir.`)
  await pool.end()
}

main().catch(err => {
  console.error('Erro ao ativar:', err.message)
  process.exit(1)
})
