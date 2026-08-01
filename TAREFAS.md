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
   está publicada com os onze valores importados: ver o registro no fim da tarefa.
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
categoria: **onze esferas numa requisição**, com aborto se nenhuma vier com poder de captura.

Efígie de Lifmunk, módulo de esfera e penalidade de alfa **ficam de fora**: o paldb não publica
esses como atributo, e a página diz que ficaram de fora e por quê, em vez de deixar linha vazia.

**Impedimento fechado em 01.08: vale a coluna do paldb, inteira.** A tabela subiu para
`/calculadoras/` com os onze valores importados, e o `fontes.md` registra os oito pares de números
para a conclusão poder ser reconferida sem refazer a pesquisa.

Duas coisas que estavam escritas errado aqui e no `fontes.md` foram corrigidas junto, porque
mudavam o argumento: a wiki.gg **lista** a Exotic, com 48, nas páginas Capture Power e Spheres, e a
divergência **não é de um ponto uniforme**. Ela é 0 em Pal, Mega e Giga, +1 em Hyper, Ultra,
Legendary e Ultimate, e +2 em Exotic. Diferença que cresce com o tier é forma de rebalanceamento de
patch, não de erro de transcrição, o que reforça que o paldb reflete o 1.0 e a página da wiki.gg é
anterior.

A **Radar Sphere sai da lista principal**: tem poder 20, o mesmo da Giga, e é a única das onze que
nenhuma linha de `tecnologias.json` desbloqueia, ou seja, não é esfera da progressão. Ela aparece em
nota logo abaixo da tabela, com o número e o motivo, em vez de sumir ou de sugerir equivalência com
a Giga. A separação sai do dado, não de lista escrita à mão: esfera com nível de tecnologia entra na
tabela, esfera sem nível vira nota.

**O gatilho trocou de referência.** Comparar o importado com a wiki.gg falharia para sempre por
motivo já resolvido, e gatilho que acusa o que já foi decidido é gatilho que alguém desliga. Os onze
valores estão congelados em `src/data/poder-captura.json`, e o verificador compara importação nova
contra essa referência, dizendo qual esfera mudou e de quanto. Esfera que sumir da importação ou
aparecer sem estar na referência também quebra o portão.

As três sabotagens que provam o gatilho, todas rodadas: trocar o poder da Ultra de 33 para 31 fez o
verificador dizer `Esfera Ultra: poder de captura 31 na importação e 33 na referência (-2)`; apagar
o nível de tecnologia da Sol acusou a esfera certa; inventar uma esfera nova com poder 70 acusou que
ela entraria na tabela sem conferência. A asserção de navegador que compara a tabela publicada com
`itens.json` foi provada da mesma forma, subtraindo 1 de cada número: acusou as dez linhas.

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

## Bloco F — Quando a wiki afirma e o site desmente

### [x] F1 — O par que gera Anubis não gera Anubis na calculadora

**Requisito:** R1.9
**Território:** conteúdo e dados

A wiki diz em três lugares que Anubis sai de **Vanwyrm com Azurobe**: o campo `onde` da curadoria em
`pals.json`, e o texto de `plano-de-acao.md` e `combate.md`. A calculadora responde **Slowatt** para
esse par, e está certa pelo que ela tem: Vanwyrm é rank 1650, Azurobe é 1830, a média dá 1740, e
Anubis é rank 480. Só que Anubis **não está nas 163 combinações únicas importadas** e também não
está marcado como `so_combinacao_unica`. Ou seja, pela nossa base ele não nasce de par nenhum.

Uma das duas está errada, e a suspeita é a importação: Anubis é receita conhecida do jogo, e o
`fontes.md` registra que a importação anterior trouxe **162** combinações únicas contra 163 agora.
Número que muda sozinho entre importações é sinal de que a extração perde linha.

**Comece pela importação, não pelo texto.** Corrigir o texto primeiro esconderia o defeito de dados
e deixaria os outros Pals de receita única errados do mesmo jeito, sem ninguém saber quantos são.

**Aceite:**
- `npm run testar` ganha um caso: Vanwyrm com Azurobe devolve **Anubis**, e não Slowatt.
- O verificador ganha uma checagem que reprova quando um Pal citado como `Cruzamento: A com B` no
  campo `onde` de `pals.json` não é o que a calculadora devolve para aquele par. Ela tem que valer
  para os 77 da curadoria, não só para o Anubis: se o defeito é de importação, há mais casos.
- A checagem é provada por sabotagem, e o número de pares conferidos aparece na linha de resumo.
- Se a conclusão for que a wiki está errada e o par não gera Anubis mesmo, então o texto muda nos
  três lugares e a divergência é registrada em `fontes.md` com a fonte que decidiu. Não vale
  escolher em silêncio.
- `npm run portao` passando.

**Feita, e eram dois problemas na mesma queixa.** A importação perdia linha de verdade, então
começar por ela estava certo: o recorte da tabela de únicas ia até o fim do documento em vez de
parar no `</table>`, e engolia a prosa seguinte como se fosse linha; e o regex só tolerava `<img>`
entre o link e o nome, então Pal marcado como alfa, que traz um `<span>` antes, tinha a linha
inteira descartada. São 164 combinações únicas e 116 espécies de par específico, e o 116 agora bate
com o que o `fontes.md` já afirmava. O importador aborta quando linha com Pal dentro não rende três
nomes.

Só que nada disso explicava o Anubis: ele não está na tabela de únicas do paldb, nem antes nem
depois. O par escrito na curadoria era **receita de Early Access**, e a calculadora estava certa.
Corrigido para Gildane com Ophydia nos três lugares.

