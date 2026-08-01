/**
 * Importa o catálogo do jogo do paldb, nos dois idiomas.
 *
 *   npm run catalogo:importar
 *
 * Gera quatro arquivos, um por coleção:
 *
 *   src/data/catalogo.json    Pals, com número da Palpédia, elementos e aptidões
 *   src/data/itens.json       tudo que entra no inventário
 *   src/data/estruturas.json  o que dá para construir na base, por categoria
 *   src/data/tecnologias.json a árvore de tecnologia, com nível e custo
 *
 * Cada tipo tem um markup diferente no paldb, e é por isso que há três
 * extratores em vez de um. Eles foram lidos do HTML de verdade, não adivinhados:
 * Pal usa `div.col[data-filters]`, item usa `div.col > div.d-flex.border.rounded`,
 * estrutura usa `div.col > div.card.itemPopup` e tecnologia usa `div.hoverTech`
 * dentro de uma linha por nível.
 *
 * Por que gerado e não escrito: a wiki precisa cobrir os 288 Pals para competir
 * com as grandes, e ninguém digita 288 fichas sem errar. A conferência de 30.07
 * mostrou que 26 dos 77 que tínhamos escrito à mão estavam errados. Dado de
 * catálogo é para importar; o que se escreve à mão é o julgamento em cima dele.
 *
 * A separação importa: este arquivo é o catálogo bruto e nunca é editado à mão.
 * O pals.json continua sendo a curadoria, com nota, onde achar e fase, escrita
 * por nós. Um alimenta a cobertura, o outro alimenta a opinião.
 *
 * Uma requisição por idioma. A página de índice do paldb já traz cada Pal com as
 * aptidões num atributo data-filters, então não é preciso visitar 288 páginas.
 */
import { writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(raiz, 'src/data/catalogo.json');

/**
 * As abas de construção do jogo saem do próprio menu do paldb, e não de uma
 * lista escrita aqui.
 *
 * Não existe índice único de estruturas: o menu "Construction" leva a uma
 * página por categoria. Uma lista fixa aqui envelheceria em silêncio no dia
 * em que o jogo ganhasse uma aba nova, e a coleção sairia incompleta sem
 * ninguém perceber, que é exatamente o erro que este arquivo já cometeu com
 * as aptidões.
 */
function abasDeConstrucao(html) {
  const i = html.indexOf('common_work_type_architecture');
  if (i === -1) return [];
  const menu = html.slice(i, html.indexOf('</ul>', i));
  return [...new Set([...menu.matchAll(/href="\/en\/([A-Za-z_]+)"/g)].map((m) => m[1]))];
}

// Uma pausa curta entre requisições. São 26 no total, e o paldb é de graça.
const respirar = () => new Promise((r) => setTimeout(r, 700));

// aptidão no paldb -> nossa chave
const APTIDOES = {
  Kindling: 'acender', Watering: 'rega', Planting: 'plantio',
  'Generating Electricity': 'energia', GeneratingElectricity: 'energia',
  Handiwork: 'manual', Gathering: 'coleta', Lumbering: 'madeira',
  Mining: 'garimpo', 'Medicine Production': 'manipulacao', MedicineProduction: 'manipulacao',
  Cooling: 'refrigeracao', Transporting: 'transporte', Farming: 'fazenda',
  'Crude Oil Extraction': 'petroleo', CrudeOilExtraction: 'petroleo',
};
// Tradução OFICIAL dos elementos, conferida nos tooltips da página em
// português do paldb, que serve as strings do próprio jogo. Três quebram a
// expectativa e já causaram erro aqui dentro: Dark é "Escuridão" (não
// "Sombrio"), Dragon é "Dracônico" (não "Dragão"), Neutral é "Não elemental".
const ELEMENTOS = {
  Neutral: 'Não elemental', Fire: 'Fogo', Water: 'Água', Grass: 'Grama',
  Electric: 'Elétrico', Ice: 'Gelo', Ground: 'Terra', Dark: 'Escuridão',
  Dragon: 'Dracônico',
};

async function baixar(idioma, pagina = 'Pals') {
  const r = await fetch(`https://paldb.cc/${idioma}/${pagina}`, {
    headers: { 'User-Agent': 'wiki-palworld-do-grupo (importacao de catalogo)' },
  });
  if (!r.ok) throw new Error(`paldb ${idioma}/${pagina} respondeu ${r.status}`);
  return r.text();
}

/** Primeiro link de nome dentro de um bloco já recortado. */
const primeiroNome = (bloco) => {
  const m = bloco.match(/<a class="itemname"[^>]*href="([^"]+)"[^>]*>([^<]+)</);
  return m ? { chave: decodeURIComponent(m[1]), nome: m[2].trim() } : null;
};

