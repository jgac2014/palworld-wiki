/**
 * Confere as aptidões do nosso banco de Pals contra o paldb.
 *
 *   npm run pals:conferir           # relatório, não muda nada
 *   npm run pals:conferir -- --corrigir   # aplica o que o paldb diz
 *
 * Por que existe: as aptidões foram digitadas à mão a partir de guias, e guia de
 * terceiro erra. A primeira conferência achou o Anubis com Garimpo 3 quando o jogo
 * diz 6, o que invertia completamente a recomendação de uso dele em base.
 *
 * Um número errado num JSON se propaga silenciosamente para todas as páginas que o
 * exibem. Este script é o antídoto, e a razão de o dado morar em JSON e não em
 * tabela copiada dentro de artigo.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAMINHO = join(raiz, 'src/data/pals.json');
const PAUSA_MS = 350;
const CORRIGIR = process.argv.includes('--corrigir');

// nossa chave -> nome da aptidão no paldb em inglês
const APTIDOES = {
  acender: 'Kindling',
  rega: 'Watering',
  plantio: 'Planting',
  energia: 'Generating Electricity',
  manual: 'Handiwork',
  coleta: 'Gathering',
  madeira: 'Lumbering',
  garimpo: 'Mining',
  manipulacao: 'Medicine Production',
  refrigeracao: 'Cooling',
  transporte: 'Transporting',
  fazenda: 'Farming',
  petroleo: 'Crude Oil Extraction',
};
// AVISO DE FRAGILIDADE: a extração abaixo procura "nome da aptidão + número"
// na página inteira, sem âncora na seção de aptidões. Hoje bate com o
// data-filters em todas as páginas amostradas, mas se o paldb puser texto tipo
// "great for mining 5 nodes" antes da ficha, o número errado entra. Desde que o
// catálogo passou a guardar aptidões (importar-catalogo.mjs), a conferência
// offline do verificar-tudo.mjs cobre o mesmo terreno com dado mais confiável:
// prefira ela. Este script fica para conferência pontual contra a página viva.
const PARA_CHAVE = Object.fromEntries(Object.entries(APTIDOES).map(([k, v]) => [v, k]));

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (nome) => nome.replace(/ /g, '_');

/**
 * O paldb renderiza as aptidões como uma sequência de ícones com o nível ao lado.
 * Em vez de tentar entender o layout, procuramos o nome da aptidão em inglês
 * seguido de um número perto dele. É frágil de propósito: se o site mudar, o
 * script reclama de "não achei" em vez de inventar número.
 */
function extrair(html) {
  const achadas = {};
  const limpo = html.replace(/<[^>]+>/g, '\n');
  for (const nome of Object.values(APTIDOES)) {
    const re = new RegExp(`${nome}\\s*\\n*\\s*(?:Lv\\.?\\s*)?(\\d{1,2})\\b`, 'i');
    const m = limpo.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 10) achadas[PARA_CHAVE[nome]] = n;
    }
  }
  return achadas;
}

const dados = JSON.parse(await readFile(CAMINHO, 'utf-8'));
const divergencias = [];
const naoAchados = [];
let conferidos = 0;

console.log(`  conferindo ${dados.pals.length} Pals contra paldb.cc\n`);

for (const pal of dados.pals) {
  let html;
  try {
    const r = await fetch(`https://paldb.cc/en/${slug(pal.nome)}`, {
      headers: { 'User-Agent': 'wiki-palworld-do-grupo (conferencia de dados)' },
    });
    if (!r.ok) { naoAchados.push(`${pal.nome} (HTTP ${r.status})`); await dormir(PAUSA_MS); continue; }
    html = await r.text();
  } catch (e) {
    naoAchados.push(`${pal.nome} (${e.message})`);
    await dormir(PAUSA_MS);
    continue;
  }

  const deLa = extrair(html);
  if (!Object.keys(deLa).length) { naoAchados.push(`${pal.nome} (página sem aptidão legível)`); await dormir(PAUSA_MS); continue; }
  conferidos++;

  // Dois tipos de divergência, e só um é erro.
  //   ERRADO  = o número que temos difere do número do jogo. Isso invalida guia.
  //   FALTANDO = o paldb lista uma aptidão que não registramos. Nosso banco é
  //              curado de propósito, então isso normalmente é escolha, não defeito.
  const nosso = pal.apt || {};
  const errados = [];
  const faltando = [];
  for (const k of new Set([...Object.keys(nosso), ...Object.keys(deLa)])) {
    const a = nosso[k];
    const b = deLa[k];
    if (a != null && b != null && a !== b) errados.push(`${k}: nosso ${a}, jogo ${b}`);
    else if (a == null && b != null) faltando.push(`${k} ${b}`);
    else if (a != null && b == null) errados.push(`${k}: temos ${a}, o paldb não lista`);
  }

  if (errados.length || faltando.length) {
    divergencias.push({ nome: pal.nome, errados, faltando, deLa });
    // A correção automática só mexe no que está errado. Aptidão que não registramos
    // continua não registrada, porque tirar isso da curadoria é decisão editorial.
    if (CORRIGIR && errados.length) {
      for (const k of Object.keys(nosso)) if (deLa[k] != null) pal.apt[k] = deLa[k];
    }
  }
  await dormir(PAUSA_MS);
}

const comErro = divergencias.filter((d) => d.errados.length);
console.log(`  ${conferidos} conferidos`);
console.log(`  ${comErro.length} com NÚMERO ERRADO`);
console.log(`  ${divergencias.length - comErro.length} só com aptidão não registrada (curadoria, não erro)\n`);

if (comErro.length) {
  console.log('  ---- números errados ----');
  for (const d of comErro) {
    console.log(`  ${d.nome}`);
    for (const linha of d.errados) console.log(`      ${linha}`);
  }
}

if (naoAchados.length) {
  console.log(`\n  ${naoAchados.length} sem conferência:`);
  for (const n of naoAchados.slice(0, 20)) console.log(`      ${n}`);
  if (naoAchados.length > 20) console.log(`      e mais ${naoAchados.length - 20}`);
}

if (CORRIGIR && comErro.length) {
  await writeFile(CAMINHO, JSON.stringify(dados, null, 2) + '\n');
  console.log(`\n  pals.json atualizado: ${comErro.length} Pals corrigidos.`);
  console.log('  Rode "npm run verificar" e leia o diff antes de commitar:');
  console.log('  aptidão que muda de faixa pode invalidar recomendação escrita nos guias.');
} else if (comErro.length) {
  console.log('\n  Nada foi alterado. Rode com --corrigir para aplicar.');
}
