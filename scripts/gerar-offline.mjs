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
const rotas = [];
for (const nome of await readdir(dist, { withFileTypes: true })) {
  if (!nome.isDirectory() || ['_astro', 'pagefind'].includes(nome.name)) continue;
  if (existsSync(join(dist, nome.name, 'index.html'))) rotas.push(nome.name);
  for (const filho of await readdir(join(dist, nome.name), { withFileTypes: true })) {
    if (!filho.isDirectory()) continue;
    if (existsSync(join(dist, nome.name, filho.name, 'index.html'))) {
      rotas.push(`${nome.name}/${filho.name}`);
    }
  }
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

let css = '';
for (const m of casca.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/[^"]+)"[^>]*>/g)) {
  const p = join(dist, m[1]);
  if (existsSync(p)) css += await readFile(p, 'utf-8') + '\n';
}
// as páginas de mapa e banco de Pals trazem CSS próprio
for (const extra of ['mapa', 'pals']) {
  const p = join(dist, extra, 'index.html');
  if (!existsSync(p)) continue;
  const h = await readFile(p, 'utf-8');
  for (const m of h.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/[^"]+)"[^>]*>/g)) {
    const f = join(dist, m[1]);
    if (existsSync(f)) { const c = await readFile(f, 'utf-8'); if (!css.includes(c)) css += c + '\n'; }
  }
}

let js = '';
for (const m of casca.matchAll(/<script[^>]*src="(\/[^"]+)"[^>]*><\/script>/g)) {
  const p = join(dist, m[1]);
  if (existsSync(p) && !m[1].startsWith('/pagefind')) js += await readFile(p, 'utf-8') + '\n;\n';
}

// pegar() devolve só o miolo da tag, então o <nav> precisa ser recolocado à mão.
// Sem ele o seletor .lateral não existe e o menu inteiro fica sem estilo e sem JS.
const lateral = pegar(casca, 'nav', 'class="lateral"') ?? '';
// links absolutos viram âncora interna
const menu = `<nav class="lateral">${lateral
  .replace(/href="\/([^"]*)"/g, (_, r) => `href="#${r.replace(/\/$/, '')}"`)
  .replace(/href="#"/g, 'href="#inicio"')
  // a casca foi copiada de uma página específica e trouxe o destaque dela colado.
  // Num arquivo com todas as páginas, quem marca o item ativo é o JS.
  .replace(/\s(?:aria-current|data-ativo)="[^"]*"/g, '')}</nav>`;

// ------------------------------------------------ monta
const secoes = paginas
  .map((p) => `<article class="pagina" id="pg-${p.rota || 'inicio'}" hidden>${p.corpo}</article>`)
  .join('\n');

const indice = JSON.stringify(
  paginas.map((p) => ({
    id: p.rota || 'inicio',
    titulo: p.titulo,
    texto: p.corpo.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 20000).toLowerCase(),
  }))
);

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
  <p class="aviso-offline">Versão offline: um arquivo só, sem internet, sem servidor. O mapa interativo e o assistente ficam de fora porque dependem de rede.</p>
${secoes}
</main>
</div>
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

await writeFile(saida, doc);
console.log(`  ${paginas.length} páginas empacotadas em ${saida}`);
console.log(`  ${(doc.length / 1024).toFixed(0)} KB, abre com duplo clique`);
