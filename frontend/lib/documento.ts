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

/** CNPJ enquanto digita (cnpjBR só formata o número completo) */
export function cnpjMascara(v: unknown) {
  const d = so(v).slice(0, 14)
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}

/** Dígitos verificadores (mesma regra de backend/src/lib/documento.ts) */
export function cpfValido(v: unknown) {
  const d = so(v)
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const dv = (n: number) => {
    let soma = 0
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i)
    const r = (soma * 10) % 11
    return r === 10 ? 0 : r
  }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}

export function cnpjValido(v: unknown) {
  const d = so(v)
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false
  const dv = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const r = pesos.reduce((s, p, i) => s + Number(d[i]) * p, 0) % 11
    return r < 2 ? 0 : 11 - r
  }
  return dv(12) === Number(d[12]) && dv(13) === Number(d[13])
}
