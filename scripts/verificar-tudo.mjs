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

// ------------------------------- dado das calculadoras x texto dos guias (E5)
// receitas.json existe para a calculadora não refazer uma conta que o guia já
// publica. Duas cópias do mesmo número divergem no primeiro patch, e aí o site
// passa a dizer duas coisas: é o defeito que este verificador existe para pegar.
const receitas = await lerJson('src/data/receitas.json');
if (receitas) {
  const textoEconomia = corpos['economia.md'] || '';
  const linhaReceita = textoEconomia.match(/Receita do Cake b[áa]sico:([^\n]+)/)?.[1] || '';
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
