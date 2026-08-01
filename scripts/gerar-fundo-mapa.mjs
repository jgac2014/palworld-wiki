/**
 * Põe imagem de fundo no mapa: captura os limites, baixa a textura, afere onde
 * os marcadores caem e só então corta os tiles.
 *
 *   npm run mapa:fundo
 *
 * POR QUE ISTO EXISTE, E POR QUE A IMAGEM É A ERRADA DE PROPÓSITO.
 *
 * O mapa desenhava uma grade de coordenadas porque a arte do jogo não está no
 * repositório e a extração do `.pak` ainda não saiu. Enquanto ela não sai, a
 * wiki.gg publica a textura do mundo inteiro, e ela é **anterior ao 1.0**: não
 * tem as sete ilhas pequenas do lançamento nem as edições de terreno.
 *
 * Isso não desalinha nada, e a confusão aqui custou uma premissa errada. Imagem
 * de uma build com os limites de OUTRA erra uns 7%, porque o enquadramento mudou
 * entre as duas. Cada imagem casada com os PRÓPRIOS limites alinha certo, porque
 * coordenada de mundo não muda entre versões: o que muda é o retângulo que a
 * textura cobre. Por isso `projecao-mapa.json` guarda DOIS conjuntos de limites,
 * nomeados por build, e o campo `build_ativa` diz qual vale para a imagem que
 * está em `public/mapa/`. Trocar de textura é trocar esse campo e rodar isto de
 * novo.
 *
 * FALHA POR FALTA DE INSUMO, NUNCA POR SILÊNCIO:
 *   - sem Playwright, aborta. A wiki.gg responde 403 da Cloudflare para
 *     requisição direta, e sem navegador "não achei os limites" quer dizer "não
 *     tentei direito".
 *   - limite capturado que discorda do declarado em `projecao-mapa.json` aborta
 *     dizendo os dois números. Aceitar o capturado em silêncio moveria os 13.755
 *     pontos de uma vez, que é o defeito mais difícil de enxergar num mapa.
 *   - imagem que não vier 8192x8192 aborta. Tile cortado de imagem de outro
 *     tamanho sai com o alinhamento errado e continua parecendo um mapa.
 *   - marcador de referência caindo no mar aborta ANTES de escrever tile. Se os
 *     limites estiverem trocados, o defeito aparece aqui e não no site.
 *
 * A AFERIÇÃO É UMA MEDIÇÃO, NÃO UMA OLHADA. A máscara de mar sai da própria
 * imagem: matiz entre 178 e 226 graus com saturação alta é água, e o
 * preenchimento parte da borda, então lago interno, vulcão roxo e montanha
 * escura de neve ficam de fora mesmo tendo cor azulada. Com os limites certos,
 * 2,5% dos pontos que só existem em terra caem no mar; com os limites da outra
 * build, 39%. A distância entre os dois números é o que dá valor à checagem.
 */
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const pastaCache = join(raiz, '.cache/mapa');
const pastaTiles = join(raiz, 'public/mapa');
const pastaRecortes = join(raiz, 'src/data/recortes');

const URL_LIMITES =
  'https://palworld.wiki.gg/api.php?action=query&prop=revisions&titles=Map%3AFragments%2FCore&rvprop=content&rvslots=main&format=json&formatversion=2';
const URL_IMAGEM = 'https://palworld.wiki.gg/images/World_Map.webp';
const PAGINA_HUMANA = 'https://palworld.wiki.gg/wiki/Map:Fragments/Core';

const LADO_ESPERADO = 8192;
const LADO_TILE = 512;
const NIVEIS = 5; // 0 = a imagem inteira num tile só, 4 = resolução nativa
const QUALIDADE = 80;
const AGENTE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const hoje = () => new Date().toISOString().slice(0, 10);
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;

const abortar = (...linhas) => {
  console.error('');
  console.error('  ABORTADO.');
  for (const l of linhas) console.error(`  ${l}`);
  console.error('');
  process.exit(1);
};

