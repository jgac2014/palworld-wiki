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

### [x] F5 — O botão do assistente está morto nas 323 páginas

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

**Feita. Zero de 323 páginas oferecem o assistente, e 323 de 323 voltam a oferecer quando o endereço
existe**, medido com a URL preenchida e desfeita em seguida. O ramo "sem endereço" saiu de dentro do
script junto: sem endereço o script não é gerado, então guardar a desculpa ali seria manter o texto
vivo sem nunca exibi-lo.

**A sabotagem apareceu sozinha, e foi a melhor prova possível.** A asserção nova rodou contra o
`dist/` anterior à correção, que é literalmente o estado sabotado, e acusou "323 de 323 páginas com
o botão, botão no DOM: true".

**Encostou em `scripts/`, que é território de conteúdo, e por um motivo que vale registrar.** A
suíte inteira não rodava neste ambiente: o `/mapa` pede o Leaflet ao unpkg, a saída para a internet é
bloqueada aqui, e a asserção do zoom morria por timeout de 30s **derrubando o processo antes das
outras cinquenta**. Um host bloqueado apagava o portão inteiro, e quem rodasse via só o timeout. O
desvio serve a cópia local do mesmo pino que o `package.json` já declara, e falha dizendo que faltou
insumo se ela não existir. As sete asserções do mapa passaram a rodar de verdade aqui, em vez de
serem impossíveis: são 53 ok contra 45 antes.

### [x] F6 — Três contagens de Pal no ar, e nenhuma explica a outra

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

**Feita, e a primeira versão da correção estava errada de um jeito que só apareceu ao olhar o dado.**

O número saiu de três lugares para um: `versao.json` passa a declarar `pals_no_paldeck: 287` com o
recorte que o sustenta, a home lê dali, o verificador compara o texto das páginas contra ele em vez
de contra um literal, e o save de cada pessoa é conferido contra o mesmo número. Antes o 287 estava
escrito à mão na home, de novo dentro do verificador e de novo no save: três cópias divergem no
primeiro patch. `/pals` deixou de dizer só "299 Pals" e passa a mostrar a conta: **299 = 288 da
Palpédia + 11 da colaboração com Terraria, que o jogo não numera.**

**Cortar as onze da calculadora teria trocado um defeito por um maior.** A primeira tentativa tirou
as onze das três listas suspensas, e o portão passou. Só que elas têm **57 combinações únicas entre
si**, importadas do paldb, que são receita de verdade: Green Slime com Red Slime dá Rainbow Slime, e
por aí. Tirá-las da tela apagava as 57 em silêncio. O defeito real é mais estreito: as onze dividem
o **mesmo CombiRank 3100**, então qualquer média com elas cai num ponto arbitrário da tabela.
`Blue Slime com Lamball devolvia Chikipi`.

A correção final tira as onze **só da média de rank**, mantém as combinações únicas, e a calculadora
passa a dizer POR QUE o par não gera nada em vez de responder "nenhum par conhecido", que parecia
defeito dela.

**Cinco sabotagens, todas rodadas.** Apagar o registro do `fontes.md` acusou a sobra de 1 não
registrada. Tirar `pals_no_paldeck` do `versao.json` acusou a checagem sem com o que comparar.
Devolver as onze à varredura acusou "11 entidades ainda entram na média de rank". Tirar a guarda
acusou "Blue Slime com Lamball devolve Chikipi". E cortar as onze da tela, que é a primeira
tentativa, acusou "as 11 sumiram da calculadora, e com elas as combinações únicas entre si".

**A sobra de uma unidade ficou registrada, não resolvida.** São 288 numerados contra os 287 do
changelog oficial, numeração de 1 a 204 sem buraco mais 84 variantes com sufixo B. Qual entrada o
jogo não conta não sai daqui: o paldb não abre desta máquina, então não há recorte novo para gravar.
Está no `fontes.md`, na tabela do que continua em disputa, e o verificador **reprova se alguém
apagar o registro sem resolver a sobra**.

### [x] F7 — A home promete filtro que `/pals` não tem

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

**Feita.** A home passa a dizer "filtro por aptidão de trabalho e fase do jogo, e busca por nome",
que é o que a página tem. Elemento e nível saíram das duas versões, PT e EN.

**O texto novo não é a entrega, a checagem é.** Trocar a frase resolveria hoje e voltaria a divergir
no mês que vem, que é exatamente como ela chegou aqui. O verificador passa a ler os controles direto
do `pals.astro` e a cobrar a promessa contra eles, e reprova nos dois sentidos: quando a home promete
o que não existe, e quando alguém tira da página um controle que a home anuncia.

**Duas sabotagens, as duas rodadas.** Devolver "elemento" só na versão em português acusou
`pt: promete filtro por elemento, que /pals não tem`, o que também prova que a checagem não confere
um idioma só. Renomear o `<select id="fase">` acusou a promessa nos dois idiomas de uma vez.

### [x] F8 — "Nosso progresso" troca de rótulo e não mostra nada

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

**Feita, e o número mudou a correção.** Medido no `dist/` antes de mexer em nada:

| Rota | Elementos de overlay | Páginas |
|---|---|---|
| `/pal/<ficha>` | 609 | 299 |
| `/pals` | 11 | 1 |
| `/mapa` | 1 | 1 |
| todo o resto | **0** | 22 |

O interruptor estava nas **323**. Escolhida a primeira das duas saídas: ele deixa de aparecer onde
não muda nada. A outra, tornar o efeito visível em toda página, exigiria inventar overlay para guia
de texto, que é justamente o que a decisão 3.0 do PRD proíbe.

**A contagem por classe não bastava, e quase produziu a correção errada.** `/calculadoras` e `/mapa`
reagem ao evento `progresso:mudou` por JavaScript e não têm classe nenhuma no HTML: pela contagem
crua os dois entrariam na lista de "zero" e perderiam o interruptor. São **quatro** rotas com efeito,
não três, e por isso a asserção mede o delta do que o navegador desenhou, incluindo o valor dos
campos do bolo, e não a presença da classe.

**A declaração é da página, não de uma lista de rotas.** Cada página passa `usaProgresso` no `Base`,
pelo mesmo motivo da F4: lista central envelhece calada. O verificador cobra os dois sentidos, página
com overlay sem declarar e declaração sem overlay.

**Três sabotagens, todas rodadas.** Devolver o `<SeletorProgresso />` a todas as páginas acusou
"oferecido sem ter o que revelar: /, /breeding/, /itens/, /painel/". Tirar a declaração do `/mapa`
acusou "tem overlay e não declara". Declarar na home acusou "declara e não tem overlay nenhum".

**Dois achados de tabela, corrigidos junto.** A asserção "a escolha do overlay persiste entre
páginas" **passava por herança**: ela lia um overlay que o teste anterior tinha deixado ligado. Só
apareceu porque a asserção nova entrou no meio e limpou o `localStorage`, e aí ela reprovou na hora.
Agora ela liga o overlay que vai conferir. É a armadilha que o `CLAUDE.md` já descreve, encontrada
mais uma vez. E as 11 fichas sem número de Palpédia publicavam `número null na Palpédia` na meta
descrição, ponta solta da F6 que só apareceu ao abrir o `[pal].astro` por outro motivo. A descrição
de `/pals` também prometia filtro por nível, o mesmo defeito da F7 em outro lugar.

### [x] F9 — Termo glosado à mão imprime duas vezes

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

**Feita, e o número é maior do que a queixa dizia: 134 glosas em 12 páginas**, não três. As três
citadas eram só as que alguém tinha visto.

**Apagar a glosa do texto era a saída óbvia e estava errada.** Ela resolveria a repetição e tiraria o
nome em inglês de dentro de **título e de tabela**, onde o plugin não marca nada por regra: ali o
leitor não teria como recuperá-lo, porque não há span para o seletor trocar. São 152 ocorrências no
markdown contra 134 marcadas no HTML, e a diferença é exatamente esse pedaço.

A correção é de uma linha de lógica no plugin: o parêntese passa a carregar o par **trocado**. A
glosa vira o que quem escreveu quis dizer, o nome no outro idioma, e funciona nos dois sentidos:
`Imortalidade (Immortality)` em português, `Immortality (Imortalidade)` em inglês. Quem escreve o
guia continua sem marcar nada, que é R2.2.

