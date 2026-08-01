# Fila de trabalho

Uma tarefa por vez, de cima para baixo. Cada uma cita o requisito de `PRD.md` que justifica
existir, e tem critério de aceite verificável por comando, não por opinião.

Marque `[x]` no mesmo commit que entrega a tarefa.

**Antes de começar qualquer uma:** leia `CLAUDE.md`.
**Antes de fechar qualquer uma:** `npm run verificar && npm run build`, os dois passando.

---

## Bloco A — Fechar o bilíngue

Este bloco entrega R2.4 e R2.5. É o diferencial do projeto e está a três tarefas de ficar pronto.
O material já está escrito: as 65 strings de interface estão no Anexo A do `PLANO-BILINGUE.md`, em
JSON válido, e os títulos em inglês no Anexo B. Não invente tradução, use o que está lá.

### [x] A1 — Arquivo de strings de interface

**Requisito:** R2.4
**Território:** conteúdo e dados

Criar `src/data/interface.json` com as strings do Anexo A do `PLANO-BILINGUE.md`, no formato
`{ "chave": { "pt": "...", "en": "..." } }`. O Anexo A é o ponto de partida, não o teto: o arquivo
cresce com a copy nossa que a moldura precisar. Chave começando com `_` é comentário, não string.

**Aceite:** este comando não lança. Ele mede completude, não tamanho: contagem fixa só travaria o
arquivo, e foi por isso que a versão anterior deste aceite foi trocada.

```bash
node -e "
const fs = require('fs');
const bruto = fs.readFileSync('./src/data/interface.json', 'utf-8');
const d = JSON.parse(bruto);
const noArquivo = [...bruto.matchAll(/\"([^\"]+)\"\s*:\s*\{/g)].map((m) => m[1]);
const repetidas = noArquivo.filter((k, i) => noArquivo.indexOf(k) !== i);
if (repetidas.length) throw new Error('chave duplicada: ' + [...new Set(repetidas)].join(', '));
const e = Object.entries(d).filter(([k]) => !k.startsWith('_'));
const f = e.filter(([, v]) => !v || !v.pt || !v.en);
if (f.length) throw new Error('sem par PT/EN: ' + f.map(x => x[0]).join(', '));
console.log(e.length + ' strings completas, nenhuma duplicada');
"
```

Mais `npm run verificar` passando.

### [x] A2 — Helper de rótulo e uso nos componentes

**Requisito:** R2.4
**Território:** código e visual (combinar antes se A1 ainda não estiver commitada)

Criar em `src/lib/` o helper `ui(chave, idioma)` que a seção 1.2 do `PLANO-BILINGUE.md` já define
por inteiro (use aquele código, não invente outro), e trocar as strings fixas de
`src/layouts/Base.astro`, `src/components/`, `src/pages/index.astro`, `src/pages/mapa.astro` e
`src/pages/pals.astro` por elementos com `data-rot-pt` e `data-rot-en`.

O `SeletorIdioma.astro` já troca esses atributos. **Pode mexer nele no mínimo necessário** para os
dois casos da seção 1.4 que a lógica atual não cobre: `<option>` dentro de `<select>` e o
`placeholder` da busca, que é atributo e não texto. Fora isso, não refatore.

**Aceite:**
- `grep -rn "Ferramentas\|Guias\|Mapa interativo\|Banco de Pals" src/layouts/ src/pages/*.astro`
  só encontra ocorrências dentro de chamadas `ui(...)` ou de atributos `data-rot-*`.
- Com Playwright: abrir `dist/index.html`, clicar em EN, e nenhum rótulo do menu, do seletor ou dos
  filtros continuar em português.
- `npm run verificar && npm run build` passam.

### [x] A3 — Título e descrição das páginas em dois idiomas

**Requisito:** R2.5
**Território:** compartilhado (schema é código, conteúdo é dados)

