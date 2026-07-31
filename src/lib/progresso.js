/**
 * A ponte entre as duas camadas do site, decisão 3.0 do PRD.
 *
 * A Camada 1 é a wiki e não depende de nada daqui. Este módulo só existe para
 * o overlay: quando ligado, ele diz o que já temos por cima do dado do jogo.
 *
 * Os saves entram por import.meta.glob, então acrescentar uma pessoa é criar
 * o arquivo dela em src/data/saves/ e mais nada. Nenhum componente precisa
 * saber quantos somos.
 */
import guilda from '../data/guilda.json';

const modulos = import.meta.glob('../data/saves/*.json', { eager: true });

export const GUILDA = guilda;
export const SAVES = Object.values(modulos)
  .map((m) => m.default ?? m)
  .filter((s) => s && s.nome)
  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

/** Depois disso a comparação é escondida em vez de mostrada. Ver decisão de 31.07. */
export const DIAS_ATE_VENCER = 14;

/**
 * Quem tem este Pal, segundo os saves lidos.
 *
 * Devolve lista vazia quando ninguém registrou, e isso NÃO quer dizer que
 * ninguém tem: só uma parte do Palbox foi anotada. É por isso que a página
 * escreve "sem registro" em vez de "não temos".
 */
export function quemTem(nome) {
  const achados = [];
  for (const save of SAVES) {
    const noSquad = (save.squad || []).find((s) => s.pal === nome);
    if (noSquad) {
      achados.push({ pessoa: save.nome, onde: 'squad', nivel: noSquad.nivel, lido_em: save.lido_em });
      continue;
    }
    const caixa = save.palbox || {};
    const anotados = [
      ...(caixa.parados_que_resolvem_gargalo || []),
      ...(caixa.de_valor_real || []),
    ];
    if (anotados.includes(nome)) {
      achados.push({ pessoa: save.nome, onde: 'palbox', lido_em: save.lido_em });
    }
  }
  return achados;
}
