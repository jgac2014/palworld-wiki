/**
 * Guardas de JUNÇÃO para importador, valendo para a classe e não para um caso.
 *
 * Por que isto existe: cinco defeitos silenciosos de importação neste projeto,
 * todos a mesma coisa, forma inesperada aceita em silêncio, e todas as vezes a
 * resposta foi uma guarda específica para o defeito recém-achado. Este arquivo é
 * a guarda da classe. Ela fica EM CIMA das específicas, não no lugar delas.
 *
 * O defeito que a criou: `importar-mapa.mjs` casava o nome em português com o em
 * inglês por `id`, e 13.139 dos 13.755 pontos não têm `id`. Em JavaScript
 * `undefined === undefined` é verdade, então o `find` devolvia sempre o primeiro
 * registro daquele tipo e 3.622 pontos foram ao ar com o nome de outro lugar.
 * Nada disso deu erro: o nome estava lá, era um nome de verdade, em português
 * correto. É por isso que junção por chave ausente tem que ABORTAR, e não avisar.
 *
 * O mesmo vale para junção por `Map`, que é como o `importar-catalogo.mjs` casa
 * os dois idiomas: `new Map(lista.map((x) => [x.chave, x]))` com uma `chave`
 * ausente cria a entrada `undefined` e faz todo registro sem chave casar com ela.
 * O sintoma é diferente, a causa é a mesma.
 *
 * Todas as funções aqui ABORTAM com código 1. Importador não é lugar de
 * degradar: melhor não gravar do que gravar errado, porque errado é plausível.
 */

const abortar = (linhas) => {
  console.error('');
  console.error('  ABORTADO NA JUNÇÃO.');
  for (const l of linhas) console.error(`  ${l}`);
  console.error('');
  process.exit(1);
};

const vazio = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim());

/**
 * Índice de uma lista por um campo, com as duas guardas que importam.
 *
 *   - campo ausente em QUALQUER registro aborta, dizendo quantos e mostrando um.
 *     Sem isso, `undefined` vira chave e todo registro sem ela casa com o mesmo.
 *   - campo repetido aborta, dizendo qual valor e quantas vezes. Chave repetida
 *     faz o último registro engolir os anteriores em silêncio.
 */