A checagem nova cobre **um par**, que é quanto a curadoria tem escrito hoje, e a linha de resumo diz
esse número em vez de sugerir que conferiu 77. Ela vale para qualquer receita que for acrescentada.

### [ ] F2 — A regra de cruzamento não tem mais como ser reconferida

**Requisito:** R1.9
**Território:** conteúdo e dados
**Bloqueado por:** H1, pelo mesmo `Mappings.usmap`

A E5 validou a regra contra "149 combinações que o paldb publica para o Anubis" e declarou 148 de
148. A calculadora devolve **239 pares** para o mesmo alvo. A tentativa de reconciliar em 01.08
mostrou que **a referência não existe mais**: a página do Anubis não publica lista, quatro endpoints
de breeding respondem 404, e os 149 pares não estão gravados aqui. Detalhe em `fontes.md`.

**Por que ela está bloqueada, e não só parada.** As combinações do jogo não moram num site: saem das
**tabelas de dados do próprio jogo**, a de combinação única e o CombiRank por espécie. Então a fonte
reproduzível por comando é a **extração**, o mesmo caminho da H1, e ela precisa do mesmo
`Mappings.usmap`. Procurar outro site seria repetir o erro que criou esta tarefa.

**Segunda opinião disponível, e ela não é fonte.** O **PalCalc** (`github.com/tylercamp/palcalc`,
MIT) gera o `db.json` dele com o `PalCalc.GenDB`, que lê os arquivos do jogo por CUE4Parse. Serve
para cruzar resultado e localizar divergência. **Não serve de fonte**: o último lançamento é de
fevereiro de 2026, **anterior ao 1.0**, e o 1.0 refez a tabela de breeding inteira, que é exatamente
o que está em questão.

**Aceite:**
- As duas tabelas saem do `.pak` por comando, e o recorte usado fica **gravado no repositório**, com
  data e origem. Sem o recorte gravado, a tarefa não fecha: foi a falta disso que a criou.
- A regra é reconferida contra o extraído, e o verificador passa a imprimir quantos pares foram
  conferidos e quantos acertaram. Sem a contagem ao lado, não vale.
- A divergência de 149 para 239 fica explicada: ou o critério que filtrava a lista antiga aparece e
  entra na regra, ou fica registrado que a lista antiga é que era parcial.
- Se a nossa regra gerar pares a mais, a correção vem antes de qualquer tarefa nova, e as páginas que
  citam receita são revistas junto.
- A afirmação "148 de 148" volta ao site com o número novo, ou não volta. O aviso na calculadora sai
  no mesmo commit.

### [x] F3 — As URLs do `fontes.md` são citadas como conferência e não têm recorte gravado

**Requisito:** R1.2, com o gatilho por R1.5
**Território:** conteúdo e dados
**Prioridade:** abaixo da F2, acima de tudo mais

O `fontes.md` cita URLs como conferência e não guarda **nenhuma**. A armadilha já está escrita no
`CLAUDE.md` ("fonte consultada e não gravada deixa de existir") e descreve um defeito que o
repositório tem repetido em cada uma delas. O caso do cruzamento, que virou a F2, não foi exceção:
foi só o primeiro a envelhecer.

- Criar `src/data/recortes/` e gravar, para cada URL citada, o **trecho relevante** da página, não a
  página inteira, com data de captura e URL de origem no cabeçalho do arquivo.
- URL que já não abrir é registrada **na hora** no `fontes.md` como afirmação sem prova
  reproduzível, do mesmo jeito que foi feito com o cruzamento. Não vale consertar inventando outra
  fonte.
- `verificar-tudo.mjs` passa a reprovar quando URL citada no `fontes.md` não tem recorte
  correspondente. Provado por sabotagem, apagando um recorte.

**Aceite:**
- O número de URLs que ainda abrem e o de mortas, dito em vez de estimado.
- `npm run portao` passando.

**Feita. São 28 URLs, não 27: 27 com trecho gravado e 1 sem prova reproduzível.** A extração acha 28
distintas no corpo da página, e a diferença não é detalhe, é o mesmo defeito em escala menor: contar
de cabeça é o que produz este tipo de coisa.

**A contagem de mortas errou duas vezes, nas duas direções, e as duas correções valem mais que o
número final.**

Primeiro erro, 5 mortas. Requisição direta reprovava o changelog oficial da Steam (que monta a
página por JavaScript e volta como casca), o Dot Esports, a wiki.gg e o Reddit. Marcar essas quatro
como perdidas teria enfiado no `fontes.md` uma perda inventada, que é o defeito oposto e igualmente
caro. O `gravar-recortes.mjs` passou a tentar **duas vezes por URL**, requisição direta e navegador
de verdade, e só chama de perdida a que falha nas duas.

Segundo erro, 3 bloqueadas. **Duas delas estavam vivas**, e a máquina é que não alcançava: as duas
do VGC foram capturadas pelo Cowork, que não recebe o 403 da Cloudflare. Ou seja, a segunda
tentativa não bastou, porque as duas rodavam no mesmo lugar. **Veredito de fonte não sai de um
ambiente só**, e "não abre" dito por uma máquina quer dizer "não abre aqui".

Isso criou um risco novo que precisou de guarda: recorte capturado fora não pode ser regravado
daqui, senão o script apaga o conteúdo e devolve "bloqueada", desfazendo em silêncio o trabalho de
quem capturou. Alvo com `origem` é **preservado**, e se o arquivo sumir o script **aborta**, porque
não sabe refazer o que não capturou.