/**
 * Itens. Um bloco por item, e o primeiro link é o nome: os outros são as
 * citações dentro da descrição, que apontam para outros itens.
 */
function extrairItens(html) {
  return html
    .split('<div class="col"><div class="d-flex border rounded">')
    .slice(1)
    .map(primeiroNome)
    .filter(Boolean);
}

/** Estruturas. Trazem a categoria de construção junto, já traduzida. */
function extrairEstruturas(html) {
  const achados = [];
  for (const bloco of html.split('<div class="col"><div class="card itemPopup">').slice(1)) {
    const item = primeiroNome(bloco);
    if (!item) continue;
    item.categoria = bloco.match(/<span class="me-auto"[^>]*>([^<]*)</)?.[1]?.trim() || null;
    achados.push(item);
  }
  return achados;
}

/**
 * Tecnologias. A página é uma linha por nível de desbloqueio, e cada linha tem
 * as tecnologias daquele nível. O nível vem da coluna estreita da esquerda.
 *
 * Devolve também quantas tecnologias existem no documento inteiro, para o
 * chamador poder abortar se alguma ficou fora das linhas. Perder tecnologia em
 * silêncio é o mesmo erro que já apagou três aptidões de 299 Pals aqui.
 */
const UMA_TECNOLOGIA = /hoverTech[^"]*"[^>]*data-hover="\?s=Technology\/([^"]+)"[^>]*>\s*<div class="hoverTechCost badge">(\d+)<\/div>\s*<div class="hoverTechHeader">([^<]*)<\/div>\s*<div class="hoverTechFooter">([^<]*)</g;

function extrairTecnologias(html) {
  const achados = [];
  for (const linha of html.split('<div class="col pt-2 pb-1 border-bottom">').slice(1)) {
    const nivel = linha.match(/style="width:32px;"><div>(\d+)<\/div>/)?.[1];
    for (const m of linha.matchAll(UMA_TECNOLOGIA)) {
      achados.push({
        chave: decodeURIComponent(m[1]),
        custo: Number(m[2]),
        tipo: m[3].trim(),
        nome: m[4].trim(),
        nivel: nivel ? Number(nivel) : null,
      });
    }
  }
  return { achados, noDocumento: [...html.matchAll(UMA_TECNOLOGIA)].length };
}

/**
 * Marcador de string não resolvida.
 *
 * Quando a localização do jogo não tem a string em português, o paldb renderiza
 * o nome do slot em vez de deixar vazio: sai literalmente "pt-BR_Text". O
 * importador copiava aquilo como se fosse nome, e 99 registros foram publicados
 * com "pt-BR_Text" no lugar de Pólvora, Esfera de Pal e outros 97.
 *
 * O padrão é o de código de idioma BCP-47 seguido de _Text, e cobre en-US_Text,
 * ja-JP_Text e qualquer outro que apareça no dia em que o paldb servir uma
 * língua nova pela metade.
 */
const MARCADOR_SEM_TRADUCAO = /^[a-z]{2}(?:-[A-Za-z]{2,4})?_Text$/;

