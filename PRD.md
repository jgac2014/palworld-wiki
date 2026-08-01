# PRD — Wiki Palworld do grupo

Versão 3, 30.07.2026. Substitui o PRD de 31 páginas que assumia plataforma multi-jogo com usuários
externos. Aquele escopo foi descartado pelo dono do projeto e este documento existe para que nenhum
agente volte a implementá-lo por engano.

A v3 acrescenta a decisão que organiza tudo o mais: **o site tem duas camadas**, uma wiki completa do
jogo e uma área separada do nosso save. Ver 3.0.

Este arquivo diz **o que** e **por quê**. `TAREFAS.md` diz **em que ordem**. `CLAUDE.md` diz **como
trabalhar aqui**.

---

## 1. Para quem

Quatro amigos jogando Palworld 1.0 em co-op, num mundo por código de convite hospedado por um deles.
Todos no PC, versão Xbox / Game Pass, jogando no controle. Um joga em inglês, o resto em português.
O grupo pode crescer se decidirem subir um servidor dedicado, mas isso não muda o produto.

O usuário concreto que resolve empate de decisão: **alguém no meio de uma sessão, com o controle na
mão, querendo saber uma coisa específica em menos de vinte segundos.** Não é alguém lendo por prazer.

## 2. O problema

As wikis de Palworld que existem têm três defeitos para este grupo:

1. **Estão em inglês, ou traduzidas por máquina.** A tradução oficial em PT-BR do jogo não está
   publicada em lugar nenhum, então os guias em português usam tradução literal que não existe no
   jogo. "Mineração" em vez de **Garimpo**, "Produção de Medicina" em vez de **Manipulação**.
   Quem lê não acha o item na tela.
2. **Estão desatualizadas ou se contradizem.** O 1.0 mudou tabela de cruzamento, escala de aptidão
   e nível de sela. Muito conteúdo que circula é resquício de Early Access apresentado como atual.
3. **Não sabem nada sobre este save.** Conselho genérico não diz qual das *nossas* bases está no
   lugar errado.

## 3. O que o produto é

Um site estático, publicado, pesquisável, em português com alternância para inglês, editável por
quem não programa pela interface web do GitHub.

### 3.0 A arquitetura: duas camadas

Decisão de 30.07. O site tem **duas metades que não se misturam na navegação**.

**Camada 1, a wiki.** Cobertura completa do jogo, no nível das melhores wikis: todos os Pals, itens,
estruturas, tecnologias, mapa e calculadoras. Vale para qualquer jogador do mundo, é indexável pelo
Google, e é a metade que justifica o site existir para além de nós quatro.

**Camada 2, o nosso mundo.** O painel do save, as nossas bases, o nosso squad, os nossos gargalos e
as decisões do grupo. Vale só para nós, e é a metade que nenhuma wiki grande consegue copiar.

Por que separar em vez de fundir tudo: o site é público. Uma wiki entremeada de "a nossa base 3
está no lugar errado" é ilegível para quem chega de fora, e uma wiki que só fala do jogo em geral
não resolve o nosso problema. Separando, cada metade fica boa no que faz.

**A ponte entre as duas é um interruptor, não uma fusão.** Um botão global de "mostrar o meu
progresso" liga um overlay sobre a Camada 1: o banco de Pals passa a marcar o que já está no
Palbox, a calculadora passa a usar o nosso estoque, o mapa passa a mostrar as nossas bases.
Desligado, o site é uma wiki normal e completa. Ligado, ele é a nossa wiki. Ninguém precisa de
conta: o estado vem de um JSON versionado no repositório.

### 3.1 De onde vem o conteúdo de cada camada

Isto define quase tudo, então está aqui e não num anexo.

| | Camada 1, a wiki | Camada 2, o nosso mundo |
|---|---|---|
| **Dado de catálogo** | **Importado**, nunca digitado. `catalogo.json` vem do paldb, 299 Pals nos dois idiomas | `guilda.json` (bases, baú, torres) mais `saves/<nome>.json` por pessoa (nível, squad, Palbox), espelhando o que o jogo compartilha em co-op |
| **Texto** | **Escrito à mão** por nós. É a curadoria, o julgamento, o que fazer com o dado | Escrito à mão, específico do grupo |
| **Como cresce** | Rodando `npm run catalogo:importar` a cada patch | A cada sessão de jogo |

A regra que decorre disso: **número é importado, opinião é escrita.** A conferência de 30.07 provou
o custo de ignorar isso: dos 77 Pals que tínhamos digitado à mão, 26 tinham aptidão errada. Nenhum
grupo de quatro pessoas digita 299 fichas sem errar, e nenhum importador escreve "esse Pal não vale
o slot".