Sobrou o **SteamDB**, e ele não é bloqueio: a página abre e **não publica o dado em HTML**. O corpo
volta com "Loading…" e a lista de builds é montada por JavaScript. É a mesma categoria da página do
Anubis no paldb, e o rótulo mudou de `bloqueada` para `sem-html` porque "bloqueada" sugere que outro
cliente resolveria, e manda a próxima pessoa gastar tempo à toa. O que dá para ler dali sem
JavaScript ficou gravado (changenumber 37340689, último registro 17.07.2026, lançamento 10.07.2026),
e não responde a pergunta, que é qual build é qual versão. Nenhuma afirmação caiu do site: quem
responde é o changelog oficial, o The Big Lead e o `npm run patch:verificar`.

**O recorte é citação, não arquivo.** Cada um traz até cinco trechos, um por termo de relevância,
com o hash e o tamanho da página original no cabeçalho para o que ficou de fora aparecer. Arquivar
artigo inteiro seria copiar conteúdo dos outros e não provaria mais nada: quem reconfere quer a
linha do número.

**Quatro sabotagens, todas rodadas.** Apagar `palcalc.md` fez o portão acusar a URL do PalCalc sem
recorte. Apagar as linhas de citação de `steam-changelog-1-0.md` fez ele acusar recorte que se diz
vivo sem trecho dentro. Tirar `steamdb-patchnotes.md` do texto do `fontes.md` fez ele acusar fonte
sem prova que não está registrada na página, que é a que impede a regressão real: sem ela, a perda
ficaria num arquivo de dados que ninguém abre enquanto a página seguiria exibindo o link como
conferência. E apagar `vgc-world-tree.md`, que veio do Cowork, fez o `gravar-recortes.mjs` **abortar
com código 1** em vez de gravar por cima o 403 local.

Dois achados que o ato de gravar produziu, os dois no `fontes.md`. A **contagem de Pals saiu da
disputa**: os três recortes dizem 72 Pals novos, o oficial e o VGC chegam a 287, e o 259 da
BisectHosting é soma sobre base velha, porque 215 mais 72 dá 287 e 259 menos 72 dá 187, que não é
contagem de lugar nenhum. Não eram duas fontes discordando, era uma somando errado com duas do lado
certo. E o **3v3 contra 4v4 da Arena** é o mesmo fato dito de dois jeitos, o que rebaixa a disputa
sem encerrá-la, porque a fonte é uma só e é a mesma que erra a contagem.

Encostou em `package.json`, território compartilhado, pelo mínimo: uma linha de script
(`npm run recortes:gravar`), sem a qual a captura não seria reproduzível por comando.

### [x] F4 — Largura desperdiçada no desktop

**Requisito:** R5.4 e R1.8, sob a emenda de 01.08.2026 que fixou o PC como alvo
**Território:** código e visual

**Substitui a F4 antiga, do menu no celular, cancelada.** O cancelamento está registrado na lista do
que foi recusado no `PRD.md`, com o motivo, porque decisão que só existe numa conversa some em três
meses e alguém reabre.

Em 1440px a coluna de conteúdo travava em ~780px e sobravam ~350px vazios à direita. `/pals` mostrava
2 cartões por linha onde cabiam 4, e `/itens` era uma coluna de nomes com metade da tela em branco e
116 mil pixels de altura.

Guia continua com medida de leitura estreita: prosa larga demais cansa, e 780px está certo para texto
corrido. O que cresce é ÍNDICE e CATÁLOGO.

**Aceite:**
- Em 1440px, `/pals` mostra pelo menos 4 cartões por linha e `/itens` pelo menos 3 colunas.
- A altura total de `/itens` cai pelo menos à metade.
- Asserção nova medindo as duas coisas.
- Screenshot olhado antes do commit: grade que se adapta erra feio em largura intermediária, e o
  portão não sabe julgar isso.

**Feita. Medido em 1440px, antes e depois:**

| Página | Antes | Depois |
|---|---|---|
| `/pals` | 2 cartões por linha, 32.277px | **4 por linha**, 18.384px |
| `/itens` | 1 coluna, 116.412px | **4 colunas**, 34.566px |
| `/estruturas` | 1 por linha, 31.985px | **4 por linha**, 12.515px |
| `/tecnologias` | 1 por linha, 37.823px | **4 por linha**, 16.658px |
| `/breeding`, guia | 860px de coluna | **860px**, sem mudança |

**A primeira tentativa alargou a página e não resolveu, e o screenshot é que mostrou.** Só subir o
teto da coluna deixou `/estruturas` e `/tecnologias` como tabelas de duas e quatro colunas esticadas
a 1176px, com um vão de quase 800px entre "Nome" e "Categoria". O vazio não sumiu, mudou de fora da
coluna para dentro da tabela. **Sem olhar a imagem, isso passaria**: a página usava a largura toda e
o número de "por linha" continuaria 1 sem ninguém notar o porquê.

A correção foi trocar a forma, não o tamanho: **índice de nome curto é grade, não tabela.** A regra
sai do dado e não de lista de rota escrita à mão, do mesmo jeito que a esfera com nível de tecnologia
entra na tabela de captura e a sem nível vira nota. Os campos de dado viraram uma linha de metadados
dentro do cartão, **com o rótulo junto do valor**, porque fora de tabela um "12" sozinho não diz se é
nível ou custo.

**Nenhuma media query ficou órfã, e tirar as que existem seria erro.** A única regra responsiva do
site é `@media (max-width: 860px)`, que empilha a lateral, e ela não é de telefone: o caso de uso
declarado no PRD é segunda tela com o jogo aberto, ou seja, a wiki em meia tela de PC. Medido em
760px, ela é o que mantém a página legível. Nunca houve menu de celular implementado, então o
cancelamento não deixou código para trás.

