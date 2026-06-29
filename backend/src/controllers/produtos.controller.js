import { Request, Response } from 'express'
import { buscarProdutos } from '../services/produtos.service'

export const listarProdutos = async (
  req: Request,
  res: Response
) => {

  try {

    const produtos = await buscarProdutos()

    return res.json(produtos)

  } catch (error) {

    console.error(error)

    return res.status(500).json({
      error: 'Erro ao listar produtos'
    })

  }

}