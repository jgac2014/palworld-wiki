/**
 * Testes de fumaça no navegador. Roda depois do build.
 *
 *   npm run testar
 *
 * Por que isto existe: metade dos defeitos deste projeto nunca apareceu em log,
 * só em imagem ou em clique. O painel do assistente nascia aberto tapando o
 * texto. O menu destacava duas páginas ao mesmo tempo. Termo acentuado não
 * alternava de idioma. Nenhum desses quebrava o build.
 *
 * Cada teste aqui existe porque a coisa que ele checa JÁ QUEBROU uma vez. Se um
 * falhar, não é regra nova sendo inventada: é regressão de algo consertado.
 *
 * Sai com código 1 se algo falhar, para servir de portão em CI e em loop de
 * agente. É o que permite trabalhar sem alguém olhando cada tela.
 */
import { chromium } from 'playwright';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(raiz, 'dist');
const offline = join(raiz, 'wiki-palworld-offline.html');

const falhas = [];
const passes = [];
const ok = (msg) => passes.push(msg);
const falha = (msg) => falhas.push(msg);

function conferir(condicao, msg, detalhe = '') {
  if (condicao) ok(msg);
  else falha(`${msg}${detalhe ? ` (${detalhe})` : ''}`);
}

if (!existsSync(dist)) {
  console.error('  dist/ não existe. Rode "npm run build" antes.');
  process.exit(1);
}

/**
 * Onde está o Chromium.
 *
 * Este script roda em três lugares com respostas diferentes: no sandbox do
 * Cowork o navegador vem pré-instalado num caminho fixo, no Windows de quem
 * desenvolve ele fica no diretório do Playwright, e no runner do GitHub o
 * próprio Playwright resolve. Em vez de escolher um e quebrar nos outros, o
 * caminho fixo só é usado se o arquivo existir de verdade.
 */
function ondeEstaOChromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const doSandbox = '/opt/pw-browsers/chromium';
  if (existsSync(doSandbox)) return doSandbox;
  return undefined; // deixa o Playwright achar sozinho
}

/**
 * Servidor estático só para o teste.
 *
 * Testar o site por file:// é armadilha: o CSS é referenciado por caminho
 * absoluto (/_astro/...), que em file:// aponta para a raiz do disco e não
 * carrega. A página abre sem estilo nenhum, e qualquer asserção que dependa de
 * getComputedStyle vira placebo.
 *
 * Foi exatamente o que aconteceu com o teste do painel do assistente: removendo
 * a correção e reconstruindo, ele continuava passando, porque sem CSS o
 * atributo [hidden] funciona sozinho pelo estilo padrão do navegador. O teste
 * que existia para cobrir aquele bug não cobria nada.
 *
 * O pacote offline continua sendo testado por file://, e isso está certo: ali o
 * CSS é embutido, e file:// é o modo real de uso dele.
 */
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.pf_meta': 'application/octet-stream',
};

const servidor = createServer((req, res) => {
  let caminho = decodeURIComponent(req.url.split('?')[0]);
  let arquivo = join(dist, caminho);
  try {
    if (statSync(arquivo).isDirectory()) arquivo = join(arquivo, 'index.html');
  } catch {
    res.writeHead(404).end('nao encontrado');
    return;
  }
  try {
    res.writeHead(200, { 'content-type': TIPOS[extname(arquivo)] || 'application/octet-stream' });
    res.end(readFileSync(arquivo));
  } catch {
    res.writeHead(404).end('nao encontrado');
  }
});