**Três sabotagens, todas rodadas.** Tirar `.conteudo.cheia` fez o portão acusar `/pals` com 3 cartões
por linha. Colapsar a grade do índice para uma coluna acusou as duas coisas de uma vez, 1 coluna e
125.461px de altura. E dar coluna larga ao guia acusou prosa de 1176px, que é a cláusula que impede
"usar a largura" virar "alargar tudo".

A asserção mede o que o navegador desenhou, contando itens que dividem o mesmo topo, e não o CSS
declarado. O teto de altura é metade dos 116.412px medidos antes da tarefa, congelado no script com a
data, no mesmo padrão das outras referências do repositório: se o catálogo crescer muito, alguém
remede e atualiza o número em vez de o teto virar decoração.

Tarefa inteira em território de código e visual, o que é fora do meu, feita porque a emenda pediu.

---

**As oito abaixo saíram da auditoria do site de 01.08.2026, e todas estão no ar agora.** Elas são
escritas antes de qualquer uma ser executada, e de propósito: é a terceira vez que esta lista some
por existir só numa conversa. Tarefa que não está em arquivo não existe.

**Ordem de execução: F5, F6, F7, F8, F12, F9, F10, F11.** Não é a ordem do número. As quatro
primeiras são o que um visitante encontra em trinta segundos, e a F12 é uma linha de dado com efeito
em 588 registros. As três últimas custam mais e aparecem menos.

### [ ] F5 — O botão do assistente está morto nas 323 páginas

**Requisito:** R3.4
**Território:** código e visual

`ENDERECO_ASSISTENTE` está vazio em `src/components/Chat.astro`, e o `Base.astro` põe o `<Chat />`
em toda página gerada. O botão abre, aceita a pergunta e responde com um bilhete de manutenção:

> O assistente ainda não foi ligado. Falta publicar o worker e colocar o endereço dele em
> src/components/Chat.astro. O passo a passo está em worker/README.md.

Isso é recado de quem programa, exibido para quem lê. A C1 é que publica o worker e não tem data.
Enquanto ela não acontecer, o widget não pode continuar no ar oferecendo o que não entrega.

**Não é para consertar a mensagem, é para esconder o botão.** Explicar melhor a falta continua sendo
um convite que termina em desculpa. Quando a C1 preencher a URL, o widget volta sozinho, sem esta
tarefa precisar ser desfeita.

**Aceite:**

- Com `ENDERECO_ASSISTENTE` vazio, nenhuma página gerada oferece o assistente:

  ```bash
  npm run build
  test "$(grep -rl 'id="abrir-chat"' dist/ | wc -l)" -eq 0 \
    && echo "ok, nenhuma pagina oferece" || { echo "FALHOU"; exit 1; }
  ```

- Com uma URL preenchida, ele volta em **todas** as páginas, e o número sai da contagem de arquivos,
  não escrito à mão:

  ```bash
  # com ENDERECO_ASSISTENTE preenchido
  npm run build
  test "$(grep -rl 'id="abrir-chat"' dist/ | wc -l)" -eq "$(find dist -name '*.html' | wc -l)" \
    && echo "ok, volta em todas" || { echo "FALHOU"; exit 1; }
  ```

- Asserção nova em `scripts/testar-navegador.mjs`: com o endereço vazio, o botão não existe no DOM.
  Afirmar sobre o botão escondido não basta, porque `display:none` já enganou o teste do painel uma
  vez e está escrito nas armadilhas do `CLAUDE.md`.
- Provado por sabotagem: renderizar o widget sem a guarda e ver o portão acusar.
- `npm run portao` passando.

### [ ] F6 — Três contagens de Pal no ar, e nenhuma explica a outra

**Requisito:** R1.6, mais R5.1 pelo painel
**Território:** compartilhado (o número é dado, a exibição é código)

Quem abre o site lê três números diferentes para a mesma coisa:

| Onde | Número | De onde sai |
|---|---|---|
| Home, bloco de estatísticas | 287 | escrito à mão em `src/pages/index.astro` |
| `/pals`, subtítulo | 299 | `catalogo.pals.length` |
| `/painel`, medidor de Palpédia | 132 de 287 | `paldeck.total` de `src/data/saves/joao.json` |

**A maior parte da diferença já tem nome.** Onze das entidades do catálogo não têm número de
Palpédia: Blue Slime, Cave Bat, Demon Eye, Enchanted Sword, Eye of Cthulhu, Green Slime, Illuminant
Bat, Illuminant Slime, Purple Slime, Rainbow Slime e Red Slime. São as da colaboração com Terraria,
que o jogo não registra na Palpédia. E elas continuam entrando na calculadora de cruzamento como pai
válido, o que produz receita que não existe no jogo.

**Sobra uma unidade, e ela é o motivo de a tarefa não ser só de texto.** Tirando as onze, restam
288 com número, não 287. Um a mais que o total que o próprio save do jogo declara. Ou o catálogo tem
uma entrada que a Palpédia não conta, ou o 287 é que está velho. Arredondar para 287 e seguir seria
repetir o que a F1 já custou: escolher em silêncio.

**Comece pelo dado, não pela home.** Trocar o 299 por 287 na cara do site esconde a entidade que
ainda gera cruzamento errado.

**Aceite:**

