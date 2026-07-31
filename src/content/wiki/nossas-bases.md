---
titulo: "Nossas 4 bases"
descricao: "Blueprint por base, roster nominal e ordem de desbloqueio."
ordem: 4
atualizado: 2026-07-30
---

A arquitetura de quatro bases que vocês montaram está certa. O problema não é quantas bases, é que três das quatro provavelmente estão perdendo produção por motivos que não aparecem na tela. Abaixo o diagnóstico e o redesenho, base por base.

## As 5 correções de maior impacto, antes de qualquer coisa

:::cuidado
**1. Baú de Guilda (Guild Chest), Tech 41. Prioridade absoluta.** É a única forma de compartilhar itens entre bases no jogo. Coloque um em cada base e o conteúdo é o mesmo inventário, sincronizado na hora. Custa 50 Refined Ingot, 100 Fragmento de Palúdio (Paldium Fragment) e 10 Peça da Civilização Antiga (Ancient Civilization Parts), tem 54 slots, e os Pals depositam direto nele. Sem isso, sua base de metal produz para um baú que a base principal não enxerga, e vocês viram mula. Com ele, a fazenda joga cake no baú e a base de cruzamentos consome do mesmo baú sem ninguém viajar.

:::

:::cuidado
**2. Cap de 3 Pals por Assembly Line, 1 por Workbench, 4 por Ranch.** O quarto Pal numa assembly line rende **zero**. Se a base principal de vocês tem 12 Pals de Trabalho manual (Handiwork) empilhados, boa parte está parada. O número real é 4 a 5 de Handiwork para cobrir uma Fábrica de Linha (Production Assembly Line), uma Weapon/Sphere Line e um workbench.

:::

:::cuidado
**3. Um Ranch cabe 4 Pals, e o cake precisa de 5 ingredientes.** Matematicamente impossível sustentar breeding contínuo com um ranch só. Vocês precisam de **2 ranches**, e 3 quando forem caçar mutação.

:::

:::cuidado
**4. Garimpo de Metais (Ore Mining Site) (Tech 24) e Pure Quartz Mine (Tech 50) existem.** A partir daí a base não precisa mais morar em cima dos nodes: ela gera minério sozinha. Isso libera vocês para escolher local por terreno plano e defesa, não por densidade de node.

:::

:::cuidado
**5. Pal precisa de Mining nível 3 para quebrar Quartzo Puro (Pure Quartz).** Nível 2 quebra minério comum, nível 1 só quebra pedra e paldium. Se a base de quartz de vocês parece travada, é quase certo que é isso. Confira antes de culpar pathfinding.

:::

## Base 1 · Principal e crafting

:::destaque
**Missão:** transformar ingot em item. Nada de mineração aqui, nada de comida além do Feed Box.

:::

### Estruturas

- **Fábrica de Linha II** (Tech 42, 400 energia/s) e **Forno Elétrico (Electric Furnace)** (Tech 44, 500/s). Esses dois são o salto real da sua fase: o Forno Elétrico tira o Kindling do babysitting constante.
- **Power Generator** (Tech 26, buffer de 250.000) ou **Gerador Elétrico Grande (Large Power Generator)** (Tech 50, buffer de 1.000.000, 2 Pals). Uma linha II mais um Forno Elétrico já pede 900/s: dimensione antes de plantar as estações.
- **Capacitor (Accumulator)** (Tech 37) para amortecer picos.
- **Clínica (Clinic)** (Tech 24, custa só 10 Wooden Board, 20 Cloth, 15 Nails). Barato demais para não ter.
- **Mesa de Operação de Pals (Surgery Table)** (38), **Mesa de Projetos (Drafting Table)** (45), **Baú de Guilda** (41).
- **Baú em cada transição da cadeia:** minério para forno, ingot para assembly line. Sem isso o transportador vira elo único e trava tudo.
- 1 cama por Pal (eles não compartilham), Ração (Feed Box) central, 1 a 2 Hot Springs.

### Roster sugerido

