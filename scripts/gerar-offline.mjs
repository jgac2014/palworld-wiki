/**
 * Empacota a wiki inteira num único arquivo HTML que funciona sem servidor.
 *
 *   npm run build && npm run offline
 *
 * Por que isso existe: o site publicado usa links absolutos (/breeding/, /mapa/).
 * Isso é o certo num servidor e é o errado num arquivo solto: aberto com duplo
 * clique, o navegador procura essas rotas na raiz do disco e o menu inteiro morre.
 * Foi exatamente o que aconteceu quando mandamos uma página avulsa pelo chat.
 *
 * Aqui a saída é um arquivo só, com todas as páginas embutidas e a navegação
 * trocada por âncora interna. Dá para mandar no WhatsApp, abrir sem internet e
 * navegar normalmente. O CSS e o JS vão inline; a busca do Pagefind fica de fora
 * porque depende de índice servido por HTTP, e no lugar dela entra um filtro que
 * roda em memória.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');
const saida = process.argv[2] || join(raiz, 'wiki-palworld-offline.html');

if (!existsSync(dist)) {
  console.error('  dist/ não existe. Rode "npm run build" antes.');
  process.exit(1);
}

// ------------------------------------------------ coleta as páginas do dist
//
// A varredura desce um nível porque nem toda página mora na raiz do dist. As
// 299 fichas de Pal ficam em /pal/<nome>/, e enquanto isto olhava só o primeiro
// nível elas sumiam do pacote sem aviso: o contador de páginas esperadas era
// calculado a partir da mesma lista incompleta, então nunca acusava falta.
const encontradas = [];
for (const nome of await readdir(dist, { withFileTypes: true })) {
  if (!nome.isDirectory() || ['_astro', 'pagefind'].includes(nome.name)) continue;
  if (existsSync(join(dist, nome.name, 'index.html'))) encontradas.push(nome.name);
  for (const filho of await readdir(join(dist, nome.name), { withFileTypes: true })) {
    if (!filho.isDirectory()) continue;
    if (existsSync(join(dist, nome.name, filho.name, 'index.html'))) {
      encontradas.push(`${nome.name}/${filho.name}`);
    }
  }
}

/**
 * O que fica DE FORA do pacote, de propósito, com o motivo medido junto.
 *
 * As 1.875 fichas de item da E9 somam 3927,2 KB de HTML mais 638,8 KB de texto
 * de índice. Medido em 03.08.2026: elas acrescentam 4860,9 KB ao arquivo, que
 * foi de 3997,9 KB para 8858,8 KB. Com o pacote hoje em 8339,7 KB, devolvê-las
 * o levaria a cerca de 13.200 KB, acima do alarme de 12.288 KB, e o script
 * abortaria de novo.
 *
 * O que sai é a FICHA, não o item. O índice de /itens continua no pacote com os
 * 1.875 nomes nos dois idiomas, que é o que resolve a consulta sem internet:
 * saber como a coisa se chama na sua tela. A receita fica para quem tem rede.
 *
 * Corte tem que ser dito, e é por isso que o número entra no cabeçalho do
 * próprio arquivo e não só neste log: quem recebe o HTML pelo grupo não lê o
 * log de ninguém. É a regra do CLAUDE.md contra corte silencioso.
 */
const FORA_DO_PACOTE = [
  {
    prefixo: 'item/',
    o_que: 'as fichas de item',
    porque: 'elas somam mais de 4,5 MB e levariam este arquivo a quase 13 MB',
    ainda_tem: 'o índice com os 1.875 nomes continua aqui, em Itens',
  },
];

const rotas = encontradas.filter((r) => !FORA_DO_PACOTE.some((f) => r.startsWith(f.prefixo)));
const deixadasDeFora = FORA_DO_PACOTE.map((f) => ({
  ...f,
  quantas: encontradas.filter((r) => r.startsWith(f.prefixo)).length,
}));