/** Nome em português, ou o inglês quando o que veio é marcador e não nome. */
function nomeEmPortugues(nomePt, nomeEn) {
  if (!nomePt || MARCADOR_SEM_TRADUCAO.test(nomePt)) return { pt: nomeEn, semTraducao: true };
  return { pt: nomePt, semTraducao: false };
}

/**
 * Casa a lista em inglês com a em português pela chave do endereço, que é a
 * mesma nos dois idiomas, e devolve a coleção pronta para gravar.
 *
 * `sem_traducao_oficial` só existe quando é verdade, e é o que permite a página
 * dizer "o jogo não traduziu este" em vez de mostrar o inglês fingindo que é
 * português. Registro cujo PT é igual ao EN por coincidência NÃO recebe a
 * marca: Pizza, Katana, Bonsai e Silo são a mesma palavra nos dois idiomas, e
 * isso é acerto da localização, não falta dela.
 */
function juntarIdiomas(en, pt, extras = () => ({})) {
  const porChave = new Map(pt.map((x) => [x.chave, x]));
  return en.map((x) => {
    const irmao = porChave.get(x.chave);
    const { pt: nome, semTraducao } = nomeEmPortugues(irmao?.nome, x.nome);
    return {
      chave: x.chave,
      en: x.nome,
      pt: nome,
      ...(semTraducao ? { sem_traducao_oficial: true } : {}),
      ...extras(x, irmao),
    };
  });
}

/**
 * Quantos registros SEM tradução oficial a importação anterior tinha.
 *
 * Devolve null quando o arquivo é de antes desta contagem existir, e aí não há
 * com o que comparar: a primeira importação depois da correção passa, e as
 * seguintes já têm linha de base.
 */
async function semTraducaoAnterior(arquivo) {
  const caminho = join(raiz, 'src/data', arquivo);
  if (!existsSync(caminho)) return null;
  try {
    const anterior = JSON.parse(await readFile(caminho, 'utf-8'));
    return typeof anterior.sem_traducao_oficial === 'number' ? anterior.sem_traducao_oficial : null;
  } catch {
    return null;
  }
}

/** Grava uma coleção, ou aborta se ela veio pequena demais para ser verdade. */
async function gravar(arquivo, colecao, minimo, descricao) {
  if (colecao.length < minimo) {
    console.error(`\n  ABORTADO: só ${colecao.length} em ${arquivo} (mínimo ${minimo}). O paldb mudou o markup ou respondeu página de erro. Nada foi escrito.`);
    process.exit(1);
  }
  const traduzidos = colecao.filter((x) => x.pt !== x.en).length;
  if (!traduzidos) {
    console.error(`\n  ABORTADO: nenhum item de ${arquivo} tem nome diferente em português. O índice em PT não foi lido. Nada foi escrito.`);
    process.exit(1);
  }

  // Guarda no mesmo espírito da guarda de aptidão: salto grande na contagem de
  // registros sem tradução quer dizer que o paldb mudou de forma, e não que a
  // localização do jogo mudou de um dia para o outro. Gravar em cima seria
  // trocar dado bom por dado quebrado sem ninguém ver.
  const semTraducao = colecao.filter((x) => x.sem_traducao_oficial).length;
  const antes = await semTraducaoAnterior(arquivo);
  if (antes !== null) {
    const diferenca = Math.abs(semTraducao - antes);
    if (diferenca > 10 && diferenca > antes * 0.5 && !process.env.ACEITAR_MUDANCA_DE_TRADUCAO) {
      console.error(`\n  ABORTADO: ${arquivo} tinha ${antes} registro(s) sem tradução oficial e agora tem ${semTraducao}.`);
      console.error('  Salto desse tamanho é o paldb mudando de forma, não a localização do jogo mudando.');
      console.error('  Confira a página no navegador. Se a mudança for real, rode de novo com ACEITAR_MUDANCA_DE_TRADUCAO=1. Nada foi escrito.');
      process.exit(1);
    }
  }

  const caminho = join(raiz, 'src/data', arquivo);
  await writeFile(caminho, JSON.stringify({
    _leia_isto: [
      'ARQUIVO GERADO. Não edite à mão: rode "npm run catalogo:importar".',
      '',
      descricao,
    ],
    fonte: 'paldb.cc',
    importado_em: process.env.DATA_IMPORTACAO || null,
    total: colecao.length,
    sem_traducao_oficial: semTraducao,
    itens: colecao,
  }, null, 2) + '\n');
  console.log(`  ${String(colecao.length).padStart(4)} em ${arquivo} (${traduzidos} com nome próprio em português, ${semTraducao} sem tradução oficial)`);
}

