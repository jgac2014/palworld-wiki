/**
 * Importa os marcadores do mapa do paldb.
 *
 *   npm run mapa:importar
 *
 * Mesmo caminho dos outros importadores: uma requisição por idioma, o dado do
 * jogo entra como veio e nada é digitado à mão.
 *
 * A fonte é `https://paldb.cc/js/map_data_<idioma>.js`, que declara cinco
 * variáveis soltas (`config`, `iconLookup`, `fixedDungeon`, `regionData`,
 * `extrasIngame`). Não é JSON e não é módulo, então é avaliado num contexto
 * isolado do `node:vm`, que executa a declaração e devolve os objetos sem dar
 * acesso a nada deste processo.
 *
 * SÃO DOIS SISTEMAS DE COORDENADA, e confundir os dois põe marcador no oceano:
 *
 * - `fixedDungeon` (13.755 pontos) traz `pos`, que é coordenada de MUNDO da
 *   Unreal, na casa das centenas de milhar.
 * - `regionData` (80) e `extrasIngame` (41) trazem `ipos`, que é a coordenada
 *   que o JOGO MOSTRA na tela do mapa, a mesma que o `mapa.json` já usa.
 *
 * A conversão de mundo para tela está em `src/data/projecao-mapa.json` e foi
 * conferida contra a própria fonte: os 121 pontos que o paldb publica em `ipos`
 * caem em cima de pontos projetados a partir de `pos`, com mediana de 4,5
 * unidades e boa parte abaixo de 1. Quem guarda essa prova é o verificador.
 *
 * Tudo é gravado em coordenada de TELA, nunca em pixel. Pixel dependeria do
 * tamanho da imagem de fundo, que ainda não existe (tarefa H1), e amarraria o
 * dado a uma exportação específica.
 */
