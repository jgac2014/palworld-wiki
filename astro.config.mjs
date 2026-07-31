// @ts-check
import { defineConfig } from 'astro/config';
import pagefind from 'astro-pagefind';
import remarkDirective from 'remark-directive';
import { visit } from 'unist-util-visit';
import { construirIndice, NAO_MARCAR, TERMOS } from './src/lib/termos.js';

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
 * Marca no HTML os termos do jogo que existem no dicionário bilíngue, para que
 * o seletor de idioma consiga trocá-los. Quem escreve o guia não precisa anotar
 * nada: escreve "Fazenda de Acasalamento" em português normal e a marcação é
 * automática.
 *
 * Não mexe em título, código, link nem em texto já marcado.
 */
function marcarTermosBilingues() {
  const indice = construirIndice().filter(([texto]) => !NAO_MARCAR.has(texto));
  const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Não use \b aqui: ele é ASCII, e termo que começa ou termina em letra
  // acentuada ("Águas Termais", "Árvore Mundial", "Babá") nunca casa depois de
  // espaço. A revisão de 30.07 achou 37 ocorrências de "Árvore Mundial" no site
  // gerado, todas sem marcação, por causa disso. Os lookarounds Unicode abaixo
  // fazem o papel de fronteira de palavra respeitando acento.
  const padrao = new RegExp(
    `(?<![\\p{L}\\p{N}_])(${indice.map(([t]) => escapar(t)).join('|')})(?![\\p{L}\\p{N}_])`,
    'gu'
  );
  const porTexto = new Map(indice.map(([t, id]) => [t, id]));
  const IGNORAR = new Set(['code', 'pre', 'a', 'h1', 'h2', 'h3', 'h4', 'script', 'style']);

  // Recursão própria em vez de visit(): a regra "não marcar dentro de link ou
  // título" vale para QUALQUER profundidade. Só olhar o pai imediato deixava
  // passar link com negrito (<a><strong>Caixa de Pal</strong></a>), porque o
  // pai do texto era o <strong>, não o <a>.
  const marcar = (node) => {
    const filhos = [];
    let ultimo = 0;
    let m;
    padrao.lastIndex = 0;
    while ((m = padrao.exec(node.value)) !== null) {
      if (m.index > ultimo) filhos.push({ type: 'text', value: node.value.slice(ultimo, m.index) });
      const id = porTexto.get(m[1]);
      filhos.push({
        type: 'element',
        tagName: 'span',
        properties: {
          'data-termo': id,
          'data-pt': TERMOS[id]?.pt || m[1],
          'data-en': TERMOS[id]?.en || m[1],
          class: 'termo',
        },
        children: [{ type: 'text', value: m[1] }],
      });
      ultimo = m.index + m[1].length;
    }
    if (!filhos.length) return null;
    if (ultimo < node.value.length) filhos.push({ type: 'text', value: node.value.slice(ultimo) });
    return filhos;
  };

  const andar = (node, bloqueado) => {
    if (node.type === 'element') {
      if (IGNORAR.has(node.tagName) || node.properties?.['data-termo']) bloqueado = true;
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

// Troque para o nome do seu repositório antes do primeiro deploy.
// Se publicar em dominio proprio ou em usuario.github.io, deixe base em '/'.
const REPO = process.env.REPO_NAME || 'palworld-wiki';
const USUARIO = process.env.GH_USER || 'seu-usuario';

export default defineConfig({
  site: `https://${USUARIO}.github.io`,
  base: process.env.CI ? `/${REPO}` : '/',
  trailingSlash: 'ignore',
  integrations: [pagefind()],
  markdown: {
    remarkPlugins: [remarkDirective, caixasDeDestaque],
    rehypePlugins: [marcarTermosBilingues],
    shikiConfig: { theme: 'github-dark' },
  },
  build: { format: 'directory' },
});
