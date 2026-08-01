---
titulo: "Fontes e incertezas"
descricao: "O que está em disputa entre fontes e de onde veio cada dado."
titulo_en: "Sources and uncertainty"
descricao_en: "What sources disagree on and where each figure came from."
ordem: 15
atualizado: 2026-08-01
---

:::destaque
**Conferência de 30.07.2026: um terço do banco de Pals estava errado.** As aptidões tinham sido
digitadas a partir de guias de terceiros, e guia de terceiro erra. Rodamos `npm run pals:conferir`,
que compara cada Pal com a ficha do paldb, e **26 dos 75 conferidos tinham pelo menos um número
diferente do jogo**.

O pior caso foi o Anubis: estava marcado com Garimpo 3 quando o jogo diz 6. Isso não é detalhe de
tabela, é conselho invertido. Três páginas repetiam que ele "perdeu força em base", quando ele tem
Manual 6 e Garimpo 6 e é dos melhores trabalhadores do jogo. Corrigido.

Outros que estavam errados por dois pontos ou mais: Reptyro (Acender 3, é 5), Frostallion
(Refrigeração 5, é 7), Bushi (Madeira 6, é 3), Blazamut Ryu (Acender 4, é 6), Sekhmet (Garimpo 5,
é 3), Mammorest (Madeira 2, é 4).

A lição está registrada aqui e não no histórico do Git: **dado numérico copiado de guia não é fonte,
é boato.** O script agora roda contra o paldb e a conferência é reproduzível por qualquer um.

**Corrigir o número não corrigiu a conclusão, e isso levou dois dias a mais.** Em 01.08 o
`resumo-1-0.md` ainda usava o Anubis como o exemplo do Pal versátil que perdeu no 1.0, dizendo que
ele "para em 8 mesmo no 4★", enquanto `plano-de-acao.md`, `combate.md` e a curadoria em `pals.json`
diziam o contrário na mesma wiki: Manual 6 e Garimpo 6, um dos melhores de base do jogo. As duas
coisas não podiam ser verdade. O que vale é a regra sobre **condensação**, que rende menos em Pal de
três funções, e não uma sentença sobre o Pal. O endpoint "para em 8 no 4★" saiu junto: a
distribuição por estrela está registrada logo abaixo como não oficial, e a calculadora se recusa a
respondê-la, então publicá-la em prosa era dizer em texto o que o site se recusa a calcular.
:::

## O que ainda está em disputa

| Ponto | Situação |
|---|---|
| **Level cap** | Usei **80**. Sete fontes independentes convergem, incluindo guias práticos. A manchete do GamesRadar diz 85 e é outlier isolado. |
| **Total de Pals** | Usei **287**, que é o texto literal do changelog oficial da Pocketpair no Steam. BisectHosting publicou 259 e está errado. Nenhuma fonte secundária acertou level cap e contagem ao mesmo tempo. |
| **Ganho real do Awakening** | Datamine sugere +50%, testes práticos mostram 7-10%. Sem número oficial. Trate como polimento final. |
| **Taxa base de mutação** | Não publicada. Estimativas da comunidade ficam em 0,7-1%, e cerca de 3% com o cake certo. Ignore sites que citam precisão maior. |
| **Lista de Pals de aura** | As listas publicadas divergem entre si (Mycora/Mikora, Wumpo/Woo, Eikthyrdeer Terra/Aar Dera). Confira o texto da partner skill in-game. |
| **Níveis dos tower bosses 2, 3, 4, 6 e 7** | Reescalados no 1.0, fontes discordam. Marquei faixas. |
| **Formato exato da Arena** | Fontes divergem entre 3v3 e 4v4. A leitura mais consistente é 3 Pals por jogador, sendo 1 main cuja partner skill você ativa. |
| **Estado das Wildlife Sanctuaries** | Patch notes dizem que foram reformuladas. Os guias detalhados ainda descrevem a versão de Early Access. |
| **Distribuição das 48 cópias por estrela** | Não oficial. Confira a UI do Condenser. **Enquanto isso não for conferido no jogo, a calculadora de condensação só responde o total para 4★**, que é o número que tem fonte. |
| **Poder de captura por esfera** | **Resolvido em 01.08.** Vale a coluna do paldb inteira, e a tabela está publicada em Calculadoras. A conferência que produziu a decisão, com os oito pares de números, está na seção abaixo. |
| **Fórmula da taxa de captura** | **Sem fonte utilizável.** O paldb calcula no servidor dele, em `/api/captureRate`, e publica por Pal só o `CaptureRateCorrect`; o multiplicador de cada esfera, o peso da vida restante e o do nível não aparecem em lugar nenhum. A wiki.gg responde 403 para leitura automatizada. O que temos é a transformação de exibição, `TaxaExibida = TaxaReal^1.25` com rolagens 4/9, 3/9 e 2/9, que descreve o número da tela e não permite calculá-lo. **A calculadora de captura fica de fora da E5 até aparecer fonte.** |
| **Tabela de recompensas de raid por tier** | Não existe fonte oficial. Desconfie de listas específicas. |