const base = await new Promise((resolve) => {
  servidor.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${servidor.address().port}`));
});

const navegador = await chromium.launch({ executablePath: ondeEstaOChromium() });

// ------------------------------------------------------------ site gerado
{
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  const errosJs = [];
  pagina.on('pageerror', (e) => errosJs.push(e.message));
  // Servido por HTTP o site carrega quase tudo. Sobra o Leaflet do CDN, que
  // depende de rede externa e não existe no sandbox nem no CI.
  const RUIDO = /Failed to load resource|unpkg|cdn|ERR_[A-Z_]+/i;
  pagina.on('console', (m) => { if (m.type() === 'error' && !RUIDO.test(m.text())) errosJs.push(m.text()); });

  await pagina.goto(`${base}/meu-save/`);
  await pagina.waitForTimeout(300);

  // 1. o painel do assistente nasce fechado.
  //    Quebrou porque display:flex vence o atributo [hidden] do HTML.
  const painelAberto = await pagina.evaluate(() => {
    const p = document.querySelector('#painel-chat');
    if (!p) return null;
    return getComputedStyle(p).display !== 'none';
  });
  conferir(painelAberto === false, 'assistente nasce fechado', painelAberto === null ? 'painel não existe' : 'nasceu aberto tapando o conteúdo');

  // 2. o seletor de idioma alterna, inclusive termo com acento.
  //    Quebrou porque \b de regex é ASCII e não casa antes de "Á".
  // Varre o site inteiro: cada termo aparece em página diferente, e checar só
  // uma dá falso negativo.
  const ACENTUADOS = ['Árvore Mundial', 'Águas Termais', 'Óleo cru'];
  const achados = Object.fromEntries(ACENTUADOS.map((t) => [t, 0]));
  for (const rota of (await readdir(dist, { withFileTypes: true })).filter((d) => d.isDirectory() && !['_astro', 'pagefind'].includes(d.name)).map((d) => d.name)) {
    const arq = join(dist, rota, 'index.html');
    if (!existsSync(arq)) continue;
    const html = await readFile(arq, 'utf-8');
    for (const termo of ACENTUADOS) {
      achados[termo] += (html.match(new RegExp(`data-pt="${termo}"`, 'g')) || []).length;
    }
  }
  const semMarca = ACENTUADOS.filter((t) => achados[t] === 0);

  await pagina.goto(`${base}/endgame/`);
  await pagina.waitForTimeout(200);
  const antes = await pagina.evaluate(() => document.querySelector('[data-pt="Árvore Mundial"]')?.textContent);
  await pagina.locator('.seletor button', { hasText: 'EN' }).first().click();
  await pagina.waitForTimeout(300);
  const depois = await pagina.evaluate(() => document.querySelector('[data-pt="Árvore Mundial"]')?.textContent);
  conferir(antes && depois && antes !== depois, 'termo acentuado alterna PT/EN', `"${antes}" -> "${depois}"`);
  conferir(semMarca.length === 0, 'termos acentuados são marcados no build', `sem marca em lugar nenhum: ${semMarca.join(', ')}`);

  // 3. nenhum termo marcado dentro de link ou título.
  //    Quebrou porque o plugin só olhava o pai imediato, não a cadeia toda.
  const rotas = (await readdir(dist, { withFileTypes: true }))
    .filter((d) => d.isDirectory() && !['_astro', 'pagefind'].includes(d.name))
    .map((d) => d.name);

  let dentroDeProibido = 0;
  for (const rota of rotas) {
    if (!existsSync(join(dist, rota, 'index.html'))) continue;
    await pagina.goto(`${base}/${rota}/`);
    dentroDeProibido += await pagina.evaluate(() =>
      [...document.querySelectorAll('[data-termo]')]
        .filter((s) => s.closest('a, h1, h2, h3, h4, code, pre')).length);
  }
  conferir(dentroDeProibido === 0, 'nenhum termo marcado dentro de link, título ou código', `${dentroDeProibido} ocorrências`);

  // 4. nenhum link interno aponta para página que não foi gerada.
  const existentes = new Set(['', ...rotas]);
  const quebrados = [];
  for (const rota of rotas) {
    if (!existsSync(join(dist, rota, 'index.html'))) continue;
    await pagina.goto(`${base}/${rota}/`);
    const hrefs = await pagina.evaluate(() =>
      [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')));
    for (const h of hrefs) {
      const alvo = h.replace(/^\/|\/$/g, '').split('#')[0].split('?')[0];
      if (!existentes.has(alvo) && !alvo.startsWith('_astro')) quebrados.push(`${rota} -> ${h}`);
    }
  }
  conferir(quebrados.length === 0, 'nenhum link interno quebrado', quebrados.slice(0, 4).join(' | '));

  conferir(errosJs.length === 0, 'nenhum erro de JavaScript no site', errosJs.slice(0, 2).join(' | '));
  await pagina.close();
}

// ------------------------------------------------------ pacote offline
if (existsSync(offline)) {
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  const errosJs = [];
  pagina.on('pageerror', (e) => errosJs.push(e.message));
  await pagina.goto(`file://${offline}`);
  await pagina.waitForTimeout(300);

  // 5. todo link do menu abre uma página, e só uma.
  //    Quebrou porque os links do site são absolutos e morrem em file://.
  const links = await pagina.evaluate(() =>
    [...document.querySelectorAll('.lateral a[href^="#"]')].map((a) => a.getAttribute('href')));
  let ruins = 0;
  for (const h of links) {
    await pagina.locator(`.lateral a[href="${h}"]`).first().click();
    await pagina.waitForTimeout(60);
    const visiveis = await pagina.evaluate(() =>
      [...document.querySelectorAll('.pagina')].filter((p) => !p.hidden).length);
    if (visiveis !== 1) ruins++;
  }
  conferir(links.length >= 15, 'menu offline tem os links das páginas', `${links.length} links`);
  conferir(ruins === 0, 'todo link offline abre exatamente uma página', `${ruins} com problema`);

  // 6. um item ativo por vez no menu.
  //    Quebrou porque a casca copiada trouxe o aria-current da página de origem.
  const ativos = await pagina.evaluate(() => document.querySelectorAll('.lateral a.ativo, .lateral [aria-current]').length);
  conferir(ativos === 1, 'menu offline destaca um item por vez', `${ativos} destacados`);

  conferir(errosJs.length === 0, 'nenhum erro de JavaScript no offline', errosJs.slice(0, 2).join(' | '));
  await pagina.close();
} else {
  ok('pacote offline não existe ainda, pulado (rode npm run offline)');
}

await navegador.close();
servidor.close();

// ------------------------------------------------------------------ saída
console.log('');
console.log('  ' + '='.repeat(64));
console.log('  TESTES DE NAVEGADOR');
console.log('  ' + '='.repeat(64));
console.log('');
for (const p of passes) console.log(`   ok    ${p}`);
if (falhas.length) {
  console.log('');
  console.log(`   ${falhas.length} FALHAS:`);
  for (const f of falhas) console.log(`    ${f}`);
}
console.log('');
console.log(`  ${falhas.length ? 'FALHOU' : 'PASSOU'}  ${passes.length} ok, ${falhas.length} falhas`);
console.log('');
process.exit(falhas.length ? 1 : 0);
