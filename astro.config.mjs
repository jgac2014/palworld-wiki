// @ts-check
import { defineConfig } from 'astro/config';
import pagefind from 'astro-pagefind';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import { construirIndice, NAO_MARCAR, TERMOS } from './src/lib/termos.js';
import { NOMES_MARCAVEIS } from './src/lib/ficha-pal.js';
import { enderecoPal } from './src/lib/enderecos.js';
import catalogo from './src/data/catalogo.json';

/**
 * Converte blocos :::tipo ... ::: em caixas de destaque.
 * Tipos: destaque, atencao, cuidado, dica, nota
 *
 * Exemplo no Markdown:
 *   :::cuidado
 *   **Não faça isso.** Explicação aqui.
 *   :::
 */
const TIPOS = {
  destaque: 'Importante',
  atencao: 'Atenção',
  cuidado: 'Cuidado',
  dica: 'Dica',
  nota: 'Nota',
};

function caixasDeDestaque() {
  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;
      const tipo = TIPOS[node.name] ? node.name : 'nota';
      const dados = node.data || (node.data = {});
      dados.hName = 'aside';
      dados.hProperties = {
        class: `adm adm-${tipo}`,
        'data-rotulo': TIPOS[tipo],
      };
    });
  };
}

/**
 * Envolve num <span> toda ocorrência de uma lista de textos, sem tocar em
 * título, código, link nem em texto já marcado.
 *
 * Serve os dois marcadores do build, o do dicionário bilíngue e o das fichas de
 * Pal. É uma função só de propósito: a parte difícil deste código não é a troca,
 * é a regra de onde NÃO mexer, e duas cópias dela divergiriam na primeira
 * correção feita num lado só.
 *
 * `textos` vem do mais longo para o mais curto. A alternância do regex casa a
 * primeira que serve, então com a ordem invertida "Arena" seria marcada dentro
 * de "Arena Merchant" e "Reptyro" dentro de "Reptyro Cryst".
 */
