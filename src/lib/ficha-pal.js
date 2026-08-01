/**
 * A ficha que o popover mostra quando o leitor passa o mouse ou dá foco num
 * nome de Pal no meio do texto (R5.3).
 *
 * Fonte única: `pals.json`, a mesma curadoria que alimenta o banco de Pals. O
 * plugin do build usa esta lista para saber o que marcar, e o navegador usa a
 * mesma para montar a ficha. Duas listas divergiriam no primeiro Pal novo.
 *
 * Só entra Pal COM curadoria. Os 299 do catálogo têm ficha própria em
 * /pal/<nome>/, e marcar todos encheria o texto de sublinhado sem ter o que
 * dizer no popover além do que a página já diz.
 */
import curadoria from '../data/pals.json';
import { rotuloApt } from './termos.js';

/** Ficha pelo nome do jogo, que é a chave usada na marcação do texto. */
export const FICHAS = Object.fromEntries(curadoria.pals.map((p) => [p.nome, p]));

/**
 * Nome de Pal que também é palavra comum do português. Mesma ideia da lista
 * NAO_MARCAR do dicionário: "Mau" abre frase em qualquer guia, e marcar aquilo
 * como Pal vira ruído e ainda promete uma ficha que não é sobre aquilo.
 */
export const NAO_MARCAR_PAL = new Set(['Mau']);

/**
 * Nomes a marcar, do mais longo para o mais curto.
 *
 * A ordem não é estética: a alternância do regex casa a primeira que serve, e
 * com "Reptyro" antes de "Reptyro Cryst" o texto ganharia "Reptyro" marcado
 * dentro do nome do outro Pal. Mesma armadilha que o dicionário já pisou com
 * "Arena" dentro de "Arena Merchant".
 */
export const NOMES_MARCAVEIS = Object.keys(FICHAS)
  .filter((n) => !NAO_MARCAR_PAL.has(n))
  .sort((a, b) => b.length - a.length);

/** Rótulo da aptidão nos dois idiomas, vindo do dicionário e não de cópia. */
export const rotuloAptidao = rotuloApt;
