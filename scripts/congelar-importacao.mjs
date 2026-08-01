/**
 * Congela a distribuição de texto dos JSON importados.
 *
 *   npm run importacao:congelar
 *
 * Mesmo mecanismo do poder de captura e da referência do mapa: o número que o
 * verificador compara sai de uma medição gravada, e não de um limiar escolhido
 * a olho. Rodar isto ACEITA o estado atual como correto, então rode depois de
 * olhar o que mudou, nunca para calar o portão.
 *
 * O verificador compara `maior_repeticao` como TETO e `distintos` como PISO, e
 * o porquê da assimetria está em `lib/importacao.mjs`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLECOES_IMPORTADAS, registrosDe, medirCampo, rotuloDaColecao } from './lib/importacao.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const hoje = () => new Date().toISOString().slice(0, 10);

const colecoes = {};
console.log('');
for (const c of COLECOES_IMPORTADAS) {
  const json = JSON.parse(await readFile(join(raiz, c.arquivo), 'utf-8'));
  const registros = registrosDe(json, c.caminho);
  if (!registros || !registros.length) {
    console.error(`\n  ABORTADO. ${rotuloDaColecao(c)} não existe ou veio vazia. Congelar vazio seria congelar o defeito.\n`);
    process.exit(1);
  }
  const campos = {};
  for (const campo of c.campos) {
    const m = medirCampo(registros, campo);
    // Campo que não rende valor nenhum congelaria um teto de zero e um piso de
    // zero, e a partir daí a checagem passaria sempre sem conferir nada. É o
    // modo de falha mais caro deste repositório, então ele aborta aqui.
    if (!m.valores) {
      console.error('');
      console.error(`  ABORTADO. ${rotuloDaColecao(c)}: o campo "${campo}" não tem valor de texto em nenhum dos ${registros.length} registros.`);
      console.error('  Congelar isso seria congelar uma checagem que não checa. Corrija o nome do campo em COLECOES_IMPORTADAS.');
      console.error('');
      process.exit(1);
    }
    campos[campo] = m;
  }
  colecoes[rotuloDaColecao(c)] = { registros: registros.length, campos };
  console.log(`  ${rotuloDaColecao(c).padEnd(34)} ${String(registros.length).padStart(6)} registros`);
  for (const [campo, m] of Object.entries(campos)) {
    console.log(
      `      ${campo.padEnd(8)} ${String(m.valores).padStart(6)} valores, ${String(m.distintos).padStart(6)} distintos, ` +
      `maior repetição ${String(m.maior_repeticao).padStart(4)} (${JSON.stringify(m.mais_repetido ?? '').slice(0, 40)})`,
    );
  }
}

const arquivo = {
  _leia_isto:
    'Distribuição CONGELADA dos campos de texto que identificam registro em cada JSON importado. ' +
    'O verificador compara maior_repeticao como TETO e distintos como PISO. Um valor que se espalha ' +
    'por registros demais é a assinatura de junção quebrada: quando o casamento de idiomas do mapa ' +
    'quebrou, um nome passou a cobrir os 137 pontos de viagem rápida e nenhuma contagem acusou, ' +
    'porque o total não mudou. Repetição legítima existe e é grande em alguns campos, por isso o ' +
    'teto é por campo e medido. Ao aceitar uma mudança, rode `npm run importacao:congelar` NO MESMO ' +
    'COMMIT e escreva em fontes.md o que mudou e por quê.',
  congelado_em: hoje(),
  colecoes,
};
await writeFile(join(raiz, 'src/data/referencia-importacao.json'), JSON.stringify(arquivo, null, 2) + '\n', 'utf-8');
console.log('');
console.log(`  Congelado em src/data/referencia-importacao.json, ${Object.keys(colecoes).length} coleções.`);
console.log('');
