"""
Lê o save do Palworld e emite o JSON que a Camada 2 da wiki consome.

    python extrair.py <pasta-do-save> --catalogo catalogo.json --saida save.json
    python extrair.py <pasta-do-save> --listar          # só mostra os mundos
    python extrair.py <pasta-do-save> --mundo 2         # escolhe na mão

Sem argumentos, procura o save da instalação Xbox / Game Pass, que não grava
.sav soltos: grava containers WGS, pastas de GUID com blobs sem extensão.

## Como o mundo certo é escolhido

Esta é a parte que custou duas tentativas, então vale explicar.

O jogo guarda vários mundos lado a lado: o atual mais Slot1, Slot2 e Slot3 de
saves anteriores. Duas heurísticas óbvias falham:

  - **por tamanho**: o mundo abandonado pode ser maior. Leu um de nível 22.
  - **por data**: os blobs mais recentes nem sempre são o mundo, podem ser
    LocalData ou o container de outra conta.

E ler o containers.index para casar nome lógico com pasta funciona, mas depende
de um formato binário sem documentação, que a Microsoft muda quando quiser.

Então aqui a escolha é por **evidência, não por palpite**: descomprime todos os
blobs, parseia os que têm worldSaveData, e fica com o mundo cujo jogador tem o
maior nível. Custa alguns segundos a mais e não tem como estar errado, porque a
decisão usa o conteúdo do save em vez de um proxy dele.

Quem quiser outro mundo passa --mundo N, depois de ver a lista com --listar.
"""
import sys
import os
import json
import time
from collections import Counter

from palworld_save_tools.palsav import decompress_sav_to_gvas
from palworld_save_tools.gvas import GvasFile
from palworld_save_tools.paltypes import PALWORLD_CUSTOM_PROPERTIES, PALWORLD_TYPE_HINTS


def pasta_padrao():
    return os.path.join(
        os.environ.get("LOCALAPPDATA", ""),
        "Packages", "PocketpairInc.Palworld_ad4psfrxyesvt",
        "SystemAppData", "wgs",
    )


def opcao(nome):
    if nome in sys.argv:
        i = sys.argv.index(nome)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return None


def posicionais():
    saida, pular = [], False
    com_valor = {"--catalogo", "--saida", "--mundo"}
    for a in sys.argv[1:]:
        if pular:
            pular = False
            continue
        if a in com_valor:
            pular = True
            continue
        if a.startswith("--"):
            continue
        saida.append(a)
    return saida


def v(no, *caminho, padrao=None):
    """Desce por chaves tolerando o embrulho {'value': ...} do GVAS."""
    atual = no
    for chave in caminho:
        if atual is None:
            return padrao
        if isinstance(atual, dict) and "value" in atual and chave not in atual:
            atual = atual["value"]
        if not isinstance(atual, dict) or chave not in atual:
            return padrao
        atual = atual[chave]
    if isinstance(atual, dict) and "value" in atual:
        return atual["value"]
    return atual


def lista(bruto):
    """Listas do GVAS às vezes vêm como {'values': [...]}, às vezes cruas."""
    if isinstance(bruto, dict):
        bruto = bruto.get("values", bruto.get("value", []))
    return [x for x in (bruto or []) if isinstance(x, str)]


def limpar_id(bruto):
    if not isinstance(bruto, str):
        return None
    nome = bruto
    for prefixo in ("BOSS_", "PREDATOR_", "SUMMON_", "GYM_", "RAID_"):
        if nome.upper().startswith(prefixo):
            nome = nome[len(prefixo):]
    return nome


def carregar_catalogo(caminho):
    """id interno do save -> {pt, en, numero}. Sem catálogo, o id sai cru."""
    if not caminho or not os.path.isfile(caminho):
        return {}
    with open(caminho, encoding="utf-8") as f:
        dados = json.load(f)
    return {
        p["id"].lower(): {"pt": p.get("pt"), "en": p.get("en"), "numero": p.get("numero")}
        for p in dados.get("pals", []) if p.get("id")
    }


def descomprimir_tudo(raiz):
    achados = []
    for pasta, _, nomes in os.walk(raiz):
        for n in nomes:
            if n.lower() == "containers.index" or n.lower().startswith("container."):
                continue
            p = os.path.join(pasta, n)
            try:
                if os.path.getsize(p) < 100_000:
                    continue
                with open(p, "rb") as f:
                    bruto = f.read()
                gvas_bytes, _ = decompress_sav_to_gvas(bruto)
            except Exception:
                continue
            achados.append({"caminho": p, "gvas": gvas_bytes, "mtime": os.path.getmtime(p)})
    achados.sort(key=lambda x: -x["mtime"])
    return achados


def ler_mundo(gvas_bytes):
    """Devolve (gvas, jogadores, quantos_pals) ou None se não for mundo."""
    try:
        gvas = GvasFile.read(gvas_bytes, PALWORLD_TYPE_HINTS, PALWORLD_CUSTOM_PROPERTIES, allow_nan=True)
    except Exception:
        return None
    dados = gvas.properties.get("worldSaveData")
    if dados is None:
        return None
    mapa = v(dados, "CharacterSaveParameterMap", padrao=[]) or []
    jogadores, quantos = [], 0
    for entrada in mapa:
        param = v(entrada, "value", "RawData", "object", "SaveParameter")
        if not isinstance(param, dict):
            continue
        if bool(v(param, "IsPlayer", padrao=False)):
            jogadores.append({"nome": v(param, "NickName"), "nivel": v(param, "Level", padrao=1)})
        else:
            quantos += 1
    return gvas, jogadores, quantos


