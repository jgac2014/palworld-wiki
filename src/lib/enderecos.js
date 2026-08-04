/**
 * Endereço das páginas geradas a partir do catálogo.
 *
 * Fica aqui porque quem gera a página e quem linka para ela são arquivos
 * diferentes, e as duas pontas precisam concordar. Uma cópia da regra em cada
 * ponta é link quebrado esperando patch.
 */

/**
 * Chave interna do jogo virando pedaço de endereço: Fuack_Ignis -> fuack-ignis.
 *
 * O descarte do que não é letra, número ou hífen não é enfeite: 253 chaves de
 * item trazem dois-pontos, parêntese ou colchete (`Skill_Fruit:_Power_Shot`,
 * `Celestial_Sigil_[Master]`), e esses caracteres em caminho de arquivo quebram
 * em algum dos sistemas onde o build roda.
 *
 * Descartar caractere pode fundir duas chaves distintas no mesmo endereço, e
 * ficha que sobrescreve ficha some sem erro nenhum. Conferido nas duas coleções
 * antes de abrir a rota: 299 Pals e 1.875 itens dão 299 e 1.875 endereços
 * distintos. O verificador refaz essa conta a cada portão, porque a próxima
 * importação pode trazer a chave que colide.
 */
const daChave = (chave) =>
  chave.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '');

/** Ficha de um Pal. */
export const enderecoPal = daChave;

/** Ficha de um item. Mesma regra do Pal de propósito: um endereço só se lê de
 *  um jeito, e duas regras parecidas divergem no primeiro nome esquisito. */
export const enderecoItem = daChave;
