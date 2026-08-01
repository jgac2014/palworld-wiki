/**
 * Monta o dicionário bilíngue da wiki a partir do paldb, que serve os dados
 * dataminados do jogo nos dois idiomas.
 *
 * Duas fontes:
 *   1. paldb.cc/json/i18n_{pt,en}.json  — strings de interface do jogo
 *   2. paldb.cc/{pt,en}/<Slug>          — nome de cada entidade, lido do og:title
 *
 * Só busca os termos que a wiki realmente usa (a lista abaixo), com pausa entre
 * requisições e cache local. Rode quando sair um patch:
 *
 *   npm run termos:atualizar
 *
 * O resultado vai para src/data/termos.json e é o que alimenta o seletor de idioma.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = join(raiz, 'src', 'data', 'termos.json');
const AGENTE = 'Mozilla/5.0 (compatible; wiki-palworld-amigos/1.0)';
const PAUSA_MS = 350;

// Chaves de interface do jogo que a wiki usa. Vêm prontas do i18n do paldb.
const CHAVES_UI = [
  'common_work_suitability',
  'common_work_suitability_emitflame',
  'common_work_suitability_watering',
  'common_work_suitability_seeding',
  'common_work_suitability_generateelectricity',
  'common_work_suitability_handcraft',
  'common_work_suitability_collection',
  'common_work_suitability_deforest',
  'common_work_suitability_mining',
  'common_work_suitability_productmedicine',
  'common_work_suitability_cool',
  'common_work_suitability_transport',
  'common_work_suitability_monsterfarm',
  'common_work_suitability_oilextraction',
  'ingame_main_menu_inventory',
  'ingame_main_menu_technology',
  'mapobject_name_breedfarm',
];

// Entidades cujo nome precisa aparecer nos dois idiomas.
// A chave é o identificador estável; o valor é o slug no paldb.
const ENTIDADES = {
  // estruturas
  breeding_farm:      'Breeding_Farm',
  ranch:              'Ranch',
  palbox:             'Palbox',
  egg_incubator:      'Egg_Incubator',
  large_incubator:    'Large_Incubator',
  cooking_pot:        'Cooking_Pot',
  feed_box:           'Feed_Box',
  hot_spring:         'Hot_Spring',
  condenser:          'Pal_Essence_Condenser',
  production_line:    'Production_Assembly_Line',
  electric_furnace:   'Electric_Furnace',
  power_generator:    'Power_Generator',
  guild_chest:        'Guild_Chest',
  ore_mining_site:    'Ore_Mining_Site',
  wheat_plantation:   'Wheat_Plantation',
  berry_plantation:   'Berry_Plantation',
  mill:               'Mill',
  statue_of_power:    'Statue_of_Power',
  // itens
  cake:               'Cake',
  vegetable_cake:     'Vegetable_Cake',
  mushroom_cake:      'Mushroom_Cake',
  special_cake:       'Special_Cake',
  pal_sphere:         'Pal_Sphere',
  paldium_fragment:   'Paldium_Fragment',
  pure_quartz:        'Pure_Quartz',
  ring_of_mercy:      'Ring_of_Mercy',
  lifmunk_effigy:     'Lifmunk_Effigy',
  ancient_parts:      'Ancient_Civilization_Parts',
  ancient_core:       'Ancient_Civilization_Core',
  // estruturas, segunda leva
  clinic:             'Clinic',
  ancient_clinic:     'Ancient_Clinic',
  drafting_table:     'Drafting_Table',
  ancient_hatchery:   'Ancient_Hatchery',
  electric_incubator: 'Electric_Egg_Incubator',
  large_power_gen:    'Large_Power_Generator',
  pure_quartz_mine:   'Pure_Quartz_Mine',
  coal_mine:          'Coal_Mine',
  sulfur_mine:        'Sulfur_Mine',
  gold_coin_line:     'Gold_Coin_Assembly_Line',
  weapon_line:        'Weapon_Assembly_Line',
  sphere_line:        'Sphere_Assembly_Line',
  ancient_furnace:    'Ancient_Furnace',
  improved_furnace:   'Improved_Furnace',
  accumulator:        'Accumulator',
  electric_pylon:     'Electric_Pylon',
  palbox_terminal:    'Palbox_Control_Device',
  expedition_station: 'Pal_Expedition_Station',
  mounted_crossbow:   'Mounted_Crossbow',
  mounted_machinegun: 'Mounted_Machine_Gun',
  ore_mining_site_2:  'Ore_Mining_Site_II',
  ancient_synth:      'Ancient_Material_Synthesizer',
  relic_recycler:     'Ancient_Relic_Recycler',
  soralite_quarry:    'Soralite_Quarry',
  // itens, segunda leva
  extravagant_cake:   'Extravagant_Vegetable_Cake',
  holy_water:         'World_Tree_Holy_Water',
  radiant_gem:        'Radiant_Gem',
  awakening_crystal:  'Awakening_Crystal',
  crude_oil:          'Crude_Oil',
  soralite:           'Soralite',
  paloxite:           'Paloxite',
  hexolite:           'Hexolite_Quartz',
  polymer:            'Polymer',
  circuit_board:      'Circuit_Board',
  carbon_fiber:       'Carbon_Fiber',
  cement:             'Cement',
  nail:               'Nail',
  ingot:              'Ingot',
  refined_ingot:      'Refined_Ingot',
  pal_metal_ingot:    'Pal_Metal_Ingot',
  high_quality_cloth: 'High_Quality_Cloth',
  cotton_candy:       'Cotton_Candy',
  flour:              'Flour',
  honey:              'Honey',
  milk:               'Milk',
  egg_item:           'Egg',
  tomato:             'Tomato',
  lettuce:            'Lettuce',
  mushroom:           'Mushroom',
  cavern_mushroom:    'Cavern_Mushroom',
  metal_detector:     'Metal_Detector',
  plasma_multicutter: 'Plasma_Multicutter',
  corrosive_mask:     'Corrosive_Mist_Mask',
  echoing_flute:      'Echoing_Flute',
  memory_wiping:      'Memory_Wiping_Medicine',
  small_pal_soul:     'Small_Pal_Soul',
  gold_coin:          'Gold_Coin',
  ancient_manual:     'Ancient_Technical_Manual',
  // locais
  world_tree:         'The_World_Tree',
  sakurajima:         'Sakurajima',
  feybreak:           'Feybreak',
  palpagos:           'Palpagos_Islands',
};

/**
 * Passivas não têm página individual no paldb: vivem numa tabela em /Passive_Skills.
 * O mapeamento abaixo foi conferido cruzando a descrição de efeito nas duas versões
 * da página, então não há risco de linha trocada. Corrija aqui se algo mudar.
 */
