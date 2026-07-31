/**
 * Padroniza o conteúdo para usar o nome em português como principal.
 *
 *   npm run conteudo:padronizar          # mostra o que mudaria, sem gravar
 *   npm run conteudo:padronizar -- --gravar
 *
 * A wiki foi escrita misturando os dois idiomas: "Árvore Mundial" num parágrafo
 * e "World Tree" no seguinte. Para quem joga em português isso é ruído, e para o
 * seletor de idioma é pior ainda, porque um texto já em inglês não tem o que
 * alternar.
 *
 * A regra aplicada é a mesma do guia de contribuição: nome em português como
 * principal, e o inglês entre parênteses na primeira menção de cada página.
 *
 * Nunca mexe em: título de seção, bloco de código, endereço de link, texto do
 * link, nome de Pal (que o jogo não traduz) e nome de site citado como fonte.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const gravar = process.argv.includes('--gravar');

const dicionario = JSON.parse(await readFile(join(raiz, 'src/data/termos.json'), 'utf-8')).termos;
const pals = JSON.parse(await readFile(join(raiz, 'src/data/pals.json'), 'utf-8'));
const nomesPals = new Set(pals.pals.map((p) => p.nome));

/**
 * Termos que NÃO são trocados automaticamente, e o motivo.
 *
 * Três categorias, todas descobertas rodando a simulação e lendo o resultado:
 *
 * 1. Palavra genérica que aparece dentro de termo composto. Trocar "Technology"
 *    sozinho transforma "Ancient Technology 72" em "Ancient Tecnologias 72".
 * 2. Troca que quebra concordância. "o Paldeck foi renumerado" viraria
 *    "o Palpédia foi renumerado", com gênero errado.
 * 3. Ingrediente de receita, onde o nome curto em inglês é mais legível na
 *    tabela e já está consagrado no uso do grupo.
 */
const MANTER_EM_INGLES = new Set([
  // 1. genéricas que vivem dentro de compostos
  'Technology', 'Work Speed', 'Condensation', 'Guild', 'Schematic',
  'Egg', 'Mining', 'Cake', 'Ranch', 'Mill',
  // 2. mudam o gênero da frase
  'Paldeck', 'Capture Bonus', 'Sanity', 'Base Camp',
  // 3. ingredientes, mais legíveis curtos
  'Honey', 'Milk', 'Tomato', 'Lettuce', 'Mushroom', 'Cavern Mushroom',
  'Ingot', 'Nail', 'Cement', 'Polymer', 'Flour', 'Cotton Candy',
  'Refined Ingot', 'Pal Metal Ingot', 'Circuit Board', 'Carbon Fiber',
]);

// Pares EN -> PT, do mais longo para o mais curto.
const pares = Object.entries(dicionario)
  .filter(([, t]) => t.en && t.pt && t.en !== t.pt)
  .filter(([, t]) => !MANTER_EM_INGLES.has(t.en))
  .filter(([, t]) => !nomesPals.has(t.en))
  .filter(([, t]) => t.en.length >= 5)
  .map(([id, t]) => ({ id, en: t.en, pt: t.pt }))
  .sort((a, b) => b.en.length - a.en.length);

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Divide o texto em pedaços mexíveis e não mexíveis, para nunca tocar em
 * código, link, título ou linha de fonte.
 */