**A asserção tem duas metades e as duas são necessárias.** O HTML de todas as páginas, conferindo
`data-pt` e `data-en` (consertar um idioma e deixar o outro é metade do defeito), mais a leitura do
que está **na tela** de `/breeding` nos dois idiomas, porque quem troca o texto é o seletor no
navegador e o HTML sozinho não prova isso. A contagem de glosas entra na condição: com zero glosas no
site, "nenhuma repetida" seria verdade trivial.

**Sabotagem rodada:** desfazer a troca acusou as 134 de uma vez. E, como manda o `CLAUDE.md`,
`.astro/` e `node_modules/.astro/` foram apagados antes de cada medição, senão o HTML velho sai do
cache e a mudança de plugin parece não ter efeito.

### [x] F10 — Idioma misturado dentro do guia

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

**Feita, e a medição desfez metade da queixa.** Termo que o plugin MARCA já alternava: o seletor
aplica o idioma na carga da página, então "Immortality" escrito em inglês no markdown vira
"Imortalidade" antes de alguém clicar em nada. Eram 105 spans nascidos em inglês e nenhum deles é
defeito com JavaScript ligado.

**O defeito de verdade é o termo que o mecanismo nunca alterna:** o que está na lista `NAO_MARCAR`
porque a palavra é curta ou genérica demais. Esse fica preso em inglês em qualquer idioma escolhido.
São 14 termos com PT oficial nessa condição, e 27 ocorrências soltas foram reescritas em 5 guias:
`base-e-trabalho` 3, `breeding` 5, `economia` 6, `nossas-bases` 12, `plano-de-acao` 1.

**A varredura automática foi escrita, rodada e JOGADA FORA.** Ela produziu exatamente a armadilha do
`CLAUDE.md`: "**Um** Fazenda de Criação cabe 4 Pals" com a concordância quebrada, "Vegetable **Bolo
(Cake)**" partindo um nome composto pelo meio, e "Arena **Lendário (Legend)**" trocando o nome de um
rank da Arena pela passiva de mesmo nome. As 27 foram feitas à mão, uma a uma.

**O portão pegou uma regressão minha no mesmo commit.** Renomear "Receita do Cake básico" para
"Receita do Bolo básico (Cake)" quebrou a checagem de receita, que procurava a linha pelo texto
antigo. A checagem aceita as duas formas agora e continua reprovando quando a linha some, que é o
que ela existe para fazer.

**Heavily Armored, Idiosyncratic e Skymarcher continuam em inglês, e isso está dito na página.** Elas
não estão no dicionário, o recorte gravado do paldb traz as três só em inglês, e o paldb não abre da
máquina que roda o portão. Inventar tradução produziria um nome que não existe na tela de ninguém.
Registrado em `fontes.md` e numa nota dentro da própria tabela de `breeding.md`.

**Um item do aceite não se aplicava.** `npm run termos:auditar` lista o que falta no dicionário, e
listar as três é justamente o comportamento certo enquanto elas não têm nome oficial gravado. Sair
da lista seria sinal de que alguém inventou a tradução.

**Duas sabotagens, as duas rodadas.** Devolver "Legend" solto à tabela acusou o termo e disse o nome
oficial. Esvaziar a lista `NAO_MARCAR` acusou falta de insumo em vez de aprovar sem conferir.

### [x] F11 — "Onde aparece nos guias" sem âncora, e 10 de 15 não é sinal

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

**Feita. São 359 links, todos com âncora que existe no guia de destino**, e 179 das 299 fichas
continuam sem citação nenhuma, número dito em vez de escondido.

**A lista deixou de ser de guias e passou a ser de trechos.** Cada item traz o nome do guia e, embaixo,
as seções onde o Pal aparece: Anubis em "Combate e squad" vira três links nomeados, "O nosso squad
alvo", "Duas exceções à regra do elemento único" e "Squad para o mid game". Dez links para dez topos
eram ruído; dez seções nomeadas são dez respostas. Foi assim que "10 de 15" deixou de ser um número
sem significado sem precisar de corte arbitrário.

**A âncora sai do mesmo `github-slugger` que o Astro usa para gerar o id do título**, e não de uma
regra reescrita à mão: duas implementações da mesma coisa divergem no primeiro título com acento ou
com ponto, e "Os bolos do 1.0" vira `os-bolos-do-10`. O slugger é reiniciado por página porque ele
numera repetição.

**29 das 415 citações estão antes do primeiro subtítulo**, e para elas o guia ganhou `id="topo"` no
layout: sem uma âncora de verdade, essas voltariam a ser link para o topo de um guia de dez mil
caracteres, exatamente o que a tarefa existe para acabar.

**Duas sabotagens, as duas rodadas.** Voltar a ligar para o guia sem âncora acusou "nenhum link com
âncora, então esta asserção não conferiu nada", que é a metade que impede a asserção de se aprovar
sozinha. E fabricar âncora inexistente acusou 331 links apontando para id que não existe: sem essa
segunda metade, âncora quebrada passaria, e ela é pior que link para o topo, porque promete precisão
e entrega rolagem aleatória.

**Encostou em `package.json`, território compartilhado, por uma linha:** `github-slugger` era
dependência transitiva do Astro e passou a ser declarada. Depender de algo que só existe por acaso na
árvore de outro pacote quebra no dia da atualização, sem aviso.

**O portão pegou seis carimbos vencidos da F10 no meio desta tarefa.** As páginas revisadas ontem
prometiam data mais velha que a revisão que receberam, e a virada do dia expôs isso. Corrigidos aqui.

### [x] F12 — A coluna TIPO de `/tecnologias` está em inglês

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

**Feita.** Zero células com "Items" ou "Structures". A tradução mora no dicionário de interface e
entra na exibição, e o verificador reprova quando um valor de `tipo` do catálogo não tem par PT/EN,
que é o que impede a próxima importação de publicar valor novo em inglês.

**Traduzir não era metade da tarefa, era um terço.** A coluna traduzida podia ficar presa no
português, que é o mesmo defeito espelhado, e foi o que `/estruturas` já tinha: ela mostrava
"Produção" e continuava "Produção" com o site em inglês, apesar do comentário no arquivo afirmando
que alternava. As duas colunas passaram a mandar o par PT/EN, e a asserção **troca o idioma de
verdade e compara o texto renderizado**, em vez de conferir se "Items" sumiu do HTML.

**Três sabotagens, todas rodadas.** Tirar `tipo_Structures` do dicionário acusou o valor sem
tradução. Publicar o campo cru de novo acusou `PT ["Structures","Items"] EN ["Structures","Items"]`.
E traduzir sem mandar o par acusou `estruturas PT ["Produção"] EN ["Produção"]`, que é a sabotagem
que a versão "só checar se sumiu o inglês" teria aprovado.

**Um item do aceite não se aplicava, e isto fica dito em vez de marcado.** `npm run termos:auditar`
varre o corpo dos guias, não o catálogo importado, então ele nunca listaria estes dois. A cobrança
equivalente é a checagem do verificador, que existe e está provada.

**O rótulo ficou no singular, "Item" e "Estrutura".** O paldb grava a categoria no plural porque lá
é nome de grupo; aqui é o tipo de UMA tecnologia por linha.

### [x] F13 — A checagem de receita da F1 confere zero pares e não diz nada

**Requisito:** R1.5
**Território:** conteúdo e dados

Achada em 02.08 enquanto a F6 mexia na calculadora. **Não conserte junto de outra tarefa:** ela é o
modo de falha que governa as armadilhas do `CLAUDE.md`, e merece o próprio commit.

A F1 criou em `verificar-tudo.mjs` uma checagem que passa cada receita escrita na curadoria pela
MESMA função que a página usa, e reprova quando o texto discorda da conta. Ela fechou dizendo, com
todas as letras, que cobria **um par**, "que é quanto a curadoria tem escrito hoje", e que a linha de
resumo diria esse número em vez de sugerir 77.

Hoje ela cobre **zero**. O laço procura `onde` no formato `Cruzamento: A com B` no `pals.json`, e
nenhum dos 77 registros casa mais com esse formato. O contador fica em 0, o `if (receitas)` é falso, e
a checagem **não imprime nem reprova**. Ela sumiu da saída do portão sem ninguém notar:

```bash
node -e "
const p = require('./src/data/pals.json');
const n = p.pals.filter((x) => /^Cruzamento:\s*(.+?)\s+com\s+(.+?)\s*$/i.test(String(x.onde || ''))).length;
console.log('pares que a checagem da F1 encontra hoje:', n);
"
```

**Isto é exatamente a regra do `CLAUDE.md`:** "o modo de falha mais caro deste repositório não é a
checagem que reprova, é a que aprova sem ter conferido". A checagem que a F1 escreveu para impedir
texto e conta divergirem virou decoração no dia em que a curadoria mudou de formato, e o portão
continuou verde. Se alguém escrever uma receita errada amanhã, nada acusa.

**Duas saídas, e o commit escolhe uma dizendo o porquê:**

1. **Ela volta a ter insumo.** Descobrir por que o formato mudou, se a curadoria deixou de escrever
   receita de propósito ou se o campo virou outra coisa, e fazer a checagem ler o formato de hoje.
2. **Ela sai.** Se a curadoria não escreve mais receita, a checagem não tem trabalho, e código que não
   confere nada é pior que ausência: ele ocupa o lugar de uma checagem de verdade.

O que **não** vale é deixar como está. E, se ela ficar, tem que reprovar quando o número de pares for
zero, dizendo que é zero, em vez de calar.

**Aceite:**

- `npm run verificar` imprime uma linha sobre receita **em toda execução**, com o número de pares
  conferidos, ou a checagem não existe mais no arquivo. Uma das duas, verificável por comando:

  ```bash
  npm run verificar | grep -q "receita:" && echo "diz o número" \
    || (grep -q "Cruzamento:" scripts/verificar-tudo.mjs && { echo "FALHOU: existe e cala"; exit 1; } \
        || echo "foi removida, e o commit explica por quê")
  ```

- Se ela ficar: zerar a lista de receitas da curadoria faz o portão **reprovar** por falta de insumo.
  Provado por sabotagem, que aqui é apagar o campo `onde` de um Pal e ver a contagem cair e acusar.
- O commit diz qual das duas saídas foi escolhida e por quê.
- `npm run portao` passando.

**Feita pela saída 1, ela volta a ter insumo, e o insumo não era o que a tarefa supunha.**

A tarefa oferecia "descobrir por que o formato mudou". A resposta estava escrita no `fontes.md` desde
02.08: o par "Gildane com Ophydia" **saiu das três páginas de propósito**, porque nunca teve fonte
independente. Ele foi eleito pela nossa própria conta entre 239 candidatos que a nossa própria regra
gerou, que é o mesmo defeito da receita de Early Access com a nossa cara em vez da de um guia velho.
**Zero pares é a decisão certa, não um acidente**, e uma checagem que reprovasse no zero deixaria o
portão vermelho para sempre por causa dela. Portão que acusa o que já foi decidido é portão que
alguém desliga, que é a lição que o gatilho do poder de captura já tinha custado.

**O escopo estava errado desde o começo, e esse é o achado que a tarefa não previa.** A F1 encontrou
o par escrito em TRÊS lugares: o campo `onde` de `pals.json`, o `plano-de-acao.md` e o `combate.md`.
A checagem que ela deixou olhava **só o primeiro**. Ela cobria um terço do próprio motivo de existir,
e ninguém notou porque o terço coberto era o que tinha o par na hora. Agora ela varre os 41 campos
`onde` da curadoria mais os 13 guias, com `glossario.md` e `fontes.md` de fora pelo mesmo motivo da
F9 e da F10: os dois **são** o registro, e o `fontes.md` cita o par que saiu justamente para
registrar que ele saiu.

**A segunda sabotagem derrubou a primeira versão da correção, e mudou a regra.** Pôr "Anubis sai do
Cruzamento de Vanwyrm com Azurobe" num guia **passava**: no corpo do guia não há campo dizendo qual
é o filho, e a checagem se contentava com o par devolver alguma coisa. A saída não é adivinhar o
filho na prosa. É aplicar o que a F2 estabeleceu: **concordar com a nossa calculadora não é fonte**,
é a circularidade que tirou o par do site. Então par específico escrito em qualquer lugar é
reprovado, e o que a conta responde entra na mensagem só para dizer qual dos dois problemas é.

**Cinco sabotagens, todas rodadas.** Receita errada na curadoria acusou o par contradizendo a conta.
A mesma receita num guia acusou, e é a que a versão anterior aprovava. Um par que **concorda** com a
calculadora acusou a circularidade em vez de aprovar. Apagar o registro do `fontes.md` acusou o zero
sem registro, que é o que impede apagar uma receita errada passar por acerto. E tirar todos os campos
`onde` acusou falta de insumo em vez de imprimir zero e passar.

A linha sai em toda execução, com o número de pares e o número de fontes varridas, que é a metade que
faltava: a versão anterior só falava quando achava par, então sumir da saída era o comportamento
normal dela.

### [x] F14 — A E8 gravou por cima do `receitas.json` das calculadoras, e o portão está vermelho

**Requisito:** R1.5, com R1.9 dizendo o que se perdeu
**Território:** conteúdo e dados, encostando em `package.json` pelo mínimo
**Prioridade:** antes de qualquer outra coisa. Nada mais fecha com o portão vermelho.

Achada em 03.08, ao começar a E9. O commit `0f61ae0` importou a receita de fabricação dos 1.875
itens e escreveu o resultado em `src/data/receitas.json`, que **já existia e era outra coisa**: os
números das calculadoras de bolo e de condensação, escritos à mão a partir dos guias e conferidos
contra eles pelo verificador. O arquivo novo não tem `bolo` nem `condensacao`, e os dois
consumidores morrem:

```bash
npm run verificar
# TypeError: Cannot read properties of undefined (reading 'ingredientes')
#   at scripts/verificar-tudo.mjs:894
```

`src/pages/calculadoras.astro` lê os mesmos campos, então o build cai logo depois. **A main está
vermelha desde `0f61ae0`**, e o commit foi feito sem o portão rodar: ele reprova em 200ms.

**Não é conflito de merge, é colisão de nome.** Duas coisas diferentes disputando `receitas.json`:
uma é a receita de UM prato, escrita por nós; a outra é a receita de fabricação de 1.244 itens,
importada. O `_leia_isto` do arquivo novo diz "Gerado por: npm run receitas:importar", e esse
script **não existe no `package.json`**, então nem a reimportação está reproduzível por comando.

**Quem volta a ser `receitas.json` é o das calculadoras**, pela regra do `CLAUDE.md` sobre o que
vale mais aqui: o dado importado se refaz com um comando e uma tarde, e o escrito à mão com
conferência cruzada contra 15 guias não. O importado ganha nome próprio.

**Aceite:**

- `npm run verificar` volta a passar, e a linha das calculadoras volta a aparecer na saída.
- O dado importado da E8 continua inteiro, com as 1.244 receitas, em arquivo de nome próprio, e o
  importador grava lá.
- `npm run receitas:importar` existe e é o comando que o `_leia_isto` do arquivo já afirma.
- **O verificador ganha uma checagem que reprova quando um dos dois arquivos perde a forma que o
  consumidor espera**, dizendo qual bloco sumiu. Sem ela, a próxima colisão volta a aparecer como
  `TypeError` com pilha, que é erro de programa e não diagnóstico. Provada por sabotagem: apagar o
  bloco `bolo` tem que acusar o bloco pelo nome, não estourar.
- `npm run portao` passando.

**Feita, e o sintoma era pior que a causa.** A colisão em si custa um comando para desfazer: o
importado volta a ser `receitas-fabricacao.json`, com as 1.244 receitas intactas, e o das
calculadoras volta ao nome que os dois consumidores já usam. O que custava caro era o **modo de
falhar**. `TypeError: Cannot read properties of undefined` com pilha é erro de programa, não
diagnóstico: quem lesse a saída do portão não descobriria dali que um arquivo tinha virado o outro,
e o build caía logo depois pelo mesmo motivo sem nunca dizer o motivo.

