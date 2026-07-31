# Guia de integração

Este documento existe porque o projeto tem duas bases: esta, e a que foi construída em
paralelo com outro Claude. Ele separa **o que vale a pena levar** do **que pode ser jogado
fora sem dó**, e explica como transportar cada peça para uma estrutura diferente desta.

Escrito em 30.07.2026, depois de uma revisão completa que corrigiu 12 contradições factuais.

---

## A regra de decisão

O código é a parte barata. Qualquer estrutura de site estático razoável faz o que esta faz
em uma tarde. O que custou tempo aqui foi outra coisa:

1. **Descobrir** a terminologia oficial em português, que não está publicada em lugar nenhum
2. **Verificar** o que é verdade no 1.0 e o que é resquício de Early Access
3. **Escrever** 87 mil caracteres de guia e depois padronizá-los
4. **Cruzar** fontes que se contradizem e registrar a divergência em vez de escolher em silêncio

Então a regra é simples: **em caso de conflito, o código do outro projeto vence; os dados e o
conteúdo daqui vencem.** Não por apego, mas porque um lado é reproduzível em horas e o outro
não é.

---

## Inventário: o que existe e quanto vale

| Peça | Arquivo | Portátil? | Vale levar? |
|---|---|---|---|
| **Dicionário bilíngue** | `src/data/termos.json` | Sim, é JSON puro | **Sim, prioridade máxima.** 158 termos com o nome oficial em PT e EN, extraídos das strings do jogo. Não existe equivalente publicado |
| **Conteúdo dos guias** | `src/content/wiki/*.md` | Sim, é Markdown | **Sim.** 14 páginas, 87 mil caracteres, revisados e padronizados |
| **Banco de Pals** | `src/data/pals.json` | Sim | **Sim.** 73 Pals com aptidões, onde achar e observações |
| **Pontos do mapa** | `src/data/mapa.json` | Sim | **Sim.** 24 marcadores com coordenadas do jogo, mais o esquema de calibração |
| **Script de termos** | `scripts/atualizar-termos.mjs` | Sim, Node puro | **Sim.** É o que mantém o dicionário vivo a cada patch |
| **Monitor de patch** | `scripts/verificar-patch.mjs` | Sim, Node puro | **Sim.** Já achou um patch que ninguém tinha visto |
| **Verificador** | `scripts/verificar-tudo.mjs` | Quase, depende dos caminhos | **Sim, com ajuste de caminho** |
| **Auditor de tradução** | `scripts/auditar-termos.mjs` | Quase | Sim |
| **Padronizador** | `scripts/padronizar-conteudo.mjs` | Quase | Sim |
| Marcação bilíngue no build | `astro.config.mjs` | Não, é específico do Astro | Só a ideia, não o código |
| Seletor de idioma | `src/components/SeletorIdioma.astro` | Não | Só a ideia |
| Layout, páginas, tema | `src/layouts/`, `src/pages/`, `src/styles/` | Não | **Não.** Descartável |
| Worker do assistente | `worker/` | Sim, é Cloudflare puro | Sim, se a outra base não tiver |

---

## Como transportar cada peça

### 1. O dicionário bilíngue

É o ativo mais valioso e o mais fácil de mover: um JSON com esta forma.

```json
{
  "termos": {
    "apt_mining": { "en": "Mining", "pt": "Garimpo", "fonte": "i18n" },
    "breeding_farm": { "en": "Breeding Farm", "pt": "Fazenda de Acasalamento", "fonte": "paldb" }
  }
}
```

O campo `fonte` diz de onde veio cada termo, e importa: `i18n` e `paldb` vieram
direto das strings do jogo; `conferido` foi verificado à mão; `mapa` veio do cruzamento dos
dados de mapa nos dois idiomas.

**Para integrar:** copie o arquivo. Qualquer estrutura consegue ler.

### 2. O conteúdo

Markdown com frontmatter simples:

```markdown
---
titulo: "Nome da página"
descricao: "Uma linha"
ordem: 3
atualizado: 2026-07-30
---
```

A única marcação não padrão são as caixas de destaque no formato `:::cuidado ... :::`.
Se a outra estrutura não suportar, há dois caminhos: implementar o mesmo plugin de
diretiva, que é umas 20 linhas, ou converter para citação com `>` e uma linha de título
em negrito.

**Para integrar:** copie a pasta. Se os nomes de campo do frontmatter forem outros,
um script de 15 linhas renomeia.

### 3. Os dados estruturados

`pals.json` e `mapa.json` são JSON puro, sem dependência de framework. O formato está
documentado dentro do próprio arquivo, no campo `_leia_isto`.

### 4. Os scripts

Todos são Node puro, sem dependência do Astro. Precisam apenas que os caminhos apontem
para o lugar certo. As constantes de caminho estão no topo de cada arquivo.

| Script | O que faz | Quando roda |
|---|---|---|
| `atualizar-termos.mjs` | Puxa termos do paldb nos dois idiomas | Quando sai patch, ou quando falta termo |
| `verificar-patch.mjs` | Compara a versão da wiki com as notícias oficiais | Semanal |
| `verificar-tudo.mjs` | Checa integridade de dados e conteúdo | Antes de publicar |
| `auditar-termos.mjs` | Lista o que ainda não alterna de idioma | Depois de escrever conteúdo novo |
| `padronizar-conteudo.mjs` | Deixa o português como principal no texto | Depois de importar conteúdo de fora |