| Função | Qtd | Quem |
|---|---|---|
| Trabalho manual | 4-5 | Sekhmet (6), **Splatterina** (6, não dorme), Anubis. Splatterina trabalhando 24h vale mais que 1-2 níveis de suitability. |
| Kindling | 2 | Dupin (7), Jormuntide Ignis (7) |
| Transporte (Transporting) | 2 | Mimog pela velocidade, Knocklem pela capacidade. **1 Transporte nível 3+ cobre 8 estações**, então não exagere. |
| Electricity | 1 + 1 | Grizzbolt ou Azurmane (ambos nível 5) mais **Puffolt**, que dá +1 de Electricity para toda a base |
| Medicine | 1 | Mycora (6) na Clínica. Reduz queda de SAN da base inteira, de ~5% no nível 1 até ~15% no nível 10. |
| Aura | 1 | Wumpo: aura de Transport e ainda trabalha (Transport 6, Cooling 5, Cortar árvores (Lumbering) 5) |
| Utilidade | 1 | Woolipop Terra: -15% de perda de fome |

Total: cerca de 13. Deixe folga, não encha os 15.

## Base 2 · Metal e quartz

:::atencao
**Recomendação de local:** se vocês ainda não estão nas montanhas de neve, **(290, -100)** é o melhor endereço do mid game. Tem **minério, pure quartz e enxofre no mesmo raio de Caixa de Pal (Palbox)**, hostis de nível médio, e **não exige Cold Resistance**. Os clusters grandes de quartz ficam no norte gelado, em (-212, 250) com 9 nodes, mas exigem resistência ao frio nível 2 de dia e 3 à noite.
 Se a base de vocês já está boa em minério e o que falta é só quartz, não mude nada: construa a **Pure Quartz Mine** quando chegar na Tech 50 e resolva por dentro.

:::

### Estruturas

- **Garimpo de Metais** (Tech 24, 2 pontos de Ancient Technology): produz minério continuamente, sem eletricidade. Custa 0,15 de SAN por Pal, então venha com Clínica.
- **Pure Quartz Mine** (Tech 50): o problema é que ela custa **100 Quartzo Puro** para construir. Farmem manualmente até lá.
- 3 a 4 fornos, **Baú de Guilda**, **Clínica**, 2 Hot Springs, camas individuais.
- **Cole os Mining Sites nos baús.** O output precisa chegar num container antes de qualquer estação usar, e distância de transporte é o gargalo número um.

### Roster sugerido

| Função | Qtd | Quem |
|---|---|---|
| Mining | 5 | Blazamut Ryu (7), **Knocklem Ignis** (7, minera + transporta + funde, três empregos num Pal), Astegon (7, e dropa 3-5 Quartzo Puro). Alvo final: Aegidron (8, função única). |
| Aura | 1 | Tetroise: +1 Mining para a base e Mining 4 próprio |
| Transporte | 3 | Minério é pesado, aqui vale o volume |
| Acender fogo (Kindling) | 2 | Fornos |
| Medicine | 1 | Clínica. Base de mineração drena SAN mais que qualquer outra. |

:::dica
**Party de mineração: peso zero.** Reptyro 3★ + Reptyro Cryst 3★ somam -105% de peso de minério, ou seja, você carrega infinito. As reduções empilham cruzado (Reptyro com Cryst) mas não entre iguais, e 4★ é desperdício de condensação. Cobre a categoria inteira, incluindo quartz, coal e sulfur. Turtacle só reduz o item literalmente chamado "Ore", é substituto ruim. **Precisam da sela craftada.**

:::

## Base 3 · Fazenda

:::cuidado
**Esta é a base que mais provavelmente está errada, e a culpa não é de vocês.** Todo guia de "linha de cake" descreve o Cake básico: trigo, berry, Mozzarina, Chikipi, Beegarde. No 1.0 esse é justamente o bolo que você não quer. Os bolos que importam usam ingredientes completamente diferentes.