O `pals.json` continua existindo e não é redundante: ele é a curadoria, com nota, fase e onde achar,
para os Pals que importam. O `catalogo.json` é a cobertura. O verificador cruza os dois e falha se
um número da curadoria contradisser o catálogo.

### 3.2 Princípios de decisão

- **Conteúdo verificado vale mais que conteúdo abundante.** Uma página que contradiz outra é pior
  que uma página que não existe.
- **Dado estruturado em JSON, não em tabela dentro do texto.** Quando sai patch, muda-se o número
  num lugar só. Copiar tabela em artigo é exatamente o motivo de as wikis existentes envelhecerem.
- **A tradução é o diferencial, não a apresentação.** Se sobrar tempo, ele vai para o dicionário.
- **Nada que exija servidor.** Site estático, busca gerada no build, e um HTML offline de um arquivo só.

## 4. Requisitos

Cada requisito tem um identificador estável. As tarefas citam esses identificadores.

### R1 — Conteúdo

| ID | Requisito | Estado |
|---|---|---|
| R1.1 | Guias cobrindo 1.0, bases, trabalho, cruzamento, combate, torres, endgame, economia, co-op, controle, armadilhas | Feito, 15 páginas |
| R1.2 | Toda contradição entre páginas resolvida, e divergência de fonte registrada em `fontes.md` | Feito, 12 corrigidas |
| R1.3 | Página com o estado real do save do grupo, servindo de linha de base | Feito, `meu-save.md` |
| R1.4 | Página por base, com coordenada, Pals alocados e gargalo identificado | **Pendente**, hoje é palpite |
| R1.5 | Verificador automático que falha em CI se dado ou conteúdo divergir | Feito, `npm run verificar` |
| R1.6 | **Catálogo completo dos Pals do jogo, importado e não digitado** | Feito, 299 Pals |
| R1.7 | Página gerada por Pal do catálogo, com ficha e ligação para os guias que o citam | Feito, 299 páginas geradas do catálogo (E1) |
| R1.8 | Catálogo de itens, estruturas e tecnologias, importado e exibido em índice filtrável, **sem página por registro** (decisão de 31.07) | Feito. Importado: 1.875 itens, 496 estruturas, 588 tecnologias, com os três índices no ar (E7) |
| R1.9 | Calculadoras universais: bolo, cruzamento e condensação. **A de taxa de captura foi recusada em 01.08**, ver a seção 5 | **Pendente** |

### R2 — Bilíngue

| ID | Requisito | Estado |
|---|---|---|
| R2.1 | Dicionário PT/EN com o nome oficial do jogo, extraído das strings, com origem registrada por termo | Feito, 158 termos |
| R2.2 | Termo do jogo no texto alterna PT/EN sem recarregar a página, sem quem escreve marcar nada | Feito |
| R2.3 | Escolha de idioma persiste entre páginas e é compartilhável por endereço | Feito, `localStorage` mais `?idioma=en` |
| R2.4 | Rótulos da interface (menu, botões, cabeçalho de tabela) também alternam | Feito, inclusive a busca, que traduz a si mesma (A1, A2, A4) |
| R2.5 | Título e descrição das páginas alternam | Feito no menu, na home e na moldura do guia (A3, A5) |
| R2.6 | Campos de texto dos dados (`onde`, `nota` em `pals.json`) alternam | **Adiado**, 118 campos. Só se sobrar tempo |
| R2.7 | O corpo dos guias **não** é traduzido | Decidido. Traduzir 87 mil caracteres cria duas verdades que divergem no primeiro patch |

### R3 — Ferramentas

| ID | Requisito | Estado |
|---|---|---|
| R3.1 | Busca em todo o conteúdo, gerada no build, funcionando sem servidor de busca | Feito, Pagefind |
| R3.2 | Mapa interativo com marcadores próprios, editável por JSON, sem depender da arte do jogo no repositório | Feito, 24 marcadores |
| R3.3 | Banco de Pals filtrável por aptidão e fase | Feito, 299 Pals do catálogo |
| R3.4 | Assistente que responde só com o conteúdo da wiki | Parcial, worker escrito e não publicado |
| R3.5 | Monitor que avisa quando sai patch novo | Feito, `npm run patch:verificar` |
| R3.6 | Versão offline num arquivo só, para mandar no grupo e abrir sem internet | Feito, `npm run offline` |

### R4 — Manutenção