/**
 * Termos sem página própria no paldb e sem entrada isolada nos dados de mapa.
 * Todos conferidos contra o texto do jogo em português durante a pesquisa.
 * Corrija aqui se alguma tradução mudar num patch.
 */
const MANUAIS = {
  local_world_tree:   { en: 'World Tree',           pt: 'Árvore Mundial' },
  local_sakurajima:   { en: 'Sakurajima',           pt: 'Ilha das Cerejeiras' },
  local_sanctuary:    { en: 'Wildlife Sanctuary',   pt: 'Zona de Caça Proibida' },
  local_palpagos:     { en: 'Palpagos',             pt: 'Palpagos' },
  radiant_gem:        { en: 'Radiant Gem',          pt: 'Fulgorita' },
  clinic:             { en: 'Clinic',               pt: 'Clínica' },
  ancient_clinic:     { en: 'Ancient Clinic',       pt: 'Clínica da Civilização Antiga' },
  paldeck:            { en: 'Paldeck',              pt: 'Palpédia' },
  capture_bonus:      { en: 'Capture Bonus',        pt: 'Bônus da Palpédia' },
  partner_skill:      { en: 'Partner Skill',        pt: 'Habilidade de companheiro' },
  active_skill:       { en: 'Active Skill',         pt: 'Habilidade ativa' },
  passive_skill:      { en: 'Passive Skill',        pt: 'Habilidade passiva' },
  raid:               { en: 'Raid',                 pt: 'Invasão' },
  alpha_pal:          { en: 'Alpha Pal',            pt: 'Pal Alfa' },
  lucky_pal:          { en: 'Lucky Pal',            pt: 'Pal Sortudo' },
  tower_boss:         { en: 'Tower Boss',           pt: 'Chefe de torre' },
  fast_travel:        { en: 'Fast Travel',          pt: 'Viagem rápida' },
  guild:              { en: 'Guild',                pt: 'Guilda' },
  schematic:          { en: 'Schematic',            pt: 'Esquema' },
  condensation:       { en: 'Condensation',         pt: 'Condensação' },
  work_speed:         { en: 'Work Speed',           pt: 'Velocidade de trabalho' },
  applied_handbook:   { en: 'Applied Handbook',     pt: 'Ciência Aplicada' },
  surgery_table:      { en: 'Surgery Table',        pt: 'Mesa de Operação de Pals' },
  base_camp:          { en: 'Base Camp',            pt: 'Base' },
  sanity:             { en: 'Sanity',               pt: 'SAN' },
};

