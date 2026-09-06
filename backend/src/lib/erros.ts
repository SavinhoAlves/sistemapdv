import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'

/**
 * Tratador de erros central.
 *
 * Antes cada rota repetia o mesmo bloco:
 *
 *     catch (err: any) {
 *       if (err.status === 404) return reply.status(404).send({ error: err.message })
 *       if (err.status === 400) return reply.status(400).send({ error: err.message })
 *       throw err
 *     }
 *
 * Em algumas rotas o `if` de 409 faltava, então conflitos de negócio viravam
 * 500 e o frontend mostrava "Erro 500" no lugar de "Estoque insuficiente".
 * Aqui a tradução acontece num lugar só, e as rotas ficam com a regra.
 */

interface ErroDeNegocio extends Error {
  status?: number
  code?: string
  [extra: string]: unknown
}

export function registrarTratadorDeErros(app: FastifyInstance) {
  app.setErrorHandler(
    (erro: FastifyError | ErroDeNegocio, request: FastifyRequest, reply: FastifyReply) => {
      const e = erro as ErroDeNegocio

      // Erro de negócio lançado pelos services: Object.assign(new Error(...), { status })
      if (typeof e.status === 'number' && e.status >= 400 && e.status < 500) {
        const corpo: Record<string, unknown> = { error: e.message }
        // Campos extras que o service anexou (ex.: `restante`, `comandas`)
        for (const chave of Object.keys(e)) {
          if (!['status', 'message', 'stack', 'name', 'code'].includes(chave)) {
            corpo[chave] = e[chave]
          }
        }
        return reply.status(e.status).send(corpo)
      }

      if (erro instanceof ZodError) {
        return reply.status(400).send({ error: erro.issues[0]?.message ?? 'Dados inválidos' })
      }

      // Erros conhecidos do Prisma, traduzidos para linguagem de operação.
      switch (e.code) {
        case 'P2002':
          return reply.status(409).send({ error: 'Registro duplicado' })
        case 'P2025':
          return reply.status(404).send({ error: 'Registro não encontrado' })
        case 'P2003':
          return reply.status(409).send({ error: 'Registro em uso por outro cadastro' })
        case 'P2034':
          // Conflito de serialização — as transações Serializable de pagamento
          // e sangria podem bater. É seguro repetir.
          return reply
            .status(409)
            .send({ error: 'Operação concorrente. Tente novamente.', repetivel: true })
      }

      // Violação de CHECK do banco (estoque negativo, valor negativo).
      if (typeof e.message === 'string' && e.message.includes('produtos_estoque_nao_negativo')) {
        return reply.status(409).send({ error: 'Estoque insuficiente' })
      }

      // Erros de validação do próprio Fastify (schema, body malformado).
      const statusFastify = (erro as FastifyError).statusCode
      if (statusFastify && statusFastify < 500) {
        return reply.status(statusFastify).send({ error: erro.message })
      }

      // Daqui para baixo é falha nossa. Loga inteiro, devolve genérico —
      // mensagem de exceção não vai para a tela do operador.
      request.log.error({ err: erro, url: request.url, method: request.method })
      return reply.status(500).send({ error: 'Erro interno. Se persistir, chame o suporte.' })
    },
  )

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({ error: `Rota não encontrada: ${request.method} ${request.url}` })
  })
}