Estender o schema em `src/content.config.ts` com `titulo_en` e `descricao_en` opcionais, preencher
nos 15 arquivos com o Anexo B, e usar no menu e na home via `data-rot-pt` / `data-rot-en`.

Campos opcionais de propósito: página sem tradução continua mostrando o português, não quebra.

O Anexo B foi escrito quando havia 14 páginas. **Falta a linha de `meu-save`**, que entrou depois.
Sugestão, para não travar a tarefa: `Where we are now` / `Snapshot of the save: character, squad,
Palbox, guild chest and the real bottlenecks.`

**Aceite:**
- `npm run build` passa com os 15 arquivos preenchidos.
- Clicar em EN troca o texto do menu lateral inteiro.
- `npm run verificar` passa.

### [x] A4 — Resultados da busca também alternam

**Requisito:** R2.4
**Território:** código e visual

Hoje o `placeholder` da busca alterna, e o resto do Pagefind não: "Nada encontrado para", "Ver mais
resultados", "Limpar" e a contagem de resultados nascem em português na inicialização e ficam assim.
As strings já existem em `interface.json` (`busca_vazio`, `busca_mais`, `busca_limpar`).

O `PagefindUI` aceita um objeto `translations` na inicialização, então a saída é reconstruir a
instância quando o idioma muda, em vez de tentar reescrever o DOM que ela gerou. Cuidado com o
estado: quem já digitou uma busca não pode perder o que escreveu na troca.

**Aceite:**
- Com EN ligado, buscar por algo que não existe mostra a mensagem de vazio em inglês.
- Trocar de idioma com uma busca digitada mantém o texto no campo.
- Asserção nova em `scripts/testar-navegador.mjs`, servida por HTTP, e provada sabotando a
  correção: com o código antigo de volta, ela tem que falhar.

**Feita, por um caminho diferente do previsto, e a diferença importa.** A tarefa supunha o
`PagefindUI` antigo, com traduções passadas na inicialização. A versão instalada do
`astro-pagefind` é a de web components, e o `uiOptions` que estava no `Base.astro` **nunca chegou à
busca**: prop desconhecida em componente Astro é ignorada sem aviso. Ninguém tinha errado ao
escrever a tradução, ela só nunca foi lida.

O componente traz o conjunto completo nos dois idiomas, com o termo buscado dentro da mensagem de
vazio, plural e texto de leitor de tela. Trocar o idioma da instância é uma chamada e preserva o
que já foi digitado, porque quem redesenha é o próprio componente. Reconstruir a instância, que era
a saída prevista aqui, perderia a busca em andamento.

`busca_vazio` e `busca_mais` saíram do `interface.json`: eram piores que as do componente (a nossa
de vazio nem mostrava o termo buscado) e, paradas ali, seriam lidas como a fonte da verdade da
busca pelo próximo que abrisse o arquivo.

### [x] A5 — Moldura das páginas de guia

**Requisito:** R2.5
**Território:** código e visual

A A3 preencheu `titulo_en` e `descricao_en` nos 15 arquivos, e o menu e a home usam. A própria
página do guia não: o `h1`, o subtítulo e o carimbo continuam em português com o site em EN.
Falta declarar os dois idiomas em `src/pages/[...slug].astro` e criar a string do carimbo
(`Palworld 1.0.2 · atualizado 30.07.2026`) em `interface.json`.

O corpo do guia continua em português, por R2.7. Isto é só a moldura da página.

**Aceite:**
- Abrir qualquer guia com EN ligado e ver título, subtítulo e carimbo em inglês.
- Página sem `titulo_en` continua mostrando o português, sem quebrar.

**Feita.** O segundo critério foi conferido tirando o `titulo_en` de `armadilhas.md`, construindo e
abrindo a página em EN: título e subtítulo em português, carimbo em inglês, nenhum erro de
JavaScript. O frontmatter foi devolvido depois.