const PASSIVAS = {
  artisan:     { en: 'Artisan',     pt: 'Espírito artesão',   efeito: 'Velocidade de trabalho +50%' },
  serious:     { en: 'Serious',     pt: 'Dedicado',           efeito: 'Velocidade de trabalho +20%' },
  lucky:       { en: 'Lucky',       pt: 'Da sorte',           efeito: 'Ataque +15%, trabalho +20%' },
  legend:      { en: 'Legend',      pt: 'Lendário',           efeito: 'Ataque, defesa e velocidade +20%' },
  ranch_master:{ en: 'Ranch Master',pt: 'Mestre Pecuarista',  efeito: 'Fazenda +2' },
  farmhand:    { en: 'Farmhand',    pt: 'Jovem Pecuarista',   efeito: 'Fazenda +1' },
  musclehead:  { en: 'Musclehead',  pt: 'Brutamontes',        efeito: 'Ataque +30%, trabalho -50%' },
  destructive: { en: 'Destructive', pt: 'Tendência suicida',  efeito: 'Perda de SAN +15%' },
  slacker:     { en: 'Slacker',     pt: 'Tendência ao ócio',  efeito: 'Velocidade de trabalho -30%' },
  clumsy:      { en: 'Clumsy',      pt: 'Desajeitado',        efeito: 'Velocidade de trabalho -10%' },
  diamond_body:{ en: 'Diamond Body',pt: 'Corpo de Diamante',  efeito: 'Defesa +30%, imune a flinch' },
  demon_god:   { en: 'Demon God',   pt: 'Deus Inclemente',    efeito: 'Ataque +30%, defesa +5%' },
  serenity:    { en: 'Serenity',    pt: 'Sossegado',          efeito: 'Recarga de habilidade -30%' },
  immortality: { en: 'Immortality', pt: 'Imortalidade',       efeito: 'Roubo de vida, só de mutação' },
  babysitter:  { en: 'Babysitter',  pt: 'Babá',               efeito: 'Ovos e incubação +30%' },
  swift:       { en: 'Swift',       pt: 'Vertiginoso',        efeito: 'Movimento +30%' },
  runner:      { en: 'Runner',      pt: 'Bom corredor',       efeito: 'Movimento +20%' },
  nimble:      { en: 'Nimble',      pt: 'Ligeiro',            efeito: 'Movimento +10%' },
  workaholic:  { en: 'Workaholic',  pt: 'Viciado no trabalho',efeito: 'Manutenção de SAN +15%' },
};

/**
 * Marcador de string não resolvida, o slot aparecendo no lugar do conteúdo.
 * Mesmo padrão do importador de catálogo, e pela mesma razão: o paldb publica
 * "pt-BR_Text" quando a localização do jogo não tem a string, e marcador
 * gravado como nome é mentira com cara de dado.
 */