export function indicePorChave(nome, lista, campo) {
  if (!Array.isArray(lista) || !lista.length) {
    abortar([`${nome}: a lista a indexar por "${campo}" veio vazia ou não é lista.`]);
  }
  const semChave = lista.filter((r) => vazio(r?.[campo]));
  if (semChave.length) {
    abortar([
      `${nome}: ${semChave.length} de ${lista.length} registros não têm o campo "${campo}",`,
      'e junção por campo ausente casa undefined com undefined: todos eles receberiam',
      'o mesmo par, que é o defeito que já pôs 3.622 pontos do mapa com nome de outro lugar.',
      `Exemplo: ${JSON.stringify(semChave[0]).slice(0, 160)}`,
      'Use outra chave, ou pareie por índice com parearPorIndice() se as listas forem a mesma em duas versões.',
    ]);
  }
  const indice = new Map();
  const repetidos = new Map();
  for (const r of lista) {
    const k = r[campo];
    if (indice.has(k)) repetidos.set(k, (repetidos.get(k) || 1) + 1);
    else indice.set(k, r);
  }
  if (repetidos.size) {
    const piores = [...repetidos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    abortar([
      `${nome}: o campo "${campo}" se repete em ${repetidos.size} valores, e chave repetida faz`,
      'um registro engolir o outro sem ninguém ver.',
      ...piores.map(([k, n]) => `   ${JSON.stringify(k)} aparece ${n} vezes`),
    ]);
  }
  return indice;
}

/**
 * Junta duas listas por um campo, com as guardas do indicePorChave nas duas, e
 * exige que os dois lados tenham as mesmas chaves.
 *
 * Devolve pares na ordem da lista A.
 */
export function juntarPorChave(nome, listaA, listaB, campo) {
  const a = indicePorChave(`${nome} (lado A)`, listaA, campo);
  const b = indicePorChave(`${nome} (lado B)`, listaB, campo);
  const soEmA = [...a.keys()].filter((k) => !b.has(k));
  const soEmB = [...b.keys()].filter((k) => !a.has(k));
  if (soEmA.length || soEmB.length) {
    abortar([
      `${nome}: os dois lados não têm as mesmas chaves em "${campo}".`,
      `${soEmA.length} só no lado A${soEmA.length ? `, por exemplo ${JSON.stringify(soEmA[0])}` : ''}.`,
      `${soEmB.length} só no lado B${soEmB.length ? `, por exemplo ${JSON.stringify(soEmB[0])}` : ''}.`,
      'Junção parcial deixa registro sem par e ele sai com o valor do outro idioma sem avisar.',
    ]);
  }
  return [...a.entries()].map(([k, ra]) => ({ chave: k, a: ra, b: b.get(k) }));
}

/**
 * Pareia duas listas POR ÍNDICE, que é o certo quando elas são a mesma lista em
 * duas versões (dois idiomas, por exemplo) e não têm identificador.
 *
 * Isto não é atalho: é o único critério que funciona quando a fonte não publica
 * chave. Mas ele depende de a ordem se manter, e ordem é coisa que muda sem
 * aviso. Por isso `camposIguais` diz quais campos têm que bater em cada posição,
 * e a função ABORTA quando param de bater. No mapa são `type` e `pos`: eles não
 * são o nome, então não impedem a tradução de diferir, e provam que a posição i
 * fala do mesmo objeto nas duas listas.
 */
export function parearPorIndice(nome, listaA, listaB, camposIguais) {
  if (!Array.isArray(listaA) || !Array.isArray(listaB)) {
    abortar([`${nome}: parear por índice precisa de duas listas, e uma delas não é.`]);
  }
  if (!listaA.length) abortar([`${nome}: a lista veio vazia, e parear nada com nada não é parear.`]);
  if (listaA.length !== listaB.length) {
    abortar([
      `${nome}: ${listaA.length} registros de um lado e ${listaB.length} do outro.`,
      'Parear por índice com comprimentos diferentes troca o nome de lugar a partir da primeira diferença.',
    ]);
  }
  if (!camposIguais?.length) {
    abortar([
      `${nome}: parear por índice sem nenhum campo de conferência é fé, não junção.`,
      'Escolha ao menos um campo que tenha que ser igual nos dois lados na mesma posição.',
    ]);
  }
  const fora = [];
  for (let i = 0; i < listaA.length; i++) {
    for (const campo of camposIguais) {
      if (JSON.stringify(listaA[i]?.[campo]) !== JSON.stringify(listaB[i]?.[campo])) {
        fora.push({ i, campo, a: listaA[i]?.[campo], b: listaB[i]?.[campo] });
        break;
      }
    }
  }
  if (fora.length) {
    abortar([
      `${nome}: ${fora.length} de ${listaA.length} posições têm ${camposIguais.join(' ou ')} diferente entre os dois lados.`,
      'As duas listas deixaram de estar na mesma ordem, e parear por índice passou a trocar nome de lugar.',
      ...fora.slice(0, 3).map((f) => `   posição ${f.i}: "${f.campo}" é ${JSON.stringify(f.a)} de um lado e ${JSON.stringify(f.b)} do outro`),
    ]);
  }
  return listaA.map((ra, i) => ({ i, a: ra, b: listaB[i] }));
}

/**
 * ------------------------------------------------- guarda de VARIÂNCIA
 *
 * A guarda de junção acima impede o defeito no lugar onde ele nasce. Esta aqui
 * o pega no resultado, para valer também para importador que ninguém lembrou de
 * ligar na outra, e para fonte que colapsa sozinha.
 *
 * A ideia: campo de texto que IDENTIFICA um registro não pode ter um valor
 * cobrindo registros demais. Quando o casamento de idiomas quebrou, "Ilha
 * Solitária Esquecida" passou a nomear os 137 pontos de viagem rápida de uma
 * vez, e nenhuma contagem acusou, porque o total de pontos não mudou.
 *
 * O limiar não é chutado: é a distribuição de hoje, congelada em
 * `src/data/referencia-importacao.json` pelo `npm run importacao:congelar`,
 * mesmo mecanismo do poder de captura. Repetição legítima existe e é grande em
 * alguns campos, como `Salvage_Rank2` em 1.987 pontos, que é nome de objeto e
 * não de lugar. Por isso o teto é POR CAMPO e medido, não um número redondo.
 *
 * As duas comparações são assimétricas de propósito:
 *   - `maior_repeticao` é TETO: subir quer dizer que um valor se espalhou.
 *   - `distintos` é PISO: cair quer dizer que valores diferentes colapsaram num
 *     só. Subir é conteúdo novo, e conteúdo novo não é defeito.
 */
export const COLECOES_IMPORTADAS = [
  { arquivo: 'src/data/catalogo.json', caminho: 'pals', campos: ['chave', 'en', 'pt'] },
  // Coleção de TRIPLAS, não de objetos: cada registro é [pai, mãe, filho]. Os
  // campos são as posições, e array indexa por string igual a objeto. O filho é
  // o que identifica a combinação; pai e mãe repetem de propósito, e é por isso
  // que o teto de cada um é medido em separado.
  { arquivo: 'src/data/catalogo.json', caminho: 'cruzamentos_unicos', campos: ['0', '1', '2'] },
  { arquivo: 'src/data/itens.json', caminho: 'itens', campos: ['chave', 'en', 'pt'] },
  { arquivo: 'src/data/estruturas.json', caminho: 'itens', campos: ['chave', 'en', 'pt'] },
  { arquivo: 'src/data/tecnologias.json', caminho: 'itens', campos: ['chave', 'en', 'pt'] },
  { arquivo: 'src/data/mapa-pontos.json', caminho: 'pontos', campos: ['en', 'pt'] },
  { arquivo: 'src/data/mapa-pontos.json', caminho: 'extras', campos: ['en', 'pt'] },
  { arquivo: 'src/data/mapa-pontos.json', caminho: 'tipos', campos: ['en', 'pt'] },
  { arquivo: 'src/data/mapa-pontos.json', caminho: 'categorias', campos: ['en', 'pt'] },
  { arquivo: 'src/data/termos.json', caminho: 'termos', campos: ['en', 'pt'] },
];

export const rotuloDaColecao = (c) => `${c.arquivo.replace('src/data/', '')}:${c.caminho}`;

/** Registros de uma coleção, seja ela lista ou objeto de objetos. */
export function registrosDe(json, caminho) {
  const bruto = caminho.split('.').reduce((o, k) => (o == null ? o : o[k]), json);
  if (Array.isArray(bruto)) return bruto;
  if (bruto && typeof bruto === 'object') return Object.values(bruto);
  return null;
}

/** Mede um campo: quantos valores, quantos distintos, e o mais repetido. */
export function medirCampo(registros, campo) {
  const valores = registros
    .map((r) => r?.[campo])
    .filter((v) => typeof v === 'string' && v.trim());
  const contagem = new Map();
  for (const v of valores) contagem.set(v, (contagem.get(v) || 0) + 1);
  let maisRepetido = null;
  let maior = 0;
  for (const [v, n] of contagem) if (n > maior) { maior = n; maisRepetido = v; }
  return { valores: valores.length, distintos: contagem.size, maior_repeticao: maior, mais_repetido: maisRepetido };
}
