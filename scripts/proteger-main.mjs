/**
 * Liga (ou confere) a proteção da main, que exige o portão verde.
 *
 *   npm run protecao:conferir   mostra o que está valendo hoje
 *   npm run protecao:aplicar    grava a regra
 *
 * Por que isto é um script e não um clique numa tela: o commit 0f61ae0 foi para
 * o origin em 03.08 com os dois workflows reprovando, e a main ficou vermelha
 * até 04.08. O portão acusou e ninguém leu, porque ele roda DEPOIS que o commit
 * já está lá. Regra que depende de alguém lembrar de olhar não é mecanismo.
 *
 * E por que versionado: configuração que mora só na conta de alguém é a mesma
 * coisa que tarefa que só existe numa conversa. Some, e ninguém sabe que sumiu.
 *
 * O QUE MUDA NO DIA A DIA, e isto não é efeito colateral, é o ponto: check
 * obrigatório recusa PUSH DIRETO na main, não só merge. O commit chega sem
 * status e é rejeitado. Daqui em diante o trabalho vai por ramo e pull request.
 *
 * Precisa do `gh` autenticado com permissão de administração no repositório.
 */
import { execFileSync } from 'node:child_process';

const REPO = 'jgac2014/palworld-wiki';
const RAMO = 'main';

/**
 * O check que a main exige.
 *
 * É o nome do JOB, `portao`, e não o nome do workflow, "Portão de qualidade":
 * quem aparece na lista de check runs de um commit é o job. Errar isto grava
 * uma exigência que nenhum check jamais satisfaz, e aí NADA entra na main.
 *
 * `construir` e `publicar`, do deploy.yml, ficam de fora de propósito. Eles
 * dependem do GitHub Pages estar de pé, e indisponibilidade de publicação não é
 * motivo para recusar código correto.
 */
const CHECK = 'portao';

const gh = (args, entrada) =>
  execFileSync('gh', args, {
    encoding: 'utf-8',
    input: entrada,
    stdio: [entrada === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
  });

const caminho = `repos/${REPO}/branches/${RAMO}/protection`;

const conferir = () => {
  try {
    const atual = JSON.parse(gh(['api', caminho]));
    const checks = atual.required_status_checks?.contexts ?? [];
    console.log(`  proteção da ${RAMO} em ${REPO}:`);
    console.log(`    checks exigidos:     ${checks.join(', ') || 'NENHUM'}`);
    console.log(`    ramo atualizado:     ${atual.required_status_checks?.strict ? 'sim' : 'não'}`);
    console.log(`    vale para admin:     ${atual.enforce_admins?.enabled ? 'sim' : 'NÃO, e aí ela não protege de nada'}`);
    console.log(`    revisão obrigatória: ${atual.required_pull_request_reviews ? 'sim' : 'não'}`);
    console.log(`    force push:          ${atual.allow_force_pushes?.enabled ? 'PERMITIDO' : 'bloqueado'}`);
    const problemas = [];
    if (!checks.includes(CHECK)) problemas.push(`o check "${CHECK}" não está exigido`);
    if (!atual.enforce_admins?.enabled) problemas.push('enforce_admins desligado: o dono passa por cima');
    return problemas;
  } catch (e) {
    const msg = String(e.stderr || e.message || e);
    if (msg.includes('Branch not protected')) {
      console.log(`  a ${RAMO} NÃO tem proteção nenhuma.`);
      return ['sem proteção'];
    }
    console.error(`  não consegui ler a proteção: ${msg.trim().split('\n')[0]}`);
    console.error('  o `gh` está autenticado com permissão de administração neste repositório?');
    process.exit(1);
  }
};

if (process.argv.includes('--aplicar')) {
  const corpo = JSON.stringify({
    // strict: o ramo precisa estar em dia com a main antes de entrar. São duas
    // pessoas dirigindo agentes no mesmo repositório sem ver o que a outra faz,
    // e sem isto dois ramos que passam sozinhos podem se quebrar juntos.
    required_status_checks: { strict: true, contexts: [CHECK] },
    // Ligado, e é o que faz a regra existir. Desligado, o dono do repositório
    // passa por cima, e como é o dono quem empurra, a proteção seria enfeite.
    enforce_admins: true,
    // Desligada de propósito: são quatro pessoas e o dono não pode aprovar o
    // próprio PR. Exigir revisão travaria o repositório em vez de gateá-lo.
    required_pull_request_reviews: null,
    restrictions: null,
    allow_force_pushes: false,
    allow_deletions: false,
  });
  gh(['api', '--method', 'PUT', caminho, '--input', '-'], corpo);
  console.log(`  proteção aplicada na ${RAMO}.`);
  console.log('');
}

const problemas = conferir();
if (problemas.length) {
  console.log('');
  console.error(`  A PROTEÇÃO NÃO ESTÁ VALENDO: ${problemas.join('; ')}`);
  console.error('  Rode `npm run protecao:aplicar`.');
  process.exit(1);
}
console.log('');
console.log('  A main só aceita commit com o portão verde. Trabalho novo vai por ramo e PR.');
