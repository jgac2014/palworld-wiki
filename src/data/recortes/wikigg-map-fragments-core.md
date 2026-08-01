---
url: https://palworld.wiki.gg/api.php?action=query&prop=revisions&titles=Map%3AFragments%2FCore&rvprop=content&rvslots=main&format=json&formatversion=2
capturado_em: 2026-08-01
status: viva
http: 200
via: navegador
usado_para: "Os limites de enquadramento da textura World_Map.webp, que projetam os 13.755 pontos sobre o fundo do mapa"
capturado_por: scripts/gerar-fundo-mapa.mjs
---

# wikigg-map-fragments-core

Recorte do conteúdo inteiro de `Map:Fragments/Core`, a página que a wiki.gg usa como fonte do
mapa. Ele vai inteiro e não em trecho porque são 400 caracteres de configuração, e um pedaço
deles não prova enquadramento nenhum. Página para humano: https://palworld.wiki.gg/wiki/Map:Fragments/Core (a requisição
direta leva 403 da Cloudflare, então a captura é por navegador, pela API).

### crs e background

> {
>   "$schema": "https://palworld.wiki.gg/extensions/DataMaps/schemas/v17.3.json",
>   "$fragment": true,
>   "crs": {
>     "topLeft": [ -1954.07407407, 1245.7254902 ],
>     "bottomRight": [ 1200.26143791, -1908.61002179 ],
>     "order": "xy"
>   },
>   "background": {
>     "image": "World_Map.webp",
>     "at": [
>       [ -1954.07407407, 1245.7254902 ],
>       [ 1200.26143791, -1908.61002179 ]
>     ]
>   }
> }

### O que estes números querem dizer

> A imagem cobre de x -1954.07407407 a 1200.26143791 e de y -1908.61002179 a 1245.7254902,
> na coordenada que o jogo mostra na tela do mapa. Lado de 3154.33551 unidades, igual nos dois eixos.

Conferido contra a nossa própria fórmula de mundo para tela, que é independente disto: aplicando
`tela.x = (mundo.Y - 158000) / 459` e `tela.y = (mundo.X + 123888) / 459` a uma landscape de
X -999940 a 447900 e Y -738920 a 708920, saem exatamente os quatro números acima. Os limites da
build do paldb, que estão no mesmo `projecao-mapa.json`, dão outro retângulo: é a diferença de
enquadramento entre as duas builds, não erro de fórmula.