// --------------------------------------------------------------- navegador
//
// A wiki.gg devolve 403 da Cloudflare para `fetch`, inclusive no api.php. O
// caminho que funciona é o mesmo do gravar-recortes.mjs: navegador de verdade.
// Ele também é o único jeito de baixar a imagem: o desafio precisa ser resolvido
// numa página normal antes, e a sessão que passa é a da aba.
const abrirNavegador = async () => {
  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (e) {
    abortar(
      'O Playwright não está instalado, e sem navegador a wiki.gg responde 403.',
      'Rode `npm install` e `npx playwright install chromium`.',
      `Erro: ${e.message}`,
    );
  }
  const doSandbox = '/opt/pw-browsers/chromium';
  const executablePath = process.env.CHROMIUM || (existsSync(doSandbox) ? doSandbox : undefined);
  try {
    return await chromium.launch({ executablePath });
  } catch (e) {
    abortar('O navegador não subiu, então nada aqui pôde ser conferido.', `Erro: ${e.message}`);
  }
};

// ------------------------------------------------------ passo 1: limites
const capturarLimites = async (pagina) => {
  const r = await pagina.goto(URL_LIMITES, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pagina.waitForTimeout(2000);
  const http = r ? r.status() : 0;
  const texto = await pagina.evaluate(() => document.body.innerText);
  if (http !== 200) {
    abortar(`A API da wiki.gg respondeu HTTP ${http} mesmo pelo navegador.`, `URL: ${URL_LIMITES}`);
  }
  let conteudo;
  try {
    conteudo = JSON.parse(texto).query.pages[0].revisions[0].slots.main.content;
  } catch (e) {
    abortar(
      'A API abriu e não devolveu o conteúdo da página Map:Fragments/Core.',
      'Ou o formato mudou, ou o que voltou é tela de verificação.',
      `Primeiros 200 caracteres: ${texto.slice(0, 200)}`,
    );
  }
  let fragmento;
  try {
    fragmento = JSON.parse(conteudo);
  } catch (e) {
    abortar('O conteúdo veio, e não é JSON válido.', `Erro: ${e.message}`);
  }
  const crs = fragmento.crs;
  if (!crs || !Array.isArray(crs.topLeft) || !Array.isArray(crs.bottomRight)) {
    abortar('O fragmento não traz `crs.topLeft` e `crs.bottomRight`. Sem eles não dá para enquadrar nada.');
  }
  if (crs.order !== 'xy') {
    abortar(
      `O fragmento declara ordem "${crs.order}" e este script só sabe ler "xy".`,
      'Ordem trocada inverte os eixos e o mapa sai espelhado sem parecer errado.',
    );
  }
  const imagemDeclarada = fragmento.background?.image;
  if (imagemDeclarada && !URL_IMAGEM.endsWith(imagemDeclarada)) {
    abortar(
      `O fragmento diz que o fundo é "${imagemDeclarada}", e este script baixa "${URL_IMAGEM.split('/').pop()}".`,
      'Limite de uma imagem com o arquivo de outra é exatamente o erro que esta tarefa existe para não repetir.',
    );
  }
  const [x1, y1] = crs.topLeft;
  const [x2, y2] = crs.bottomRight;
  const larguraCrs = x2 - x1;
  const alturaCrs = y1 - y2;
  if (Math.abs(larguraCrs - alturaCrs) > 0.01) {
    abortar(
      `Os limites não são quadrados: ${larguraCrs} de largura e ${alturaCrs} de altura.`,
      'A imagem é quadrada, então um lado só. Dois lados diferentes esticariam um eixo.',
    );
  }
  return {
    http,
    conteudo,
    min_x: x1,
    min_y: y2,
    lado: (larguraCrs + alturaCrs) / 2,
    topLeft: crs.topLeft,
    bottomRight: crs.bottomRight,
    imagem: imagemDeclarada,
  };
};

// ------------------------------------------------------- passo 2: imagem
const baixarImagem = async (pagina) => {
  const destino = join(pastaCache, 'World_Map.webp');
  if (existsSync(destino)) {
    const bytes = await readFile(destino);
    console.log(`   imagem       do cache em .cache/mapa, ${mb(bytes.length)}`);
    return bytes;
  }
  const r = await pagina.goto(URL_IMAGEM, { waitUntil: 'load', timeout: 300000 });
  const http = r ? r.status() : 0;
  if (http !== 200) abortar(`A imagem respondeu HTTP ${http}.`, `URL: ${URL_IMAGEM}`);
  let bytes;
  try {
    bytes = await r.body();
  } catch (e) {
    abortar('A imagem respondeu 200 e o corpo não veio.', `Erro: ${e.message}`);
  }
  if (!existsSync(pastaCache)) await mkdir(pastaCache, { recursive: true });
  await writeFile(destino, bytes);
  console.log(`   imagem       baixada, ${mb(bytes.length)}`);
  return bytes;
};

// ------------------------------------------- passo 3: máscara de mar
//
// Critério de cor sozinho não separa mar de terra nesta textura: o vulcão é roxo
// escuro e a montanha de neve tem sombra azul, e os dois passam por qualquer
// regra de "azul e escuro". Quem separa é o PREENCHIMENTO a partir da borda:
// água ligada à borda é mar, água cercada de terra é lago. O matiz estreito
// (178 a 226 graus) mais saturação alta é o que impede o vazamento pelo roxo do
// vulcão, que fica em 233 graus, e pela neve clara, que fica dessaturada.
const montarMascaraDeMar = (dados, lado, canais) => {
  const eAgua = (p) => {
    const i = p * canais;
    const r = dados[i] / 255, g = dados[i + 1] / 255, b = dados[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d || mx < 0.04 || mx > 0.72) return false;
    if (d / mx < 0.55) return false;
    let h = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
    return h >= 178 && h <= 226;
  };

  const mar = new Uint8Array(lado * lado);
  const fila = new Int32Array(lado * lado);
  let cabeca = 0, cauda = 0;
  const semear = (x, y) => {
    const p = y * lado + x;
    if (mar[p] || !eAgua(p)) return;
    mar[p] = 1;
    fila[cauda++] = p;
  };
  for (let x = 0; x < lado; x++) { semear(x, 0); semear(x, lado - 1); }
  for (let y = 0; y < lado; y++) { semear(0, y); semear(lado - 1, y); }
  while (cabeca < cauda) {
    const p = fila[cabeca++];
    const x = p % lado, y = (p / lado) | 0;
    if (x > 0) semear(x - 1, y);
    if (x < lado - 1) semear(x + 1, y);
    if (y > 0) semear(x, y - 1);
    if (y < lado - 1) semear(x, y + 1);
  }
  let agua = 0;
  for (let i = 0; i < mar.length; i++) agua += mar[i];
  return { mar, fracao: agua / mar.length };
};

// ------------------------------------------------------------------ roda
console.log('');
console.log('  Fundo do mapa: limites, imagem, aferição e tiles');
console.log('');

const projecao = JSON.parse(await readFile(join(raiz, 'src/data/projecao-mapa.json'), 'utf-8'));
const nomeBuild = projecao.build_ativa;
const declarado = projecao.limites_por_build?.[nomeBuild];
if (!declarado) {
  abortar(
    `projecao-mapa.json declara build_ativa "${nomeBuild}" e não tem esse conjunto em limites_por_build.`,
    'Sem limite declarado não há com o que comparar o capturado, e a captura viraria a própria conferência.',
  );
}

const navegador = await abrirNavegador();
const contexto = await navegador.newContext({ userAgent: AGENTE, locale: 'en-US', viewport: { width: 1280, height: 900 } });
const pagina = await contexto.newPage();
// Resolve o desafio da Cloudflare numa página normal antes de pedir dado.
await pagina.goto(PAGINA_HUMANA, { waitUntil: 'domcontentloaded', timeout: 60000 });
await pagina.waitForTimeout(3000);

const capturado = await capturarLimites(pagina);
console.log(`   limites      capturados de Map:Fragments/Core, HTTP ${capturado.http}`);
console.log(`                topLeft [${capturado.topLeft.join(', ')}]`);
console.log(`                bottomRight [${capturado.bottomRight.join(', ')}]`);

const diferenca = (a, b) => Math.abs(a - b);
const TOLERANCIA = 1e-6;
for (const campo of ['min_x', 'min_y', 'lado']) {
  if (diferenca(capturado[campo], declarado[campo]) > TOLERANCIA) {
    abortar(
      `O limite capturado discorda do declarado para a build "${nomeBuild}".`,
      `${campo}: capturado ${capturado[campo]}, declarado ${declarado[campo]}.`,
      'Vale o capturado. Corrija projecao-mapa.json, registre a mudança em fontes.md e rode de novo:',
      'mexer aqui move os 13.755 pontos de uma vez.',
    );
  }
}
console.log(`   limites      batem com a build "${nomeBuild}" declarada em projecao-mapa.json`);

const bytes = await baixarImagem(pagina);
await navegador.close();

const sha = createHash('sha256').update(bytes).digest('hex');

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch (e) {
  abortar('O sharp não está disponível, e sem ele não dá para cortar tile nenhum.', `Erro: ${e.message}`);
}

const meta = await sharp(bytes, { limitInputPixels: false }).metadata();
if (meta.width !== LADO_ESPERADO || meta.height !== LADO_ESPERADO) {
  abortar(
    `A imagem veio ${meta.width}x${meta.height} e este script corta ${LADO_ESPERADO}x${LADO_ESPERADO}.`,
    'Tile cortado do tamanho errado desalinha tudo e continua parecendo um mapa.',
  );
}
console.log(`   imagem       ${meta.width}x${meta.height} ${meta.format}, sha256 ${sha.slice(0, 16)}`);

// ------------------------------------------------------------- aferição
const LADO_AFERICAO = 2048;
const { data: rasterAfericao, info: infoAfericao } = await sharp(bytes, { limitInputPixels: false })
  .resize(LADO_AFERICAO, LADO_AFERICAO)
  .raw()
  .toBuffer({ resolveWithObject: true });
const { mar, fracao } = montarMascaraDeMar(rasterAfericao, LADO_AFERICAO, infoAfericao.channels);
if (fracao < 0.5 || fracao > 0.95) {
  abortar(
    `A máscara marcou ${(fracao * 100).toFixed(1)}% da imagem como mar, fora da faixa de 50% a 95%.`,
    'Ou a textura mudou de paleta, ou o critério de cor quebrou. Aferir com máscara quebrada seria',
    'aprovar sem conferir, que é o modo de falha que este repositório mais repete.',
  );
}

const noMar = (limites, x, y) => {
  const px = Math.round(((x - limites.min_x) / limites.lado) * LADO_AFERICAO);
  const py = Math.round((1 - (y - limites.min_y) / limites.lado) * LADO_AFERICAO);
  if (px < 0 || py < 0 || px >= LADO_AFERICAO || py >= LADO_AFERICAO) return true;
  return mar[py * LADO_AFERICAO + px] === 1;
};

// Os 11 que a B1 parcial trocou por coordenada importada do paldb: 6 torres, 3
// zonas de caça proibida e 2 pontos de quartzo. São os únicos marcadores do
// mapa.json com coordenada de fonte independente, então são os únicos que
// servem de aferição. Os outros 13 ainda são estimativa nossa.
const mapaNosso = JSON.parse(await readFile(join(raiz, 'src/data/mapa.json'), 'utf-8'));
const NOMES_DE_REFERENCIA = [
  'Zoe e Grizzbolt', 'Lily e Lyleen', 'Axel e Orserk', 'Marcus e Faleris',
  'Victor e Shadowbeak', 'Bjorn e Bastigor',
  'Zona de Caça Proibida I', 'Zona de Caça Proibida II', 'Zona de Caça Proibida III',
  'Unthawable Lake', 'Land of Absolute Zero',
];
const referencia = NOMES_DE_REFERENCIA.map((nome) => {
  const m = mapaNosso.marcadores.find((x) => x.nome === nome);
  if (!m) {
    abortar(
      `O marcador de referência "${nome}" sumiu do mapa.json.`,
      'A aferição perde um ponto e passaria com menos prova do que declara. Falha em vez de encolher.',
    );
  }
  return m;
});

console.log('');
console.log('   Aferição: os 11 marcadores de coordenada importada');
const afundados = [];
for (const m of referencia) {
  const molhado = noMar(declarado, m.x, m.y);
  if (molhado) afundados.push(m.nome);
  console.log(`     ${molhado ? 'MAR  ' : 'terra'} ${m.nome.padEnd(42)} ${String(m.x).padStart(6)}, ${String(m.y).padStart(6)}`);
}
if (afundados.length) {
  abortar(
    `${afundados.length} dos ${referencia.length} marcadores de referência caem no mar: ${afundados.join(', ')}.`,
    'Marcador de coordenada importada em cima de água quer dizer enquadramento trocado.',
    'Nenhum tile foi escrito.',
  );
}

// A contagem larga, que é o que dá tamanho ao acerto. Tipos que só existem em
// terra firme; peixe fica de fora por motivo óbvio.
const pontos = JSON.parse(await readFile(join(raiz, 'src/data/mapa-pontos.json'), 'utf-8'));
const SO_EM_TERRA = ['Fast Travel', 'Dungeon', 'Ore', 'Coal', 'Sulfur', 'Pure Quartz', 'Tower'];
const emTerra = [...pontos.pontos, ...pontos.extras].filter((p) => SO_EM_TERRA.includes(p.t));
if (!emTerra.length) {
  abortar('Nenhum ponto de tipo terrestre em mapa-pontos.json. A contagem larga não teria o que medir.');
}
const conta = (limites) => emTerra.filter((p) => noMar(limites, p.x, p.y)).length;
const foraAtual = conta(declarado);
const comparacoes = Object.entries(projecao.limites_por_build)
  .filter(([nome]) => nome !== nomeBuild && !nome.startsWith('_'))
  .map(([nome, l]) => ({ nome, fora: conta(l) }));
if (!comparacoes.length) {
  abortar(
    'Só existe um conjunto de limites em projecao-mapa.json, então não há com o que comparar.',
    'Sem a build alternativa a aferição vira número solto: 77 no mar não quer dizer nada sem o 1200 do lado.',
  );
}

console.log('');
console.log(`   Contagem larga: ${emTerra.length} pontos que só existem em terra`);
console.log(`     ${nomeBuild.padEnd(22)} ${foraAtual} no mar (${((foraAtual / emTerra.length) * 100).toFixed(1)}%)`);
for (const c of comparacoes) {
  console.log(`     ${c.nome.padEnd(22)} ${c.fora} no mar (${((c.fora / emTerra.length) * 100).toFixed(1)}%)`);
}
for (const c of comparacoes) {
  if (c.fora <= foraAtual) {
    abortar(
      `Com os limites da build "${c.nome}" caem ${c.fora} pontos no mar, contra ${foraAtual} da build ativa.`,
      'Se o conjunto errado acerta tanto quanto o certo, a aferição não distingue nada e não vale como prova.',
    );
  }
}

// -------------------------------------------------------------- tiles
if (existsSync(pastaTiles)) {
  for (const entrada of await readdir(pastaTiles, { withFileTypes: true })) {
    if (entrada.isDirectory() && /^\d+$/.test(entrada.name)) {
      await rm(join(pastaTiles, entrada.name), { recursive: true, force: true });
    }
  }
}

console.log('');
console.log(`   Cortando ${NIVEIS} níveis de ${LADO_TILE}px`);
const porNivel = [];
let totalBytes = 0;
let totalTiles = 0;

for (let z = 0; z < NIVEIS; z++) {
  const ladoNivel = LADO_TILE * 2 ** z;
  const grade = 2 ** z;
  const raw = await sharp(bytes, { limitInputPixels: false })
    .resize(ladoNivel, ladoNivel, { kernel: 'lanczos3' })
    .raw()
    .toBuffer();
  const canais = raw.length / (ladoNivel * ladoNivel);
  await mkdir(join(pastaTiles, String(z)), { recursive: true });
  let bytesNivel = 0;
  for (let ty = 0; ty < grade; ty++) {
    for (let tx = 0; tx < grade; tx++) {
      const tile = await sharp(raw, { raw: { width: ladoNivel, height: ladoNivel, channels: canais } })
        .extract({ left: tx * LADO_TILE, top: ty * LADO_TILE, width: LADO_TILE, height: LADO_TILE })
        .webp({ quality: QUALIDADE, effort: 4 })
        .toBuffer();
      await writeFile(join(pastaTiles, String(z), `${tx}_${ty}.webp`), tile);
      bytesNivel += tile.length;
    }
  }
  porNivel.push({ nivel: z, tiles: grade * grade, bytes: bytesNivel });
  totalBytes += bytesNivel;
  totalTiles += grade * grade;
  console.log(`     nível ${z}: ${String(grade * grade).padStart(3)} tiles, ${ladoNivel}px de lado, ${kb(bytesNivel)}`);
}
console.log(`     total: ${totalTiles} tiles, ${mb(totalBytes)}`);

// ---------------------------------------------------------- manifesto
const manifesto = {
  _leia_isto:
    'Descreve o fundo que está em public/mapa/. Gerado por scripts/gerar-fundo-mapa.mjs, que ' +
    'ABORTA sem escrever tile quando os limites capturados discordam de projecao-mapa.json ou quando ' +
    'algum marcador de referência cai no mar. O verificador confere que este arquivo, os limites da ' +
    'build ativa e os tiles no disco continuam falando da mesma imagem: mudar o enquadramento sem ' +
    'gerar de novo reprova o portão.',
  build: nomeBuild,
  anterior_ao_1_0: true,
  gerado_em: hoje(),
  limites_usados: {
    _leia_isto:
      'Cópia dos limites que estavam valendo na hora de cortar. Não é redundância: é o que fecha o ' +
      'laço. Mudar o enquadramento em projecao-mapa.json sem gerar de novo faz o verificador acusar, ' +
      'porque estes três números deixam de bater, e mudar os dois obriga a rodar o script, que refaz ' +
      'a aferição. Sem isto, dava para mover os 13.755 pontos com o portão passando.',
    min_x: declarado.min_x,
    min_y: declarado.min_y,
    lado: declarado.lado,
  },
  origem: {
    imagem: URL_IMAGEM,
    limites: URL_LIMITES,
    pagina: PAGINA_HUMANA,
    licenca: 'Palworld © Pocketpair, Inc. Imagem de palworld.wiki.gg.',
  },
  imagem_original: {
    largura: meta.width,
    altura: meta.height,
    bytes: bytes.length,
    sha256: sha,
    _nota:
      'A original NÃO está no repositório: os tiles do último nível são ela, cortada, então guardar ' +
      'as duas seria dobrar 4,7 MB sem guardar nada a mais. O sha256 acima é o que permite conferir ' +
      'que uma nova baixada é a mesma imagem.',
  },
  tiles: {
    caminho: '/mapa/{z}/{x}_{y}.webp',
    lado: LADO_TILE,
    niveis: NIVEIS,
    qualidade_webp: QUALIDADE,
    total: totalTiles,
    bytes: totalBytes,
    por_nivel: porNivel,
    _nota:
      'Nível 0 é a imagem inteira num tile só e o nível ' + (NIVEIS - 1) + ' é a resolução nativa. ' +
      'No Leaflet o espaço de coordenada é o pixel nativo, e quem converte é map.unproject com zoom ' +
      (NIVEIS - 1) + '.',
  },
  afericao: {
    _leia_isto:
      'Medida na hora de gerar, com a máscara de mar tirada da própria imagem. Não é número copiado: ' +
      'o script refaz a conta a cada rodada e aborta se algum dos 11 cair na água ou se a build errada ' +
      'acertar tanto quanto a certa.',
    marcadores_conferidos: referencia.length,
    marcadores_no_mar: 0,
    pontos_so_de_terra: emTerra.length,
    no_mar_com_a_build_ativa: foraAtual,
    no_mar_com_as_outras: Object.fromEntries(comparacoes.map((c) => [c.nome, c.fora])),
    fracao_de_mar_da_imagem: Number(fracao.toFixed(4)),
  },
};
await writeFile(join(raiz, 'src/data/mapa-fundo.json'), JSON.stringify(manifesto, null, 2) + '\n', 'utf-8');

// ----------------------------------------------------------- recortes
//
// Regra da F3: fonte consultada e não gravada deixa de existir. Estes dois
// recortes são escritos aqui e não pelo gravar-recortes.mjs porque o que prova
// não cabe no formato dele: os limites são um JSON de configuração que precisa
// ir inteiro, e a imagem não é texto nenhum. As duas URLs estão em ALVOS lá com
// `origem`, que é o mecanismo que já existia para recorte capturado por outro
// caminho, e faz o script abortar em vez de gravar por cima.
if (!existsSync(pastaRecortes)) await mkdir(pastaRecortes, { recursive: true });

await writeFile(
  join(pastaRecortes, 'wikigg-map-fragments-core.md'),
  [
    '---',
    `url: ${URL_LIMITES}`,
    `capturado_em: ${hoje()}`,
    'status: viva',
    `http: ${capturado.http}`,
    'via: navegador',
    `usado_para: ${JSON.stringify('Os limites de enquadramento da textura World_Map.webp, que projetam os 13.755 pontos sobre o fundo do mapa')}`,
    `capturado_por: scripts/gerar-fundo-mapa.mjs`,
    '---',
    '',
    '# wikigg-map-fragments-core',
    '',
    `Recorte do conteúdo inteiro de \`Map:Fragments/Core\`, a página que a wiki.gg usa como fonte do`,
    'mapa. Ele vai inteiro e não em trecho porque são 400 caracteres de configuração, e um pedaço',
    'deles não prova enquadramento nenhum. Página para humano: ' + PAGINA_HUMANA + ' (a requisição',
    'direta leva 403 da Cloudflare, então a captura é por navegador, pela API).',
    '',
    '### crs e background',
    '',
    ...capturado.conteudo.split('\n').map((l) => `> ${l.replace(/\t/g, '  ')}`),
    '',
    '### O que estes números querem dizer',
    '',
    `> A imagem cobre de x ${capturado.topLeft[0]} a ${capturado.bottomRight[0]} e de y ${capturado.bottomRight[1]} a ${capturado.topLeft[1]},`,
    `> na coordenada que o jogo mostra na tela do mapa. Lado de ${capturado.lado.toFixed(5)} unidades, igual nos dois eixos.`,
    '',
    'Conferido contra a nossa própria fórmula de mundo para tela, que é independente disto: aplicando',
    '`tela.x = (mundo.Y - 158000) / 459` e `tela.y = (mundo.X + 123888) / 459` a uma landscape de',
    'X -999940 a 447900 e Y -738920 a 708920, saem exatamente os quatro números acima. Os limites da',
    'build do paldb, que estão no mesmo `projecao-mapa.json`, dão outro retângulo: é a diferença de',
    'enquadramento entre as duas builds, não erro de fórmula.',
    '',
  ].join('\n'),
  'utf-8',
);

await writeFile(
  join(pastaRecortes, 'wikigg-world-map-webp.md'),
  [
    '---',
    `url: ${URL_IMAGEM}`,
    `capturado_em: ${hoje()}`,
    'status: viva',
    'http: 200',
    'via: navegador',
    `usado_para: ${JSON.stringify('A textura de fundo do mapa, cortada em tiles para public/mapa/')}`,
    `capturado_por: scripts/gerar-fundo-mapa.mjs`,
    '---',
    '',
    '# wikigg-world-map-webp',
    '',
    'Aqui o recorte não é citação de texto: é a identidade do arquivo, que é o que permite conferir',
    'depois se a imagem servida é a mesma que foi aferida. O conteúdo em si está no repositório, em',
    `\`public/mapa/\`, cortado em ${totalTiles} tiles. O último nível é a imagem original inteira.`,
    '',
    '### O arquivo',
    '',
    `> ${URL_IMAGEM}`,
    `> HTTP 200, ${meta.format}, ${meta.width}x${meta.height}, ${bytes.length} bytes`,
    `> sha256 ${sha}`,
    '',
    '### A aferição que ele passou',
    '',
    `> ${referencia.length} de ${referencia.length} marcadores de coordenada importada caem em terra.`,
    `> ${foraAtual} de ${emTerra.length} pontos que só existem em terra caem no mar (${((foraAtual / emTerra.length) * 100).toFixed(1)}%),`,
    `> contra ${comparacoes.map((c) => `${c.fora} com os limites da build ${c.nome}`).join(' e ')}.`,
    '',
    'A imagem é **anterior ao 1.0**: faltam as sete ilhas pequenas do lançamento e as edições de',
    'terreno. Parte dos pontos que caem no mar são exatamente esses lugares que ainda não existiam',
    'quando esta textura foi feita. A troca da base está prevista para quando a extração do jogo sair.',
    '',
    'Direitos: Palworld © Pocketpair, Inc. Imagem de palworld.wiki.gg.',
    '',
  ].join('\n'),
  'utf-8',
);

console.log('');
console.log('   recortes     wikigg-map-fragments-core.md e wikigg-world-map-webp.md gravados');
console.log('   manifesto    src/data/mapa-fundo.json');
console.log('');
console.log(`  Pronto: ${totalTiles} tiles, ${mb(totalBytes)}, build "${nomeBuild}".`);
console.log('');
