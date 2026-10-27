import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

/**
 * Instalação no Host (modo local): cria o restaurante, o administrador, as
 * configurações (com o IP do Host) e a licença. Roda uma vez, pelo instalador.
 * Se o restaurante já existir, só atualiza o IP do Host.
 *
 * Variáveis: RESTAURANTE_NOME, ADMIN_LOGIN, ADMIN_SENHA, HOST_IP, LICENCA_DIAS
 */
const prisma = new PrismaClient()

async function main() {
  const nome = (process.env.RESTAURANTE_NOME || 'Restaurante').trim()
  const login = (process.env.ADMIN_LOGIN || 'admin').trim().toLowerCase()
  const senha = process.env.ADMIN_SENHA || ''
  const hostIp = (process.env.HOST_IP || '').trim()
  const dias = Math.max(1, parseInt(process.env.LICENCA_DIAS || '30', 10))

  const existente = await prisma.tenant.findFirst({ where: { slug: 'local' } })
  if (existente) {
    const cfg = await prisma.configuracoes.findFirst({ where: { tenantId: existente.id } })
    if (cfg && hostIp) await prisma.configuracoes.update({ where: { id: cfg.id }, data: { hostIp } })
    console.log(`Restaurante já instalado (${existente.nome}). IP do Host: ${hostIp || 'mantido'}.`)
    return
  }
  if (senha.length < 6) throw new Error('ADMIN_SENHA precisa ter pelo menos 6 caracteres')
  if (!/^[a-z][a-z0-9._-]{2,29}$/.test(login)) throw new Error('ADMIN_LOGIN: minúsculo, começa com letra, 3 a 30 caracteres')

  const tenant = await prisma.tenant.create({ data: { nome, slug: 'local', status: 'ativo' } })
  await prisma.usuario.create({
    data: { tenantId: tenant.id, nome: 'Administrador', login, senhaHash: await bcrypt.hash(senha, 10), cargo: 'administrador', ativo: true },
  })
  await prisma.metodoPagamento.createMany({
    data: ['Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Pix'].map((n) => ({ tenantId: tenant.id, nome: n, ativo: true })),
  })
  await prisma.configuracoes.create({ data: { tenantId: tenant.id, nomeRestaurante: nome, hostIp: hostIp || null } })
  const vence = new Date()
  vence.setDate(vence.getDate() + dias)
  await prisma.licenca.create({ data: { tenantId: tenant.id, status: 'ativado', dataAtivacao: new Date(), dataVencimento: vence } })

  console.log(`Restaurante "${nome}" criado. Login do administrador: ${login}. Licença até ${vence.toLocaleDateString('pt-BR')}.`)
}

main()
  .catch((e) => { console.error(e?.message ?? e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
