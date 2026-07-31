# Contexto do repositório

Você é um agente trabalhando neste repositório. Leia isto inteiro antes da primeira edição.
É curto de propósito. O detalhe do produto está em `PRD.md` e a fila de trabalho em `TAREFAS.md`.

---

## O que é isto

Wiki de Palworld 1.0 para um grupo de quatro amigos que jogam em co-op, em português, no controle,
num mundo hospedado por um deles. Não é produto comercial, não tem usuário anônimo para agradar, e
não vai virar plataforma multi-jogo. Se uma decisão só faz sentido para escalar, ela está errada aqui.

Duas pessoas dirigem agentes neste mesmo repositório sem enxergar o que a outra faz. Por isso a
divisão de trabalho é **por tipo de arquivo, não por funcionalidade**. Veja "Territórios" abaixo.

## Stack

Astro 5, saída estática, sem framework de UI. Pagefind para busca gerada no build. Leaflet com
`CRS.Simple` no mapa. Cloudflare Worker opcional para o assistente. Deploy em GitHub Pages via Actions.

Não introduza React, Vue, Svelte, Tailwind, banco de dados nem backend. Se uma tarefa parecer exigir
isso, ela está mal formulada: pare e escreva o porquê em vez de instalar.

## Comandos

```bash
npm run dev          # servidor local
npm run build        # gera dist/ (o número de páginas cresce com o catálogo)
npm run portao       # O PORTÃO: verificar + build + offline + testar, tudo de uma vez
npm run verificar    # integridade de dados e conteúdo. SAI COM ERRO 1 SE ACHAR PROBLEMA
npm run testar       # dez asserções no navegador. Cada uma cobre algo que já quebrou
npm run offline      # empacota tudo num HTML só, sem servidor
npm run termos:atualizar   # puxa termos PT/EN do paldb
npm run termos:auditar     # lista o que ainda não alterna de idioma
npm run patch:verificar    # compara a versão da wiki com as notícias oficiais do jogo
```

**Regra dura: nenhuma tarefa está pronta sem `npm run portao` passando.**
O portão não é decoração. Já pegou doze contradições factuais entre páginas, 26 Pals com aptidão
errada, um catálogo importado pela metade, quatro links internos quebrados, tabela com número de
colunas trocado e a marcação de idioma travada em termo acentuado. Se ele reclamar, conserte o que
ele aponta, nunca o portão.

Mudou algo visual que merece checagem permanente? Acrescente asserção em
`scripts/testar-navegador.mjs`. Cada teste de lá existe porque aquilo já quebrou uma vez.

## Territórios

| Território | Arquivos | Quem mexe |
|---|---|---|
| **Conteúdo e dados** | `src/content/`, `src/data/`, `scripts/` | Quem cuida do conteúdo |
| **Código e visual** | `src/components/`, `src/layouts/`, `src/pages/`, `src/styles/`, `src/lib/`, `astro.config.mjs`, `worker/` | Quem cuida do código |
| **Compartilhado** | `package.json`, `README.md`, este arquivo | Combinar antes |

Se sua tarefa exige tocar no território do outro, faça o mínimo necessário e diga isso na mensagem
de commit. Não refatore de passagem.

## O que vale mais neste repositório

Em caso de conflito de merge com outra base, **o código do outro lado vence, os dados e o conteúdo
daqui vencem.** Não é apego. Um lado é reproduzível numa tarde e o outro não:

1. `src/data/termos.json` tem 158 termos com o nome oficial em PT e EN, extraídos das strings do
   jogo. Isso não existe publicado em lugar nenhum. É o ativo número um.
2. `src/content/wiki/*.md` tem 15 páginas revisadas, com contradições já corrigidas e fontes cruzadas.
3. `src/data/pals.json` e `src/data/mapa.json` são dados verificados à mão.

## Convenções de conteúdo

- **Português brasileiro em tudo**, incluindo comentário de código e mensagem de commit.
- **Nunca use travessão (—) ligando frases.** Reescreva com ponto, vírgula ou dois-pontos.
- Frontmatter obrigatório: `titulo`, `descricao`, `ordem`. Opcionais: `atualizado`, `rascunho`.
- `ordem` não pode repetir entre páginas. O verificador falha se repetir.
- Caixas de destaque usam diretiva: `:::cuidado`, `:::atencao`, `:::dica`, `:::nota`, `:::destaque`,
  fechadas com `:::` sozinho na linha.
- Números que aparecem em mais de uma página (level cap, total de Pals, cópias para condensar)
  precisam bater. O verificador compara.
- Quando uma fonte contradiz outra, **registre a divergência** em `fontes.md` em vez de escolher em
  silêncio. Isso já evitou publicar level cap errado.

## Marcação bilíngue, o mecanismo

No build, um plugin rehype em `astro.config.mjs` varre o HTML e envolve todo termo conhecido:

```html
<span data-termo="apt_mining" data-pt="Garimpo" data-en="Mining">Garimpo</span>
```

O seletor no navegador troca o `textContent` de todos de uma vez, sem recarregar. Quem escreve o
guia não marca nada à mão.

Três coisas que a implementação precisa continuar acertando, aprendidas errando:

1. Não marcar dentro de título, código, link ou endereço. Vira ruído e quebra link.
2. Casar do termo mais longo para o mais curto, senão "Arena" é trocado dentro de "Arena Merchant".
3. Manter a lista `NAO_MARCAR` em `src/lib/termos.js` para palavras curtas demais em português.
   "Fazenda", "Coleta" e "Transporte" aparecem em frases onde não são nome de coisa do jogo.

## Armadilhas já pisadas

Não repita estas. Cada uma custou uma reversão.

- **Substituição automática de termo quebra concordância.** Trocar em massa gerou "do seu Caixa de
  Pal" e "um Águas Termais". Por isso `padronizar-conteudo.mjs` tem um passo separado de correção
  de artigo, e uma lista `NAO_MEXER` que protege `glossario.md` e `fontes.md`, que *são* a tabela
  de tradução e seriam destruídos por ela.
- **Termo composto quebra por vizinhança.** "Ancient Technology 72" virou "Ancient Tecnologias 72".
  A proteção é não trocar quando a palavra vizinha começa com maiúscula.
- **`astro-pagefind` precisa da extensão no import:** `astro-pagefind/components/Search.astro`.
- **`display: flex` vence `[hidden]`.** O painel do assistente nascia aberto tapando o conteúdo.
  Se você der display a um elemento que usa `hidden`, adicione a regra `[hidden] { display: none }`.
- **Link absoluto morre em arquivo local.** O site usa `/breeding/`, o que está certo servido por
  HTTP e quebra tudo aberto com duplo clique. É por isso que `npm run offline` existe.
- **Playwright neste ambiente** precisa de `executablePath: '/opt/pw-browsers/chromium'`, e o script
  tem que rodar de dentro do projeto para resolver `node_modules`.
- **O cache de conteúdo do Astro engole mudança de plugin.** Editar o plugin rehype e rodar
  `npm run build` NÃO reprocessa markdown que não mudou: o HTML velho sai do cache e a mudança
  parece não ter efeito. Apague `.astro/` e `node_modules/.astro/` antes de medir qualquer mudança
  em `astro.config.mjs`. Custou uma rodada de depuração achar isso.
- **`\b` de regex é ASCII.** Termo que começa ou termina em letra acentuada ("Águas Termais",
  "Árvore Mundial") nunca casa com `\b` depois de espaço. Use lookarounds Unicode
  `(?<![\p{L}\p{N}_])` e `(?![\p{L}\p{N}_])` com a flag `u`. Foram 37 ocorrências sem marcação
  por causa disso.
- **O `data-filters` do paldb tem aptidão com espaço no nome** ("Generating Electricity8").
  Separar por espaço descarta essas em silêncio: a primeira importação saiu sem energia,
  manipulação e petróleo em 299 Pals. O importador atual casa o par nome+nível com regex e
  ABORTA sem gravar se alguma aptidão inteira sumir.
- **Teste de estilo por `file://` é placebo.** O CSS do site é referenciado por caminho
  absoluto (`/_astro/...`), que em `file://` aponta para a raiz do disco e não carrega: a página
  abre sem estilo nenhum. Toda asserção com `getComputedStyle` passa por acidente. Foi assim que o
  teste do painel do assistente ficou aprovando o próprio bug que ele existia para pegar,
  comprovado sabotando a correção e vendo o portão passar. Por isso `testar-navegador.mjs` sobe um
  servidor estático e testa o site por HTTP. O pacote offline continua em `file://`, e ali está
  certo, porque o CSS dele é embutido.
- **Tradução de elemento tem três pegadinhas oficiais:** Dark é "Escuridão" (não "Sombrio"),
  Dragon é "Dracônico" (não "Dragão"), Neutral é "Não elemental" (não "Neutro"). Conferido nos
  tooltips da página PT do paldb, que serve as strings do jogo.

## Como entregar

1. Leia a tarefa em `TAREFAS.md` e o requisito que ela cita em `PRD.md`.
2. Faça a menor mudança que satisfaz o critério de aceite.
3. Rode `npm run verificar && npm run build`. Os dois têm que passar.
4. Se a tarefa mudou algo visual, tire screenshot e olhe. Vários defeitos deste repositório só
   apareceram numa imagem, nunca no log.
5. Commit em português, no imperativo, explicando o porquê e não o quê.
6. Marque a tarefa como feita em `TAREFAS.md` no mesmo commit.

Se você não conseguir satisfazer o critério de aceite, **não afrouxe o critério**. Escreva o
impedimento no fim da tarefa e pare.