Achado no caminho, e corrigido junto porque é contradição de número na mesma página: o carimbo lia
a data em UTC e o rodapé pelo fuso local, então a mesma linha do frontmatter virava
`atualizado 30.07.2026` em cima e `Revisado em 29/07/2026` embaixo. As duas passaram a usar
`src/lib/datas.js`, e uma asserção nova compara as duas datas da mesma página.

---

## Bloco E — Fechar a Camada 1, a wiki completa

O catálogo com os 299 Pals já está importado e conferido. Falta transformá-lo em site. Este bloco é
o que faz a wiki competir com as grandes em cobertura, e ele vem antes do bloco D: não adianta ter
overlay de progresso sobre uma wiki que só conhece 77 Pals.

Exceção de ordem: **E3 depende de D1**, que está no bloco D. Ao chegar em E3, execute D1 primeiro e
volte. É a única dependência cruzada entre os blocos.

### [x] E1 — Uma página por Pal, gerada do catálogo

**Requisito:** R1.7
**Território:** código e visual

Rota dinâmica que gera 299 páginas a partir de `catalogo.json`: nome nos dois idiomas, número da
Palpédia, elementos, aptidões em barra, e as ligações para os guias que citam aquele Pal. Quando
houver entrada correspondente em `pals.json`, a curadoria aparece em destaque acima da ficha.

**Aceite:**
- `npm run build` gera 299 páginas de Pal mais as 18 atuais, sem erro.
- Página de Pal sem curadoria mostra: nome nos dois idiomas, número, elementos, aptidões em barra,
  e uma linha dizendo que ainda não há análise nossa com link para `CONTRIBUINDO.md`. Nada de página
  em branco nem de erro.
- Pagefind indexa todas.
- O tempo de build continua abaixo de um minuto. Se passar, pagine ou gere sob demanda.

### [x] E2 — Separar a navegação em duas camadas

**Requisito:** 3.0 do PRD
**Território:** código e visual

O menu passa a ter dois blocos claros: **A wiki** (catálogo, guias, mapa, calculadoras) e **O nosso
mundo** (painel, bases, squad, decisões). Alguém que chega pelo Google cai na primeira e nunca
esbarra na segunda sem querer.

**Aceite:**
- O menu tem os dois blocos com títulos distintos, e nenhum link de página do nosso mundo aparece
  no bloco da wiki.
- `grep -rn "meu-save\|nossas-bases\|Base 1\|Palbox do\|baú de guilda" dist/index.html` não
  encontra nada: a home da wiki não menciona o nosso save.
- As páginas do nosso mundo continuam acessíveis pela seção própria.

### [x] E3 — Interruptor de overlay do progresso

**Requisito:** 3.0 do PRD
**Território:** código e visual
**Bloqueado por:** D1, E1, E2

Um botão global liga o overlay: distintivo de posse no catálogo (dizendo QUEM tem, lido dos saves
individuais), estoque da guilda nas calculadoras, nossas bases no mapa. Desligado, o site é uma
wiki normal. Comparação alimentada por save com `lido_em` vencido (14 dias) não aparece: no lugar
entra "desatualizado". Vazio honesto vale mais que número velho.

**Aceite:**
- Com o overlay desligado, nenhuma página da Camada 1 exibe dado do nosso save.
- A escolha persiste entre páginas, como o idioma e o tema.
- Sem JavaScript, o site continua sendo a wiki completa. O overlay é adição, nunca requisito.

### [x] E4 — Importar itens, estruturas e tecnologias

**Requisito:** R1.8
**Território:** conteúdo e dados

Mesmo caminho do `importar-catalogo.mjs`, que já provou funcionar com uma requisição por idioma:
achar a página de índice de cada tipo no paldb e extrair.

**Aceite:**
- `npm run catalogo:importar` passa a trazer as quatro coleções.
- O verificador confere estrutura de todas, como já faz com Pals.
- Nenhum campo é digitado à mão.

### [x] E5 — As calculadoras, todas de uma vez

**Requisito:** R1.9 e R5.2
**Território:** código e visual
**Bloqueado por:** E1, D1

