---
url: https://steamdb.info/app/1623730/patchnotes/
capturado_em: 2026-08-01
usado_para: "Histórico de patches, para saber qual versão é a publicada"
status: sem-html
origem: "lido sem JavaScript: a lista de builds não existe no HTML, só o cabeçalho do app"
---
# steamdb-patchnotes

**Esta página não publica o dado em HTML.** O corpo volta com "Loading…" e a lista de builds é
montada por JavaScript, então ela nunca está no documento servido. Não adianta trocar de cliente,
insistir no navegador nem mudar cabeçalho: não é bloqueio, é dado que não existe no HTML.

**A categoria mudou em 01.08.2026, e a distinção importa.** Antes isto estava registrado como
"bloqueada por robô", por causa do 403 da Cloudflare que esta máquina recebe. Chamar de bloqueio
sugere que outro cliente resolveria, e manda a próxima pessoa gastar tempo tentando. É a mesma
categoria da página do Anubis no paldb, que também abre e também não traz a lista que a wiki citava.

### O que dá para gravar sem JavaScript, e vale gravar

> Último changenumber: 37340689

> Último registro: 17.07.2026

> Lançamento: 10.07.2026

### O que continua sem prova reproduzível

O histórico de patches em si, que é para o que o `fontes.md` cita esta URL. Os três números acima
situam o app e a data do último registro, e não dizem qual build corresponde a qual versão
publicada, que é a pergunta.

Quem cobre essa pergunta hoje com trecho gravado é o changelog oficial da Steam, para o 1.0, e o
recorte do The Big Lead, para o 1.0.2. O `npm run patch:verificar` continua sendo o caminho por
comando, porque ele lê as notícias oficiais e não esta página.
