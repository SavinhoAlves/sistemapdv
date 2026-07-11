import {
  Banknote, QrCode, CreditCard, ArrowLeftRight, Wallet
} from 'lucide-vue-next'

// Ícone do método de pagamento pelo nome (Dinheiro, Pix, Crédito…)
export function iconeMetodo(nome: string) {
  const n = (nome || '').toLowerCase()
  if (n.includes('dinheiro'))              return Banknote
  if (n.includes('pix'))                   return QrCode
  if (n.includes('crédito') || n.includes('credito')) return CreditCard
  if (n.includes('débito')  || n.includes('debito'))  return CreditCard
  if (n.includes('transfer'))              return ArrowLeftRight
  return Wallet
}