const MARCADOR_SEM_TRADUCAO = /[a-z]{2}(?:-[A-Za-z]{2,4})?_Text/;
const temMarcador = (t) => MARCADOR_SEM_TRADUCAO.test(t?.pt || '') || MARCADOR_SEM_TRADUCAO.test(t?.en || '');

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function baixarJson(url) {
  const r = await fetch(url, { headers: { 'user-agent': AGENTE } });
  if (!r.ok) throw new Error(`${url} respondeu ${r.status}`);
  return r.json();
}

async function nomeDaEntidade(slug, idioma) {
  const r = await fetch(`https://paldb.cc/${idioma}/${slug}`, { headers: { 'user-agent': AGENTE } });
  if (!r.ok) return null;
  const html = await r.text();
  const m = html.match(/<meta property="og:title" content="([^"]*)"/);
  const nome = m?.[1]?.trim();
  // O paldb devolve o marcador da string, literalmente "pt-BR_Text", quando a
  // localização do jogo não tem aquele nome. A checagem existia aqui e não
  // servia para nada: reconhecia o marcador e devolvia ele assim mesmo, e foi
  // por isso que "Esfera de Pal" virou "pt-BR_Text" no glossário publicado.
  // Devolver null é o que faz o chamador cair para o inglês.
  if (!nome || MARCADOR_SEM_TRADUCAO.test(nome)) return null;
  return nome;
}

