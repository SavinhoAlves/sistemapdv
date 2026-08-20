import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Iniciando seed...')

  // ── Platform Admin ────────────────────────────────────────────────────────
  const adminExistente = await prisma.platformUser.findUnique({
    where: { email: 'admin@pdv.local' },
  })

  if (!adminExistente) {
    await prisma.platformUser.create({
      data: {
        nome: 'Super Admin',
        email: 'admin@pdv.local',
        senhaHash: await bcrypt.hash('admin123', 10),
        role: 'SUPER_ADMIN',
      },
    })
    console.log('Platform Admin criado: admin@pdv.local / admin123')
  }

  // ── Tenant A — Restaurante Tarantela ──────────────────────────────────────
  let tenantA = await prisma.tenant.findUnique({ where: { slug: 'tarantela' } })
  if (!tenantA) {
    tenantA = await prisma.tenant.create({
      data: {
        nome: 'Restaurante Tarantela',
        slug: 'tarantela',
        cnpj: '11.222.333/0001-44',
        status: 'ativo',
      },
    })

    // Admin do Tenant A
    const senhaHash = await bcrypt.hash('123456', 10)
    await prisma.usuario.create({
      data: {
        tenantId: tenantA.id,
        nome: 'Administrador Tarantela',
        email: 'admin@tarantela.com',
        senhaHash,
        cargo: 'administrador',
        ativo: true,
      },
    })

    // Dados de exemplo: categorias e produtos
    const catA = await prisma.categoria.create({
      data: { tenantId: tenantA.id, nome: 'Pratos Principais', vaiCozinha: true },
    })
    await prisma.produto.createMany({
      data: [
        { tenantId: tenantA.id, nome: 'Filé à Parmegiana', preco: 45.90, categoriaId: catA.id, ativo: true },
        { tenantId: tenantA.id, nome: 'Risoto de Cogumelos', preco: 38.50, categoriaId: catA.id, ativo: true },
      ],
    })

    // Métodos de pagamento
    await prisma.metodoPagamento.createMany({
      data: [
        { tenantId: tenantA.id, nome: 'Dinheiro', ativo: true },
        { tenantId: tenantA.id, nome: 'Cartão Débito', ativo: true },
        { tenantId: tenantA.id, nome: 'Cartão Crédito', ativo: true },
        { tenantId: tenantA.id, nome: 'PIX', ativo: true },
      ],
    })

    // Mesas
    await prisma.mesa.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        tenantId: tenantA.id,
        numero: i + 1,
        capacidade: 4,
        status: 'livre' as const,
      })),
    })

    // Configurações
    await prisma.configuracoes.create({
      data: {
        tenantId: tenantA.id,
        nomeRestaurante: 'Restaurante Tarantela',
        taxaServicoPct: 10,
        modoVenda: 'mesa',
      },
    })

    console.log('Tenant A criado: Restaurante Tarantela (slug: tarantela)')
    console.log('   Login: admin@tarantela.com / 123456')
  }

  // ── Tenant B — Sabor Italiano ─────────────────────────────────────────────
  let tenantB = await prisma.tenant.findUnique({ where: { slug: 'sabor-italiano' } })
  if (!tenantB) {
    tenantB = await prisma.tenant.create({
      data: {
        nome: 'Sabor Italiano',
        slug: 'sabor-italiano',
        cnpj: '55.666.777/0001-88',
        status: 'ativo',
      },
    })

    const senhaHash = await bcrypt.hash('123456', 10)
    await prisma.usuario.create({
      data: {
        tenantId: tenantB.id,
        nome: 'Administrador Sabor Italiano',
        email: 'admin@saboritaliano.com',
        senhaHash,
        cargo: 'administrador',
        ativo: true,
      },
    })

    const catB = await prisma.categoria.create({
      data: { tenantId: tenantB.id, nome: 'Massas', vaiCozinha: true },
    })
    await prisma.produto.createMany({
      data: [
        { tenantId: tenantB.id, nome: 'Espaguete à Bolonhesa', preco: 32.00, categoriaId: catB.id, ativo: true },
        { tenantId: tenantB.id, nome: 'Lasanha da Casa', preco: 35.00, categoriaId: catB.id, ativo: true },
      ],
    })

    await prisma.metodoPagamento.createMany({
      data: [
        { tenantId: tenantB.id, nome: 'Dinheiro', ativo: true },
        { tenantId: tenantB.id, nome: 'PIX', ativo: true },
      ],
    })

    await prisma.mesa.createMany({
      data: Array.from({ length: 8 }, (_, i) => ({
        tenantId: tenantB.id,
        numero: i + 1,
        capacidade: 4,
        status: 'livre' as const,
      })),
    })

    await prisma.configuracoes.create({
      data: {
        tenantId: tenantB.id,
        nomeRestaurante: 'Sabor Italiano',
        taxaServicoPct: 0,
        modoVenda: 'mesa',
      },
    })

    console.log('Tenant B criado: Sabor Italiano (slug: sabor-italiano)')
    console.log('   Login: admin@saboritaliano.com / 123456')
  }

  console.log('Seed concluido!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