- Um comando imprime as três contagens e a conta que liga uma na outra, sem número escrito à mão:

  ```bash
  node -e "
  const c = require('./src/data/catalogo.json');
  const com = c.pals.filter((p) => p.numero != null);
  const sem = c.pals.filter((p) => p.numero == null);
  const save = require('./src/data/saves/joao.json');
  console.log('catalogo:', c.pals.length, '| com numero:', com.length, '| sem numero:', sem.length);
  console.log('total da Palpedia segundo o save:', save.paldeck.total);
  if (com.length !== save.paldeck.total) {
    throw new Error('sobra ' + (com.length - save.paldeck.total) + ' sem explicacao');
  }
  "
  ```

- `verificar-tudo.mjs` reprova quando um Pal sem número de Palpédia aparece como pai possível na
  calculadora de cruzamento, e imprime quantos foram conferidos.
- `npm run testar` ganha um caso: nenhuma das onze entidades aparece como pai nem como resultado na
  calculadora.
- A unidade que sobra fica **resolvida ou registrada**. Se for divergência de fonte, entra em
  `fontes.md` com a fonte que decidiu, como manda a convenção.
- Os três lugares passam a dizer o mesmo número, e ele sai do dado.
- As duas checagens provadas por sabotagem.
- `npm run portao` passando.

### [ ] F7 — A home promete filtro que `/pals` não tem

**Requisito:** R3.3, com R5.4 dizendo para que o filtro serve
**Território:** conteúdo e dados (a string está em `src/data/interface.json`)

A chave `home_bloco_pals` diz "Filtro por aptidão de trabalho, elemento e nível. Nomes em
português.". O `/pals` tem busca por texto, um `<select>` de aptidão, um `<select>` de fase e uma
caixa de "só curadoria". **Elemento e nível não existem.** A versão EN promete o mesmo.

**Corrigir o texto, não implementar os filtros.** A queixa é a home mentir. Filtro por elemento pode
virar tarefa um dia, e nesse dia o texto volta a citá-lo.

**Aceite:**

- `verificar-tudo.mjs` ganha uma checagem que compara o que a home promete com os controles que a
  `/pals` tem, e reprova quando a home cita um que não existe. Sem essa checagem a tarefa é uma
  edição de string que volta a divergir no próximo mês.
- A checagem vale para as duas versões da string, PT e EN. Corrigir só o português deixaria metade
  do defeito no ar, que é o que R2.4 existe para impedir.
- Provada por sabotagem: devolver "elemento" à string e ver o portão acusar.
- `npm run portao` passando.

### [ ] F8 — "Nosso progresso" troca de rótulo e não mostra nada

**Requisito:** R5.1
**Território:** código e visual

O `SeletorProgresso` está na lateral das 323 páginas. Clicar troca o rótulo de "Mostrar" para
"Esconder", grava a escolha no `localStorage` e liga `data-progresso` no `<html>`. Do ponto de vista
de quem clica, não acontece nada.

O que ele revela existe em quatro rotas (`/pals`, `/pal/*`, `/mapa` e `/calculadoras`), e em `/pals`
são uns poucos cartões entre 299, quase sempre fora da tela. Nas outras trezentas e tantas páginas
não há o que revelar.

**Medir antes de decidir.** Sem saber quantos elementos cada rota ganha ao ligar, não dá para dizer
se o defeito é o controle aparecer onde não serve, se é o efeito ser invisível onde serve, ou se são
os dois. Palpite aqui produz a correção errada.

**Aceite:**

- Um comando imprime, por rota do `dist/`, quantos elementos de overlay (`.so-com-progresso`,
  `.so-sem-registro`, `.so-vencido`) existem. Número dito, não estimado.
- Decidido pelo número, uma das duas: o controle deixa de aparecer onde o número é zero, ou o efeito
  passa a ser perceptível sem rolagem onde não é. A escolha fica escrita na tarefa com o porquê.
- Asserção nova em `scripts/testar-navegador.mjs`, e ela precisa das duas metades: em página que
  oferece o controle, ligar aumenta a contagem de elementos **visíveis** de zero para mais que zero;
  e nenhuma página oferece o controle com esse delta em zero. Só a primeira metade continuaria
  passando com o botão em toda página.
- A asserção estabelece o estado que precisa antes de afirmar, e não herda o `localStorage` do teste
  anterior. Já custou uma reversão neste repositório, está nas armadilhas do `CLAUDE.md`.
- Provada por sabotagem.
- `npm run portao` passando.

### [ ] F9 — Termo glosado à mão imprime duas vezes

**Requisito:** R2.2
**Território:** compartilhado (o gatilho está no conteúdo, o defeito é do plugin)

`breeding.md` e `resumo-1-0.md` escrevem a glosa à mão, no formato "PT (EN)". O plugin bilíngue
marca os dois lados, o português e o inglês de dentro do parêntese, porque os dois são termo
conhecido. Cada `<span>` passa a exibir o idioma escolhido, e o par vira repetição:

| No markdown | Na tela em PT | Na tela em EN |
|---|---|---|
| `Imortalidade (Immortality)` | Imortalidade (Imortalidade) | Immortality (Immortality) |
| `Babá (Babysitter)` | Babá (Babá) | Babysitter (Babysitter) |
| `Brutamontes (Musclehead)` | Brutamontes (Brutamontes) | Musclehead (Musclehead) |

**A glosa à mão é redundante desde que o mecanismo existe**, e é exatamente o que ele faz sozinho:
mostrar o nome no idioma escolhido. Escrever os dois duplica a mesma informação e quebra no primeiro
clique do seletor.

**Cuidado com o alcance.** `glossario.md` e `fontes.md` **são** a tabela de tradução, e ali a coluna
PT ao lado da coluna EN está certa. Eles estão na lista `NAO_MEXER` de `padronizar-conteudo.mjs` por
esse motivo, e qualquer varredura desta tarefa tem que respeitar a mesma lista.