/**
 * Cada Pal do índice é um bloco com esta forma:
 *
 *   <div class="col" data-filters="Handiwork1 Transporting1 Farming1 Neutral">
 *     ... <span class="text-white-50 small">#1</span>
 *     <a ... href="Lamball">Lamball</a>
 *
 * Lemos o atributo data-filters, que separa aptidão de elemento pela presença do
 * número no fim, e o número da Palpédia com o nome logo depois.
 */
const aptidoesDesconhecidas = new Set();

function extrair(html, coletarDesconhecidas = false) {
  const achados = [];
  const blocos = html.split('<div class="col" data-filters="');
  for (const bloco of blocos.slice(1)) {
    const fim = bloco.indexOf('"');
    if (fim === -1) continue;

    const cabeca = bloco.slice(0, 3500);
    const numero = cabeca.match(/text-white-50 small">#?([\dB]+)</)?.[1];
    const m = cabeca.match(/class="itemname"[^>]*href="([^"]+)"[^>]*>([^<]+)</);
    if (!m) continue;
    // O id interno é a chave que aparece no arquivo de save do jogo: Lamball é
    // SheepBall lá dentro. É o que liga o leitor de save ao catálogo.
    const idInterno = cabeca.match(/data-pal-id="([^"]+)"/)?.[1] || null;

    // Cuidado com aptidão de nome composto: no data-filters vem "Generating
    // Electricity8", COM espaço no meio. Separar por espaço quebrava isso em
    // dois tokens e descartava sem log: a primeira importação saiu sem energia,
    // manipulação e petróleo em nenhum dos 299 Pals. O regex abaixo casa o par
    // nome-com-espaços + nível de uma vez, sobre o atributo inteiro.
    const attr = bloco.slice(0, fim);
    const apt = {};
    const elementos = [];
    const parNivel = /([A-Za-z][A-Za-z ]*?)(\d{1,2})(?=\s|$)/g;
    for (const par of attr.matchAll(parNivel)) {
      const nome = par[1].trim();
      if (APTIDOES[nome]) apt[APTIDOES[nome]] = Number(par[2]);
      else if (coletarDesconhecidas) aptidoesDesconhecidas.add(nome);
    }
    for (const token of attr.replace(parNivel, ' ').split(/\s+/).filter(Boolean)) {
      if (ELEMENTOS[token]) elementos.push(token);
    }

    achados.push({ chave: decodeURIComponent(m[1]), nome: m[2].trim(), numero, idInterno, elementos, apt });
  }
  return achados;
}

console.log('  baixando o índice em inglês e em português...');
const [htmlEn, htmlPt] = await Promise.all([baixar('en'), baixar('pt')]);

const en = extrair(htmlEn, true);
const pt = extrair(htmlPt);
console.log(`  índice EN: ${en.length} Pals`);
console.log(`  índice PT: ${pt.length} Pals`);

// a chave do href é a mesma nos dois idiomas, então dá para casar por ela
const porChavePt = new Map(pt.map((p) => [p.chave, p]));
let semPt = 0;

