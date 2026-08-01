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