:::atencao
**Nota metodológica:** boa parte do conteúdo "1.0" indexado hoje é SEO gerado por IA e se contradiz. Fandom wiki e parte do Game8 ainda estão com dados de Early Access (suitability máxima 4, condensação 116). O que está nesta wiki foi cruzado entre o changelog oficial, databases dataminadas (paldb.cc, palworld.gg) e threads de comunidade com replicação independente.

:::

## Poder de captura: não era empate entre fontes, era fonte velha

Registrado em **01.08.2026**. A calculadora de taxa de captura foi recusada (ver a seção 5 do
`PRD.md`) e no lugar dela entra uma tabela de poder de captura, que é dado e não fórmula.

O poder de captura deixou de ser número colado e passou a ser **dado importado**: o paldb publica
"Capture Power" como atributo do item, e o importador o traz da página de categoria das esferas,
junto com os outros atributos numéricos. Onze esferas, uma requisição.

A dúvida inicial era um empate entre duas fontes que davam números diferentes. **Não é empate**, e
a decisão de 01.08 é que **vale a coluna do paldb inteira**. Os oito pares abaixo ficam registrados
para a conclusão poder ser reconferida sem refazer a pesquisa.

| Esfera | paldb, importado | palworld.wiki.gg | diferença |
|---|---|---|---|
| Pal Sphere | 7 | 7 | 0 |
| Mega Sphere | 14 | 14 | 0 |
| Giga Sphere | 20 | 20 | 0 |
| Hyper Sphere | **27** | 26 | +1 |
| Ultra Sphere | **33** | 32 | +1 |
| Legendary Sphere | **38** | 37 | +1 |
| Ultimate Sphere | **44** | 43 | +1 |
| Exotic Sphere | **50** | 48 | +2 |
| Sol Sphere | 58 | não lista | sem par |
| Ancient Sphere | 64 | não lista | sem par |
| Radar Sphere | 20 | não lista | sem par |

**A diferença cresce com o tier, e é isso que decide.** Ela é zero nas três esferas antigas, um
ponto nas quatro do meio e dois na Exotic. Erro de transcrição não tem gradiente: ele é aleatório ou
constante. Diferença que sobe junto com o tier é a forma de um **rebalanceamento de patch**, em que
o topo da curva foi mexido mais que a base. Isso reforça a leitura de que o paldb reflete o 1.0
enquanto a página da wiki.gg é anterior, e é por isso que a coluna do paldb vale onde as duas
divergem.

Os outros dois indícios apontam para o mesmo lado. A wiki.gg **não lista Sol, Ancient nem Radar**, e
a página dela se refere ao Feybreak, anterior ao 1.0. O paldb dá 58 para a Sol, o mesmo do
`palmods.gg`. É fonte parada no tempo contra a fonte que este repositório já usa para o catálogo
inteiro.

