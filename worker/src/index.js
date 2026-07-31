/**
 * Assistente da Wiki Palworld.
 *
 * Recebe uma pergunta do site, junta o conteúdo inteiro da wiki como contexto
 * e devolve a resposta em streaming. A chave da API fica aqui no servidor,
 * nunca no navegador de quem visita.
 *
 * A wiki toda tem cerca de 80 KB de texto, o que cabe folgado numa chamada.
 * Por isso não há busca vetorial nem banco de dados: o modelo recebe tudo e o
 * cache de prompt faz a conta ficar barata a partir da segunda pergunta.
 *
 * Publicar:
 *   cd worker
 *   npm install
 *   npx wrangler secret put ANTHROPIC_API_KEY
 *   npx wrangler deploy
 */

import { CONTEUDO_WIKI } from './conteudo.js';

const MODELO = 'claude-sonnet-4-5';
const MAX_PERGUNTA = 600;
const MAX_TURNOS = 12;

const INSTRUCOES = `Você é o assistente da wiki de Palworld de um grupo de quatro amigos brasileiros.

CONTEXTO DE QUEM PERGUNTA
Eles jogam a versão 1.0.2 em português do Brasil, no controle, num mundo co-op por código de convite hospedado por um deles. Estão no meio da progressão, entre os níveis 25 e 50. Têm quatro bases: produção, garimpo, fazenda e acasalamento.

COMO RESPONDER
Responda em português brasileiro, direto ao ponto, começando pela conclusão.
Use os nomes das coisas como aparecem no jogo em português, e ponha o termo em inglês entre parênteses quando ajudar a pessoa a cruzar com guias internacionais. Exemplos: Garimpo (Mining), Manipulação (Medicine Production), Acender fogo (Kindling), Fazenda de Acasalamento (Breeding Farm), Casulo de Condensação de Pal (Pal Essence Condenser).
Seja conciso. Duas ou três frases resolvem a maioria das perguntas. Não repita a pergunta de volta.
Nada de listar tudo de forma neutra: quando houver mais de um caminho, recomende um e diga por quê.

REGRA MAIS IMPORTANTE
Responda apenas com base no conteúdo da wiki abaixo. Se a resposta não estiver lá, diga que a wiki não cobre isso ainda e sugira onde a pessoa confirmaria (paldb.cc, o changelog oficial, ou testando no jogo). Nunca invente número, coordenada, nível de tecnologia ou receita.
Quando a wiki registrar que fontes divergem sobre algo, diga isso em vez de escolher um lado em silêncio.
Quando fizer sentido, aponte a página da wiki onde o assunto está detalhado.`;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }
    if (request.method !== 'POST') {
      return json({ erro: 'Use POST.' }, 405);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return json({ erro: 'O assistente ainda não foi configurado: falta a chave da API no worker.' }, 503);
    }

    let corpo;
    try {
      corpo = await request.json();
    } catch {
      return json({ erro: 'Corpo inválido.' }, 400);
    }

    const historico = Array.isArray(corpo.mensagens) ? corpo.mensagens.slice(-MAX_TURNOS) : [];
    if (!historico.length) return json({ erro: 'Sem pergunta.' }, 400);

    const ultima = historico[historico.length - 1];
    if (!ultima?.content || typeof ultima.content !== 'string') {
      return json({ erro: 'Pergunta vazia.' }, 400);
    }
    if (ultima.content.length > MAX_PERGUNTA) {
      return json({ erro: `Pergunta muito longa. Máximo de ${MAX_PERGUNTA} caracteres.` }, 400);
    }

    const resposta = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 900,
        stream: true,
        system: [
          { type: 'text', text: INSTRUCOES },
          {
            type: 'text',
            text: `CONTEÚDO COMPLETO DA WIKI\n\n${CONTEUDO_WIKI}`,
            // marca o conteúdo como cacheável: a partir da segunda pergunta
            // o custo cai muito, porque a wiki não muda entre uma e outra
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: historico.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content).slice(0, MAX_PERGUNTA),
        })),
      }),
    });

    if (!resposta.ok) {
      const detalhe = await resposta.text();
      console.error('erro da api', resposta.status, detalhe);
      return json({ erro: 'O assistente não conseguiu responder agora. Tente de novo em instantes.' }, 502);
    }

    return new Response(resposta.body, {
      headers: {
        ...CORS,
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache',
        connection: 'keep-alive',
      },
    });
  },
};

function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' },
  });
}
