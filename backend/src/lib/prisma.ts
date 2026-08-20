import { PrismaClient } from '@prisma/client'
import { AsyncLocalStorage } from 'async_hooks'

export const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>()

// Models que pertencem a um tenant e devem ser filtrados automaticamente
const TENANT_SCOPED_MODELS = new Set([
  'usuario',
  'perfil',
  'categoria',
  'produto',
  'metodoPagamento',
  'mesa',
  'pedido',
  'pedidoItem',
  'caixa',
  'movimentoCaixa',
  'pagamento',
  'auditoria',
  'configuracoes',
  'movimentacaoEstoque',
  'dispositivo',
  'licenca',
])

const READ_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findUnique',
  'findUniqueOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])

const WRITE_OPERATIONS = new Set([
  'create',
  'createMany',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
])

function buildPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args: _args, query }) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args = _args as any
          const modelKey = model ? model.charAt(0).toLowerCase() + model.slice(1) : ''

          if (!TENANT_SCOPED_MODELS.has(modelKey)) {
            return query(args)
          }

          const store = tenantStorage.getStore()
          if (!store?.tenantId) {
            return query(args)
          }

          const { tenantId } = store

          // Injetar tenantId em operações de leitura
          if (READ_OPERATIONS.has(operation)) {
            args.where = { tenantId, ...(args.where ?? {}) }
          }

          // Injetar tenantId em operações de escrita
          if (operation === 'create') {
            args.data = { tenantId, ...args.data }
          }

          if (operation === 'createMany') {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d: any) => ({ tenantId, ...d }))
            }
          }

          if (operation === 'update' || operation === 'updateMany') {
            args.where = { tenantId, ...(args.where ?? {}) }
          }

          if (operation === 'upsert') {
            args.where  = { tenantId, ...args.where }
            args.create = { tenantId, ...args.create }
          }

          if (operation === 'delete' || operation === 'deleteMany') {
            args.where = { tenantId, ...(args.where ?? {}) }
          }

          return query(args)
        },
      },
    },
  })
}

export const prisma = buildPrismaClient()

export type ExtendedPrismaClient = ReturnType<typeof buildPrismaClient>