:::atencao
**Correção do que estava escrito aqui antes.** A versão anterior desta seção dizia que a wiki.gg não
lista a Exotic e tratava a divergência como um ponto uniforme. **As duas coisas estavam erradas**: a
wiki.gg lista a Exotic com 48, nas páginas Capture Power e Spheres, e a diferença não é uniforme.
Ela é 0 em Pal, Mega e Giga, +1 em Hyper, Ultra, Legendary e Ultimate, e +2 em Exotic. O erro não
mudou a conclusão, mas mudava o argumento: "um ponto em tudo que o 1.0 mexeu" é coincidência
suspeita, e "a diferença cresce com o tier" é padrão.
:::

:::nota
**A Radar Sphere fica fora da lista principal da tabela.** Ela tem poder de captura 20, o mesmo da
Giga, e nenhuma linha de `tecnologias.json` a desbloqueia: é a única das onze sem nível de
tecnologia, ou seja, não é esfera da progressão. Listada junto, ela sugeriria uma equivalência com a
Giga que não existe. O número continua publicado logo abaixo da tabela, com esse motivo à vista, em
vez de sumir.
:::

:::nota
**O que fica de fora da tabela, e por quê.** O bônus da Efígie de Lifmunk por nível, o bônus do
módulo de esfera e a penalidade de alfa **não são publicados pelo paldb** como atributo. Sem fonte,
não entram: linha vazia numa tabela é convite para alguém preencher de cabeça depois.
:::

**O gatilho que vigia esses números mudou de referência em 01.08.** Ele comparava o importado com a
wiki.gg, que esta mesma seção acabou de declarar desatualizada, então falharia para sempre por
motivo já resolvido, e gatilho que acusa o que já foi decidido é gatilho que alguém desliga. Os onze
valores foram congelados em `src/data/poder-captura.json`, e o verificador compara **importação nova
contra referência conferida**, dizendo qual esfera mudou e de quanto. Esfera que sumir da importação
ou aparecer sem estar na referência também quebra: linha entrando ou saindo da tabela do site sem
ninguém olhar é o defeito que este projeto mais repete.

## A receita do Anubis era de antes do 1.0, e a importação perdia linha

Registrado em **01.08.2026**. A wiki dizia em três lugares que Anubis sai de **Vanwyrm com
Azurobe**, e a calculadora respondia **Slowatt** para esse par. A calculadora estava certa: Vanwyrm
é rank 1650, Azurobe é 1830, a média dá 1740, e Anubis é 480. O par é receita de **Early Access**, e
a própria `breeding.md` avisa que os 215 Pals antigos tiveram o rank de cruzamento alterado no 1.0.
Corrigido para **Gildane com Ophydia**, que é o par cuja média cai exatamente em 480.

Vale saber que **239 pares chegam no Anubis**, então não existe "a" receita: existe uma lista, e ela
está na calculadora. O texto cita um par para dar um ponto de partida, não para ser exaustivo.

**O aceite mandava começar pela importação e estava certo, porque ela perdia linha mesmo.** Dois
defeitos, os dois em silêncio:

1. O recorte da tabela de combinações únicas ia **até o fim do documento** em vez de parar no
   fechamento da tabela. A prosa de "How Breeding Works" que vem depois tem exemplo com link de Pal,
   e o parser lia aquilo como linha: 178 "linhas" para uma tabela que tem 165.
2. O regex só tolerava `<img>` entre o link e o nome. Pal marcado como **alfa** traz um `<span>`
   antes da imagem, e a linha inteira era descartada. Relaxaurus Lux e Mossanda Lux perdiam a
   própria linha de espécie por causa disso.

Com os dois corrigidos são **164 combinações únicas** e **116 espécies que só nascem de par
específico**, e o 116 agora bate com o que esta página já afirmava. O importador passou a **abortar**
quando uma linha tem Pal dentro e não rende os três nomes, porque perder linha aqui faz a calculadora
responder outro filhote sem avisar ninguém.

