import { distancia, type Coordenadas } from './geocodificar'

/**
 * Ordem das paradas de uma rota de entrega, saindo de `inicio` (o entregador
 * ou o restaurante) e terminando em qualquer parada.
 *
 * 1. Vizinho mais próximo: sempre a parada mais perto de onde ele está.
 * 2. 2-opt: desfaz cruzamentos invertendo trechos enquanto o caminho total
 *    encurta.
 * 3. Troca de lugar (Or-opt): uma parada, ou um trecho de 2–3, vai para a
 *    posição em que o caminho fica mais curto. O vizinho mais próximo sozinho
 *    pode deixar para trás um endereço que fica no caminho da última entrega
 *    e voltar depois; esses dois passos encaixam esse endereço na passagem.
 *
 * Distância em linha reta (haversine): sem consultar serviço de rotas, que
 * pode estar fora do ar. 30 paradas levam uns 50 ms.
 */
export function ordenarParadas<T extends Coordenadas>(inicio: Coordenadas | null, paradas: T[]): T[] {
  if (paradas.length < 2) return [...paradas]

  // 1. Vizinho mais próximo (sem início conhecido, começa pela primeira)
  const resto = [...paradas]
  const ordem: T[] = []
  let atual: Coordenadas | null = inicio
  while (resto.length) {
    let melhor = 0
    if (atual) {
      let menor = Infinity
      resto.forEach((p, i) => { const d = distancia(atual!, p); if (d < menor) { menor = d; melhor = i } })
    }
    const [p] = resto.splice(melhor, 1)
    ordem.push(p)
    atual = p
  }
  if (!inicio) return ordem

  // 2. 2-opt e 3. troca de lugar, num caminho aberto: pontos = [início, ...paradas]; o fim é livre
  const pts: Coordenadas[] = [inicio, ...ordem]
  const d = (a: number, b: number) => distancia(pts[a], pts[b])
  const total = () => { let t = 0; for (let i = 1; i < pts.length; i++) t += d(i - 1, i); return t }
  let melhorou = true
  for (let voltas = 0; melhorou && voltas < 50; voltas++) {
    melhorou = false
    // 3. Uma parada (ou um trecho de 2–3) muda de lugar se o caminho encurta
    for (let tam = 1; tam <= 3; tam++) {
      for (let i = 1; i + tam <= pts.length; i++) {
        const antes = total()
        const trecho = pts.splice(i, tam)
        let melhorPos = i, melhorInv = false, menor = antes - 1
        for (let j = 1; j <= pts.length; j++) {
          for (const inv of tam > 1 ? [false, true] : [false]) {
            pts.splice(j, 0, ...(inv ? [...trecho].reverse() : trecho))
            const t = total()
            if (t < menor) { menor = t; melhorPos = j; melhorInv = inv }
            pts.splice(j, tam)
          }
        }
        pts.splice(melhorPos, 0, ...(melhorInv ? trecho.reverse() : trecho))
        if (melhorPos !== i || melhorInv) melhorou = true
      }
    }
    for (let i = 0; i < pts.length - 2; i++) {
      for (let k = i + 2; k < pts.length; k++) {
        // Inverte pts[i+1..k]: troca as arestas (i,i+1) e (k,k+1) por (i,k) e (i+1,k+1)
        const antes = d(i, i + 1) + (k + 1 < pts.length ? d(k, k + 1) : 0)
        const depois = d(i, k) + (k + 1 < pts.length ? d(i + 1, k + 1) : 0)
        if (depois < antes - 1) {
          pts.splice(i + 1, k - i, ...pts.slice(i + 1, k + 1).reverse())
          melhorou = true
        }
      }
    }
  }
  return pts.slice(1) as T[]
}

/** Comprimento do caminho em metros (para comparar ordens). */
export function comprimento(inicio: Coordenadas, paradas: Coordenadas[]) {
  let total = 0, de = inicio
  for (const p of paradas) { total += distancia(de, p); de = p }
  return total
}
