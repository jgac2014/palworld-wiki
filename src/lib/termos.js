import dicionario from '../data/termos.json';

export const TERMOS = dicionario.termos;

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