const pals = en.map((p) => {
  const irmao = porChavePt.get(p.chave);
  if (!irmao) semPt++;
  // Mesmo tratamento de marcador das outras três coleções: hoje nenhum Pal vem
  // com "pt-BR_Text", e é justamente por isso que a guarda entra agora, antes
  // de o paldb servir o primeiro pela metade.
  const { pt: nomePt, semTraducao } = nomeEmPortugues(irmao?.nome, p.nome);
  return {
    numero: p.numero || null,
    chave: p.chave,
    id: p.idInterno,
    en: p.nome,
    pt: nomePt,
    ...(semTraducao ? { sem_traducao_oficial: true } : {}),
    elementos: p.elementos.map((e) => ({ en: e, pt: ELEMENTOS[e] })),
    apt: p.apt,
  };
});

pals.sort((a, b) => {
  const na = Number(String(a.numero).replace(/\D/g, '')) || 9999;
  const nb = Number(String(b.numero).replace(/\D/g, '')) || 9999;
  return na - nb || a.en.localeCompare(b.en);
});

const catalogo = {
  _leia_isto: [
    'ARQUIVO GERADO. Não edite à mão: rode "npm run catalogo:importar".',
    '',
    'Catálogo completo dos Pals, importado do paldb nos dois idiomas. Serve de',
    'cobertura: é o que garante que a wiki responda sobre qualquer Pal do jogo.',
    '',
    'A curadoria fica em pals.json, que é escrito à mão e tem nota, onde achar e',
    'fase. Os dois se cruzam pelo nome em inglês.',
  ],
  fonte: 'paldb.cc',
  importado_em: process.env.DATA_IMPORTACAO || null,
  total: pals.length,
  pals,
};

// Trava contra sobrescrever o catálogo com lixo. Um HTTP 200 com página de
// manutenção produziria um catálogo vazio, e um markup mudado produziria um
// catálogo sem alguma aptidão inteira. Nos dois casos é melhor abortar com
// erro do que gravar: o arquivo antigo continua valendo.
if (pals.length < 250) {
  console.error(`\n  ABORTADO: só ${pals.length} Pals extraídos (mínimo 250). O paldb mudou o markup ou respondeu página de erro. Nada foi escrito.`);
  process.exit(1);
}
for (const chave of ['energia', 'manipulacao', 'garimpo', 'fazenda']) {
  if (!pals.some((p) => p.apt[chave])) {
    console.error(`\n  ABORTADO: nenhum Pal com aptidão "${chave}". O parse quebrou. Nada foi escrito.`);
    process.exit(1);
  }
}
if (aptidoesDesconhecidas.size) {
  console.log(`  atenção: nomes de aptidão não reconhecidos no data-filters: ${[...aptidoesDesconhecidas].join(', ')}`);
}

await writeFile(SAIDA, JSON.stringify(catalogo, null, 2) + '\n');

const comApt = pals.filter((p) => Object.keys(p.apt).length).length;
const traduzidos = pals.filter((p) => p.pt !== p.en).length;
const comId = pals.filter((p) => p.id).length;
console.log(`\n  ${pals.length} Pals no catálogo`);
console.log(`  ${comApt} com pelo menos uma aptidão`);
console.log(`  ${traduzidos} com nome diferente em português`);
console.log(`  ${comId} com id interno do save mapeado`);
if (semPt) console.log(`  ${semPt} sem correspondência no índice em português`);
console.log(`\n  escrito em ${SAIDA.replace(raiz + '/', '')}`);

// --------------------------------------------------- itens, estruturas, tecnologias
console.log('\n  baixando itens...');
await respirar();
const [itensEn, itensPt] = [extrairItens(await baixar('en', 'Items')), null];
await respirar();
const itensPtLista = extrairItens(await baixar('pt', 'Items'));

