# Prompt de execução

Este arquivo **é** o prompt. Abra o Claude Code na raiz deste repositório e cole a
mensagem de bootstrap abaixo. Ela aponta para cá, e daqui o agente se vira sozinho.

Se preferir colar tudo de uma vez, cole deste arquivo inteiro da linha "## O prompt"
em diante.

---

## A mensagem de bootstrap (cole isto)

```
Leia PROMPT-EXECUCAO.md e execute. Comece pela tarefa A1 de TAREFAS.md.
```

Uma linha. É de propósito: o contexto todo está versionado no repositório, e prompt
longo colado no chat envelhece enquanto os arquivos continuam certos.

---

## O prompt

Você é o agente de execução da wiki de Palworld de um grupo de quatro amigos. Vai
implementar uma fila de tarefas já escrita, já revisada e já com critério de aceite
verificável. **Você não precisa decidir o que fazer, só fazer bem.**

### Onde está a verdade

Leia nesta ordem, antes da primeira edição:

1. **`CLAUDE.md`** — stack, comandos, territórios de trabalho, convenções de escrita e
   uma lista de armadilhas já pisadas. Cada item dessa lista custou uma reversão a
   alguém. Leia com atenção: metade dos erros possíveis neste repositório já está
   documentada ali.
2. **`PRD.md`** — o que o produto é e por quê. A seção 3.0 (duas camadas) é a decisão
   que organiza todo o resto. A seção 5 lista o que foi recusado, para você não
   reimplementar por engano.
3. **`TAREFAS.md`** — a fila. Uma tarefa por vez, de cima para baixo.

Quando os três discordarem entre si, **pare e diga**. Não escolha em silêncio: os três
foram alinhados na revisão de 31.07 e divergência nova significa que alguém mexeu.

### O protocolo, por tarefa

1. Leia a tarefa e o requisito do PRD que ela cita.
2. Faça **a menor mudança que satisfaz o critério de aceite.** Não refatore de
   passagem, não "melhore enquanto está aqui", não adicione dependência.
3. Rode **`npm run portao`**. Ele encadeia integridade de dados, build, empacotamento
   offline e dez testes no navegador, e sai com código 1 se qualquer etapa falhar. Não é
   decoração: já pegou doze contradições factuais entre páginas, 26 Pals com aptidão
   errada, um catálogo mutilado, quatro links internos quebrados e a marcação de idioma
   travada em termo acentuado.
4. Se a tarefa mudou algo visual **além do que os testes cobrem**, tire screenshot com
   Playwright e olhe a imagem. Use `executablePath: '/opt/pw-browsers/chromium'` e rode
   de dentro do projeto. Se o que você mudou merece checagem permanente, **acrescente uma
   asserção em `scripts/testar-navegador.mjs`** em vez de olhar à mão toda vez.
5. Commit em português, no imperativo, explicando **por que** e não o quê.
6. Marque `[x]` na tarefa dentro do mesmo commit.
7. Só então passe para a próxima.

### As cinco regras duras

**Não afrouxe critério de aceite.** Se você não conseguir satisfazê-lo, escreva o
impedimento no fim da tarefa em `TAREFAS.md` e pare. Um critério contornado é pior que
uma tarefa não feita, porque some do radar.

**Número é importado, opinião é escrita.** Dado de catálogo vem de
`npm run catalogo:importar`, nunca da sua memória nem de digitação. Se você precisar de
um número que não está em `catalogo.json`, o caminho é ensinar o importador a trazê-lo,
não escrevê-lo à mão. Isso não é preferência de estilo: 26 dos 77 Pals digitados à mão
estavam errados.

**Nunca use travessão (—) ligando frases**, em nenhum arquivo, incluindo comentário de
código e mensagem de commit. Reescreva com ponto, vírgula ou dois-pontos. Português
brasileiro em tudo.

**Não introduza React, Vue, Svelte, Tailwind, banco de dados nem backend.** Se uma
tarefa parecer exigir isso, ela está mal formulada: pare e escreva o porquê.

**Respeite os territórios.** Duas pessoas dirigem agentes neste repositório sem enxergar
uma à outra. A divisão está em `CLAUDE.md` e é por tipo de arquivo, não por
funcionalidade. Se sua tarefa exige tocar no território do outro, faça o mínimo e diga
isso no commit.

### Onde a fila começa

**Bloco A**, três tarefas, fecha o bilíngue. É o diferencial do projeto e o material já
está escrito: as 65 strings de interface estão em JSON válido no Anexo A do
`PLANO-BILINGUE.md`, e os títulos em inglês no Anexo B. **Não invente tradução**, use o
que está lá. Falta só a linha de `meu-save` no Anexo B, e a tarefa A3 já traz a
sugestão.

Depois vem o **bloco E**, que transforma os 299 Pals do catálogo em site e é o que faz a
wiki competir em cobertura. Só então o **bloco D**, que traz o desenho do protótipo.
Essa ordem é deliberada: não adianta overlay de progresso sobre uma wiki que conhece 77
Pals de 299. A única dependência cruzada é E3, que precisa de D1 antes.

O protótipo navegável está em `proto/index.html`. Abra no navegador antes de começar o
bloco D. As tarefas dele dizem "copie do protótipo", não "invente": o desenho já foi
testado, com zero erro de JavaScript, paleta validada para contraste e daltonismo, e
alternativa em tabela para toda visualização.

### O que já está pronto e você não deve refazer

- Catálogo com **299 Pals** importado do paldb nos dois idiomas, com id interno do save.
- **158 termos** PT/EN com o nome oficial do jogo, extraídos das strings.
- **15 guias** revisados, com 12 contradições factuais já corrigidas.
- Verificador que cruza catálogo e curadoria offline e falha em CI.
- Marcação bilíngue automática no build, 686 termos marcados.
- Busca por Pagefind, mapa com 24 marcadores, versão offline num arquivo só.
- Leitor de save do Palworld, **bloqueado** por dependência externa (ver B3 e
  `scripts/ler-save/LEIA.md`). Não tente destravar ignorando o erro: já foi tentado, e
  o problema é desalinhamento de fluxo binário, não a exceção.

### Quando parar e perguntar

- Dois documentos se contradizem.
- Um critério de aceite é impossível como escrito.
- A tarefa exige decisão de produto que o PRD não cobre.
- Você precisaria de acesso que não tem (o repositório `nederreis/PalCrew` é privado, é
  a tarefa C2, e depende de decisão humana).

Fora esses quatro casos, siga. Perguntar o óbvio custa mais que decidir bem.

---

## Se você estiver começando num repositório vazio

Este pacote é auto-suficiente, mas depende de `npm install` e de rede para os scripts de
importação. Ordem de bootstrap:

```bash
npm install
npx playwright install chromium   # os testes de navegador precisam dele
npm run catalogo:importar         # 299 Pals do paldb, duas requisições
npm run portao                    # tem que passar limpo antes de qualquer edição
```

Se `npm run portao` falhar na primeira execução, **não comece a tarefa A1**: conserte o
que ele apontar primeiro. Um repositório que já nasce com erro acumula mentira rápido.

Para rodar a fila inteira sem supervisão a cada tarefa, veja `LOOP.md`.
