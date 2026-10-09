import { prisma, semEscopoDeTenant } from '../lib/prisma'
import { invalidateTenantCache } from '../middlewares/tenant.middleware'

const INTERVALO_MS = 60 * 60 * 1000 // 1 hora

export function verificarLicencas(): Promise<void> {
  return semEscopoDeTenant(verificarLicencasSemEscopo)
}

async function verificarLicencasSemEscopo(): Promise<void> {
  const agora = new Date()
  let bloqueados = 0

  // 1. Licenças ativadas cujo prazo expirou
  const vencidas = await prisma.licenca.findMany({
    where: {
      status: 'ativado',
      dataVencimento: { lt: agora },
    },
    include: { tenant: { select: { nome: true, slug: true } } },
  })

  for (const licenca of vencidas) {
    await prisma.licenca.update({
      where: { id: licenca.id },
      data: { status: 'bloqueado' },
    })
    invalidateTenantCache(licenca.tenantId)
    console.log(
      `[Scheduler] Bloqueada por vencimento: ${licenca.tenant.nome} (${licenca.tenant.slug}) — venceu em ${licenca.dataVencimento?.toISOString()}`
    )
    bloqueados++
  }

  // 2. Licenças ativadas de tenants suspensos ou cancelados
  const porStatus = await prisma.licenca.findMany({
    where: {
      status: 'ativado',
      tenant: { status: { in: ['suspenso', 'cancelado'] } },
    },
    include: { tenant: { select: { nome: true, slug: true, status: true } } },
  })

  for (const licenca of porStatus) {
    await prisma.licenca.update({
      where: { id: licenca.id },
      data: { status: 'bloqueado' },
    })
    invalidateTenantCache(licenca.tenantId)
    console.log(
      `[Scheduler] Bloqueada por status do tenant: ${licenca.tenant.nome} (${licenca.tenant.slug}) — status: ${licenca.tenant.status}`
    )
    bloqueados++
  }

  if (bloqueados === 0) {
    console.log('[Scheduler] Verificação concluída — nenhuma licença a bloquear')
  } else {
    console.log(`[Scheduler] ${bloqueados} licença(s) bloqueada(s)`)
  }
}

export function iniciarSchedulerLicencas(): void {
  // Roda imediatamente para capturar licenças que venceram enquanto o servidor estava parado
  verificarLicencas().catch(err =>
    console.error('[Scheduler] Erro na verificação inicial:', err)
  )

  setInterval(() => {
    verificarLicencas().catch(err =>
      console.error('[Scheduler] Erro na verificação periódica:', err)
    )
  }, INTERVALO_MS)

  console.log('[Scheduler] Job de licenças iniciado — verificação a cada 1 hora')
}