A checagem nova é de **forma**, roda antes de qualquer consumidor ler, e nomeia o bloco que sumiu e
o arquivo de onde ele sumiu. Ela vale para os dois arquivos, e não só para o que foi vítima desta
vez: a colisão não tem lado preferido.

**Duas sabotagens, as duas rodadas.** Apagar o bloco `bolo` acusou
`src/data/receitas.json perdeu o bloco bolo`. E refazer o acidente inteiro, gravando o arquivo de
fabricação por cima do outro, acusou `perdeu os blocos bolo, condensacao` em vez de estourar, que é
a regressão real que ela existe para pegar.

**Encostou em `package.json`, território compartilhado, por uma linha.** `npm run receitas:importar`
é o comando que o `_leia_isto` do próprio arquivo importado já afirmava existir, e não existia:
reimportação que não é comando não é reproduzível, e essa é a regra que a F3 deixou escrita.

### [x] F15 — O portão reprovou por um dia inteiro e ninguém leu

**Requisito:** R1.5, com R4.2 dizendo o que o push dispara
**Território:** compartilhado (a proteção é do repositório, o script e o comando são de `scripts/` e `package.json`)

O commit `0f61ae0` foi para o `origin` em 03.08 às 19:36. Os **dois** workflows falharam ali mesmo,
o "Portão de qualidade" em 42s e o "Publicar wiki" em 25s, e a main ficou vermelha até 04.08. A F14
consertou o defeito; esta tarefa é sobre o outro problema, que é maior: **o portão acusou e ninguém
leu.** Portão que reprova depois do push e não impede nada não gateia, ele registra.

Isso não é falta de atenção de quem empurrou. É a ordem dos acontecimentos: o CI roda **depois** que
o commit já está na main, então o único efeito de reprovar é escrever num lugar que ninguém abre por
hábito. Enquanto o gate for posterior ao fato, ele depende de alguém lembrar de olhar, e lembrar não
é mecanismo.

**Caminho escolhido: proteção de branch, sem serviço novo.** O repositório é público, então a
proteção de branch está disponível sem custo. A main passa a exigir o check `portao` verde, e um
commit sem check verde não entra. O que estava em `.github/workflows/portao.yml` continua igual: o
que muda é que o resultado dele passa a ter consequência.

**A consequência tem que ficar escrita, porque ela muda o modo de trabalhar.** Check obrigatório
bloqueia **push direto na main**, e não só merge: o commit chega sem status, e sem status ele é
recusado. A partir daqui todo trabalho vai por ramo e pull request. Quem edita pela interface web do
GitHub, que é o R4.1, continua conseguindo: o botão passa a oferecer ramo mais PR em vez de gravar
direto.

**Aceite:**

- A proteção é aplicada por comando versionado no repositório, e não por clique numa tela. Regra que
  só existe na configuração de alguém é a mesma coisa que tarefa que só existe numa conversa.
- `enforce_admins` **ligado**. Com ele desligado o dono do repositório passa por cima, e como o dono
  é quem empurra, a proteção não protegeria de nada.
- Revisão obrigatória **desligada**, de propósito: são quatro pessoas e o dono não pode aprovar o
  próprio PR. Exigir revisão travaria o repositório em vez de gatear.
- Provado por sabotagem, que aqui é **tentar empurrar direto na main e ser recusado**. Sem essa
  prova, a proteção é uma chamada de API que retornou 200 e pode não estar valendo.
- `npm run portao` passando.

**Feita, e a sabotagem é a única parte que prova alguma coisa.** A chamada de API devolveu 200 e o
`npm run protecao:conferir` leu de volta exatamente o esperado, e nenhuma das duas garante que a
regra vale: as duas leem a configuração, não o comportamento. A prova foi tentar empurrar direto:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: - Required status check "portao" is expected.
 ! [remote rejected] teste-protecao -> main (protected branch hook declined)
