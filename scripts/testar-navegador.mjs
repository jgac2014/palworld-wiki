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

/**
 * Todo HTML gerado, a árvore inteira.
 *
 * Para asserção que precisa falar das 323 páginas e não da amostra que coube
 * na visita do navegador. Abrir todas no Chromium a cada portão não paga; ler
 * todas em disco custa milissegundos.
 */
const todosOsHtml = async () =>
  (await readdir(dist, { recursive: true, withFileTypes: true }))
    .filter((d) => d.isFile() && d.name.endsWith('.html'))
    .map((d) => join(d.parentPath ?? d.path, d.name));

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

/**
 * O prefixo em que o site foi construído.
 *
 * Publicado no GitHub Pages, o site mora numa subpasta (/palworld-wiki/), e o
 * build do CI escreve esse prefixo em todo caminho absoluto: CSS, script,
 * ícone e link de menu. O servidor daqui serve o `dist` na raiz, então sem
 * descontar o prefixo TODO recurso dá 404, a página abre sem estilo e sem
 * script, e o portão quebra em cima de um defeito que não existe.
 *
 * Foi o que aconteceu na primeira execução em CI deste repositório: a busca
 * nunca montou o campo porque o módulo dela vinha de um endereço que o
 * servidor de teste não conhecia.
 */
const PREFIXO = readFileSync(join(dist, 'index.html'), 'utf-8')
  .match(/href="(\/[^"]*)\/favicon\.svg"/)?.[1] ?? '';

/** Tira o prefixo de publicação de um caminho, quando ele está lá. */
const semPrefixo = (caminho) =>
  PREFIXO && (caminho === PREFIXO || caminho.startsWith(`${PREFIXO}/`))
    ? caminho.slice(PREFIXO.length) || '/'
    : caminho;