Fusão da E5 com a antiga D5, decidida em 31.07 e registrada no `PRD.md`. Separadas, a calculadora
de bolo nascia duas vezes: uma na D5 lendo o nosso estoque e outra na E5 sem ele. É a mesma
calculadora com o overlay ligado e desligado, então é uma tarefa só.

Calculadoras funcionando sem o overlay, com o usuário digitando os valores, e todas com os campos
pré-preenchidos pelo nosso estoque quando o overlay estiver ligado:

1. **Bolo.** Entrada editável para os seis valores: trigo, farinha, frutas vermelhas, leite, ovos e
   mel. A conversão do moinho é 2 de trigo para 1 de farinha. O número de bolos é o piso do
   ingrediente mais escasso, e a mensagem nomeia qual é. O protótipo só tem campo para trigo e
   farinha, e isso é defeito dele: o aceite exige mexer em leite e ovos.
2. **Cruzamento**, par para alvo e alvo para par, usando o CombiRank do catálogo.
3. ~~Taxa de captura.~~ **CANCELADA em definitivo em 01.08**, decisão registrada na seção 5 do
   `PRD.md`. No lugar dela entra uma **tabela de poder de captura**, que é dado e não fórmula, e que
   está esperando números: ver o impedimento no fim da tarefa.
4. **Condensação**, só o total para 4★ enquanto a distribuição por estrela não tiver fonte.

**Aceite:**
- Cada calculadora funciona com o overlay desligado.
- Cada uma tem versão em tabela.
- A de cruzamento usa o CombiRank importado, não uma tabela copiada à mão.

**Bolo**
- Com o estoque real de 30.07 (leite 0, ovos 0) o bolo dá 0 e a mensagem diz que a trava é leite,
  citando o Mozzarina parado no Palbox.
- Trocando leite para 180 e ovos para 200, o resultado passa a 18 e a mensagem aponta farinha,
  dizendo que o gargalo real é trigo.

**Cruzamento.** Os três casos abaixo cobrem os três caminhos do cálculo, e cada um veio de tabela do
paldb, a mesma origem do catálogo. A regra completa, com a conferência que a produziu, está em
`fontes.md`. Rank aqui é sempre o CombiRank.

- **Média com casamento exato.** Anubis (480) com Chikipi (3080) dá média 1780, e existe espécie
  exatamente nesse rank. Saída esperada: **Snock**.
- **Empate na média.** Anubis (480) com Teafant (3070) dá média 1775, entre Hoodle (1770) e Snock
  (1780). O jogo escolhe o rank maior. Saída esperada: **Snock**. Uma implementação que escolha o
  menor devolve Hoodle e está errada em 59 dos 148 pares conferidos.
- **Combinação única vence a média.** Relaxaurus (1090) com Sparkit (3010) dá média 2050, que pela
  fórmula levaria a Mossanda (2060). A tabela de combinações únicas manda outra coisa e é ela que
  vale. Saída esperada: **Relaxaurus Lux** (770). No sentido inverso, pedir Relaxaurus Lux como
  alvo tem que listar o par Relaxaurus + Sparkit.

**Condensação.** O número com fonte é **48 cópias da espécie para 4★**, que está em
`base-e-trabalho.md` e o verificador já compara entre páginas.

- Com **5 cópias** guardadas, a saída é **faltam 43** para 4★.
- Com **48 cópias**, a saída é **faltam 0**, e a mensagem diz que dá para condensar agora.
- A calculadora **não** responde quantas faltam para 1★, 2★ ou 3★. A distribuição por estrela está
  registrada em `fontes.md` como não oficial, e número inventado numa calculadora é pior que
  calculadora ausente, porque parece certo. Para destravar: abrir a UI do Casulo de Condensação no
  jogo, anotar as quatro faixas e registrar em `fontes.md`.

