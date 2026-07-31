import dicionario from '../data/termos.json';
import interface_ from '../data/interface.json';

export const TERMOS = dicionario.termos;

/** Texto de interface no idioma pedido. */
export function ui(chave, idioma = 'pt') {
  const t = interface_[chave];
  if (!t) return chave;
  return (idioma === 'en' ? t.en : t.pt) || t.pt || chave;
}

/**
 * Devolve o nome de um termo no idioma pedido.
 * Se não houver tradução, cai para o inglês em vez de mostrar vazio.
 */
export function termo(id, idioma = 'pt') {
  const t = TERMOS[id];
  if (!t) return id;
  return (idioma === 'en' ? t.en : t.pt) || t.en || id;
}

/**
 * Liga a chave curta da aptidão, usada em pals.json e catalogo.json, ao
 * identificador do dicionário bilíngue. Fica aqui porque a página do banco e a
 * ficha de cada Pal precisam da mesma tradução, e duas cópias divergem.
 */
export const ID_APT = {
  acender: 'apt_emitflame', rega: 'apt_watering', plantio: 'apt_seeding',
  energia: 'apt_generateelectricity', manual: 'apt_handcraft', coleta: 'apt_collection',
  madeira: 'apt_deforest', garimpo: 'apt_mining', manipulacao: 'apt_productmedicine',
  refrigeracao: 'apt_cool', transporte: 'apt_transport', fazenda: 'apt_monsterfarm',
};

/** Nome da aptidão nos dois idiomas, pronto para os atributos data-rot-*. */
export function rotuloApt(chave) {
  return { pt: termo(ID_APT[chave], 'pt'), en: termo(ID_APT[chave], 'en') };
}

/**
 * Índice de busca por texto: mapeia qualquer grafia conhecida (PT ou EN)
 * de volta para o identificador. Usado para marcar os termos no texto
 * dos guias automaticamente, sem o autor precisar anotar nada.
 *
 * Ordenado do mais longo para o mais curto, para que "Fazenda de Acasalamento"
 * seja reconhecida antes de "Fazenda".
 */
export function construirIndice() {
  const pares = [];
  for (const [id, t] of Object.entries(TERMOS)) {
    if (t.pt) pares.push([t.pt, id]);
    if (t.en && t.en !== t.pt) pares.push([t.en, id]);
  }
  return pares.sort((a, b) => b[0].length - a[0].length);
}

/**
 * Termos curtos ou ambíguos demais para substituição automática no texto.
 * "Fazenda" sozinha aparece em contexto que não é o nome da estrutura, e
 * "Coleta" e "Transporte" são palavras comuns do português.
 */
export const NAO_MARCAR = new Set([
  'Fazenda', 'Farming', 'Coleta', 'Gathering', 'Transporte', 'Transporting',
  'Rega', 'Watering', 'Plantio', 'Planting', 'Mill', 'Cake', 'Ranch',
  'Legend', 'Lucky', 'Serious', 'Swift', 'Runner', 'Nimble',
]);

export const IDIOMAS = {
  pt: { rotulo: 'Português', curto: 'PT', bandeira: 'BR' },
  en: { rotulo: 'English', curto: 'EN', bandeira: 'US' },
};