const servidor = createServer((req, res) => {
  let caminho = semPrefixo(decodeURIComponent(req.url.split('?')[0]));
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

/**
 * O `/mapa` pede o Leaflet ao unpkg no `<head>`. Sem saída para a internet, e
 * o sandbox e o CI restrito não têm, a página abria sem mapa nenhum e as
 * asserções do mapa morriam por timeout de 30s, derrubando o processo ANTES
 * das outras trinta e poucas. Um host bloqueado apagava a suíte inteira.
 *
 * O desvio serve a cópia local do MESMO pino que o `package.json` declara, que
 * é o que torna as asserções do mapa reais aqui em vez de impossíveis. E ele
 * FALHA dizendo que faltou insumo quando a cópia não existe: pular calado é o
 * modo de errar mais caro deste repositório, está escrito no CLAUDE.md.
 */
const LEAFLET = join(raiz, 'node_modules/leaflet/dist');
// A página pede dois arquivos e um deles é módulo ES. Servir o UMD no lugar do
// .esm faz o import() devolver objeto vazio e o mapa não desenhar, então o
// desvio respeita o nome pedido em vez de adivinhar.
const temLeafletLocal = existsSync(join(LEAFLET, 'leaflet-src.esm.js'));
const desviarLeaflet = (alvo) =>
  alvo.route(/unpkg\.com\/leaflet@/, async (rota) => {
    const pedido = rota.request().url().split('/').pop();
    const arquivo = join(LEAFLET, pedido);
    if (!existsSync(arquivo)) return rota.abort();
    await rota.fulfill({
      contentType: pedido.endsWith('.css') ? 'text/css' : 'application/javascript',
      body: await readFile(arquivo, 'utf-8'),
    });
  });

// ------------------------------------------------------------ site gerado
{
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  const errosJs = [];
  pagina.on('pageerror', (e) => errosJs.push(e.message));
  // Servido por HTTP o site carrega quase tudo. Sobra o Leaflet do CDN, que
  // depende de rede externa e não existe no sandbox nem no CI: o desvio acima
  // resolve o script, e os ícones que o CSS dele pede continuam faltando.
  const RUIDO = /Failed to load resource|unpkg|cdn|ERR_[A-Z_]+/i;
  pagina.on('console', (m) => { if (m.type() === 'error' && !RUIDO.test(m.text())) errosJs.push(m.text()); });
  conferir(temLeafletLocal, 'o Leaflet local existe para as asserções do mapa', 'faltou node_modules/leaflet, rode npm ci');
  await desviarLeaflet(pagina);

  await pagina.goto(`${base}/meu-save/`);
  await pagina.waitForTimeout(300);

  // 1. o assistente só existe quando tem para onde perguntar (F5).
  //
  //    Enquanto o worker não estiver publicado, o widget INTEIRO não pode ser
  //    gerado: antes ele ia ao ar nas 323 páginas e respondia com um recado
  //    pedindo para publicar o worker. E não basta escondê-lo por CSS, tem que
  //    NÃO EXISTIR no DOM: esconder por estilo já enganou a asserção do painel
  //    uma vez neste mesmo arquivo.
  //
  //    O insumo é o próprio ENDERECO_ASSISTENTE do componente. Se ele não for
  //    legível, isto FALHA em vez de pular: checagem que não acha o que
  //    conferir aprova qualquer coisa, e é o modo de falha mais caro daqui.
  const fonteChat = await readFile(join(raiz, 'src/components/Chat.astro'), 'utf-8');
  const declarado = fonteChat.match(/^const ENDERECO_ASSISTENTE\s*=\s*'([^']*)'/m);
  const htmlGerado = await todosOsHtml();
  const paginasHtml = htmlGerado.length;
  const comBotao = (await Promise.all(
    htmlGerado.map(async (a) => (await readFile(a, 'utf-8')).includes('id="abrir-chat"')),
  )).filter(Boolean).length;

  const noDom = await pagina.evaluate(() => ({
    botao: !!document.querySelector('#abrir-chat'),
    painel: !!document.querySelector('#painel-chat'),
    fechado: document.querySelector('#painel-chat')
      ? getComputedStyle(document.querySelector('#painel-chat')).display === 'none'
      : null,
  }));

  if (!declarado) {
    falha('assistente: não consegui ler ENDERECO_ASSISTENTE de src/components/Chat.astro');
  } else if (declarado[1] === '') {
    conferir(
      comBotao === 0 && noDom.botao === false && noDom.painel === false,
      'sem worker publicado, o assistente não é gerado em página nenhuma',
      `${comBotao} de ${paginasHtml} páginas com o botão, botão no DOM: ${noDom.botao}, painel: ${noDom.painel}`,
    );
  } else {
    // Com endereço, ele volta em TODAS as páginas e o painel nasce fechado.
    // A segunda metade quebrou uma vez: display:flex vence o [hidden] do HTML.
    conferir(
      comBotao === paginasHtml && noDom.fechado === true,
      'com worker publicado, o assistente volta em todas as páginas e nasce fechado',
      `${comBotao} de ${paginasHtml} páginas, painel fechado: ${noDom.fechado}`,
    );
  }

  // 1b. glosa escrita à mão não imprime a mesma palavra duas vezes (F9).
  //
  //     "Imortalidade (Immortality)" no markdown marcava os dois lados com o
  //     MESMO termo, então os dois exibiam o mesmo idioma: a tela mostrava
  //     "Imortalidade (Imortalidade)" em português e "Immortality
  //     (Immortality)" em inglês. Eram 134 ocorrências em 12 páginas.
  //
  //     Conferido nos DOIS idiomas, no HTML de todas as páginas, porque
  //     consertar um lado e deixar o outro é metade do defeito. E o número de
  //     glosas encontradas entra na condição: com zero glosas no site, "nenhuma
  //     repetida" seria verdade trivial.
  const GLOSA = /<span data-termo="([^"]+)" data-pt="([^"]*)" data-en="([^"]*)"[^>]*>[^<]*<\/span>\s*\(\s*<span data-termo="([^"]+)" data-pt="([^"]*)" data-en="([^"]*)"[^>]*>[^<]*<\/span>\s*\)/g;
  let glosas = 0;
  const repetidas = [];
  for (const arq of await todosOsHtml()) {
    const html = await readFile(arq, 'utf-8');
    for (const g of html.matchAll(GLOSA)) {
      if (g[1] !== g[4]) continue;
      glosas++;
      if (g[2] === g[5] || g[3] === g[6]) {
        repetidas.push(`${arq.replace(dist, '')}: ${g[2]} (${g[5]})`);
      }
    }
  }
  //     O HTML sozinho não fecha a prova: quem troca o texto é o seletor no
  //     navegador. A segunda metade abre /breeding, lê o que está NA TELA nos
  //     dois idiomas e procura "X (X)" com a mesma palavra dos dois lados.
  const repetidaNaTela = async () => {
    await pagina.goto(`${base}/breeding/`);
    await pagina.waitForTimeout(250);
    const ler = () => pagina.evaluate(() => {
      const achadas = [];
      for (const s of document.querySelectorAll('span[data-termo]')) {
        const irmao = s.nextSibling?.nextSibling;
        if (irmao?.nodeType !== 1 || irmao.dataset?.termo !== s.dataset.termo) continue;
        if (!/^\s*\(\s*$/.test(s.nextSibling.textContent || '')) continue;
        if (s.textContent.trim() === irmao.textContent.trim()) achadas.push(s.textContent.trim());
      }
      return achadas;
    });
    const emPt = await ler();
    await pagina.locator('.seletor button', { hasText: 'EN' }).first().click();
    await pagina.waitForTimeout(300);
    const emEn = await ler();
    await pagina.locator('.seletor button', { hasText: 'PT' }).first().click();
    await pagina.waitForTimeout(200);
    return { emPt, emEn };
  };
  const glosaNaTela = await repetidaNaTela();

  conferir(
    glosas > 0 && repetidas.length === 0 && glosaNaTela.emPt.length === 0 && glosaNaTela.emEn.length === 0,
    `as ${glosas} glosas "termo (Term)" mostram o outro idioma, nos dois sentidos`,
    glosas === 0 ? 'não achei glosa nenhuma no site, então esta asserção não conferiu nada'
      : repetidas.length ? `${repetidas.length} repetem a mesma palavra no HTML, por exemplo ${repetidas[0]}`
      : `na tela de /breeding: PT ${JSON.stringify(glosaNaTela.emPt.slice(0, 3))}, EN ${JSON.stringify(glosaNaTela.emEn.slice(0, 3))}`,
  );

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
  let palDentroDeProibido = 0;
  let palsMarcados = 0;
  for (const rota of rotas) {
    if (!existsSync(join(dist, rota, 'index.html'))) continue;
    await pagina.goto(`${base}/${rota}/`);
    const conta = await pagina.evaluate(() => ({
      termo: [...document.querySelectorAll('[data-termo]')]
        .filter((s) => s.closest('a, h1, h2, h3, h4, code, pre')).length,
      // A mesma regra vale para o nome de Pal marcado para o popover: dentro de
      // link ele rouba o clique, e dentro de título vira ruído.
      pal: [...document.querySelectorAll('[data-pal]')]
        .filter((s) => s.closest('a, h1, h2, h3, h4, code, pre')).length,
      total: document.querySelectorAll('[data-pal]').length,
    }));
    dentroDeProibido += conta.termo;
    palDentroDeProibido += conta.pal;
    palsMarcados += conta.total;
  }
  conferir(dentroDeProibido === 0, 'nenhum termo marcado dentro de link, título ou código', `${dentroDeProibido} ocorrências`);
  conferir(
    palsMarcados > 0 && palDentroDeProibido === 0,
    'nome de Pal marcado fora de link, título e código',
    palsMarcados === 0 ? 'nenhum nome marcado no site inteiro' : `${palDentroDeProibido} dentro de proibido`,
  );

  // 3b. a ficha do Pal abre por teclado, e não só por mouse.
  //     R5.3 do PRD. Popover que só responde a hover exclui quem navega por Tab
  //     e quem usa o site no controle com teclado na mão, que é metade do caso
  //     de uso deste projeto.
  //
  //     O teste estabelece o estado antes de afirmar: primeiro confere que a
  //     ficha nasce fechada, depois abre. Asserção que herda estado de outro
  //     teste passa por acidente, e isso já aconteceu aqui com o idioma.
  await pagina.goto(`${base}/breeding/`);
  await pagina.waitForTimeout(250);
  const ALVO = '.conteudo [data-pal]';
  const lerFicha = () => pagina.evaluate(() => {
    const c = document.getElementById('ficha-pal');
    if (!c) return null;
    return {
      visivel: !c.hidden && getComputedStyle(c).display !== 'none',
      nome: c.querySelector('.nome')?.textContent || '',
      aptidoes: c.querySelectorAll('.apt').length,
    };
  });

  const nascendo = await lerFicha();
  const esperado = await pagina.getAttribute(ALVO, 'data-pal');
  await pagina.focus(ALVO);
  await pagina.waitForTimeout(120);
  const comFoco = await lerFicha();
  conferir(
    nascendo?.visivel === false && comFoco?.visivel === true && comFoco.nome === esperado && comFoco.aptidoes > 0,
    'a ficha do Pal abre com foco de teclado',
    !nascendo ? 'o popover não existe na página'
      : nascendo.visivel ? 'nasceu aberta, o teste seguinte não provaria nada'
      : `com foco: visível ${comFoco.visivel}, nome "${comFoco.nome}" para "${esperado}", ${comFoco.aptidoes} aptidões`,
  );

  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(120);
  const depoisDeEsc = await lerFicha();
  await pagina.hover(ALVO);
  await pagina.waitForTimeout(120);
  const comMouse = await lerFicha();
  conferir(
    depoisDeEsc?.visivel === false && comMouse?.visivel === true,
    'a ficha do Pal fecha com Esc e abre com o mouse',
    `depois do Esc: ${depoisDeEsc?.visivel}, com o mouse: ${comMouse?.visivel}`,
  );

  // 4. nenhum link interno aponta para página que não foi gerada.
  //    A lista de páginas existentes desce a árvore inteira, e não só o
  //    primeiro nível: as fichas de Pal moram em /pal/<nome>/, e enquanto isto
  //    olhava só a raiz o banco de Pals apontando para elas era acusado de
  //    link quebrado. A visita continua sendo só do primeiro nível, porque
  //    abrir 317 páginas no navegador a cada portão não paga o que acrescenta.
  const todasAsRotas = async function varrer(pasta, prefixo = '') {
    const achadas = [];
    for (const item of await readdir(pasta, { withFileTypes: true })) {
      if (!item.isDirectory() || ['_astro', 'pagefind'].includes(item.name)) continue;
      const rota = prefixo ? `${prefixo}/${item.name}` : item.name;
      if (existsSync(join(pasta, item.name, 'index.html'))) achadas.push(rota);
      achadas.push(...(await varrer(join(pasta, item.name), rota)));
    }
    return achadas;
  };
  const existentes = new Set(['', ...(await todasAsRotas(dist))]);
  const quebrados = [];
  for (const rota of rotas) {
    if (!existsSync(join(dist, rota, 'index.html'))) continue;
    await pagina.goto(`${base}/${rota}/`);
    const hrefs = await pagina.evaluate(() =>
      [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')));
    for (const h of hrefs) {
      // O alvo é comparado sem o prefixo de publicação, senão no CI todo link
      // interno vira "quebrado" só por morar em /palworld-wiki/.
      const alvo = semPrefixo(h).replace(/^\/|\/$/g, '').split('#')[0].split('?')[0];
      if (!existentes.has(alvo) && !alvo.startsWith('_astro')) quebrados.push(`${rota} -> ${h}`);
    }
  }
  conferir(quebrados.length === 0, 'nenhum link interno quebrado', quebrados.slice(0, 4).join(' | '));

  // 4b. nenhuma página publica marcador de string não resolvida.
  //     "pt-BR_Text" é o slot da string que a localização do jogo não tem, e o
  //     paldb o renderiza como se fosse conteúdo. Foram 99 registros no ar,
  //     visíveis em /itens/, até alguém olhar. O verificador pega no dado; esta
  //     asserção pega no HTML de TODA página, que é onde o leitor vê, e cobre
  //     também o marcador que venha por outro caminho um dia.
  const MARCADOR = /[a-z]{2}(?:-[A-Za-z]{2,4})?_Text/;
  const comMarcador = [];
  for (const rota of existentes) {
    const arq = join(dist, rota, 'index.html');
    if (!existsSync(arq)) continue;
    if (MARCADOR.test(await readFile(arq, 'utf-8'))) comMarcador.push(rota || 'a home');
  }
  conferir(
    comMarcador.length === 0,
    'nenhuma página publica marcador de string não traduzida',
    `${comMarcador.length} páginas, por exemplo: ${comMarcador.slice(0, 3).join(', ')}`,
  );

  // 5. a moldura inteira alterna de idioma, não só os nomes do jogo.
  //    Quebrou porque menu, filtros e rótulos estavam escritos em português
  //    dentro dos componentes: trocar para EN deixava o site pela metade.
  //    Vale para texto e para placeholder, que é atributo e escapa do laço.
  //    Servido por HTTP, não por file://, senão o clique acontece numa página
  //    sem CSS e o resultado não diz nada sobre o site de verdade.
  //    Cuidado com o vazio: se ninguém marcou nada, o laço não acha elemento
  //    algum e a asserção passa sem testar coisa nenhuma. Por isso contamos os
  //    marcados e, quando o interface.json existe, exigimos que haja marcação.
  const teimosos = [];
  let marcados = 0;
  for (const rota of ['', 'pals', 'mapa']) {
    if (!existsSync(join(dist, rota, 'index.html'))) continue;
    await pagina.goto(`${base}/${rota}`);
    await pagina.locator('.seletor button', { hasText: 'EN' }).first().click();
    await pagina.waitForTimeout(200);
    marcados += await pagina.evaluate(() => document.querySelectorAll('[data-rot-pt], [data-ph-pt]').length);
    teimosos.push(...(await pagina.evaluate((onde) => {
      const fora = [];
      for (const el of document.querySelectorAll('[data-rot-pt]')) {
        const alvo = el.dataset.rotEn;
        if (alvo && el.textContent.trim() !== alvo.trim()) {
          fora.push(`${onde}: "${el.textContent.trim().slice(0, 40)}"`);
        }
      }
      for (const el of document.querySelectorAll('[data-ph-pt]')) {
        const campo = el.matches('input, textarea') ? el : el.querySelector('input, textarea');
        if (campo && el.dataset.phEn && campo.placeholder !== el.dataset.phEn) {
          fora.push(`${onde}: placeholder "${campo.placeholder}"`);
        }
      }
      return fora;
    }, rota || 'home')));
  }
  conferir(teimosos.length === 0, 'a moldura inteira alterna para inglês', teimosos.slice(0, 4).join(' | '));
  if (existsSync(join(raiz, 'src/data/interface.json'))) {
    conferir(marcados > 0, 'a moldura tem rótulos marcados para alternar', 'nenhum [data-rot-pt] encontrado: a marcação sumiu dos componentes');
  }

  // 6. a barra de aptidão tem largura proporcional ao nível.
  //    R5.5 do PRD: aptidão é barra para comparar de relance, sem ler tabela.
  //    Uma barra que existe mas não acompanha o número é pior que número solto,
  //    porque mente com cara de gráfico. Só dá para testar com o CSS carregado,
  //    e é por isso que este arquivo serve o site por HTTP.
  await pagina.goto(`${base}/pal/anubis/`);
  await pagina.waitForTimeout(200);
  const barras = await pagina.evaluate(() =>
    [...document.querySelectorAll('.apt-barra')].map((b) => {
      const preenchida = b.querySelector('i');
      return {
        nivel: Number(preenchida?.dataset.nivel),
        proporcao: preenchida.getBoundingClientRect().width / b.getBoundingClientRect().width,
      };
    }));
  // Tolerância de 2 pontos percentuais: arredondamento de pixel, não desenho.
  const tortas = barras.filter((b) => !b.nivel || Math.abs(b.proporcao - b.nivel / 10) > 0.02);
  const niveisDistintos = new Set(barras.map((b) => b.nivel)).size;
  conferir(
    barras.length >= 2 && niveisDistintos >= 2 && tortas.length === 0,
    'barra de aptidão é proporcional ao nível',
    barras.length < 2 ? 'menos de duas barras na página' :
    niveisDistintos < 2 ? 'todos os níveis iguais, o teste não distingue nada' :
    tortas.map((b) => `nível ${b.nivel} desenhou ${(b.proporcao * 100).toFixed(1)}%`).join(' | '),
  );

  // 6a. a moldura do guia alterna, e o corpo dele não.
  //     R2.5 para a moldura, R2.7 para o corpo: traduzir 87 mil caracteres de
  //     guia cria duas verdades que divergem no primeiro patch. O teste guarda
  //     as duas metades da decisão de uma vez, porque uma sem a outra é fácil
  //     de quebrar sem perceber.
  //
  //     Estabelece o idioma antes de medir, em vez de herdar o que o teste
  //     anterior deixou salvo.
  await pagina.goto(`${base}/breeding/`);
  await pagina.waitForTimeout(200);
  await pagina.click('.seletor button[data-idioma="pt"]');
  await pagina.waitForTimeout(150);
  const molduraDoGuia = () => pagina.evaluate(() => ({
    h1: document.querySelector('.conteudo h1')?.textContent?.trim() || '',
    sub: document.querySelector('.conteudo .subtitulo')?.textContent?.trim() || '',
    carimbo: document.querySelector('.conteudo .carimbo')?.textContent?.trim() || '',
    // O corpo é comparado SEM os termos marcados: aqueles alternam de propósito,
    // por R2.2, e são o motivo de o projeto existir. O que não pode mudar é a
    // prosa em volta deles.
    corpo: (() => {
      const artigo = document.querySelector('.conteudo article');
      if (!artigo) return '';
      const copia = artigo.cloneNode(true);
      copia.querySelectorAll('h1, .subtitulo, .carimbo, [data-termo]').forEach((e) => e.remove());
      return copia.textContent.replace(/\s+/g, ' ').trim().slice(0, 600);
    })(),
    rodape: document.querySelector('.rodape-pagina')?.textContent?.replace(/\s+/g, ' ').trim() || '',
  }));
  const guiaPt = await molduraDoGuia();
  await pagina.click('.seletor button[data-idioma="en"]');
  await pagina.waitForTimeout(200);
  const guiaEn = await molduraDoGuia();
  conferir(
    guiaPt.h1 !== '' && guiaEn.h1 !== guiaPt.h1
      && guiaEn.sub !== guiaPt.sub
      && guiaEn.carimbo !== guiaPt.carimbo && /updated/i.test(guiaEn.carimbo)
      && guiaEn.corpo === guiaPt.corpo,
    'a moldura do guia alterna e o corpo continua em português',
    `h1 "${guiaPt.h1}" -> "${guiaEn.h1}" | carimbo "${guiaPt.carimbo}" -> "${guiaEn.carimbo}" | corpo mudou: ${guiaEn.corpo !== guiaPt.corpo}`,
  );

  // Data em dois lugares na mesma página tem que ser a mesma data. O carimbo
  // lia em UTC e o rodapé pelo fuso local, então a mesma linha do frontmatter
  // virava 30.07 em cima e 29/07 embaixo.
  const dataDoCarimbo = guiaPt.carimbo.match(/(\d{2})[./](\d{2})[./](\d{4})/)?.slice(1).join('.') || 'sem data';
  const dataDoRodape = guiaPt.rodape.match(/(\d{2})[./](\d{2})[./](\d{4})/)?.slice(1).join('.') || 'sem data';
  conferir(
    dataDoCarimbo !== 'sem data' && dataDoCarimbo === dataDoRodape,
    'carimbo e rodapé mostram a mesma data',
    `carimbo ${dataDoCarimbo}, rodapé ${dataDoRodape}`,
  );

  // 6b. a busca também alterna de idioma, e não perde o que já foi digitado.
  //     R2.4. A mensagem de vazio nascia em português e ficava: as traduções
  //     eram passadas numa prop que a versão instalada do astro-pagefind não
  //     conhece, e prop desconhecida em componente Astro some sem avisar.
  //
  //     O teste estabelece o idioma que precisa antes de afirmar, pelo botão e
  //     não pela URL, para exercitar o caminho que o leitor usa de verdade.
  await pagina.goto(`${base}/`);
  await pagina.waitForTimeout(300);
  await pagina.click('.seletor button[data-idioma="pt"]');
  await pagina.waitForTimeout(150);
  const campoBusca = '.caixa-busca input[type="search"], .caixa-busca input';
  const NADA = 'zzzznaoexistenawiki';
  const vazioDe = async (idioma) => {
    await pagina.click(`.seletor button[data-idioma="${idioma}"]`);
    await pagina.waitForTimeout(200);
    await pagina.fill(campoBusca, '');
    await pagina.fill(campoBusca, NADA);
    await pagina.waitForTimeout(900);
    return pagina.evaluate(() =>
      document.querySelector('.pf-searchbox-empty, .pf-searchbox-status')?.textContent?.trim() || '');
  };
  const vazioPt = await vazioDe('pt');
  const vazioEn = await vazioDe('en');
  conferir(
    vazioPt !== '' && vazioEn !== '' && vazioPt !== vazioEn && /no results/i.test(vazioEn),
    'a mensagem de busca vazia alterna de idioma',
    `pt: "${vazioPt}" | en: "${vazioEn}"`,
  );

  // Trocar de idioma no meio de uma busca não pode apagar o que a pessoa
  // escreveu. É o motivo de a instância ser avisada em vez de reconstruída.
  await pagina.fill(campoBusca, 'anubis');
  await pagina.waitForTimeout(400);
  await pagina.click('.seletor button[data-idioma="pt"]');
  await pagina.waitForTimeout(300);
  const textoQueSobrou = await pagina.inputValue(campoBusca);
  conferir(
    textoQueSobrou === 'anubis',
    'trocar de idioma mantém a busca digitada',
    `sobrou "${textoQueSobrou}"`,
  );
  await pagina.fill(campoBusca, '');

  // 6c. as três calculadoras respondem os casos fixados no aceite da E5.
  //     Cada caso tem entrada e saída esperada, e os números vieram de fonte:
  //     a receita do bolo está em economia.md, e os pares de cruzamento foram
  //     conferidos contra as 149 combinações que o paldb publica. Critério que
  //     só julga existência passa com a fórmula errada, e foi por isso que este
  //     aceite foi reescrito antes de a primeira linha de conta ser escrita.
  await pagina.goto(`${base}/calculadoras/`);
  await pagina.waitForTimeout(300);
  await pagina.click('.seletor button[data-idioma="pt"]');
  await pagina.waitForTimeout(150);

  const preencherBolo = async (valores) => {
    for (const [chave, v] of Object.entries(valores)) {
      await pagina.fill(`#campos-bolo input[data-ingrediente="${chave}"]`, String(v));
    }
    await pagina.waitForTimeout(120);
    return pagina.textContent('#resposta-bolo');
  };

  // Caso 1: o estoque real de 30.07, com leite e ovos zerados.
  const bau = JSON.parse(await readFile(join(raiz, 'src/data/guilda.json'), 'utf-8')).bau;
  const caso1 = await preencherBolo({
    trigo: bau.trigo, farinha: bau.farinha, frutas: bau.frutas,
    leite: bau.leite, ovos: bau.ovos, mel: bau.mel,
  });
  conferir(
    /^0\b/.test(caso1.trim()) && /leite/i.test(caso1) && /Mozzarina/.test(caso1),
    'bolo: com o estoque real dá 0 e a trava é leite, citando o Mozzarina',
    `respondeu: "${caso1.trim()}"`,
  );

  // Caso 2: leite e ovos resolvidos. A trava passa a ser farinha, e a mensagem
  // tem que apontar o trigo, que é o gargalo de verdade atrás dela.
  const caso2 = await preencherBolo({ leite: 180, ovos: 200 });
  conferir(
    /^18\b/.test(caso2.trim()) && /farinha/i.test(caso2) && /trigo/i.test(caso2),
    'bolo: com leite 180 e ovos 200 dá 18, e aponta farinha e trigo',
    `respondeu: "${caso2.trim()}"`,
  );

  // Cruzamento: os três caminhos do cálculo, um caso cada.
  const cruzar = async (a, b) => {
    await pagina.selectOption('#pai-a', a);
    await pagina.selectOption('#pai-b', b);
    await pagina.waitForTimeout(120);
    return pagina.textContent('#resposta-cruz');
  };
  const exato = await cruzar('Anubis', 'Chikipi');
  const empate = await cruzar('Anubis', 'Teafant');
  const unica = await cruzar('Relaxaurus', 'Sparkit');
  conferir(
    /Snock/.test(exato) && /Snock/.test(empate) && /Relaxaurus Lux/.test(unica) && /única|unica/i.test(unica),
    'cruzamento: casamento exato, empate e combinação única',
    `exato "${exato.trim()}" | empate "${empate.trim()}" | única "${unica.trim()}"`,
  );

  // Quem não está na Palpédia não entra na média de rank, e continua cruzando
  // entre si (F6).
  //
  // As onze da colaboração com Terraria dividem o mesmo CombiRank 3100, então
  // qualquer média com elas caía num ponto arbitrário da tabela e a
  // calculadora devolvia receita que o jogo não tem. Elas NÃO saíram da tela:
  // têm 57 combinações únicas entre si, que são receita de verdade, e cortá-las
  // da lista teria trocado um defeito por outro maior.
  //
  // As duas metades são obrigatórias. Só a primeira aprovaria a versão que
  // apaga as onze da calculadora inteira, que foi a primeira tentativa desta
  // tarefa. Os nomes saem do catálogo e das combinações únicas, não escritos
  // aqui, senão a próxima colaboração passa direto.
  const catalogoDoDisco = JSON.parse(await readFile(join(raiz, 'src/data/catalogo.json'), 'utf-8'));
  const foraDaPalpedia = catalogoDoDisco.pals.filter((p) => p.numero == null);
  const chavesFora = new Set(foraDaPalpedia.map((p) => p.chave));
  const unicaEntreElas = (catalogoDoDisco.cruzamentos_unicos || [])
    .find((u) => u.length === 3 && chavesFora.has(u[0]) && chavesFora.has(u[1]) && u[0] !== u[1]);
  const nomePt = (chave) => catalogoDoDisco.pals.find((p) => p.chave === chave)?.pt || chave;

  // A lista suspensa precisa oferecer os três antes de qualquer clique. Sem
  // isto o selectOption estoura por timeout e a suíte morre com um stack
  // trace, em vez de dizer que a calculadora deixou de oferecer as entidades.
  const oferecidos = await pagina.evaluate((chaves) => {
    const sel = document.getElementById('pai-a');
    if (!sel) return null;
    const tem = new Set([...sel.options].map((o) => o.value));
    return chaves.filter((c) => !tem.has(c));
  }, [foraDaPalpedia[0]?.chave, unicaEntreElas?.[0], unicaEntreElas?.[1]].filter(Boolean));

  if (foraDaPalpedia.length === 0 || !unicaEntreElas) {
    falha('Palpédia: o catálogo não tem entidade sem número ou combinação única entre elas, então esta asserção não conferiu nada');
  } else if (oferecidos === null || oferecidos.length) {
    falha(
      `as ${foraDaPalpedia.length} entidades fora da Palpédia sumiram da calculadora, e com elas as combinações únicas entre si`
      + ` (não oferecidos: ${oferecidos === null ? 'a lista nem existe' : oferecidos.join(', ')})`,
    );
  } else {
    const misturado = await cruzar(foraDaPalpedia[0].chave, 'Anubis');
    const entreElas = await cruzar(unicaEntreElas[0], unicaEntreElas[1]);
    conferir(
      /Palp[ée]dia/i.test(misturado) && !/Anubis/.test(misturado)
        && new RegExp(nomePt(unicaEntreElas[2])).test(entreElas) && /única|unica/i.test(entreElas),
      `as ${foraDaPalpedia.length} entidades fora da Palpédia não entram na média de rank e mantêm as combinações únicas entre si`,
      `misturado com Anubis: "${misturado.trim()}" | ${nomePt(unicaEntreElas[0])} com ${nomePt(unicaEntreElas[1])}: "${entreElas.trim()}"`,
    );
  }

  // Condensação: só o total para 4★, que é o número com fonte.
  const condensar = async (n) => {
    await pagina.fill('#copias', String(n));
    await pagina.waitForTimeout(120);
    return pagina.textContent('#resposta-cond');
  };
  const cond5 = await condensar(5);
  const cond48 = await condensar(48);
  conferir(
    /^43\b/.test(cond5.trim()) && /^0\b/.test(cond48.trim()),
    'condensação: 5 cópias faltam 43, e 48 cópias fecham',
    `com 5: "${cond5.trim()}" | com 48: "${cond48.trim()}"`,
  );

  // As três têm alternativa em tabela, que é o R5.8 e não é enfeite: o número
  // desenhado numa barra precisa existir em algum lugar legível por leitor de
  // tela e por quem não enxerga a cor.
  const tabelas = await pagina.evaluate(() =>
    [...document.querySelectorAll('.alternativa')].filter((t) => t.querySelectorAll('tr').length > 1).length);
  conferir(tabelas >= 3, 'cada calculadora tem alternativa em tabela', `${tabelas} tabelas com linha`);

  // 6d. a tabela de poder de captura publica o dado importado, e as onze
  //     esferas continuam todas na página. A de fora da progressão sai da
  //     lista principal e vira nota com o motivo, em vez de sumir: corte em
  //     silêncio é o que este repositório proíbe, e a Radar Sphere tem o mesmo
  //     20 da Giga sem ser esfera de captura, o que sugeriria equivalência
  //     falsa se ela ficasse na tabela.
  const esferasImportadas = JSON.parse(await readFile(join(raiz, 'src/data/itens.json'), 'utf-8'))
    .itens.filter((i) => i.atributos && i.atributos.capture_power !== undefined);
  const naPagina = await pagina.evaluate(() => ({
    linhas: [...document.querySelectorAll('#tabela-captura tbody tr')].map((tr) => ({
      chave: tr.dataset.esfera,
      poder: tr.querySelector('.poder')?.textContent?.trim(),
    })),
    fora: [...document.querySelectorAll('[data-esfera-fora]')].map((p) => ({
      chave: p.dataset.esferaFora,
      texto: p.textContent || '',
    })),
  }));
  const esperadasNaTabela = esferasImportadas.filter((e) => e.atributos.technology !== undefined);
  const esperadasFora = esferasImportadas.filter((e) => e.atributos.technology === undefined);
  const erradas = esperadasNaTabela.filter((e) => {
    const linha = naPagina.linhas.find((l) => l.chave === e.chave);
    return !linha || linha.poder !== String(e.atributos.capture_power);
  });
  const foraSemMotivo = esperadasFora.filter((e) => {
    const nota = naPagina.fora.find((f) => f.chave === e.chave);
    return !nota || !nota.texto.includes(String(e.atributos.capture_power));
  });
  conferir(
    naPagina.linhas.length === esperadasNaTabela.length && !erradas.length && !foraSemMotivo.length,
    'poder de captura: a tabela publica o número importado de cada esfera, e a que fica de fora aparece com o motivo',
    `${naPagina.linhas.length} linhas para ${esperadasNaTabela.length} esperadas, ${erradas.length} com número errado, ${foraSemMotivo.length} fora sem nota`,
  );

  // 7. as duas camadas não se misturam na navegação.
  //    Decisão 3.0 do PRD. A wiki é pública e o nosso save não é assunto de
  //    quem chegou pelo Google. O menu mostra a porta da seção, não o conteúdo
  //    dela, e a home não cita nenhuma página nossa. A lista abaixo é a mesma
  //    do critério de aceite da E2.
  const DA_CAMADA_2 = ['meu-save', 'nossas-bases', 'Base 1', 'Palbox do', 'baú de guilda'];
  const home = await readFile(join(dist, 'index.html'), 'utf-8');
  const vazou = DA_CAMADA_2.filter((termo) => home.includes(termo));
  conferir(vazou.length === 0, 'a home da wiki não menciona o nosso save', `vazou: ${vazou.join(', ')}`);

  await pagina.goto(`${base}/`);
  const blocos = await pagina.evaluate(() => {
    const saida = [];
    let atual = null;
    for (const el of document.querySelectorAll('.lateral > *')) {
      if (el.classList.contains('camada')) { atual = { titulo: el.textContent.trim(), itens: [] }; saida.push(atual); }
      else if (el.matches('a.item') && atual) atual.itens.push(el.getAttribute('href') || '');
    }
    return saida;
  });
  const titulos = new Set(blocos.map((b) => b.titulo));
  conferir(blocos.length >= 2 && titulos.size === blocos.length, 'o menu tem blocos de camada com títulos distintos', `${blocos.length} blocos, ${titulos.size} títulos`);

  // A Camada 2 é PAR da wiki, não apêndice dela: no menu ela vem antes dos 12
  // guias, senão cai abaixo da dobra numa tela de 1080 e some para quem não
  // rola a lateral.
  //
  // Ordem de DOM, e não posição em pixel: pixel depende de carregamento de
  // fonte e deixaria o portão instável, falhando por acaso em máquina lenta.
  // O rótulo do grupo é lido do interface.json, e não escrito aqui, senão o
  // teste quebra no dia em que alguém melhorar a palavra.
  const rotuloGuias = JSON.parse(await readFile(join(raiz, 'src/data/interface.json'), 'utf-8')).nav_guias.pt;
  const ordemDoMenu = await pagina.evaluate((guias) => {
    const alvo = document.querySelector('.lateral a.item[href$="nosso-mundo"]');
    const grupo = [...document.querySelectorAll('.lateral .grupo')].find((g) => g.dataset.rotPt === guias);
    if (!alvo || !grupo) return { alvo: !!alvo, grupo: !!grupo, antes: null };
    // FOLLOWING quer dizer que o grupo vem DEPOIS do link no documento.
    return { alvo: true, grupo: true, antes: Boolean(alvo.compareDocumentPosition(grupo) & Node.DOCUMENT_POSITION_FOLLOWING) };
  }, rotuloGuias);
  conferir(
    ordemDoMenu.antes === true,
    'o nosso mundo vem antes dos guias no menu',
    !ordemDoMenu.alvo ? 'não achei o link de nosso-mundo na lateral'
      : !ordemDoMenu.grupo ? `não achei o grupo "${rotuloGuias}" na lateral`
      : 'o link está depois do grupo de guias, abaixo da dobra',
  );

  // A seção do nosso mundo continua acessível, só que pela porta dela.
  await pagina.goto(`${base}/nosso-mundo/`);
  const daSecao = await pagina.evaluate(() =>
    [...document.querySelectorAll('.conteudo a[href]')].map((a) => a.getAttribute('href')));
  const alcancaveis = DA_CAMADA_2.filter((rota) => daSecao.some((h) => h.includes(rota)));
  conferir(alcancaveis.length >= 2, 'a seção do nosso mundo dá acesso às páginas dela', `alcançou ${alcancaveis.length}`);

  // 7b. o painel do nosso mundo mostra o que está no JSON, e não um número
  //     digitado no .astro. É o critério de aceite da D2, e é a única forma de
  //     saber que trocar um valor no arquivo muda a tela: o teste compara os
  //     medidores desenhados com os arquivos de dados, um por um.
  const guilda = JSON.parse(await readFile(join(raiz, 'src/data/guilda.json'), 'utf-8'));
  const saves = [];
  for (const arq of await readdir(join(raiz, 'src/data/saves'))) {
    if (arq.endsWith('.json')) saves.push(JSON.parse(await readFile(join(raiz, 'src/data/saves', arq), 'utf-8')));
  }
  const esperados = [
    [guilda.torres.derrotadas, guilda.torres.total],
    ...saves.flatMap((s) => [
      [s.nivel, s.nivel_max],
      [s.paldeck.registrados, s.paldeck.total],
      [s.palbox.guardados, s.palbox.capacidade],
    ]),
  ].map(([v, de]) => `${v}/${de}`);

  await pagina.goto(`${base}/painel/`);
  await pagina.waitForTimeout(200);
  const medidos = await pagina.evaluate(() =>
    [...document.querySelectorAll('.kpi')].map((k) => k.querySelector('.num').textContent.replace(/\s+/g, '')));
  const faltando = esperados.filter((e) => !medidos.includes(e));
  conferir(
    medidos.length === esperados.length && faltando.length === 0,
    'o painel mostra os números do JSON, não do componente',
    `${medidos.length} medidores para ${esperados.length} esperados; sem par no JSON: ${faltando.join(', ') || 'nenhum'}`,
  );

  // Gravidade nunca é só cor, por R5.7: cada gargalo precisa de símbolo E do
  // nome da gravidade escrito. Cor sozinha some no daltonismo e no preto e
  // branco, e some inteira para quem usa leitor de tela.
  const sinais = await pagina.evaluate(() =>
    [...document.querySelectorAll('.gargalo')].map((g) => ({
      simbolo: g.querySelector('.sinal')?.textContent.trim() || '',
      nome: g.querySelector('.nome')?.textContent.trim() || '',
    })));
  const semSinal = sinais.filter((s) => !s.simbolo || !s.nome);
  conferir(
    sinais.length === (guilda.gargalos || []).length && semSinal.length === 0,
    'gargalo tem símbolo e texto, não só cor',
    `${sinais.length} cartões para ${(guilda.gargalos || []).length} gargalos, ${semSinal.length} sem símbolo ou sem nome`,
  );

  // 8. escolher uma aptidão no banco de Pals ordena por ela.
  //    R5.4 do PRD: a pergunta é "qual o melhor de Garimpo", não "quais
  //    existem". Uma lista filtrada em ordem alfabética responde a segunda e
  //    parece ter respondido a primeira, que é o pior tipo de defeito.
  await pagina.goto(`${base}/pals/`);
  await pagina.waitForTimeout(200);
  await pagina.selectOption('#apt', 'garimpo');
  await pagina.waitForTimeout(250);
  const garimpo = await pagina.evaluate(() =>
    [...document.querySelectorAll('#grade .cartao:not(.escondido)')].map((c) => {
      const par = c.dataset.apt.split(' ').find((x) => x.startsWith('garimpo:'));
      return par ? Number(par.split(':')[1]) : 0;
    }));
  const semGarimpo = garimpo.filter((v) => v === 0).length;
  const foraDeOrdem = garimpo.filter((v, i) => i > 0 && garimpo[i - 1] < v).length;
  conferir(
    garimpo.length > 5 && semGarimpo === 0 && foraDeOrdem === 0,
    'filtrar por Garimpo lista só quem tem, em ordem decrescente',
    `${garimpo.length} cartões, ${semGarimpo} sem a aptidão, ${foraDeOrdem} fora de ordem`,
  );

  // 9. os índices de item, estrutura e tecnologia filtram e não escondem em
  //    silêncio. As três coleções foram importadas na E4 e ficaram um mês sem
  //    página nenhuma: dado importado que ninguém consome não é cobertura, é
  //    peso morto no repositório.
  const indices = [];
  for (const [rota, minimo] of [['itens', 1200], ['estruturas', 250], ['tecnologias', 400]]) {
    await pagina.goto(`${base}/${rota}/`);
    await pagina.waitForTimeout(250);
    const antes = await pagina.evaluate(() => document.querySelectorAll('#grade > li:not(.escondida)').length);
    const total = await pagina.evaluate(() => document.querySelectorAll('#grade > li').length);
    await pagina.fill('#filtro', 'zzzznaoexiste');
    await pagina.waitForTimeout(200);
    const depois = await pagina.evaluate(() => document.querySelectorAll('#grade > li:not(.escondida)').length);
    // A contagem tem que dizer quantos de quantos, sempre. É o que impede o
    // filtro de esconder registro sem o leitor perceber. Lida do rótulo em
    // português, e não do texto na tela, senão o teste depende do idioma que
    // a asserção anterior deixou salvo no navegador.
    const contagem = await pagina.evaluate(() => document.getElementById('contagem')?.dataset.rotPt || '');
    indices.push({ rota, total, antes, depois, contagem, minimo });
  }
  const ruins = indices.filter((i) =>
    i.total < i.minimo || i.antes === 0 || i.depois !== 0 || !/\d+\s+de\s+\d+/.test(i.contagem));
  conferir(
    ruins.length === 0,
    'os três índices listam, filtram e dizem quantos de quantos',
    ruins.map((i) => `${i.rota}: ${i.total} linhas, ${i.antes} visíveis, ${i.depois} após filtro sem resultado, contagem "${i.contagem}"`).join(' | '),
  );

  // 9c. nenhuma coluna de índice fica presa num idioma (F12).
  //
  //     A coluna TIPO de /tecnologias publicava "Items" e "Structures" crus do
  //     paldb no meio de nome, nível e custo em português, nos 588 registros.
  //     A de categoria de /estruturas tinha o defeito espelhado: mostrava o
  //     português e continuava em português com o site em inglês.
  //
  //     A asserção troca o idioma de verdade e compara o texto renderizado. Só
  //     conferir se "Items" sumiu do HTML aprovaria a coluna traduzida na
  //     marra, presa em português, que é o outro jeito de errar isto.
  const colunaEmDoisIdiomas = async (rota) => {
    await pagina.goto(`${base}${rota}`);
    await pagina.waitForTimeout(250);
    const ler = () => pagina.evaluate(() =>
      [...document.querySelectorAll('#grade li .meta .par:last-child .val')]
        .slice(0, 40).map((e) => e.textContent.trim()));
    const pt = await ler();
    await pagina.locator('.seletor button', { hasText: 'EN' }).first().click();
    await pagina.waitForTimeout(300);
    const en = await ler();
    await pagina.locator('.seletor button', { hasText: 'PT' }).first().click();
    await pagina.waitForTimeout(200);
    return { pt, en };
  };

  const tecno = await colunaEmDoisIdiomas('/tecnologias/');
  const estrut = await colunaEmDoisIdiomas('/estruturas/');
  const semIngles = (l) => l.length > 0 && !l.some((v) => /^(Items|Structures)$/.test(v));
  const alterna = (r) => r.pt.length > 0 && r.en.length === r.pt.length
    && r.pt.some((v, i) => v !== r.en[i]);
  conferir(
    semIngles(tecno.pt) && alterna(tecno) && alterna(estrut),
    'as colunas de tipo e de categoria saem em português e alternam para o inglês',
    `tecnologias PT ${JSON.stringify([...new Set(tecno.pt)].slice(0, 3))} EN ${JSON.stringify([...new Set(tecno.en)].slice(0, 3))}`
    + ` | estruturas PT ${JSON.stringify([...new Set(estrut.pt)].slice(0, 3))} EN ${JSON.stringify([...new Set(estrut.en)].slice(0, 3))}`,
  );

  // 9b. em 1440px o catálogo e os índices usam a largura, e o guia não (F4).
  //
  //     O alvo do site é PC, decidido em 01.08.2026, e antes desta tarefa a
  //     coluna travava em 860px em qualquer monitor: sobravam 316px vazios,
  //     /pals mostrava 2 cartões onde cabem 4 e /itens era uma coluna de nomes
  //     com 116.412px de altura.
  //
  //     A asserção mede as três coisas porque as três podem regredir sozinhas,
  //     e a terceira é a que mais importa: alargar a página sem trocar a
  //     tabela por grade só muda o vazio de lugar, e foi o que aconteceu na
  //     primeira tentativa desta tarefa, abrindo um vão de 800px entre "Nome"
  //     e "Categoria" em /estruturas.
  //
  //     O guia entra junto de propósito. Sem ele, "usar a largura" viraria
  //     alargar tudo, e prosa de 1176px é pior de ler que prosa de 780px.
  const ALTURA_ITENS_ANTES_DA_F4 = 116412;
  {
    const largo = await navegador.newPage({ viewport: { width: 1440, height: 900 } });
    const medir = async (rota, seletor) => {
      await largo.goto(`${base}${rota}`);
      await largo.waitForTimeout(250);
      return largo.evaluate((sel) => {
        const itens = [...document.querySelectorAll(sel)];
        // Colunas por linha é a contagem de itens que dividem o mesmo topo.
        // Medido do que o navegador desenhou, não do CSS declarado: é a
        // diferença entre provar que a grade acontece e repetir a regra.
        const porTopo = new Map();
        for (const e of itens) {
          const t = Math.round(e.getBoundingClientRect().top);
          porTopo.set(t, (porTopo.get(t) || 0) + 1);
        }
        const c = document.querySelector('.conteudo');
        return {
          colunas: Math.max(0, ...porTopo.values()),
          altura: Math.round(document.documentElement.scrollHeight),
          conteudo: c ? Math.round(c.getBoundingClientRect().width) : 0,
        };
      }, seletor);
    };

    const pals = await medir('/pals/', '.grade > .cartao');
    const itens = await medir('/itens/', '#grade > li:not(.escondida)');
    const guia = await medir('/breeding/', 'article > p');
    await largo.close();

    const problemas = [];
    if (pals.colunas < 4) problemas.push(`/pals com ${pals.colunas} cartões por linha, mínimo 4`);
    if (itens.colunas < 3) problemas.push(`/itens com ${itens.colunas} colunas, mínimo 3`);
    if (itens.altura > ALTURA_ITENS_ANTES_DA_F4 / 2) {
      problemas.push(`/itens com ${itens.altura}px de altura, teto ${ALTURA_ITENS_ANTES_DA_F4 / 2}px`);
    }
    // O teto do guia é 860px, que é a medida de leitura mais o respiro lateral.
    if (guia.conteudo > 900) problemas.push(`guia com coluna de ${guia.conteudo}px, devia ficar na medida de leitura`);

    conferir(
      problemas.length === 0,
      'em 1440px o catálogo e o índice usam a largura, e o guia continua estreito',
      problemas.length
        ? problemas.join(' | ')
        : `/pals ${pals.colunas} por linha, /itens ${itens.colunas} colunas e ${itens.altura}px (era ${ALTURA_ITENS_ANTES_DA_F4}px), guia ${guia.conteudo}px`,
    );
  }

  // Um item que só existe em itens.json é achável pela busca do site. Sem isto
  // as três coleções ficariam invisíveis para quem não sabe que a página existe.
  await pagina.goto(`${base}/itens/`);
  await pagina.waitForTimeout(400);
  await pagina.fill('.pagefind-ui input', 'Machado de Metal Refinado');
  await pagina.waitForTimeout(1500);
  const resultados = await pagina.evaluate(() =>
    [...document.querySelectorAll('.pf-searchbox-dropdown a')].map((a) => a.getAttribute('href') || ''));
  conferir(
    resultados.some((h) => h.includes('/itens')),
    'a busca do site acha um item que só existe no índice de itens',
    `resultados: ${resultados.join(', ') || 'nenhum'}`,
  );

  // 10. o overlay do progresso é adição, nunca requisito.
  //    Decisão 3.0 do PRD. Desligado, a Camada 1 não mostra nada do nosso
  //    save; ligado, mostra. E sem JavaScript continua sendo a wiki inteira,
  //    que é o motivo de o overlay nascer escondido por CSS e não por
  //    atributo: [hidden] já foi vencido por display:flex aqui uma vez.
  const doNossoSave = () => pagina.evaluate(() =>
    [...document.querySelectorAll('.so-com-progresso, .so-sem-registro')]
      .filter((el) => el.getBoundingClientRect().height > 0).length);

  await pagina.goto(`${base}/pal/anubis/`);
  await pagina.waitForTimeout(200);
  const desligado = await doNossoSave();
  await pagina.locator('#alternar-progresso').click();
  await pagina.waitForTimeout(200);
  const ligado = await doNossoSave();
  conferir(desligado === 0 && ligado > 0, 'o overlay do progresso liga e desliga o nosso save', `${desligado} visíveis desligado, ${ligado} ligado`);

  // O interruptor só existe onde ele muda alguma coisa (F8).
  //
  // Ele ficava nas 323 páginas trocando de rótulo sem revelar nada em 319
  // delas. As duas metades são obrigatórias: sem a segunda, o botão em toda
  // página continuaria passando, porque "onde tem efeito ele aparece" é
  // verdade trivial quando ele aparece em tudo.
  //
  // O delta é medido do que o navegador desenhou, ligando o overlay de
  // verdade, e não da existência da classe no HTML: /mapa e /calculadoras
  // reagem por JavaScript e não têm classe nenhuma para contar.
  const deltaDoOverlay = async (rota) => {
    await pagina.goto(`${base}${rota}`);
    await pagina.evaluate(() => localStorage.removeItem('palworld-wiki-progresso'));
    await pagina.reload();
    await pagina.waitForTimeout(250);
    const controle = await pagina.locator('#alternar-progresso').count();
    const medir = () => pagina.evaluate(() => {
      const marcas = [...document.querySelectorAll('.so-com-progresso, .so-sem-registro, .so-vencido')]
        .filter((el) => el.getBoundingClientRect().height > 0).length;
      // Valor de campo entra na conta porque em /calculadoras o overlay não
      // acrescenta elemento: ele preenche o estoque da guilda nos campos.
      const campos = [...document.querySelectorAll('#campos-bolo input')]
        .map((i) => i.value).join(',');
      return `${marcas}|${campos}`;
    });
    const antes = await medir();
    if (!controle) return { controle: 0, mudou: false };
    await pagina.locator('#alternar-progresso').click();
    await pagina.waitForTimeout(250);
    const depois = await medir();
    await pagina.evaluate(() => localStorage.removeItem('palworld-wiki-progresso'));
    return { controle, mudou: antes !== depois };
  };

  const COM_EFEITO = ['/pal/anubis/', '/pals/', '/mapa/', '/calculadoras/'];
  const SEM_EFEITO = ['/', '/breeding/', '/itens/', '/painel/'];
  const semControle = [];
  const semEfeito = [];
  for (const rota of COM_EFEITO) {
    const r = await deltaDoOverlay(rota);
    if (!r.controle) semControle.push(rota);
    else if (!r.mudou) semEfeito.push(rota);
  }
  const ofereceEmVao = [];
  for (const rota of SEM_EFEITO) {
    const r = await deltaDoOverlay(rota);
    if (r.controle) ofereceEmVao.push(rota);
  }
  conferir(
    semControle.length === 0 && semEfeito.length === 0 && ofereceEmVao.length === 0,
    `o interruptor de progresso aparece nas ${COM_EFEITO.length} rotas que ele muda e em nenhuma das outras`,
    [
      semControle.length ? `sem o controle onde deveria: ${semControle.join(', ')}` : '',
      semEfeito.length ? `com o controle e sem efeito: ${semEfeito.join(', ')}` : '',
      ofereceEmVao.length ? `oferecido sem ter o que revelar: ${ofereceEmVao.join(', ')}` : '',
    ].filter(Boolean).join(' | '),
  );

  // A escolha atravessa páginas, como o idioma.
  //
  // O estado é estabelecido AQUI. Antes esta asserção herdava o overlay ligado
  // pelo teste de cima e passava por tabela, que é a armadilha escrita no
  // CLAUDE.md: só apareceu quando a asserção da F8 entrou no meio e limpou o
  // localStorage, e aí ela reprovou de imediato.
  await pagina.goto(`${base}/pal/anubis/`);
  await pagina.waitForTimeout(200);
  await pagina.locator('#alternar-progresso').click();
  await pagina.waitForTimeout(150);
  const ligouAntes = await pagina.evaluate(() => document.documentElement.hasAttribute('data-progresso'));
  await pagina.goto(`${base}/pal/mozzarina/`);
  await pagina.waitForTimeout(200);
  const persistiu = await pagina.evaluate(() => document.documentElement.hasAttribute('data-progresso'));
  conferir(
    ligouAntes && persistiu,
    'a escolha do overlay persiste entre páginas',
    !ligouAntes ? 'o overlay nem chegou a ligar, então persistir não prova nada' : 'não persistiu',
  );

  // Sem JavaScript o overlay não existe, e a wiki continua inteira.
  const semJs = await navegador.newContext({ javaScriptEnabled: false });
  const pagSemJs = await semJs.newPage();
  await pagSemJs.goto(`${base}/pal/anubis/`);
  const vazandoSemJs = await pagSemJs.evaluate(() =>
    [...document.querySelectorAll('.so-com-progresso, .so-sem-registro')]
      .filter((el) => el.getBoundingClientRect().height > 0).length);
  const fichaInteira = await pagSemJs.evaluate(() => document.querySelectorAll('.apt-barra').length);
  await semJs.close();
  conferir(vazandoSemJs === 0 && fichaInteira > 0, 'sem JavaScript o site é a wiki completa e sem overlay', `${vazandoSemJs} do save visíveis, ${fichaInteira} barras de aptidão`);

  await pagina.evaluate(() => localStorage.removeItem('palworld-wiki-progresso'));

  // 12. o fundo do mapa carrega em tile, e os marcadores caem no pixel certo
  //     da imagem (H6).
  //
  // O `npm run mapa:fundo` já mede onde os pontos caem, mas ele mede com a
  // conta DELE, em Node. Quem desenha é outro código, no navegador, e ele tem
  // um jeito próprio de errar: em CRS.Simple a conversão de pixel para
  // coordenada depende do nível de zoom que você passa para o `unproject`, e
  // passar o nível errado desloca TODOS os marcadores mantendo o mapa com cara
  // de mapa. Nenhuma checagem de dado pega isso.
  //
  // A régua é o próprio tile. Ele diz, no `src`, qual nível e qual pedaço da
  // imagem está mostrando, e o `getBoundingClientRect` diz onde ele está na
  // tela. Com esses dois, a posição de cada marcador na tela volta para pixel
  // da imagem original, e aí dá para comparar com a conta feita aqui a partir
  // dos JSON. Se a página e o dado discordarem, é erro de desenho.
  //
  // A tolerância é de 40 pixels da imagem nativa, que é o tamanho de um pixel
  // de tela e meio no zoom em que a página abre. Ela não é frouxa: o modo de
  // falha que isto cobre desloca por milhares, não por dezenas.
  const dadosMapa = JSON.parse(await readFile(join(raiz, 'src/data/mapa.json'), 'utf-8'));
  const projMapa = JSON.parse(await readFile(join(raiz, 'src/data/projecao-mapa.json'), 'utf-8'));
  const fundoMapa = JSON.parse(await readFile(join(raiz, 'src/data/mapa-fundo.json'), 'utf-8'));
  const lim = projMapa.limites_por_build[projMapa.build_ativa];
  const ladoImg = fundoMapa.imagem_original.largura;
  const nativo = fundoMapa.tiles.niveis - 1;

  await pagina.goto(`${base}/mapa/`);
  await pagina.waitForTimeout(2500);
  const medido = await pagina.evaluate(() => {
    const cont = document.getElementById('mapa');
    if (!cont) return null;
    const caixa = cont.getBoundingClientRect();
    const tiles = [...cont.querySelectorAll('img.leaflet-tile')].filter((i) => i.naturalWidth > 0);
    const t = tiles[0];
    const rotulo = t && t.src.match(/\/mapa\/(\d+)\/(\d+)_(\d+)\.webp/);
    const r = t && t.getBoundingClientRect();
    return {
      tiles: tiles.length,
      niveis: [...new Set(tiles.map((i) => i.src.match(/\/mapa\/(\d+)\//)?.[1]))],
      z: rotulo ? Number(rotulo[1]) : null,
      tx: rotulo ? Number(rotulo[2]) : null,
      ty: rotulo ? Number(rotulo[3]) : null,
      tile: r ? { x: r.x - caixa.x, y: r.y - caixa.y, lado: r.width } : null,
      marcadores: [...cont.querySelectorAll('path.marcador')].map((el) => {
        const b = el.getBoundingClientRect();
        return { x: b.x + b.width / 2 - caixa.x, y: b.y + b.height / 2 - caixa.y };
      }),
    };
  });

  // Falta de insumo é falha, nunca passagem: sem tile carregado ou sem marcador
  // desenhado esta asserção não compara nada.
  if (!medido || !medido.tiles || !medido.tile || !medido.marcadores.length) {
    falha(
      'o fundo do mapa carrega em tile e os marcadores caem no pixel certo da imagem ' +
      `(${medido ? `${medido.tiles} tiles carregados, ${medido.marcadores?.length ?? 0} marcadores` : 'a página do mapa não abriu'})`,
    );
  } else {
    // Quantos pixels da imagem nativa cabem num pixel de tela, medido no tile.
    const nativoPorTile = fundoMapa.tiles.lado * 2 ** (nativo - medido.z);
    const nativoPorTela = nativoPorTile / medido.tile.lado;
    const paraNativo = (px, py) => [
      medido.tx * nativoPorTile + (px - medido.tile.x) * nativoPorTela,
      medido.ty * nativoPorTile + (py - medido.tile.y) * nativoPorTela,
    ];
    const esperados = dadosMapa.marcadores.map((m) => [
      ((m.x - lim.min_x) / lim.lado) * ladoImg,
      (1 - (m.y - lim.min_y) / lim.lado) * ladoImg,
    ]);
    let pior = 0;
    for (const marca of medido.marcadores) {
      const [nx, ny] = paraNativo(marca.x, marca.y);
      const perto = Math.min(...esperados.map(([ex, ey]) => Math.hypot(ex - nx, ey - ny)));
      if (perto > pior) pior = perto;
    }
    conferir(
      pior <= 40,
      `o fundo do mapa carrega em tile e os ${medido.marcadores.length} marcadores caem no pixel certo da imagem`,
      `pior desvio ${pior.toFixed(0)} px da imagem nativa, teto 40. Nível ${medido.z}, ${medido.tiles} tiles`,
    );
  }

  // 13. o controle de camadas diz quantos pontos cada uma tem.
  //
  // Sem o número, marcar a caixa é a única forma de descobrir se a categoria
  // vale a pena, e "Pesca" e "Sem categoria no paldb" parecem a mesma oferta
  // até você ver 3.232 contra zero. A asserção compara com a contagem feita
  // aqui, a partir do JSON, em vez de aceitar qualquer número na tela: rótulo
  // que mostra um número errado é pior que rótulo sem número.
  const pontosJson = JSON.parse(await readFile(join(raiz, 'src/data/mapa-pontos.json'), 'utf-8'));
  const esperadoPorCat = {};
  for (const chave of Object.keys(pontosJson.categorias)) esperadoPorCat[chave] = 0;
  for (const p of [...pontosJson.pontos, ...pontosJson.extras]) {
    const cat = pontosJson.tipos[p.t]?.categoria;
    if (cat in esperadoPorCat) esperadoPorCat[cat]++;
  }
  const naTela = await pagina.evaluate(() =>
    Object.fromEntries([...document.querySelectorAll('#filtros-paldb .filtro')].map((l) => [
      l.querySelector('input').value,
      l.querySelector('.quantos')?.textContent.trim() ?? null,
    ])));
  const contasErradas = Object.entries(esperadoPorCat).filter(
    ([chave, n]) => naTela[chave] !== n.toLocaleString('pt-BR'));
  conferir(
    Object.keys(naTela).length === Object.keys(esperadoPorCat).length && contasErradas.length === 0,
    `o controle de camadas mostra a contagem de cada uma das ${Object.keys(esperadoPorCat).length} categorias`,
    contasErradas.length
      ? `erradas: ${contasErradas.slice(0, 3).map(([c, n]) => `${c} mostra "${naTela[c]}" e são ${n}`).join(', ')}`
      : `${Object.keys(naTela).length} rótulos na tela para ${Object.keys(esperadoPorCat).length} categorias`,
  );

  // 14. o marcador de alfa traz o nível, e a busca acha e vai até o ponto.
  //
  // O nível no marcador é o dado que decide se dá para enfrentar aquele alfa
  // agora, e ele só existe em DOM porque número não se desenha no canvas do
  // Leaflet, onde moram os outros 13.755 pontos. Se alguém devolver o alfa para
  // o canvas, o mapa continua bonito e o número some sem erro nenhum.
  //
  // A busca é conferida ponta a ponta, incluindo a parte que dá trabalho: ela
  // acha um ponto de camada DESLIGADA, liga a camada e abre o popup. Buscar só
  // no que está marcado faria "não achei" e "está desmarcado" darem a mesma
  // resposta na tela.
  const alfasEsperados = [...pontosJson.pontos, ...pontosJson.extras]
    .filter((p) => p.t === 'Alpha Pal' && typeof p.lv === 'number');
  await pagina.evaluate(() => {
    const cx = document.querySelector('#filtros-paldb input[value="Enemies"]');
    cx.checked = true;
    cx.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await pagina.waitForTimeout(600);
  // De longe o número fica escondido de propósito, senão "62" ao lado de "60"
  // vira "6260". Então a asserção aproxima antes de olhar: contar elemento com
  // display none seria aprovar uma etiqueta que ninguém enxerga, que é o mesmo
  // placebo do teste por file://.
  for (let i = 0; i < 3; i++) {
    await pagina.click('.leaflet-control-zoom-in');
    await pagina.waitForTimeout(400);
  }
  await pagina.waitForTimeout(600);
  const etiquetas = await pagina.evaluate(() =>
    [...document.querySelectorAll('#mapa .alfa b')].map((b) => ({
      txt: b.textContent.trim(),
      alto: b.getBoundingClientRect().height > 0,
    })));
  const niveisEsperados = new Set(alfasEsperados.map((p) => String(p.lv)));
  const visiveisAlfa = etiquetas.filter((e) => e.alto).length;
  conferir(
    alfasEsperados.length > 0
      && etiquetas.length === alfasEsperados.length
      && visiveisAlfa > 0
      && etiquetas.every((e) => niveisEsperados.has(e.txt)),
    `o marcador de cada um dos ${alfasEsperados.length} Pals alfa mostra o nível`,
    `${etiquetas.length} etiquetas na tela para ${alfasEsperados.length} alfas com nível no JSON, ${visiveisAlfa} com altura maior que zero`,
  );

  // O marcador do alfa é bola E número lado a lado, e essa parte quebra sem dar
  // erro: a folha do Leaflet traz `.leaflet-marker-icon { display: block }` com
  // a mesma especificidade da nossa classe e carregada depois, e ganhava. A
  // bola virava caixa em linha de 2 por 16 px. Só apareceu numa imagem, então
  // aqui a medida é a geometria: bola quadrada, e número à direita dela.
  const formaAlfa = await pagina.evaluate(() => {
    const el = document.querySelector('#mapa .alfa');
    if (!el) return null;
    const bola = el.querySelector('i').getBoundingClientRect();
    const num = el.querySelector('b').getBoundingClientRect();
    return {
      display: getComputedStyle(el).display,
      largura: Math.round(bola.width), altura: Math.round(bola.height),
      numeroADireita: num.left >= bola.right - 1,
    };
  });
  conferir(
    formaAlfa && formaAlfa.display === 'flex'
      && formaAlfa.largura >= 6 && Math.abs(formaAlfa.largura - formaAlfa.altura) <= 2
      && formaAlfa.numeroADireita,
    'o marcador do alfa é bola redonda com o número ao lado, e não empilhado',
    formaAlfa
      ? `display ${formaAlfa.display}, bola ${formaAlfa.largura}x${formaAlfa.altura}, número à direita ${formaAlfa.numeroADireita}`
      : 'nenhum marcador de alfa no mapa',
  );

  // Desliga de novo, para a busca ter mesmo que ligar a camada sozinha.
  await pagina.evaluate(() => {
    const cx = document.querySelector('#filtros-paldb input[value="Enemies"]');
    cx.checked = false;
    cx.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await pagina.waitForTimeout(400);
  const alvoBusca = alfasEsperados.find((p) => p.en && /^[\w ]{5,}$/.test(p.en));
  if (!alvoBusca) {
    falha('a busca do mapa acha um ponto de camada desligada (nenhum alfa com nome utilizável no JSON, então a busca não pôde ser testada)');
  } else {
    await pagina.fill('#busca-mapa', alvoBusca.en);
    await pagina.waitForTimeout(500);
    const achados = await pagina.evaluate(() => ({
      itens: document.querySelectorAll('#busca-lista button').length,
      conta: document.getElementById('busca-conta').textContent.trim(),
      ligada: document.querySelector('#filtros-paldb input[value="Enemies"]').checked,
    }));
    // Clicar num resultado que não existe derruba o teste com exceção em vez de
    // reprovar com explicação, e teste que estoura some do resumo.
    let depois = { popup: '', ligada: achados.ligada };
    if (achados.itens > 0) {
      await pagina.click('#busca-lista button');
      await pagina.waitForTimeout(1200);
      depois = await pagina.evaluate(() => ({
        popup: document.querySelector('.leaflet-popup-content')?.textContent.trim() ?? '',
        ligada: document.querySelector('#filtros-paldb input[value="Enemies"]').checked,
      }));
    }
    conferir(
      achados.itens > 0 && achados.ligada === false
        && depois.ligada === true && depois.popup.includes(alvoBusca.en),
      'a busca do mapa acha um ponto de camada desligada, liga a camada e abre o ponto',
      `procurando "${alvoBusca.en}": ${achados.itens} resultados, camada antes ${achados.ligada}, depois ${depois.ligada}, popup "${depois.popup.slice(0, 40)}"`,
    );
    await pagina.fill('#busca-mapa', '');
  }

  conferir(errosJs.length === 0, 'nenhum erro de JavaScript no site', errosJs.slice(0, 2).join(' | '));
  await pagina.close();
}

// ------------------------------------------------------------ os dois temas
//
// Bloco próprio, com página própria, porque cada asserção daqui depende de um
// localStorage e de uma preferência de sistema específicos. Rodar isto no meio
// do bloco anterior herdaria a escolha que outro teste deixou gravada, e o
// resultado passaria ou falharia por acidente: já aconteceu neste arquivo com o
// idioma, que passou porque o teste anterior tinha deixado a página em inglês.
//
// newPage() do Playwright abre contexto novo, então o armazenamento nasce
// limpo em cada um destes.
{
  const fundoDe = (p) => p.evaluate(() => ({
    tema: document.documentElement.dataset.tema,
    fundo: getComputedStyle(document.body).backgroundColor,
    texto: getComputedStyle(document.body).color,
  }));

  // 1. sem escolha gravada, vale a preferência do sistema, nos dois sentidos.
  const semEscolha = {};
  for (const esquema of ['light', 'dark']) {
    const p = await navegador.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: esquema });
    await p.goto(`${base}/`);
    await p.waitForTimeout(150);
    semEscolha[esquema] = await fundoDe(p);
    await p.close();
  }
  conferir(
    semEscolha.light.tema === 'claro' && semEscolha.dark.tema === 'escuro'
      && semEscolha.light.fundo !== semEscolha.dark.fundo,
    'sem escolha, o tema segue a preferência do sistema',
    `sistema claro deu "${semEscolha.light.tema}" (${semEscolha.light.fundo}), sistema escuro deu "${semEscolha.dark.tema}" (${semEscolha.dark.fundo})`,
  );

  // 2. o botão troca de verdade, e a troca chega ao pixel. Conferir só o
  //    atributo aprovaria um tema declarado e não desenhado.
  const p = await navegador.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
  await p.goto(`${base}/`);
  await p.waitForTimeout(150);
  const antesDoClique = await fundoDe(p);
  await p.click('[data-tema-btn="claro"]');
  await p.waitForTimeout(150);
  const depoisDoClique = await fundoDe(p);
  // E persiste ao mudar de página, como a escolha de idioma.
  await p.goto(`${base}/breeding/`);
  await p.waitForTimeout(150);
  const outraPagina = await fundoDe(p);
  conferir(
    antesDoClique.tema === 'escuro' && depoisDoClique.tema === 'claro'
      && depoisDoClique.fundo !== antesDoClique.fundo
      && depoisDoClique.texto !== antesDoClique.texto
      && outraPagina.tema === 'claro' && outraPagina.fundo === depoisDoClique.fundo,
    'o botão troca o tema e a escolha persiste entre páginas',
    `antes ${antesDoClique.tema}/${antesDoClique.fundo}, depois ${depoisDoClique.tema}/${depoisDoClique.fundo}, outra página ${outraPagina.tema}/${outraPagina.fundo}`,
  );

  // 3. a escolha do usuário vence a do sistema NOS DOIS SENTIDOS. Um tema que
  //    só sobrevive quando concorda com o sistema não é escolha, é coincidência.
  //    Aqui o sistema é o oposto do gravado de propósito.
  const contra = {};
  for (const [esquema, gravado] of [['dark', 'claro'], ['light', 'escuro']]) {
    const q = await navegador.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: esquema });
    await q.goto(`${base}/`);
    await q.evaluate((t) => localStorage.setItem('palworld-wiki-tema', t), gravado);
    await q.goto(`${base}/breeding/`);
    await q.waitForTimeout(150);
    contra[gravado] = (await fundoDe(q)).tema;
    await q.close();
  }
  conferir(
    contra.claro === 'claro' && contra.escuro === 'escuro',
    'a escolha do usuário vence a do sistema nos dois sentidos',
    `claro gravado com sistema escuro deu "${contra.claro}", escuro gravado com sistema claro deu "${contra.escuro}"`,
  );
  await p.close();
}

// ------------------------------------------------------ pacote offline
if (existsSync(offline)) {
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 } });
  const errosJs = [];
  pagina.on('pageerror', (e) => errosJs.push(e.message));
  await pagina.goto(`file://${offline}`);
  await pagina.waitForTimeout(300);

  // 6. todo link do menu abre uma página, e só uma.
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

  // 7. um item ativo por vez no menu.
  //    Quebrou porque a casca copiada trouxe o aria-current da página de origem.
  const ativos = await pagina.evaluate(() => document.querySelectorAll('.lateral a.ativo, .lateral [aria-current]').length);
  conferir(ativos === 1, 'menu offline destaca um item por vez', `${ativos} destacados`);

  // 8. o pacote offline traz TODAS as páginas do dist, não só as de primeiro nível.
  //    Quebrou porque a varredura olhava um nível só: as 299 fichas de Pal
  //    ficavam de fora e o contador de páginas esperadas era calculado da mesma
  //    lista incompleta, então nunca acusava a falta. O alvo é comparado com o
  //    que o build gerou de verdade, e não com um número escrito aqui, senão o
  //    teste envelhece junto com o catálogo.
  const noDist = (async function contar(pasta) {
    let total = 0;
    for (const item of await readdir(pasta, { withFileTypes: true })) {
      if (!item.isDirectory()) { if (item.name === 'index.html') total++; continue; }
      if (['_astro', 'pagefind'].includes(item.name)) continue;
      total += await contar(join(pasta, item.name));
    }
    return total;
  });
  const esperadas = await noDist(dist);
  const empacotadas = await pagina.evaluate(() => document.querySelectorAll('.pagina').length);
  conferir(empacotadas === esperadas, 'o offline empacota todas as páginas do build', `${empacotadas} no arquivo, ${esperadas} no dist`);

  // E o conteúdo tem que estar buscável, não só presente: a ficha de Pal não
  // aparece no menu, então a busca em memória é o único caminho até ela.
  await pagina.fill('#busca', 'aegidron');
  await pagina.waitForTimeout(200);
  const achados = await pagina.evaluate(() =>
    [...document.querySelectorAll('#resultados li a')].map((a) => a.getAttribute('href')));
  conferir(achados.includes('#pal/aegidron'), 'a busca offline acha um Pal que só existe em ficha', `achou: ${achados.slice(0, 3).join(', ') || 'nada'}`);
  await pagina.fill('#busca', '');

  // 9. a ficha em popover também funciona no arquivo único, e por teclado.
  //    Aqui file:// está CERTO, ao contrário do teste do site: o CSS do pacote é
  //    embutido, então getComputedStyle mede o estilo de verdade.
  //
  //    Esta asserção existe por dois defeitos que só aparecem no pacote e nunca
  //    no site: o popover mora fora do <main> e não vinha no corpo de página
  //    nenhuma, e os módulos, colados num <script> clássico só, dividiam escopo
  //    e se destruíam no primeiro nome minificado repetido. Os dois sintomas são
  //    idênticos: o nome fica sublinhado e nada abre.
  await pagina.evaluate(() => { location.hash = '#breeding'; });
  await pagina.waitForTimeout(200);
  const ALVO_OFF = '.pagina:not([hidden]) [data-pal]';
  const lerFichaOff = () => pagina.evaluate(() => {
    const c = document.getElementById('ficha-pal');
    if (!c) return null;
    return {
      visivel: !c.hidden && getComputedStyle(c).display !== 'none',
      nome: c.querySelector('.nome')?.textContent || '',
      aptidoes: c.querySelectorAll('.apt').length,
    };
  });

  const temNomes = await pagina.locator(ALVO_OFF).count();
  const antesOff = await lerFichaOff();
  const esperadoOff = temNomes ? await pagina.getAttribute(ALVO_OFF, 'data-pal') : null;
  if (temNomes) {
    await pagina.focus(ALVO_OFF);
    await pagina.waitForTimeout(120);
  }
  const comFocoOff = temNomes ? await lerFichaOff() : null;
  conferir(
    temNomes > 0 && antesOff?.visivel === false && comFocoOff?.visivel === true
      && comFocoOff.nome === esperadoOff && comFocoOff.aptidoes > 0,
    'a ficha do Pal abre por teclado no pacote offline',
    !temNomes ? 'nenhum nome de Pal marcado na página aberta'
      : !antesOff ? 'o popover não foi empacotado: #ficha-pal não existe no arquivo'
      : antesOff.visivel ? 'nasceu aberta, o resto do teste não provaria nada'
      : `com foco: visível ${comFocoOff.visivel}, nome "${comFocoOff.nome}" para "${esperadoOff}", ${comFocoOff.aptidoes} aptidões`,
  );

  // Esc fecha E devolve o foco para o nome. Fechar sem devolver o foco larga
  // quem navega por teclado no começo da página.
  //
  // A condição exige que a ficha estivesse ABERTA antes do Esc, e isso não é
  // zelo: sem essa parte a asserção passava com o popover morto, porque
  // "fechada depois do Esc" é verdade trivial quando ela nunca abriu e o foco
  // continua onde o próprio teste o colocou. Foi pega sabotando.
  await pagina.keyboard.press('Escape');
  await pagina.waitForTimeout(120);
  const depoisEscOff = await lerFichaOff();
  const focoVoltou = await pagina.evaluate(() => document.activeElement?.dataset?.pal || null);
  conferir(
    comFocoOff?.visivel === true && depoisEscOff?.visivel === false && focoVoltou === esperadoOff,
    'no offline, Esc fecha a ficha e devolve o foco ao nome',
    comFocoOff?.visivel !== true ? 'a ficha nem chegou a abrir, então fechar não prova nada'
      : `visível depois do Esc: ${depoisEscOff?.visivel}, foco em "${focoVoltou}" para "${esperadoOff}"`,
  );

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
