# Como editar a wiki

Este guia é para quem quer escrever na wiki **sem instalar nada e sem saber programar**.
Tudo é feito pelo próprio site do GitHub, pelo navegador.

---

## O básico: corrigir ou completar uma página

1. Abra a página da wiki que você quer mudar.
2. Lá embaixo, clique em **"Corrigir esta página"**. Isso te leva direto ao arquivo certo no GitHub.
3. Clique no ícone de lápis (canto superior direito da caixa de texto).
4. Escreva.
5. Clique no botão verde **Commit changes...**, no canto superior direito. Abre uma caixinha.
   "Commit" é o jeito do GitHub de dizer "salvar".
6. Escreva uma frase explicando o que mudou. Serve para o resto do grupo entender depois.
7. **Ainda na mesma caixinha, mais embaixo, escolha a SEGUNDA opção:**
   *"Create a new branch for this commit and start a pull request"*.
8. Clique em **Propose changes**.
9. Na tela que abre, clique em **Create pull request**.

Pronto, sua parte acabou. **Falta só esperar e apertar um último botão**, e as duas coisas estão
explicadas logo abaixo.

### Por que a segunda opção, e não a primeira

A primeira opção grava direto na wiki. Ela existia até 04.08.2026 e **hoje o site recusa**: ele
passou a conferir cada mudança antes de publicar, e mudança que chega sem essa conferência é
rejeitada. Se você escolher a primeira, vai ver uma mensagem de erro em inglês. Não quebrou nada,
é só escolher a segunda e seguir.

**São quatro cliques a mais, não um processo novo.** Exatamente estes quatro: escolher a segunda
opção, *Propose changes*, *Create pull request* e, no fim da espera, *Merge pull request*. Tudo na
mesma tela onde você já estava, sem instalar nada e sem sair do navegador.

Dois nomes que vão aparecer na tela, para eles não assustarem:

- **branch** (ramo) é uma cópia separada da wiki, só sua. Enquanto seu texto está nela, o site
  publicado não muda. É o que garante que texto pela metade não vai ao ar sem querer.
- **pull request** é a página que junta a sua mudança e o resultado da conferência, com o botão que
  põe o texto na wiki de verdade.

### A espera, e o que cada bolinha quer dizer

Depois do passo 9, a página do pull request mostra uma caixa de status no meio. **A conferência leva
perto de um minuto e quarenta**, e nesse tempo a tela muda sozinha. Não precisa recarregar nem ficar
olhando: pode fechar e voltar depois.

| O que aparece | O que significa | O que fazer |
|---|---|---|
| 🟡 Bolinha amarela girando | **Está conferindo.** É o estado normal, e é o que você vai ver assim que criar o pedido | Esperar. Isso não é erro, é a conferência acontecendo |
| ✅ Check verde | Passou. O botão **Merge pull request** fica disponível | Clicar em **Merge pull request** e confirmar. Em menos de um minuto está no ar |
| ❌ X vermelho | Alguma coisa não passou na conferência. O botão de publicar **não** libera | Ver a seção abaixo |

O amarelo é o que mais confunde: ele parece que travou e não travou. **Um minuto e quarenta é o
tempo normal, e passar um pouco disso também é.** Enquanto ele estiver girando, não há nada a fazer.

### Se aparecer o X vermelho

**Avise no grupo e pare por aí.** Diga que abriu um pedido e que ele ficou vermelho, e mande o link
da página. Quem mexe no código resolve.

Três coisas que valem saber, nessa ordem:

- **O seu trabalho não se perdeu.** Ele está guardado na tal cópia separada, inteirinho, com o texto
  que você escreveu. Dá para corrigir e continuar de onde parou, hoje ou daqui a uma semana. Não
  precisa reescrever nada.
- **Vermelho quase nunca é erro de quem escreveu texto.** A conferência olha o site inteiro, então
  ela reprova por coisas como um número que passou a contradizer outra página, ou um link que
  apontava para um lugar que mudou de nome. Você pode ter esbarrado nisso sem ter causado.
- **Não tente contornar.** Não existe botão de forçar, e isso é de propósito: a conferência é o que
  impede a wiki de publicar coisa errada, e ela já pegou contradição de número entre páginas,
  aptidão errada em Pal e link quebrado. Ler o registro do que reprovou não é a sua tarefa.

---

## Como escrever

O texto é escrito em Markdown, que é texto normal com algumas convenções.
Estas cinco cobrem 95% do que a wiki usa:

```markdown
## Um título de seção

### Um subtítulo

Texto normal, escrito direto. Para **negritar**, use dois asteriscos.
Para *itálico*, um asterisco. Para `um termo técnico`, use crase.

- Item de lista
- Outro item

| Coluna | Outra coluna |
|---|---|
| valor | outro valor |
```

### As caixas de destaque

Este é o único formato próprio da wiki. Serve para separar aviso de texto corrido:

```markdown
:::cuidado
**Não faça isso.** Explicação do porquê.
:::
```

Os tipos disponíveis, do mais grave ao mais leve:

| Tipo | Quando usar |
|---|---|
| `:::cuidado` | Erro caro, coisa que faz a pessoa perder horas de trabalho |
| `:::atencao` | Ressalva importante, informação que contraria o senso comum |
| `:::destaque` | O ponto principal da seção |
| `:::dica` | Truque, atalho, otimização |
| `:::nota` | Contexto extra, detalhe secundário |

Sempre feche com `:::` numa linha sozinha.

---

## Criar uma página nova

Copie qualquer arquivo de `src/content/wiki/`, salve com outro nome e ajuste o topo:

```markdown
---
titulo: "Nome que aparece no menu"
descricao: "Uma linha explicando a página. Aparece na home e no Google."
ordem: 15
atualizado: 2026-08-01
---

O texto da página começa aqui.
```