| ID | Requisito | Estado |
|---|---|---|
| R4.1 | Editável pela interface web do GitHub por quem não programa | Feito, `CONTRIBUINDO.md` |
| R4.2 | Deploy automático a cada push | Feito, GitHub Actions |
| R4.3 | Script que reextrai o dicionário quando sai patch | Feito, `npm run termos:atualizar` |
| R4.4 | Dois agentes trabalhando no mesmo repositório sem conflito | Feito, territórios em `CLAUDE.md` |

### R5 — Experiência

Acrescentado depois de comparar as wikis de Palworld que existem. O diagnóstico foi curto: todas
são bancos de dados vestidos de enciclopédia dos anos 2000. Elas erram nas mesmas três coisas, e
cada requisito abaixo ataca uma delas.

**Erro 1: mostram tudo para todos.** Um jogador nível 52 vê a mesma página que um nível 5.
**Erro 2: não calculam nada.** Publicam a receita e deixam a conta para você.
**Erro 3: o dado é morto.** Nome de Pal no meio do parágrafo é texto, não é objeto.

| ID | Requisito | Estado |
|---|---|---|
| R5.1 | **Painel do save como home da seção do nosso mundo.** Nível, torres, Palpédia e Palbox como medidores, mais os gargalos por gravidade. A home do SITE é da wiki (ver 3.0); o painel abre a Camada 2 | Feito, `/painel/` (D2) |
| R5.2 | **Calculadoras que usam o nosso estoque.** A de bolo responde "você faz N bolos e o gargalo é X", não "a receita é 5 farinha" | Protótipo |
| R5.3 | **Ficha do Pal em popover no meio do texto.** Passar o mouse num nome abre aptidões, elementos e se já temos, vindo do mesmo JSON do banco | Feito, com teclado e Esc, no site e no offline (D3) |
| R5.4 | **Banco de Pals filtrável pela aptidão que falta**, ordenado por nível de aptidão, com o que já está no Palbox marcado. Responde o que capturar, não o que existe | Feito (D4) |
| R5.5 | **Aptidão como barra, não como número solto.** Comparação visual entre Pals sem ler tabela | Feito no banco, na ficha e no popover |
| R5.6 | Tema claro e escuro, os dois desenhados, nenhum sendo inversão automática do outro | Feito, com preferência do sistema (D6) |
| R5.7 | Paleta de dados validada para contraste e daltonismo. Nenhuma informação depende só de cor | Feito no protótipo |
| R5.8 | Toda visualização tem alternativa em tabela | Protótipo |

**Não é enfeite, é a tese do produto.** As wikis grandes têm mais conteúdo que a nossa e sempre
terão. A única coisa que elas estruturalmente não podem fazer é saber quem está lendo. Nós sabemos:
são quatro pessoas, um save, um estado conhecido. Toda a interface se apoia nisso.

O protótipo navegável está em `proto/index.html`. Abre com duplo clique.

## 5. Fora de escopo

Escrito explicitamente porque cada item já foi proposto e recusado.

- **Plataforma multi-jogo.** Foi a premissa do PRD anterior. Está descartada.
- **Conta, login, perfil, comentário.** O grupo tem quatro pessoas e um grupo de mensagem.
- **Tradução do corpo dos guias.** Ver R2.7.
- **Aplicativo, PWA, notificação.** O caso de uso é segunda tela com o jogo aberto.
- **Monetização, anúncio, métrica de audiência.** Não há audiência.
- **Backend, banco de dados, conteúdo dinâmico.** A única peça com servidor é o worker do assistente,
  e ele é opcional: sem ele o site funciona inteiro.
- **Calculadora de taxa de captura.** Recusada em 01.08.2026, por três motivos somados. A fórmula
  nativa do 1.0 **não está recuperada publicamente**: o PalMods declara isso e ajusta o modelo dele
  ao comportamento dataminado da 0.7.3. Nenhuma fonte publica a fórmula com citação, e o paldb
  calcula no servidor dele sem expor as constantes. E o jogo **já mostra a probabilidade na mira**,
  o que faria a calculadora ser pior que a tela que o jogador tem na frente. No lugar dela entra uma
  **tabela de poder de captura**, que é dado e não fórmula: poder por esfera, bônus da Efígie de
  Lifmunk por nível, bônus por módulo de esfera e a penalidade de alfa.

## 6. Como saber se deu certo

Sem métrica de produto, porque não há produto. Os testes são estes:

