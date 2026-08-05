/**
 * Confere os drops importados do paldb contra a palworld.wiki.gg.
 *
 *   npm run drops:conferir
 *
 * Por que existe: atributo de Pal nao e discreto, e comparar o importado com a
 * mesma fonte de onde ele veio e conferir o paldb com ele mesmo. Drop E
 * discreto, e a wiki.gg publica os dele em wikitext estruturado, entao esta e a
 * unica parte da ficha de Pal que da para conferir contra fonte independente
 * por comando.
 *
 * A wiki.gg responde 403 para leitura direta, por causa da Cloudflare, e a
 * api.php responde 200. E o mesmo caminho que o mapa ja usa para os limites de
 * enquadramento, registrado em fontes.md.
 *
 * DUAS DIFERENCAS DE FORMATO QUE PRECISAM DE CUIDADO, e ignorar qualquer uma
 * produz divergencia inventada:
 *
 * 1. A wiki.gg publica NOME EXIBIDO ("Berry Seeds") e o paldb publica CHAVE
 *    ("Berry_Seeds"). O casamento e pelo nome em ingles de itens.json, que e a
 *    unica tabela que liga os dois.
 *
 * 2. O `alpha_drops` da wiki.gg INCLUI os drops normais; a pagina de alfa do
 *    paldb traz so os EXTRAS. Comparar cru daria divergencia em todo Pal do
 *    jogo. Aqui a comparacao soma normal + extras antes de comparar, e a soma
 *    fica dita na saida para ninguem achar que o paldb publica a lista inteira.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const API = 'https://palworld.wiki.gg/api.php';
const PAUSA = 400;

const arquivo = join(raiz, 'src/data/fichas-pal.json');
if (!existsSync(arquivo)) {
  console.error('  src/data/fichas-pal.json nao existe. Rode "npm run fichas:importar" antes.');
  process.exit(1);
}
const fichas = JSON.parse(readFileSync(arquivo, 'utf8'));
const catalogo = JSON.parse(readFileSync(join(raiz, 'src/data/catalogo.json'), 'utf8')).pals;
const itens = JSON.parse(readFileSync(join(raiz, 'src/data/itens.json'), 'utf8')).itens;

const enPorChave = new Map(itens.map((i) => [i.chave, i.en]));
const nomeEnDoPal = new Map(catalogo.map((p) => [p.chave, p.en]));

/** "Berry Seeds*1@100; Low Grade Medical Supplies*1@20" -> lista normalizada. */
const lerLista = (s) =>
  (s || '')
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/^(.+?)\*([\d]+)(?:-([\d]+))?@([\d.]+)$/);
      if (!m) return null;
      return { nome: m[1].trim(), min: Number(m[2]), max: Number(m[3] ?? m[2]), probabilidade: Number(m[4]) };
    })
    .filter(Boolean);

/** Nosso registro na mesma forma, com o nome em ingles vindo de itens.json. */
const nosso = (lista) =>
  (lista || []).map((d) => ({
    nome: enPorChave.get(d.chave) ?? `(chave sem item: ${d.chave})`,
    min: d.min,
    max: d.max,
    probabilidade: d.probabilidade,
  }));

const comoTexto = (l) =>
  [...l]
    .map((d) => `${d.nome}*${d.min === d.max ? d.min : `${d.min}-${d.max}`}@${d.probabilidade}`)
    .sort()
    .join('; ');

const alvos = Object.keys(fichas.fichas);
console.log(`  Conferindo os drops de ${alvos.length} Pal(s) contra a palworld.wiki.gg, um por vez.`);
console.log('');

const divergencias = [];
const semPagina = [];
let conferidos = 0;