function marcadorDeTexto(textos, montarPropriedades, classe) {
  const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Não use \b aqui: ele é ASCII, e termo que começa ou termina em letra
  // acentuada ("Águas Termais", "Árvore Mundial", "Babá") nunca casa depois de
  // espaço. A revisão de 30.07 achou 37 ocorrências de "Árvore Mundial" no site
  // gerado, todas sem marcação, por causa disso. Os lookarounds Unicode abaixo
  // fazem o papel de fronteira de palavra respeitando acento.
  const padrao = new RegExp(
    `(?<![\\p{L}\\p{N}_])(${textos.map(escapar).join('|')})(?![\\p{L}\\p{N}_])`,
    'gu'
  );
  const IGNORAR = new Set(['code', 'pre', 'a', 'h1', 'h2', 'h3', 'h4', 'script', 'style']);

  const marcar = (node) => {
    const filhos = [];
    let ultimo = 0;
    let m;
    padrao.lastIndex = 0;
    while ((m = padrao.exec(node.value)) !== null) {
      const entre = node.value.slice(ultimo, m.index);
      if (m.index > ultimo) filhos.push({ type: 'text', value: entre });
      const propriedades = { ...montarPropriedades(m[1]), class: classe };

      // Glosa escrita à mão: "Imortalidade (Immortality)".
      //
      // Os dois lados são o MESMO termo do dicionário, então os dois spans
      // exibiam o mesmo idioma e a tela mostrava "Imortalidade (Imortalidade)"
      // em português e "Immortality (Immortality)" em inglês. Eram 134
      // ocorrências em 12 páginas.
      //
      // O parêntese passa a carregar o par TROCADO, e a glosa vira o que quem
      // escreveu quis dizer: o nome no outro idioma, nos dois sentidos. Apagar
      // a glosa do texto resolveria a repetição e tiraria o nome em inglês de
      // dentro de título e de tabela, onde o mecanismo não marca nada e o
      // leitor não tem como recuperá-lo.
      const anterior = filhos[filhos.length - 2];
      if (
        propriedades['data-pt'] && propriedades['data-en']
        && anterior?.type === 'element'
        && anterior.properties?.['data-termo'] === propriedades['data-termo']
        && /^\s*\($/.test(entre)
      ) {
        const pt = propriedades['data-pt'];
        propriedades['data-pt'] = propriedades['data-en'];
        propriedades['data-en'] = pt;
      }

      filhos.push({
        type: 'element',
        tagName: 'span',
        properties: propriedades,
        children: [{ type: 'text', value: m[1] }],
      });
      ultimo = m.index + m[1].length;
    }
    if (!filhos.length) return null;
    if (ultimo < node.value.length) filhos.push({ type: 'text', value: node.value.slice(ultimo) });
    return filhos;
  };

  // Recursão própria em vez de visit(): a regra "não marcar dentro de link ou
  // título" vale para QUALQUER profundidade. Só olhar o pai imediato deixava
  // passar link com negrito (<a><strong>Caixa de Pal</strong></a>), porque o
  // pai do texto era o <strong>, não o <a>.
  //
  // Marcação já feita também bloqueia, nos dois sentidos: nome de Pal não entra
  // dentro de termo do dicionário e termo não entra dentro de nome de Pal.
  const andar = (node, bloqueado) => {
    if (node.type === 'element') {
      const p = node.properties || {};
      if (IGNORAR.has(node.tagName) || p['data-termo'] || p['data-pal']) bloqueado = true;
    }
    if (!node.children) return;
    for (let i = 0; i < node.children.length; i++) {
      const filho = node.children[i];
      if (filho.type === 'text' && !bloqueado) {
        const novos = marcar(filho);
        if (novos) {
          node.children.splice(i, 1, ...novos);
          i += novos.length - 1;
        }
      } else {
        andar(filho, bloqueado);
      }
    }
  };

  return (tree) => andar(tree, false);
}

/**
 * Marca no HTML os termos do jogo que existem no dicionário bilíngue, para que
 * o seletor de idioma consiga trocá-los. Quem escreve o guia não precisa anotar
 * nada: escreve "Fazenda de Acasalamento" em português normal e a marcação é
 * automática.
 */
function marcarTermosBilingues() {
  const indice = construirIndice().filter(([texto]) => !NAO_MARCAR.has(texto));
  const porTexto = new Map(indice);
  return marcadorDeTexto(
    indice.map(([t]) => t),
    (achado) => {
      const id = porTexto.get(achado);
      return {
        'data-termo': id,
        'data-pt': TERMOS[id]?.pt || achado,
        'data-en': TERMOS[id]?.en || achado,
      };
    },
    'termo'
  );
}

/**
 * Marca nome de Pal que tem curadoria nossa, para o popover de ficha (R5.3).
 *
 * O atributo carrega só o nome: a ficha inteira vem do mesmo `pals.json` no
 * navegador, e repeti-la em cada ocorrência inflaria toda página que cita um
 * Pal três vezes.
 *
 * Roda depois do dicionário e o walker respeita a marcação do outro, então os
 * dois nunca se aninham.
 */
function marcarPalsDaCuradoria() {
  // O endereço da ficha completa é resolvido aqui, no build, porque só o
  // catálogo sabe a chave interna do jogo ("Jormuntide_Ignis") que vira a rota.
  // Levar o catálogo inteiro para o navegador só por causa disso custaria 103 KB
  // em toda página, e o popover precisa de um link, não de 299 fichas.
  const pagina = new Map(
    catalogo.pals.map((p) => [p.en, `${BASE_DAS_ROTAS}/pal/${enderecoPal(p.chave)}/`])
  );
  return marcadorDeTexto(
    NOMES_MARCAVEIS,
    (nome) => ({ 'data-pal': nome, 'data-pagina': pagina.get(nome), tabindex: '0' }),
    'pal'
  );
}

// Troque para o nome do seu repositório antes do primeiro deploy.
// Se publicar em dominio proprio ou em usuario.github.io, deixe base em '/'.
const REPO = process.env.REPO_NAME || 'palworld-wiki';
const USUARIO = process.env.GH_USER || 'seu-usuario';
// Sem barra no fim: quem usa concatena a rota já com barra na frente.
const BASE_DAS_ROTAS = process.env.CI ? `/${REPO}` : '';

export default defineConfig({
  site: `https://${USUARIO}.github.io`,
  base: process.env.CI ? `/${REPO}` : '/',
  trailingSlash: 'ignore',
  integrations: [pagefind()],
  markdown: {
    remarkPlugins: [remarkDirective, caixasDeDestaque],
    rehypePlugins: [marcarTermosBilingues, marcarPalsDaCuradoria],
    shikiConfig: { theme: 'github-dark' },
  },
  build: { format: 'directory' },
});