// Exclusão que não casa com nada é declaração velha, e velha ela vira mentira
// no cabeçalho: o arquivo passaria a dizer que 0 fichas ficaram de fora e o
// pacote passaria a carregar todas de volta, estourando o teto por um motivo
// que ninguém ligaria a esta lista. Falta de insumo FALHA, não passa batido.
const orfas = deixadasDeFora.filter((f) => f.quantas === 0);
if (orfas.length) {
  console.error(`  ABORTADO: a exclusão de ${orfas.map((f) => f.prefixo).join(', ')} não casa com rota nenhuma do dist.`);
  console.error('  Ou a rota foi renomeada, ou ela deixou de existir. Atualize FORA_DO_PACOTE em vez de deixar a declaração mentir.');
  process.exit(1);
}

const homeHtml = await readFile(join(dist, 'index.html'), 'utf-8');

const pegar = (html, tag, attr = '') => {
  const abre = new RegExp(`<${tag}${attr ? `[^>]*${attr}[^>]*` : '[^>]*'}>`);
  const i = html.search(abre);
  if (i === -1) return null;
  const inicio = html.indexOf('>', i) + 1;
  // casamento de tag por contagem, o conteúdo tem <article> aninhado? não tem,
  // mas <div> tem, então contamos só a tag pedida
  let nivel = 1, pos = inicio;
  const re = new RegExp(`</?${tag}\\b`, 'g');
  re.lastIndex = inicio;
  let m;
  while ((m = re.exec(html))) {
    nivel += m[0][1] === '/' ? -1 : 1;
    if (nivel === 0) { pos = m.index; break; }
  }
  return html.slice(inicio, pos);
};

/** Como pegar(), mas devolve o elemento inteiro, com a tag de abertura. */
const pegarInteiro = (html, tag, attr) => {
  const i = html.search(new RegExp(`<${tag}[^>]*${attr}[^>]*>`));
  if (i === -1) return null;
  const re = new RegExp(`</?${tag}\\b`, 'g');
  re.lastIndex = html.indexOf('>', i) + 1;
  let nivel = 1, m;
  while ((m = re.exec(html))) {
    nivel += m[0][1] === '/' ? -1 : 1;
    if (nivel === 0) return html.slice(i, html.indexOf('>', m.index) + 1);
  }
  return null;
};

const paginas = [];
for (const rota of rotas) {
  const html = await readFile(join(dist, rota, 'index.html'), 'utf-8');
  const corpo = pegar(html, 'article', 'data-pagefind-body') ?? pegar(html, 'main');
  const titulo = html.match(/<title>([^<·]+)/)?.[1]?.trim() ?? rota;
  if (corpo) paginas.push({ rota, titulo, corpo });
}
const corpoHome = pegar(homeHtml, 'main');
if (corpoHome) paginas.unshift({ rota: '', titulo: 'Início', corpo: corpoHome });

// Página que não casou <article> nem <main> sumiria do arquivo sem aviso, e o
// leitor só perceberia sentindo falta dela. Truncamento silencioso é pior que
// erro barulhento: aborta listando o que ficou de fora.
const esperadas = rotas.length + (corpoHome ? 1 : 0);
if (paginas.length !== esperadas) {
  const incluidas = new Set(paginas.map((p) => p.rota));
  const perdidas = rotas.filter((r) => !incluidas.has(r));
  console.error(`  ABORTADO: ${esperadas} páginas esperadas, ${paginas.length} extraídas.`);
  console.error(`  Ficaram de fora: ${perdidas.join(', ') || 'a home'}`);
  process.exit(1);
}

// ------------------------------------------------ casca, css e js
const casca = await readFile(join(dist, 'meu-save', 'index.html'), 'utf-8');

/**
 * O prefixo em que o site foi construído.
 *
 * No GitHub Pages ele mora numa subpasta, e o build escreve /palworld-wiki/ na
 * frente de todo caminho absoluto. Como o `dist` continua sendo a raiz no
 * disco, ignorar o prefixo faz o CSS e o JS não serem achados: o pacote sai
 * 210 KB mais leve, sem estilo e sem script, e nada avisa. O único sintoma é
 * um arquivo que abre feio e não abre ficha nenhuma.
 */
const PREFIXO = casca.match(/href="(\/[^"]*)\/favicon\.svg"/)?.[1] ?? '';
const semPrefixo = (url) =>
  PREFIXO && (url === PREFIXO || url.startsWith(`${PREFIXO}/`)) ? url.slice(PREFIXO.length) || '/' : url;
/** Endereço absoluto do site para caminho no disco. */
const noDisco = (url) => join(dist, semPrefixo(url));