**Calculadora de captura: cancelada em 01.08, decisão fechada.** A fórmula nativa do 1.0 não está
recuperada publicamente, nenhuma fonte a publica com citação, e o jogo já mostra a probabilidade na
mira, o que faria a calculadora ser pior que a tela que o jogador tem. Motivo completo na seção 5
do `PRD.md`.

**A tabela de poder de captura deixou de depender de número colado.** O paldb publica "Capture
Power" como atributo do item, e o importador passou a trazer os atributos numéricos da página de
categoria: **onze esferas numa requisição**, com aborto se nenhuma vier com poder de captura. A
divergência entre fontes está resolvida em `fontes.md`: a wiki.gg não lista Sol, Ancient nem Raider
e se refere ao Feybreak, anterior ao 1.0, enquanto o paldb dá os mesmos números do `palmods.gg`.

Efígie de Lifmunk, módulo de esfera e penalidade de alfa **ficam de fora**: o paldb não publica
esses como atributo, e a página vai dizer que ficaram de fora e por quê, em vez de deixar linha
vazia.

**Impedimento aberto: duas esferas divergem da conferência independente.**

A conferência de 01.08 cobria cinco esferas e bateu em três. As outras duas:

| Esfera | paldb, importado | conferência da wiki.gg |
|---|---|---|
| Hyper Sphere | **27** | **26** |
| Ultra Sphere | **33** | **32** |

A regra combinada é não escolher em silêncio quando o importado difere do conferido, então a tabela
não sobe até a confirmação. Vale notar que a diferença de um ponto é a mesma já observada em
Legendary e Ultimate, e que as três esferas antigas bateram exatamente, o que aponta para a mesma
causa: a página da wiki.gg parou antes do 1.0.

### [x] E7 — Índices de item, estrutura e tecnologia

**Requisito:** R1.8 (estendido pela decisão de 31.07 no `PRD.md`)
**Território:** código e visual

Três páginas de índice filtrável, no mesmo padrão visual do banco de Pals, consumindo `itens.json`,
`estruturas.json` e `tecnologias.json`.

**Aceite:**
- As três páginas existem, filtram, e o Pagefind indexa as três.
- Um item que só existe em `itens.json` é encontrável pela busca do site.
- O build continua abaixo de um minuto.
- Nenhum registro é omitido em silêncio: se o índice mostrar menos que o total do JSON, a página
  diz quantos e por quê.

**Entregue, e o impedimento que ela levantou está fechado.** Os quatro critérios passaram: as três
páginas existem e filtram, o Pagefind indexa as 321, a busca acha um item que só existe em
`itens.json`, o build ficou em 12,3s e as 46 entradas internas escondidas são contadas e explicadas
na página.

O que travou foi o **pacote offline, que chegou a 3151 KB e passou do teto de 3 MB** combinado na
E6. Ninguém estourou sozinho: a D4 levou o banco de Pals de 77 linhas para 299 cartões mais tabela
(596 KB) e a E7 acrescentou os três índices (681 + 273 + 207 KB). As 299 fichas somam outros 711 KB.

**Escolhida a saída 1, subir o teto, em 31.07.** As outras duas custavam conteúdo: a 2 tirava
justamente a consulta que mais faz sentido sem internet, que é procurar um item, e a 3 rendia pouco
mais de 150 KB sacrificando a alternativa em tabela que o R5.8 exige. O teto novo é 8 MB, com a
medição que o justifica registrada nas decisões do `PRD.md`, e deixou de ser prosa numa tarefa:
`scripts/gerar-offline.mjs` aborta com código 1 ao estourar e imprime a composição por seção em toda
execução, para duplicação acidental aparecer no log do portão em vez de sumir dentro do total.

### [x] E6 — O pacote offline inclui as fichas de Pal

**Requisito:** R3.6
**Território:** conteúdo e dados

O gerar-offline.mjs varre só os diretórios de primeiro nível do dist, então as
299 fichas ficam de fora. Pior: o aviso de páginas perdidas que o script já tem
não dispara, porque `esperadas` conta os mesmos 18 diretórios que foram
extraídos. É corte silencioso, que o CLAUDE.md proíbe.

