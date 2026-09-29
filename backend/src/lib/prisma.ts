import { PrismaClient } from '@prisma/client'
import { AsyncLocalStorage } from 'async_hooks'

/**
 * Escopo automático de tenant.
 *
 * Três correções em relação à versão anterior:
 *
 * 1. A extensão era um NO-OP. `withTenantContext` nunca era chamado em lugar
 *    nenhum, então `tenantStorage.getStore()` sempre devolvia undefined e a
 *    extensão retornava `query(args)` sem tocar em nada. Agora o contexto é
 *    instalado por um hook global em app.ts (ver `tenantContextHook`).
 *
 * 2. A ordem do spread estava invertida:
 *        args.where = { tenantId, ...args.where }   ← where do chamador VENCE
 *    Bastava um `tenantId` chegar via query string até um `where` para anular
 *    a proteção. Agora o tenantId é aplicado por último e sempre vence.
 *
 * 3. `findUnique` com tenantId no where faz o Prisma lançar erro, porque
 *    tenantId não compõe índice único isolado. Essas operações são convertidas
 *    para a variante `findFirst`, que aceita filtro livre.
 */

export const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>()

/** Executa `fn` com o tenant fixado no contexto assíncrono. */
export function comTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run({ tenantId }, fn)
}

/** Escapatória explícita, para jobs e rotas de plataforma que cruzam tenants. */
export function semEscopoDeTenant<T>(fn: () => Promise<T>): Promise<T> {
  return tenantStorage.run({ tenantId: '' }, fn)
}

const MODELOS_COM_TENANT = new Set([
  'usuario',
  'perfil',
  'categoria',
  'produto',
  'metodoPagamento',
  'mesa',
  'comanda',
  'pedido',
  'pedidoItem',
  'caixa',
  'movimentoCaixa',
  'pagamento',
  'abatimento',
  'auditoria',
  'configuracoes',
  'impressora',
  'movimentacaoEstoque',
  'dispositivo',
  'licenca',
])

const LEITURAS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])

function buildPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args: _args, query }) {
          const args = _args as any
          const chave = model ? model.charAt(0).toLowerCase() + model.slice(1) : ''

          if (!MODELOS_COM_TENANT.has(chave)) return query(args)

          const tenantId = tenantStorage.getStore()?.tenantId
          if (tenantId === undefined) {
            // Sem contexto instalado. Em produção isso é sinal de rota que
            // esqueceu o hook — falhar alto é mais seguro que vazar dados.
            if (process.env.NODE_ENV === 'production') {
              throw new Error(
                `Consulta em "${chave}" sem contexto de tenant. ` +
                  `Use comTenant() ou semEscopoDeTenant() explicitamente.`,
              )
            }
            console.warn(`[tenant] ${chave}.${operation} rodou sem contexto`)
            return query(args)
          }

          // Escapatória explícita.
          if (tenantId === '') return query(args)

          // findUnique não aceita campo não-único no where.
          // Converte para findFirst, que aceita.
          if (operation === 'findUnique' || operation === 'findUniqueOrThrow') {
            const alvo = operation === 'findUnique' ? 'findFirst' : 'findFirstOrThrow'
            return (client as any)[chave][alvo]({
              ...args,
              where: { ...(args.where ?? {}), tenantId },
            })
          }

          // tenantId aplicado POR ÚLTIMO — sempre vence o where do chamador.
          if (LEITURAS.has(operation)) {
            args.where = { ...(args.where ?? {}), tenantId }
          }

          if (operation === 'create') {
            args.data = { ...args.data, tenantId }
          }

          if (operation === 'createMany') {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d: any) => ({ ...d, tenantId }))
            } else {
              args.data = { ...args.data, tenantId }
            }
          }

          if (operation === 'update' || operation === 'updateMany') {
            args.where = { ...(args.where ?? {}), tenantId }
          }

          if (operation === 'upsert') {
            args.where = { ...(args.where ?? {}), tenantId }
            args.create = { ...args.create, tenantId }
          }

          if (operation === 'delete' || operation === 'deleteMany') {
            args.where = { ...(args.where ?? {}), tenantId }
          }

          return query(args)
        },
      },
    },
  })
}

export const prisma = buildPrismaClient()
export type ExtendedPrismaClient = ReturnType<typeof buildPrismaClient>
