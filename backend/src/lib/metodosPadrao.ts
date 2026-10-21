/**
 * Formas de pagamento que todo restaurante começa tendo. Sem integração de
 * maquininha o pagamento é só registrado no PDV (cobrado na maquininha à parte),
 * então basta o nome. O PDV reconhece "Dinheiro" para calcular troco.
 */
export const METODOS_PADRAO = ['Dinheiro', 'Pix', 'Cartão de crédito', 'Cartão de débito']

/**
 * Cria as formas padrão quando o restaurante não tem nenhuma (nem desativada).
 * Idempotente: @@unique([tenantId, nome]) + skipDuplicates evita duplicar em
 * chamadas simultâneas, e quem já cadastrou as suas não é tocado.
 */
export async function garantirMetodosPadrao(db: any, tenantId: string) {
  const existentes = await db.metodoPagamento.count({ where: { tenantId } })
  if (existentes > 0) return false
  await db.metodoPagamento.createMany({
    data: METODOS_PADRAO.map((nome) => ({ tenantId, nome, ativo: true })),
    skipDuplicates: true,
  })
  return true
}