```

Código de saída 1, conferido separado do pipe: `git push ... | tail` devolve o código do `tail` e
imprime 0 em cima de uma recusa, que foi o que apareceu na primeira leitura.

**O próprio fechamento desta tarefa foi o primeiro teste do fluxo novo.** Marcar a F15 como feita
exigia um commit, e a main já não aceitava push direto: este texto entrou por ramo e pull request,
com o portão rodando antes do merge. Fluxo que ninguém percorreu é fluxo que ninguém sabe se
funciona.

**`strict` ligado**, ou seja, o ramo precisa estar em dia com a main antes de entrar. Custa rebase
quando a main anda, e paga pelo caso que motivou os territórios do `CLAUDE.md`: duas pessoas
dirigindo agentes no mesmo repositório sem ver o que a outra faz, e dois ramos que passam sozinhos
podendo se quebrar juntos. Se o rebase virar incômodo maior que o risco, o número está numa linha só
em `scripts/proteger-main.mjs`.

**O que esta tarefa NÃO resolve, e fica dito.** `construir` e `publicar` ficaram fora dos checks
exigidos porque dependem de o GitHub Pages estar de pé, e indisponibilidade de publicação não é
motivo para recusar código correto. Se o Pages falhar sozinho, o portão continua verde e a main
continua aceitando, que é o comportamento certo. O que a proteção garante é que o que está na main
passou no portão, não que o que está publicado é a main.

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

### [x] H8 — Guarda de classe para importador

**Requisito:** R3.5
**Território:** conteúdo e dados

Cinco defeitos silenciosos de importação neste projeto, todos a mesma coisa: forma inesperada
aceita em silêncio. Aptidão com espaço no nome descartada, marcador de string publicado como
conteúdo, tabela recortada até o fim do documento, linha de Pal alfa descartada, e o casamento de
idiomas por campo ausente. **Todas as vezes a resposta foi uma guarda específica para o defeito
recém-achado**, e todas as vezes o seguinte entrou por outra porta da mesma casa.

**Aceite:**
- Junção por campo ausente ou repetido ABORTA, em qualquer importador, antes de gravar.
- Para cada campo de texto que identifica registro, a distribuição é medida e congelada, e um valor
  que se espalha acima do teto medido FALHA nomeando campo, valor e contagem.
- Provado por sabotagem reintroduzindo o casamento por `id` no importador do mapa.

**Feita, e são duas metades que se cobrem.**

A metade que impede na origem é `scripts/lib/importacao.mjs`. `indicePorChave` aborta quando o campo
falta em qualquer registro, dizendo quantos e mostrando um, e quando ele repete, dizendo qual valor e
quantas vezes. `juntarPorChave` exige que os dois lados tenham as mesmas chaves. `parearPorIndice`
existe para o caso legítimo, que é a mesma lista em dois idiomas sem identificador, e cobra campos de
conferência: parear por índice sem nada que tenha de bater em cada posição é fé, não junção. Os dois
importadores passaram a usar: o do mapa parEia `fixedDungeon` por índice conferindo `type` e `pos`, e
o `regionData` e o `extrasIngame` também, que casavam por índice **sem guarda nenhuma** até agora. O
do catálogo indexa por `chave`, e a junção por `Map` tinha o mesmo defeito da junção por `find`:
`chave` ausente vira a entrada `undefined` e todo registro sem ela casa com o mesmo par.

A metade que pega no resultado está no `verificar-tudo.mjs` e vale para os **10 conjuntos importados**,
25 campos de texto. Ela compara `maior_repeticao` como TETO e `distintos` como PISO, contra
`src/data/referencia-importacao.json`, congelado por `npm run importacao:congelar`, mesmo mecanismo do
poder de captura. A assimetria é de propósito: valor que se espalha é junção quebrada, valor novo é
conteúdo novo. **Os limiares são medidos, nunca redondos**: `pontos.en` repete `Salvage_Rank2` em
1.987 registros de forma legítima, porque é nome de objeto e não de lugar, enquanto `pontos.pt` tem
teto 70. Era esse 70 que faltava: os 137 nomes iguais passavam porque o total de pontos não mudava.

**Campo que mede zero aborta ao congelar.** A primeira rodada declarou `pai`, `mae` e `filho` para
`cruzamentos_unicos`, que é coleção de triplas e não de objetos: os três campos renderam zero valores,
e congelar isso teria criado teto zero e piso zero, uma checagem que passa sempre sem conferir nada.
É o modo de falha mais caro deste repositório, e ele foi pego pela regra de falhar por falta de
insumo.

**Três sabotagens, todas rodadas.** Reintroduzir o casamento por `id` no importador do mapa fez a
guarda abortar com `13139 de 13755 registros não têm o campo "id"`, e o sha256 do
`mapa-pontos.json` ficou **idêntico** antes e depois: acusou antes de gravar. Devolver o dado com a
junção velha fez a guarda de variância acusar `"DarkIsland02" em 1338 registros contra teto 70` e
`148 distintos contra 349`. E colapsar 300 nomes em `itens.json`, que não é o arquivo do defeito
original, fez ela acusar igual: a guarda é de classe, não do caso.

Encostou em `package.json`, compartilhado, por uma linha de script.

### [ ] H5 — O mapa funcionar no pacote offline

**Requisito:** R3.6
**Território:** código e visual

Hoje a página do mapa viaja no pacote como texto e mais nada: o Leaflet vem da rede e não abre sem
internet, os 13.755 pontos ficam fora porque moram num bloco de dados fora do corpo da página, e os
341 tiles do fundo também ficam fora. Medido em 01.08, depois da H6: a página serve 897 KB no site e
contribui 12,0 KB para o pacote, que fechou em 3,72 MB de um teto de 8 MB. **O teto daquela medição
não vale mais:** em 04.08 ele virou um alarme de crescimento de 12 MB, e o pacote já está em
8,34 MB, o que deixa cerca de 3,9 MB para esta tarefa caber.

Escopo já decidido, para a tarefa não nascer impossível:

- **O Leaflet vai embutido** no pacote, cerca de 150 KB.
- **A imagem de fundo não são os tiles.** Os 341 tiles somam 4,38 MB e não cabem junto com o resto.
  É uma imagem única reduzida, na casa de 2048 px, embutida como data URI. A H6 já deixou a original
  baixável por comando, então o número medido sai de `npm run mapa:fundo`.
- **A alternativa em tabela vai preenchida no HTML**, não montada por script.

**Aceite:**
- Abrir o arquivo com duplo clique, **sem rede**, mostra o mapa com os pontos e a tabela preenchida.
- O pacote fica abaixo do alarme de 12 MB, e o número medido entra no commit, junto da contagem de
  nós de DOM que o empacotador imprime.
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

### [x] B4 — A cadeia de acesso à Árvore Mundial não está documentada

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

**Feita, e a página não estava vazia como a tarefa supunha: estava errada em parte.** A `endgame.md`
já tinha uma seção "Como entrar" com seis passos, e ela **não batia com os recortes**. Dizia "derrote
todas as torres" onde a fonte diz "descubra Sunreach, depois derrote Auri & Shaolong", e não trazia
nem o nível nem o lugar, que são as duas coisas que alguém precisa saber antes de ir.

A cadeia agora está na ordem do recorte, com **nível 70 ou mais** e **o ponto mais ao norte do mapa**
ditos na primeira linha, e o passo final separado dos seis pré-requisitos, porque ele é o que
acontece depois deles e não mais um da fila.

**O cruzamento das duas fontes está no texto, e é o que a tarefa pedia.** Onde as duas se encontram,
Auri & Shaolong como o portão do endgame, a página afirma. Onde só o NextTier fala, o nível 68 e "a
oitava e última torre padrão", a página diz de onde veio.

**Três afirmações saíram da página por não terem prova gravada.** "4 echobones: Marine, Silent,
Seafoam e Tidewind" e o Cientista da civilização antiga na ilha não estão em recorte nenhum do
repositório. Elas viraram registro em `fontes.md`, com o caminho de volta: quem conferir no jogo,
grava o recorte e devolve o texto. Tirar isso é desconfortável e é a regra: afirmação sem prova
reproduzível vira boato no dia seguinte.

**A marcação bilíngue aconteceu sozinha**, sem ninguém anotar nada, em `local_world_tree`,
`echoing_flute`, `corrosive_mask`, `local_u_female_nomad01_v05` e nos Pals Panthalus, Shaolong e
Bastigor.

**O que não está no dicionário entrou como está, e fica registrado aqui:** Sunreach, Deserted Islet,
Auri, Defense Module, Tower of the Azure Covenant e echobone. Nenhum tem nome oficial em português
extraído das strings do jogo, e o `termos:atualizar` não alcança o paldb desta máquina.

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

---

## Bloco E, continuação — A ficha de cada registro do catálogo

**Estas quatro estavam desalinhadas no arquivo.** A E8 tinha sido escrita logo abaixo de "Fora da
fila", que é a lista do que NÃO é tarefa, e ler o arquivo de cima para baixo dizia o contrário do
que ela é. O bloco existe para agrupar E8, E9, E10 e E11, que são a mesma ideia em quatro coleções:
o índice diz que a coisa existe, e a ficha diz o que fazer com ela.

**A decisão de 31.07 do `PRD.md` proíbe página por registro**, e está lá com o motivo: eram 2.959
páginas e uma extrapolação de dois minutos de build. A E8 já pede `/item/<slug>` no aceite, ou seja,
a decisão já foi emendada em tarefa sem ser emendada no PRD. **Quem fechar a E9 registra a emenda no
`PRD.md` com o tempo de build MEDIDO ao lado**, e não com a extrapolação que a decisão usou. Emenda
sem medição é a mesma extrapolação com o sinal trocado.

### [x] E8 — Os 1.875 itens são nomes sem receita, e é o maior buraco do site

**Requisito:** R1.8
**Território:** conteúdo e dados, mais código para a rota de detalhe

A auditoria de 01.08 pôs isto em primeiro lugar: o site não tem UMA receita de
fabricação para nenhum dos 1.875 itens. "Do que eu preciso para fazer uma Esfera Mega"
é a pergunta mais comum de quem joga, e o paldb responde em um clique.

A ficha de item do paldb publica tudo o que falta, conferido em 02.08 na página da
Mega Sphere: receita com materiais e quantidades (Paldium Fragment 1, Ingot 1, Wood 3,
Stone 3), tempo de fabricação, tecnologia que destrava, bancadas que fabricam, tabela
de quem dropa com quantidade e probabilidade, valor em ouro, peso, empilhamento máximo.

Nada disso depende do `Mappings.usmap`.

**Aceite:**
- O importador visita a ficha de cada item e grava receita, tecnologia, bancadas,
  drops, ouro, peso e empilhamento. Uma requisição por vez, com pausa, sem paralelismo.
- Guarda de aborto: se menos de 300 itens vierem com receita, ABORTA sem gravar.
- Congela a contagem de itens com receita em arquivo de referência, como o poder de
  captura, para reimportação futura acusar deriva.
- `/itens` deixa de ser beco sem saída: cada registro leva a `/item/<slug>`.
- A ficha de item mostra a receita em português, com os nomes do jogo, e diz quando o
  item não é fabricável em vez de deixar a seção vazia.
- O pacote offline NÃO leva as 1.875 fichas: leva o índice, e diz no cabeçalho que as
  fichas ficaram de fora e por quê. Medir e escrever o número.
- O build continua abaixo de um minuto, ou a tarefa diz quanto passou e por quê.

**Fonte:** paldb.cc, ficha por item. Gravar o recorte de UMA ficha em
`src/data/recortes/`, com data e URL, pela regra da F3.

**Fechada em 04.08, e os dois critérios que faltavam são os que a fazem existir como dado
verificável.** A importação e a rota já estavam no ar desde a E9; o que faltava era o que impede a
próxima importação de trocar o dado em silêncio.

**A referência congelada não guarda só totais, e é aí que está a diferença.** Total não pega o
defeito que ESTA importação já teve: as três primeiras versões do recorte trouxeram as mesmas 1.875
fichas e o mesmo número de itens com receita, e o que mudava era o conteúdo, porque o parser perdia
o último material de cada uma. `referencia-receitas.json` congela também o **número de referências a
material** (4.034) e o **uso dos seis materiais mais frequentes**. Sabotado com o defeito original,
tirar o último material de toda receita, o verificador acusou **dez derivas de uma vez**, entre elas
`referencias: 2989 na importação e 4034 na referência (-1045)`, com os totais de itens intactos.

**O recorte quase não provou nada, e ele passou na checagem assim mesmo.** A primeira captura da
ficha da Mega Sphere gravou quatro trechos dizendo `Paldium Fragment`, `Ingot`, `Wood`, `Stone`,
**sem número nenhum**, porque o extrator quebra linha em todo `</div>` e o paldb põe o material num
div e a quantidade no seguinte. Cabeçalho afirmando que provava "Paldium 1, Ingot 1, Wood 3,
Stone 3", corpo provando só que essas palavras existem na página, e a checagem da F3 aprovando,
porque ela exige que haja linha citada e não que a linha sustente a afirmação.

A correção é geral e não é para esta página: **alguma prova é um bloco estruturado, não uma frase.**
Alvo do `gravar-recortes.mjs` pode declarar `bloco`, e aí a região sai do HTML cru com as tags
virando espaço em vez de quebra de linha. O bloco só vale se contiver todos os termos de relevância,
e alvo que declara bloco sem achá-lo cai em `sem-trecho` em vez de gravar os trechos por termo como
se bastassem.

**Sete sabotagens. Seis acusaram e uma não, e a que não acusou virou a checagem que faltava.**
Perder o último material de toda receita acusou dez derivas. Trocar um material sem mudar o tamanho
da receita acusou `importação diz "... Wood 3, Wood 3" e a referência conferida diz "... Wood 3,
Stone 3"`, que é o caso que comparar tamanho aprovaria. Esvaziar a referência acusou falta de insumo
em vez de percorrer zero campos e dizer que bate. Apagar o recorte acusou por dois caminhos
independentes. Cortar a janela do bloco vazou markup para dentro da citação, e isso foi visto
lendo o arquivo, não em log.