def detalhar(gvas, catalogo):
    dados = gvas.properties.get("worldSaveData", {})
    mapa = v(dados, "CharacterSaveParameterMap", padrao=[]) or []

    jogadores, pals, desconhecidos = [], [], set()
    for entrada in mapa:
        param = v(entrada, "value", "RawData", "object", "SaveParameter")
        if not isinstance(param, dict):
            continue

        if bool(v(param, "IsPlayer", padrao=False)):
            jogadores.append({
                "nome": v(param, "NickName"),
                "nivel": v(param, "Level", padrao=1),
                "exp": v(param, "Exp", padrao=0),
            })
            continue

        interno = limpar_id(v(param, "CharacterID"))
        ficha = catalogo.get((interno or "").lower())
        if interno and not ficha:
            desconhecidos.add(interno)

        pals.append({
            "id": interno,
            "pt": (ficha or {}).get("pt") or interno,
            "en": (ficha or {}).get("en") or interno,
            "numero": (ficha or {}).get("numero"),
            "nivel": v(param, "Level", padrao=1),
            "rank": v(param, "Rank", padrao=1),
            "passivas": lista(v(param, "PassiveSkillList")),
            "talentos": {
                "hp": v(param, "Talent_HP", padrao=0),
                "corpo": v(param, "Talent_Melee", padrao=0),
                "tiro": v(param, "Talent_Shot", padrao=0),
                "defesa": v(param, "Talent_Defense", padrao=0),
            },
        })

    bases = v(dados, "BaseCampSaveData", padrao=[]) or []
    return {"jogadores": jogadores, "pals": pals, "bases": len(bases),
            "desconhecidos": sorted(desconhecidos)}


def resumir(mundo):
    pals = mundo["pals"]
    especies = Counter(p["pt"] for p in pals if p["pt"])
    passivas = Counter(s for p in pals for s in p["passivas"])
    repetidos = [{"pal": n, "quantas": q} for n, q in especies.most_common(20) if q > 1]
    return {
        "total_pals": len(pals),
        "especies_distintas": len(especies),
        "condensados": sum(1 for p in pals if (p["rank"] or 1) > 1),
        "nivel_maximo": max((p["nivel"] or 0) for p in pals) if pals else 0,
        "duplicados_para_condensar": repetidos,
        "passivas_mais_comuns": [{"passiva": n, "quantas": q} for n, q in passivas.most_common(15)],
    }


def main():
    args = posicionais()
    raiz = args[0] if args else pasta_padrao()
    if not os.path.isdir(raiz):
        print(json.dumps({"erro": "pasta de save nao encontrada", "caminho": raiz}))
        sys.exit(1)

    print(f"  procurando saves em {raiz}", file=sys.stderr)
    blobs = descomprimir_tudo(raiz)
    if not blobs:
        print(json.dumps({"erro": "nenhum blob descomprimiu como save"}))
        sys.exit(1)
    print(f"  {len(blobs)} blobs descomprimiram, lendo cada um", file=sys.stderr)

    mundos = []
    for b in blobs:
        lido = ler_mundo(b["gvas"])
        if not lido:
            continue
        gvas, jogadores, quantos = lido
        mundos.append({
            "gvas": gvas,
            "caminho": b["caminho"],
            "mtime": b["mtime"],
            "jogadores": jogadores,
            "pals": quantos,
            "nivel": max([j["nivel"] or 0 for j in jogadores], default=0),
        })

    if not mundos:
        print(json.dumps({"erro": "nenhum blob tinha worldSaveData"}))
        sys.exit(1)

    # a evidência que decide: o mundo em uso é o do jogador de maior nível.
    # empate desempata pela quantidade de Pals, depois pela data.
    mundos.sort(key=lambda m: (-m["nivel"], -m["pals"], -m["mtime"]))

    print(f"\n  {len(mundos)} mundos encontrados:", file=sys.stderr)
    for i, m in enumerate(mundos):
        quem = ", ".join(f"{j['nome']} nv.{j['nivel']}" for j in m["jogadores"]) or "sem jogador"
        quando = time.strftime("%d/%m %H:%M", time.localtime(m["mtime"]))
        marca = "  <- escolhido" if i == 0 else ""
        print(f"   [{i}] {quando}  {m['pals']:>4} Pals  {quem}{marca}", file=sys.stderr)

    if "--listar" in sys.argv:
        return

    escolhido = mundos[int(opcao("--mundo") or 0)]
    catalogo = carregar_catalogo(opcao("--catalogo"))
    mundo = detalhar(escolhido["gvas"], catalogo)

    resultado = {
        "_leia_isto": "ARQUIVO GERADO pelo leitor de save. Não edite à mão.",
        "origem": os.path.basename(escolhido["caminho"]),
        "gravado_em": escolhido["mtime"],
        "mundos_encontrados": len(mundos),
        "catalogo_usado": bool(catalogo),
        "jogadores": mundo["jogadores"],
        "bases": mundo["bases"],
        "resumo": resumir(mundo),
        "pals": sorted(mundo["pals"], key=lambda p: (-(p["nivel"] or 0), p["pt"] or "")),
    }
    if mundo["desconhecidos"]:
        resultado["sem_correspondencia_no_catalogo"] = mundo["desconhecidos"]

    texto = json.dumps(resultado, ensure_ascii=False, indent=1)
    saida = opcao("--saida")
    if saida:
        with open(saida, "w", encoding="utf-8") as f:
            f.write(texto + "\n")
        print(f"\n  escrito em {saida}", file=sys.stderr)
    else:
        print(texto)


if __name__ == "__main__":
    main()