// O índice repete item que aparece em mais de uma aba. Desduplicar pela chave
// e DIZER quantos caíram: corte em silêncio é o que este repositório proíbe.
const vistos = new Set();
const itensUnicos = itensEn.filter((i) => !vistos.has(i.chave) && vistos.add(i.chave));
console.log(`  índice de itens: ${itensEn.length} entradas, ${itensUnicos.length} chaves únicas, ${itensEn.length - itensUnicos.length} repetidas descartadas`);
// O paldb lista o dado bruto do jogo, e parte dele nunca aparece em tela, com
// nome tipo "NPC_WEAPON". Entram assim mesmo: filtrar é julgamento, e este
// script importa. Quem for montar a página de itens decide o que esconder.
const internos = itensUnicos.filter((i) => /_/.test(i.nome)).length;
if (internos) console.log(`  ${internos} entradas parecem internas do jogo (nome com underscore). Importadas mesmo assim`);
await gravar(
  'itens.json',
  juntarIdiomas(itensUnicos, itensPtLista),
  1200,
  'Tudo que entra no inventário, importado do índice de itens do paldb nos dois idiomas.',
);

const construcao = abasDeConstrucao(htmlEn);
if (construcao.length < 8) {
  console.error(`\n  ABORTADO: o menu de construção do paldb rendeu ${construcao.length} links, poucos demais para conter as abas do jogo. O menu mudou de forma. Nada foi escrito.`);
  process.exit(1);
}
console.log(`\n  baixando ${construcao.length} links de construção lidos do menu...`);
const estruturasEn = [];
const estruturasPt = [];
const semNada = [];
const falharam = [];
for (const aba of construcao) {
  try {
    await respirar();
    const daAba = extrairEstruturas(await baixar('en', aba));
    await respirar();
    estruturasPt.push(...extrairEstruturas(await baixar('pt', aba)));
    estruturasEn.push(...daAba);
    // O menu mistura aba de categoria com página de artigo. As de artigo não
    // têm estrutura nenhuma, e isso é normal: ficam listadas para ninguém
    // achar que sumiram.
    if (!daAba.length) semNada.push(aba);
  } catch (e) {
    falharam.push(`${aba} (${e.message})`);
  }
}
if (semNada.length) console.log(`  sem estrutura nenhuma, provavelmente página de artigo: ${semNada.join(', ')}`);
if (falharam.length) console.log(`  não abriram: ${falharam.join(', ')}`);
const vistasEstrutura = new Set();
const estruturasUnicas = estruturasEn.filter((e) => !vistasEstrutura.has(e.chave) && vistasEstrutura.add(e.chave));
const categoriasPt = new Map(estruturasPt.map((e) => [e.chave, e.categoria]));
await gravar(
  'estruturas.json',
  juntarIdiomas(estruturasUnicas, estruturasPt, (e) => ({
    categoria: e.categoria,
    categoria_pt: categoriasPt.get(e.chave) || e.categoria,
  })),
  250,
  'O que dá para construir na base, com a categoria de construção do jogo, importado das dez abas do paldb.',
);

console.log('\n  baixando a árvore de tecnologia...');
await respirar();
const tecEn = extrairTecnologias(await baixar('en', 'Technologies'));
await respirar();
const tecPt = extrairTecnologias(await baixar('pt', 'Technologies'));

// Tecnologia que existe no documento e não caiu em nenhuma linha de nível some
// sem aviso. Melhor abortar: o arquivo antigo continua valendo.
if (tecEn.achados.length !== tecEn.noDocumento) {
  console.error(`\n  ABORTADO: ${tecEn.noDocumento} tecnologias no documento e só ${tecEn.achados.length} dentro das linhas de nível. O agrupamento por nível mudou. Nada foi escrito.`);
  process.exit(1);
}
const vistasTec = new Set();
const tecUnicas = tecEn.achados.filter((t) => !vistasTec.has(t.chave) && vistasTec.add(t.chave));
await gravar(
  'tecnologias.json',
  juntarIdiomas(tecUnicas, tecPt.achados, (t) => ({
    nivel: t.nivel,
    custo: t.custo,
    tipo: t.tipo,
  })),
  400,
  'A árvore de tecnologia com nível de desbloqueio e custo em pontos, importada do paldb.',
);

console.log('\n  as quatro coleções foram atualizadas.');
