/**
 * Logout por inatividade (plugins/inatividade.client.ts): 8 horas sem clique,
 * tecla ou toque. O último uso fica no localStorage (vale para todas as abas).
 */
export const LIMITE_INATIVIDADE_MS = 8 * 60 * 60 * 1000
export const CHAVE_ULTIMO_USO = 'pdv_ultima_atividade'
/** sessionStorage: a tela de login mostra o aviso uma vez */
export const AVISO_INATIVIDADE = 'pdv_saiu_por_inatividade'