**A sétima passou:** fazer o bloco da receita sumir da página degradou o recorte para `sem-trecho`,
e o portão continuou verde. A checagem da F3 só exige que recorte não-vivo seja **mencionado** no
`fontes.md`, e o `fontes.md` menciona este arquivo como PROVA da receita. A menção existia e dizia o
contrário do estado real. Agora a referência congelada cobra que o recorte que ela aponta esteja
`viva`, e não só que exista.

**Duas afirmações da página ficaram velhas no mesmo dia e foram corrigidas junto.** O `fontes.md`
dizia em duas linhas que "o paldb não abre desta máquina", verdade em 01.08 e em 02.08, e o recorte
desta tarefa foi gravado dele com HTTP 200 em 04.08. Página que diz que a fonte não abre enquanto o
repositório grava recorte dela no mesmo dia se contradiz. As duas divergências continuam abertas: o
que mudou é o motivo pelo qual ninguém as fechou, não o estado delas.

### [x] E9 — Ficha de item, com receita navegável e índice invertido

**Requisito:** R1.8, sob a emenda que esta tarefa registra no `PRD.md`
**Território:** código e visual, encostando em conteúdo e dados pelo mínimo (as strings da moldura
moram em `interface.json`, e as checagens novas em `scripts/`)
**Bloqueada por:** F14, que é o que devolve o portão ao verde

A E8 trouxe a receita de 1.244 itens e parou antes de publicar. Hoje `/itens` é uma lista de 1.875
nomes onde clicar não leva a lugar nenhum, e o dado da receita está no repositório sem nenhuma
página consumindo. Dado importado que ninguém consome não é cobertura, é peso morto: é a mesma frase
que a asserção 9 do `testar-navegador.mjs` já carrega sobre os três índices da E4.

**A rota é para os 1.875, não para os 1.244 fabricáveis.** Deixar 630 itens sem página recria o beco
sem saída que esta tarefa existe para fechar, só que menor e mais difícil de ver: quem clica em
Paldium Fragment cai numa página, quem clica em Wheat cai num 404.

**Os dois estados de "sem receita" são diferentes e o `receitas.json` os guarda separados.** São 630
itens com a ficha visitada e sem receita publicada, que é "não é fabricável", e 1 item cuja ficha
não voltou (`Celestial_Sigil_[Master]`, 404). Uma página que diga só "sem receita" funde os dois e
apaga a diferença entre "o jogo não fabrica isso" e "nós não fomos buscar".

**Aceite:**

- Existe uma página por chave de `itens.json`, e o número sai da contagem, não escrito à mão:

  ```bash
  npm run build
  test "$(find dist/item -name index.html | wc -l)" -eq "$(node -p "require('./src/data/itens.json').itens.length")" \
    && echo "ok, uma ficha por item" || { echo "FALHOU"; exit 1; }
  ```

- **A ficha da Esfera Mega mostra Paldium 1, Lingote 1, Madeira 3, Pedra 3.** É o caso conferido
  contra a fonte na E8, e é o que pega o parser perdendo o último material de novo: a primeira
  versão do importador lia essa mesma receita sem o Stone 3 do fim.
- **Todo link de material leva a uma página que existe.** As duas metades: o link tem que existir e
  o destino tem que ter sido gerado. Só a primeira aprovaria 147 links para 404.
- **Item sem receita diz qual dos dois casos é**, e não fica com seção vazia. Vale para os dois:
  um dos 630 e o 1 que não foi trazido.
- **O índice invertido de um material conhecido bate com a contagem calculada do `receitas.json`.**
  Número na tela conferido contra o número no dado, e não contra um literal digitado na asserção.
- `/itens` deixa de ser beco sem saída: cada registro leva à ficha, e a largura que a F4 deu ao
  índice continua de pé (4 colunas em 1440px, altura abaixo do teto congelado).
- **O pacote offline NÃO leva as 1.875 fichas.** Leva o índice, e escreve no cabeçalho quantas
  ficaram de fora e por quê. O número é medido, não estimado.
- **O tempo de build é medido e escrito no commit.** Hoje são 12,3s com 323 páginas. Se passar de um
  minuto, o critério não afrouxa e a geração sob demanda continua proibida pela stack: registre o
  tempo medido, troque o critério com a medição ao lado, e diga. Foi assim que o teto do offline
  virou 8 MB.
- **A emenda à decisão de 31.07 entra no `PRD.md`** com o tempo medido, e o R1.8 deixa de dizer
  "sem página por registro" sem qualificar.
- Cada asserção nova provada por sabotagem, no mesmo ambiente onde ela vai rodar.
- `npm run portao` passando.

**Feita. São 1.875 fichas, e o build ficou em 21,6s.**

**A emenda ao PRD é a parte que vale mais, porque a decisão de 31.07 estava errada por medição e não
por opinião.** Ela proibia página por registro extrapolando os 13,3s da E1: 2.959 páginas a mais
passariam de dois minutos. Medido, o build foi de **12,75s com 323 páginas para 21,6s com 2.198**,
com o Pagefind indexando as 2.198. São **4,7ms por página a mais**, contra os 41ms que a divisão de
13,3s por 323 sugeria, porque quase todo o tempo do build é custo fixo e não custo por página. Pelo
marginal medido, as 2.959 da decisão original custariam cerca de 14s. **A extrapolação errava por um
fator de nove, e por causa dela o maior buraco do site ficou dois dias sem conserto.**

**O offline não leva as fichas, e quem decidiu foi o teto, não o gosto.** Com elas dentro o pacote
vai a **8.858,8 KB contra o teto de 8.192 KB**, e o próprio `gerar-offline.mjs` aborta em 108%. Sem
elas fica em **3.997,9 KB, 49%**. O que sai é a ficha e não o item: o índice com os 1.875 nomes
continua no pacote. O número do que ficou de fora é escrito **no cabeçalho do arquivo**, e não só no
log, porque quem recebe o HTML pelo grupo não lê o log de ninguém.

**A asserção que já existia sobre o offline não foi afrouxada, foi apertada.** Ela exigia que o
pacote trouxesse TODAS as páginas do dist, e afrouxá-la para "quase todas" devolveria ao script a
liberdade de perder página em silêncio, que é o que ela existe para pegar. Agora ela cobra duas
coisas: a conta fecha descontando a exclusão declarada, E o arquivo diz quantas ficaram de fora, com
o número batendo com o que faltou de verdade. Corte que não é dito continua reprovando.