Nenhum dos dois defeitos explicava o Anubis: ele **não está** na tabela de únicas do paldb, nem
antes nem depois. Eram dois problemas diferentes na mesma queixa.

O verificador agora passa toda receita escrita na curadoria pela **mesma função** que a página usa, e
texto que discorda da conta vira erro. Hoje isso cobre um par, que é quanto a curadoria tem escrito.

## Mapa: a projeção está provada, os nossos 24 marcadores é que não

Registrado em **01.08.2026**, ao importar os 13.755 marcadores do paldb.

A conversão de coordenada de mundo para coordenada de tela foi conferida **contra a própria fonte**,
não contra nós. O paldb publica dois sistemas no mesmo pacote: `fixedDungeon` em coordenada de mundo
e `regionData` mais `extrasIngame` já em coordenada de tela. Convertendo os 13.755 e medindo a
distância de cada um dos 121 pontos de tela ao ponto convertido mais próximo, **14 ficam abaixo de 1
unidade** e a mediana fica em 4,5. São objetos diferentes ocupando o mesmo lugar, como um crítico de
Pal em cima de um ponto de viagem rápida, e com espaçamento médio de 25 unidades entre pontos essa
concordância não acontece por acaso.

A aferição contra os **24 marcadores do `mapa.json`** era para ser a prova de campo e virou outra
coisa. Dos 10 pares que casam por nome:

| Ponto | Nosso | paldb convertido | Desvio |
|---|---|---|---|
| Bjorn e Bastigor | -1294, -1669 | -1294, -1669 | 0 |
| Zoe e Grizzbolt | 112, -434 | 111, -431 | 3 |
| Zona de Caça Proibida III | 665, 645 | 663, 634 | 11 |
| Zona de Caça Proibida II | -662, -116 | -676, -111 | 15 |
| Victor e Shadowbeak | -103, 523 | -148, 447 | 88 |
| Axel e Orserk | -691, -518 | -588, -518 | 103 |
| Mercador clandestino | 34, -421 | 136, -359 | 119 |
| Lily e Lyleen | -180, -598 | 36, -311 | 359 |
| Zona de Caça Proibida I | 95, -730 | -344, 270 | 1092 |
| Marcus e Faleris | -523, 493 | 556, 335 | 1091 |

**Não há desvio sistemático.** Os sinais se alternam nos dois eixos, e dois pares batem quase na
casa decimal enquanto outros erram por mil. Desvio de fórmula ou de limite seria constante e na
mesma direção, e faria os dez errarem junto. O que este quadro descreve é ruído, e ruído desse
tamanho vem do lado que foi estimado: a tarefa B1 já registra que o `mapa.json` tem **coordenada
estimada** e espera as telas de cada base.

Então o papel dos 24 se inverteu. Eles não aferem o paldb: **eles são a lista de trabalho da B1**, e
os quatro piores (Marcus e Faleris, Zona I, Lily e Lyleen, mercador) são por onde começar. O par
Marcus e Faleris tem cara de sinal trocado em x, de -523 para +556.

**Confirmado em 01.08, e virou armadilha.** A substituição pelas coordenadas importadas levou o
Marcus e Faleris de `-523` para `+556`: era sinal trocado mesmo. Coordenada digitada com o sinal
errado **não parece errada**. Ela cai dentro do mapa, tem a ordem de grandeza certa, e o marcador
aparece num lugar plausível: só está do outro lado. Foi por isso que esse erro sobreviveu a todas as
revisões de conteúdo até alguém comparar contra uma fonte independente. Onze dos vinte marcadores
não-base foram substituídos pelo importado; os nove que sobraram são nome nosso, de região ou
genérico, sem par no paldb, e continuam esperando a leitura na tela.

