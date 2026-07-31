/**
 * Verificação de integridade do projeto.
 *
 *   npm run verificar
 *
 * Roda todas as checagens objetivas de uma vez: estrutura dos dados, integridade
 * do conteúdo, consistência entre as duas coisas, e o que está em desacordo com
 * as próprias regras que a wiki declara seguir.
 *
 * Sai com código 1 se achar erro, para poder rodar em CI.
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const erros = [];
const avisos = [];
const ok = [];

const erro = (cat, msg) => erros.push({ cat, msg });
const aviso = (cat, msg) => avisos.push({ cat, msg });
const passou = (msg) => ok.push(msg);

// ---------------------------------------------------------------- dados
const lerJson = async (rel) => {
  const p = join(raiz, rel);
  if (!existsSync(p)) { erro('dados', `${rel} não existe`); return null; }
  try { return JSON.parse(await readFile(p, 'utf-8')); }
  catch (e) { erro('dados', `${rel} não é JSON válido: ${e.message}`); return null; }
};

const pals = await lerJson('src/data/pals.json');
const mapa = await lerJson('src/data/mapa.json');
const termos = await lerJson('src/data/termos.json');

if (pals) {
  const aptValidas = new Set(Object.keys(pals.aptidoes || {}));
  const fasesValidas = new Set(['mid', 'endgame', 'aura', 'utilidade', 'fazenda', 'combate']);
  const nomes = new Set();

  for (const p of pals.pals || []) {
    if (!p.nome) { erro('pals', 'Pal sem nome'); continue; }
    if (nomes.has(p.nome)) erro('pals', `${p.nome}: duplicado`);
    nomes.add(p.nome);
    if (p.fase && !fasesValidas.has(p.fase)) erro('pals', `${p.nome}: fase "${p.fase}" não existe`);
    for (const [k, v] of Object.entries(p.apt || {})) {
      if (!aptValidas.has(k)) erro('pals', `${p.nome}: aptidão "${k}" não existe`);
      if (typeof v !== 'number' || v < 1 || v > 10) erro('pals', `${p.nome}: aptidão ${k}=${v} fora da faixa 1-10`);
      if (v > 8) aviso('pals', `${p.nome}: ${k}=${v}. O teto natural é 8; acima disso só com condensação, confirme se é intencional`);
    }
    if (p.aura && !aptValidas.has(p.aura)) erro('pals', `${p.nome}: aura "${p.aura}" não existe`);
    if (!p.apt && !p.efeito && !p.aura) aviso('pals', `${p.nome}: sem aptidão, efeito nem aura. Serve para quê?`);
  }
  passou(`pals.json: ${pals.pals.length} Pals, estrutura válida`);
}

if (mapa) {
  const cats = new Set(Object.keys(mapa.categorias || {}));
  for (const m of mapa.marcadores || []) {
    if (!m.nome) erro('mapa', 'marcador sem nome');
    if (!cats.has(m.categoria)) erro('mapa', `${m.nome}: categoria "${m.categoria}" não declarada`);
    if (typeof m.x !== 'number' || typeof m.y !== 'number') erro('mapa', `${m.nome}: coordenada inválida`);
    if (m.x === 0 && m.y === 0) aviso('mapa', `${m.nome}: coordenada 0,0 parece placeholder`);
    if (!m.nota) aviso('mapa', `${m.nome}: sem anotação`);
  }
  passou(`mapa.json: ${mapa.marcadores.length} marcadores, ${cats.size} categorias`);
}

if (termos) {
  const t = termos.termos || {};
  let semPt = 0, iguais = 0;
  for (const [id, v] of Object.entries(t)) {
    if (!v.en) erro('termos', `${id}: sem termo em inglês`);
    if (!v.pt) semPt++;
    if (v.pt === v.en) iguais++;
  }
  if (semPt) aviso('termos', `${semPt} termos sem tradução em português`);
  passou(`termos.json: ${Object.keys(t).length} termos (${iguais} idênticos nos dois idiomas, o que é normal para nome próprio)`);
}

// -------------------------------------------- catálogo x curadoria de Pals
// O catálogo é importado do paldb e nunca editado à mão; pals.json é a nossa
// curadoria. Se os dois discordarem num número, a curadoria é que está errada.
// Isto roda offline: o importador vai à rede, esta checagem não.
const catalogo = await lerJson('src/data/catalogo.json');
if (catalogo && pals) {
  // Um catálogo menor que isto não é catálogo, é importação que falhou e foi
  // gravada mesmo assim. Melhor o build quebrar do que o site publicar vazio.
  if ((catalogo.total || 0) < 250) {
    erro('catalogo', `catálogo com só ${catalogo.total} Pals. Importação quebrada? Rode npm run catalogo:importar`);
  }

  const doJogo = new Map((catalogo.pals || []).map((p) => [p.en, p]));

  for (const p of pals.pals || []) {
    const oficial = doJogo.get(p.nome);
    // Nome que não existe no catálogo é ERRO, não aviso: ou é grafia errada
    // (foi assim que pegamos Ophidia -> Ophydia), ou o Pal foi renomeado num
    // patch e a curadoria ficou para trás. Nos dois casos precisa de gente.
    if (!oficial) { erro('catalogo', `${p.nome}: não existe no catálogo. Grafia errada ou renomeado em patch`); continue; }

    for (const [k, v] of Object.entries(p.apt || {})) {
      const vOficial = oficial.apt[k];
      // Aptidão que o catálogo não lista também é erro. Antes isso era pulado
      // em silêncio, e um bug no importador deixou o catálogo inteiro sem
      // energia e manipulação: 18 valores da curadoria ficaram sem conferência
      // e ninguém percebeu.
      if (vOficial == null) erro('catalogo', `${p.nome}: curadoria tem ${k}=${v}, o catálogo não lista essa aptidão`);
      else if (vOficial !== v) erro('catalogo', `${p.nome}: ${k} está ${v}, o jogo diz ${vOficial}`);
    }

    // Elementos também são dados do jogo, não opinião. A revisão de 30.07 achou
    // 12 Pals com elemento errado na curadoria, incluindo tradução não oficial.
    const nossos = [...(p.elementos || [])].sort().join('/');
    const deles = (oficial.elementos || []).map((e) => e.pt).sort().join('/');
    if (nossos !== deles) erro('catalogo', `${p.nome}: elementos "${nossos || 'nenhum'}" na curadoria, o jogo diz "${deles}"`);
  }

  const cobertura = catalogo.total ? ((pals.pals.length / catalogo.total) * 100).toFixed(0) : '?';
  passou(`catálogo: ${catalogo.total} Pals do jogo, ${pals.pals.length} com curadoria nossa (${cobertura}%), aptidões e elementos conferidos`);
}

// ---------------------------------------------------------------- conteúdo
const pastaWiki = join(raiz, 'src/content/wiki');
const arquivos = (await readdir(pastaWiki)).filter((f) => f.endsWith('.md'));
const ordens = new Map();
const corpos = {};

for (const arquivo of arquivos) {
  const bruto = await readFile(join(pastaWiki, arquivo), 'utf-8');
  const m = bruto.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) { erro('conteudo', `${arquivo}: frontmatter ausente ou malformado`); continue; }
  const [, fm, corpo] = m;
  corpos[arquivo] = corpo;

  for (const campo of ['titulo', 'descricao', 'ordem']) {
    if (!new RegExp(`^${campo}:`, 'm').test(fm)) erro('conteudo', `${arquivo}: falta "${campo}" no frontmatter`);
  }
  // Aceita ordem com aspas e normaliza zero à esquerda: "07" e 7 são a mesma
  // posição para o YAML, então precisam colidir aqui também.
  const ordBruto = fm.match(/^ordem:\s*["']?(\d+)["']?\s*$/m)?.[1];
  if (ordBruto != null) {
    const ord = String(Number(ordBruto));
    if (ordens.has(ord)) erro('conteudo', `${arquivo}: ordem ${ord} repetida com ${ordens.get(ord)}`);
    ordens.set(ord, arquivo);
  } else if (/^ordem:/m.test(fm)) {
    erro('conteudo', `${arquivo}: campo "ordem" existe mas não é um número legível`);
  }

  // marcação
  const negritos = (corpo.match(/\*\*/g) || []).length;
  if (negritos % 2) erro('markdown', `${arquivo}: ${negritos} marcas de negrito, número ímpar`);

  const abre = (corpo.match(/^:::\w+/gm) || []).length;
  const fecha = (corpo.match(/^:::\s*$/gm) || []).length;
  if (abre !== fecha) erro('markdown', `${arquivo}: ${abre} caixas abertas e ${fecha} fechadas`);

  // tabelas com número de colunas inconsistente
  const linhas = corpo.split('\n');
  let cab = null, nCols = 0, linhaCab = 0;
  linhas.forEach((ln, i) => {
    if (/^\|.*\|$/.test(ln.trim())) {
      const cols = ln.split('|').length - 2;
      if (/^\|[\s:-]+\|$/.test(ln.trim().replace(/[^|\s:-]/g, ''))) return;
      if (cab === null) { cab = ln; nCols = cols; linhaCab = i + 1; }
      else if (cols !== nCols) {
        aviso('markdown', `${arquivo}:${i + 1} tabela com ${cols} colunas, cabeçalho na linha ${linhaCab} tem ${nCols}`);
      }
    } else if (ln.trim() === '') { cab = null; }
  });

  // restos da conversão automática: palavras coladas por perda de espaço.
  // Nome de variável e identificador em código usam maiúscula no meio de
  // propósito, então ficam de fora.
  for (const [i, ln] of linhas.entries()) {
    if (/\|/.test(ln) || /https?:/.test(ln) || /`/.test(ln)) continue;
    const trecho = ln.match(/\b\w*[a-záéíóúç][A-ZÁÉÍÓÚÇ]\w*\b/)?.[0];
    if (!trecho || trecho.length <= 6) continue;
    if (/^[A-Z]/.test(trecho)) continue;
    if (/^[bin][A-Z]/.test(trecho)) continue;        // bExiste, isAlgo, nCoisa
    aviso('markdown', `${arquivo}:${i + 1} palavras possivelmente coladas: "${trecho}"`);
  }
}
passou(`conteúdo: ${arquivos.length} páginas, frontmatter e marcação verificados`);

// -------------------------------------------------- consistência factual
const juntos = Object.entries(corpos);
const REGRAS = [
  // "era 65" e "de 65 para 80" citam o valor antigo de propósito: não são divergência
  { nome: 'level cap', re: /level cap(?![^.]{0,30}\bera\b)[^.]{0,30}?\b(\d{2,3})\b/gi, esperado: '80' },
  { nome: 'total de Pals', re: /(\d{3})\s*Pals no Paldeck|Paldeck[^.]{0,20}(\d{3})/gi, esperado: '287' },
  { nome: 'cópias para condensar', re: /(\d{2,3})\s*(?:c[óo]pias|Pals) para (?:condensar|rank m[áa]ximo)/gi, esperado: '48' },
];
for (const regra of REGRAS) {
  const achados = new Map();
  for (const [arq, corpo] of juntos) {
    for (const m of corpo.matchAll(regra.re)) {
      const v = m[1] || m[2];
      if (v) achados.set(v, [...(achados.get(v) || []), arq]);
    }
  }
  if (achados.size > 1) {
    const detalhe = [...achados.entries()].map(([v, as]) => `${v} em ${as.join(', ')}`).join(' | ');
    erro('fatos', `${regra.nome}: valores divergentes entre páginas -> ${detalhe}`);
  } else if (achados.size === 1) {
    const [v] = [...achados.keys()];
    if (regra.esperado && v !== regra.esperado) {
      aviso('fatos', `${regra.nome}: encontrado ${v}, esperado ${regra.esperado}`);
    } else passou(`${regra.nome}: ${v}, consistente em todas as páginas`);
  }
}

// ------------------------------------------- Pals citados x catalogados
if (pals) {
  const catalogados = new Set(pals.pals.map((p) => p.nome));
  const citados = new Map();
  for (const [arq, corpo] of juntos) {
    for (const p of catalogados) {
      if (corpo.includes(p)) citados.set(p, true);
    }
  }
  const semCitacao = [...catalogados].filter((p) => !citados.has(p));
  if (semCitacao.length > 12) {
    aviso('cruzado', `${semCitacao.length} Pals catalogados não aparecem em nenhum guia`);
  }
  passou(`cruzado: ${citados.size} de ${catalogados.size} Pals do banco aparecem nos guias`);
}

// ---------------------------------------------------------------- saída
const cor = (s) => s;
console.log('');
console.log('  ' + '='.repeat(64));
console.log('  VERIFICAÇÃO DE INTEGRIDADE');
console.log('  ' + '='.repeat(64));
console.log('');
for (const o of ok) console.log(`   ok    ${o}`);
if (avisos.length) {
  console.log('');
  console.log(`   ${avisos.length} avisos:`);
  const porCat = {};
  for (const a of avisos) (porCat[a.cat] ||= []).push(a.msg);
  for (const [cat, msgs] of Object.entries(porCat)) {
    console.log(`    [${cat}]`);
    for (const m of msgs.slice(0, 8)) console.log(`       ${m}`);
    if (msgs.length > 8) console.log(`       e mais ${msgs.length - 8}`);
  }
}
if (erros.length) {
  console.log('');
  console.log(`   ${erros.length} ERROS:`);
  for (const e of erros) console.log(`    [${e.cat}] ${e.msg}`);
}
console.log('');
console.log(`  ${erros.length ? 'FALHOU' : 'PASSOU'}  ${ok.length} verificações ok, ${avisos.length} avisos, ${erros.length} erros`);
console.log('');
process.exit(erros.length ? 1 : 0);