Medição feita antes de decidir: o corpo HTML das 299 fichas soma 711 KB e o
texto puro soma 95 KB. O arquivo vai de 604 KB para cerca de 1,4 MB. Barato o
bastante para incluir, e o caso de uso do offline é justamente consultar um Pal
sem internet.

Faça a varredura descer um nível e a contagem de `esperadas` refletir o total
real, não só o primeiro nível.

**Aceite:**
- O pacote offline contém as 317 páginas, e a busca em memória acha um Pal que
  só existe em ficha, por exemplo Aegidron.
- Sabote: remova uma ficha da lista antes de montar e confirme que o script
  ABORTA dizendo qual ficou de fora. Se não abortar, o aviso continua cego.
- Uma asserção nova em testar-navegador.mjs cobrindo isso, com prova de que
  acusa quando sabotada.
- O teto é de 8 MB (8388608 bytes), subido de 3 MB em 31.07 com a medição
  registrada nas decisões do `PRD.md`. Quem verifica é o próprio
  `gerar-offline.mjs`, que aborta com código 1 e mostra o quanto passou.

## Bloco D — Trazer o protótipo para o site

O desenho está pronto e testado em `proto/index.html`. Estas tarefas são de portar, não de inventar:
abra o protótipo, copie o comportamento. Ordem importa, porque D1 é a base das outras.

### [x] D1 — `save.json` como fonte única do estado

**Requisito:** R5.1
**Território:** conteúdo e dados

O estado vive em DOIS níveis, espelhando o que o jogo compartilha de verdade em co-op:

- `src/data/guilda.json`: o que é do grupo. Bases com coordenada e Pals alocados, baú de guilda,
  torres derrotadas.
- `src/data/saves/<nome>.json`: o que é individual (João, Pedro e os outros dois). Nível, squad,
  Palbox, Palpédia. Cada arquivo carrega `lido_em` com a data da leitura.

Cada gargalo em `guilda.json` precisa de `gravidade` (`critico`, `serio`, `atencao`, `bom`),
título, explicação e, quando existir, a página que resolve.

Números não moram em dois lugares: ao criar os JSONs, **remova os números de `meu-save.md`** e
deixe a página apontando para o painel. Página de prosa comenta o estado, não o duplica.

O leitor automático de save (`scripts/ler-save/`, tarefa B3) alimenta estes arquivos quando a
dependência dele destravar. Até lá, preenchimento manual pelas telas.

**Aceite:**
- `npm run verificar` ganha uma checagem nova: os JSONs são válidos, toda gravidade está no
  conjunto permitido, todo Pal citado em `guilda.json` existe no catálogo, e `lido_em` existe em
  todo save individual.
- Save individual com `lido_em` mais velho que 14 dias gera AVISO, não erro: é o gatilho para o
  site esconder comparação desatualizada em vez de mentir.

### [x] D2 — Painel do save na seção do nosso mundo

**Requisito:** R5.1
**Território:** código e visual
**Bloqueado por:** D1

Criar a página do painel na área do nosso mundo (rota própria, por exemplo `/painel/`), com os
quatro medidores e a fileira de gargalos do protótipo (componentes `.kpi`, `.medidor` e
`.gargalo`). **Não é a home do site**: a home é da wiki, e a decisão E2 proíbe o save aparecer lá.
O painel é a home *da seção* do nosso mundo.

**Aceite:**
- O painel lê de `guilda.json` e dos saves individuais. Nenhum número escrito direto no `.astro`.
- Trocar um valor no JSON muda o painel sem tocar em componente.
- Sinal de gravidade nunca é só cor: tem símbolo e texto.

### [x] D3 — Ficha do Pal em popover

**Requisito:** R5.3
**Território:** código e visual

