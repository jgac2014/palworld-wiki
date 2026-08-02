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
import { readFile, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { filhoteDoPar, cruzaveis, sorteaveis, naPalpedia } from '../src/lib/calculos.js';
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

/** Texto cru de um arquivo do repositório. Devolve null quando não existe. */
const ler = async (rel) => {
  const p = join(raiz, rel);
  if (!existsSync(p)) return null;
  return readFile(p, 'utf-8');
};

const pals = await lerJson('src/data/pals.json');
const mapa = await lerJson('src/data/mapa.json');
const termos = await lerJson('src/data/termos.json');
// Lido aqui em cima porque duas checagens distantes uma da outra dependem dele:
// a de consistência factual, que compara o número escrito nas páginas, e a da
// Palpédia lá embaixo. Duas leituras do mesmo arquivo é como se ganha duas
// verdades.
const versao = await lerJson('src/data/versao.json');

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

// ------------------------------- itens, estruturas e tecnologias (E4)
// Mesma desconfiança que vale para o catálogo de Pals: coleção importada que
// encolhe é markup do paldb que mudou, e é melhor o build quebrar do que o
// site publicar meia verdade. O mínimo é folgado de propósito, para acusar
// quebra e não variação de patch.
// "pt-BR_Text", "en-US_Text" e semelhantes: o slot da string aparecendo no
// lugar do conteúdo. Solto no meio do nome também conta, porque nome de verdade
// nunca carrega isso.
const MARCADOR_DE_STRING = /[a-z]{2}(?:-[A-Za-z]{2,4})?_Text/;

const COLECOES = [
  { arquivo: 'itens.json', rotulo: 'itens', minimo: 1200 },
  { arquivo: 'estruturas.json', rotulo: 'estruturas', minimo: 250, exige: ['categoria'] },
  { arquivo: 'tecnologias.json', rotulo: 'tecnologias', minimo: 400, exige: ['nivel', 'custo', 'tipo'] },
];

for (const { arquivo, rotulo, minimo, exige = [] } of COLECOES) {
  const dados = await lerJson(`src/data/${arquivo}`);
  if (!dados) continue;
  const lista = dados.itens || [];

  if (lista.length < minimo) {
    erro(rotulo, `só ${lista.length} ${rotulo} (mínimo ${minimo}). Importação quebrada? Rode npm run catalogo:importar`);
  }
  if (dados.total !== lista.length) {
    erro(rotulo, `o campo total diz ${dados.total} e a lista tem ${lista.length}`);
  }

  const chaves = new Set();
  let semPar = 0, semExtra = 0;
  for (const x of lista) {
    if (!x.chave || !x.en || !x.pt) { semPar++; continue; }
    if (chaves.has(x.chave)) erro(rotulo, `chave duplicada: ${x.chave}`);
    chaves.add(x.chave);
    for (const campo of exige) {
      if (x[campo] === null || x[campo] === undefined || x[campo] === '') semExtra++;
    }
  }
  if (semPar) erro(rotulo, `${semPar} entradas sem chave, sem nome em inglês ou sem nome em português`);
  if (semExtra) erro(rotulo, `${semExtra} campos obrigatórios vazios (${exige.join(', ')})`);

  if (rotulo === 'tecnologias') {
    const fora = lista.filter((t) => !(t.nivel >= 1 && t.nivel <= 80));
    if (fora.length) erro(rotulo, `${fora.length} com nível fora de 1 a 80, o teto do jogo. Ex: ${fora[0]?.en}`);
  }

  const traduzidos = lista.filter((x) => x.pt !== x.en).length;
  if (!traduzidos) erro(rotulo, 'nenhum nome em português. O índice em PT não foi lido na importação');

  // Marcador de string não resolvida NUNCA é nome. O paldb devolve "pt-BR_Text"
  // quando a localização do jogo não tem aquela string, e 99 registros foram
  // publicados com isso na cara do leitor, em /itens/, antes de alguém ver.
  // Nome que é igual em PT e EN continua passando: Pizza, Katana e Silo são a
  // mesma palavra, e isso é a localização acertando, não faltando.
  const comMarcador = lista.filter((x) => MARCADOR_DE_STRING.test(x.pt) || MARCADOR_DE_STRING.test(x.en));
  if (comMarcador.length) {
    erro(
      rotulo,
      `${comMarcador.length} nome(s) com marcador de string não resolvida, por exemplo "${comMarcador[0].pt}" (${comMarcador[0].en}). ` +
      'O importador tem que cair para o inglês em vez de gravar o marcador. Rode npm run catalogo:importar',
    );
  }

  const semTraducao = lista.filter((x) => x.sem_traducao_oficial).length;
  const detalhes = [
    `${traduzidos} com nome próprio em português`,
    `${semTraducao} sem tradução oficial no jogo`,
  ];
  // Só afirma "sem marcador" quando é verdade: linha de resumo que diz o
  // contrário do erro logo abaixo é pior que resumo nenhum.
  if (!comMarcador.length) detalhes.push('sem marcador');
  detalhes.push('sem chave repetida');
  passou(`${arquivo}: ${lista.length} ${rotulo}, ${detalhes.join(', ')}`);
}

// ------------------------------------------------- estado do grupo (D1)
// O que o jogo compartilha em co-op fica em guilda.json; o que é de cada
// pessoa, em saves/<nome>.json. Nome de Pal aqui é conferido contra o
// catálogo pelo mesmo motivo da curadoria: grafia errada some em silêncio.
const GRAVIDADES = new Set(['critico', 'serio', 'atencao', 'bom']);
const DIAS_ATE_VENCER = 14;

const guilda = await lerJson('src/data/guilda.json');
if (guilda) {
  for (const g of guilda.gargalos || []) {
    if (!GRAVIDADES.has(g.gravidade)) erro('guilda', `gargalo "${g.titulo || '?'}": gravidade "${g.gravidade}" não existe`);
    if (!g.titulo) erro('guilda', 'gargalo sem título');
    if (!g.explicacao) erro('guilda', `gargalo "${g.titulo || '?'}": sem explicação. Gravidade sem texto é só cor, e o R5.7 proíbe`);
  }
  for (const b of guilda.bases || []) {
    if (!b.nome) erro('guilda', 'base sem nome');
    if (typeof b.x !== 'number' || typeof b.y !== 'number') erro('guilda', `${b.nome}: coordenada inválida`);
    // Roster por base é observação de tela, e a tarefa B1 está bloqueada
    // esperando isso. Fica como aviso para não sumir do radar.
    if (!(b.pals || []).length) aviso('guilda', `${b.nome}: sem Pals alocados. Depende das telas de cada base, tarefa B1`);
  }
  passou(`guilda.json: ${(guilda.bases || []).length} bases, ${(guilda.gargalos || []).length} gargalos, gravidades válidas`);
}

const pastaSaves = join(raiz, 'src/data/saves');
const arquivosSave = existsSync(pastaSaves)
  ? (await readdir(pastaSaves)).filter((f) => f.endsWith('.json'))
  : [];
if (!arquivosSave.length) aviso('saves', 'nenhum save individual em src/data/saves/. O site não tem com o que comparar');

const saves = [];
for (const arquivo of arquivosSave) {
  const save = await lerJson(`src/data/saves/${arquivo}`);
  if (!save) continue;
  saves.push([arquivo, save]);
  if (!save.lido_em) {
    erro('saves', `${arquivo}: sem "lido_em". Sem data de leitura não dá para saber se o número ainda vale`);
    continue;
  }
  const dias = Math.floor((Date.now() - new Date(save.lido_em).getTime()) / 86400000);
  if (Number.isNaN(dias)) erro('saves', `${arquivo}: "lido_em" não é uma data legível`);
  // Vencido é AVISO de propósito: o site esconde a comparação e mostra
  // "desatualizado". Vazio honesto vale mais que número velho, e travar o
  // build por save velho impediria de publicar correção de conteúdo.
  else if (dias > DIAS_ATE_VENCER) aviso('saves', `${arquivo}: lido há ${dias} dias. O site vai esconder a comparação em vez de mostrar número velho`);
}
if (saves.length) passou(`saves: ${saves.length} lidos, todos com data de leitura`);

// Todo Pal citado no estado do grupo tem que existir no catálogo.
if (catalogo) {
  const doJogo = new Set((catalogo.pals || []).flatMap((p) => [p.en, p.pt]));
  const citados = [];
  const colher = (valor, origem) => {
    if (typeof valor === 'string') return;
    if (Array.isArray(valor)) return valor.forEach((v) => colher(v, origem));
    if (!valor || typeof valor !== 'object') return;
    for (const [chave, v] of Object.entries(valor)) {
      if (chave === 'pal' && typeof v === 'string') citados.push([v, origem]);
      else if ((chave === 'pals' || chave.startsWith('parados') || chave.startsWith('de_valor')) && Array.isArray(v)) {
        v.filter((n) => typeof n === 'string').forEach((n) => citados.push([n, origem]));
      } else colher(v, origem);
    }
  };
  if (guilda) colher(guilda, 'guilda.json');
  for (const [arquivo, save] of saves) colher(save, `saves/${arquivo}`);

  const forasteiros = citados.filter(([nome]) => !doJogo.has(nome));
  for (const [nome, origem] of forasteiros) {
    erro('guilda', `${origem}: "${nome}" não existe no catálogo. Grafia errada ou renomeado em patch`);
  }
  if (citados.length) passou(`estado do grupo: ${citados.length} Pals citados, todos existem no catálogo`);
}

// ---------------------------------------------------------------- conteúdo
const pastaWiki = join(raiz, 'src/content/wiki');
const arquivos = (await readdir(pastaWiki)).filter((f) => f.endsWith('.md'));
const ordens = new Map();
const corpos = {};
const carimbos = {};

for (const arquivo of arquivos) {
  const bruto = await readFile(join(pastaWiki, arquivo), 'utf-8');
  // `\r?\n` porque no Windows qualquer operação do git que reescreva o arquivo
  // (checkout, revert, merge) o devolve em CRLF, e aí um regex preso em `\n`
  // acusa "frontmatter malformado" em arquivo que está perfeito. Aconteceu
  // rodando `git revert` durante a prova da checagem do carimbo: as 15 páginas
  // viraram erro de uma vez, sem ninguém ter tocado em conteúdo.
  const m = bruto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) { erro('conteudo', `${arquivo}: frontmatter ausente ou malformado`); continue; }
  const [, fm, corpo] = m;
  corpos[arquivo] = corpo;
  carimbos[arquivo] = fm.match(/^atualizado:\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*\r?$/m)?.[1] || null;

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

// ------------------- URL citada em fontes.md x recorte gravado (F3)
// O CLAUDE.md registra que "fonte consultada e não gravada deixa de existir", e
// o repositório provou isso do jeito caro: a regra de cruzamento foi validada
// contra uma lista do paldb que ninguém consegue mais reabrir, e a validação
// virou afirmação sem prova. As 28 URLs citadas no fontes.md estavam no mesmo
// estado, só que ainda não tinham envelhecido.
//
// Daqui em diante, citar URL como conferência obriga a gravar o recorte. E
// recorte que NÃO é `viva` (a fonte bloqueou, sumiu, ou abriu sem conter o que
// sustenta a afirmação) obriga a dizer isso no próprio fontes.md: senão a
// página continuaria exibindo como conferido o que só está registrado num
// arquivo de dados que ninguém abre.
const pastaRecortes = join(raiz, 'src/data/recortes');
const fontesTexto = corpos['fontes.md'];
const STATUS_RECORTE = new Set(['viva', 'sem-trecho', 'sem-html', 'bloqueada', 'morta']);

if (!fontesTexto) {
  // Falta de insumo é erro, nunca passagem em silêncio: sem o corpo do
  // fontes.md esta checagem não conferiu nada e não pode dizer que passou.
  erro('recortes', 'fontes.md não foi lido, então nenhuma URL pôde ser conferida contra recorte');
} else if (!existsSync(pastaRecortes)) {
  erro('recortes', 'src/data/recortes/ não existe. Rode `npm run recortes:gravar`');
} else {
  const citadas = [...new Set([...fontesTexto.matchAll(/https?:\/\/[^\s)`\]<>]+/g)].map((m) => m[0]))];
  const recortes = (await readdir(pastaRecortes)).filter((f) => f.endsWith('.md'));
  const porUrl = new Map();

  for (const f of recortes) {
    const bruto = await readFile(join(pastaRecortes, f), 'utf-8');
    const m = bruto.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!m) { erro('recortes', `${f}: sem cabeçalho. Recorte precisa de url, capturado_em e status`); continue; }
    const [, cab, corpo] = m;
    const url = cab.match(/^url:\s*(\S+)\s*\r?$/m)?.[1];
    const data = cab.match(/^capturado_em:\s*(\d{4}-\d{2}-\d{2})\s*\r?$/m)?.[1];
    const status = cab.match(/^status:\s*(\S+)\s*\r?$/m)?.[1];

    if (!url) { erro('recortes', `${f}: cabeçalho sem "url". Recorte sem origem não prova nada`); continue; }
    if (!data) erro('recortes', `${f}: cabeçalho sem "capturado_em" no formato AAAA-MM-DD`);
    if (!status || !STATUS_RECORTE.has(status)) {
      erro('recortes', `${f}: status "${status ?? 'ausente'}" não é um de ${[...STATUS_RECORTE].join(', ')}`);
    }
    // Recorte marcado como vivo tem que ter trecho citado dentro. Arquivo com
    // cabeçalho bonito e corpo vazio é o modo de falha que este projeto mais
    // repete: a checagem passa e a prova não existe.
    if (status === 'viva' && !/^>\s+\S/m.test(corpo)) {
      erro('recortes', `${f}: status "viva" e nenhum trecho citado no corpo`);
    }
    if (porUrl.has(url)) erro('recortes', `${f} e ${porUrl.get(url).arquivo} gravam a mesma URL`);
    porUrl.set(url, { arquivo: f, status, data });
  }

  for (const url of citadas) {
    if (!porUrl.has(url)) {
      erro('recortes', `${url} é citada no fontes.md e não tem recorte em src/data/recortes/. Rode \`npm run recortes:gravar\``);
    }
  }
  for (const [url, r] of porUrl) {
    if (!citadas.includes(url)) aviso('recortes', `${r.arquivo} guarda ${url}, que o fontes.md não cita mais`);
  }

  const semProva = [...porUrl.values()].filter((r) => r.status !== 'viva');
  for (const r of semProva) {
    if (!fontesTexto.includes(r.arquivo)) {
      erro('recortes', `${r.arquivo} está "${r.status}" e o fontes.md não registra isso. Fonte sem prova reproduzível precisa aparecer na página, não só no arquivo de dados`);
    }
  }

  const vivas = [...porUrl.values()].filter((r) => r.status === 'viva').length;
  if (citadas.length) {
    passou(`recortes: ${citadas.length} URLs citadas em fontes.md, ${vivas} com trecho gravado e ${semProva.length} registradas sem prova reproduzível`);
  }
}

// ---------------------- marcadores do mapa x referência congelada (H2 e H3)
const mapaPontos = await lerJson('src/data/mapa-pontos.json');
const refMapa = await lerJson('src/data/referencia-mapa.json');
if (mapaPontos && refMapa) {
  let derivou = 0;
  if (mapaPontos.total !== refMapa.total_de_pontos) {
    derivou++;
    erro('mapa', `${mapaPontos.total} pontos importados contra ${refMapa.total_de_pontos} na referência (${mapaPontos.total - refMapa.total_de_pontos > 0 ? '+' : ''}${mapaPontos.total - refMapa.total_de_pontos})`);
  }
  if (mapaPontos.extras.length !== refMapa.total_de_extras) {
    derivou++;
    erro('mapa', `${mapaPontos.extras.length} extras importados contra ${refMapa.total_de_extras} na referência`);
  }

  const contadas = {};
  for (const p of mapaPontos.pontos) {
    const cat = mapaPontos.tipos[p.t]?.categoria;
    if (cat) contadas[cat] = (contadas[cat] || 0) + 1;
  }
  for (const [cat, esperado] of Object.entries(refMapa.por_categoria)) {
    const veio = contadas[cat] || 0;
    if (veio !== esperado) {
      derivou++;
      const nome = mapaPontos.categorias[cat]?.pt || cat;
      erro('mapa', `categoria ${nome}: ${veio} pontos na importação e ${esperado} na referência (${veio - esperado > 0 ? '+' : ''}${veio - esperado})`);
    }
  }
  for (const cat of Object.keys(contadas)) {
    if (!(cat in refMapa.por_categoria)) {
      derivou++;
      erro('mapa', `categoria ${cat} apareceu na importação e não existe em referencia-mapa.json. Categoria nova entraria no mapa sem ninguém conferir`);
    }
  }
  for (const [tipo, esperado] of Object.entries(refMapa.tipos_de_guarda)) {
    if (tipo.startsWith('_')) continue;
    const veio = mapaPontos.pontos.filter((p) => p.t === tipo).length;
    if (veio !== esperado) {
      derivou++;
      erro('mapa', `tipo ${tipo}: ${veio} pontos na importação e ${esperado} na referência. É um dos quatro que o mapa existe para mostrar`);
    }
  }

  // ------------------------ nome importado que se repete em lugar diferente
  //
  // Esta checagem existe porque a coisa que ela pega ESTAVA no ar. O importador
  // casava o nome em português com o em inglês por `id`, e 13.139 dos 13.755
  // pontos não têm `id`: `undefined === undefined` é verdade, então todo ponto
  // de um tipo herdava o nome do primeiro daquele tipo. Os 137 pontos de viagem
  // rápida se chamavam todos "Ilha Solitária Esquecida" e as 66 recompensas se
  // chamavam todas "Carente de Aprovação Dazzle". Eram 3.622 pontos com nome
  // errado, no popup e na tabela, e nada acusava: o nome estava lá, era
  // plausível, e o defeito só apareceu quando a busca do mapa passou a listar
  // três resultados diferentes com o mesmo rótulo.
  //
  // O critério não é "nenhum nome repetido", que seria falso: a localização do
  // jogo colapsa "Fort Ruins" e "Fortress Ruins" no mesmo "Restos da Fortaleza".
  // O que ela mede é quantos nomes em português cobrem mais de um nome em
  // inglês, contra o número congelado na referência.
  const porNomePt = new Map();
  for (const p of [...mapaPontos.pontos, ...mapaPontos.extras]) {
    if (!p.pt || !p.en) continue;
    if (!porNomePt.has(p.pt)) porNomePt.set(p.pt, new Set());
    porNomePt.get(p.pt).add(p.en);
  }
  const ambiguos = [...porNomePt.entries()].filter(([, ens]) => ens.size > 1);
  const tetoAmbiguo = refMapa.nomes_pt_cobrindo_mais_de_um_en;
  if (typeof tetoAmbiguo !== 'number') {
    derivou++;
    erro('mapa', 'referencia-mapa.json não declara nomes_pt_cobrindo_mais_de_um_en, então nome importado repetido não tem com o que ser comparado');
  } else if (ambiguos.length > tetoAmbiguo) {
    derivou++;
    const piores = ambiguos.sort((a, b) => b[1].size - a[1].size).slice(0, 3)
      .map(([pt, ens]) => `"${pt}" em ${ens.size} lugares`).join(', ');
    erro('mapa', `${ambiguos.length} nomes em português cobrem mais de um lugar diferente, contra ${tetoAmbiguo} na referência: ${piores}. O casamento entre os dois idiomas quebrou, e nome errado é pior que nome ausente`);
  }

  const rotulosPt = Object.values(mapaPontos.tipos).filter((t) => !t.sem_traducao_oficial).length;
  if (rotulosPt !== refMapa.tipos_com_rotulo_em_portugues) {
    derivou++;
    erro('mapa', `${rotulosPt} tipos com rótulo em português na importação e ${refMapa.tipos_com_rotulo_em_portugues} na referência. O paldb mudou o que traduz: aceite atualizando a referência e registrando em fontes.md`);
  }
  if (Object.keys(mapaPontos.tipos).length !== refMapa.total_de_tipos) {
    derivou++;
    erro('mapa', `${Object.keys(mapaPontos.tipos).length} tipos na importação e ${refMapa.total_de_tipos} na referência`);
  }

  // ---------------------------------------------- prova da projeção (H3)
  //
  // O paldb publica DOIS sistemas de coordenada no mesmo pacote: `fixedDungeon`
  // em coordenada de mundo, que o importador converte, e `regionData` mais
  // `extrasIngame` já em coordenada de tela, que ele NÃO toca. Os dois grupos
  // descrevem lugares que se sobrepõem no jogo: um crítico de Pal fica em cima
  // de um ponto de viagem rápida, um mercador fica dentro de uma cidade.
  //
  // Então a conversão pode ser conferida contra a própria fonte, sem depender
  // do nosso mapa.json, que é justamente o que NÃO serve de referência aqui:
  // ele tem coordenada estimada, e a comparação está registrada em fontes.md.
  //
  // A TOLERÂNCIA SAIU DA MEDIÇÃO, não de chute. Medindo a distância de cada um
  // dos 121 pontos de tela ao ponto convertido mais próximo: 14 ficam abaixo de
  // 1 unidade, 28 abaixo de 2, mediana 4,5. Os 14 são sobreposição real, e é
  // neles que a asserção pega: com 13.755 pontos espalhados por cerca de 3.000
  // unidades de lado, o espaçamento médio entre pontos é de umas 25 unidades,
  // então concordância abaixo de 1 unidade não acontece por acaso nem sobrevive
  // a um deslocamento errado. O piso é 12 e não 14 para uma importação futura
  // poder acrescentar ou tirar um ponto sem quebrar o portão à toa.
  //
  // A mediana entra junto porque as duas falham por motivos diferentes: a
  // contagem pega deslocamento e troca de sinal, a mediana pega deriva larga
  // que ainda deixaria alguns pares casando.
  const PERTO = 1.0;
  const MINIMO_PERTO = 12;
  const MEDIANA_MAXIMA = 8;
  const distancias = mapaPontos.extras.map((e) => {
    let melhor = Infinity;
    for (const p of mapaPontos.pontos) {
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (d < melhor) melhor = d;
    }
    return melhor;
  }).sort((a, b) => a - b);
  const perto = distancias.filter((d) => d <= PERTO).length;
  const mediana = distancias.length ? distancias[Math.floor(distancias.length / 2)] : Infinity;

  let projecaoOk = true;
  if (perto < MINIMO_PERTO) {
    projecaoOk = false;
    erro('mapa', `projeção: só ${perto} dos ${distancias.length} pontos de tela do paldb caem a menos de ${PERTO} unidade de um ponto convertido, e o mínimo medido é ${MINIMO_PERTO}. A conversão de mundo para tela em projecao-mapa.json está errada, e TODO marcador está fora do lugar`);
  }
  if (mediana > MEDIANA_MAXIMA) {
    projecaoOk = false;
    erro('mapa', `projeção: mediana de ${mediana.toFixed(1)} unidades entre ponto de tela e ponto convertido, acima do teto de ${MEDIANA_MAXIMA}. Deriva larga na conversão`);
  }
  if (projecaoOk && !derivou) {
    passou(`mapa: ${mapaPontos.total} pontos e ${mapaPontos.extras.length} extras batem com a referência, e a projeção casa ${perto} pares abaixo de ${PERTO} unidade (mediana ${mediana.toFixed(1)})`);
  }
}

// -------------------- fundo do mapa x limites da build ativa (H6)
//
// A aferição de verdade acontece no `npm run mapa:fundo`: ele mede, com a
// máscara de mar tirada da própria imagem, onde caem os 11 marcadores de
// coordenada importada, e ABORTA sem escrever tile se algum cair na água. Aqui
// não dá para refazer essa medição: a imagem original de 8192 px não está no
// repositório, e refazê-la a cada `verificar` custaria minutos.
//
// O QUE ESTA CHECAGEM FECHA é o buraco que sobraria: alguém edita o
// enquadramento em projecao-mapa.json, não roda o gerador, e os 13.755 pontos
// saem do lugar com o portão passando. O manifesto guarda os limites que
// estavam valendo na hora de cortar, e eles têm que continuar iguais aos
// declarados. Editar um obriga a rodar o gerador, e o gerador refaz a aferição.
//
// Ela não afirma que a imagem está certa. Afirma que a imagem servida, os
// limites declarados e a medição gravada continuam falando da mesma coisa.
const fundo = await lerJson('src/data/mapa-fundo.json');
const projecao = await lerJson('src/data/projecao-mapa.json');
if (!fundo || !projecao) {
  erro('fundo', 'src/data/mapa-fundo.json ou projecao-mapa.json não abriu, então o fundo do mapa não pôde ser conferido. Rode `npm run mapa:fundo`');
} else {
  let quebrou = false;
  const reprovar = (msg) => { quebrou = true; erro('fundo', msg); };

  const ativa = projecao.build_ativa;
  const declarado = projecao.limites_por_build?.[ativa];
  if (!declarado) {
    reprovar(`projecao-mapa.json declara build_ativa "${ativa}" e não tem esse conjunto em limites_por_build`);
  } else if (fundo.build !== ativa) {
    reprovar(`os tiles em public/mapa/ foram cortados para a build "${fundo.build}" e projecao-mapa.json agora usa "${ativa}". Rode \`npm run mapa:fundo\``);
  } else {
    for (const campo of ['min_x', 'min_y', 'lado']) {
      const usado = fundo.limites_usados?.[campo];
      if (usado === undefined) {
        reprovar(`mapa-fundo.json não guarda limites_usados.${campo}, então o enquadramento dos tiles não tem com o que ser comparado`);
      } else if (Math.abs(usado - declarado[campo]) > 1e-9) {
        reprovar(`enquadramento: os tiles foram cortados com ${campo} ${usado} e projecao-mapa.json declara ${declarado[campo]}. Todo marcador está fora do lugar. Rode \`npm run mapa:fundo\``);
      }
    }
  }

  // A geometria da pirâmide tem que fechar com a imagem: nível de cima em
  // resolução nativa, cada nível com a grade que o seu zoom exige.
  const t = fundo.tiles || {};
  const ladoEsperado = (t.lado || 0) * 2 ** ((t.niveis || 1) - 1);
  if (ladoEsperado !== fundo.imagem_original?.largura) {
    reprovar(`a pirâmide fecha em ${ladoEsperado}px e a imagem original tem ${fundo.imagem_original?.largura}px. Nível de cima não está na resolução nativa`);
  }

  // Tile declarado que não está no disco é o modo de falha silencioso: a página
  // serviria buraco e o mapa pareceria oceano vazio.
  const pastaTiles = join(raiz, 'public/mapa');
  let noDisco = 0;
  let bytesNoDisco = 0;
  if (!existsSync(pastaTiles)) {
    reprovar('public/mapa/ não existe, e o mapa serviria fundo vazio. Rode `npm run mapa:fundo`');
  } else {
    for (const nivel of t.por_nivel || []) {
      const pastaNivel = join(pastaTiles, String(nivel.nivel));
      if (!existsSync(pastaNivel)) {
        reprovar(`o nível ${nivel.nivel} do fundo não existe em public/mapa/, e o manifesto promete ${nivel.tiles} tiles`);
        continue;
      }
      const arquivos = (await readdir(pastaNivel)).filter((f) => f.endsWith('.webp'));
      if (arquivos.length !== nivel.tiles) {
        reprovar(`o nível ${nivel.nivel} tem ${arquivos.length} tiles no disco e ${nivel.tiles} no manifesto`);
      }
      noDisco += arquivos.length;
      for (const f of arquivos) bytesNoDisco += (await stat(join(pastaNivel, f))).size;
    }
    if (bytesNoDisco !== t.bytes) {
      reprovar(`os tiles somam ${bytesNoDisco} bytes no disco e ${t.bytes} no manifesto. O fundo servido não é o que foi aferido`);
    }
  }

  // Aferição gravada que não afirma nada não vale como aferição.
  const af = fundo.afericao || {};
  if (!af.marcadores_conferidos) {
    reprovar('mapa-fundo.json não diz quantos marcadores a aferição conferiu. Medição sem contagem ao lado não é medição');
  } else if (af.marcadores_no_mar !== 0) {
    reprovar(`a aferição gravada diz que ${af.marcadores_no_mar} marcadores de referência caem no mar. O gerador não deveria ter escrito tile nenhum`);
  }

  if (!quebrou) {
    passou(
      `fundo do mapa: ${noDisco} tiles da build "${fundo.build}" batem com o enquadramento declarado, ` +
      `e a aferição gravada põe ${af.marcadores_conferidos} de ${af.marcadores_conferidos} marcadores em terra ` +
      `(${af.no_mar_com_a_build_ativa} de ${af.pontos_so_de_terra} pontos de terra no mar, contra ` +
      `${Object.values(af.no_mar_com_as_outras || {}).join(' e ')} com a outra build)`,
    );
  }
}

// ------------------------ carimbo "atualizado" x histórico do arquivo (E5)
// O carimbo do topo da página promete uma data de revisão. Ele mentiu por dois
// dias no fontes.md, que dizia 30.07 depois de a seção inteira ser reescrita em
// 01.08, e ninguém tinha como notar: nada comparava a promessa com o que de
// fato aconteceu no arquivo.
//
// A comparação é com o último commit que mexeu no CORPO, não com o último
// commit que tocou o arquivo. Frontmatter é moldura: a rodada que acrescentou
// `titulo_en` em 14 páginas não revisou conteúdo nenhum, e um critério cru
// exigiria bumpar 14 carimbos para registrar uma revisão que não houve. Carimbo
// bumpado à toa mente igual, só na outra direção.
//
// A ARMADILHA QUE ESTA CHECAGEM PRECISA COBRIR: `actions/checkout@v4` sem
// `fetch-depth` clona raso, e em clone raso o `git log` por arquivo volta
// vazio. Escrita do jeito óbvio, ela passaria em CI sem comparar nada, que é o
// mesmo placebo do teste por file://. Por isso clone raso é ERRO, e "nenhum
// arquivo pôde ser comparado" também. Ela falha quando não sabe, nunca pula.
const gitDaqui = (args) => {
  try {
    return execFileSync('git', args, { cwd: raiz, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

const dentroDeRepo = gitDaqui(['rev-parse', '--is-inside-work-tree']) === 'true';
if (!dentroDeRepo) {
  erro('carimbo', 'não consegui falar com o git aqui, então o carimbo "atualizado" de nenhuma página pôde ser conferido. A checagem falha em vez de passar sem comparar nada');
} else if (gitDaqui(['rev-parse', '--is-shallow-repository']) === 'true') {
  erro('carimbo', 'o repositório está em clone raso, e em clone raso o histórico por arquivo volta vazio. A checagem do carimbo não tem com o que comparar. Em CI, ponha "fetch-depth: 0" no actions/checkout do portao.yml');
} else {
  // Corpo do arquivo num commit específico, sem o frontmatter.
  const corpoEm = (sha, caminho) => {
    const bruto = gitDaqui(['show', `${sha}:${caminho}`]);
    if (bruto === null) return null;
    return bruto.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/)?.[1] ?? bruto;
  };

  // O commit inicial não é revisão, é a importação. Todo o conteúdo entrou aqui
  // de uma vez, vindo do Cowork, num commit datado de 31.07 com páginas escritas
  // em 30.07: o git não enxerga nada antes dele. Tratar a importação como
  // revisão acusaria as 15 páginas de mentir sobre uma revisão que nunca houve,
  // e a saída para calar o verificador seria empurrar 15 carimbos para uma data
  // errada. Carimbo bumpado à toa mente igual, só na outra direção.
  const raizDoHistorico = (gitDaqui(['rev-list', '--max-parents=0', 'HEAD']) || '').split('\n')[0];

  // Commit mais recente que mudou o corpo. Percorre do mais novo para o mais
  // velho e para no primeiro que difere do anterior, então o caso comum custa
  // duas ou três chamadas ao git.
  const revisadoEm = (caminho) => {
    const historico = gitDaqui(['log', '--format=%H %as', '--', caminho]);
    if (!historico) return null;
    const commits = historico.split('\n').map((l) => {
      const [sha, data] = l.trim().split(' ');
      return { sha, data };
    });
    let atual = corpoEm(commits[0].sha, caminho);
    for (let i = 0; i < commits.length; i++) {
      const anterior = commits[i + 1] ? corpoEm(commits[i + 1].sha, caminho) : null;
      if (atual !== anterior) return commits[i];
      atual = anterior;
    }
    return commits[commits.length - 1];
  };

  let comparados = 0;
  const semCarimbo = [];
  const semHistorico = [];
  const soDaImportacao = [];
  for (const arquivo of arquivos) {
    const caminho = `src/content/wiki/${arquivo}`;
    if (!carimbos[arquivo]) { semCarimbo.push(arquivo); continue; }
    const revisao = revisadoEm(caminho);
    if (!revisao) { semHistorico.push(arquivo); continue; }
    comparados++;
    if (revisao.sha === raizDoHistorico) { soDaImportacao.push(arquivo); continue; }
    if (carimbos[arquivo] < revisao.data) {
      erro('carimbo', `${arquivo}: o carimbo diz ${carimbos[arquivo]} e o corpo da página foi revisado em ${revisao.data}, no commit ${revisao.sha.slice(0, 7)}. A página promete uma data de revisão mais velha do que a revisão que ela recebeu`);
    }
  }

  // Arquivo ainda não commitado não tem histórico, e isso é legítimo: página
  // nova roda o portão antes do primeiro commit. Vira aviso NOMEADO e entra na
  // contagem, para "não conferi" nunca se parecer com "conferi e está certo".
  for (const arquivo of semHistorico) {
    aviso('carimbo', `${arquivo}: sem histórico no git, então o carimbo não foi conferido. Normal em página que ainda não foi commitada`);
  }
  if (!comparados) {
    erro('carimbo', `nenhuma das ${arquivos.length} páginas pôde ter o carimbo comparado com o histórico. A checagem existe para pegar carimbo mentindo e não comparou nada`);
  } else {
    const detalhes = [`${comparados} carimbos conferidos contra o histórico do corpo`];
    if (soDaImportacao.length) detalhes.push(`${soDaImportacao.length} sem revisão depois da importação inicial`);
    if (semCarimbo.length) detalhes.push(`${semCarimbo.length} sem campo "atualizado"`);
    if (semHistorico.length) detalhes.push(`${semHistorico.length} sem histórico`);
    passou(`carimbo: ${detalhes.join(', ')}`);
  }
}

// -------------------------------------------------- consistência factual
const juntos = Object.entries(corpos);
const REGRAS = [
  // "era 65" e "de 65 para 80" citam o valor antigo de propósito: não são divergência
  { nome: 'level cap', re: /level cap(?![^.]{0,30}\bera\b)[^.]{0,30}?\b(\d{2,3})\b/gi, esperado: '80' },
  // O esperado sai de versao.json, não de um literal: com o número escrito
  // aqui dentro, o verificador virava a quarta cópia do mesmo 287.
  { nome: 'total de Pals', re: /(\d{3})\s*Pals no Paldeck|Paldeck[^.]{0,20}(\d{3})/gi, esperado: String(versao?.pals_no_paldeck ?? '') },
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

// ------------------------------- dado das calculadoras x texto dos guias (E5)
// receitas.json existe para a calculadora não refazer uma conta que o guia já
// publica. Duas cópias do mesmo número divergem no primeiro patch, e aí o site
// passa a dizer duas coisas: é o defeito que este verificador existe para pegar.
const receitas = await lerJson('src/data/receitas.json');
if (receitas) {
  const textoEconomia = corpos['economia.md'] || '';
  // "Bolo básico (Cake)" desde a F10, e "Cake básico" antes dela. As duas
  // formas casam porque a checagem existe para achar a LINHA, não para policiar
  // como ela é escrita, e ela continua reprovando quando a linha some.
  const linhaReceita = textoEconomia.match(/Receita do (?:Bolo b[áa]sico \(Cake\)|Cake b[áa]sico):([^\n]+)/)?.[1] || '';
  if (!linhaReceita) {
    erro('receitas', 'não achei a linha da receita do Cake básico em economia.md, que é a fonte do que está em receitas.json');
  } else {
    for (const ing of receitas.bolo.ingredientes) {
      const noTexto = linhaReceita.match(new RegExp(`${ing.en}\\s*x?(\\d+)`, 'i'))?.[1];
      if (!noTexto) erro('receitas', `${ing.en} não aparece na receita de economia.md`);
      else if (Number(noTexto) !== ing.quantidade) {
        erro('receitas', `${ing.en}: receitas.json diz ${ing.quantidade} e economia.md diz ${noTexto}`);
      }
    }
  }

  // O efeito do Pal liga o ingrediente a quem produz, e a ponta solta seria uma
  // mensagem de gargalo sem ninguém para resolver.
  if (pals) {
    const efeitos = new Set(pals.pals.map((p) => p.efeito).filter(Boolean));
    for (const ing of receitas.bolo.ingredientes) {
      if (ing.efeito_do_pal && !efeitos.has(ing.efeito_do_pal)) {
        erro('receitas', `nenhum Pal da curadoria produz "${ing.efeito_do_pal}", citado no ingrediente ${ing.pt}`);
      }
    }
  }

  const noGuia = (corpos['base-e-trabalho.md'] || '').match(/(\d{2,3})\s*c[óo]pias da esp[ée]cie para 4/i)?.[1];
  if (noGuia && Number(noGuia) !== receitas.condensacao.copias_para_4_estrelas) {
    erro('receitas', `condensação: receitas.json diz ${receitas.condensacao.copias_para_4_estrelas} e base-e-trabalho.md diz ${noGuia}`);
  }
  passou(`receitas.json: receita do bolo e total de condensação batem com o texto dos guias`);
}

// ---------------------------------------------------- cruzamento (E5)
if (pals && catalogo) {
  const comCombi = catalogo.pals.filter((p) => typeof p.combi === 'number').length;
  if (comCombi < catalogo.pals.length - 5) {
    erro('cruzamento', `${catalogo.pals.length - comCombi} Pals sem CombiRank. A calculadora de cruzamento não funciona sem ele. Rode npm run catalogo:importar`);
  }
  const unicos = catalogo.cruzamentos_unicos || [];
  if (unicos.length < 100) {
    erro('cruzamento', `só ${unicos.length} combinações únicas no catálogo. Sem elas a calculadora erra as 117 espécies que só nascem de par específico`);
  }
  const chaves = new Set(catalogo.pals.map((p) => p.chave));
  const soltas = unicos.filter((u) => u.length !== 3 || u.some((n) => !chaves.has(n)));
  if (soltas.length) {
    erro('cruzamento', `${soltas.length} combinações únicas citam nome que não é Pal do catálogo, por exemplo ${JSON.stringify(soltas[0])}`);
  }
  if (!soltas.length && unicos.length >= 100) {
    passou(`cruzamento: ${comCombi} CombiRanks e ${unicos.length} combinações únicas, todas de Pal do catálogo`);
  }

  // ------------------- receita escrita na curadoria x o que a conta responde
  // A F1 nasceu porque a curadoria dizia "Anubis: Cruzamento de Vanwyrm com
  // Azurobe" e a calculadora respondia Slowatt para esse par. Uma das duas
  // estava errada, e ninguém tinha como saber qual sem abrir o JSON na mão.
  // Agora o par escrito é passado pela MESMA função que a página usa, e texto
  // que discorda da conta vira erro.
  const porNome = new Map();
  for (const p of catalogo.pals) {
    for (const n of [p.chave, p.en, p.pt]) if (n) porNome.set(String(n).toLowerCase(), p.chave);
  }
  const paraConta = {
    pals: catalogo.pals
      .filter((p) => typeof p.combi === 'number')
      .map((p) => ({ chave: p.chave, en: p.en, pt: p.pt, numero: p.numero, combi: p.combi, ...(p.so_combinacao_unica ? { so_combinacao_unica: true } : {}) })),
    cruzamentos_unicos: catalogo.cruzamentos_unicos || [],
  };
  let receitas = 0;
  for (const p of pals.pals) {
    const m = String(p.onde || '').match(/^Cruzamento:\s*(.+?)\s+com\s+(.+?)\s*$/i);
    if (!m) continue;
    const a = porNome.get(m[1].toLowerCase());
    const b = porNome.get(m[2].toLowerCase());
    if (!a || !b) {
      erro('receita', `${p.nome}: a receita "${p.onde}" cita ${!a ? m[1] : m[2]}, que não é Pal do catálogo`);
      continue;
    }
    receitas++;
    const filho = filhoteDoPar(paraConta, a, b)?.filho?.chave;
    const esperado = porNome.get(String(p.nome).toLowerCase());
    if (filho !== esperado) {
      erro('receita', `${p.nome}: a curadoria diz "${p.onde}" e esse par devolve ${filho || 'nada'} na calculadora. Uma das duas está errada, e receita pré-1.0 é a suspeita de sempre: os 215 Pals antigos tiveram o rank de cruzamento alterado`);
    }
  }
  if (receitas) passou(`receita: ${receitas} par(es) escrito(s) na curadoria conferido(s) contra a calculadora`);
}

// ------- termo que o mecanismo não alterna não pode ficar só em inglês (F10)
//
// O guia misturava idioma: "Heavily Armored", "Skymarcher" e "Legend" na mesma
// tabela que "Imortalidade" e "Babá". As causas são duas e só uma tem conserto
// aqui.
//
// Termo que o plugin MARCA já alterna sozinho: escrito em inglês, o seletor o
// põe em português na carga da página. O problema é o termo que o plugin nunca
// marca, o que está na lista NAO_MARCAR porque a palavra é curta ou genérica
// demais. Esse fica preso em inglês para sempre, em qualquer idioma escolhido.
//
// A varredura casa do termo MAIS LONGO para o mais curto, como o plugin, senão
// "Cake" acusa dentro de "Vegetable Cake" e a checagem vira ruído.
{
  const lib = await ler('src/lib/termos.js');
  const bloco = lib?.match(/NAO_MARCAR = new Set\(\[([\s\S]*?)\]\)/)?.[1];
  if (!termos?.termos || !bloco) {
    erro('idioma', 'não consegui ler termos.json ou a lista NAO_MARCAR de src/lib/termos.js');
  } else {
    const naoMarca = new Set([...bloco.matchAll(/'([^']+)'/g)].map((m) => m[1]));
    // Nome próprio do jogo que fica em inglês de propósito, com o motivo. Sem
    // esta lista a checagem cobraria tradução de coisa que não tem tradução, e
    // a próxima pessoa a desligaria.
    const DE_PROPOSITO = [
      'Arena Legend',        // nome de rank da Arena, não a passiva Lendário
      'Work Suitability Books', // nome do item, e o item não está no dicionário
      'Lucky Pals',          // nome da categoria de drop, idem
      'Ranch Master',        // passiva própria, glosada como Mestre Pecuarista
    ];
    const alvos = Object.values(termos.termos)
      .filter((v) => v.pt && v.en && v.pt !== v.en && naoMarca.has(v.en))
      .sort((a, b) => b.en.length - a.en.length);
    const todosOsEn = Object.values(termos.termos).map((v) => v.en).filter(Boolean)
      .sort((a, b) => b.length - a.length);

    if (!alvos.length) {
      erro('idioma', 'nenhum termo do dicionário é bloqueado pelo NAO_MARCAR. Ou a lista mudou, ou esta checagem virou decoração');
    } else {
      const escapa = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const soltos = [];
      for (const [arq, corpo] of juntos) {
        // glossario e fontes SÃO a tabela de tradução: PT ao lado de EN ali
        // está certo, e é a mesma proteção da lista NAO_MEXER.
        if (arq === 'glossario.md' || arq === 'fontes.md') continue;
        // Tira do texto, na ordem do mais longo para o mais curto, tudo que já
        // é nome composto conhecido ou glosa "PT (EN)": o que sobrar é inglês
        // sozinho de verdade.
        let restante = corpo;
        for (const frase of [...DE_PROPOSITO, ...todosOsEn]) {
          const v = Object.values(termos.termos).find((t) => t.en === frase);
          if (v?.pt) {
            // Até duas palavras entre o nome e o parêntese, para "Bolo básico
            // (Cake)" e "Bolo base (Cake)" contarem como glosa. Sem isso a
            // checagem cobrava tradução de texto que já está traduzido.
            restante = restante.replaceAll(
              new RegExp(`${escapa(v.pt)}(?:\\s+[\\p{L}\\p{N}]+){0,2}\\s*\\(${escapa(frase)}\\)`, 'gu'), ' ');
          }
          if (frase.includes(' ') || DE_PROPOSITO.includes(frase)) {
            restante = restante.replaceAll(frase, ' ');
          }
        }
        for (const v of alvos) {
          const rx = new RegExp(`(?<![\\p{L}\\p{N}_])${escapa(v.en)}(?![\\p{L}\\p{N}_])`, 'gu');
          const n = (restante.match(rx) || []).length;
          if (n) soltos.push(`${arq}: "${v.en}" ${n}x, e o oficial é "${v.pt}"`);
        }
      }
      if (soltos.length) {
        erro('idioma', `termo que o mecanismo nunca alterna, escrito só em inglês no guia -> ${soltos.join(' | ')}`);
      } else {
        passou(`idioma: nenhum dos ${alvos.length} termos que o NAO_MARCAR bloqueia aparece só em inglês no corpo dos guias`);
      }
    }
  }
}

// ------------- todo valor de campo exibido tem tradução no dicionário (F12)
//
// A coluna TIPO de /tecnologias saía com o valor cru do paldb: 371 "Items" e
// 217 "Structures" no meio de nome, nível e custo em português. Traduzir na
// importação gravaria texto que ninguém reconfere contra a fonte, então a
// tradução mora no dicionário de interface e entra na exibição.
//
// O que impede o defeito de voltar não é a tradução, é esta checagem: uma
// importação futura pode trazer valor novo, e sem alguém olhando ele iria ao
// ar em inglês exatamente como estes dois foram.
{
  const interfaceJson = await lerJson('src/data/interface.json');
  const tecnologias = await lerJson('src/data/tecnologias.json');
  if (!interfaceJson || !tecnologias?.itens?.length) {
    erro('tipos', 'não consegui ler interface.json ou tecnologias.json para conferir a tradução da coluna TIPO');
  } else {
    const valores = [...new Set(tecnologias.itens.map((x) => x.tipo).filter(Boolean))];
    if (!valores.length) {
      erro('tipos', 'nenhuma tecnologia tem campo "tipo". Ou a importação mudou de forma, ou esta checagem virou decoração');
    } else {
      const semTraducao = valores.filter((v) => {
        const t = interfaceJson[`tipo_${v}`];
        return !t || !t.pt || !t.en;
      });
      if (semTraducao.length) {
        erro('tipos', `${semTraducao.length} valor(es) de tipo sem tradução no interface.json, e iriam ao ar em inglês: ${semTraducao.map((v) => `tipo_${v}`).join(', ')}`);
      } else {
        const contagem = valores
          .map((v) => `${tecnologias.itens.filter((x) => x.tipo === v).length} ${v}`)
          .join(', ');
        passou(`tipos: os ${valores.length} valores da coluna TIPO têm tradução PT/EN (${contagem})`);
      }
    }
  }
}

// ------- o interruptor de progresso só onde ele muda alguma coisa (F8)
//
// Ele nascia nas 323 páginas, trocava de rótulo, gravava no localStorage e não
// revelava nada em 319 delas. Medido no dist antes da correção: 609 elementos
// de overlay nas 299 fichas de Pal, 11 em /pals, 1 em /mapa, zero em todo o
// resto. Botão que muda de estado e não muda nada ensina que ele não funciona.
//
// Agora cada página DECLARA `usaProgresso` no Base, e esta checagem cobra a
// declaração contra o que a página realmente tem. Nos dois sentidos: página
// com overlay e sem declaração perde o interruptor em silêncio, e declaração
// sem overlay traz o botão morto de volta.
{
  const PAGINAS = 'src/pages';
  const varrerAstro = async (pasta) => {
    const achados = [];
    for (const item of await readdir(join(raiz, pasta), { withFileTypes: true })) {
      if (item.isDirectory()) achados.push(...(await varrerAstro(`${pasta}/${item.name}`)));
      else if (item.name.endsWith('.astro')) achados.push(`${pasta}/${item.name}`);
    }
    return achados;
  };
  const arquivos = await varrerAstro(PAGINAS);
  if (!arquivos.length) {
    erro('progresso', 'não achei página nenhuma em src/pages. Esta checagem não conferiu nada');
  } else {
    const errados = [];
    let declaradas = 0;
    for (const arq of arquivos) {
      const fonte = await ler(arq);
      if (!fonte) continue;
      // Overlay é uma das duas coisas: elemento com a classe, ou reação ao
      // evento. /mapa e /calculadoras só têm a segunda, e contar classe
      // sozinha os deixaria de fora.
      const temOverlay = /so-com-progresso|so-sem-registro|so-vencido|progresso:mudou/.test(fonte);
      const declara = /usaProgresso/.test(fonte);
      if (declara) declaradas++;
      if (temOverlay && !declara) errados.push(`${arq} tem overlay e não declara usaProgresso`);
      if (declara && !temOverlay) errados.push(`${arq} declara usaProgresso e não tem overlay nenhum`);
    }
    if (errados.length) erro('progresso', errados.join(' | '));
    else if (!declaradas) erro('progresso', 'nenhuma página declara usaProgresso, então o interruptor não aparece em lugar nenhum');
    else passou(`progresso: ${declaradas} de ${arquivos.length} páginas declaram o interruptor, e são exatamente as que têm o que revelar`);
  }
}

// ------------------ a home não pode prometer filtro que a página não tem (F7)
//
// A home anunciava "filtro por aptidão de trabalho, elemento e nível" e a
// /pals nunca teve elemento nem nível: tem busca por texto, aptidão, fase e a
// caixa de curadoria. Trocar a frase e sair resolveria hoje e voltaria a
// divergir no mês que vem, que é como ela chegou aqui.
//
// A checagem lê os controles que a página REALMENTE tem, direto do .astro, e
// cobra a promessa contra eles. Falta de insumo reprova: sem achar a string ou
// sem achar controle nenhum, ela não conferiu nada.
{
  const interfaceJson = await lerJson('src/data/interface.json');
  const promessa = interfaceJson?.home_bloco_pals;
  const fonteDaPagina = await ler('src/pages/pals.astro');

  // Cada filtro que a home pode prometer, e o id do controle que o sustenta.
  // Acrescentar filtro na página é acrescentar linha aqui, de propósito: é o
  // que faz a promessa e a página andarem juntas.
  const FILTROS = [
    { id: 'txt', pt: /busca por nome|filtro por nome/i, en: /search by name|filter by name/i },
    { id: 'apt', pt: /aptid[ãa]o/i, en: /work suitabilit/i },
    { id: 'fase', pt: /fase/i, en: /game stage|\bstage\b/i },
    { id: 'curadoria', pt: /curadoria/i, en: /curated/i },
  ];
  // O que a página NÃO tem e a home já prometeu. Sem esta lista a checagem só
  // saberia cobrar o que alguém lembrou de cadastrar acima.
  const NAO_EXISTEM = [
    { nome: 'elemento', pt: /elemento/i, en: /\belement\b/i },
    { nome: 'nível', pt: /n[íi]vel/i, en: /\blevel\b/i },
  ];

  if (!promessa?.pt || !promessa?.en) {
    erro('promessa', 'interface.json não tem home_bloco_pals nos dois idiomas, e é ela que a home publica sobre o banco de Pals');
  } else if (!fonteDaPagina) {
    erro('promessa', 'não consegui ler src/pages/pals.astro para saber que filtros a página tem');
  } else {
    const temControle = (id) => new RegExp(`id="${id}"`).test(fonteDaPagina);
    const existentes = FILTROS.filter((f) => temControle(f.id));
    if (!existentes.length) {
      erro('promessa', 'não achei controle nenhum em pals.astro. Ou a página mudou de forma, ou esta checagem virou decoração');
    }
    const mentiras = [];
    for (const idioma of ['pt', 'en']) {
      for (const f of FILTROS) {
        if (f[idioma].test(promessa[idioma]) && !temControle(f.id)) {
          mentiras.push(`${idioma}: promete "${f.id}" e a página não tem o controle`);
        }
      }
      for (const n of NAO_EXISTEM) {
        if (n[idioma].test(promessa[idioma])) {
          mentiras.push(`${idioma}: promete filtro por ${n.nome}, que /pals não tem`);
        }
      }
    }
    if (mentiras.length) {
      erro('promessa', `a home promete o que /pals não entrega -> ${mentiras.join(' | ')}`);
    } else {
      const anunciados = FILTROS.filter((f) => f.pt.test(promessa.pt) || f.en.test(promessa.en));
      passou(`promessa da home: os ${anunciados.length} filtros anunciados (${anunciados.map((f) => f.id).join(', ')}) existem entre os ${existentes.length} controles de /pals, nos dois idiomas`);
    }
  }
}

// ------------------------- as três contagens de Pal têm que fechar entre si (F6)
//
// O site publicava 287 na home, 299 em /pals e 287 no painel, sem nada ligando
// um número ao outro. A diferença não era estética: as onze entidades da
// colaboração com Terraria não têm número de Palpédia, todas carregam o MESMO
// CombiRank 3100, e mesmo assim entravam na calculadora como pai válido,
// devolvendo receita que o jogo não tem.
//
// A checagem falha por falta de insumo: sem `pals_no_paldeck` em versao.json
// ela não tem contra o que comparar, e aprovar sem conferir é o modo de errar
// mais caro deste repositório.
if (!versao || typeof versao.pals_no_paldeck !== 'number') {
  erro('palpedia', 'versao.json não declara pals_no_paldeck. Sem esse número não há com o que comparar o catálogo, e a checagem não pode se aprovar sozinha');
} else if (catalogo) {
  const oficial = versao.pals_no_paldeck;
  const numerados = catalogo.pals.filter(naPalpedia);
  const semNumero = catalogo.pals.filter((p) => !naPalpedia(p));

  // O recorte que sustenta o número tem que existir. Fonte citada e não
  // gravada deixa de existir, e foi a F3 inteira que ensinou isso.
  if (!versao.pals_no_paldeck_fonte || !existsSync(join(raiz, versao.pals_no_paldeck_fonte))) {
    erro('palpedia', `pals_no_paldeck diz ${oficial} e aponta para "${versao.pals_no_paldeck_fonte || 'lugar nenhum'}", que não está no repositório`);
  }

  // O save de cada pessoa lê o total na tela da Palpédia do jogo. Se ele
  // discordar do número da wiki, um dos dois envelheceu num patch.
  for (const arq of await readdir(join(raiz, 'src/data/saves'))) {
    const save = await lerJson(`src/data/saves/${arq}`);
    const total = save?.paldeck?.total;
    if (typeof total === 'number' && total !== oficial) {
      erro('palpedia', `${arq} diz ${total} Pals na Palpédia e versao.json diz ${oficial}. Um dos dois envelheceu`);
    }
  }

  // Nenhuma entidade fora da Palpédia pode chegar à calculadora, nem como pai
  // nem como filhote. Provado pela MESMA função que a página usa, e não por
  // uma cópia da regra que pode divergir dela.
  const paraConta = {
    pals: catalogo.pals.map((p) => ({
      chave: p.chave, en: p.en, pt: p.pt, numero: p.numero, combi: p.combi,
      ...(p.so_combinacao_unica ? { so_combinacao_unica: true } : {}),
    })),
    cruzamentos_unicos: catalogo.cruzamentos_unicos || [],
  };
  const vazando = [
    ...cruzaveis(paraConta).filter((p) => !naPalpedia(p)),
    ...sorteaveis(paraConta).filter((p) => !naPalpedia(p)),
  ];
  if (vazando.length) {
    erro('palpedia', `${vazando.length} entidade(s) sem número de Palpédia ainda entram na varredura por média de rank, por exemplo ${vazando[0].en}`);
  }

  // Duas metades, e a segunda é a que impede a correção de virar mutilação.
  //
  // Primeira: par que mistura uma delas com Pal de verdade não devolve
  // filhote, e devolve o MOTIVO. Segunda: as 57 combinações únicas entre elas
  // continuam respondendo, porque são receita do jogo. Cortar as onze da tela
  // teria matado as 57 junto e o portão não teria dito nada.
  const cobaia = semNumero[0];
  const parceiro = numerados[0];
  if (cobaia && parceiro) {
    const r = filhoteDoPar(paraConta, cobaia.chave, parceiro.chave);
    if (r?.filho || !r?.foraDaPalpedia) {
      erro('palpedia', `${cobaia.en} com ${parceiro.en} devolve ${r?.filho?.en || 'nada, e sem dizer por quê'}, e ${cobaia.en} não está na Palpédia`);
    }
  }
  const chavesSemNumero = new Set(semNumero.map((p) => p.chave));
  const unicasEntreElas = (catalogo.cruzamentos_unicos || [])
    .filter((u) => u.length === 3 && chavesSemNumero.has(u[0]) && chavesSemNumero.has(u[1]));
  const unicasQuebradas = unicasEntreElas
    .filter((u) => filhoteDoPar(paraConta, u[0], u[1])?.filho?.chave !== u[2]);
  if (unicasEntreElas.length === 0) {
    erro('palpedia', 'nenhuma combinação única entre as entidades fora da Palpédia. Ou o catálogo perdeu linha, ou esta checagem deixou de conferir alguma coisa');
  } else if (unicasQuebradas.length) {
    erro('palpedia', `${unicasQuebradas.length} de ${unicasEntreElas.length} combinações únicas entre as entidades fora da Palpédia pararam de responder, por exemplo ${unicasQuebradas[0].join(' + ')}`);
  }

  // Sobra do catálogo contra o número oficial. Hoje é 1, e enquanto ela
  // existir tem que estar REGISTRADA em fontes.md, não arredondada em
  // silêncio. É a mesma regra que a F3 aplicou às URLs sem recorte.
  const sobra = numerados.length - oficial;
  const registrada = /Palp[ée]dia[^|]*\|[^|]*\b288\b/.test(corpos['fontes.md'] || '')
    || /\b288\b[^|]*Palp[ée]dia/.test(corpos['fontes.md'] || '');
  if (sobra !== 0 && !registrada) {
    erro('palpedia', `o catálogo traz ${numerados.length} entidades com número de Palpédia e o jogo declara ${oficial}, sobra ${sobra}, e a divergência não está registrada em fontes.md`);
  } else {
    passou(`Palpédia: ${catalogo.pals.length} no catálogo = ${numerados.length} numerados + ${semNumero.length} fora da Palpédia, contra ${oficial} do jogo${sobra ? ` (sobra ${sobra}, registrada em fontes.md)` : ''}. Nenhum dos ${semNumero.length} entra na média de rank, e as ${unicasEntreElas.length} combinações únicas entre eles continuam respondendo`);
  }
}

// ------------------------------ poder de captura x referência congelada (E5)
// A tabela de /calculadoras/ publica número importado do paldb, e importação
// muda sozinha: basta o paldb rebalancear ou mudar o markup. Este é o gatilho
// que acusa a mudança em vez de deixá-la subir para o site em silêncio.
//
// A referência é src/data/poder-captura.json, congelada em 01.08 depois da
// conferência. NÃO é mais a palworld.wiki.gg: aquela comparação foi trocada
// porque a wiki.gg é anterior ao 1.0 (o porquê está em fontes.md), então ela
// acusaria para sempre sete diferenças já conhecidas e decididas. Gatilho que
// falha por motivo resolvido é gatilho que alguém desliga.
const referencia = await lerJson('src/data/poder-captura.json');
const itensParaEsferas = await lerJson('src/data/itens.json');
if (referencia && itensParaEsferas) {
  const congelado = referencia.esferas || {};
  const importado = new Map(
    (itensParaEsferas.itens || [])
      .filter((i) => i.atributos && i.atributos.capture_power !== undefined)
      .map((i) => [i.chave, i]),
  );

  const nomeDe = (chave) => importado.get(chave)?.pt || importado.get(chave)?.en || chave;
  let mudou = 0;

  for (const [chave, esperado] of Object.entries(congelado)) {
    const item = importado.get(chave);
    if (!item) {
      mudou++;
      erro('captura', `${chave} sumiu da importação e está na referência com poder ${esperado.poder}. A tabela do site perderia uma linha sem ninguém ver`);
      continue;
    }
    const poder = item.atributos.capture_power;
    if (poder !== esperado.poder) {
      mudou++;
      const delta = poder - esperado.poder;
      erro('captura', `${nomeDe(chave)}: poder de captura ${poder} na importação e ${esperado.poder} na referência (${delta > 0 ? '+' : ''}${delta}). Confira no jogo, registre em fontes.md e só então atualize src/data/poder-captura.json`);
    }
    const tecnologia = item.atributos.technology ?? null;
    if (tecnologia !== esperado.tecnologia) {
      mudou++;
      erro('captura', `${nomeDe(chave)}: nível de tecnologia ${tecnologia === null ? 'ausente' : tecnologia} na importação e ${esperado.tecnologia === null ? 'ausente' : esperado.tecnologia} na referência. É esse campo que separa a esfera da progressão da que não é, então a tabela do site muda de forma com ele`);
    }
  }

  // Esfera nova é notícia, não ruído: o dia em que o jogo acrescentar uma, a
  // tabela do site ganha linha sozinha. Quebrar aqui obriga alguém a conferir
  // o número antes de ele virar conteúdo publicado.
  for (const chave of importado.keys()) {
    if (!(chave in congelado)) {
      mudou++;
      erro('captura', `${nomeDe(chave)} tem poder de captura ${importado.get(chave).atributos.capture_power} e não existe em src/data/poder-captura.json. Esfera nova entraria direto na tabela do site sem conferência`);
    }
  }

  if (!mudou) {
    passou(`poder de captura: ${importado.size} esferas importadas batem com a referência congelada em ${referencia.congelado_em}`);
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
