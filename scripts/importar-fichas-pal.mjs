/**
 * Importa atributo, drop e local de captura da ficha de cada Pal, do paldb.
 *
 *   npm run fichas:importar -- --limite 10   piloto
 *   npm run fichas:importar                  as 299
 *
 * Uma requisicao por vez, com pausa. Retomavel: grava o progresso a cada 25
 * fichas, entao queda de rede nao joga fora o que ja foi buscado.
 *
 * TRES COISAS QUE A E8 ERROU E ESTAO CORRIGIDAS DESDE A PRIMEIRA VERSAO AQUI:
 *
 * 1. FALHA E AUSENCIA SAO GRAVADAS DIFERENTE. Na E8 a primeira versao gravou
 *    falha de rede com a mesma forma de "a ficha nao publica isso", e as duas
 *    viraram o mesmo "sem receita" para quem lesse. Aqui cada bloco guarda ou o
 *    dado, ou `null` para ausencia declarada, e a falha fica fora, num campo do
 *    registro inteiro. Nao da para confundir depois porque nao dividem lugar.
 *
 * 2. A CHAVE VAI CODIFICADA. Dois-pontos e parenteses ja morderam duas vezes
 *    neste repositorio: 193 itens tem `:` no nome e o paldb devolve 404 sem
 *    escapar. As 299 chaves de Pal hoje nao tem nenhum caractere especial, e a
 *    codificacao entra assim mesmo: a proxima importacao e que traz a chave
 *    esquisita, e ai ninguem lembra desta linha.
 *
 * 3. GUARDA DE ABORTO POR CATEGORIA, e nao por total. O total nao acusa o
 *    defeito que este tipo de recorte tem: a E8 trouxe as 1.875 fichas certas
 *    tres vezes seguidas com o conteudo errado. Se uma categoria inteira vier
 *    vazia, o markup mudou e o arquivo NAO e gravado.
 *
 * O que a ficha publica e o que fica de fora esta em TAREFAS.md, na E10.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEM = 'https://paldb.cc/en/';
const PAUSA = 700;
const PARCIAL = join(raiz, 'src/data/.fichas-pal-parcial.json');
const DESTINO = join(raiz, 'src/data/fichas-pal.json');

/**
 * Piso por categoria, em fracao das fichas trazidas.
 *
 * Nem todo Pal tem as tres coisas: os de torre nao aparecem em spawner, por
 * exemplo. Por isso o piso e folgado e existe para acusar MARKUP QUEBRADO, que
 * derruba a categoria inteira para zero, e nao variacao de patch.
 */
const PISO = { atributos: 0.9, drops: 0.5, captura: 0.4 };

const limite = (() => {
  const i = process.argv.indexOf('--limite');
  return i > -1 ? Number(process.argv[i + 1]) : Infinity;
})();

/**
 * Chaves especificas, para conferir caso conhecido sem baixar as 299.
 *
 *   npm run fichas:importar -- --chaves Blue_Slime,Bellanoir
 *
 * Existe porque o piloto pelas 10 primeiras so pega Pal comum, e o caminho que
 * precisa de prova e o da AUSENCIA: Pal que nao aparece em spawner nenhum, ou
 * que nao dropa nada. Sem poder mirar nesses, a ausencia so seria exercitada na
 * importacao cheia, que e tarde.
 */
const chavesPedidas = (() => {
  const i = process.argv.indexOf('--chaves');
  return i > -1 ? new Set(process.argv[i + 1].split(',').map((s) => s.trim())) : null;
})();

const todos = JSON.parse(readFileSync(join(raiz, 'src/data/catalogo.json'), 'utf8')).pals;
const pals = chavesPedidas ? todos.filter((p) => chavesPedidas.has(p.chave)) : todos;
if (chavesPedidas && pals.length !== chavesPedidas.size) {
  const achadas = new Set(pals.map((p) => p.chave));
  console.error(`ABORTADO: ${[...chavesPedidas].filter((c) => !achadas.has(c)).join(', ')} nao esta no catalogo`);
  process.exit(1);
}

const texto = (s) =>
  s.replace(/<[^>]*>/g, ' ')
    .replace(/&ndash;/g, '-').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/** Corpo do cartao cujo titulo e `titulo`, ate o proximo titulo de cartao. */
function cartao(html, titulo) {
  const i = html.indexOf(`>${titulo}</h5>`);
  if (i === -1) return null;
  const resto = html.slice(i + titulo.length + 6);
  const fim = resto.indexOf('card-title');
  return fim === -1 ? resto : resto.slice(0, fim);
}

/**
 * Atributos: o cartao Stats e uma pilha de linhas rotulo/valor.
 *
 * A barra de progresso do meio e removida antes de ler, porque ela carrega a
 * FAIXA do atributo (`data-bs-title="60 - 180"`) e nao o valor deste Pal.
 * Lida junto, ela produziria "Health 60 - 180 70", e o numero que sobrasse
 * dependeria de qual ponta o recorte pegasse primeiro.
 */
