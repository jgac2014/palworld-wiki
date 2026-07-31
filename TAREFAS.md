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

Criar `src/data/interface.json` com as 65 strings do Anexo A do `PLANO-BILINGUE.md`, no formato
`{ "chave": { "pt": "...", "en": "..." } }`.

O Anexo A tem 66 chaves de topo, sendo uma o `_leia_isto`. São 65 strings de verdade.

**Aceite:** este comando imprime 65 e não lança.

```bash
node -e "
const d = require('./src/data/interface.json');
const e = Object.entries(d).filter(([k]) => !k.startsWith('_'));
const f = e.filter(([, v]) => !v || !v.pt || !v.en);
if (f.length) throw new Error('sem par PT/EN: ' + f.map(x => x[0]).join(', '));
console.log(e.length + ' strings ok');
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

---

## Bloco E — Fechar a Camada 1, a wiki completa

O catálogo com os 299 Pals já está importado e conferido. Falta transformá-lo em site. Este bloco é
o que faz a wiki competir com as grandes em cobertura, e ele vem antes do bloco D: não adianta ter
overlay de progresso sobre uma wiki que só conhece 77 Pals.

Exceção de ordem: **E3 depende de D1**, que está no bloco D. Ao chegar em E3, execute D1 primeiro e
volte. É a única dependência cruzada entre os blocos.

### [ ] E1 — Uma página por Pal, gerada do catálogo

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

### [ ] E2 — Separar a navegação em duas camadas

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

### [ ] E3 — Interruptor de overlay do progresso

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

### [ ] E4 — Importar itens, estruturas e tecnologias

**Requisito:** R1.8
**Território:** conteúdo e dados

Mesmo caminho do `importar-catalogo.mjs`, que já provou funcionar com uma requisição por idioma:
achar a página de índice de cada tipo no paldb e extrair.

**Aceite:**
- `npm run catalogo:importar` passa a trazer as quatro coleções.
- O verificador confere estrutura de todas, como já faz com Pals.
- Nenhum campo é digitado à mão.

### [ ] E5 — Calculadoras universais

**Requisito:** R1.9
**Território:** código e visual
**Bloqueado por:** E1

Cruzamento (par para alvo e alvo para par), taxa de captura e condensação. Elas funcionam sem o
overlay, com o usuário digitando os valores. Com o overlay ligado, os campos já vêm preenchidos com
os nossos números.

**Aceite:**
- Cada calculadora funciona com o overlay desligado.
- Cada uma tem versão em tabela.
- A de cruzamento usa o CombiRank do catálogo, não uma tabela copiada.

## Bloco D — Trazer o protótipo para o site

O desenho está pronto e testado em `proto/index.html`. Estas tarefas são de portar, não de inventar:
abra o protótipo, copie o comportamento. Ordem importa, porque D1 é a base das outras.

### [ ] D1 — `save.json` como fonte única do estado

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

### [ ] D2 — Painel do save na seção do nosso mundo

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

### [ ] D3 — Ficha do Pal em popover

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

### [ ] D4 — Banco de Pals com filtro por aptidão e posse

**Requisito:** R5.4, R5.5
**Território:** código e visual
**Bloqueado por:** D1

Reescrever `src/pages/pals.astro` no formato do protótipo: cartões com barra de aptidão, distintivo
de posse lido do `save.json`, filtro que ordena por nível da aptidão escolhida.

**Aceite:**
- Filtrar por Garimpo lista os Pals de Garimpo em ordem decrescente de nível.
- O distintivo de posse vem do `save.json`, não está escrito no componente.
- A página continua indexada pelo Pagefind.

### [ ] D5 — Calculadora de bolo

**Requisito:** R5.2
**Território:** código e visual
**Bloqueado por:** D1

Portar a calculadora do protótipo, com uma correção sobre ele: o protótipo só tem campos para
trigo e farinha, mas o aceite exige mexer em leite e ovos. A versão do site tem **entrada editável
para os seis valores**: trigo, farinha, frutas vermelhas, leite, ovos e mel, pré-preenchidos pelo
estoque de `guilda.json` quando o overlay estiver ligado.

A conversão do moinho é 2 de trigo para 1 de farinha. O número de bolos é o piso do ingrediente
mais escasso, e a mensagem nomeia qual é.

**Aceite:**
- Com o estoque real de 30.07 (leite 0, ovos 0) o resultado é 0 e a mensagem diz que a trava é
  leite, citando o Mozzarina parado no Palbox.
- Trocando leite para 180 e ovos para 200, o resultado passa a 18 e a mensagem aponta farinha,
  dizendo que o gargalo real é trigo.
- Existe versão em tabela dos mesmos números.

### [ ] D6 — Tema claro e escuro

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

### [ ] B2 — Registrar a versão do cliente e alertar sobre defasagem

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