| Bolo | Nível | Receita | Efeito |
|---|---|---|---|
| Cake base | 17 | Flour 5, Red Berries 8, Milk 7, Egg 8, Honey 2 | 1 ovo |
| **Bolo de Cogumelos (Mushroom Cake)** | 30 | Flour 5, **Mushroom 5**, **Cavern Mushroom 3**, Egg 8, Honey 2 | IVs e stats altos |
| **Bolo de Verduras (Vegetable Cake)** | **47** | Flour 8, **Tomato 8**, **Lettuce 7**, Egg 8, Honey 4 | **2 ovos por ciclo** |
| Extravagant Vegetable | 60 | Flour, **Cotton Candy 8**, Potato 10, Onion 6, Carrot 8 | mutação ~3% |
| Bolo Especial (Special Cake) | 70+ | Flour 20, Caramel Cotton Candy 8, Milk 15, Egg 15, Mammorest Meat 2 | herança de passivas |

**Repare:** o Bolo de Verduras, que é o seu alvo real (dobra os ovos), **não usa leite nem berry**. Ele usa tomate e alface. Se a fazendinha de vocês é trigo, berry e Mozzarina, ela está calibrada para o bolo errado.

:::

### Reforma sugerida

- 2× Plantação de Trigo (Wheat Plantation) + 1× Mill. Flour 8 por bolo é o insumo mais pesado.
- 2× Tomato Plantation, 2× Lettuce Plantation.
- 1× Plantação de Frutinhas (Berry Plantation), só para alimentar os Pals.
- **Ranch A:** 2× Chikipi + 2× Beegarde. Dá Egg 8 e Honey 4, exatamente o que o Bolo de Verduras pede.
- **Ranch B:** 2× Shroomer + 2× Mozzarina. Shroomer é subvalorizado: é o único que dropa Mushroom *e* Cavern Mushroom, os dois insumos do Bolo de Cogumelos, que vocês já podem fazer no nível 30.
- 2× Panela (Cooking Pot). Um só vira gargalo com três breeding farms.
- **Sibelyx no ranch** quando sobrar slot: dropa Pano Requintado (High Quality Cloth) pronto, que vende a 264 de ouro e é insumo da Máquina Incubadora de Ovos Grande (Large Incubator). É a melhor fonte passiva de ouro depois do Mau.

**Roster:** 3 Plantio (Planting) (Ophydia 7, Mycora 6), 3 Watering (Jormuntide 7), 2 Coleta (Gathering) (Venusa 6), 2 Acender fogo nos Cooking Pots, 2 Transporte, mais **Lullu** (+50% crescimento de plantação, obrigatório) e **Cinnamoth** (aura +1 Fazenda (Farming), obrigatório aqui).

:::atencao
**Regra de escala:** suba para 3-4 de cada produtor de ranch *antes* de adicionar mais Breeding Farms. O gargalo é sempre o ingrediente, nunca a farm. E não coloque Ranch na borda da base: item que cai fora do raio não é coletado.

:::

## Base 4 · Cruzamentos

:::destaque
**Esta base tem uma vantagem estratégica que quase ninguém usa:** ela precisa de pouquíssimo worker. E como a **dificuldade da raid escala pelo nível dos Pals de trabalho daquela base**, uma base de breeding com workers fracos nunca é atacada de verdade. Não coloque seus Pals de nível 50 aqui.

:::

### O erro que trava toda base de breeding

:::cuidado
**Escale incubadora antes de breeding farm, sempre.** Três farms enterram uma única incubadora em minutos e os ovos ficam parados no baú sem eclodir. E **aquecedores não empilham**: cinco fogueiras dão exatamente o mesmo bônus que uma.

| Estrutura | Nível | Capacidade | Temperatura |
|---|---|---|---|
| Incubadora de Ovos (Egg Incubator) | 10 | 1 ovo | manual |
| **Incubadora de Ovos Elétrica (Electric Egg Incubator)** | **36** | 1 ovo | **automática** |
| **Máquina Incubadora de Ovos Grande** | **47** | **10 ovos** | automática |
| Reprodutor da Civilização Antiga (Ancient Hatchery) | Tech 76 | automatiza tudo | endgame, exige Paloxita (Paloxite) da Árvore Mundial (World Tree) |

