/**
 * Catálogo de integrações de pagamento. Cada provedor pede credenciais
 * diferentes, então a tela monta o formulário a partir de `campos`.
 * Só entra como `disponivel` o provedor que já tem backend (rotas em
 * backend/src/modules/integracoes); os demais aparecem como "em breve" e o
 * restaurante pode pedir pelo suporte.
 */
export type TipoCampo = 'segredo' | 'texto' | 'dispositivo'
export interface Campo { chave: string; rotulo: string; tipo: TipoCampo; placeholder?: string; ajuda?: string; obrigatorio?: boolean }
export interface Provedor {
  id: string
  nome: string
  resumo: string
  cor: string          // cor da marca, só no selo do ícone
  sigla: string
  disponivel: boolean
  campos: Campo[]
  comoObter?: string
}

export const PROVEDORES: Provedor[] = [
  {
    id: 'mercadopago_point', nome: 'Mercado Pago Point', sigla: 'MP', cor: '#009EE3', disponivel: true,
    resumo: 'Envia a cobrança para a maquininha Point: débito, crédito e Pix.',
    comoObter: 'mercadopago.com.br → Seu negócio → Configurações → Credenciais → Access Token de produção',
    campos: [
      { chave: 'access_token', rotulo: 'Access Token', tipo: 'segredo', placeholder: 'APP_USR-…', obrigatorio: true },
      { chave: 'device_id', rotulo: 'Maquininha', tipo: 'dispositivo', placeholder: 'PAX_A910__SMARTPOS…', ajuda: 'Salve o token e use "Buscar" para listar as maquininhas da conta.', obrigatorio: true },
    ],
  },
  { id: 'stone',       nome: 'Stone',          sigla: 'ST', cor: '#00A868', disponivel: false, resumo: 'Maquininhas Stone com cobrança integrada.', campos: [] },
  { id: 'pagbank',     nome: 'PagBank',        sigla: 'PB', cor: '#1BB99A', disponivel: false, resumo: 'Moderninha com cobrança integrada.', campos: [] },
  { id: 'cielo',       nome: 'Cielo LIO',      sigla: 'CL', cor: '#0B5BA9', disponivel: false, resumo: 'Cielo LIO com cobrança integrada.', campos: [] },
  { id: 'getnet',      nome: 'Getnet',         sigla: 'GN', cor: '#EC0000', disponivel: false, resumo: 'Maquininhas Getnet com cobrança integrada.', campos: [] },
  { id: 'infinitepay', nome: 'InfinitePay',    sigla: 'IP', cor: '#2E2E2E', disponivel: false, resumo: 'Maquininha e Pix InfinitePay.', campos: [] },
  { id: 'pix',         nome: 'Pix direto (QR na tela)', sigla: 'PX', cor: '#32BCAD', disponivel: false, resumo: 'QR Pix com confirmação automática pelo banco.', campos: [] },
]
export const provedor = (id: string) => PROVEDORES.find(p => p.id === id)
