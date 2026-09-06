/**
 * Numeração sequencial por tenant, sem corrida.
 *
 * Substitui `SELECT max(numero) + 1`, que era como mesas.service.abrir()
 * gerava o número da comanda: duas requisições simultâneas liam o mesmo max
 * e tentavam gravar o mesmo número, batendo no unique.
 *
 * O UPDATE ... RETURNING trava a linha da sequência pela duração da
 * transação, então o incremento é serializado pelo próprio banco.
 */
export async function proximoNumero(
  tx: any,
  tenantId: string,
  nome: 'pedido' | 'mesa',
): Promise<number> {
  const linhas = await tx.$queryRaw<Array<{ valor: number }>>`
    INSERT INTO sequencias (tenant_id, nome, valor)
    VALUES (${tenantId}, ${nome}, 1)
    ON CONFLICT (tenant_id, nome)
    DO UPDATE SET valor = sequencias.valor + 1
    RETURNING valor
  `
  return linhas[0].valor
}