**Aceite:**

- Comando sobre o `dist/`: nenhum par de `<span data-termo>` adjacente separado por " (" tem o mesmo
  `data-pt`. Zero ocorrências, fora de `glossario` e `fontes`.
- O mesmo comando conferido também pelo `data-en`, senão a versão em inglês fica com o defeito que a
  em português perdeu.
- `npm run testar` ganha um caso em `/breeding`, com a página nos dois idiomas: nenhuma palavra
  aparece repetida entre parênteses logo depois de si mesma.
- O número de ocorrências corrigidas, dito.
- Provado por sabotagem: devolver uma glosa e ver o portão acusar.
- `npm run portao` passando.

### [ ] F10 — Idioma misturado dentro do guia

**Requisito:** R2.2, com R2.7 dizendo onde é o limite
**Território:** conteúdo e dados

Na tabela de passivas de `/breeding`, "Heavily Armored", "Skymarcher" e "Legend" aparecem em inglês
na mesma coluna que "Imortalidade", "Babá" e "Brutamontes" em português. São **duas causas
diferentes** e misturá-las produz meia correção:

1. **`Legend` está no dicionário** (`legend`, PT "Lendário") e foi escrito em inglês no markdown.
   Ele nasce em inglês na página e só vira "Lendário" quando alguém troca o idioma. A mesma tabela
   escreve "Lendário (Legend)" trinta linhas abaixo.
2. **`Heavily Armored` e `Skymarcher` não estão no dicionário.** Não alternam em idioma nenhum, e
   nunca vão alternar até entrarem no `termos.json`. É o que `npm run termos:auditar` existe para
   listar.

**R2.7 não é desculpa.** Ele diz que o corpo do guia não é traduzido, e é justamente por isso que o
corpo tem que ser escrito num idioma só: quem dá o outro é o mecanismo. Guia meio a meio não é
"corpo em português", é corpo em dois idiomas ao mesmo tempo.

**Aceite:**

- `verificar-tudo.mjs` reprova quando o corpo de um guia escreve a forma EN de um termo que tem PT
  no `termos.json`, com `glossario.md` e `fontes.md` de fora pelo mesmo motivo da F9.
- Os termos que não estão no dicionário entram nele por `npm run termos:atualizar`, ou fica escrito
  na tarefa por que não entram. "Não achei" não fecha: a origem por termo é exigida por R2.1.
- `npm run termos:auditar` deixa de listar os três.
- O número de ocorrências trocadas, dito por guia.
- Provado por sabotagem.
- `npm run portao` passando.

### [ ] F11 — "Onde aparece nos guias" sem âncora, e 10 de 15 não é sinal

**Requisito:** R1.7
**Território:** código e visual

A seção existe nas 299 páginas de Pal e tem dois defeitos que se somam.

**O link cai no topo.** `src/pages/pal/[pal].astro` monta `href={base}/{id}` e para por aí. O guia
mais longo tem 34.314 caracteres e a média é 8.615. Quem clicou procura o nome à mão, com Ctrl+F,
que é exatamente o trabalho que a seção existe para poupar.

**A lista não filtra.** Anubis aparece em 10 dos 15 guias, Lyleen em 9, Jormuntide Ignis em 8. Uma
lista com dois terços dos guias não responde "onde", responde "em quase todo lugar". Do outro lado,
179 dos 299 Pals não são citados em guia nenhum e recebem a frase de vazio.

As duas coisas têm a mesma correção: **dizer o trecho, não o arquivo.** Dez links para dez seções
nomeadas são dez respostas. Dez links para dez topos são ruído.

**Aceite:**

- Todo `href` da lista tem `#`, e o id apontado **existe no HTML do guia de destino**. As duas
  metades, porque só a primeira aprovaria âncora quebrada, que é o defeito que a checagem de link
  interno do verificador já pegou uma vez.
- Cada item nomeia a seção além do guia. Item que só repete o nome do guia continua não sendo sinal.
- Um comando imprime quantos itens ganharam âncora e quantos Pals continuam sem citação.
- Provado por sabotagem: apagar o id de uma seção do guia e ver o portão acusar o link órfão.
- `npm run portao` passando.

### [ ] F12 — A coluna TIPO de `/tecnologias` está em inglês

**Requisito:** R1.8, com R2.1 dizendo onde mora a tradução
**Território:** conteúdo e dados

`src/data/tecnologias.json` grava o campo `tipo` com o valor cru do paldb: **371 "Items" e 217
"Structures"** nos 588 registros. O índice imprime o campo como veio, então a página tem nome,
nível e custo em português e uma coluna inteira em inglês no meio.

O `termos.json` não tem nenhum dos dois. A escolha é a de sempre neste repositório: **quem importa
não inventa tradução, e o dicionário é o lugar dela.** Traduzir na importação grava texto que ninguém
consegue reconferir contra a fonte; traduzir na exibição, pelo dicionário, mantém a alternância
funcionando de graça.

**Aceite:**

- Nenhuma célula do `dist/tecnologias/` sai com "Items" ou "Structures":

  ```bash
  npm run build
  test "$(grep -c '>Items<\|>Structures<' dist/tecnologias/index.html)" -eq 0 \
    && echo "ok" || { echo "FALHOU"; exit 1; }
  ```

- Os dois termos alternam PT/EN pelo mecanismo, sem ninguém marcar à mão, e `npm run termos:auditar`
  deixa de listá-los.
- `verificar-tudo.mjs` reprova quando um valor distinto de `tipo` no catálogo não tem tradução
  correspondente. Vale para valor novo que aparecer numa importação futura, e é isso que impede o
  defeito de voltar.
