import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Cada arquivo .md dentro de src/content/wiki vira uma página.
 * O bloco entre --- no topo do arquivo é o "frontmatter": os dados da página.
 *
 * Para criar uma página nova, copie um arquivo existente, troque o nome
 * e ajuste o frontmatter. Nada além disso.
 */
const wiki = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/wiki' }),
  schema: z.object({
    // Título que aparece no topo da página e no menu lateral.
    titulo: z.string(),
    // Uma linha explicando a página. Aparece na home e no Google.
    descricao: z.string(),
    // Os dois acima em inglês, para o seletor de idioma. São opcionais de
    // propósito: página sem tradução continua mostrando o português em vez
    // de quebrar o build.
    titulo_en: z.string().optional(),
    descricao_en: z.string().optional(),
    // Posição no menu. Menor number aparece primeiro.
    ordem: z.number().default(99),
    // Data da última revisão de conteúdo.
    atualizado: z.coerce.date().optional(),
    // Marque true para esconder do menu sem apagar o arquivo.
    rascunho: z.boolean().default(false),
  }),
});

export const collections = { wiki };