:::atencao
**O que ainda não está provado.** A conferência acima mostra que a conversão reproduz a coordenada
de tela **do paldb**, não que a coordenada de tela do paldb é a que o jogo mostra. As duas coisas
seriam iguais se o paldb estiver certo, e ele acerta o resto do catálogo, mas isso é inferência e
não medição. Fecha com três pontos de viagem rápida lidos na tela do jogo.
:::

## O "149 de 149" não é reproduzível, e por isso a receita do Anubis saiu

Registrado em **01.08.2026**, tentando reconciliar dois números que deveriam ser o mesmo: a seção
abaixo diz que a regra foi validada contra **149 combinações que o paldb publica para o Anubis**, e a
calculadora hoje gera **239 pares** para o mesmo alvo.

**A reconciliação não foi possível, porque o lado dos 149 não existe mais para ser aberto.** O que
foi tentado, tudo em 01.08: `paldb.cc/en/Anubis` foi baixada inteira, 87 KB, e **não traz lista de
combinação nenhuma**, só um link de navegação para a calculadora deles; `js/breeding_data_en.js`,
`js/breed_en.js`, `en/Breeding_Calculator` e `api/breeding` respondem **404**; e os 149 pares não
estão gravados em lugar nenhum deste repositório.

Então nem (a) nem (b) podem ser afirmadas. Não dá para dizer se a lista do paldb era filtrada por um
critério que não modelamos, nem se a nossa regra gera pares a mais, porque **a referência sumiu**. O
que está estabelecido é pior que qualquer das duas: **a validação "148 de 148" repousa numa fonte que
ninguém consegue reabrir**, e isso vale para a regra de cruzamento inteira, não só para o Anubis.

**Consequência imediata, aplicada aqui.** O par "Gildane com Ophydia", escrito em três páginas em
01.08, saiu delas. Ele nunca teve fonte independente: foi eleito pela nossa própria conta, entre 239
candidatos que a nossa própria regra gerou. Isso é exatamente o que a receita de Early Access era,
número sem procedência, só que com a nossa cara em vez da de um guia velho. As três páginas voltaram
a dizer que existe uma lista e que ela está na calculadora, que é o que se pode afirmar.

A checagem de receita do verificador deixou de conferir par nenhum por consequência, porque não há
mais par escrito na curadoria. Ela continua no lugar para a primeira receita que voltar a aparecer.

## A regra de cruzamento, conferida em 01.08.2026

O guia dizia "sai a espécie de rank mais próximo", e isso está **incompleto**. Conferindo contra as
149 combinações que o paldb publica para o Anubis, a regra do rank mais próximo sozinha acerta
**60 de 148**. Faltavam duas partes, e as duas saíram do dado, não de palpite:

1. **Empate vai para o rank maior.** Os CombiRanks são múltiplos de 10, então metade das médias cai
   exatamente no meio de dois Pals. Nesses casos o jogo escolhe o de rank MAIOR, que é o mais fraco.
   Exemplo conferido: Anubis (480) com Teafant (3070) dá média 1775, entre Hoodle (1770) e Snock
   (1780), e o resultado é **Snock**.
2. **Filho de combinação única não entra no sorteio.** Das 299 espécies, **116 só nascem de
   combinação específica** e nunca aparecem como resultado de média. Incluí-las no pool faz a conta
   devolver Elphidran Aqua, Dumud Gild e outros onde o jogo devolve outra coisa.

Com as duas correções, a regra acerta **148 de 148**. As três fontes de dado são tabelas do paldb,
a mesma origem do catálogo: `CombiRank` das 299 espécies, as **162 combinações únicas** e o
resultado que o próprio paldb calcula por par.

