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
      const alvo = h.replace(/^\/|\/$/g, '').split('#')[0].split('?')[0];
      if (!existentes.has(alvo) && !alvo.startsWith('_astro')) quebrados.push(`${rota} -> ${h}`);
    }
  }
  conferir(quebrados.length === 0, 'nenhum link interno quebrado', quebrados.slice(0, 4).join(' | '));

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
    const antes = await pagina.evaluate(() => document.querySelectorAll('#tabela tbody tr:not(.escondida)').length);
    const total = await pagina.evaluate(() => document.querySelectorAll('#tabela tbody tr').length);
    await pagina.fill('#filtro', 'zzzznaoexiste');
    await pagina.waitForTimeout(200);
    const depois = await pagina.evaluate(() => document.querySelectorAll('#tabela tbody tr:not(.escondida)').length);
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

  // A escolha atravessa páginas, como o idioma.
  await pagina.goto(`${base}/pal/mozzarina/`);
  await pagina.waitForTimeout(200);
  const persistiu = await pagina.evaluate(() => document.documentElement.hasAttribute('data-progresso'));
  conferir(persistiu, 'a escolha do overlay persiste entre páginas');

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
