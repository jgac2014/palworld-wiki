# Plano de execução: site bilíngue PT / EN

Documento de trabalho. Quem executa risca as caixas conforme conclui.
Última revisão: 30.07.2026

---

## Onde estamos

O seletor PT/EN já existe e funciona. Ele troca os **nomes das coisas do jogo**, medido
em 386 de 392 termos alternando corretamente, ou 98%.

O que **ainda não** alterna:

| O que | Volume | Custo de traduzir |
|---|---|---|
| Interface (menu, botões, rótulos) | 65 strings (Anexo A) | Baixo |
| Título e descrição das páginas | 28 strings | Baixo |
| Campos de texto dos dados (`onde`, `nota`) | 118 campos | Médio |
| Corpo dos guias | 87.201 caracteres, ~48 páginas | Alto, e recorrente |

---

## A decisão de escopo

> **O corpo dos guias NÃO será traduzido.** Decidido em 30.07.

O motivo não é preguiça, é custo recorrente. Traduzir 48 páginas uma vez é trabalhoso mas
possível; o problema é que **toda correção futura passa a custar o dobro**, e na prática uma
das versões apodrece e vira informação errada com cara de informação certa. É exatamente o
que acontece com as wikis que a gente critica.

E o problema real já está resolvido. Nós quatro somos brasileiros e lemos português sem
esforço. O que atrapalhava era o **nome não bater com a tela de quem joga em inglês**, e é
isso que o seletor conserta. Quem joga em inglês lê o guia em português e vê "Kindling"
onde o jogo dele mostra "Kindling".

**O objetivo deste plano, então:** deixar tudo que é *moldura* bilíngue, mantendo o *conteúdo*
em português. Na prática, quem alternar para EN vê um site em inglês com artigos em português,
que é o formato honesto para o que a gente realmente precisa.

---

## Como dividir o trabalho sem conflito

O João e o amigo estão mexendo no projeto ao mesmo tempo. A divisão que evita conflito de
merge é por **tipo de arquivo**, não por funcionalidade:

| Quem | Mexe em | Não mexe em |
|---|---|---|
| Quem cuida de conteúdo | `src/data/*.json`, `src/content/**`, `scripts/**` | `.astro`, `astro.config.mjs` |
| Quem cuida de código | `.astro`, `astro.config.mjs`, `src/lib/**` | `src/data/*.json`, `src/content/**` |

As Fases 1 e 2 abaixo já vêm com o material de tradução pronto, justamente para que quem
mexer no código só transcreva, sem precisar decidir tradução nenhuma.

---

## Fase 1 — Interface bilíngue

**Impacto:** alto, é o que faz o site parecer coerente ao trocar de idioma.
**Esforço:** baixo. Uma sessão.

### 1.1 Criar o arquivo de strings

- [ ] Criar `src/data/interface.json` com o conteúdo do Anexo A deste documento.

### 1.2 Criar o helper

- [ ] Em `src/lib/termos.js`, acrescentar:

```js
import interface_ from '../data/interface.json';

/** Texto de interface no idioma pedido. */
export function ui(chave, idioma = 'pt') {
  const t = interface_[chave];
  if (!t) return chave;
  return (idioma === 'en' ? t.en : t.pt) || t.pt || chave;
}
```

### 1.3 Trocar as strings nos componentes

Em cada arquivo, substituir o texto fixo por um elemento com os dois idiomas declarados,
no mesmo padrão que a página de Pals já usa:

```astro
<span data-rot-pt={ui('nav_ferramentas','pt')} data-rot-en={ui('nav_ferramentas','en')}>
  {ui('nav_ferramentas','pt')}
</span>
```

O `SeletorIdioma.astro` já troca qualquer elemento com `data-rot-pt` e `data-rot-en`.
Não precisa mexer nele.

- [ ] `src/layouts/Base.astro` — 7 strings
- [ ] `src/pages/index.astro` — 18 strings
- [ ] `src/pages/pals.astro` — 13 strings
- [ ] `src/pages/mapa.astro` — 7 strings
- [ ] `src/components/Chat.astro` — 6 strings

### 1.4 Casos que precisam de atenção