**Onze sabotagens, todas rodadas.** Três no verificador: duas chaves caindo no mesmo endereço
acusou `/item/stone/ vem de St(one) e Stone`; material sem item correspondente acusou o órfão pelo
nome; e apagar uma receita acusou `os estados não fecham com os 1875 itens`. Duas nos links: apagar
uma ficha de destino acusou `1 sem página: stone` entre 7.996 links, e tirar os links de todas as
1.875 acusou `nenhum link para /item/ encontrado, então esta asserção não conferiu nada`, que é a
metade que impede a asserção de se aprovar sozinha. Uma na receita: cortar o último material da
Esfera Mega, que é o defeito original do parser, acusou `na tela Fragmento de Palúdio 1, Lingote de
Metal 1, Madeira 3` contra os quatro esperados. Uma no índice invertido: truncar em 20 acusou
`20 na tela contra 292 no receitas-fabricacao.json`. Duas no offline: exclusão declarada que não
casa com rota nenhuma abortou com código 1, e cortar sem dizer no cabeçalho acusou
`1875 de diferença, 0 declaradas`. Uma na largura: alargar toda ficha acusou
`ficha de receita curta com coluna de 1176px`.

**A décima primeira sabotagem NÃO acusou, e é a mais útil das onze.** Fundir os dois estados numa
frase só passou batido: a asserção lia o parágrafo inteiro, e o `Motivo: 404` que acompanha um dos
casos ainda fazia os dois textos diferirem. A página teria voltado a afirmar "não é fabricável"
sobre um item que nunca foi consultado, com o motivo do lado, e o portão aprovaria. A frase de
estado passou a morar no próprio elemento, com `data-estado`, e o motivo saiu de dentro dela. Só
depois disso a sabotagem derrubou a asserção. **Asserção que não foi derrubada não é prova, é
esperança.**

**Dois defeitos apareceram só no screenshot, e nenhum dos dois em log.** A contagem do índice
invertido saía como um `292` solto embaixo do subtítulo, sem dizer de quê, que é exatamente a lição
que a F4 já tinha deixado escrita no `IndiceCatalogo.astro`. E a ficha era larga nas 1.875: bom para
o Fragmento de Palúdio, com 292 entradas em grade de quatro colunas, e ruim para a Esfera Mega, que
abria com metade de uma tela de 1440px em branco e os filetes das seções atravessando o vazio. A
largura passou a sair do conteúdo, e a cláusula da F4 que impede "usar a largura" de virar "alargar
tudo" passou a cobrir as fichas também.

**Território fora do meu, e dito aqui em vez de escondido no diff.** A tarefa é de código e visual,
e encostou em `src/data/interface.json` (as 11 strings da moldura, que é onde elas moram desde a A1)
e em `scripts/`. Não encostou em `package.json`.

### [x] E10 — Ficha de Pal com atributo, drop e onde capturar, importados da ficha

**Requisito:** R1.7
**Território:** conteúdo e dados para a importação, código e visual para a ficha
**Bloqueada por:** E9, pelo caminho de importação e pela rota que ela abre

As 299 fichas de Pal mostram nome, número, elementos, aptidões e os guias que citam. A ficha do
paldb publica muito mais e nada disso está aqui: HP, ataque, defesa, velocidade, peso, comida por
refeição, o que o Pal dropa com quantidade e probabilidade, onde ele aparece no mundo e em que
horário, montaria e sela.

**Mesmo caminho da E8, e a guarda de aborto junto.** Uma requisição por vez, com pausa, retomável, e
aborto sem gravar quando o campo inteiro sumir da extração. A E8 provou que a contagem sozinha não
acusa defeito de recorte: os 1.875 itens vieram completos as três vezes, e as três primeiras
versões liam a receita errada.

**Não comece pela tela.** O dado entra primeiro, conferido contra a fonte com recorte gravado pela
regra da F3, e a ficha consome depois. A ordem inversa produz página desenhada em cima de campo que
ainda vai mudar de forma.

**Aceite:**
- O importador grava atributo, drop e local de captura por Pal, e ABORTA sem gravar se uma categoria
  inteira vier vazia.
- A contagem por categoria é congelada em arquivo de referência, como o poder de captura e a
  `referencia-importacao.json`, para reimportação futura acusar deriva.
- A ficha mostra os três blocos novos, e diz qual não veio em vez de deixar seção vazia.
- O drop liga para a ficha de item da E9, e o local de captura liga para o `/mapa` **quando o Pal
  existir como marcador nomeado**, com os demais mostrando a área nomeada e a faixa de nível.

  **Emenda de 05.08, com a medição ao lado, no mesmo padrão do teto de 8 MB.** O critério original
  dizia "liga para o `/mapa` quando a coordenada existir", e essa coordenada **não existe nesta
  fonte**: o paldb publica área nomeada (`green_A`, `grass_grade_01`) com faixa de nível, e nunca
  coordenada de spawn comum. Medido no `mapa-pontos.json`: **137 dos 299 Pals** aparecem como
  marcador nomeado com coordenada, nos três tipos que carregam nome de Pal e nível (`Alpha Pal` 83,
  `Unknown` 87, `City` 73, somando 243 pontos). Esses 137 ganham link para o ponto; os outros 162
  mostram a área e a faixa, **dizendo que a fonte não publica coordenada** em vez de deixar a seção
  parecendo incompleta. O critério não morreu, virou condicional com o número que o justifica.
- Nenhum campo digitado à mão. R1.6 vale aqui igual.
- Recorte de UMA ficha gravado em `src/data/recortes/`, com data e URL.
- `npm run portao` passando, com o tempo de build medido de novo.

**Andamento em 05.08: o dado está importado e conferido, a ficha ainda não mostra.** A tarefa
continua aberta pelo que falta, que é a tela. O que está feito:

**O piloto pagou duas vezes, e as duas antes de gastar as 299 requisições.** A primeira versão do
parser trocava a barra de progresso por um separador e lia os dois lados, o que **descartava em
silêncio toda linha sem barra**: `Size`, `Work Speed`, `CaptureRateCorrect`, `Egg`, `Code` e as sete
velocidades. Eram 9 atributos de 23, com a contagem de fichas em 100% do mesmo jeito. E os atributos
estão repartidos em cartões, então ler só o primeiro trazia 15 de 23.

**Ficam de fora, com o motivo no script:** o cartão "Level 80", que é faixa calculada pelo paldb por
cima do intervalo de talento e não dado do jogo, e o "Tribes", que é a aptidão que já está no
`catalogo.json` e já foi conferida. Retrazer seria conferir a mesma fonte com ela mesma.

**Drop de alfa é página separada no paldb**, com nome próprio (`Coward_of_the_Steppe_Lifmunk`), e a
ficha normal só linka. Sem seguir o link, a lista do site valeria só para o comum sem dizer isso. A
guarda de colapso não disparou: quatro dos dez do piloto têm a mesma contagem e conteúdos
diferentes.

**Diferença de formato entre as fontes, que precisa ficar dita:** o `alpha_drops` da wiki.gg
**inclui** os drops normais, e a página de alfa do paldb traz **só os extras**. Comparar cru daria
divergência em todo Pal do jogo.

**A codificação de chave mordeu pela terceira e pela quarta vez, na mesma tarefa.** Terceira: a
página `Plump_&_Juicy_Chikipi` deu 404 porque o `&` não estava na lista `[:()]` herdada da E8.
Quarta, e essa desmente o que o commit da terceira afirmou: **`encodeURIComponent` não escapa
`! ' ( ) * ~`**, e `Dont_Touch!_Jolthog` e `Watch_Your_Feet!_Jolthog_Cryst` voltaram 404. O parêntese
está nessa lista, ou seja, trocar a lista da E8 por `encodeURIComponent` puro teria **regredido** a
correção dela. O que fecha a série é escapar o que ele deixa passar, e não uma lista nova.

**A importação das 299 trouxe tudo, com zero falha de rede:** 299 com atributo em 25 campos
distintos, 299 com drop somando 1.209 linhas entre normal e alfa, 274 com captura somando 2.090
linhas, 282 com drop de alfa. Os 25 sem captura, os 10 sem página de alfa (que são exatamente as 10
entidades do Terraria) e os sem drop de alfa saem como `null` **com a causa ao lado**, e
`nao_trazidos` está vazio.

