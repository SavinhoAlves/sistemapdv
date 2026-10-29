/** Máscaras de CPF, telefone e CEP (o servidor guarda só os números). */
const so = (v: unknown) => String(v ?? '').replace(/\D/g, '')

export function cpfBR(v: unknown) {
  const d = so(v).slice(0, 11)
  return d.replace(/^(\d{3})(\d)/, '$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

export function telefoneBR(v: unknown) {
  const d = so(v).slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ''
  const meio = d.length === 11 ? 7 : 6
  return `(${d.slice(0, 2)}) ${d.slice(2, meio)}${d.length > meio ? `-${d.slice(meio)}` : ''}`
}

export function cepBR(v: unknown) {
  const d = so(v).slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

export function cnpjBR(v: unknown) {
  const d = so(v)
  if (d.length !== 14) return String(v ?? '')
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}

/** Data só (AAAA-MM-DD do banco) em dd/mm/aaaa, sem fuso deslocar o dia */
export function dataSoBR(v: string | null | undefined) {
  if (!v) return ''
  const [a, m, d] = v.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}
