/**
 * Marca do RestaurantePDV — FONTE ÚNICA de cor e fonte.
 *
 * App, painel da plataforma e cardápio leem daqui: o Tailwind gera as cores
 * (`bg-orange-500`, `bg-brand-500`…) e as variáveis CSS (`--marca-500`,
 * `--neutro-800`, `--ok`…) a partir destes valores. tokens.css (app) e
 * platform.css (painel) apontam para essas variáveis.
 *
 * O site (site/index.html) é estático e repete os mesmos valores no :root
 * dele — ao mudar algo aqui, atualize lá também.
 */

// Laranja da marca: o 500 é a cor; 700 é a versão para texto/borda em fundo
// claro (contraste ≥ 4,5:1 sobre branco); 300 é a versão para fundo escuro.
const laranja = {
  50: '#FFF4E5',
  100: '#FFE6C7',
  200: '#FFCC8F',
  300: '#FFB052',
  400: '#FF961F',
  500: '#FF7A00',
  600: '#E06A00',
  700: '#B85500',
  800: '#8F4200',
  900: '#5C2B00',
  950: '#331800',
}

// Neutros (um tom só para claro e escuro). Os escuros são os do app de hoje.
const neutro = {
  0: '#FFFFFF',
  50: '#F6F7F9',
  100: '#EEF1F6',
  200: '#DDE3EC',
  300: '#C3CCDA',
  350: '#A9B3C6',
  400: '#8F98A8',
  450: '#7B8598',
  500: '#6B7688',
  600: '#4A5567',
  650: '#3A445A',
  700: '#2B3345',
  750: '#242C3D',
  800: '#1C2231',
  850: '#161B26',
  900: '#0E1119',
  950: '#090B10',
}

// Estados: `forte` para texto em fundo claro, `vivo` para fundo escuro e indicadores.
const estado = {
  ok: { forte: '#12805C', vivo: '#2EC27E' },
  alerta: { forte: '#9A5800', vivo: '#F5A524' },
  perigo: { forte: '#C0262D', vivo: '#EF5350' },
  info: { forte: '#1F5FBF', vivo: '#4D8DF6' },
}

const fonte = {
  texto: "'Sora', system-ui, -apple-system, 'Segoe UI', sans-serif",
  numero: "'JetBrains Mono', ui-monospace, 'SF Mono', monospace",
}

/** Variáveis CSS da marca, injetadas no :root pelo Tailwind (addBase). */
function variaveis() {
  const v = {}
  for (const [k, c] of Object.entries(laranja)) v[`--marca-${k}`] = c
  for (const [k, c] of Object.entries(neutro)) v[`--neutro-${k}`] = c
  for (const [nome, t] of Object.entries(estado)) {
    v[`--${nome}-forte`] = t.forte
    v[`--${nome}-vivo`] = t.vivo
  }
  v['--fonte-marca-texto'] = fonte.texto
  v['--fonte-marca-numero'] = fonte.numero
  return v
}

module.exports = { laranja, neutro, estado, fonte, variaveis }
