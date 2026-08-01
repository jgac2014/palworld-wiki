/**
 * Data no formato do projeto: DD.MM.AAAA.
 *
 * Lida em UTC, e isso não é preciosismo. O frontmatter traz `2026-07-30`, que
 * o Astro converte para meia-noite UTC; formatar isso com toLocaleDateString
 * num fuso a oeste devolve o dia ANTERIOR. Era o que acontecia: o carimbo do
 * guia dizia 30.07.2026 e o rodapé da mesma página dizia 29/07/2026, com a
 * mesma data por trás dos dois.
 *
 * Aceita Date ou string ISO, porque metade das datas do site vem do
 * frontmatter (já convertida) e a outra metade vem de JSON (ainda texto).
 */
export function dataBr(valor) {
  if (!valor) return '';
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  const dois = (n) => String(n).padStart(2, '0');
  return `${dois(d.getUTCDate())}.${dois(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
}