- Provado por sabotagem.
- `npm run portao` passando.

### [x] H6 — Base do mapa, provisória e alinhada

**Requisito:** R3.2
**Território:** código e visual, encostando em conteúdo e dados pelo mínimo

O mapa desenhava grade de coordenadas porque a arte do jogo não estava no repositório. A wiki.gg
publica a textura do mundo inteiro, 8192x8192, **anterior ao 1.0**. Pôr essa e trocar depois, em vez
de esperar a extração.

**Aceite:**
- A página mostra relevo, costa e bioma, com os 13.755 pontos por cima.
- Os 11 marcadores de referência caem sobre o acidente geográfico certo.
- Os limites saem da própria wiki.gg, gravados como recorte antes de usar, pela regra da F3.
- Os dois conjuntos de limites ficam no repositório, nomeados por build.

**Feita, e a premissa que a abriu estava errada.** Achava-se que imagem velha erraria uns 7%. Erra
mesmo, mas só quando alguém casa a imagem de uma build com os limites de OUTRA. Coordenada de mundo
não muda entre versões: o que muda é o retângulo que a textura cobre. Por isso `projecao-mapa.json`
passou a guardar dois conjuntos, `wikigg_pre_1_0` e `paldb_1_0`, e um campo `build_ativa` que diz
qual vale para a imagem que está em `public/mapa/`. Trocar de textura é trocar esse campo.

**Os limites foram capturados, não copiados dos que a tarefa passou.** Os quatro números que vieram
no pedido conferiram na oitava casa decimal com o que a API da wiki.gg devolveu, e o recorte inteiro
está em `src/data/recortes/wikigg-map-fragments-core.md`. Eles também batem com uma conta
independente: a nossa fórmula de mundo para tela, que veio do paldb, aplicada à landscape que o
pedido citou, dá exatamente o mesmo retângulo.

**A aferição é medida, não olhada.** O `npm run mapa:fundo` monta a máscara de mar a partir da
própria imagem (matiz de água, e preenchimento a partir da borda, senão o vulcão roxo e a montanha
escura de neve contariam como oceano) e mede: os 11 marcadores caem **todos em terra**, e dos 3.101
pontos que só existem em terra firme **77 caem no mar, 2,5%**, contra **1.200, 39%**, com os limites
da outra build. O script **aborta sem escrever tile** se algum dos 11 molhar o pé ou se a build
errada acertar tanto quanto a certa.

**Um achado que a aferição produziu, registrado em `fontes.md`.** As zonas de caça proibida II e III
caem a 15 e a 7 unidades do centro das duas ilhas circulares com muralha radial que a textura
desenha. A **Zona I não tem ilha nenhuma** ali: varrendo a imagem, a textura só tem essas duas, e a
mais próxima da Zona I está a 251 unidades. Erro de enquadramento mexeria nos onze juntos, então não
é isso: ou a Zona I mudou entre as builds, ou a coordenada dela, que vem de um rótulo de **região**
do paldb, não é a do santuário. Fica como divergência aberta e item da B1.

**Quatro sabotagens, todas rodadas.** Mexer 30 unidades no enquadramento sem regerar fez o
verificador acusar que os tiles foram cortados com outro número. Apontar `build_ativa` para a outra
build fez o gerador abortar comparando o capturado com o declarado. Pôr um marcador de referência no
meio do mar fez ele abortar sem escrever tile. E deslocar em 300 px só os marcadores da página,
deixando os tiles certos, fez o `npm run testar` acusar desvio de 306 px: essa última é a que cobre
o erro que nenhuma checagem de dado pega, porque quem desenha é o navegador e ele tem jeito próprio
de errar.

São 341 tiles somando 4,38 MB, menos que os 4,65 MB da imagem original. A original **não** entra no
repositório: o último nível é ela, cortada, e guardar as duas seria dobrar peso sem guardar nada a
mais. O `sha256` dela fica no manifesto para conferir uma baixada futura.

Encostou em território de conteúdo pelo mínimo: `mapa.json` perdeu o bloco `imagem`, que apontava
para um arquivo que não existe mais, e o `fontes.md` ganhou a seção da divergência. Encostou em
`package.json`, compartilhado, por uma linha de script e a declaração do `sharp`, que já vinha junto
do Astro e agora é usado por comando nosso.

### [x] H7 — As três melhorias do mapa que não dependem de imagem

**Requisito:** R3.2, R5.8
**Território:** código e visual, encostando em conteúdo e dados por um defeito que a busca revelou

Nível no marcador de alfa, contagem por categoria no controle de camadas, busca no mapa.

**Aceite:**
- O marcador de cada alfa mostra o nível sem precisar de clique.
- Cada caixa do controle de camadas diz quantos pontos tem.
- A busca acha ponto por nome ou tipo, nos dois idiomas, e leva até ele.
- `npm run portao` passando, com asserção de navegador para cada uma das três.

**Feita.** Os 83 alfas passaram a ser marcador de DOM em vez de ponto de canvas, porque número não
se desenha no canvas do Leaflet, e 83 elementos é volume que o DOM aguenta: os outros 13.755 pontos
continuam em canvas. A camada de Inimigos nasce desligada, então ninguém paga por isso sem pedir. O
nível também entrou na tabela alternativa, na coluna do tipo e não numa quarta coluna: só 914 dos
13.755 pontos têm nível, e coluna vazia em nove de cada dez linhas atrapalha quem lê por leitor de
tela.