function fatiar(texto) {
  const protegido = [
    /```[\s\S]*?```/g,          // bloco de código
    /`[^`\n]*`/g,               // código em linha
    /\[[^\]]*\]\([^)]*\)/g,     // link markdown inteiro
    /https?:\/\/\S+/g,          // url solta
    /^#{1,6} .*$/gm,            // título
    /^---[\s\S]*?^---$/gm,      // frontmatter
    /^\s*(Sources?|Fontes?):.*$/gim,
  ];
  const faixas = [];
  for (const re of protegido) {
    for (const m of texto.matchAll(re)) faixas.push([m.index, m.index + m[0].length]);
  }
  faixas.sort((a, b) => a[0] - b[0]);
  const unidas = [];
  for (const f of faixas) {
    const ult = unidas[unidas.length - 1];
    if (ult && f[0] <= ult[1]) ult[1] = Math.max(ult[1], f[1]);
    else unidas.push([...f]);
  }
  return unidas;
}

const protegidoEm = (faixas, i, fim) => faixas.some(([a, b]) => i < b && fim > a);

/**
 * Páginas que ficam de fora.
 * O glossário É a tabela de equivalência entre os idiomas: padronizar ele
 * apagaria justamente a coluna em inglês, que é o conteúdo da página.
 * A de fontes é lista de referências, onde o nome original importa.
 */
const NAO_MEXER = new Set(['glossario.md', 'fontes.md']);

const pasta = join(raiz, 'src/content/wiki');
const arquivos = (await readdir(pasta)).filter((f) => f.endsWith('.md') && !NAO_MEXER.has(f));

let totalTrocas = 0;
const resumo = [];

for (const arquivo of arquivos) {
  const original = await readFile(join(pasta, arquivo), 'utf-8');
  let texto = original;
  const trocasNoArquivo = [];

  // faixas já trocadas nesta página: um termo curto nunca entra dentro
  // do resultado de um termo longo trocado antes
  const jaTrocado = [];

  for (const par of pares) {
    const re = new RegExp(`\\b${escapar(par.en)}\\b`, 'g');
    let primeira = true;
    let deslocamento = 0;
    const faixas = [...fatiar(texto), ...jaTrocado];
    const substituicoes = [];

    for (const m of texto.matchAll(re)) {
      if (protegidoEm(faixas, m.index, m.index + m[0].length)) continue;
      // se o casamento faz parte de um nome maior, deixa quieto:
      // "Ancient Technology" não pode virar "Ancient Tecnologias"
      const vizinhoAntes = texto.slice(Math.max(0, m.index - 22), m.index);
      const vizinhoDepois = texto.slice(m.index + m[0].length, m.index + m[0].length + 22);
      if (/[A-ZÀ-Ý][a-zà-ÿ]+\s$/.test(vizinhoAntes)) continue;
      if (/^\s[A-ZÀ-Ý][a-zà-ÿ]+/.test(vizinhoDepois) && !/^\s(de|da|do|em|no|na|com|para|e|ou)\b/i.test(vizinhoDepois)) continue;
      // se o português já está logo antes, é uma glosa: não mexe
      const antes = texto.slice(Math.max(0, m.index - par.pt.length - 4), m.index);
      if (antes.includes(par.pt)) continue;
      const troca = primeira ? `${par.pt} (${par.en})` : par.pt;
      substituicoes.push({ i: m.index, tam: m[0].length, troca });
      primeira = false;
    }

    if (!substituicoes.length) continue;
    for (const s of substituicoes) {
      const i = s.i + deslocamento;
      texto = texto.slice(0, i) + s.troca + texto.slice(i + s.tam);
      jaTrocado.push([i, i + s.troca.length]);
      deslocamento += s.troca.length - s.tam;
    }
    trocasNoArquivo.push({ de: par.en, para: par.pt, n: substituicoes.length });
    totalTrocas += substituicoes.length;
  }

  if (trocasNoArquivo.length) {
    resumo.push({ arquivo, trocas: trocasNoArquivo });
    if (gravar) await writeFile(join(pasta, arquivo), texto, 'utf-8');
  }
}

console.log('');
console.log(gravar ? '  APLICANDO as trocas' : '  SIMULAÇÃO, nada foi gravado (use -- --gravar para aplicar)');
console.log('');
for (const r of resumo) {
  const total = r.trocas.reduce((a, t) => a + t.n, 0);
  console.log(`  ${r.arquivo.replace('.md', '')}  (${total})`);
  for (const t of r.trocas.sort((a, b) => b.n - a.n).slice(0, 6)) {
    console.log(`     ${String(t.n).padStart(2)}x  ${t.de}  ->  ${t.para}`);
  }
  if (r.trocas.length > 6) console.log(`         e mais ${r.trocas.length - 6} termos`);
}
console.log('');
console.log(`  ${totalTrocas} trocas em ${resumo.length} páginas`);
console.log('');
