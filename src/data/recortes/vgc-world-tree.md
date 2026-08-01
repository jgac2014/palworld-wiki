---
url: https://www.videogameschronicle.com/guide/palworld-10-enter-world-tree/
capturado_em: 2026-08-01
usado_para: "A cadeia de acesso à Árvore Mundial: nível, lugar e os seis pré-requisitos"
status: viva
via: cowork
origem: "capturado via Cowork porque a máquina local recebe 403 da Cloudflare"
---
# vgc-world-tree

Recorte, não cópia: o nível exigido, o lugar, a lista de pré-requisitos na ordem do artigo e o passo
final.

Esta captura **não sai desta máquina**. Daqui a URL responde 403 da Cloudflare, na requisição direta
e no navegador automatizado, então `npm run recortes:gravar` preserva este arquivo em vez de tentar
regravá-lo. Some o arquivo, o script aborta: ele não sabe refazer o que não capturou.

### Nível e lugar

> level 70 and above

> Northernmost point of the map

### Pré-requisitos, nesta ordem

> 1. Discover Sunreach
> 2. Defeat Auri & Shaolong
> 3. Find the Deserted Islet
> 4. Find the Echoing Flute materials
> 5. Craft the Echoing Flute
> 6. Defeat and capture Panthalus

### Passo final

> With Panthalus in your party, head to the base of the World Tree

> interact with the altar, and you'll be allowed to access the World Tree.

### O que este recorte sustenta, e o que ele cruza

O requisito de entrada na Árvore Mundial, que era a afirmação sem prova depois que esta URL passou a
responder 403 por aqui.

Ele **bate com o recorte do NextTier** em dois pontos, sem os dois terem sido capturados juntos:
Auri e Shaolong são o chefe de torre que guarda o caminho, e o NextTier registra o nível 68 dele
como a última torre padrão antes do endgame. Duas fontes independentes descrevendo a mesma cadeia
vale mais que qualquer uma sozinha.

O Panthalus aparece nos patch notes do 1.0.2 gravados no recorte do The Big Lead, que menciona a
correção dele junto com a Árvore Mundial. É consistente com ele ser peça da cadeia de acesso.

**Nada disto está publicado nos guias da wiki hoje.** Isto aqui é matéria-prima, não conteúdo: a
tarefa que transforma isto em guia está aberta em `TAREFAS.md`.
