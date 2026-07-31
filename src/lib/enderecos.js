/**
 * Endereço das páginas geradas a partir do catálogo.
 *
 * Fica aqui porque quem gera a página e quem linka para ela são arquivos
 * diferentes, e as duas pontas precisam concordar. Uma cópia da regra em cada
 * ponta é link quebrado esperando patch.
 */

/** Ficha de um Pal, a partir da chave interna do jogo: Fuack_Ignis -> fuack-ignis. */
export const enderecoPal = (chave) =>
  chave.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '');
