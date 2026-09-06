/**
 * Auditoria.
 *
 * O modelo `Auditoria` existia no schema desde o início e não era gravado em
 * lugar nenhum do código ativo. Descontos, cancelamentos, estornos e
 * encerramento de comanda sem pagamento passavam sem rastro — justamente as
 * operações que precisam dele.
 *
 * Recebe o `tx` para que o registro entre na mesma transação do fato: ou os
 * dois acontecem, ou nenhum.
 */
interface EntradaAuditoria {
  usuarioId: string | null
  acao: string
  entidade?: string
  entidadeId?: string
  detalhes?: unknown
  ip?: string
}

export async function registrarAuditoria(tx: any, entrada: EntradaAuditoria) {
  await tx.auditoria.create({
    data: {
      usuarioId: entrada.usuarioId,
      acao: entrada.acao,
      entidade: entrada.entidade ?? null,
      entidadeId: entrada.entidadeId ?? null,
      detalhes: (entrada.detalhes ?? null) as any,
      ip: entrada.ip ?? null,
    },
  })
}