- [ ] **`placeholder` de campo de busca** não é conteúdo de elemento, é atributo. Precisa de
      tratamento próprio no script do seletor: acrescentar um bloco que procure
      `[data-ph-pt]` e troque a propriedade `placeholder`.
- [ ] **`<title>` e as meta tags** da página. Trocar por JavaScript funciona, mas o valor real
      é baixo para uso interno. Sugestão: deixar para depois.
- [ ] **Idioma do `<html>`** já é trocado pelo seletor.

### Pronto quando

Alternar para EN e percorrer as cinco páginas sem encontrar palavra em português na
moldura: menu, botões, rótulos de coluna, textos de filtro.

---

## Fase 2 — Título e descrição das páginas

**Impacto:** médio. É o que aparece no menu lateral e na home.
**Esforço:** baixo.

### 2.1 Estender o schema

- [ ] Em `src/content.config.ts`, acrescentar dois campos opcionais:

```ts
titulo_en: z.string().optional(),
descricao_en: z.string().optional(),
```

### 2.2 Preencher nos 14 arquivos

- [ ] Acrescentar `titulo_en` e `descricao_en` no topo de cada `.md`, usando o Anexo B.

Manter opcional é proposital: página nova sem tradução simplesmente cai para o português,
em vez de quebrar o build.

### 2.3 Usar no menu

- [ ] Em `Base.astro` e `index.astro`, montar os links com os dois idiomas declarados.

### Pronto quando

O menu lateral inteiro e os blocos da home alternam.

---

## Fase 3 — Campos de texto dos dados

**Impacto:** médio. São as colunas "Onde conseguir" e "Observação" da tabela de Pals,
e as notas do mapa.
**Esforço:** médio. 118 campos curtos.

- [ ] Definir a convenção: campo `onde_en` e `nota_en`, opcionais, ao lado dos existentes.
- [ ] Traduzir os 93 campos de `pals.json`.
- [ ] Traduzir as 25 notas de `mapa.json`.
- [ ] Ajustar `pals.astro` e `mapa.astro` para declarar os dois idiomas.

> Esta fase é a primeira candidata a ser adiada. Se a Fase 1 e 2 já resolverem a sensação
> de site bilíngue, dá para deixar os campos de dados em português e ninguém sente falta.
> Reavaliar depois de usar por uma semana.

---

## Fase 4 — Fechar as pontas

- [ ] Rodar `npm run termos:auditar` e resolver os termos que ainda não alternam.
- [ ] Rodar `npm run conteudo:padronizar` e conferir se apareceu conteúdo novo desalinhado.
- [ ] Verificar no navegador que o idioma persiste entre páginas e sobrevive a recarga.
- [ ] Testar `?idioma=en` num link compartilhado.
- [ ] Conferir concordância: a padronização pode gerar "o Fazenda", que já aconteceu antes.

---

## O que fica fora, e por quê

| Item | Motivo |
|---|---|
| Corpo dos guias em inglês | Custo recorrente alto, benefício baixo para um grupo de brasileiros |
| Rotas separadas `/pt/` e `/en/` | Dobra as páginas geradas; o parâmetro `?idioma=` resolve compartilhar link |
| Tradução automática por IA | Sem revisão vira erro com cara de verdade; é o item com histórico de fracasso documentado em outras wikis |
| Detecção de idioma do navegador | Metade do grupo joga em inglês mas usa o navegador em português. Detectar erra mais que acerta |
| Traduzir a página de glossário | O glossário **é** a tabela PT↔EN. Traduzir apagaria o conteúdo dela |

---

## Anexo A — Strings de interface

Conteúdo pronto para `src/data/interface.json`.

