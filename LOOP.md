# Rodar sem vai e vem

Como executar a fila inteira sem ficar alternando entre o Claude Code e o Cowork a
cada tarefa. Leia junto com `PROMPT-EXECUCAO.md`.

---

## A ideia

Trabalho autônomo só funciona quando existe **um portão objetivo**. Sem isso, o agente
não tem como saber se acertou, e alguém precisa olhar cada tela.

Este repositório agora tem esse portão:

```bash
npm run portao
```

Ele encadeia quatro coisas e sai com código 1 se qualquer uma falhar:

| Etapa | O que garante |
|---|---|
| `verificar` | Dados e conteúdo íntegros. Catálogo cruzado com a curadoria, números batendo entre páginas, frontmatter válido |
| `build` | O site gera |
| `offline` | O pacote de um arquivo só continua completo |
| `testar` | Asserções num navegador de verdade, com o site **servido por HTTP**, não aberto como arquivo |

Os testes de navegador não são genéricos: **cada um existe porque a coisa que ele
checa já quebrou uma vez neste projeto.** Painel do assistente nascendo aberto, menu
destacando duas páginas, termo acentuado travado em português, link interno apontando
para rota que não existe. Nenhum desses quebrava o build. Se um falhar, é regressão de
algo que já foi consertado, não regra nova.

**Como saber se um teste novo vale alguma coisa:** sabote a correção que ele cobre, reconstrua e
veja se ele acusa. Se passar mesmo com o bug de volta, o teste é placebo. Foi assim que
descobrimos que testar por `file://` não carrega o CSS e invalidava toda asserção de estilo.

O mesmo portão roda em CI a cada push, pelo `.github/workflows/portao.yml`.

---

## O prompt de loop

Cole isto no Claude Code, uma vez, e vá fazer outra coisa:

```
Leia PROMPT-EXECUCAO.md.

Execute a fila de TAREFAS.md em ordem, sem me consultar entre tarefas.

Para cada tarefa:
1. Implemente a menor mudança que satisfaz o critério de aceite.
2. Rode `npm run portao`. Se falhar, conserte e rode de novo, até três tentativas.
3. Passando, commit em português explicando o porquê, e marque [x] na tarefa.
4. Vá para a próxima.

PARE e me chame quando qualquer uma destas acontecer:
- `npm run portao` falhar três vezes seguidas na mesma tarefa
- dois documentos (CLAUDE.md, PRD.md, TAREFAS.md) se contradisserem
- um critério de aceite for impossível como está escrito
- a tarefa exigir decisão de produto que o PRD não cobre
- a tarefa exigir acesso que você não tem

Ao parar, escreva o impedimento no fim da tarefa em TAREFAS.md e commit isso
também, para eu ver o estado sem precisar ler o histórico da conversa.

Quando terminar o bloco A inteiro, pare e me dê um resumo antes de seguir para
o bloco E.
```

Três coisas nesse prompt importam mais que o resto:

**"até três tentativas"** evita o agente ficar num ciclo infinito lutando contra o
portão. Na terceira, o problema provavelmente não é o código.

**"escreva o impedimento em TAREFAS.md e commit"** faz o estado sobreviver ao fim da
conversa. Você volta, dá `git log`, e sabe onde parou sem reler nada.

**"pare no fim do bloco A"** é um ponto de controle barato. Três tarefas é pouco o
bastante para você conferir a direção sem virar babá, e é exatamente onde o bilíngue
fecha, que é o diferencial do projeto.

---

## Qual modelo e qual effort

**Para o loop: Opus 5 com effort `xhigh`.** Não é escolha de luxo, é o caso de uso
literal: `xhigh` existe para "trabalho agêntico de longo alcance, 30 minutos ou mais",
e num plano Max o Opus 5 não tem penalidade de custo por chamada. Quando o preço para
de ser a variável, a decisão vira capacidade, e capacidade é o que falta quando ninguém
está olhando.

No Claude Code:

```
/model opus
/effort xhigh
```

**Não use Fable 5 aqui.** Ele custa o dobro do Opus 5 e a orientação oficial é só
recorrer a ele em carga que você mediu e achou o Opus insuficiente. Nada nesta fila é
isso. Ele também carrega retenção de dados de 30 dias obrigatória, o que é motivo a mais
para não usar sem necessidade comprovada.

**Não use Haiku.** O contexto de 200 mil tokens é curto para este repositório: só o
`catalogo.json` tem 92 KB, e as tarefas exigem ler três documentos antes de editar.

### Se você bater no limite de uso

O gargalo do plano Max não é dinheiro, é cota. `xhigh` gasta mais token por tarefa. Se
apertar, degrade por tipo de tarefa em vez de degradar tudo:

| Tarefa | Modelo e effort | Por quê |
|---|---|---|
| A1, A2, A3, E2, D2, D4, D6 | Sonnet 5, `medium` | Mecânicas. Material pronto, critério objetivo, pouco a decidir |
| E1, E5, D5 | Opus 5, `high` | Lógica de domínio e geração de rota. Erra em silêncio se apressado |
| **E4, D3** | **Opus 5, `xhigh`** | Onde este projeto mais errou. E4 é engenharia reversa de HTML do paldb, que já produziu um catálogo mutilado. D3 mexe no plugin de marcação, que já quebrou por `\b` ASCII e por olhar o pai em vez do ancestral |
| Auditoria (no Cowork) | Opus 5, `max` | É onde o retorno por token é maior. Foi auditando que apareceram 26 Pals errados e 48 elementos errados |

### A regra que dispensa adivinhação

**Deixe o portão decidir.** Se `npm run portao` passa com Sonnet em `medium`, o trabalho
está bom, e discutir modelo é perda de tempo. Se a mesma tarefa falhar duas vezes
seguidas, suba para Opus em `xhigh` antes de tentar a terceira. Isso troca opinião sobre
modelo por evidência sobre resultado.

---

## Quando o loop tem que morar aqui e não lá

O loop de implementação mora no Claude Code, porque o trabalho é editar arquivo no
repositório. O Cowork é melhor para o que exige julgamento ou acesso a coisa de fora:

- Revisão adversarial do que saiu do loop, com agente independente.
- Ler o save do jogo pela ponte com a sua máquina.
- Pesquisar patch novo, conferir se a `issue` do leitor de save fechou.
- Decisão de produto, quando o PRD não cobre.

A divisão que funciona: **o Claude Code produz, o Cowork audita.** Foi assim que a
revisão de 31.07 achou o catálogo mutilado e 48 Pals com elemento errado, coisas que o
próprio autor do código não veria relendo o próprio código.

---

## Se quiser sem nenhuma supervisão

Tire o "pare no fim do bloco A" do prompt e aceite o risco: dezenove tarefas seguidas
sem ninguém olhando é bastante coisa acontecendo à revelia. O portão protege contra
regressão e dado errado, mas não protege contra **direção errada**: ele não sabe dizer
que uma página ficou feia ou que o texto ficou ruim.

Meio-termo recomendado: deixe correr o bloco A e o E, que são mecânicos e bem
especificados, e reserve supervisão de verdade para o bloco D, que é onde o desenho
entra e onde gosto importa.
