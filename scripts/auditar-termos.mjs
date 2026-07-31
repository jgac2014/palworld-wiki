/**
 * Audita a cobertura do dicionário bilíngue.
 *
 *   npm run termos:auditar
 *
 * Varre o conteúdo da wiki procurando expressões que parecem nome de coisa do
 * jogo e ainda não estão no dicionário. Serve para saber onde o seletor de
 * idioma está falhando antes de alguém reclamar.
 *
 * Não altera nada. Só relata.
 */
import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

const dicionario = JSON.parse(await readFile(join(raiz, 'src/data/termos.json'), 'utf-8')).termos;
const pals = JSON.parse(await readFile(join(raiz, 'src/data/pals.json'), 'utf-8'));
const mapa = JSON.parse(await readFile(join(raiz, 'src/data/mapa.json'), 'utf-8'));

// tudo que o dicionário já conhece, nas duas grafias
const conhecidos = new Set();
for (const t of Object.values(dicionario)) {
  if (t.pt) conhecidos.add(t.pt.toLowerCase());
  if (t.en) conhecidos.add(t.en.toLowerCase());
}
// nomes de Pals não são traduzidos, então não contam como lacuna
const nomesPals = new Set(pals.pals.map((p) => p.nome.toLowerCase()));

const pasta = join(raiz, 'src/content/wiki');
const arquivos = (await readdir(pasta)).filter((f) => f.endsWith('.md'));

/**
 * Heurística: expressões em Maiúsculas Consecutivas parecem nome próprio de
 * coisa do jogo. Duas ou mais palavras, ou uma palavra em inglês reconhecível.
 */
const PADRAO = /\b([A-ZÀ-Ý][a-zà-ÿ]+(?:\s+(?:de|da|do|dos|das|the|of)\s+)?(?:\s*[A-ZÀ-Ý][a-zà-ÿ]+)+)\b/g;

// ruído previsível: começo de frase, nomes de pessoa, termos da própria wiki
const IGNORAR = new Set([
  'early access', 'game pass', 'world settings', 'change world settings',
  'wing pack', 'pal calc', 'steam input', 'pal metal', 'ancient technology',
  'the big lead', 'dot esports', 'game8', 'pocket pair', 'pocketpair',
  'work suitability', 'work speed', 'life steal', 'quick stack',
]);

const candidatos = new Map();

for (const arquivo of arquivos) {
  const texto = await readFile(join(pasta, arquivo), 'utf-8');
  // fora de blocos de código e de links
  const limpo = texto
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^---[\s\S]*?---/m, ' ');

  for (const m of limpo.matchAll(PADRAO)) {
    const expr = m[1].trim();
    const chave = expr.toLowerCase();
    if (conhecidos.has(chave) || nomesPals.has(chave) || IGNORAR.has(chave)) continue;
    if (expr.split(/\s+/).length > 5) continue;
    if (!candidatos.has(chave)) candidatos.set(chave, { expr, arquivos: new Set(), n: 0 });
    const c = candidatos.get(chave);
    c.arquivos.add(arquivo);
    c.n++;
  }
}

// ordena por frequência: o que aparece mais é o que mais compensa traduzir
const ranking = [...candidatos.values()].sort((a, b) => b.n - a.n);

console.log('');
console.log(`  Dicionário atual: ${Object.keys(dicionario).length} termos`);
console.log(`  Pals catalogados: ${pals.pals.length}`);
console.log(`  Pontos no mapa:   ${mapa.marcadores.length}`);
console.log('');
console.log(`  Expressões no conteúdo que ainda não alternam de idioma: ${ranking.length}`);
console.log('');
console.log('  As 30 mais frequentes (traduzir estas primeiro):');
console.log('');
for (const c of ranking.slice(0, 30)) {
  const onde = [...c.arquivos].slice(0, 2).map((a) => a.replace('.md', '')).join(', ');
  console.log(`   ${String(c.n).padStart(3)}x  ${c.expr.padEnd(38)} ${onde}${c.arquivos.size > 2 ? ` +${c.arquivos.size - 2}` : ''}`);
}
console.log('');

// cobertura por página
console.log('  Cobertura por página:');
for (const arquivo of arquivos) {
  const texto = await readFile(join(pasta, arquivo), 'utf-8');
  let marcados = 0, faltando = 0;
  for (const t of Object.values(dicionario)) {
    if (t.pt && texto.includes(t.pt)) marcados++;
  }
  for (const c of ranking) if (c.arquivos.has(arquivo)) faltando++;
  const total = marcados + faltando;
  const pct = total ? Math.round((marcados / total) * 100) : 100;
  const barra = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
  console.log(`   ${barra} ${String(pct).padStart(3)}%  ${arquivo.replace('.md', '').padEnd(20)} ${marcados} ok, ${faltando} faltando`);
}
console.log('');