**Escalonamento:** nível 25-35, 1-2 farms e 3-4 incubadoras básicas com uma fogueira e um cooler. Nível 36, troque tudo por 4-6 **Incubadora de Ovos Elétrica** e acabe com o problema de temperatura. Nível 47, **Vegetable Cake mais Máquina Incubadora de Ovos Grande**: três farms rendendo 2 ovos por ciclo dão 6 ovos, e uma Máquina Incubadora de Ovos Grande cobre exatamente um ciclo completo. Esse é o ponto em que a operação vira industrial.

:::

### Roster mínimo, 6 Pals

| Pal | Papel |
|---|---|
| Acender fogo (Dupin) | Panela, para o cake sair já no lugar |
| 2× Transporte (Mimog) | cake para a farm, ovo para a incubadora |
| **Dynamoff** | -20% de tempo de incubação |
| **Braloha** | reduz tempo de breeding |
| Woolipop Terra | -15% de perda de fome |

Os pais nas farms não contam como worker e a incubadora roda em timer, sem Pal atribuído. O espaço que sobra vira estoque.

:::dica
**Cake guardado dentro da Fazenda de Acasalamento (Breeding Farm) não estraga.** Em baú comum estraga. Encha até o teto e esqueça.

:::

## A quinta base, se subirem o limite

:::destaque
**Óleo.** Óleo cru (Crude Oil) é o gargalo silencioso do mid para o late game: munição, Polymer, Wing Cells, tudo passa por ele. **Moonflower Oil Plateau (-646, 270)** tem óleo, coal e sulfur juntos. O extrator consome muita energia, então planeje um Gerador Elétrico Grande dedicado. E lembre que dá para colocar **dois extratores no mesmo node**, truque confirmado pela comunidade.

:::

## Ordem de desbloqueio, do mais para o menos urgente

| Tech | O quê | Por quê agora |
|---|---|---|
| **24** | Garimpo de Metais + **Clínica** | Mesmo tier. O Clinic custa quase nada e resolve sanity da base inteira. |
| 26 | Gerador Elétrico (Power Generator) | Pré-requisito de tudo elétrico |
| 36 | Incubadora de Ovos Elétrica | Acaba o babysitting de temperatura |
| **38** | **Mesa de Operação de Pals** | Passivas hereditárias por ouro. Corta metade da cadeia de breeding. |
| **41** | **Baú de Guilda** | O divisor de águas da sua arquitetura de 4 bases |
| 42 / 44 | Fábrica de Linha II + Forno Elétrico | Salto de throughput da base 1 |
| 45 | Mesa de Projetos | Combina 5 esquemas de tier baixo num do tier acima |
| **47** | **Vegetable Cake + Máquina Incubadora de Ovos Grande** | Breeding vira industrial |
| 50 | Gerador Elétrico Grande + Pure Quartz Mine | Fim da dependência de nodes naturais |

## Detalhes de sanity que valem produção

:::nota
**Mudança boa do 1.0:** Pals não perdem mais SAN por levar dano. O multiplicador foi zerado.

**Regra que quase ninguém sabe:** SAN só recupera se o estômago do Pal estiver acima de 30% cheio. Ração vazia significa zero recuperação, por mais Águas Termais (Hot Spring) que você tenha.

| Fonte | SAN por segundo |
|---|---|
| Águas Termais | +0,5 |
| High Quality Hot Spring | +0,75 |
| Ancient Hot Spring | +2,0 |
| Ração (passivo, acima de 30%) | +0,05 |
| Modo Relaxed Work | +0,08 (recupera enquanto trabalha) |
| Modo Super Hard Work | **-0,2** |
| Dormir no chão sem cama | -0,08 |
| Fome | -0,1, e -0,3 se estiver faminto |

**Limiares:** abaixo de 85 o Pal tira pausas, abaixo de 65 ele vagueia e sai da tarefa, abaixo de 50 come demais e derruba a Ração, abaixo de 40 corre risco de adoecer.

Deixem o modo de trabalho em **Normal ou Relaxed**. Super Hard Work drena 0,2 por segundo, o que uma fonte termal comum não compensa.

:::
