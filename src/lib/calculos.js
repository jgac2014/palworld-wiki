/**
 * As contas das calculadoras (R1.9 e R5.2), separadas da tela.
 *
 * Ficam aqui, e não dentro do .astro, por dois motivos: a página do site e o
 * teste do portão chamam a MESMA função, então o que o teste aprova é o que o
 * leitor usa; e conta com fórmula sustentada por fonte merece um lugar onde a
 * fonte possa ser lida junto do código.
 *
 * Nenhum número mora neste arquivo. Receita vem de receitas.json, e rank e
 * combinação única vêm do catálogo importado.
 */

/**
 * Quantos bolos dá para fazer, e qual ingrediente é a trava.
 *
 * O moinho entra na conta: farinha disponível é a que está no baú mais a que o
 * trigo ainda vira. Sem isso a resposta ignora o estoque de trigo, que é
 * exatamente o erro do protótipo, que só tinha campo para dois ingredientes.
 *
 * Empate vai para o primeiro da ordem da receita, que é a ordem da fonte.
 */
export function calcularBolo(receita, estoque) {
  const { moinho, ingredientes } = receita;
  const trigo = Math.max(0, Number(estoque[moinho.de]) || 0);
  const daMoagem = Math.floor(trigo / moinho.por_unidade);

  const linhas = ingredientes.map((ing) => {
    const noBau = Math.max(0, Number(estoque[ing.chave]) || 0);
    const disponivel = ing.chave === moinho.para ? noBau + daMoagem : noBau;
    return {
      ...ing,
      noBau,
      disponivel,
      // Quantos bolos ESTE ingrediente banca sozinho.
      bolos: Math.floor(disponivel / ing.quantidade),
    };
  });

  const bolos = Math.min(...linhas.map((l) => l.bolos));
  const trava = linhas.find((l) => l.bolos === bolos);
  return { bolos, trava, linhas, daMoagem, trigo };
}

/**
 * Filhote de um par, pela regra conferida em 01.08 contra 149 combinações
 * publicadas pelo paldb. A conferência está em `fontes.md`.
 *
 * Três partes, e as três são necessárias:
 *   1. combinação única vence tudo;
 *   2. senão, média dos CombiRanks, e a espécie de rank mais próximo;
 *   3. empate na distância vai para o rank MAIOR, e espécie que só nasce de
 *      combinação única não entra no sorteio.
 *
 * Sem a 1 e a 3, a regra acerta 60 de 148. Com elas, 149 de 149.
 */
export function filhoteDoPar(catalogo, chaveA, chaveB) {
  const porChave = new Map(catalogo.pals.map((p) => [p.chave, p]));
  const a = porChave.get(chaveA);
  const b = porChave.get(chaveB);
  if (!a || !b) return null;

  const par = [chaveA, chaveB].sort().join('|');
  for (const [x, y, filho] of catalogo.cruzamentos_unicos || []) {
    if ([x, y].sort().join('|') === par) {
      return { filho: porChave.get(filho) || null, unica: true, alvo: null };
    }
  }

  if (typeof a.combi !== 'number' || typeof b.combi !== 'number') return null;
  const alvo = Math.floor((a.combi + b.combi + 1) / 2);

  let melhor = null;
  let dist = Infinity;
  for (const p of sorteaveis(catalogo)) {
    const d = Math.abs(p.combi - alvo);
    // <= e não <: a lista vem em ordem crescente de rank, então o último
    // empatado é o de rank maior, que é o que o jogo escolhe.
    if (d <= dist) { melhor = p; dist = d; }
  }
  return { filho: melhor, unica: false, alvo };
}

/** Espécies que podem sair da média de rank, em ordem crescente. */
export function sorteaveis(catalogo) {
  return catalogo.pals
    .filter((p) => typeof p.combi === 'number' && !p.so_combinacao_unica)
    .sort((x, y) => x.combi - y.combi);
}

/**
 * Pares que geram um alvo. As combinações únicas entram primeiro porque são
 * fato, e não resultado de conta.
 *
 * Devolve o TOTAL junto com a fatia mostrada. A página diz "12 de 340" em vez
 * de cortar em silêncio, que é a mesma regra dos índices de item: esconder sem
 * dizer é corte silencioso.
 *
 * O varrimento é quadrático, 299 x 299, e por isso o pool e a tabela de únicas
 * são preparados UMA vez aqui fora: chamar filhoteDoPar() por par refazia esse
 * preparo 89 mil vezes e o navegador travava por segundos.
 */
export function paresQueGeram(catalogo, chaveAlvo, mostrar = 12) {
  const achados = [];
  const parUnico = new Set();
  for (const [x, y, filho] of catalogo.cruzamentos_unicos || []) {
    parUnico.add([x, y].sort().join('|'));
    if (filho === chaveAlvo) achados.push({ a: x, b: y, unica: true });
  }

  const pool = sorteaveis(catalogo);
  const lista = catalogo.pals.filter((p) => typeof p.combi === 'number');

  // Busca binária pelo rank mais próximo, com o empate indo para o maior, que
  // é a regra conferida contra 149 combinações do paldb.
  const maisProximo = (alvo) => {
    let ini = 0, fim = pool.length - 1;
    while (ini < fim) {
      const meio = (ini + fim) >> 1;
      if (pool[meio].combi < alvo) ini = meio + 1;
      else fim = meio;
    }
    const acima = pool[ini];
    const abaixo = pool[Math.max(0, ini - 1)];
    return Math.abs(abaixo.combi - alvo) < Math.abs(acima.combi - alvo) ? abaixo : acima;
  };

  for (let i = 0; i < lista.length; i++) {
    for (let j = i; j < lista.length; j++) {
      if (parUnico.has([lista[i].chave, lista[j].chave].sort().join('|'))) continue;
      const alvo = Math.floor((lista[i].combi + lista[j].combi + 1) / 2);
      if (maisProximo(alvo).chave === chaveAlvo) {
        achados.push({ a: lista[i].chave, b: lista[j].chave, unica: false });
      }
    }
  }
  return { pares: achados.slice(0, mostrar), total: achados.length };
}

/**
 * Condensação. Só o total para 4★, que é o número com fonte: a distribuição por
 * estrela está registrada como não oficial em `fontes.md`, e calculadora com
 * número inventado é pior que calculadora ausente, porque parece certa.
 */
export function calcularCondensacao(receitas, copias) {
  const total = receitas.condensacao.copias_para_4_estrelas;
  const tem = Math.max(0, Number(copias) || 0);
  return { total, tem, faltam: Math.max(0, total - tem), completo: tem >= total };
}
