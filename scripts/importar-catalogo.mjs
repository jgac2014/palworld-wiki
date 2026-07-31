/**
 * Importa o catálogo completo de Pals do paldb, nos dois idiomas.
 *
 *   npm run catalogo:importar
 *
 * Gera src/data/catalogo.json com todos os Pals do jogo: número da Palpédia,
 * nome em inglês e em português, elementos e aptidões com nível.
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
import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(raiz, 'src/data/catalogo.json');

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

async function baixar(idioma) {
  const r = await fetch(`https://paldb.cc/${idioma}/Pals`, {
    headers: { 'User-Agent': 'wiki-palworld-do-grupo (importacao de catalogo)' },
  });
  if (!r.ok) throw new Error(`paldb ${idioma} respondeu ${r.status}`);
  return r.text();
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
  return {
    numero: p.numero || null,
    chave: p.chave,
    id: p.idInterno,
    en: p.nome,
    pt: irmao?.nome || p.nome,
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
