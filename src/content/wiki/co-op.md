---
titulo: "Co-op e servidor"
descricao: "O que compartilha, limites do mundo por convite e configurações."
ordem: 11
atualizado: 2026-07-30
---

## O que compartilha e o que não

### Compartilha (via guild)

- Bases e tudo construído nelas
- Baús e armazenamento da guild
- Localização dos membros no mapa
- Reviver aliados

### Não compartilha

- Inventário pessoal
- Pals do seu time e da sua Caixa de Pal (Palbox)
- XP e nível de jogador

:::cuidado
**O sistema de guild é tudo ou nada, e isso é a reclamação estrutural mais forte do 1.0 em co-op.** Se você sai da guild para ter progressão separada de um amigo mais atrasado, perde a visão dele no mapa e perde a capacidade de revivê-lo. E as bases dele passam a contar no limite de bases da guild. O pedido unânime da comunidade é um sistema de aliança que ainda não existe.

**Workaround:** subam os limites de base, Pals e construção nas configurações do mundo. A comunidade sugere 10 bases e 30+ Pals por base.

:::

## Limites e workarounds

| Item | Padrão | Observação |
|---|---|---|
| Co-op por código de convite | 4 jogadores | O mundo só existe enquanto o host está com o jogo aberto |
| Servidor dedicado | até 32 | Voice chat in-game é opcional e ativável nas configs |
| Bases da guild | 3-4 | Ajustável até 10 nas World Settings |
| Workers por base | 15 | Ajustável até 50 |

:::nota
**Passar do limite de 4 no co-op por convite** (testado com 5, confirmado por vários): copie `WorldOption.sav` de `AppData\Local\Pal\Saved\SaveGames\`, edite em saveeditonline.com via "Edit Raw JSON", altere `CoopPlayerMaxNum` e substitua o arquivo. A UI continua mostrando 4, mas funciona.

**Migração co-op para dedicado:** existe ferramenta web gratuita que roda localmente no browser (os saves não saem do PC), com transferência de personagem individual entre saves: [hub.tcno.co/games/palworld/converter](https://hub.tcno.co/games/palworld/converter/)

:::

## Não funciona em multiplayer

- **Viewing Cage** (a gaiola de exposição que não gasta slot de Pal). Só single player.
- Transferência automática de Pals entre servidores oficiais não existe. O Global Palbox move Pals entre mundos seus, mas não sincroniza entre servidores de terceiros.

## Pal trazido de outro mundo é pior?

Não. Um Pal transferido é **mecanicamente idêntico** a um capturado no mundo atual. O jogo guarda
espécie, nível, talentos, passivas, condensação e alma dentro da própria entidade do Pal, e não
existe nenhum campo de origem que entre em cálculo de dano, de trabalho ou de captura. Um Anubis
trazido e um Anubis nascido aqui, com o mesmo nível e as mesmas passivas, batem igual.

Trocar Pals trazidos por Pals locais é escolha legítima, e melhora o clima da run. Só não vale
fingir que é otimização, porque não é. E tem um custo real que é fácil de subestimar:

:::cuidado
**O custo da troca é nível, não estatística.** Aposentar um Pal de nível 47 por um recém-capturado
de nível 20 devolve horas de progresso. Se a ideia é trocar por Pals do mundo atual, capture em
lugar onde o spawn já nasça alto. A Zona de Caça Proibida III é o exemplo óbvio: spawns entre 45 e
50 sem precisar enfrentar chefe.
:::

## Save de Early Access ou começar do zero

:::destaque
**Consenso: começar novo.** As zonas iniciais, a tabela de breeding, a escala de suitability e a progressão mudaram tanto que save antigo entrega experiência remendada. Mas com nuances:

- Use o **Global Palbox** para trazer os Pals em que você investiu. Regra caseira popular: só usar o Pal trazido depois de capturar um daquela espécie no mundo novo.
- **Itens hoardados não valem a pena preservar.** Relato detalhado: cerca de 60 dias in-game para voltar ao mesmo tier tecnológico, e a base nova ficou *mais* produtiva por causa dos implantes da Mesa de Operação de Pals (Surgery Table) e dos livros mais fáceis.
- Esquemas lendários antigos ficaram em grande parte obsoletos ao chegar na Árvore Mundial (World Tree).
- Em servidor dedicado mundos existentes migram, mas **o progresso de missões principais e secundárias é resetado**. Bases, Pals e linhagens permanecem.
- Minoria discorda: "sabendo o que fazer você volta ao ponto anterior em 2-3 dias".

:::

## Bugs específicos de servidor

:::cuidado
**Vazamento de memória em servidor dedicado, confirmado por logs.** O servidor sobe de ~8GB para **70GB em cerca de 4 minutos** com 7 jogadores online, até o OOM killer matar o processo. Reinício devolve para 2GB.
 *Workaround:* reinícios agendados a cada 4h e aumentar o tickrate.

**Dessincronia:** Pals atravessando o chão, bosses atravessando a arena, jogador pegando fogo ou congelando espontaneamente, interação de baú demorando 10 segundos. Nem todo dono de servidor vê isso, a divergência parece ligada a host e config. O 1.0.1 corrigiu o caso de queimadura persistente.

**Proteção contra frio não funciona após logout** com `bExistPlayerAfterLogout` ativo, e jogadores morrem congelados.

**Apague os mods de Early Access** antes de atualizar. Arquivos residuais podem corromper o save.

:::