O campo `ordem` decide a posição no menu lateral: número menor aparece antes.
Se quiser guardar um rascunho sem publicar, acrescente `rascunho: true` no topo.

Não precisa mexer em mais nada. O menu, a busca e o assistente de IA se atualizam sozinhos.

Para salvar, valem os mesmos passos 5 a 9 do começo deste guia: a segunda opção na caixinha, e
depois esperar a conferência.

---

## Adicionar um ponto no mapa

Abra `src/data/mapa.json`, ache a lista `marcadores`, copie um bloco e cole no fim:

```json
{
  "nome": "Nome do lugar",
  "categoria": "minerio",
  "x": 290,
  "y": -100,
  "nota": "O que tem de interessante aqui."
}
```

As coordenadas `x` e `y` são as mesmas que o jogo mostra no canto da tela quando você abre o mapa.
Se preferir, abra a página do mapa na wiki e **clique no lugar**: a coordenada aparece embaixo, pronta para copiar.

Categorias existentes: `base`, `minerio`, `quartzo`, `carvao`, `enxofre`, `petroleo`, `torre`, `alpha`, `santuario`, `mercador`.

Para salvar, valem os mesmos passos 5 a 9 do começo deste guia.

---

## Adicionar um Pal

Abra `src/data/pals.json`, ache a lista `pals`, copie um bloco e ajuste:

```json
{
  "nome": "Nome do Pal",
  "fase": "mid",
  "elementos": ["Fogo"],
  "apt": { "acender": 7, "manual": 5 },
  "onde": "Onde encontrar",
  "nota": "O que é relevante saber."
}
```

Aptidões válidas: `acender`, `rega`, `plantio`, `energia`, `manual`, `coleta`, `madeira`, `garimpo`, `manipulacao`, `refrigeracao`, `transporte`, `fazenda`.
Fases: `mid`, `endgame`, `aura`, `utilidade`, `fazenda`, `combate`.

Deixe de fora as aptidões que o Pal não tem. **Se não souber um número, omita em vez de chutar.**

Para salvar, valem os mesmos passos 5 a 9 do começo deste guia.

---

## As regras de conteúdo

Estas não são burocracia, são o que separa esta wiki dos guias ruins que já existem.

**Diga de onde veio.** Se você leu num vídeo, num post ou testou no jogo, escreva isso. Uma frase basta:
"testado no nosso servidor em 30/07" já vale mais que uma afirmação sem origem.

**Não chute número.** Nível de tecnologia, coordenada, porcentagem e receita ou você confirmou, ou não entra.
Se você acha que é 47 mas não tem certeza, escreva "por volta do 47, confirmar".

**Quando as fontes divergirem, registre a divergência.** Metade do valor desta wiki está em dizer
"o paldb diz 73 e os guias dizem 48, confira na sua árvore" em vez de escolher um número em silêncio.

**Use o nome em português e o inglês do lado.** Quem lê a wiki joga em português, mas vai cruzar
com guia internacional. Escreva "Garimpo (Mining)" na primeira menção de cada página.

**Nada de encher linguiça.** Se a seção cabe em três frases, deixe três frases.

---

## Rodar o site no seu computador (opcional)

Só faz sentido se você for mexer no visual ou no código. Para escrever texto, não precisa.

```bash
npm install
npm run dev
```

Abre em `http://localhost:4321`. Para conferir como fica publicado de verdade:

```bash
npm run build
npm run preview
```

---

## O seletor de idioma

A wiki tem um botão **PT / EN** no topo da barra lateral. Ele não traduz o texto dos guias:
troca os **nomes das coisas do jogo**, para bater com a tela de quem está jogando.

Isso resolve o caso de vocês: quem joga em inglês lê o guia em português e vê "Kindling" onde o
jogo dele mostra "Kindling"; quem joga em português vê "Acender fogo". Ninguém precisa traduzir
nada de cabeça no meio da conversa.

### Não precisa marcar nada ao escrever

Escreva em português normal. Se você escrever "Fazenda de Acasalamento", a wiki reconhece sozinha
e sabe que em inglês é "Breeding Farm". A marcação acontece no build, a partir do dicionário.

### Mandar link já no idioma certo

Acrescente `?idioma=en` no fim do endereço. Bom para mandar no grupo para o amigo que joga em inglês.

### Quando um termo não estiver alternando

Provavelmente ele ainda não está no dicionário. Duas opções:

1. **Se o termo tem página no paldb:** abra `scripts/atualizar-termos.mjs`, acrescente uma linha na
   lista `ENTIDADES` com o identificador e o endereço do paldb, e rode `npm run termos:atualizar`.
2. **Se não tem, ou você já sabe a tradução:** edite `src/data/termos.json` direto e adicione o par.
   Valores editados à mão não são sobrescritos, a menos que alguém rode o script com `--forcar`.

Alguns termos ficam de fora de propósito, na lista `NAO_MARCAR` em `src/lib/termos.js`: são palavras
curtas demais ou comuns demais em português, como "Fazenda", "Coleta" e "Transporte", que apareceriam
trocadas em frases onde não são nome de coisa do jogo.

---

## Quando sair um patch do jogo

```bash
npm run patch:verificar
```

O comando consulta as notícias oficiais do jogo, compara com a versão que a wiki declara conhecer,
e quando há patch novo lista **quais páginas provavelmente precisam de revisão**, ordenadas por
quantos assuntos do patch elas cobrem. Ele não altera nada: a decisão continua sendo sua.

Depois de revisar o conteúdo, registre:

```bash
npm run patch:registrar 1.0.3
```

Vale rodar o verificador uma vez por semana, ou sempre que alguém do grupo notar que algo mudou no jogo.