1. Alguém do grupo acha a resposta durante a sessão, sem sair do jogo por mais de vinte segundos.
2. O amigo que joga em inglês consegue usar a mesma página sem tradução mental.
3. Quando sai patch, a atualização leva menos de uma hora, porque o dado está em um lugar só.
4. O Pedro consegue tocar a parte de bolo e cruzamento lendo a wiki, sem perguntar a ninguém.
5. `npm run verificar` passa limpo em todo commit.
6. Alguém de fora do grupo, que caiu aqui pelo Google, acha o que procura sem esbarrar no nosso save.
7. Nenhum número do catálogo foi digitado por uma pessoa.

## 7. Riscos

| Risco | Efeito | O que fazer |
|---|---|---|
| paldb muda de formato ou sai do ar | O dicionário para de atualizar | Os 158 termos já estão versionados em JSON. O script quebra, o dado fica |
| Patch muda tabela de cruzamento | Conteúdo vira mentira em silêncio | `npm run patch:verificar` roda semanal e avisa |
| Duas bases de código divergem | Trabalho perdido no merge | Territórios em `CLAUDE.md`, e a regra de quem vence em `INTEGRACAO.md` |
| O grupo para de jogar | Wiki morre | Aceito. O custo já foi pago e o dicionário sobrevive sozinho |

## 8. Decisões registradas

Decisões tomadas com data, para ninguém reabrir sem motivo novo.

- **30.07** Escopo reduzido de plataforma multi-jogo para projeto do grupo.
- **30.07** Conteúdo puxado das fontes em inglês, que têm mais informação, e exibido em português
  com os nomes oficiais. O inverso deixaria a wiki mais pobre.
- **30.07** Corpo dos guias não será traduzido. Só termo do jogo e interface alternam.
- **30.07** Em conflito com a outra base de código, o código de lá vence e os dados e conteúdo daqui
  vencem.
- **30.07** Duas camadas: wiki completa do jogo, separada na navegação da área do nosso save. A
  ponte entre elas é um interruptor de overlay, não uma fusão.
- **30.07** Número de catálogo é importado, nunca digitado. Opinião é escrita, nunca importada.
- **31.07** O estado do grupo vive em dois níveis: `guilda.json` para o que é compartilhado e um
  `saves/<nome>.json` por pessoa, com data de leitura. Comparação com save de mais de 14 dias é
  escondida e marcada como desatualizada: vazio honesto vale mais que número velho.
- **31.07** O leitor automático de save existe e fica bloqueado até o `palworld-save-tools`
  suportar o formato 1.0 (issue 179). Ele alimenta os JSONs acima; nunca os substitui como formato.
- **31.07** **Só Pal ganha página própria.** Item, estrutura e tecnologia entram como índice
  filtrável, uma página por coleção. O Pal tem curadoria, guias que o citam e ficha rica, e as
  outras três coleções são listas de nome e número. Página por registro somaria 2.959 páginas às
  317, e extrapolando os 13,3s da E1 o build passaria de dois minutos, estourando o limite de um
  minuto que a própria E1 fixou. Três índices entregam mais e custam três páginas.
- **31.07** **A calculadora de bolo é uma só.** D5 e E5 viraram uma tarefa, porque separadas a
  mesma calculadora nasceria duas vezes: uma com o nosso estoque e outra sem.
- **31.07** O pacote offline cobre as duas camadas, guias e catálogo. Medido antes de decidir: as
  299 fichas somam 711 KB de HTML e 95 KB de texto puro, e o arquivo vai de 604 KB para 1,4 MB.
  Custa 800 KB e resolve o caso de uso que motivou o offline, que é consultar um Pal sem internet.
- **31.07** Teto do pacote offline: 8 MB, medido em 31.07.2026. Aos 3151 KB o arquivo tem 33.539
  nós, carrega em 0,9 a 1,6 s com CPU 4x mais lenta e comprime para 353 KB. Inflado a 8,3 MB e
  100 mil nós, a carga vai a 2,2 s e o layout não muda. O teto é em bytes e não em tempo porque a
  variação entre rodadas do mesmo arquivo passou de 60%, o que tornaria instável qualquer asserção
  de tempo no portão. O teto é verificado por `scripts/gerar-offline.mjs`, que aborta com código 1
  ao estourar e imprime a composição por seção em toda execução.
- **01.08** A calculadora de taxa de captura está **cancelada**, e no lugar dela entra uma tabela de
  poder de captura. Motivo na seção 5. A regra que decorre e vale para o resto: **onde não há
  fórmula com fonte, publique o dado, não o palpite.**
- **30.07** O repositório de destino é `nederreis/PalCrew`. Enquanto ele for privado e sem acesso
  liberado, este repositório é a fonte da verdade.