A busca procura nos 13.755 do paldb **e** nos nossos 35, no nome e no tipo, nos dois idiomas, com ou
sem acento. Procurar só no que está marcado seria pior que não ter busca: "não achei" e "está
desmarcado" virariam a mesma resposta. Achar ponto de camada desligada **liga a camada e diz que
ligou**, para o mapa não mudar sozinho sem explicação.

**E ela achou um defeito de dado que estava no ar.** Procurar "anubis" devolvia três lugares
diferentes, todos chamados "Ilha Solitária Esquecida". O importador casava PT com EN por `id`, e
13.139 dos 13.755 pontos não têm `id`: `undefined === undefined` fazia todo ponto de um tipo herdar
o nome do primeiro. Eram **3.622 pontos com nome errado** no popup e na tabela, desde a importação.
Corrigido casando por índice, com aborto se as duas listas deixarem de estar na mesma ordem, e com
guarda nova no verificador contra o número congelado de nomes ambíguos. Detalhe em `fontes.md`.
Isso encostou em conteúdo e dados, e foi de propósito: publicar uma busca que lista 137 lugares com
o mesmo nome seria entregar a função quebrada de fábrica.

**Quatro sabotagens, todas rodadas.** Somar 1 na contagem de cada categoria fez o teste acusar as
três primeiras erradas. Devolver o alfa para o canvas fez ele acusar 0 etiquetas para 83 alfas.
Limitar a busca ao que está marcado fez ele acusar 0 resultados com a camada desligada. E devolver o
dado importado com o casamento velho fez o verificador acusar 24 nomes cobrindo mais de um lugar,
contra 1 na referência. A sabotagem da busca também derrubou o teste com exceção na primeira
tentativa, em vez de reprovar com explicação: teste que estoura some do resumo, então ele passou a
conferir a lista antes de clicar nela.

### [ ] H5 — O mapa funcionar no pacote offline

**Requisito:** R3.6
**Território:** código e visual

Hoje a página do mapa viaja no pacote como texto e mais nada: o Leaflet vem da rede e não abre sem
internet, os 13.755 pontos ficam fora porque moram num bloco de dados fora do corpo da página, e os
341 tiles do fundo também ficam fora. Medido em 01.08, depois da H6: a página serve 897 KB no site e
contribui 12,0 KB para o pacote, que fechou em 3,72 MB de um teto de 8 MB.

Escopo já decidido, para a tarefa não nascer impossível:

- **O Leaflet vai embutido** no pacote, cerca de 150 KB.
- **A imagem de fundo não são os tiles.** Os 341 tiles somam 4,38 MB e não cabem junto com o resto.
  É uma imagem única reduzida, na casa de 2048 px, embutida como data URI. A H6 já deixou a original
  baixável por comando, então o número medido sai de `npm run mapa:fundo`.
- **A alternativa em tabela vai preenchida no HTML**, não montada por script.

**Aceite:**
- Abrir o arquivo com duplo clique, **sem rede**, mostra o mapa com os pontos e a tabela preenchida.
- O pacote fica abaixo de 8 MB, e o número medido entra no commit.
- Provado desligando a rede de verdade, não simulando.

## Bloco B — Fechar as pontas do conteúdo

### [ ] B1 — Uma página por base, com dado real

**Requisito:** R1.4
**Território:** conteúdo e dados
**Bloqueado por:** precisa das telas de cada base no jogo. Sem elas, não comece.

**Encolheu em 01.08.** Onze dos vinte marcadores não-base foram trocados pela coordenada importada
do paldb, e o mercador clandestino virou os **12 pontos** que a fonte publica, em vez de um só. Sobram
oito sem par, e **eles não são defeito**: Ore Galore, Pico do Guardião, Southern Ore Field, Verdant
Brook, Torre da Unidade de Pesquisas Genéticas, Mount Obsidian, Moonflower Oil Plateau e Feybreak
são **vocabulário nosso de região**, não lugar que o paldb rotula como ponto. Ninguém deve tentar
"consertar" isso casando por aproximação: o trabalho real que sobrou é ler essas oito na tela, mais
as quatro bases.

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

### [ ] B4 — A cadeia de acesso à Árvore Mundial não está documentada

**Requisito:** R1.1
**Território:** conteúdo e dados

A `endgame.md` fala da Árvore Mundial e **não diz como entrar nela**. O grupo está no nível 52 e vai
esbarrar nisso no 70, que é o requisito.

A matéria-prima já está no repositório, gravada e datada, e esta tarefa é de escrever, não de
pesquisar. O recorte `src/data/recortes/vgc-world-tree.md` traz o nível (70 e acima), o lugar (ponto
mais ao norte do mapa), os seis pré-requisitos em ordem (descobrir Sunreach, derrotar Auri e
Shaolong, achar o Deserted Islet, achar os materiais da Echoing Flute, fabricar a Echoing Flute,
derrotar e capturar o Panthalus) e o passo final, que é ir à base da árvore com o Panthalus no time
e interagir com o altar.

**Duas fontes gravadas concordam em parte da cadeia, e isso é para ser dito no texto:** o recorte
`nexttier-sunreach.md` registra Auri e Shaolong como o chefe de nível 68 da última torre padrão, o
portão para o endgame. Onde as duas se cruzam, a wiki afirma. Onde só uma fala, a wiki cita a fonte.

**Aceite:**
- A `endgame.md` passa a ter a cadeia completa, em ordem, com o nível e o lugar.
- Os nomes próprios que existirem no `termos.json` aparecem marcados pelo mecanismo bilíngue, sem
  ninguém marcar à mão. O que não existir lá entra como está e é registrado na tarefa.
- Nenhum número ou passo que não esteja num recorte gravado. Se faltar, a página diz que falta.
- `npm run portao` passando.

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