import { writeFile, readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const respirar = () => new Promise((r) => setTimeout(r, 700));

async function baixar(idioma) {
  const r = await fetch(`https://paldb.cc/js/map_data_${idioma}.js`, {
    headers: { 'User-Agent': 'wiki-palworld-do-grupo (importacao de mapa)' },
  });
  if (!r.ok) throw new Error(`paldb map_data_${idioma} respondeu ${r.status}`);
  const fonte = await r.text();
  const contexto = createContext({});
  runInContext(fonte, contexto);
  return contexto;
}

const abortar = (msg) => {
  console.error(`\n  ABORTADO: ${msg} Nada foi escrito.`);
  process.exit(1);
};

// O `item` do paldb vem com <img> de elemento embutido no meio do nome.
const limpar = (s) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Categoria que o paldb não preenche. Ela EXISTE e tem ponto dentro, então
// ganha nome próprio em vez de virar "undefined" na tela ou sumir da lista.
const SEM_CATEGORIA = '_sem_categoria';
const NOME_DA_CATEGORIA = {
  Enemies: { pt: 'Inimigos', en: 'Enemies' },
  Resource: { pt: 'Recursos', en: 'Resource' },
  Locations: { pt: 'Lugares', en: 'Locations' },
  Fishing: { pt: 'Pesca', en: 'Fishing' },
  Eggs: { pt: 'Ovos', en: 'Eggs' },
  Mine: { pt: 'Mineração', en: 'Mine' },
  NPCs: { pt: 'NPCs', en: 'NPCs' },
  Collectibles: { pt: 'Coletáveis', en: 'Collectibles' },
  Oilrig: { pt: 'Plataformas de petróleo', en: 'Oil rigs' },
  Other: { pt: 'Outros', en: 'Other' },
  [SEM_CATEGORIA]: { pt: 'Sem categoria no paldb', en: 'Uncategorised in paldb' },
};

console.log('  baixando map_data em inglês...');
const en = await baixar('en');
await respirar();
console.log('  baixando map_data em português...');
const pt = await baixar('pt');

const cfg = en.config || {};
const min = cfg.landScapeRealPositionMin;
const max = cfg.landScapeRealPositionMax;
if (!min || !max) abortar('o config do paldb não trouxe landScapeRealPosition.');

const projecao = JSON.parse(await readFile(join(raiz, 'src/data/projecao-mapa.json'), 'utf-8'));
const { escala, deslocamento_x, deslocamento_y } = projecao.mundo_para_tela;
// Eixos trocados de propósito: o X do mundo vira o Y da tela e vice-versa.
const paraTela = (p) => ({
  x: Math.round(((p.Y - deslocamento_x) / escala) * 10) / 10,
  y: Math.round(((p.X + deslocamento_y) / escala) * 10) / 10,
});

// Os limites que a projeção assume têm que continuar sendo os que a fonte
// publica. Se o paldb remapear o mundo, a conversão inteira muda de sentido e
// TODO marcador sai do lugar de uma vez, que é o defeito mais difícil de ver.
for (const [campo, esperado, veio] of [
  ['landScapeRealPositionMin.X', projecao.limites_do_mundo.min_x, min.X],
  ['landScapeRealPositionMin.Y', projecao.limites_do_mundo.min_y, min.Y],
  ['landScapeRealPositionMax.X', projecao.limites_do_mundo.max_x, max.X],
  ['landScapeRealPositionMax.Y', projecao.limites_do_mundo.max_y, max.Y],
]) {
  if (esperado !== veio) {
    abortar(`o paldb mudou ${campo}: a projeção assume ${esperado} e a fonte agora diz ${veio}. Todo marcador sairia do lugar de uma vez.`);
  }
}

// ------------------------------------------------------------------ tipos
const tipos = {};
for (const [chave, v] of Object.entries(en.iconLookup || {})) {
  const rotuloEn = limpar(v.label || chave);
  const rotuloPt = limpar(pt.iconLookup?.[chave]?.label || rotuloEn);
  tipos[chave] = {
    en: rotuloEn,
    pt: rotuloPt,
    categoria: v.category || SEM_CATEGORIA,
    // O paldb traduziu 38 dos 84 rótulos. Os outros ficam em inglês e DIZEM
    // isso, como já acontece em itens.json: esconder faria o leitor achar que
    // "Fishing Spot" é o nome em português.
    ...(rotuloPt === rotuloEn ? { sem_traducao_oficial: true } : {}),
  };
}
if (!Object.keys(tipos).length) abortar('o iconLookup veio vazio.');

// ------------------------------------------------------------------ pontos
const pontos = [];
for (const p of en.fixedDungeon || []) {
  if (!p.pos || !p.type) continue;
  const tela = paraTela(p.pos);
  const nomeEn = limpar(p.item);
  const nomePt = limpar((pt.fixedDungeon || []).find((q) => q.id === p.id && q.type === p.type)?.item);
  pontos.push({
    t: p.type,
    x: tela.x,
    y: tela.y,
    // Nome só quando acrescenta alguma coisa ao rótulo do tipo. Repetir "Ore"
    // em 1.463 pontos custaria uns 30 KB para não dizer nada.
    ...(nomeEn && nomeEn !== tipos[p.type]?.en ? { en: nomeEn } : {}),
    ...(nomePt && nomePt !== nomeEn && nomePt !== tipos[p.type]?.pt ? { pt: nomePt } : {}),
    ...(typeof p.lv === 'number' ? { lv: p.lv } : {}),
  });
}

// `regionData` e `extrasIngame` JÁ vêm em coordenada de tela. Passá-los pela
// projeção jogaria os 121 para fora do mapa.
const extras = [];
for (const [origem, lista, listaPt] of [
  ['regiao', en.regionData, pt.regionData],
  ['extra', en.extrasIngame, pt.extrasIngame],
]) {
  for (const [i, e] of (lista || []).entries()) {
    if (!e.ipos) continue;
    const nomeEn = limpar(e.item);
    const nomePt = limpar(listaPt?.[i]?.item);
    extras.push({
      origem,
      t: e.type,
      x: e.ipos.X,
      y: e.ipos.Y,
      ...(nomeEn ? { en: nomeEn } : {}),
      ...(nomePt && nomePt !== nomeEn ? { pt: nomePt } : {}),
      ...(typeof e.lv === 'number' ? { lv: e.lv } : {}),
    });
  }
}

// ------------------------------------------------------------------ guardas
if (pontos.length < 12000) {
  abortar(`só ${pontos.length} pontos (mínimo 12.000). A fonte encolheu ou mudou de forma.`);
}
const OBRIGATORIAS = {
  'viagem rápida': ['Fast Travel'],
  dungeon: ['Dungeon', 'Fixed Dungeon', 'Cave', 'Sealed Realm'],
  minério: ['Ore'],
  tesouro: ['Treasure'],
};
const porTipo = {};
for (const p of pontos) porTipo[p.t] = (porTipo[p.t] || 0) + 1;
const vazias = Object.entries(OBRIGATORIAS)
  .filter(([, chaves]) => !chaves.some((c) => porTipo[c] > 0))
  .map(([nome]) => nome);
if (vazias.length) {
  abortar(`categoria principal vazia: ${vazias.join(', ')}. O mapa subiria sem o que mais se procura nele.`);
}
const semTipo = [...new Set([...pontos, ...extras].map((p) => p.t).filter((t) => !tipos[t]))];
if (semTipo.length) abortar(`${semTipo.length} tipos de ponto sem entrada no iconLookup: ${semTipo.join(', ')}.`);

// ------------------------------------------------------------------ saída
const porCategoria = {};
for (const p of pontos) {
  const cat = tipos[p.t].categoria;
  porCategoria[cat] = (porCategoria[cat] || 0) + 1;
}

const saida = {
  _leia_isto:
    'Marcadores do mapa importados de paldb.cc/js/map_data_<idioma>.js. NÃO edite à mão: rode npm run mapa:importar. ' +
    'As coordenadas x e y são as que o JOGO MOSTRA na tela do mapa, as mesmas de mapa.json, nunca pixel: pixel dependeria ' +
    'do tamanho da imagem de fundo e amarraria o dado a uma exportação. Os pontos de "pontos" vêm de fixedDungeon, em ' +
    'coordenada de mundo, e passaram pela projeção de projecao-mapa.json. Os de "extras" já vinham em coordenada de tela ' +
    'e não foram convertidos. Rótulo com sem_traducao_oficial é o que o paldb não traduziu, e fica em inglês de propósito.',
  fonte: 'https://paldb.cc/js/map_data_en.js e map_data_pt.js',
  importado_em: new Date().toISOString().slice(0, 10),
  projecao: projecao.mundo_para_tela,
  categorias: NOME_DA_CATEGORIA,
  total: pontos.length,
  total_extras: extras.length,
  tipos,
  pontos,
  extras,
};

const destino = join(raiz, 'src/data/mapa-pontos.json');
await writeFile(destino, JSON.stringify(saida), 'utf-8');

const traduzidos = Object.values(tipos).filter((t) => !t.sem_traducao_oficial).length;
const kb = (JSON.stringify(saida).length / 1024).toFixed(0);
console.log(`\n  ${pontos.length} pontos e ${extras.length} extras, ${Object.keys(tipos).length} tipos (${traduzidos} com rótulo em português)`);
console.log('  por categoria:');
for (const [cat, n] of Object.entries(porCategoria).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${(NOME_DA_CATEGORIA[cat]?.pt || cat).padEnd(26)} ${String(n).padStart(6)}`);
}
console.log(`\n  escrito em src/data/mapa-pontos.json (${kb} KB)`);
