# Wiki Palworld 1.0 em português

**No ar em https://jgac2014.github.io/palworld-wiki/** · código em
https://github.com/jgac2014/palworld-wiki

Todo push na `main` republica sozinho, em um a dois minutos, pelo workflow `deploy.yml`. O
`portao.yml` roda em paralelo e é ele que impede publicar coisa errada: se ele ficar vermelho,
conserte o commit, nunca o portão.

Wiki de Palworld focada na versão **1.0.2** (build 1.100.933), escrita em português brasileiro,
com os nomes das coisas como aparecem no jogo traduzido.

Nasceu de um problema concreto: quase não existe material bom de Palworld 1.0 em português, e a
localização do jogo tem escolhas que quebram a expectativa de quem lê guia em inglês. *Mining* é
**Garimpo**, *Medicine Production* é **Manipulação**, *Kindling* é **Acender fogo**. Quem segue guia
internacional procura a aptidão errada no menu.

**O que tem aqui**

- 14 páginas de guia, do plano de ação de mid game ao endgame na Árvore Mundial
- Glossário completo PT ↔ EN, dataminado das strings do próprio jogo
- Mapa interativo com as coordenadas do jogo, filtrável por categoria
- Banco de Pals filtrável por aptidão de trabalho, elemento e fase
- Assistente de IA que responde só com base no que está escrito na wiki
- Busca que funciona sem servidor, indexada no build

---

## Colocar no ar

### 1. Publicar no GitHub

```bash
git init
git add .
git commit -m "wiki inicial"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/palworld-wiki.git
git push -u origin main
```

### 2. Ligar o GitHub Pages

No repositório: **Settings → Pages → Source: GitHub Actions**.

Pronto. A partir daí, todo commit na `main` republica o site em um ou dois minutos.
O endereço fica `https://SEU-USUARIO.github.io/palworld-wiki`.

### 3. Trocar os três lugares com o nome de exemplo

Procure por `SEU-USUARIO` e troque:

| Arquivo | O que mudar |
|---|---|
| `src/layouts/Base.astro` | a constante `REPO`, que faz funcionar o link "Corrigir esta página" |
| `README.md` | os endereços deste guia |

O `astro.config.mjs` pega usuário e repositório automaticamente do GitHub Actions, não precisa mexer.

---

## Ligar o assistente de IA

O assistente é opcional: o site funciona sem ele. Enquanto não estiver configurado, o botão
explica o que falta em vez de dar erro.

Ele roda num Cloudflare Worker, que tem tier gratuito generoso. A chave da API fica no servidor,
nunca no navegador de quem visita.

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY   # cole a chave quando pedir
npx wrangler deploy
```

O comando devolve um endereço parecido com `https://wiki-palworld-ia.SEU-SUBDOMINIO.workers.dev`.
Cole esse endereço em `ENDERECO_ASSISTENTE`, no topo de `src/components/Chat.astro`, e faça commit.

### Como ele funciona

A wiki inteira tem cerca de 93 KB de texto, o que cabe folgado numa única chamada. Por isso não há
banco vetorial nem busca semântica: o modelo recebe **todo** o conteúdo e responde em cima dele.
O conteúdo vai marcado como cacheável, então da segunda pergunta em diante o custo cai bastante.

O contexto é regerado automaticamente a cada build (script `prebuild`), então basta editar os
arquivos `.md` normalmente que o assistente acompanha. Se quiser regerar à mão:

```bash
npm run ia:atualizar
```

---

## Pôr a imagem no mapa

O mapa funciona sem imagem: ele desenha uma grade de coordenadas e os marcadores aparecem no lugar
certo. A arte do jogo não vem no repositório de propósito.

Para usar o mapa de verdade:

1. Salve um print da tela de mapa do jogo em `public/mapa/mapa.jpg`.
2. Abra `src/data/mapa.json` e ajuste `imagem.largura` e `imagem.altura` para o tamanho real do arquivo.
3. Escolha dois lugares em que você sabe a coordenada do jogo, veja em que pixel eles caem na imagem
   e preencha os dois pontos de `calibracao`.

O resto se posiciona sozinho por transformação afim.

---

## Estrutura

```
src/
  content/wiki/     as 14 páginas, em Markdown. É aqui que se escreve.
  data/
    mapa.json       pontos do mapa
    pals.json       banco de Pals
  pages/            home, mapa, banco de Pals e a rota que gera as páginas
  layouts/          o esqueleto de todas as páginas
  components/       widget do assistente
  styles/global.css o tema inteiro
scripts/
  gerar-conteudo-ia.mjs   junta a wiki num arquivo para o assistente
  converter-wiki.py       migração do HTML original, já rodou, fica de registro
worker/             o assistente de IA
```

---

## Contribuir

O guia de escrita, incluindo como criar página, adicionar ponto no mapa e cadastrar Pal
**sem instalar nada**, está em [CONTRIBUINDO.md](CONTRIBUINDO.md).

As regras de conteúdo, em resumo: diga de onde veio a informação, não chute número, e quando as
fontes divergirem registre a divergência em vez de escolher um lado em silêncio.

---

## Rodar localmente

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/
npm run preview  # serve o dist/ como fica publicado
```

---

## Sobre precisão

Cada afirmação foi cruzada entre o changelog oficial da Pocketpair, dados dataminados do
[paldb.cc](https://paldb.cc/pt/) e relatos de comunidade com replicação independente. A página
**Fontes e incertezas** registra tudo que está em disputa, incluindo os pontos em que este
projeto pode estar errado.

Conteúdo sob [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br).
Código sob MIT. Palworld é da Pocketpair; este é um projeto de fãs, sem vínculo.