| Fonte | Onde |
|---|---|
| CombiRank e combinações únicas | [paldb.cc/en/Breeding_Farm](https://paldb.cc/en/Breeding_Farm), abas *Breed Combi* e *Breed Unique* |
| Resultado por par, para conferir | `paldb.cc/en/api/pal_breed_2a?parent2a=<Pal>`, usado pela [calculadora deles](https://paldb.cc/en/Breed) |

## Fontes principais

### Oficial e patch notes

- [Changelog oficial 1.0 (Steam, Pocketpair)](https://steamcommunity.com/ogg/1623730/announcements/detail/686383649529010624)
- [SteamDB, histórico de patches](https://steamdb.info/app/1623730/patchnotes/)
- [paldb.cc, patch notes v1.0.0](https://paldb.cc/en/v1.0.0) e [passivas](https://paldb.cc/en/Passive_Skills)
- [BisectHosting, breakdown do 1.0](https://www.bisecthosting.com/blog/palworld-1-0-patch-notes-update-new-pals-locations-changes-sunreach-world-tree)
- [VGC, 9 maiores mudanças](https://www.videogameschronicle.com/guide/palworld-1-0-patch-notes-9-biggest-changes/)
- [Dot Esports, patch notes](https://dotesports.com/palworld/guides/palworld-1-0-patch-notes)
- [The Big Lead, patch notes 1.0.2](https://www.thebiglead.com/palworld-v1-0-2-patch-notes/)

### Base, breeding e economia

- [Nodecraft, Work Suitability nível 10](https://nodecraft.com/support/games/palworld/general/palworld-work-suitability-level-10-explained)
- [PC Gamer, melhores Pals de base no 1.0](https://www.pcgamer.com/games/survival-crafting/palworld-best-pals/)
- [palworld.gg, partner skills](https://palworld.gg/partner-skills)
- [wiki.gg, breeding](https://palworld.wiki.gg/wiki/Breeding)
- [Pal Calc](https://github.com/tylercamp/palcalc)
- [KeenGamer, farm de ouro](https://www.keengamer.com/articles/guides/palworld-1-0-best-gold-farm-locations-and-methods/)
- [GamingBolt, Soralite e Paloxite](https://gamingbolt.com/palworld-1-0-guide-where-and-how-to-farm-the-2-new-ores-soralite-and-paloxite)
- [Nerdschalk, Applied Handbooks](https://nerdschalk.com/get-applied-handbooks-palworld/)

### Combate e endgame

- [KeenGamer, tower bosses em ordem](https://www.keengamer.com/articles/guides/palworld-1-0-all-tower-bosses-in-order-and-how-to-beat-them/)
- [KeenGamer, melhores passivas](https://www.keengamer.com/articles/guides/palworld-1-0-best-passive-skills-for-combat-mounts-and-base-pals/)
- [VGC, como entrar no World Tree](https://www.videogameschronicle.com/guide/palworld-10-enter-world-tree/)
- [NextTier, Sunreach](https://nexttier.pro/guide/palworld-sunreach)
- [AllThings.how, Radiant Gems](https://allthings.how/palworld-1-0-how-to-farm-every-radiant-gem-in-the-world-tree/)
- [AllThings.how, legendary schematics](https://allthings.how/palworld-1-0-7-best-legendary-schematics-and-how-to-get-them/)
- [GameRant, Wing Pack](https://gamerant.com/palworld-how-unlock-get-use-wing-pack/)
- [BisectHosting, Arena](https://www.bisecthosting.com/blog/palworld-arena-guide-best-pals-tips-tricks-location-game-modes-merchant)

### Comunidade

- [r/Palworld](https://www.reddit.com/r/Palworld/), threads de julho de 2026 sobre regra da sela, Surgery Table, escala de suitability, farm de Holy Water, bugs de servidor e migração de save
- [Conversor de save co-op para dedicado](https://hub.tcno.co/games/palworld/converter/)
- Steam Community, app 1623730

Wiki compilada em 30.07.2026 para save mid game (25-50) em co-op. Versão do jogo coberta: 1.0.2, build 1.100.933.
 Peça atualização quando sair um patch novo e eu reviso a página inteira em cima do changelog.