### 5. A ideia da marcação bilíngue

Esta é a única parte que não se copia, então vale explicar o mecanismo em vez do código.

No build, um plugin varre o HTML gerado a partir do Markdown e envolve toda ocorrência
de um termo conhecido num `<span>` com os dois idiomas declarados:

```html
<span data-termo="apt_mining" data-pt="Garimpo" data-en="Mining">Garimpo</span>
```

No navegador, o seletor troca o `textContent` de todos esses elementos de uma vez.
São três vantagens: quem escreve não precisa marcar nada, o HTML continua legível sem
JavaScript, e trocar de idioma não recarrega a página.

Coisas que a implementação precisa acertar, aprendidas errando:

- **Não marcar dentro de título, código, link ou endereço.** Vira ruído e quebra link.
- **Casar do termo mais longo para o mais curto**, senão "Arena" é trocado dentro de
  "Arena Merchant".
- **Manter uma lista de exceções** para palavras curtas e comuns demais em português.
  Em `src/lib/termos.js` ela se chama `NAO_MARCAR` e inclui "Fazenda", "Coleta" e
  "Transporte", que aparecem em frases onde não são nome de coisa do jogo.

---

## Ordem sugerida de integração

1. **Dicionário e dados.** São autônomos, não quebram nada e já entregam valor sozinhos.
2. **Conteúdo.** Ajustar o frontmatter ao esquema da outra base, se for diferente.
3. **Scripts.** Ajustar caminhos e adicionar ao `package.json`.
4. **Marcação bilíngue.** Reimplementar sobre a estrutura escolhida, seguindo as três
   regras acima.
5. **Assistente**, se a outra base não tiver.

---

## Estado atual, verificado

Rodado em 30.07.2026 com `npm run verificar`:

```
ok  pals.json: 73 Pals, estrutura válida
ok  mapa.json: 24 marcadores, 11 categorias
ok  termos.json: 158 termos
ok  conteúdo: 14 páginas, frontmatter e marcação verificados
ok  level cap: 80, consistente em todas as páginas
ok  cruzado: 71 de 73 Pals do banco aparecem nos guias

PASSOU  6 verificações ok, 0 avisos, 0 erros
```

O build gera 17 páginas sem erro e a busca indexa todas.

---

## O que a revisão corrigiu

Vale registrar, porque mostra o tipo de defeito que este conteúdo tinha e que a outra base
provavelmente também terá se veio de fonte parecida.

**Contradições factuais entre páginas, 12 no total.** As piores:

| Problema | Estava | Ficou |
|---|---|---|
| Contagem de Pals não fechava | 227 antigos + 72 novos = 287 | 215 + 72 = 287 |
| Receita que não existe mais | "Orserk por cruzamento" em duas páginas, com a própria wiki dizendo que a receita foi removida | Só chefe de torre |
| Contradição na mesma página | "Global Palbox não existe" e "use o Global Palbox", a sete linhas de distância | Distinção entre mover Pal entre mundos e sincronizar entre servidores |
| Conta errada | "3★ com 1★ chega a 100%" de redução de peso, quando a soma dá 90% | Dois 3★ somam 105% |
| Unidade incoerente | Servidor morre em "4 minutos", workaround é reiniciar "a cada 4 horas" | Algumas horas |
| Dado errado | Shaolong como Árvore Mundial nível 76-78 e "último chefe" | Torre 8, Sunreach, nível 68 |
| Soma que não batia | Teto de montaria "+75%", mas as quatro passivas somam 80% | +80% |
| Nome que a própria wiki desmentia | "Deluxe Vegetable Cake" usado três vezes, com o glossário dizendo que esse item não existe | Extravagante |

**Restos da conversão de HTML para Markdown:** um bloco de estatísticas achatado numa linha
ilegível, 5 caixas de destaque vazias, 10 etiquetas coladas na frase seguinte, uma tabela cujo
cabeçalho era a primeira linha de dados.

**Concordância quebrada por substituição automática de termos:** "do seu Caixa de Pal",
"do Caixa de Pal", "um Águas Termais". Esse é o efeito colateral previsível de trocar termos
em massa e a razão de o `padronizar-conteudo.mjs` ter um passo separado de correção de artigo.

---

## Duas coisas que valem discutir antes de juntar

**O modelo de dados.** Se a outra base guarda os dados dos Pals dentro do texto, em tabela
Markdown, vale considerar mover para JSON como aqui. A vantagem aparece no patch: muda-se
o número num lugar e todas as páginas que o exibem acompanham. Com tabela copiada em artigo,
é preciso caçar cada cópia, que é exatamente por que as wikis existentes ficam desatualizadas.

**A regra de convivência.** Somos dois Claude Opus 5 escrevendo no mesmo repositório sem
enxergar o que o outro faz. A divisão que funciona é por tipo de arquivo, não por
funcionalidade: quem cuida de código fica em componentes e configuração, quem cuida de
conteúdo fica em dados, texto e scripts. Está detalhada no `PLANO-BILINGUE.md`.