/**
 * De quais cartoes os atributos saem, e por que os outros ficam fora.
 *
 * A ficha reparte os numeros em varios cartoes, e ler so o primeiro traz 15 de
 * 23. Entram os dois que publicam valor BASE da especie:
 *   Stats     tamanho, raridade, vida, comida, ataque, defesa, trabalho,
 *             suporte, taxa de captura, chance de macho, CombiRank, preco,
 *             tipo de ovo e o codigo interno
 *   Movement  as sete velocidades mais a stamina
 *
 * Ficam de fora, de proposito:
 *   Level 80  vida, ataque e defesa NO NIVEL 80, e em FAIXA ("3700 - 4540"),
 *             porque o paldb calcula por cima do intervalo de talento. E conta
 *             dele, nao dado do jogo, e nao da para conferir em tela nenhuma.
 *   Tribes    a aptidao de trabalho, que ja esta em catalogo.json e ja foi
 *             conferida. Trazer de novo seria conferir a mesma fonte com ela
 *             mesma, que e o erro circular que esta tarefa foi parada para evitar.
 */
const CARTOES_DE_ATRIBUTO = ['Stats', 'Movement'];

function lerAtributos(html) {
  const blocos = CARTOES_DE_ATRIBUTO.map((c) => cartao(html, c)).filter(Boolean);
  if (!blocos.length) return null;
  const bloco = blocos.join('\n');
  const out = {};
  for (const parte of bloco.split('<div class="d-flex justify-content-between').slice(1)) {
    const linha = parte.slice(0, parte.indexOf('<h5') === -1 ? undefined : parte.indexOf('<h5'));
    const semBarra = linha.replace(/<div class="progress[\s\S]*?<\/div>\s*<\/div>/g, ' ');
    // Le os <div> filhos da linha, e nao um separador.
    //
    // A primeira versao trocava a barra de progresso por "|" e separava por
    // ele. Isso descartava EM SILENCIO toda linha que nao tem barra, que sao
    // justamente Size, Work Speed, CaptureRateCorrect, Egg, Code e as quatro
    // velocidades: 9 atributos lidos de 18 publicados, sem nenhum aviso. O
    // piloto existe para achar isto antes das 299.
    const campos = [...semBarra.matchAll(/<div[^>]*>((?:(?!<div)[\s\S])*?)<\/div>/g)]
      .map((m) => texto(m[1]))
      .filter(Boolean);
    if (campos.length < 2) continue;
    const rotulo = campos[0].trim();
    const valor = campos[campos.length - 1].trim();
    if (!rotulo || !valor) continue;
    const chave = rotulo.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!chave || chave in out) continue;
    out[chave] = /^-?\d+(\.\d+)?$/.test(valor) ? Number(valor) : valor;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Drops: tabela com o link do item, a quantidade e a probabilidade.
 *
 * A chave sai do `href`, que e a MESMA chave de itens.json (`Wool`,
 * `Lamball_Mutton`), entao o drop liga direto para a ficha de item da E9 sem
 * casar por nome. Casar por nome quebraria no primeiro item que o jogo
 * traduzir diferente.
 */
function lerDrops(html) {
  const bloco = cartao(html, 'Possible Drops');
  if (!bloco) return null;
  const out = [];
  const linha = /<a class="itemname"[^>]*href="([^"]+)"[^>]*>(?:<img[^>]*>)?([^<]+)<\/a>[\s\S]{0,200}?itemQuantity">([^<]+)<\/small>[\s\S]{0,200}?<td>\s*([\d.]+)%/g;
  for (const m of bloco.matchAll(linha)) {
    const qtd = texto(m[3]);
    const [min, max] = qtd.includes('-') ? qtd.split('-').map((n) => Number(n.trim())) : [Number(qtd), Number(qtd)];
    out.push({
      chave: decodeURIComponent(m[1]).replace(/^.*\//, ''),
      nome: texto(m[2]),
      min,
      max: Number.isFinite(max) ? max : min,
      probabilidade: Number(m[4]),
    });
  }
  return out.length ? out : null;
}

/**
 * Onde capturar: as linhas do cartao Spawner.
 *
 * O paldb da o mapa e a AREA NOMEADA (`green_A`, `grass_grade_01`), nunca
 * coordenada. Entao isto nao liga no /mapa por si so, e a E10 diz isso em vez
 * de fingir que liga.
 */
function lerCaptura(html) {
  const bloco = cartao(html, 'Spawner');
  if (!bloco) return null;
  const out = [];
  for (const tr of bloco.split('<tr>').slice(1)) {
    const nivel = tr.match(/<span class="level">([^<]+)<\/span>/);
    const area = tr.match(/href="([^"?]+)\?(zone|spawner)=([^"]+)"/);
    if (!area) continue;
    const faixa = nivel ? texto(nivel[1]) : null;
    const [min, max] = faixa && faixa.includes('-')
      ? faixa.split('-').map((n) => Number(n.trim()))
      : [faixa ? Number(faixa) : null, faixa ? Number(faixa) : null];
    const registro = {
      mapa: decodeURIComponent(area[1]),
      tipo: area[2],
      area: decodeURIComponent(area[3]),
      nivel_min: Number.isFinite(min) ? min : null,
      nivel_max: Number.isFinite(max) ? max : null,
    };
    if (!out.some((r) => r.mapa === registro.mapa && r.area === registro.area && r.nivel_min === registro.nivel_min)) {
      out.push(registro);
    }
  }
  return out.length ? out : null;
}

const feito = existsSync(PARCIAL) ? JSON.parse(readFileSync(PARCIAL, 'utf8')) : {};
const alvo = pals.slice(0, limite === Infinity ? pals.length : limite);
let buscados = 0, falhas = 0;

console.log(`Buscando ${alvo.length} fichas de Pal no paldb, uma por vez.`);

for (const [i, pal] of alvo.entries()) {
  if (feito[pal.chave] && !feito[pal.chave].falha) continue;
  try {
    // Codificada por precaucao, ver o cabecalho deste arquivo.
    const url = ORIGEM + pal.chave.replace(/[:()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    const r = await fetch(url, { headers: { 'user-agent': 'wiki-palworld (projeto de fa, sem fins lucrativos)' } });
    if (!r.ok) {
      // FALHA fica num campo proprio. Ausencia declarada e `null` dentro do
      // registro. Os dois nunca dividem lugar, que e o defeito da E8.
      feito[pal.chave] = { falha: r.status };
      falhas++;
    } else {
      const html = await r.text();
      feito[pal.chave] = {
        atributos: lerAtributos(html),
        drops: lerDrops(html),
        captura: lerCaptura(html),
      };
    }
  } catch (e) {
    feito[pal.chave] = { falha: String(e.message || e).slice(0, 60) };
    falhas++;
  }
  buscados++;
  if (buscados % 25 === 0) {
    writeFileSync(PARCIAL, JSON.stringify(feito));
    console.log(`  ${i + 1}/${alvo.length}  falhas: ${falhas}`);
  }
  await new Promise((s) => setTimeout(s, PAUSA));
}
writeFileSync(PARCIAL, JSON.stringify(feito));

const trazidos = Object.entries(feito).filter(([, v]) => !v.falha);
const naoTrazidos = Object.entries(feito).filter(([, v]) => v.falha);
const conta = (c) => trazidos.filter(([, v]) => v[c]).length;

console.log('');
console.log(`Visitadas ${Object.keys(feito).length}: ${trazidos.length} trazidas, ${naoTrazidos.length} que a requisicao nao trouxe`);
for (const c of ['atributos', 'drops', 'captura']) {
  const n = conta(c);
  const frac = trazidos.length ? n / trazidos.length : 0;
  console.log(`  ${c.padEnd(11)} ${String(n).padStart(4)} de ${trazidos.length}  (${(frac * 100).toFixed(0)}%, piso ${(PISO[c] * 100).toFixed(0)}%)`);
}

// Guarda de aborto: categoria inteira vazia e markup quebrado, e o arquivo bom
// nao pode ser substituido pelo ruim.
//
// So vale na IMPORTACAO CHEIA. Num piloto de 10 a fracao nao significa nada, e
// num run alvejado ela mente: pedir dois chefes de torre da captura em 0%, que
// e a resposta certa para eles e um aborto falso aqui.
const importacaoCheia = limite === Infinity && !chavesPedidas;
if (importacaoCheia) {
  const abaixo = ['atributos', 'drops', 'captura']
    .filter((c) => (trazidos.length ? conta(c) / trazidos.length : 0) < PISO[c]);
  if (abaixo.length) {
    console.error('');
    console.error(`ABORTADO: ${abaixo.join(', ')} abaixo do piso. O markup do paldb mudou? Nada foi gravado em fichas-pal.json.`);
    process.exit(1);
  }
}

const saida = {
  _leia_isto: [
    'Atributo, drop e local de captura por Pal, importado da ficha do paldb.',
    'Gerado por: npm run fichas:importar. Nao editar a mao.',
    'null num bloco quer dizer que a ficha NAO publica aquilo para este Pal.',
    'Ficha que a requisicao nao trouxe esta em nao_trazidos, com o motivo, e nao entra em fichas.',
    'As duas coisas sao diferentes e nunca dividem lugar: foi confundi-las que custou uma rodada na E8.',
  ],
  fonte: 'https://paldb.cc/en/<chave-do-pal>',
  importado_em: new Date().toISOString().slice(0, 10),
  visitados: Object.keys(feito).length,
  com_atributos: conta('atributos'),
  com_drops: conta('drops'),
  com_captura: conta('captura'),
  nao_trazidos: naoTrazidos.map(([k, v]) => ({ chave: k, motivo: v.falha })),
  fichas: Object.fromEntries(trazidos),
};
writeFileSync(DESTINO, JSON.stringify(saida, null, 1) + '\n');
console.log('');
console.log(`Gravado em src/data/fichas-pal.json`);
