/**
 * Verifica se saiu patch novo de Palworld e diz o que na wiki pode ter quebrado.
 *
 *   npm run patch:verificar
 *
 * Puxa as notícias oficiais do jogo pela API pública da Steam, compara com a
 * versão que a wiki declara conhecer, e quando há novidade lista os termos do
 * patch que aparecem no conteúdo, para virar fila de revisão.
 *
 * Não altera nada sozinho. A decisão de mudar a wiki continua sendo humana.
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const registro = join(raiz, 'src', 'data', 'versao.json');
const APP_ID = 1623730;

// Palavras que, aparecendo numa nota de patch, indicam que algo da wiki mudou.
// Estão nos dois idiomas porque as notas oficiais saem em inglês.
const SINAIS = [
  'work suitability', 'aptidão', 'breeding', 'acasalamento', 'condens',
  'cake', 'bolo', 'incubat', 'incubad', 'passive', 'passiva', 'raid', 'invasão',
  'level cap', 'nível máximo', 'balance', 'balanceamento', 'adjust', 'ajust',
  'increase', 'aumentad', 'decrease', 'reduzid', 'nerf', 'buff',
  'recipe', 'receita', 'technology', 'tecnologia', 'sanity', 'san',
];

async function noticias() {
  const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${APP_ID}&count=15&maxlength=4000`;
  const r = await fetch(url, { headers: { 'user-agent': 'wiki-palworld-amigos/1.0' } });
  if (!r.ok) throw new Error(`Steam respondeu ${r.status}`);
  const d = await r.json();
  return (d.appnews?.newsitems || []).map((n) => ({
    titulo: n.title,
    data: new Date(n.date * 1000).toISOString().slice(0, 10),
    texto: (n.contents || '').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim(),
    url: n.url,
  }));
}

// Reconhece "v1.0.2", "1.0.2.101103", "Update 1.100.933"
function extrairVersao(texto) {
  const m = texto.match(/\bv?(\d+\.\d+\.\d+(?:\.\d+)?)\b/);
  return m ? m[1] : null;
}

const comparar = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
};

async function paginasDaWiki() {
  const pasta = join(raiz, 'src', 'content', 'wiki');
  const arquivos = (await readdir(pasta)).filter((f) => f.endsWith('.md'));
  return Promise.all(arquivos.map(async (f) => ({
    arquivo: f,
    texto: (await readFile(join(pasta, f), 'utf-8')).toLowerCase(),
  })));
}

/**
 * Compara os TRÊS números que existem, e não dois (R3.5, tarefa B2):
 *
 *   1. a versão que a wiki declara cobrir
 *   2. a versão publicada pela Pocketpair
 *   3. a versão instalada nas máquinas do grupo
 *
 * O terceiro é o que faltava, e ele não é detalhe: o mundo é co-op por código
 * de convite, e cliente e host em versões diferentes não se enxergam. A wiki
 * pode estar em dia com o jogo e o grupo continuar sem conseguir jogar junto.
 *
 * Nunca sai com erro. Cliente atrasado é aviso para o grupo, não defeito de
 * conteúdo, e quebrar o build por isso pararia o deploy de uma correção de
 * texto por causa de um jogo que ninguém atualizou.
 */
function compararAsTres(registro, publicada) {
  const wiki = registro.versao;
  const cliente = registro.cliente_do_grupo;

  console.log('');
  console.log('  as três versões:');
  console.log(`    wiki cobre           ${wiki}`);
  console.log(`    jogo publicado       ${publicada || 'não lido'}`);
  console.log(`    cliente do grupo     ${cliente || 'não registrado, veja a tela de título do jogo'}`);

  if (!cliente) {
    console.log('  ~ registre `cliente_do_grupo` em src/data/versao.json para esta conferência valer.');
    return;
  }

  const atrasados = [];
  if (publicada && comparar(wiki, publicada) < 0) atrasados.push(`a wiki, que cobre ${wiki} e o jogo já está em ${publicada}`);
  if (publicada && comparar(cliente, publicada) < 0) atrasados.push(`o cliente do grupo, em ${cliente} contra ${publicada} publicada`);
  if (comparar(cliente, wiki) < 0) atrasados.push(`o cliente do grupo em relação à própria wiki, que documenta ${wiki}`);

  if (!atrasados.length) {
    console.log('  os três batem.');
    return;
  }
  console.log('');
  for (const a of atrasados) console.log(`  ~ está atrás: ${a}`);
  if (comparar(cliente, publicada || wiki) < 0) {
    console.log('  Atualizem juntos: em co-op por convite, cliente e host precisam estar na mesma versão.');
  }
}