let css = '';
for (const m of casca.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/[^"]+)"[^>]*>/g)) {
  const p = noDisco(m[1]);
  if (existsSync(p)) css += await readFile(p, 'utf-8') + '\n';
}
// as páginas de mapa e banco de Pals trazem CSS próprio
for (const extra of ['mapa', 'pals']) {
  const p = join(dist, extra, 'index.html');
  if (!existsSync(p)) continue;
  const h = await readFile(p, 'utf-8');
  for (const m of h.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/[^"]+)"[^>]*>/g)) {
    const f = noDisco(m[1]);
    if (existsSync(f)) { const c = await readFile(f, 'utf-8'); if (!css.includes(c)) css += c + '\n'; }
  }
}

// Cada pacote entra dentro do próprio invólucro. No site eles são módulos, que
// têm escopo separado por definição; aqui viram um <script> clássico só, e dois
// módulos minificados colados no mesmo escopo colidem no primeiro nome curto
// repetido. Foi exatamente isso ("Identifier 'z' has already been declared") que
// derrubou o pacote quando o segundo módulo apareceu.
let js = '';
for (const m of casca.matchAll(/<script[^>]*src="(\/[^"]+)"[^>]*><\/script>/g)) {
  const p = noDisco(m[1]);
  if (existsSync(p) && !semPrefixo(m[1]).startsWith('/pagefind')) {
    js += `;(function(){\n${await readFile(p, 'utf-8')}\n})();\n`;
  }
}

// A ficha em popover mora fora do <main>, no fim do body, então não vem no
// corpo de nenhuma página. Sem trazê-la à mão, o pacote fica com os nomes de Pal
// marcados e sublinhados e nada abrindo: o script procura #ficha-pal, não acha e
// desiste em silêncio.
const popover = pegarInteiro(casca, 'div', 'id="ficha-pal"') ?? '';

// pegar() devolve só o miolo da tag, então o <nav> precisa ser recolocado à mão.
// Sem ele o seletor .lateral não existe e o menu inteiro fica sem estilo e sem JS.
const lateral = pegar(casca, 'nav', 'class="lateral"') ?? '';
// Links absolutos viram âncora interna, e o prefixo de publicação some junto:
// construído para o GitHub Pages, todo link vem como /palworld-wiki/breeding/,
// e a seção dentro do arquivo se chama pg-breeding. Sem descontar o prefixo, o
// menu inteiro aponta para âncora que não existe e nenhuma página abre.
const menu = `<nav class="lateral">${lateral
  .replace(/href="(\/[^"]*)"/g, (_, u) => {
    const rota = semPrefixo(u).replace(/^\//, '').replace(/\/$/, '');
    return `href="#${rota || 'inicio'}"`;
  })
  .replace(/href="#"/g, 'href="#inicio"')
  // a casca foi copiada de uma página específica e trouxe o destaque dela colado.
  // Num arquivo com todas as páginas, quem marca o item ativo é o JS.
  .replace(/\s(?:aria-current|data-ativo)="[^"]*"/g, '')}</nav>`;

// ------------------------------------------------ monta
const secoes = paginas
  .map((p) => `<article class="pagina" id="pg-${p.rota || 'inicio'}" hidden>${p.corpo}</article>`)
  .join('\n');

const entradas = paginas.map((p) => ({
  id: p.rota || 'inicio',
  titulo: p.titulo,
  texto: p.corpo.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 20000).toLowerCase(),
}));
const indice = JSON.stringify(entradas);