Estender o plugin rehype de `astro.config.mjs`, que já envolve termos do dicionário, para também
marcar nome de Pal presente em `pals.json`. O popover monta a ficha a partir do mesmo JSON.

Cuidado com as três regras que já valem para a marcação bilíngue: não marcar dentro de título,
código ou link; casar do nome mais longo para o mais curto, senão "Reptyro" é marcado dentro de
"Reptyro Cryst"; e respeitar a lista de exceções.

**Aceite:**
- Passar o mouse ou dar foco de teclado num nome de Pal abre a ficha.
- Funciona com teclado, não só com mouse.
- Nenhum nome marcado dentro de `<h1>` a `<h4>`, `<code>` ou `<a>`.
- `npm run build` passa e todas as páginas continuam gerando, sem cair nenhuma.

### [x] D4 — Banco de Pals com filtro por aptidão e posse

**Requisito:** R5.4, R5.5
**Território:** código e visual
**Bloqueado por:** D1

Reescrever `src/pages/pals.astro` no formato do protótipo: cartões com barra de aptidão, distintivo
de posse lido do `save.json`, filtro que ordena por nível da aptidão escolhida.

**Aceite:**
- Filtrar por Garimpo lista os Pals de Garimpo em ordem decrescente de nível.
- O distintivo de posse vem do `save.json`, não está escrito no componente.
- A página continua indexada pelo Pagefind.

### D5 — Calculadora de bolo

**Fundida na E5 em 31.07.** A calculadora de bolo com o nosso estoque e a calculadora de bolo sem
ele são a mesma calculadora com o overlay ligado e desligado. Feitas em tarefas separadas, ela
nasceria duas vezes. O texto inteiro, incluindo os dois números de aceite, está na E5.

### [x] D6 — Tema claro e escuro

**Requisito:** R5.6, R5.7
**Território:** código e visual

Os dois temas são desenhados, com valores próprios de superfície e de dado. Não é filtro de inversão.
As cores de dado do protótipo já passaram no verificador de contraste e daltonismo nos dois modos.

**Aceite:**
- O botão troca e a escolha persiste, como já acontece com o idioma.
- Respeita a preferência do sistema quando o usuário nunca escolheu.
- A escolha do usuário vence a do sistema nos dois sentidos.

## Bloco B — Fechar as pontas do conteúdo

### [ ] B1 — Uma página por base, com dado real

**Requisito:** R1.4
**Território:** conteúdo e dados
**Bloqueado por:** precisa das telas de cada base no jogo. Sem elas, não comece.

Hoje `nossas-bases.md` descreve quatro bases genericamente e `mapa.json` tem coordenadas estimadas.
Substituir por dado observado: coordenada real, lista de Pals alocados com aptidão, estruturas
presentes e o gargalo identificado de cada uma.

O `meu-save.md` já registra que nenhuma base está sobre nó de petróleo e que a pedra está doze vezes
atrás da madeira. Esta tarefa transforma esse diagnóstico em "qual base muda, e para onde".

**Aceite:**
- Cada uma das quatro bases tem coordenada conferida em `mapa.json`, sem valor estimado.
- Cada base tem um gargalo nomeado, ou a frase explícita de que não tem.
- `npm run verificar` passa sem aviso de marcador sem anotação.

### [x] B2 — Registrar a versão do cliente e alertar sobre defasagem

**Requisito:** R3.5
**Território:** conteúdo e dados

`verificar-patch.mjs` já compara a versão declarada pela wiki com as notícias oficiais. Falta
comparar com a **versão que o grupo está rodando de fato**, que hoje está uma atrás.

Adicionar a `src/data/versao.json` (que já existe e o script já lê) um campo `cliente_do_grupo`, e
fazer o script avisar quando wiki, jogo publicado e cliente do grupo não forem os três iguais.

**Aceite:**
- `npm run patch:verificar` distingue os três números e diz qual está atrás.
- O script sai com código 0 quando tudo bate e 0 com aviso quando o cliente está atrás. Nunca
  quebra o build por isso, porque não é erro de conteúdo.