async function main() {
  const conhecida = existsSync(registro)
    ? JSON.parse(await readFile(registro, 'utf-8'))
    : { versao: '1.0.2', verificado_em: null, ultimas_notas: [] };

  console.log(`  wiki declara conhecer a versão ${conhecida.versao}`);
  console.log('  consultando as notícias oficiais do jogo...');

  const lista = await noticias();
  const patches = lista
    .map((n) => ({ ...n, versao: extrairVersao(n.titulo) || extrairVersao(n.texto.slice(0, 200)) }))
    .filter((n) => n.versao);

  if (!patches.length) {
    console.log('  nenhuma nota com número de versão nas notícias recentes.');
    return;
  }

  const maisNova = patches.reduce((a, b) => (comparar(a.versao, b.versao) >= 0 ? a : b));
  console.log(`  versão mais recente publicada: ${maisNova.versao} (${maisNova.data})`);

  // Roda ANTES do retorno antecipado: com a wiki em dia o script saía sem dizer
  // nada, e era justamente o caso em que o cliente do grupo atrasado passava
  // despercebido.
  compararAsTres(conhecida, maisNova.versao);

  if (comparar(maisNova.versao, conhecida.versao) <= 0) {
    console.log('');
    console.log('  a wiki está em dia com o jogo publicado. Nada a revisar.');
    return;
  }

  console.log('');
  console.log(`  >> PATCH NOVO: ${maisNova.versao}`);
  console.log(`     ${maisNova.titulo}`);
  console.log(`     ${maisNova.url}`);
  console.log('');

  const texto = maisNova.texto.toLowerCase();
  const achados = SINAIS.filter((s) => texto.includes(s));

  if (!achados.length) {
    console.log('  Nenhum sinal de mudança de mecânica nas notas. Provavelmente só correções.');
  } else {
    console.log(`  Assuntos citados no patch que a wiki cobre: ${achados.join(', ')}`);
    console.log('');
    console.log('  Páginas para revisar, da mais provável para a menos:');
    const paginas = await paginasDaWiki();
    const ranking = paginas
      .map((p) => ({ arquivo: p.arquivo, peso: achados.filter((s) => p.texto.includes(s)).length }))
      .filter((p) => p.peso > 0)
      .sort((a, b) => b.peso - a.peso);
    if (!ranking.length) console.log('    nenhuma correspondência direta');
    for (const r of ranking) console.log(`    ${String(r.peso).padStart(2)} sinais  ${r.arquivo}`);
  }

  console.log('');
  console.log('  Trecho das notas:');
  console.log('  ' + maisNova.texto.slice(0, 500).replace(/(.{95})/g, '$1\n  '));
  console.log('');
  console.log(`  Depois de revisar, registre a nova versão rodando:`);
  console.log(`    npm run patch:registrar ${maisNova.versao}`);

  await writeFile(registro, JSON.stringify({
    ...conhecida,
    verificado_em: new Date().toISOString().slice(0, 10),
    versao_publicada: maisNova.versao,
    pendente_revisao: true,
    ultimas_notas: patches.slice(0, 5).map((p) => ({ versao: p.versao, data: p.data, titulo: p.titulo, url: p.url })),
  }, null, 2) + '\n', 'utf-8');
}

// npm run patch:registrar 1.0.3
if (process.argv[2] === '--registrar') {
  const nova = process.argv[3];
  if (!nova) { console.error('informe a versão. ex: npm run patch:registrar 1.0.3'); process.exit(1); }
  const atual = existsSync(registro) ? JSON.parse(await readFile(registro, 'utf-8')) : {};
  await writeFile(registro, JSON.stringify({
    ...atual, versao: nova, pendente_revisao: false,
    revisado_em: new Date().toISOString().slice(0, 10),
  }, null, 2) + '\n', 'utf-8');
  console.log(`  wiki registrada como revisada para a versão ${nova}`);
} else {
  main().catch((e) => { console.error('falhou:', e.message); process.exit(1); });
}