```json
{
  "_leia_isto": "Strings da moldura do site nos dois idiomas. O conteúdo dos guias fica só em português, por decisão registrada no PLANO-BILINGUE.md.",

  "marca":              { "pt": "Wiki Palworld 1.0",  "en": "Palworld 1.0 Wiki" },
  "nav_ferramentas":    { "pt": "Ferramentas",        "en": "Tools" },
  "nav_guias":          { "pt": "Guias",              "en": "Guides" },
  "nav_projeto":        { "pt": "Projeto",            "en": "Project" },
  "nav_mapa":           { "pt": "Mapa interativo",    "en": "Interactive map" },
  "nav_pals":           { "pt": "Banco de Pals",      "en": "Pal database" },
  "nav_contribuir":     { "pt": "Contribuir no GitHub","en": "Contribute on GitHub" },
  "nav_idioma":         { "pt": "Nomes do jogo",      "en": "In-game names" },

  "busca_placeholder":  { "pt": "Buscar na wiki: Pal, item, passiva, mecânica...", "en": "Search the wiki: Pal, item, passive, mechanic..." },
  "busca_vazio":        { "pt": "Nada encontrado para", "en": "No results for" },
  "busca_mais":         { "pt": "Ver mais resultados", "en": "Load more results" },
  "busca_limpar":       { "pt": "Limpar",             "en": "Clear" },

  "home_sub":           { "pt": "Em português, com os nomes como aparecem no jogo.", "en": "In Portuguese, with names as they appear in your game." },
  "home_porque":        { "pt": "Por que esta wiki existe", "en": "Why this wiki exists" },
  "home_cobre":         { "pt": "Cobre a versão",     "en": "Covers version" },
  "home_revisao":       { "pt": "última revisão",     "en": "last reviewed" },

  "stat_pals":          { "pt": "Pals no Paldeck",    "en": "Pals in the Paldeck" },
  "stat_level":         { "pt": "Level cap",          "en": "Level cap" },
  "stat_torres":        { "pt": "Torres",             "en": "Towers" },
  "stat_copias":        { "pt": "Cópias para 4★",     "en": "Copies for 4★" },

  "pals_titulo":        { "pt": "Banco de Pals",      "en": "Pal database" },
  "pals_filtro":        { "pt": "Filtrar por nome, local ou anotação...", "en": "Filter by name, location or note..." },
  "pals_todas_apt":     { "pt": "Todas as aptidões",  "en": "All work suitabilities" },
  "pals_todas_fases":   { "pt": "Todas as fases",     "en": "All stages" },
  "pals_col_pal":       { "pt": "Pal",                "en": "Pal" },
  "pals_col_apt":       { "pt": "Aptidões",           "en": "Work suitability" },
  "pals_col_onde":      { "pt": "Onde conseguir",     "en": "Where to find" },
  "pals_col_obs":       { "pt": "Observação",         "en": "Notes" },
  "pals_aura":          { "pt": "aura de",            "en": "aura of" },
  "pals_contagem":      { "pt": "Pals",               "en": "Pals" },
  "pals_de":            { "pt": "de",                 "en": "of" },
  "pals_como_ler":      { "pt": "Como ler os números","en": "How to read the numbers" },

  "fase_mid":           { "pt": "Acessível agora",    "en": "Available now" },
  "fase_endgame":       { "pt": "Endgame",            "en": "Endgame" },
  "fase_aura":          { "pt": "Dá aura",            "en": "Gives aura" },
  "fase_utilidade":     { "pt": "Utilidade",          "en": "Utility" },
  "fase_fazenda":       { "pt": "Fazenda de criação", "en": "Ranch" },
  "fase_combate":       { "pt": "Combate",            "en": "Combat" },

  "mapa_titulo":        { "pt": "Mapa interativo",    "en": "Interactive map" },
  "mapa_dica":          { "pt": "Clique num ponto para ver a anotação · arraste para mover · rolagem para zoom", "en": "Click a marker for notes · drag to pan · scroll to zoom" },
  "mapa_coord":         { "pt": "Passe o mouse sobre o mapa para ler a coordenada", "en": "Hover over the map to read the coordinate" },
  "mapa_coord_atual":   { "pt": "coordenada do jogo", "en": "in-game coordinate" },
  "mapa_clicado":       { "pt": "clicado",            "en": "clicked" },
  "mapa_como_add":      { "pt": "Como adicionar um ponto", "en": "How to add a marker" },
  "mapa_pontos":        { "pt": "pontos marcados",    "en": "markers" },

  "cat_base":           { "pt": "Nossas bases",       "en": "Our bases" },
  "cat_minerio":        { "pt": "Minério",            "en": "Ore" },
  "cat_quartzo":        { "pt": "Quartzo puro",       "en": "Pure quartz" },
  "cat_carvao":         { "pt": "Carvão",             "en": "Coal" },
  "cat_enxofre":        { "pt": "Enxofre",            "en": "Sulfur" },
  "cat_petroleo":       { "pt": "Petróleo",           "en": "Crude oil" },
  "cat_torre":          { "pt": "Torres",             "en": "Towers" },
  "cat_alpha":          { "pt": "Pal Alfa",           "en": "Alpha Pal" },
  "cat_santuario":      { "pt": "Zona de Caça Proibida", "en": "Wildlife Sanctuary" },
  "cat_mercador":       { "pt": "Mercadores",         "en": "Merchants" },

  "chat_abrir":         { "pt": "Perguntar",          "en": "Ask" },
  "chat_titulo":        { "pt": "Assistente da wiki", "en": "Wiki assistant" },
  "chat_escopo":        { "pt": "responde só com o que está escrito aqui", "en": "answers only from what is written here" },
  "chat_placeholder":   { "pt": "Sua pergunta...",    "en": "Your question..." },
  "chat_pensando":      { "pt": "pensando...",        "en": "thinking..." },
  "chat_erro":          { "pt": "O assistente não conseguiu responder agora.", "en": "The assistant could not answer right now." },

  "rodape_revisado":    { "pt": "Revisado em",        "en": "Reviewed on" },
  "rodape_aberto":      { "pt": "Conteúdo aberto, contribuições bem-vindas", "en": "Open content, contributions welcome" },
  "rodape_corrigir":    { "pt": "Corrigir esta página", "en": "Fix this page" },

  "aviso_idioma":       { "pt": "Os guias são escritos em português. O seletor troca os nomes do jogo.", "en": "Guides are written in Portuguese. The switch changes in-game names only." }
}
```

