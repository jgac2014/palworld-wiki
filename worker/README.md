# Assistente da wiki

Worker do Cloudflare que responde perguntas usando o conteúdo da wiki como contexto.

## Publicar

```bash
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler deploy
```

Depois copie o endereço devolvido pelo deploy para `ENDERECO_ASSISTENTE`
em `../src/components/Chat.astro`.

## Como funciona

`src/conteudo.js` é gerado automaticamente pelo build do site
(`npm run build` na raiz, via script `prebuild`). Não edite esse arquivo:
edite os `.md` em `../src/content/wiki` e rode o build.

A wiki inteira vai no prompt marcada como cacheável, então a partir da
segunda pergunta o custo cai bastante. Não existe banco vetorial porque
o conteúdo cabe folgado numa chamada.

## Custo

Tier gratuito do Cloudflare Workers cobre 100 mil requisições por dia.
O gasto real é a API da Anthropic, proporcional ao número de perguntas.