**Feita.** Os dois caminhos foram conferidos rodando: com o cliente atrasado sai aviso e código 0,
e com os três iguais sai "os três batem" e código 0.

A comparação roda **antes** do retorno antecipado de "a wiki está em dia". Era exatamente esse o
caso cego: wiki e jogo iguais, o script encerrava, e o cliente atrasado do grupo nunca aparecia.

O valor de `cliente_do_grupo` não foi inventado: `meu-save.md` registra que o cliente estava uma
versão atrás da publicada em 30.07, e a lista de notas do próprio `versao.json` diz qual era a
anterior. O campo tem comentário mandando conferir na tela de título e corrigir quando o grupo
atualizar.

---

## Bloco C — Publicar

### [ ] C1 — Publicar o worker do assistente

**Requisito:** R3.4
**Território:** código e visual

O worker está escrito em `worker/` e nunca foi publicado, então o botão do assistente abre e não
responde. Publicar no Cloudflare, pôr a URL em `ENDERECO_ASSISTENTE` em `src/components/Chat.astro`,
e confirmar que sem a URL o botão continua explicando o que falta em vez de dar erro.

**Aceite:**
- Com a URL preenchida, uma pergunta retorna resposta baseada no conteúdo da wiki.
- Com a URL vazia, o painel abre e explica que falta publicar. Não pode aparecer erro de rede.

### [ ] C2 — Resolver o destino do repositório

**Requisito:** decisão registrada 8 do `PRD.md`
**Território:** compartilhado
**Bloqueado por:** decisão humana

`nederreis/PalCrew` é privado e a conta do grupo não tem acesso nem convite. Enquanto isso não muda,
não dá para integrar. Duas saídas, nesta ordem de preferência: tornar o repositório público, ou
adicionar `jgac2014` como colaborador.

Quando destravar, seguir a ordem de `INTEGRACAO.md`: dicionário e dados primeiro, conteúdo depois,
scripts, marcação bilíngue, assistente por último.

**Aceite:**
- `gh api repos/nederreis/PalCrew` responde.
- `src/data/termos.json`, `src/data/pals.json`, `src/data/mapa.json` e `src/content/wiki/` presentes
  na base de destino, com `npm run verificar` passando lá.

---

### [ ] B3 — Reativar o leitor de save quando a biblioteca atualizar

**Requisito:** R5.1
**Território:** conteúdo e dados
**Bloqueado por:** dependência externa

O leitor em `scripts/ler-save/` está pronto e testado: acha o save da versão Xbox,
descomprime, escolhe o mundo certo por evidência e traduz o id interno para o nome
oficial usando o `catalogo.json`. Ele não funciona no nosso save por um motivo que
não é nosso: o `palworld-save-tools` ainda não suporta as estruturas que o jogo
introduziu, e o fluxo binário desalinha. Detalhe completo em `scripts/ler-save/LEIA.md`.

**Aceite:**
- `pip install --upgrade palworld-save-tools` e o comando de extração produzem um
  `save.json` com o jogador de nível 52 e o Palbox completo.
- Enquanto isso não acontecer, esta tarefa fica parada. Não tente contornar
  ignorando o erro: já foi tentado e não recupera o alinhamento.

## Fora da fila

Coisas que parecem tarefa e não são. Não puxe sem conversar.

- **Traduzir o corpo dos guias.** Recusado em R2.7.
- **Traduzir os 118 campos de texto de `pals.json`.** Adiado em R2.6. É a primeira coisa a cair.
- **Extrair as strings do jogo direto do `.pak`.** Tecnicamente possível: o cliente está em
  `C:\XboxGames\Palworld`, formato IoStore, e teria a tabela de localização completa em vez dos
  158 termos. Custa meio dia e uma chave AES. Só vale se a cobertura do dicionário virar gargalo,
  e hoje não é.
- **Trocar de framework.** Ver `CLAUDE.md`.