---

## Anexo B — Títulos e descrições das páginas

| Arquivo | `titulo_en` | `descricao_en` |
|---|---|---|
| `resumo-1-0` | What changed in 1.0 | Launch overview, level cap, Pal count and patch history. |
| `plano-de-acao` | Action plan | Order of operations to break through the mid game in co-op. |
| `nossas-bases` | Our 4 bases | Blueprint per base, roster and unlock order. |
| `base-e-trabalho` | Bases and work | Work suitability, auras, base layout and raid defence. |
| `breeding` | Breeding and mutation | Passive inheritance, cakes, mutation and the Pal production chain. |
| `combate` | Combat and squad | Tier list, combat passives, weapons, mounts and arena. |
| `torres-e-bosses` | Towers and bosses | All 9 towers in order, alphas and wildlife sanctuaries. |
| `endgame` | Endgame | Sunreach, World Tree, Awakening and the Wing Pack. |
| `economia` | Economy and farming | Gold, rare resources, expeditions and the cake line. |
| `co-op` | Co-op and server | What is shared, invite world limits and settings. |
| `controle` | On a controller | Gamepad in 1.0: dash while aiming, daily buttons and settings. |
| `glossario` | Glossary PT ↔ EN | Official Portuguese terminology, datamined from paldb. |
| `armadilhas` | Pitfalls and bugs | Costly mistakes, active bugs and community-tested tricks. |
| `fontes` | Sources and uncertainty | What sources disagree on and where each figure came from. |

---

## Anexo C — Ordem sugerida

Se a ideia é fazer aos poucos, esta é a ordem por retorno sobre esforço:

1. **Fase 1.1 e 1.2** — arquivo de strings e helper. Não quebra nada, não conflita com ninguém.
2. **Fase 1.3 em `Base.astro`** — o menu lateral está em todas as páginas, então é a mudança
   que mais aparece por linha alterada.
3. **Fase 2** — títulos e descrições, que completam a sensação do menu.
4. **Fase 1.3 no resto** — index, pals, mapa, chat.
5. **Fase 4** — validação.
6. **Fase 3** — dados. Só se ainda fizer falta depois de usar.