const doc = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Wiki Palworld 1.0 · versão offline</title>
<style>${css}</style>
<style>
  .pagina[hidden] { display: none; }
  .busca-offline { width: 100%; padding: 10px 12px; margin-bottom: 22px;
    background: var(--fundo-2, #14171a); color: inherit;
    border: 1px solid var(--linha, #2a2f35); border-radius: 6px; font: inherit; }
  .resultados { list-style: none; padding: 0; margin: 0 0 22px; }
  .resultados li { padding: 8px 0; border-bottom: 1px solid var(--linha, #2a2f35); }
  .resultados a { font-weight: 600; }
  .aviso-offline { font-size: 13px; opacity: .65; margin: 0 0 18px; }
  .lateral a.ativo { font-weight: 700; }
</style>
</head>
<body>
<div class="casca">
${menu}
<main class="conteudo">
  <input class="busca-offline" id="busca" type="search" placeholder="Buscar em toda a wiki, por exemplo: bolo, quartzo, Anubis" autocomplete="off">
  <ul class="resultados" id="resultados"></ul>
  <p class="aviso-offline">Versão offline: um arquivo só, sem internet, sem servidor. O mapa interativo e o assistente ficam de fora porque dependem de rede.${
    deixadasDeFora
      .map((f) => ` Também ficaram de fora ${f.quantas} páginas, ${f.o_que}, porque ${f.porque}: ${f.ainda_tem}.`)
      .join('')
  }</p>
${secoes}
</main>
</div>
${popover}
<script>${js}</script>
<script>
(function () {
  var INDICE = ${indice};
  var paginas = document.querySelectorAll('.pagina');
  var links = document.querySelectorAll('.lateral a');

  function mostrar(id) {
    var achou = false;
    paginas.forEach(function (p) {
      var e = p.id === 'pg-' + id;
      p.hidden = !e;
      if (e) achou = true;
    });
    if (!achou) { var pri = document.querySelector('.pagina'); if (pri) pri.hidden = false; }
    links.forEach(function (a) {
      a.classList.toggle('ativo', a.getAttribute('href') === '#' + id);
    });
    window.scrollTo(0, 0);
  }

  function daHash() { return (location.hash || '#inicio').slice(1) || 'inicio'; }
  window.addEventListener('hashchange', function () { mostrar(daHash()); });
  mostrar(daHash());

  var campo = document.getElementById('busca');
  var lista = document.getElementById('resultados');
  campo.addEventListener('input', function () {
    var q = campo.value.trim().toLowerCase();
    lista.innerHTML = '';
    if (q.length < 2) return;
    INDICE.forEach(function (p) {
      var i = p.texto.indexOf(q);
      if (i === -1) return;
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + p.id;
      a.textContent = p.titulo;
      var t = document.createElement('div');
      t.style.fontSize = '13px';
      t.style.opacity = '.7';
      t.textContent = '…' + p.texto.slice(Math.max(0, i - 60), i + 90) + '…';
      li.appendChild(a); li.appendChild(t); lista.appendChild(li);
    });
    if (!lista.children.length) lista.innerHTML = '<li>Nada encontrado.</li>';
  });
})();
</script>
</body>
</html>`;

// ------------------------------------------------ composição e alarme
//
// 12 MB, e o que esse número significa mudou em 04.08.2026.
//
// Ele NÃO é mais critério de desempenho. A medição de carga que sustentava os
// 8 MB não é reproduzível: o mesmo arquivo de 8,3 MB mediu 2,2s em 31.07 e
// 12,0s em 04.08, e o tempo não cresce com o tamanho, oscila. Quem decide o que
// entra no pacote é o conteúdo, não este número.
//
// O que se mede de forma estável é nó de DOM (100 mil em 8,3 MB, 200 mil em
// 16 MB) e heap, que fica em 10 MB independente do tamanho porque o conteúdo é
// HTML estático. Por isso a contagem de nós é impressa junto do tamanho: é a
// medida que não oscila entre rodadas, e é ela que denuncia duplicação.
//
// Este limite existe como ALARME DE CRESCIMENTO INESPERADO, não como barra de
// qualidade. Ele nunca pegou lentidão; pegaria importação duplicada. Para
// mudá-lo de novo não é preciso medir carga, é preciso saber o que cresceu.
//
// A composição por seção é impressa SEMPRE, e não só quando estoura. O total
// sozinho esconde duplicação: uma seção que aparecesse duas vezes no pacote
// somaria alguns KB no fim da linha e ninguém veria. Separada por seção, ela
// aparece com o dobro de páginas no log do portão.
const ALARME_BYTES = 12582912;

const bytes = (s) => Buffer.byteLength(s, 'utf-8');
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

/**
 * Quantos elementos o navegador vai criar a partir deste arquivo.
 *
 * Contados fora do <script> e do <style>, senão o bundle minificado e o índice
 * de busca entrariam na conta com qualquer "<" que tivessem dentro, e o número
 * deixaria de ser sobre o DOM. Comentário de HTML também sai: ele é nó, mas não
 * é elemento, e não aparece em querySelectorAll('*').
 *
 * Isto é contagem de marcação, não parsing de verdade, então ela vale o que o
 * navegador confirmar. Conferida em 05.08 contra o Chromium abrindo o próprio
 * pacote: os dois deram o mesmo número. A asserção que mantém os dois casados
 * mora em `testar-navegador.mjs` e reprova o portão se eles divergirem, porque
 * número impresso que ninguém confere volta a ser decoração no dia seguinte.
 */
const contarNos = (html) =>
  (html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '<$1></$1>')
    .match(/<[a-zA-Z][^\s/>]*/g) ?? []).length;

// A contagem vai também para dentro do arquivo, no <html>, que é como o teste
// de navegador compara o que foi contado aqui com o que o Chromium enxerga.
// Atributo não cria elemento, então gravar o número ali não muda o número.
const nos = contarNos(doc);
const documento = doc.replace('<html lang="pt-BR">', `<html lang="pt-BR" data-nos="${nos}">`);
if (documento === doc) {
  console.error('  ABORTADO: não achei a tag <html> para gravar a contagem de nós dentro do arquivo.');
  console.error('  Sem ela o teste de navegador fica sem com o que comparar, e a contagem impressa vira decoração.');
  process.exit(1);
}
await writeFile(saida, documento);

const secoesMedidas = new Map();
paginas.forEach((p, i) => {
  const nome = p.rota === '' ? 'início' : p.rota.split('/')[0];
  const atual = secoesMedidas.get(nome) ?? { paginas: 0, html: 0, indice: 0 };
  atual.paginas += 1;
  atual.html += bytes(p.corpo);
  atual.indice += bytes(entradas[i].texto);
  secoesMedidas.set(nome, atual);
});

const totalBytes = bytes(documento);
const totalConteudo = [...secoesMedidas.values()].reduce((s, v) => s + v.html + v.indice, 0);

console.log(`  ${paginas.length} páginas empacotadas em ${saida}`);
for (const f of deixadasDeFora) {
  console.log(`  ${f.quantas} páginas fora do pacote de propósito (${f.o_que}): ${f.porque}`);
}
console.log('  composição por seção (HTML embutido + texto do índice de busca):');
for (const [nome, v] of [...secoesMedidas].sort((a, b) => b[1].html + b[1].indice - a[1].html - a[1].indice)) {
  const rotulo = `${v.paginas} ${v.paginas === 1 ? 'página' : 'páginas'}`;
  console.log(
    `    ${nome.padEnd(14)} ${rotulo.padStart(12)}   ${kb(v.html).padStart(10)} HTML   ${kb(v.indice).padStart(10)} índice`
  );
}
console.log(`    ${'moldura'.padEnd(14)} ${'CSS e JS'.padStart(12)}   ${kb(totalBytes - totalConteudo).padStart(10)} restante`);
console.log(
  `  ${kb(totalBytes)} e ${nos.toLocaleString('pt-BR')} nós de DOM, contra o alarme de ${kb(ALARME_BYTES)} (${((totalBytes / ALARME_BYTES) * 100).toFixed(0)}%). Abre com duplo clique`
);

if (totalBytes > ALARME_BYTES) {
  console.error(
    `  ABORTADO: o pacote cresceu além do esperado. Tem ${totalBytes} bytes (${kb(totalBytes)}) e ${nos.toLocaleString('pt-BR')} nós de DOM, contra os ${ALARME_BYTES} bytes (${kb(ALARME_BYTES)}) que este script espera.`
  );
  console.error(
    '  Isto NÃO quer dizer que o arquivo ficou grande demais: o tamanho não é critério de desempenho aqui, e a decisão de 04.08 no PRD.md explica por quê.'
  );
  console.error(
    '  Quer dizer que ele cresceu sem que ninguém previsse, e a causa disso costuma ser importação duplicada, não conteúdo novo legítimo.'
  );
  console.error(
    `  Antes de subir o número, procure na composição acima a seção que dobrou de páginas ou de bytes. Passou ${totalBytes - ALARME_BYTES} bytes (${kb(totalBytes - ALARME_BYTES)}).`
  );
  process.exit(1);
}
