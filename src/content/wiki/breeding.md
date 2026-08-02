---
titulo: "Cruzamentos e mutação"
descricao: "Herança de passivas, bolos, mutação e a cadeia de produção de Pals."
titulo_en: "Breeding and mutation"
descricao_en: "Passive inheritance, cakes, mutation and the Pal production chain."
ordem: 6
atualizado: 2026-08-02
---

:::cuidado
**Toda calculadora pré-1.0 dá resposta errada.** Os 215 Pals antigos tiveram rank de breeding alterado e o Paldeck foi renumerado (Anubis é #139, Jetragon #202). Além disso, cinco Pals das torres originais (Faleris, Shadowbeak, Grizzbolt, Orserk, Lyleen) perderam as receitas e agora só nascem de mesma espécie, como lendários. Não dá mais para chegar em Pals de suitability máxima cruzando Pals de início de jogo.

:::

## Regras que continuam valendo

- **Espécie do filhote:** média dos breeding ranks dos pais. `Filho = ⌊(A + B + 1)/2⌋`, e sai a espécie de rank mais próximo. Mesma dupla sempre dá a mesma espécie.
- **Máximo de 4 passivas.** O filhote herda de 0 a 4 do pool combinado dos 8 slots dos pais. **Slot vazio é preenchido com passiva aleatória**, ou seja, se sobrar espaço o jogo enche de lixo. Por isso os dois pais precisam ter exatamente as 4 boas.
- **Taxas medidas em 100 ovos:** ~24% herda do macho, ~20% da fêmea, ~21% mistura, ~34% não herda nada. Quando os dois pais têm a mesma passiva, ela passa em ~46% dos casos.
- **IVs** (HP, Attack, Defense) são rolls ocultos de 0 a 100, valendo até +30% de stat. Pelo menos um é sempre herdado de um dos pais.

## Mutação, o sistema novo

:::dica
**Ovo mutado tem brilho roxo** e eclode uma espécie diferente e superior à esperada, já com estrelas de condensação e uma de cinco passivas exclusivas que não existem de nenhuma outra forma.

- **Taxa base**: ~0,7 a 1% (a Pocketpair não publicou o número oficial, desconfie de sites com precisão exagerada)
- **Com Bolo de Verduras Extravagante (Extravagant Vegetable Cake)**: ~3%
- **Herdável**: Sim. Pal mutado transmite a passiva mutada aos filhos, então o difícil é só o primeiro exemplar.
- **Escala**: Reprodutor da Civilização Antiga (Ancient Hatchery) produz ovos em segundos. O ganho vem de volume, não de taxa.
:::

### As cinco passivas exclusivas de mutação

| Passiva | Efeito | Valor |
|---|---|---|
| **Imortalidade (Immortality)** | Life steal +5%, regeneração automática de HP +100%, Attack +15%. Sem downside. | [MELHOR DO JOGO] |
| **Heavily Armored** | Imunidade total a dano de explosão, inclusive auto-explosão. | [Nicho forte] |
| **Idiosyncratic** | Regeneração, boost de defesa, imunidade a status. | [Bom] |
| **Skymarcher** | +2 pulos extras montado. | [Mobilidade] |
| **Babá (Babysitter)** | +30% produção de ovo e +30% velocidade de incubação. | [Breeding] |

:::nota
**Três destas ficam em inglês porque não temos o nome oficial em português.** Heavily Armored,
Idiosyncratic e Skymarcher não estão no dicionário do site, e o dicionário só recebe nome extraído
das strings do jogo. Traduzir de cabeça aqui criaria um nome que não existe na sua tela, que é o
defeito que este site foi feito para não ter. Quando a extração alcançar essas três, elas passam a
alternar sozinhas, sem ninguém mexer nesta tabela.

:::

## Os bolos do 1.0

| Bolo (Cake) | Efeito | Quando usar |
|---|---|---|
| Bolo normal (Cake) | baseline, 1 ovo | nunca, se você tem os outros |
| **Bolo Especial (Special Cake)** | aumenta herança de múltiplas passivas | linha de consolidação de passivas |
| **Bolo de Verduras (Vegetable Cake)** | 2 ovos por ciclo | volume bruto de rolls |
| **Bolo de Cogumelos (Mushroom Cake)** | chance de IVs/stats altos | refino final de IV |
| **Bolo de Verduras Extravagante** | aumenta mutação e stat growth | caça a mutação |

:::destaque
**Rode duas linhas separadas.** Linha A com Bolo Especial para consolidar as 4 passivas limpas. Linha B com Bolo de Verduras Extravagante (Extravagant Vegetable Cake) caçando mutação. Nunca arrisque seu par de pais perfeito em rolls de mutação.

:::

## Melhores passivas

### Trabalho

| Passiva | Efeito |
|---|---|
| **Artisan** | +50% Work Speed. A melhor, disparado. |
| Dedicado (Serious) | +20% Work Speed |
| Ranch Master | +2 Aptidão para trabalho (Work Suitability) |
| Jovem Pecuarista (Farmhand) | +1 Aptidão para trabalho |
| Da sorte (Lucky) | +15% atk/def, +20% work speed. Serve nos dois lados. |
| [EVITE] Clumsy, Tendência ao ócio (Slacker), Tendência suicida (Destructive) (danificam a base), Brutamontes (Musclehead) (-50% work speed) | |

### Combate

Vários guias ainda listam o pool antigo (Brutamontes, Ferocious, Burly Body). O pool foi reorganizado. Os nomes de topo hoje:

| Rank | Passiva | Efeito |
|---|---|---|
| 5 | Twin-Edged Holy Blade | Attack +50%, **Defense -30%** |
| 5 | God of Destruction | Attack +40%, Defense +20%, **HP máximo -50%** |
| 5 | Sanctified Meat Shield | Defense +50%, Attack -30% |
| 4 | **Deus Inclemente (Demon God)** | Attack +30%, Defense +5%. Melhor passiva flat de ataque. |
| 4 | **Lendário (Legend)** | Attack +20%, Defense +20%, Speed +20%. Zero downside. Só vem de Alpha lendário. |
| 4 | **Corpo de Diamante (Diamond Body)** | Defense +30%, imune a flinch e knockback. Anti-stunlock, chave no PvP. |
| 4 | Vampiric | Absorve dano para curar |
| 4 | Siren of the Void / Eternal Flame / Invader / Lunker | +30% em dois elementos específicos |
| 3 | **Sossegado (Serenity)** | Cooldown de active skill -30%, Attack +10%. Enorme com torres de 5 min. |
| 3 | Celestial Emperor, Flame Emperor, Lord of the Sea, Lord of Lightning, Divine Dragon | +30% no elemento correspondente |

### Builds de 4 slots

:::nota
**Balanceada (default, ideal em co-op):** Imortalidade + Deus Inclemente + Sossegado + Lendário (Legend). Dá cerca de +75% attack, +25% defense, +20% speed, -30% cooldown e sustain.

:::

:::nota
**Burst de boss (glass cannon):** Twin-Edged Holy Blade + God of Destruction + Deus Inclemente + Serenity. Só se o Pal não estiver tomando dano.

:::

:::nota
**Tank de raid:** Immortality + Corpo de Diamante + Lendário + Sossegado.

:::

:::nota
**Montaria:** Vertiginoso (Swift) + Bom corredor (Runner) + Ligeiro (Nimble) + Lendário, teto de +80% de velocidade. No 1.0 existe também Dimensional Leap (+50% move speed com penalidade de fome).

Stacking é **aditivo** para o mesmo stat: Demon God (+30%) com Imortalidade (+15%) dá +45% de attack.

:::

## Mesa de Operação de Pals, o atalho que muda tudo

:::dica
**Nível 38.** Já vem com passivas embutidas de graça (Work Slave, Dedicado (Serious), Viciado no trabalho (Workaholic), Insomnia) e permite substituir as três outras passivas por cerca de 70k de ouro. Passivas implantadas são **hereditárias**, então passam para os filhotes.

Efeito prático: você só precisa *criar* uma passiva por breeding e implanta o resto. Isso corta metade da cadeia clássica para Pals de base. Vendedores de bounty e da arena vendem implantes **permanentes e reutilizáveis** (Espírito artesão (Artisan)). Chips arco-íris descartáveis vêm das torres de hacking das ilhas flutuantes.

:::

## Cadeia recomendada

1. **Fase 0:** automatize o cake. Sem isso nada escala.
1. **Fase 1:** junte doadores com Espírito artesão, Dedicado, Da sorte, Lendário. Espécie não importa.
1. **Fase 2:** consolide 4 passivas num Pal carrier qualquer com Bolo Especial. É aqui que o tempo vai.
1. **Fase 3:** faça dois carriers de 4 passivas, macho e fêmea. Este é o par-mãe do servidor.
1. **Fase 4:** injete a espécie alvo cruzando carrier com a espécie desejada.
1. **Fase 5:** condense até 2-4★ e aplique Applied Handbooks para chegar em 10.
1. **Fase 6:** só então Awakening.

**Ordem de prioridade para guild mid game:** 1 Trabalho manual (Handiwork) com Artisan, depois 2 Mining, 1 Acender fogo (Kindling), 1 Rega (Watering), e só então combate.

**Ferramenta:** [Pal Calc](https://github.com/tylercamp/palcalc) lê seu save e resolve a árvore ótima com os Pals que você realmente tem, considerando IVs e probabilidades. Confirme que a versão está atualizada para os ranks do 1.0 antes de confiar.

## Detalhe técnico: a UI de captura mente

:::nota
Datamine confirmado pela comunidade: `TaxaExibida = TaxaReal^1.25`. A captura é dividida em três rolagens sequenciais com expoentes 4/9, 3/9 e 2/9. É por isso que capturas "impossíveis" de 0,3% acontecem com frequência. Vale insistir em esferas em Pals difíceis.

:::