**A conferência independente pegou um defeito que teria ido ao ar, e a contagem não pegaria.** A
tabela do paldb tem uma terceira coluna, e ela é uma **condição de nível**: linha com `70` ali é
drop da variante daquele nível, não do Pal comum. Lidas juntas, a ficha do Wispaw publicava **onze
drops, dois deles duplicados**, e prometia relíquia de endgame num Pal de mid game. A wiki.gg
publica exatamente as duas linhas sem condição, e agora nós também. São **108 Pals com 1.382 linhas
condicionais**, hoje em lista própria com o nível junto.

O piloto de dez não pegaria isso, porque nenhum dos dez tem linha condicional, e a saída dizia
`299 de 299 com drop`, que estava certa e inútil. **Foi a conferência contra fonte independente que
achou**, que é o motivo de ela existir.

**A conferência independente virou comando:** `npm run drops:conferir` compara os drops importados
contra a `palworld.wiki.gg` pela `api.php`, porque o HTML dela responde 403. Drop é a única parte
desta ficha que dá para conferir contra fonte independente, e é por isso que a conferência é dele:
atributo de Pal não é discreto, e comparar com o paldb seria conferir o paldb com ele mesmo.

**Conferidos os 299, são 331 divergências em 272 Pals, em quatro classes, e duas delas continuam
abertas.** As duas fechadas são grafia (119 ocorrências de "Pal Fluids" contra "Aquatic Pal Fluids")
e cobertura (193 anéis e apitos que só a wiki.gg lista, todos no alfa). As duas abertas estão em
`fontes.md`, e a segunda apareceu só na conferência dos 299: **a faixa de quantidade do drop de alfa
diverge entre as fontes**, com Gumoss em 2-4 contra 1, Penking em 3-4 contra 2-3 e Kingpaca em 3-5
contra 1-3. Enquanto isso não for decidido, a quantidade do drop de alfa não vai para a tela.

**A primeira contradição:** o primeiro drop do Lifmunk é
**Wheat Seeds** para o paldb e **Berry Seeds** para a wiki.gg, com a mesma quantidade e a mesma
probabilidade. Não é recorte deslocado (o Lamball bate nos dois, incluindo a faixa 1-3) e não é o
paldb se confundindo numa página (a página do item `Wheat_Seeds` lista o `Carbunclo`, id interno do
Lifmunk, e a do `Berry_Seeds` não). Duas fontes coerentes por dentro discordando, e é conferível no
jogo em trinta segundos.

**Os atributos não têm conferência independente, e isso fica dito em vez de escondido.** O jogo
mostra os stats do Pal capturado, no nível dele, já modificados por talento, condensação e passiva.
`health: 70` é valor base de espécie que entra numa fórmula que não temos. A referência congelada
serve para acusar deriva, não para provar que o número está certo.

**Quatro sabotagens da checagem nova, todas rodadas.** Repetir o defeito do piloto, apagando os seis
atributos sem barra, acusou `campos_de_atributo: 19 na importação e 25 na referência (-6)`. Trocar a
faixa do Wool na ficha conferida acusou o par lado a lado. Pôr chave de drop sem item acusou por dois
caminhos. Esvaziar a referência acusou falta de insumo em vez de percorrer zero campos e passar.

**Fechada em 05.08, com a tela no ar e as duas divergências decididas.**

**A quantidade do drop de alfa NÃO vai para a tela, e a página diz por quê.** As duas fontes
concordam sobre quais itens caem e discordam sobre quanto, e o padrão (paldb sempre maior e
deslocado para cima, lista normal batendo) indica que descrevem alfas de níveis diferentes. A lista
de itens é a única afirmação que as duas sustentam. Silêncio não era opção: a ficha traz a nota com
link para a seção do `fontes.md`.

**A divergência do Lifmunk é publicada com o valor do paldb e a disputa à vista**, porque o paldb é
a fonte de registro desta importação. Nunca média, nunca escolha silenciosa. Os dois recortes estão
gravados, o do paldb e o da wiki.gg. **E a marca não é literal no template**: a divergência mora em
`referencia-fichas-pal.json`, e o verificador reprova se ela sumir do dado, para a ficha não ficar
marcando disputa que já acabou.

**A lista condicional por nível entra rotulada e separada visualmente.** Foi ela que evitou publicar
relíquia de endgame como drop de Pal de mid game no Wispaw, e achado escondido no dado volta a ser
defeito na próxima importação. São 108 Pals com 1.382 linhas.

**A âncora para o `fontes.md` quase repetiu a F11 no mesmo dia em que eu a citei.** Escrevi o
literal `contradicao` e o título tem `contradição`: link morto. Agora ela sai do mesmo
`github-slugger` que o Astro usa, e o build FALHA se a seção não existir.

**O screenshot pegou o que o log não pegaria:** o campo `Ovo` saía como "Verdant Egg", valor em
inglês no meio de uma página em português, que é a classe de defeito da F12. Os 26 valores distintos
existem em `itens.json` com nome em português, e agora o campo sai traduzido e com link.

**O teto do offline subiu de 8 MB para 8,3 MB**, porque os três blocos levaram a seção `pal/` de
833 KB para 4.522 KB e o pacote a 8.225 KB. O número novo não é palpite: é até onde a medição de
31.07 já alcançava, que inflou o arquivo a 8,3 MB e mediu 2,2s de carga. Registrado no `PRD.md`.
**Sobram 274 KB, e isso não cobre a E11.**

**Emenda de 04.08, antes deste bloco ser mergeado: os 8,3 MB não existem mais, e o número virou
outra coisa.** A medição de carga que sustentava o teto não se reproduz: o mesmo arquivo de 8,3 MB
mediu 2,2s em 31.07 e 12,0s em 04.08, e o tempo oscila em vez de crescer com o tamanho. O limite
passou a 12 MB e deixou de ser barra de qualidade: virou ALARME DE CRESCIMENTO INESPERADO, que
nunca pegou lentidão e pegaria importação duplicada. No lugar do tempo entrou a contagem de nós de
DOM, que não oscila, impressa pelo `gerar-offline.mjs` e conferida contra o Chromium em
`testar-navegador.mjs`. A decisão inteira está no `PRD.md`.

**Seis sabotagens nesta metade, todas rodadas.** Campo de atributo sem rótulo acusou os dois pelo
nome. A divergência registrada sumindo do dado acusou. Devolver a quantidade ao drop de alfa acusou
`tem número: true`. Refundir a lista condicional acusou `comum 11 de 2` e listou as relíquias na
mensagem. Quebrar a âncora acusou `âncora viva: false`. E o teto do offline reprovou sozinho antes
de eu subir, que é ele fazendo o trabalho dele.

### [ ] E11 — Ficha de estrutura e de tecnologia, mesmo caminho

**Requisito:** R1.8, sob a mesma emenda que a E9 registra
**Território:** conteúdo e dados para a importação, código e visual para as rotas
**Bloqueada por:** E9

As 496 estruturas e as 588 tecnologias estão no mesmo estado em que os itens estavam antes da E9:
índice que filtra e não leva a lugar nenhum. A estrutura tem custo de construção, requisito de
tecnologia e o que ela fabrica; a tecnologia tem custo em pontos, nível, e o que ela destrava.

**O que fecha o ciclo é o cruzamento, não a ficha isolada.** A tecnologia destrava estrutura e item,
a estrutura fabrica item, e o item pede material que é outro item. Com as três rotas no ar, a
pergunta "o que preciso fazer para conseguir isto" passa a ter resposta navegável em vez de exigir
que a pessoa mantenha o grafo na cabeça. A E9 entrega uma aresta desse grafo; esta entrega o resto.

**Aceite:**
- Existe uma página por registro das duas coleções, com o número saindo da contagem.
- O custo de construção da estrutura leva à ficha de item de cada material, com a mesma prova de
  destino existente que a E9 exige.
- A tecnologia lista o que ela destrava, ligando para estrutura e item, e o dado sai do
  `tecnologias.json` cruzado, não de lista escrita à mão.
- A ficha de item da E9 ganha o caminho de volta: qual tecnologia destrava e qual bancada fabrica.
- O pacote offline continua sem as fichas, e o cabeçalho passa a dizer o total das três coleções.
- O tempo de build medido de novo, com o critério vigente ao lado.
- `npm run portao` passando.