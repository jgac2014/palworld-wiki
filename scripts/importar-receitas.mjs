/**
 * Importa a receita de fabricacao de cada item, da ficha do paldb.
 *
 * Uma requisicao por vez, com pausa. Retomavel: grava o progresso a cada 25
 * itens, entao queda de rede nao joga fora o que ja foi buscado.
 *
 *   npm run receitas:importar -- --limite 25   piloto
 *   npm run receitas:importar                  tudo
 *
 * O destino e receitas-FABRICACAO.json, e o nome longo existe por acidente
 * caro: a primeira versao gravava em receitas.json, que ja era outra coisa (os
 * numeros das calculadoras de bolo e de condensacao, escritos a mao a partir
 * dos guias). O arquivo foi sobrescrito, o verificador passou a morrer com
 * TypeError e o build junto. Duas coisas diferentes nao dividem nome de
 * arquivo so porque as duas se chamam receita em portugues.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM = 'https://paldb.cc/en/';
const PAUSA = 700;
const PARCIAL = join(raiz, 'src/data/.receitas-parcial.json');
const DESTINO = join(raiz, 'src/data/receitas-fabricacao.json');
const MINIMO_COM_RECEITA = 300;

const limite = (() => {
  const i = process.argv.indexOf('--limite');
  return i > -1 ? Number(process.argv[i + 1]) : Infinity;
})();

const itens = JSON.parse(readFileSync(join(raiz, 'src/data/itens.json'), 'utf8')).itens;

/** Le o bloco de receita e devolve os pares material/quantidade.
 *  NAO tenta achar o fim do bloco casando </div> aninhado: isso corta a ULTIMA
 *  linha, porque os fechamentos dela sao o proprio terminador. Foi assim que a
 *  primeira versao leu "Paldium 1, Ingot 1, Wood 3" numa receita que tem Stone 3
 *  no fim. Em vez disso, le linha a linha a partir do inicio do bloco e para na
 *  primeira lacuna grande, porque as linhas sao coladas uma na outra. */
function lerReceita(html) {
  const inicio = html.indexOf('<div class="recipes">');
  if (inicio === -1) return null;
  const resto = html.slice(inicio);
  const linha = /<a class="itemname"[^>]*href="([^"]+)"[^>]*>(?:<img[^>]*>)?([^<]+)<\/a><\/div>\s*<div>(\d+)<\/div>/g;
  const itens = [];
  let fimAnterior = 0;
  for (const m of resto.matchAll(linha)) {
    if (fimAnterior && m.index - fimAnterior > 400) break;
    fimAnterior = m.index + m[0].length;
    itens.push({
      chave: decodeURIComponent(m[1]).replace(/^.*\//, ''),
      nome: m[2].trim(),
      qtd: Number(m[3]),
    });
  }
  return itens.length ? itens : null;
}

const feito = existsSync(PARCIAL) ? JSON.parse(readFileSync(PARCIAL, 'utf8')) : {};
const alvo = itens.slice(0, limite === Infinity ? itens.length : limite);
let buscados = 0, comReceita = 0, falhas = 0;

console.log(`Buscando ${alvo.length} fichas no paldb, uma por vez.`);

for (const [i, item] of alvo.entries()) {
  if (Array.isArray(feito[item.chave])) { comReceita++; continue; }
  try {
    // A chave vai codificada: 193 itens tem dois-pontos no nome (Skill_Fruit:_Power_Shot)
    // e sem escapar o : o paldb devolve 404. Conferido: com %3A responde 200.
    const r = await fetch(ORIGEM + item.chave.replace(/[:()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()), { headers: { 'user-agent': 'wiki-palworld (projeto de fa, sem fins lucrativos)' } });
    if (!r.ok) { feito[item.chave] = { falha: r.status }; falhas++; }
    else {
      const receita = lerReceita(await r.text());
      feito[item.chave] = receita;
      if (receita) comReceita++;
    }
  } catch (e) { falhas++; feito[item.chave] = { falha: String(e.message || e).slice(0, 60) }; }
  buscados++;
  if (buscados % 25 === 0) {
    writeFileSync(PARCIAL, JSON.stringify(feito));
    console.log(`  ${i + 1}/${alvo.length}  com receita: ${comReceita}  falhas: ${falhas}`);
  }
  await new Promise((s) => setTimeout(s, PAUSA));
}
writeFileSync(PARCIAL, JSON.stringify(feito));

const total = Object.values(feito).filter(Array.isArray).length;
const semReceita = Object.values(feito).filter((v) => v === null).length;
const comFalha = Object.values(feito).filter((v) => v && !Array.isArray(v)).length;
console.log(`\nVisitadas ${Object.keys(feito).length}: ${total} com receita, ${semReceita} sem receita na ficha, ${comFalha} que a requisicao nao trouxe`);

if (limite === Infinity && total < MINIMO_COM_RECEITA) {
  console.error(`ABORTADO: so ${total} itens com receita, abaixo do minimo de ${MINIMO_COM_RECEITA}. Nada foi gravado em receitas-fabricacao.json.`);
  process.exit(1);
}

const saida = {
  _leia_isto: [
    'Receita de fabricacao por item, importada da ficha do paldb.',
    'Gerado por: npm run receitas:importar. Nao editar a mao.',
    'NAO confundir com receitas.json, que e outro arquivo: aquele tem os numeros',
    'das calculadoras de bolo e de condensacao, escritos a mao a partir dos guias.',
    'Item sem entrada aqui e um dos dois casos, e a diferenca importa: ou a ficha',
    'foi visitada e nao publica receita (nao e fabricavel), ou ela nao foi trazida.',
    'O segundo caso esta listado em nao_trazidos, com o motivo.',
  ],
  fonte: 'https://paldb.cc/en/<chave-do-item>',
  importado_em: new Date().toISOString().slice(0, 10),
  visitados: Object.keys(feito).length,
  com_receita: total,
  sem_receita: semReceita,
  nao_trazidos: Object.entries(feito).filter(([, v]) => v && !Array.isArray(v)).map(([k, v]) => ({ chave: k, motivo: v.falha })),
  receitas: Object.fromEntries(Object.entries(feito).filter(([, v]) => Array.isArray(v))),
};
writeFileSync(DESTINO, JSON.stringify(saida, null, 1) + '\n');
console.log(`Gravado em src/data/receitas-fabricacao.json`);