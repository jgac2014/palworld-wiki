"""
Descobre quais mundos existem no save Xbox / Game Pass e qual é o ativo.

    python mundos.py <pasta wgs>

O jogo guarda vários mundos lado a lado: o atual mais Slot1, Slot2 e Slot3.
Todos são blobs de GUID sem extensão, e o do mundo abandonado pode ser maior
que o do mundo em uso, então escolher pelo tamanho lê o save errado. Foi o que
aconteceu na primeira tentativa: leu um mundo de nível 22 em vez do de 52.

O nome lógico de cada blob está no containers.index, que é binário e sem
documentação oficial. Em vez de assumir uma estrutura de campos que a Microsoft
pode mudar, este módulo faz uma leitura auto-validante:

  1. acha todo nome lógico legível no índice, que é UTF-16 e casa com
     <hash>-Level-01, <hash>-Slot2-Level-01, e por aí;
  2. para cada nome, varre os bytes seguintes procurando 16 bytes que, lidos
     como GUID, correspondam a uma pasta que existe no disco;
  3. se a pasta existe, o par nome/GUID está certo. Se não existe, descarta.

O passo 3 é o que dá robustez: um palpite errado não vira dado, vira descarte.
"""
import os
import re
import sys
import uuid

# nome lógico do container: 32 hex, traço, e o resto
NOME = re.compile(r"[0-9A-F]{32}-[A-Za-z0-9_\-]{3,80}")


def pastas_existentes(raiz):
    return {n.upper(): os.path.join(raiz, n) for n in os.listdir(raiz)
            if os.path.isdir(os.path.join(raiz, n))}


def guids_candidatos(dados, inicio, alcance=160):
    """Toda janela de 16 bytes logo depois de um nome, nas duas convenções."""
    for desloc in range(0, alcance):
        p = inicio + desloc
        bruto = dados[p:p + 16]
        if len(bruto) < 16:
            return
        try:
            yield uuid.UUID(bytes_le=bruto).hex.upper()
            yield uuid.UUID(bytes=bruto).hex.upper()
        except Exception:
            continue


def mapear(raiz_container):
    """{'...-Level-01': caminho da pasta}. Só entra o que existe no disco."""
    indice = os.path.join(raiz_container, "containers.index")
    if not os.path.isfile(indice):
        return {}

    with open(indice, "rb") as f:
        dados = f.read()

    existentes = pastas_existentes(raiz_container)
    texto = dados.decode("utf-16-le", errors="ignore")
    mapa = {}

    for m in NOME.finditer(texto):
        nome = m.group(0)
        # posição em bytes: o texto foi decodificado de UTF-16, logo 2 bytes por char
        fim_bytes = m.end() * 2
        for guid in guids_candidatos(dados, fim_bytes):
            if guid in existentes:
                mapa.setdefault(nome, existentes[guid])
                break

    return mapa


def blobs(pasta):
    """Os arquivos de dados dentro da pasta do container, sem os de controle."""
    saida = []
    for n in os.listdir(pasta):
        p = os.path.join(pasta, n)
        if os.path.isfile(p) and not n.lower().startswith("container."):
            saida.append(p)
    saida.sort(key=lambda p: -os.path.getsize(p))
    return saida


def raizes(wgs):
    """Cada conta tem uma pasta própria com o seu containers.index."""
    achadas = []
    for pasta, _, arquivos in os.walk(wgs):
        if "containers.index" in [a.lower() for a in arquivos]:
            achadas.append(pasta)
    return achadas


def descobrir(wgs):
    """Lista de mundos, do mais recente para o mais antigo."""
    mundos = []
    for raiz in raizes(wgs):
        mapa = mapear(raiz)
        for nome, pasta in mapa.items():
            if "-Level-" not in nome:
                continue
            arquivos = blobs(pasta)
            if not arquivos:
                continue
            principal = arquivos[0]
            resto = nome.split("-", 1)[1]
            mundos.append({
                "nome": nome,
                "slot": resto.replace("-Level-01", "") or "atual",
                "arquivo": principal,
                "bytes": os.path.getsize(principal),
                "mtime": os.path.getmtime(principal),
            })
    mundos.sort(key=lambda m: -m["mtime"])
    return mundos


if __name__ == "__main__":
    wgs = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.environ.get("LOCALAPPDATA", ""), "Packages",
        "PocketpairInc.Palworld_ad4psfrxyesvt", "SystemAppData", "wgs")

    achados = descobrir(wgs)
    if not achados:
        print("  nenhum mundo identificado pelo containers.index")
        sys.exit(1)
    import time
    print(f"  {len(achados)} mundos identificados, do mais recente para o mais antigo:\n")
    for i, m in enumerate(achados):
        marca = "  <- ativo" if i == 0 else ""
        quando = time.strftime("%d/%m %H:%M", time.localtime(m["mtime"]))
        print(f"   [{i}] {m['slot']:<10} {m['bytes']/1024:>9,.0f} KB   {quando}{marca}")
