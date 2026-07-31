---
titulo: "Fontes e incertezas"
descricao: "O que está em disputa entre fontes e de onde veio cada dado."
ordem: 15
atualizado: 2026-07-30
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
| **Distribuição das 48 cópias por estrela** | Não oficial. Confira a UI do Condenser. |
| **Tabela de recompensas de raid por tier** | Não existe fonte oficial. Desconfie de listas específicas. |

:::atencao
**Nota metodológica:** boa parte do conteúdo "1.0" indexado hoje é SEO gerado por IA e se contradiz. Fandom wiki e parte do Game8 ainda estão com dados de Early Access (suitability máxima 4, condensação 116). O que está nesta wiki foi cruzado entre o changelog oficial, databases dataminadas (paldb.cc, palworld.gg) e threads de comunidade com replicação independente.

:::

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
