import type { FastifyInstance } from 'fastify'
import { requireTenant } from '../../middlewares/tenant.middleware'
import { requirePermissao } from '../../middlewares/permission.middleware'
import type { TenantJwtPayload } from '../../lib/jwt'
import * as Service from './produtos.service'
import { prisma } from '../../lib/prisma'

/**
 * A categoria é obrigatória: é ela que diz se o item vai para a cozinha
 * (Categoria.vaiCozinha). Confere também que é deste restaurante.
 */
/** Exceção do produto à categoria: categoria (segue), sempre ou nunca vai para a cozinha. */
/** Foto do produto: imagem reduzida no navegador (data URL até ~300 KB) ou link https; vazio = sem foto. */
function imagemInvalida(v: unknown): string | null {
  if (v === undefined || v === null || v === '') return null
  if (typeof v !== 'string') return 'Imagem inválida'
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) return v.length <= 400_000 ? null : 'Imagem grande demais (máx. ~300 KB)'
  if (/^https:\/\/\S+$/.test(v) && v.length <= 1000) return null
  return 'Imagem inválida: envie uma foto ou um link https'
}
const envioValido = (v: unknown) => (v === 'categoria' || v === 'sempre' || v === 'nunca' ? v : undefined)

async function categoriaInvalida(categoriaId: unknown): Promise<string | null> {
  if (typeof categoriaId !== 'string' || !categoriaId) return 'Selecione a categoria do produto'
  const existe = await prisma.categoria.findFirst({ where: { id: categoriaId }, select: { id: true } })
  return existe ? null : 'Categoria não encontrada'
}

export async function produtosRoutes(app: FastifyInstance) {
  // GET /api/produtos
  app.get('/', { preHandler: [requireTenant] }, async (request, reply) => {
    return Service.listar(request.tenantId!)
  })

  // POST /api/produtos
  app.post('/', { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] }, async (request, reply) => {
    const body = request.body as any
    if (!body.nome?.trim()) return reply.status(400).send({ error: 'nome é obrigatório' })
    if (body.preco === undefined || body.preco === null) return reply.status(400).send({ error: 'preco é obrigatório' })
    const semCategoria = await categoriaInvalida(body.categoriaId)
    if (semCategoria) return reply.status(400).send({ error: semCategoria })
    const erroImagem = imagemInvalida(body.imagemUrl)
    if (erroImagem) return reply.status(400).send({ error: erroImagem })
    try {
      const produto = await Service.criar(request.tenantId!, {
        nome: body.nome,
        descricao: body.descricao,
        preco: Number(body.preco),
        categoriaId: body.categoriaId,
        imagemUrl: body.imagemUrl === '' ? null : body.imagemUrl,
        tempoPreparoMinutos: body.tempoPreparoMinutos,
        gerenciarEstoque: body.gerenciarEstoque,
        estoqueAtual: body.estoqueAtual !== undefined ? Number(body.estoqueAtual) : undefined,
        estoqueMinimo: body.estoqueMinimo !== undefined ? Number(body.estoqueMinimo) : undefined,
        envioCozinha: envioValido(body.envioCozinha),
      })
      return reply.status(201).send(produto)
    } catch (err: any) {
      if (err.code === 'P2002') return reply.status(409).send({ error: 'Já existe um produto com esse nome' })
      throw err
    }
  })

  // PUT /api/produtos/:id
  app.put('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] }, async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    const auth = request.auth as TenantJwtPayload
    // Na edição a categoria pode ficar como está (ausente), mas não ser tirada
    if (body.categoriaId !== undefined) {
      const semCategoria = await categoriaInvalida(body.categoriaId)
      if (semCategoria) return reply.status(400).send({ error: semCategoria })
    }
    const erroImagem = imagemInvalida(body.imagemUrl)
    if (erroImagem) return reply.status(400).send({ error: erroImagem })
    try {
      const produto = await Service.atualizar(
        request.tenantId!,
        id,
        {
          nome: body.nome,
          descricao: body.descricao,
          preco: body.preco !== undefined ? Number(body.preco) : undefined,
          categoriaId: body.categoriaId,
          imagemUrl: body.imagemUrl === '' ? null : body.imagemUrl,
          tempoPreparoMinutos: body.tempoPreparoMinutos,
          gerenciarEstoque: body.gerenciarEstoque,
          estoqueAtual: body.estoqueAtual !== undefined ? Number(body.estoqueAtual) : undefined,
          estoqueMinimo: body.estoqueMinimo !== undefined ? Number(body.estoqueMinimo) : undefined,
          ativo: body.ativo,
          envioCozinha: envioValido(body.envioCozinha),
        },
        auth.sub,
      )
      return produto
    } catch (err: any) {
      if (err.code === 'P2025') return reply.status(404).send({ error: 'Produto não encontrado' })
      throw err
    }
  })

  // POST /api/produtos/:id/estoque
  app.post('/:id/estoque', { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] }, async (request, reply) => {
    const { id } = request.params as any
    const body = request.body as any
    const auth = request.auth as TenantJwtPayload
    const tipo = body.tipo as 'entrada' | 'saida'
    if (!tipo || !['entrada', 'saida'].includes(tipo))
      return reply.status(400).send({ error: 'tipo deve ser "entrada" ou "saida"' })
    if (!body.quantidade || Number(body.quantidade) <= 0)
      return reply.status(400).send({ error: 'quantidade deve ser maior que zero' })
    try {
      const result = await Service.ajusteEstoque(
        request.tenantId!,
        id,
        tipo,
        Number(body.quantidade),
        body.motivo || 'Ajuste manual',
        auth.sub,
      )
      return result
    } catch (err: any) {
      if (err.status === 404) return reply.status(404).send({ error: err.message })
      if (err.status === 400) return reply.status(400).send({ error: err.message })
      throw err
    }
  })

  // GET /api/produtos/:id/estoque
  app.get('/:id/estoque', { preHandler: [requireTenant] }, async (request, reply) => {
    const { id } = request.params as any
    return Service.historicoEstoque(request.tenantId!, id)
  })

  // DELETE /api/produtos/:id
  app.delete('/:id', { preHandler: [requireTenant, requirePermissao('gerenciarProdutos')] }, async (request, reply) => {
    const { id } = request.params as any
    try {
      await Service.desativar(request.tenantId!, id)
      return { success: true }
    } catch (err: any) {
      if (err.status === 404) return reply.status(404).send({ error: err.message })
      throw err
    }
  })
}