async function main() {
  const forcar = process.argv.includes('--forcar');
  let anterior = {};
  if (existsSync(saida) && !forcar) {
    anterior = JSON.parse(await readFile(saida, 'utf-8'));
  }

  console.log('  buscando dicionários de interface...');
  const [uiPt, uiEn] = await Promise.all([
    baixarJson('https://paldb.cc/json/i18n_pt.json'),
    baixarJson('https://paldb.cc/json/i18n_en.json'),
  ]);

  const termos = { ...(anterior.termos || {}) };
  let novos = 0, mudados = 0;

  for (const chave of CHAVES_UI) {
    const pt = uiPt[chave], en = uiEn[chave];
    if (!pt || !en) { console.log(`  ! sem tradução para ${chave}`); continue; }
    const id = chave.replace('common_work_suitability_', 'apt_').replace('common_work_suitability', 'apt');
    if (!termos[id]) novos++;
    else if (termos[id].pt !== pt || termos[id].en !== en) mudados++;
    termos[id] = { en, pt, fonte: 'i18n' };
  }

  // Termo que já está gravado com marcador entra na fila de novo: o conserto
  // tem que vir do importador, não de alguém editando o JSON à mão.
  const pendentes = Object.entries(ENTIDADES).filter(([id]) => forcar || !termos[id] || temMarcador(termos[id]));
  if (pendentes.length) {
    console.log(`  buscando ${pendentes.length} entidades (com pausa entre requisições)...`);
  }

  for (const [id, slug] of pendentes) {
    try {
      const en = await nomeDaEntidade(slug, 'en');
      await dormir(PAUSA_MS);
      const pt = await nomeDaEntidade(slug, 'pt');
      await dormir(PAUSA_MS);
      if (!en) { console.log(`  ! ${slug}: não encontrado`); continue; }
      const antes = termos[id];
      if (!antes) novos++;
      else if (antes.pt !== pt || antes.en !== en) mudados++;
      termos[id] = { en, pt: pt || en, fonte: 'paldb', slug, ...(pt ? {} : { sem_traducao_oficial: true }) };
      if (!pt) console.log(`  ~ ${slug}: sem tradução em PT, usando o nome em inglês`);
    } catch (e) {
      console.log(`  ! ${slug}: ${e.message}`);
    }
  }

  // --- regiões e locais, cruzando os dados de mapa dos dois idiomas ---
  console.log('  cruzando nomes de regiões e locais...');
  try {
    const [mapaPt, mapaEn] = await Promise.all([
      fetch('https://paldb.cc/js/map_data_pt.js', { headers: { 'user-agent': AGENTE } }).then((r) => r.text()),
      fetch('https://paldb.cc/js/map_data_en.js', { headers: { 'user-agent': AGENTE } }).then((r) => r.text()),
    ]);

    const extrair = (s) => {
      const d = {};
      for (const m of s.matchAll(/"item"\s*:\s*"([^"]+)"[^{}]*?"id"\s*:\s*"([^"]+)"/g)) {
        if (!d[m[2]]) d[m[2]] = m[1];
      }
      return d;
    };
    const rPt = extrair(mapaPt), rEn = extrair(mapaEn);

    // só interessam os locais que a wiki realmente menciona
    const pastaWiki = join(raiz, 'src', 'content', 'wiki');
    const arquivosWiki = (await import('node:fs/promises')).readdir
      ? await (await import('node:fs/promises')).readdir(pastaWiki)
      : [];
    let corpo = '';
    for (const f of arquivosWiki.filter((f) => f.endsWith('.md'))) {
      corpo += await readFile(join(pastaWiki, f), 'utf-8');
    }

    let regioes = 0;
    for (const [ident, nomeEn] of Object.entries(rEn)) {
      const nomePt = rPt[ident];
      if (!nomePt || nomePt === nomeEn) continue;
      // tira o prefixo de nível que os nomes de região carregam
      const limpoEn = nomeEn.replace(/^Lv\.[\d-]+\s*/, '').trim();
      const limpoPt = nomePt.replace(/^Lv\.[\d-]+\s*/, '').trim();
      if (limpoEn.length < 5) continue;
      if (!corpo.includes(limpoEn) && !corpo.includes(limpoPt)) continue;
      const id = 'local_' + ident.replace(/^REGION_/, '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      if (!termos[id]) novos++;
      termos[id] = { en: limpoEn, pt: limpoPt, fonte: 'mapa', ident };
      regioes++;
    }
    console.log(`  ${regioes} locais citados na wiki foram mapeados`);
  } catch (e) {
    console.log(`  ! não consegui cruzar os dados de mapa: ${e.message}`);
  }

  for (const [id, v] of Object.entries(MANUAIS)) {
    if (!termos[id]) novos++;
    termos[id] = { en: v.en, pt: v.pt, fonte: 'conferido' };
  }

  for (const [id, v] of Object.entries(PASSIVAS)) {
    if (!termos[id]) novos++;
    termos[id] = { en: v.en, pt: v.pt, efeito: v.efeito, fonte: 'conferido' };
  }

  // Nada de gravar marcador no ativo número um do repositório. Se algum passou,
  // é sinal de caminho novo que não conhece a regra, e o arquivo antigo continua
  // valendo mais que o novo.
  const comMarcador = Object.entries(termos).filter(([, t]) => temMarcador(t));
  if (comMarcador.length) {
    console.error(`\n  ABORTADO: ${comMarcador.length} termo(s) com marcador de string não resolvida, por exemplo ${comMarcador[0][0]} = ${JSON.stringify(comMarcador[0][1].pt)}.`);
    console.error('  Marcador não é nome. O caminho que trouxe isso precisa cair para o inglês. Nada foi escrito.');
    process.exit(1);
  }

  await mkdir(dirname(saida), { recursive: true });
  await writeFile(saida, JSON.stringify({
    _leia_isto: [
      'Dicionário bilíngue gerado por scripts/atualizar-termos.mjs a partir do paldb.cc,',
      'que serve os dados dataminados do jogo em português e inglês.',
      '',
      'Para acrescentar um termo, adicione o identificador e o slug do paldb na lista',
      'ENTIDADES do script e rode: npm run termos:atualizar',
      '',
      'Também dá para corrigir um termo à mão aqui: valores editados manualmente só são',
      'sobrescritos se você rodar o script com --forcar.',
    ],
    atualizado_em: new Date().toISOString().slice(0, 10),
    fonte: 'https://paldb.cc',
    termos,
  }, null, 2) + '\n', 'utf-8');

  console.log(`  pronto: ${Object.keys(termos).length} termos (${novos} novos, ${mudados} alterados)`);
  console.log(`  gravado em src/data/termos.json`);
}

main().catch((e) => { console.error('falhou:', e.message); process.exit(1); });
