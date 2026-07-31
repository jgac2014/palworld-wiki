# Leitor de save

**Veredito: o código está pronto e correto, e não funciona no nosso save, porque a
biblioteca que faz o parsing binário ainda não suporta o formato atual do jogo.**

Isto está escrito com detalhe porque foi investigado até o fim e a conclusão é
acionável: não vale mexer nisso de novo até a dependência atualizar.

---

## O que foi provado que funciona

1. **Achar o save da versão Xbox / Game Pass.** Ela não grava `.sav` soltos como
   a do Steam: grava containers WGS, pastas de GUID com blobs sem extensão e um
   `containers.index` binário. Contornado sem parsear o índice: descomprime todo
   blob e fica com os que respondem.
2. **Descomprimir.** Os 14 blobs acima de 100 KB descomprimem, o maior indo de
   5 MB para 69 MB.
3. **Ler o GVAS e extrair.** Jogador, nível, experiência, Pals com nível, rank,
   passivas e talentos, e contagem de bases. Testado, devolveu 115 Pals e 58
   espécies distintas num dos mundos.
4. **Escolher o mundo certo.** O jogo guarda o mundo atual mais Slot1, Slot2 e
   Slot3. Escolher por tamanho ou por data lê o errado. A versão final decide por
   **evidência**: parseia todos e fica com o do jogador de maior nível.
5. **Traduzir para nome de exibição.** O save guarda o id interno, não o nome:
   Lamball é `SheepBall`, Gumoss é `PlantSlime`, Nitewing é `HawkBird`. O
   `catalogo.json` guarda esse id no campo `id`, então é consulta de dicionário.

## O que não funciona, e por quê

Os saves do nosso mundo, gravados em 30 e 31 de julho, quebram no parsing com
uma cadeia de erros que sempre termina igual:

```
Unknown EPalWorkTransformType, please report this: 67
Unknown EPalWorkTransformType, please report this: 68
Unknown EPalWorkTransformType, please report this: 69
Warning: Unknown base camp module type EPalBaseCampModuleType::ItemStackInfo, skipping
Warning: EOF not reached for EPalBaseCampModuleType::TransportItemDirector
Warning: EOF not reached for EPalBaseCampModuleType::PassiveEffect
error: unpack requires a buffer of 1 bytes
```

Leitura: o jogo introduziu estruturas que a biblioteca não conhece. Ela lê a
quantidade errada de bytes, **desalinha o fluxo**, e a partir dali todo o resto
vira lixo até bater no fim do buffer.

**Tolerar o erro não resolve.** Foi tentado: envolver cada decoder num `try` que
ignora o `EOF not reached` e devolve bloco vazio. Não adianta, porque o problema
não é a exceção, é o ponteiro de leitura já ter andado errado. Depois do
desalinhamento não há o que recuperar.

Os dois mundos que **parseiam** são saves antigos, anteriores à mudança de
formato. É por isso que a primeira execução devolveu um jogador de nível 22: não
era escolha errada de mundo, era o único mundo que a biblioteca conseguia ler.

## É problema nosso?

Não. É [a issue 179 do `palworld-save-tools`](https://github.com/cheahjs/palworld-save-tools/issues/179),
aberta desde uma atualização do jogo que mudou o formato, com vários usuários
relatando exatamente estes erros, incluindo em saves de Xbox, e sem correção
publicada. A [issue 177](https://github.com/cheahjs/palworld-save-tools/issues/177)
é o mesmo sintoma por outro caminho.

## O que fazer

**Agora:** preencher `save.json` à mão pelas telas do jogo. Leva cinco minutos por
pessoa, nunca quebra, e é o que a wiki consome hoje.

**Quando a biblioteca atualizar:** rodar o comando abaixo. O código aqui não
precisa mudar, porque o que falta está na dependência, não nele.

```bash
pip install --upgrade palworld-save-tools
python extrair.py <pasta do save> --catalogo ../../src/data/catalogo.json --saida save.json
python extrair.py <pasta do save> --listar     # mostra os mundos sem extrair
python extrair.py <pasta do save> --mundo 2    # escolhe outro mundo
```

Vale checar a issue 179 quando sair patch grande do jogo. Se ela fechar, isto
aqui volta a valer em um comando.

## Quatro armadilhas já pisadas

Registradas porque cada uma custou uma rodada inteira.

1. **`Set-Content -Encoding UTF8` do PowerShell grava BOM** e o Python quebra sem
   dizer por quê. Use `Out-File -Encoding ASCII` ou escreva pelo próprio Python.
2. **A assinatura é `GvasFile.read(data, type_hints, custom_properties)`**, nessa
   ordem. Trocar os dois últimos dá um erro enganoso: `Error decoding ascii string
   of length 1951596544`.
3. **O mundo atual não é o maior arquivo.** O mundo abandonado tinha 5 MB contra
   1,7 MB do que estava em uso.
4. **`print(..., file=sys.stderr)` some** quando o PowerShell captura com `2>&1`.
   Redirecione com `cmd /c "... > out.txt 2> err.txt"` para ver o que aconteceu.
