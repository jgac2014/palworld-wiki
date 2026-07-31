/**
 * Junta todo o conteúdo da wiki num único arquivo que o assistente de IA usa
 * como contexto. Roda sozinho antes do build (veja "prebuild" no package.json),
 * então basta editar os .md normalmente que o assistente acompanha.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pastaWiki = join(raiz, 'src', 'content', 'wiki');
const saida = join(raiz, 'worker', 'src', 'conteudo.js');

const arquivos = (await readdir(pastaWiki)).filter((f) => f.endsWith('.md')).sort();

const partes = [];
for (const arquivo of arquivos) {
  const bruto = await readFile(join(pastaWiki, arquivo), 'utf-8');
  const m = bruto.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  const frontmatter = m ? m[1] : '';
  const corpo = m ? m[2] : bruto;
  const titulo = (frontmatter.match(/titulo:\s*"?([^"\n]+)"?/) || [, arquivo])[1];
  const slug = arquivo.replace(/\.md$/, '');
  partes.push(`\n\n===== PÁGINA: ${titulo} (endereço /${slug}) =====\n\n${corpo.trim()}`);
}

// os dados estruturados também entram, para o assistente responder sobre Pals e mapa
const pals = JSON.parse(await readFile(join(raiz, 'src', 'data', 'pals.json'), 'utf-8'));
const mapa = JSON.parse(await readFile(join(raiz, 'src', 'data', 'mapa.json'), 'utf-8'));

const linhasPals = pals.pals.map((p) => {
  const apt = Object.entries(p.apt || {})
    .map(([k, v]) => `${pals.aptidoes[k]?.nome || k} ${v}`)
    .join(', ');
  return [
    p.nome,
    apt && `aptidões: ${apt}`,
    p.aura && `dá aura de ${pals.aptidoes[p.aura]?.nome}`,
    p.efeito && `efeito: ${p.efeito}`,
    p.onde && `onde: ${p.onde}`,
    p.nota && `nota: ${p.nota}`,
  ].filter(Boolean).join(' | ');
});
partes.push(`\n\n===== BANCO DE PALS (endereço /pals) =====\n\n${linhasPals.join('\n')}`);

const linhasMapa = mapa.marcadores.map(
  (m) => `${m.nome} (${mapa.categorias[m.categoria]?.nome || m.categoria}) em ${m.x}, ${m.y}${m.nota ? ` — ${m.nota}` : ''}`
);
partes.push(`\n\n===== MAPA, PONTOS MARCADOS (endereço /mapa) =====\n\n${linhasMapa.join('\n')}`);

const conteudo = partes.join('');

await mkdir(dirname(saida), { recursive: true });
await writeFile(
  saida,
  `// GERADO AUTOMATICAMENTE por scripts/gerar-conteudo-ia.mjs\n` +
  `// Não edite este arquivo: edite os .md em src/content/wiki e rode o build.\n` +
  `export const CONTEUDO_WIKI = ${JSON.stringify(conteudo)};\n`,
  'utf-8'
);

const kb = (conteudo.length / 1024).toFixed(1);
console.log(`  contexto do assistente gerado: ${arquivos.length} páginas, ${pals.pals.length} Pals, ${mapa.marcadores.length} pontos de mapa, ${kb} KB`);
if (conteudo.length > 400_000) {
  console.warn('  ! o contexto passou de 400 KB. Considere dividir por assunto antes de mandar ao modelo.');
}