for (const chave of alvos) {
  const titulo = nomeEnDoPal.get(chave) ?? chave.replace(/_/g, ' ');
  const url = `${API}?action=parse&page=${encodeURIComponent(titulo)}&prop=wikitext&format=json&formatversion=2`;
  let wikitext = null;
  try {
    const r = await fetch(url, { headers: { 'user-agent': 'wiki-palworld (projeto de fa, sem fins lucrativos)' } });
    if (r.ok) {
      const j = await r.json();
      wikitext = j?.parse?.wikitext ?? null;
    }
  } catch { /* tratado abaixo como pagina ausente */ }
  await new Promise((s) => setTimeout(s, PAUSA));

  if (!wikitext) { semPagina.push(titulo); continue; }
  const bloco = wikitext.match(/\{\{Item Drop([\s\S]*?)\}\}/);
  if (!bloco) { semPagina.push(`${titulo} (sem bloco Item Drop)`); continue; }

  const campo = (nome) => bloco[1].match(new RegExp(`\\|\\s*${nome}\\s*=([^\\n|]*)`))?.[1]?.trim() ?? '';
  const wikiNormal = lerLista(campo('normal_drops'));
  const wikiAlfa = lerLista(campo('alpha_drops'));

  const f = fichas.fichas[chave];
  const nossoNormal = nosso(f.drops);
  // A soma explicada no cabecalho: o paldb da so os extras do alfa.
  const nossoAlfa = [...nosso(f.drops), ...nosso(f.drops_alfa)];

  conferidos++;
  for (const [rotulo, a, b] of [['normal', nossoNormal, wikiNormal], ['alfa', nossoAlfa, wikiAlfa]]) {
    if (!b.length) continue; // a wiki.gg nao publica esse campo para este Pal
    if (comoTexto(a) === comoTexto(b)) continue;
    // Diferenca por CONJUNTO, e nao a linha inteira lado a lado.
    //
    // Comparar as duas listas como texto dizia "divergem" e deixava para o
    // leitor achar onde, em 15 blocos de cinco itens. As tres classes de
    // diferenca so ficaram visiveis quando a saida passou a dizer o que sobra
    // de cada lado, e elas pedem decisoes diferentes: item que a wiki.gg nomeia
    // e nao existe no nosso catalogo e nome trocado, e item que existe nos dois
    // catalogos e cada fonte poe num Pal diferente e contradicao de verdade.
    const como = (d) => `${d.nome}*${d.min === d.max ? d.min : `${d.min}-${d.max}`}@${d.probabilidade}`;
    const nossos = new Set(a.map(como));
    const deles = new Set(b.map(como));
    divergencias.push({
      chave,
      rotulo,
      soNoPaldb: [...nossos].filter((x) => !deles.has(x)).sort(),
      soNaWiki: [...deles].filter((x) => !nossos.has(x)).sort(),
      // Nome que a wiki.gg usa e que nao existe em itens.json nao pode ser
      // contradicao sobre qual item cai: e outra grafia, ou item que a nossa
      // importacao nao tem. A distincao muda quem esta errado.
      nomesDesconhecidos: [...deles]
        .map((x) => x.slice(0, x.lastIndexOf('*')))
        .filter((n) => !itens.some((i) => i.en === n))
        .sort(),
    });
  }
}

console.log(`  ${conferidos} Pal(s) conferido(s), ${semPagina.length} sem pagina ou sem bloco de drop na wiki.gg`);
if (semPagina.length) console.log(`    ${semPagina.join(', ')}`);
console.log('');

if (!divergencias.length) {
  console.log('  Nenhuma divergencia: paldb e wiki.gg dizem a mesma coisa nos drops conferidos.');
} else {
  console.log(`  ${divergencias.length} DIVERGENCIA(S):`);
  for (const d of divergencias) {
    console.log('');
    console.log(`    ${d.chave} (${d.rotulo})`);
    if (d.soNoPaldb.length) console.log(`      so no paldb:   ${d.soNoPaldb.join('; ')}`);
    if (d.soNaWiki.length) console.log(`      so na wiki.gg: ${d.soNaWiki.join('; ')}`);
    if (d.nomesDesconhecidos.length) {
      console.log(`      (nomes que nao existem em itens.json: ${[...new Set(d.nomesDesconhecidos)].join(', ')})`);
    }
  }
  // Resumo por item, que e o que mostra se a diferenca e sistematica ou avulsa.
  const conta = new Map();
  for (const d of divergencias) {
    for (const [lado, lista] of [['so na wiki.gg', d.soNaWiki], ['so no paldb', d.soNoPaldb]]) {
      for (const x of lista) {
        const nome = x.slice(0, x.lastIndexOf('*'));
        const k = `${lado}: ${nome}`;
        conta.set(k, (conta.get(k) ?? 0) + 1);
      }
    }
  }
  console.log('');
  console.log('  Por item, do mais frequente para o menos:');
  for (const [k, n] of [...conta].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${String(n).padStart(3)}x  ${k}`);
  }
}
console.log('');

// Falta de insumo REPROVA: zero conferidos com a lista cheia quer dizer que a
// api.php parou de responder, e nao que esta tudo certo.
if (alvos.length && !conferidos) {
  console.error('  ABORTADO: nenhum Pal pode ser conferido. A api.php da wiki.gg respondeu?');
  process.exit(1);
}
process.exit(divergencias.length ? 1 : 0);
