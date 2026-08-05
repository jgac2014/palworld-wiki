/**
 * Grava o recorte de cada URL que o fontes.md cita como conferência.
 *
 *   npm run recortes:gravar            grava todas
 *   npm run recortes:gravar -- paldb   grava só as que casam com o texto
 *
 * Por que este script existe: o CLAUDE.md registra que "fonte consultada e não
 * gravada deixa de existir". Isso não foi teoria, aconteceu: a regra de
 * cruzamento foi validada contra uma lista do paldb que ninguém consegue
 * reabrir, e a validação virou afirmação sem prova no dia seguinte. O fontes.md
 * citava 28 URLs no mesmo estado.
 *
 * O que ele grava é TRECHO, não página. Um recorte é uma citação com data e
 * origem, do tamanho de provar a afirmação que o fontes.md tira dali, e nada
 * além disso. Página inteira arquivada seria cópia de conteúdo dos outros, e
 * também não ajudaria: quem reconfere quer a linha do número, não o artigo.
 *
 * Falha por falta de insumo, nunca por silêncio:
 *   - URL citada no fontes.md sem entrada em ALVOS aborta antes de qualquer
 *     requisição, dizendo qual. Sem isso, acrescentar fonte nova ao fontes.md
 *     deixaria o recorte de fora sem ninguém ver.
 *   - Entrada em ALVOS que ninguém cita mais também aborta.
 *   - Página que responde 200 mas não contém nenhum dos termos vira
 *     `sem-trecho`, não vira arquivo vazio fingindo prova.
 *   - Página que responde 403 vira `bloqueada` e página que some vira `morta`,
 *     as duas com o código HTTP e as duas tentativas registradas. Chamar 403 de
 *     404 seria imprecisão gravada justamente no arquivo que existe para
 *     registrar imprecisão.
 *
 *   - Alvo com `origem` foi capturado em outro ambiente e NÃO é regravado aqui.
 *     As duas do VGC vieram do Cowork, que não leva o 403 da Cloudflare, e desta
 *     máquina voltam 403: regravar apagaria o conteúdo delas. Se o arquivo
 *     sumir, o script aborta, porque não sabe refazer o que não capturou.
 *
 * Só `viva` conta como conferida. Todo o resto tem que estar registrado no
 * fontes.md como afirmação sem prova reproduzível, e o `npm run verificar`
 * reprova quando não está. `sem-html` é o caso do SteamDB: a página abre, e o
 * que ela publica em HTML não é o dado, que é montado por JavaScript. Isso não
 * é bloqueio, e a distinção importa porque "bloqueada" sugere que outro cliente
 * resolveria.
 */
import { writeFile, readFile, readdir, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pastaRecortes = join(raiz, 'src/data/recortes');
const arquivoFontes = join(raiz, 'src/content/wiki/fontes.md');

const ESPERA_MS = 30000;
const MAX_TRECHOS = 5;
const MAX_CHARS_TRECHO = 240;
const AGENTE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/**
 * Para cada URL, o arquivo do recorte, a afirmação do fontes.md que ela
 * sustenta, e os termos que definem o que é "o trecho relevante" ali dentro.
 *
 * Os termos não são decoração: eles são o critério de relevância, e é por eles
 * que uma página que mudou de assunto cai em `sem-trecho` em vez de gravar
 * qualquer parágrafo como se fosse prova.
 */
const ALVOS = {
  'https://paldb.cc/en/Breeding_Farm': {
    arquivo: 'paldb-breeding-farm.md',
    usado_para: 'CombiRank das 299 espécies e a tabela de combinações únicas, base da calculadora de cruzamento',
    termos: ['CombiRank', 'Breed Combi', 'Breed Unique', 'Breeding Farm'],
  },
  'https://paldb.cc/en/Breed': {
    arquivo: 'paldb-breed.md',
    usado_para: 'A calculadora do paldb, usada para conferir resultado por par',
    termos: ['Breeding Calculator', 'Parent', 'Child', 'Breed'],
  },
  'https://paldb.cc/en/Mega_Sphere': {
    arquivo: 'paldb-mega-sphere.md',
    usado_para:
      'A ficha de item que a importação de receitas lê, com a receita conferida material por material: Paldium Fragment 1, Ingot 1, Wood 3, Stone 3',
    // Os quatro materiais são o critério de relevância, e o Stone está aqui de
    // propósito: é o ÚLTIMO da receita, e é ele que a primeira versão do
    // recorte perdia. Página que mudar de forma e deixar de trazer o último
    // material cai em `sem-trecho` em vez de gravar prova pela metade.
    termos: ['Paldium Fragment', 'Ingot', 'Wood', 'Stone'],
    // O que prova a receita é o bloco, não os quatro nomes soltos: o paldb põe
    // o material num div e a quantidade no seguinte, e o recorte por termo
    // devolvia "Paldium Fragment", "Ingot", "Wood", "Stone" sem número nenhum.
    // É o mesmo bloco que o importar-receitas.mjs lê.
    bloco: {
      rotulo: 'Receita de fabricação, do bloco recipes da ficha',
      de: '<div class="recipes">',
      // Janela de HTML folgada porque uma URL de imagem do paldb come 200 chars
      // sozinha, e citação curta porque a receita inteira cabe em 41 chars de
      // texto. Os 120 param antes de um tooltip do Bootstrap que carrega HTML
      // dentro do atributo `data-bs-title`, coisa que nenhuma remoção de tag
      // por regex desfaz direito. Sobra ruído, não afirmação errada, e a prova
      // está no começo da citação.
      html_chars: 6000,
      chars: 120,
    },
  },
  // As duas da conferencia de drops. A URL e a da api.php e nao a da pagina:
  // a wiki.gg responde 403 para leitura direta, por causa da Cloudflare, e a
  // API responde 200. E o mesmo caminho que os limites do mapa ja usam.
  //
  // O bloco `{{Item Drop` e o que prova: e la que a wiki.gg publica as duas
  // listas, normal e de alfa, com quantidade e probabilidade. Os termos soltos
  // sozinhos diriam so que as palavras existem na pagina.
  'https://palworld.wiki.gg/api.php?action=parse&page=Lifmunk&prop=wikitext&format=json&formatversion=2': {
    arquivo: 'wikigg-lifmunk-drops.md',
    usado_para:
      'Conferencia independente dos drops do Lifmunk, que divergem do paldb: a wiki.gg diz Berry Seeds e o paldb diz Wheat Seeds',
    termos: ['normal_drops', 'alpha_drops', 'Berry Seeds', 'Ring of Grass Resistance'],
    bloco: { rotulo: 'Bloco Item Drop, as duas listas', de: '{{Item Drop', html_chars: 900, chars: 460 },
  },
  'https://palworld.wiki.gg/api.php?action=parse&page=Lamball&prop=wikitext&format=json&formatversion=2': {
    arquivo: 'wikigg-lamball-drops.md',
    usado_para:
      'Controle da conferencia de drops: o Lamball bate com o paldb no normal, incluindo a faixa 1-3, o que separa divergencia de recorte deslocado',
    termos: ['normal_drops', 'alpha_drops', 'Wool', 'Lamball Mutton'],
    bloco: { rotulo: 'Bloco Item Drop, as duas listas', de: '{{Item Drop', html_chars: 900, chars: 460 },
  },
  'https://steamcommunity.com/ogg/1623730/announcements/detail/686383649529010624': {
    arquivo: 'steam-changelog-1-0.md',
    usado_para: 'Total de Pals (287) e o que o 1.0 mudou, fonte oficial da Pocketpair',
    termos: ['287', 'Pals', 'level cap', 'World Tree'],
  },
  'https://steamdb.info/app/1623730/patchnotes/': {
    arquivo: 'steamdb-patchnotes.md',
    usado_para: 'Histórico de patches, para saber qual versão é a publicada',
    termos: ['1.0.2', '1.0.1', 'patchnotes', 'Palworld'],
    origem: 'lido sem JavaScript: a lista de builds não existe no HTML, só o cabeçalho do app',
  },
  'https://paldb.cc/en/v1.0.0': {
    arquivo: 'paldb-v1-0-0.md',
    usado_para: 'Patch notes do 1.0 no paldb, cruzamento com o changelog oficial',
    termos: ['v1.0.0', 'Pal', 'added', 'level'],
  },
  'https://paldb.cc/en/Passive_Skills': {
    arquivo: 'paldb-passivas.md',
    usado_para: 'Lista de passivas do 1.0',
    termos: ['Passive Skill', 'Legend', 'Lucky', 'Rank'],
  },
  'https://www.bisecthosting.com/blog/palworld-1-0-patch-notes-update-new-pals-locations-changes-sunreach-world-tree': {
    arquivo: 'bisecthosting-1-0.md',
    usado_para: 'Contagem de Pals divergente (259) que o fontes.md declara errada',
    termos: ['259', 'new Pals', 'level cap', 'Sunreach'],
  },
  'https://www.videogameschronicle.com/guide/palworld-1-0-patch-notes-9-biggest-changes/': {
    arquivo: 'vgc-9-mudancas.md',
    usado_para: 'As nove mudanças do 1.0, o level cap e a contagem de 72 Pals novos',
    termos: ['level cap', 'level 80', 'Pals', 'World Tree'],
    origem: 'capturado via Cowork porque a máquina local recebe 403 da Cloudflare',
  },
  'https://dotesports.com/palworld/guides/palworld-1-0-patch-notes': {
    arquivo: 'dotesports-patch-notes.md',
    usado_para: 'Level cap e patch notes do 1.0',
    termos: ['level cap', 'level 80', 'Pals'],
  },
  'https://www.thebiglead.com/palworld-v1-0-2-patch-notes/': {
    arquivo: 'thebiglead-1-0-2.md',
    usado_para: 'Patch notes do 1.0.2, que é a versão coberta pela wiki',
    termos: ['1.0.2', 'patch notes', 'fixed'],
  },
  'https://nodecraft.com/support/games/palworld/general/palworld-work-suitability-level-10-explained': {
    arquivo: 'nodecraft-aptidao-10.md',
    usado_para: 'Teto de aptidão e o que condensação faz com ele',
    termos: ['Work Suitability', 'level 10', 'condens', 'Pal Gear'],
  },
  'https://www.pcgamer.com/games/survival-crafting/palworld-best-pals/': {
    arquivo: 'pcgamer-melhores-pals.md',
    usado_para: 'Melhores Pals de base no 1.0, cruzamento com a curadoria de pals.json',
    termos: ['Anubis', 'best', 'base', 'mining'],
  },
  'https://palworld.gg/partner-skills': {
    arquivo: 'palworldgg-partner-skills.md',
    usado_para: 'Lista de partner skills, ponto em disputa sobre quais Pals dão aura',
    termos: ['Partner Skill', 'Mycora', 'Wumpo', 'Eikthyrdeer'],
  },
  'https://palworld.wiki.gg/api.php?action=query&prop=revisions&titles=Map%3AFragments%2FCore&rvprop=content&rvslots=main&format=json&formatversion=2': {
    arquivo: 'wikigg-map-fragments-core.md',
    usado_para: 'Os limites de enquadramento da textura do mapa, que projetam os 13.755 pontos sobre o fundo',
    termos: ['topLeft', 'bottomRight', 'crs', 'World_Map.webp'],
    origem:
      'capturado por scripts/gerar-fundo-mapa.mjs, que grava o JSON de configuração INTEIRO. ' +
      'O recorte daqui sairia em janela de 240 caracteres, e meio enquadramento não prova enquadramento',
  },
  'https://palworld.wiki.gg/images/World_Map.webp': {
    arquivo: 'wikigg-world-map-webp.md',
    usado_para: 'A textura de fundo do mapa, cortada em tiles para public/mapa/',
    termos: ['World_Map', 'webp', '8192'],
    origem:
      'capturado por scripts/gerar-fundo-mapa.mjs: é imagem, não texto. O recorte dela é a identidade ' +
      'do arquivo (tamanho, dimensões, sha256) mais o próprio conteúdo, que está no repositório em tiles',
  },
  'https://palworld.wiki.gg/wiki/Breeding': {
    arquivo: 'wikigg-breeding.md',
    usado_para: 'Segunda leitura da regra de cruzamento, e a fonte que o fontes.md declara anterior ao 1.0',
    termos: ['Breeding', 'Combi', 'Rank', 'Cake'],
  },
  'https://github.com/tylercamp/palcalc': {
    arquivo: 'palcalc.md',
    usado_para: 'Segunda opinião sobre cruzamento, e a data do último lançamento que a desqualifica como fonte do 1.0',
    termos: ['PalCalc', 'GenDB', 'CUE4Parse', 'Releases'],
  },
  'https://www.keengamer.com/articles/guides/palworld-1-0-best-gold-farm-locations-and-methods/': {
    arquivo: 'keengamer-ouro.md',
    usado_para: 'Métodos de farm de ouro citados na economia',
    termos: ['gold', 'farm', 'coins'],
  },
  'https://gamingbolt.com/palworld-1-0-guide-where-and-how-to-farm-the-2-new-ores-soralite-and-paloxite': {
    arquivo: 'gamingbolt-minerios.md',
    usado_para: 'Onde ficam Soralite e Paloxite, os dois minérios novos do 1.0',
    termos: ['Soralite', 'Paloxite', 'ore'],
  },
  'https://nerdschalk.com/get-applied-handbooks-palworld/': {
    arquivo: 'nerdschalk-handbooks.md',
    usado_para: 'Como conseguir Applied Handbooks, item de progressão citado no plano',
    termos: ['Handbook', 'Applied', 'Technology'],
  },
  'https://www.keengamer.com/articles/guides/palworld-1-0-all-tower-bosses-in-order-and-how-to-beat-them/': {
    arquivo: 'keengamer-tower-bosses.md',
    usado_para: 'Ordem e nível dos tower bosses, ponto em disputa entre fontes',
    termos: ['Zoe', 'Lily', 'Axel', 'Marcus', 'Victor', 'Bjorn', 'level'],
  },
  'https://www.keengamer.com/articles/guides/palworld-1-0-best-passive-skills-for-combat-mounts-and-base-pals/': {
    arquivo: 'keengamer-passivas.md',
    usado_para: 'Melhores passivas para combate e base',
    termos: ['passive', 'Legend', 'Musclehead', 'Ferocious'],
  },
  'https://www.videogameschronicle.com/guide/palworld-10-enter-world-tree/': {
    arquivo: 'vgc-world-tree.md',
    usado_para: 'A cadeia de acesso à Árvore Mundial: nível, lugar e os seis pré-requisitos',
    termos: ['World Tree', 'enter', 'Sunreach'],
    origem: 'capturado via Cowork porque a máquina local recebe 403 da Cloudflare',
  },
  'https://nexttier.pro/guide/palworld-sunreach': {
    arquivo: 'nexttier-sunreach.md',
    usado_para: 'A região de Sunreach, nova no 1.0',
    termos: ['Sunreach', 'region', 'level'],
  },
  'https://allthings.how/palworld-1-0-how-to-farm-every-radiant-gem-in-the-world-tree/': {
    arquivo: 'allthings-radiant-gems.md',
    usado_para: 'Onde farmar Radiant Gems na Árvore Mundial',
    termos: ['Radiant Gem', 'World Tree', 'farm'],
  },
  'https://allthings.how/palworld-1-0-7-best-legendary-schematics-and-how-to-get-them/': {
    arquivo: 'allthings-schematics.md',
    usado_para: 'Quais legendary schematics valem e onde caem',
    termos: ['schematic', 'Legendary', 'drop'],
  },
  'https://gamerant.com/palworld-how-unlock-get-use-wing-pack/': {
    arquivo: 'gamerant-wing-pack.md',
    usado_para: 'Como destravar o Wing Pack, item de mobilidade do 1.0',
    termos: ['Wing Pack', 'unlock', 'Technology'],
  },
  'https://www.bisecthosting.com/blog/palworld-arena-guide-best-pals-tips-tricks-location-game-modes-merchant': {
    arquivo: 'bisecthosting-arena.md',
    usado_para: 'Formato da Arena, ponto em disputa entre 3v3 e 4v4',
    termos: ['Arena', '3v3', '4v4', 'merchant'],
  },
  'https://www.reddit.com/r/Palworld/': {
    arquivo: 'reddit-palworld.md',
    usado_para: 'Threads de comunidade de julho de 2026, citadas em bloco e sem link individual',
    termos: ['Palworld', 'r/Palworld', 'members'],
  },
  'https://hub.tcno.co/games/palworld/converter/': {
    arquivo: 'tcno-conversor-save.md',
    usado_para: 'Conversor de save co-op para servidor dedicado',
    termos: ['convert', 'save', 'dedicated', 'co-op'],
  },
};

// ------------------------------------------------------------- utilidades
const hoje = () => new Date().toISOString().slice(0, 10);

const urlsCitadas = (texto) => {
  const achadas = [...texto.matchAll(/https?:\/\/[^\s)`\]<>]+/g)].map((m) => m[0]);
  return [...new Set(achadas)];
};

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '-', ndash: '-', hellip: '...', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', times: '×', middot: '·', deg: '°',
};

const decodificar = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, nome) => ENTIDADES[nome.toLowerCase()] ?? m);

/** HTML para texto corrido, em blocos separados por linha. */
const paraTexto = (html) =>
  decodificar(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/(p|div|li|tr|h[1-6]|section|article|blockquote|td|th)>/gi, '\n')
      .replace(/<(br|hr)\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter(Boolean);

const tituloDe = (html) => decodificar((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').trim())
  .replace(/\s+/g, ' ')
  .slice(0, 160);

/**
 * Escolhe até MAX_TRECHOS blocos, um por termo, para o recorte cobrir os termos
 * em vez de repetir cinco vezes o mesmo. O bloco grande vira janela em volta da
 * ocorrência: o que prova a afirmação é a frase do número, não o parágrafo.
 */
const recortar = (blocos, termos) => {
  const contagem = {};
  const escolhidos = [];
  const jaUsados = new Set();

  for (const termo of termos) {
    const alvo = termo.toLowerCase();
    contagem[termo] = blocos.filter((b) => b.toLowerCase().includes(alvo)).length;
    if (escolhidos.length >= MAX_TRECHOS) continue;

    // A primeira ocorrência costuma ser rótulo de menu ou o próprio título:
    // gravar "CombiRank" como prova de CombiRank não prova nada. Prefere o
    // primeiro bloco com frase dentro, e só cai na ocorrência crua se a página
    // realmente não tiver nenhuma.
    const candidatos = blocos
      .map((b, idx) => ({ b, idx }))
      .filter(({ b, idx }) => !jaUsados.has(idx) && b.toLowerCase().includes(alvo));
    if (!candidatos.length) continue;
    const comFrase = candidatos.find(({ b }) => b.length >= 60 && b.length <= 1500)
      || candidatos.find(({ b }) => b.length >= 25)
      || candidatos[0];
    const i = comFrase.idx;
    jaUsados.add(i);

    const bloco = blocos[i];
    let trecho = bloco;
    if (bloco.length > MAX_CHARS_TRECHO) {
      const pos = bloco.toLowerCase().indexOf(alvo);
      const ini = Math.max(0, pos - Math.floor((MAX_CHARS_TRECHO - termo.length) / 2));
      const fim = Math.min(bloco.length, ini + MAX_CHARS_TRECHO);
      trecho = (ini > 0 ? '[...] ' : '') + bloco.slice(ini, fim).trim() + (fim < bloco.length ? ' [...]' : '');
    }
    escolhidos.push({ termo, trecho });
  }

  return { escolhidos, contagem };
};

const buscar = async (url) => {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), ESPERA_MS);
  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: controle.signal,
      headers: {
        'user-agent': AGENTE,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9,pt-BR;q=0.8',
      },
    });
    const corpo = await r.text();
    return { http: r.status, ok: r.ok, corpo, urlFinal: r.url };
  } catch (e) {
    return { http: 0, ok: false, corpo: '', erro: e.name === 'AbortError' ? `sem resposta em ${ESPERA_MS / 1000}s` : e.message };
  } finally {
    clearTimeout(relogio);
  }
};

/**
 * Segunda tentativa, com navegador de verdade.
 *
 * Metade das fontes deste fontes.md responde 403 para requisição direta ou serve
 * o conteúdo por JavaScript: o changelog oficial da Steam volta com a casca da
 * página e o Reddit volta com "please wait for verification". Parar na primeira
 * tentativa mandaria essas para o fontes.md como "não abre mais", o que seria
 * falso e apagaria fonte viva.
 *
 * O Playwright já é dependência daqui e é o que o `npm run testar` usa. Se ele
 * não estiver instalado, isto FALHA dizendo que faltou insumo: sem o navegador,
 * "morta" deixa de significar morta e passa a significar "não tentei direito".
 */
let navegador = null;
let navegadorIndisponivel = null;

const abrirNavegador = async () => {
  if (navegador || navegadorIndisponivel) return navegador;
  try {
    const { chromium } = await import('playwright');
    const doSandbox = '/opt/pw-browsers/chromium';
    const executablePath = process.env.CHROMIUM || (existsSync(doSandbox) ? doSandbox : undefined);
    navegador = await chromium.launch({ executablePath });
  } catch (e) {
    navegadorIndisponivel = e.message;
  }
  return navegador;
};

const buscarComNavegador = async (url) => {
  const nav = await abrirNavegador();
  if (!nav) return { http: 0, ok: false, corpo: '', erro: `navegador indisponível: ${navegadorIndisponivel}` };
  const contexto = await nav.newContext({ userAgent: AGENTE, locale: 'en-US', viewport: { width: 1280, height: 900 } });
  const pagina = await contexto.newPage();
  try {
    const resposta = await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: ESPERA_MS });
    await pagina.waitForTimeout(2000);
    const corpo = await pagina.content();
    const http = resposta ? resposta.status() : 0;
    return { http, ok: http >= 200 && http < 400, corpo };
  } catch (e) {
    return { http: 0, ok: false, corpo: '', erro: e.message.split('\n')[0] };
  } finally {
    await contexto.close();
  }
};

const cabecalho = (campos) =>
  ['---', ...Object.entries(campos).map(([k, v]) => `${k}: ${v}`), '---', ''].join('\n');

// ------------------------------------------------------------------ roda
const fontes = await readFile(arquivoFontes, 'utf-8');
const citadas = urlsCitadas(fontes);

const semAlvo = citadas.filter((u) => !ALVOS[u]);
if (semAlvo.length) {
  console.error('\n  ABORTADO. URL citada em fontes.md sem entrada em ALVOS deste script:');
  for (const u of semAlvo) console.error(`   - ${u}`);
  console.error('\n  Acrescente arquivo, uso e termos de relevância antes de gravar.\n');
  process.exit(1);
}

const orfas = Object.keys(ALVOS).filter((u) => !citadas.includes(u));
if (orfas.length) {
  console.error('\n  ABORTADO. Entrada em ALVOS que o fontes.md não cita mais:');
  for (const u of orfas) console.error(`   - ${u}`);
  console.error('\n  Tire a entrada daqui e o recorte de src/data/recortes/.\n');
  process.exit(1);
}

const filtro = process.argv.slice(2).filter((a) => !a.startsWith('-'))[0];
const fila = filtro ? citadas.filter((u) => u.includes(filtro)) : citadas;

if (!existsSync(pastaRecortes)) await mkdir(pastaRecortes, { recursive: true });

console.log('');
console.log(`  Gravando recorte de ${fila.length} URL${fila.length === 1 ? '' : 's'} citada${fila.length === 1 ? '' : 's'} no fontes.md`);
console.log('');

const resumo = { viva: [], 'sem-trecho': [], bloqueada: [], morta: [], preservado: [] };

const analisar = (corpo, termos) => {
  const blocos = paraTexto(corpo);
  return { blocos, ...recortar(blocos, termos) };
};

/**
 * Alguma prova é um BLOCO ESTRUTURADO, e não uma frase.
 *
 * `paraTexto` quebra linha em todo `</div>`, que é o certo para prosa e é
 * exatamente errado para tabela: a ficha do paldb põe o nome do material num
 * div e a quantidade no seguinte, então o recorte por termo saía como quatro
 * linhas dizendo "Paldium Fragment", "Ingot", "Wood", "Stone", SEM NENHUM
 * NÚMERO. Cabeçalho declarando que provava "Paldium 1, Ingot 1, Wood 3,
 * Stone 3", corpo provando nada disso, e a checagem do verificador aprovando,
 * porque ela só exige que exista linha citada.
 *
 * Quando o alvo declara `bloco`, a região é recortada do HTML cru e as tags
 * viram espaço em vez de quebra de linha, então nome e quantidade continuam na
 * mesma linha. Falta de insumo FALHA: bloco declarado que não aparece na página
 * devolve null e derruba o recorte para `sem-trecho`, em vez de gravar os
 * trechos por termo como se bastassem.
 */
const recortarBloco = (html, bloco, termos = []) => {
  if (!bloco) return null;
  const i = html.indexOf(bloco.de);
  if (i === -1) return null;
  // Tira as tags PRIMEIRO, numa janela folgada de HTML, e só depois corta o
  // texto. Cortar o HTML e limpar depois foi a primeira versão, e ela vazou
  // `<img loading="lazy" src="https://cdn...` para dentro da citação: a janela
  // caiu no meio de uma tag, o fecha-sinal ficou fora, e `<[^>]*>` não casou.
  // A janela de HTML é grande porque uma URL de imagem do paldb come 200 chars
  // sozinha, e a receita inteira cabe em 41 chars de texto.
  const texto = decodificar(
    html
      .slice(i, i + (bloco.html_chars ?? 6000))
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/<[^>]*$/, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, bloco.chars ?? MAX_CHARS_TRECHO);
  if (!texto) return null;
  // O bloco só vale se os termos de relevância estiverem DENTRO dele. Sem isto
  // uma página reestruturada gravaria a região vizinha, que abre onde o bloco
  // abria e não contém o que se quer provar.
  const faltando = termos.filter((t) => !texto.toLowerCase().includes(t.toLowerCase()));
  if (faltando.length) return { rotulo: bloco.rotulo, texto, faltando };
  return { rotulo: bloco.rotulo, texto };
};

const descrever = (t) => `${t.via} ${t.r.http ? `HTTP ${t.r.http}` : `falhou (${t.r.erro})`}`;

for (const url of fila) {
  const alvo = ALVOS[url];

  // Recorte que veio de outro ambiente não é regravável aqui, e regravar seria
  // destruir prova: as duas do VGC foram capturadas pelo Cowork, que não leva o
  // 403 da Cloudflare, e desta máquina elas voltam 403. Rodar o script sem esta
  // guarda apagaria o conteúdo delas e devolveria "bloqueada", desfazendo em
  // silêncio o trabalho de quem capturou. Some o arquivo, o script ABORTA: ele
  // não sabe refazer o que não capturou.
  if (alvo.origem) {
    const caminho = join(pastaRecortes, alvo.arquivo);
    if (!existsSync(caminho)) {
      console.error('');
      console.error(`  ABORTADO. ${alvo.arquivo} veio de fora (${alvo.origem}) e não está no repositório.`);
      console.error('  Este script não consegue recapturá-lo. Recupere o arquivo do histórico do Git.');
      console.error('');
      process.exit(1);
    }
    const cab = (await readFile(caminho, 'utf-8')).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '';
    const status = cab.match(/^status:\s*(\S+)\s*\r?$/m)?.[1] || 'sem status';
    resumo.preservado.push({ url, arquivo: alvo.arquivo, status });
    console.log(`   ${'preservado'.padEnd(12)} ${status.padEnd(10)} ${url}`);
    continue;
  }

  const feitas = [];

  // Requisição direta primeiro, que é barata. Navegador só quando ela não
  // rende trecho, porque metade destas fontes responde 403 para script ou
  // monta a página por JavaScript.
  for (const [via, buscador] of [['requisicao-direta', buscar], ['navegador', buscarComNavegador]]) {
    const r = await buscador(url);
    const analise = r.ok ? analisar(r.corpo, alvo.termos) : null;
    feitas.push({ via, r, analise });
    if (analise && analise.escolhidos.length) break;
  }

  const vencedora = feitas.find((t) => t.analise && t.analise.escolhidos.length)
    || feitas.find((t) => t.r.ok)
    || feitas[0];
  const { via, r, analise } = vencedora;
  const tentado = feitas.map(descrever).join('; ');

  const base = {
    url,
    capturado_em: hoje(),
    usado_para: JSON.stringify(alvo.usado_para),
  };

  if (!r.ok) {
    // 403 não é o mesmo que 404, e chamar os dois de "morta" seria impreciso
    // logo na página que existe para registrar imprecisão. A de baixo some; a
    // de cima provavelmente abre para uma pessoa e fecha para qualquer leitura
    // automatizada, o que dá no mesmo para o que esta tarefa cobra: prova que
    // só existe se um humano clicar não é prova reproduzível.
    const bloqueio = [401, 403, 429, 451].includes(r.http);
    const status = bloqueio ? 'bloqueada' : 'morta';
    const motivo = r.http ? `HTTP ${r.http}` : `falha de rede: ${r.erro}`;
    const texto =
      cabecalho({ ...base, status, resposta: JSON.stringify(motivo), tentado: JSON.stringify(tentado) }) +
      [
        `# ${alvo.arquivo.replace(/\.md$/, '')}`,
        '',
        bloqueio
          ? [
              `**Esta URL não abre por comando.** Ela responde ${motivo} tanto à requisição direta`,
              `quanto ao navegador automatizado, em ${hoje()}: ${tentado}. A página pode existir`,
              'para quem clica nela, e isso não a torna prova reproduzível.',
            ].join('\n')
          : [
              '**Esta URL não abre.** Tentada de duas formas, seguindo redirecionamento e com',
              `${ESPERA_MS / 1000}s de espera, em ${hoje()}: ${tentado}.`,
            ].join('\n'),
        '',
        `A afirmação que o fontes.md tira daqui (${alvo.usado_para.toLowerCase()}) fica`,
        'sem prova reproduzível até alguém abrir a fonte de novo ou substituí-la. Não invente',
        'outra URL no lugar: registre a perda, que é o que se pode afirmar.',
        '',
        `Termos que definiriam o trecho relevante: ${alvo.termos.join(', ')}.`,
        '',
      ].filter((l) => l !== '' || true).join('\n');
    await writeFile(join(pastaRecortes, alvo.arquivo), texto, 'utf-8');
    resumo[status].push({ url, motivo, arquivo: alvo.arquivo });
    console.log(`   ${status.toUpperCase().padEnd(12)} ${motivo.padEnd(10)} ${url}`);
    continue;
  }

  const { blocos, escolhidos, contagem } = analise;
  const achados = Object.entries(contagem)
    .filter(([, n]) => n > 0)
    .map(([t, n]) => `${t} (${n})`);
  // Alvo que declara `bloco` só é `viva` COM o bloco. Sem ele, os trechos por
  // termo sobrariam sozinhos e o recorte afirmaria no cabeçalho o que o corpo
  // não mostra, que é o modo de falha que este script existe para não repetir.
  const estruturado = recortarBloco(r.corpo, alvo.bloco, alvo.termos);
  const blocoServe = estruturado && !estruturado.faltando;
  const status = escolhidos.length && (!alvo.bloco || blocoServe) ? 'viva' : 'sem-trecho';
  const hash = createHash('sha256').update(r.corpo).digest('hex').slice(0, 16);

  const corpoArquivo = status === 'viva'
    ? [
        ...(estruturado ? [`### ${estruturado.rotulo}\n\n> ${estruturado.texto}`] : []),
        ...escolhidos.map(({ termo, trecho }) => `### ${termo}\n\n> ${trecho}`),
      ].join('\n\n')
    : alvo.bloco && !blocoServe
    ? [
        '**O bloco estruturado que sustenta a afirmação não está mais na página.**',
        estruturado
          ? `Ele foi achado e não contém ${estruturado.faltando.join(', ')}: a página mudou de forma, e o que abre onde o bloco abria já não é o bloco.`
          : `O recorte procurava por \`${alvo.bloco.de}\` e não achou.`,
        'Os trechos por termo sozinhos NÃO provam esta afirmação: eles trazem o nome de cada coisa',
        'e não os números ao lado. Reconfira antes de continuar citando.',
      ].join('\n')
    : [
        '**A página abriu e não contém nenhum dos termos de relevância**, nem por requisição',
        'direta nem por navegador. Ou ela mudou de assunto, ou o que ela serve é uma tela de',
        'verificação. Sem trecho, ela não prova nada: trate como fonte a reconferir, não como',
        'conferida.',
      ].join('\n');

  const texto =
    cabecalho({
      ...base,
      status,
      http: r.http,
      via,
      tentado: JSON.stringify(tentado),
      titulo: JSON.stringify(tituloDe(r.corpo)),
      termos_achados: JSON.stringify(achados.join('; ')),
      trechos: `${escolhidos.length} de ${alvo.termos.length} termos, em ${blocos.length} blocos de texto`,
      sha256_pagina: hash,
    }) +
    [
      `# ${alvo.arquivo.replace(/\.md$/, '')}`,
      '',
      `Recorte, não cópia: só o suficiente para reconferir *${alvo.usado_para.toLowerCase()}*.`,
      `A página inteira tinha ${blocos.length} blocos de texto e ${(r.corpo.length / 1024).toFixed(0)} KB.`,
      '',
      corpoArquivo,
      '',
    ].join('\n');

  await writeFile(join(pastaRecortes, alvo.arquivo), texto, 'utf-8');
  resumo[status].push({ url, arquivo: alvo.arquivo });
  console.log(`   ${(status === 'viva' ? 'viva' : 'SEM TRECHO').padEnd(12)} ${String(r.http).padEnd(10)} ${url}`);
}

if (navegador) await navegador.close();

// Recorte que sobrou de URL que saiu do fontes.md aparece aqui, não some.
const gravados = existsSync(pastaRecortes)
  ? (await readdir(pastaRecortes)).filter((f) => f.endsWith('.md'))
  : [];
const esperados = new Set(Object.values(ALVOS).map((a) => a.arquivo));
const sobrando = gravados.filter((f) => !esperados.has(f));

console.log('');
console.log(`  ${resumo.viva.length} com recorte, ${resumo.preservado.length} preservados de outro ambiente, ${resumo['sem-trecho'].length} sem trecho, ${resumo.bloqueada.length} bloqueadas, ${resumo.morta.length} mortas, de ${fila.length}`);
const semProva = [...resumo['sem-trecho'], ...resumo.bloqueada, ...resumo.morta];
if (semProva.length) {
  console.log('');
  console.log('  Sem prova reproduzivel, para registrar no fontes.md:');
  for (const m of semProva) console.log(`   - ${m.url}${m.motivo ? ` (${m.motivo})` : ''} -> ${m.arquivo}`);
}
if (sobrando.length) {
  console.log('');
  console.log(`  ${sobrando.length} recorte(s) sem URL correspondente: ${sobrando.join(', ')}`);
}
console.log('');

// Sem navegador, "morta" quer dizer "não tentei direito", e é assim que uma
// fonte viva entraria no fontes.md como perdida. Falha em vez de mentir.
if (navegadorIndisponivel && semProva.length) {
  console.error(`  FALTOU INSUMO: o navegador não subiu (${navegadorIndisponivel}), e a segunda`);
  console.error('  tentativa nunca rodou. As mortas e as sem trecho acima não valem: instale o');
  console.error('  Playwright (npx playwright install chromium) e grave de novo.');
  console.error('');
  process.exit(1);
}
