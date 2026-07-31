"""
Sonda os saves do Palworld na instalação Xbox / Game Pass.

A versão de loja do Xbox não grava .sav soltos: grava containers WGS, que são
pastas de GUID com blobs sem extensão. O mapa de nome lógico para GUID está no
containers.index, mas em vez de parsear esse formato binário a gente faz o
caminho barato: tenta descomprimir todo arquivo e vê qual responde como save.

Uso:
    python sondar.py <pasta wgs do jogo>
"""
import sys
import os
import json
import traceback

try:
    from palworld_save_tools.palsav import decompress_sav_to_gvas
    from palworld_save_tools.gvas import GvasFile
    from palworld_save_tools.palsav import SKP_PALWORLD_CUSTOM_PROPERTIES  # type: ignore
except ImportError:
    from palworld_save_tools.palsav import decompress_sav_to_gvas
    from palworld_save_tools.gvas import GvasFile
    SKP_PALWORLD_CUSTOM_PROPERTIES = None

try:
    from palworld_save_tools.paltypes import PALWORLD_CUSTOM_PROPERTIES
except Exception:
    PALWORLD_CUSTOM_PROPERTIES = {}


def caminho_wgs():
    if len(sys.argv) > 1:
        return sys.argv[1]
    base = os.path.join(
        os.environ["LOCALAPPDATA"],
        "Packages", "PocketpairInc.Palworld_ad4psfrxyesvt",
        "SystemAppData", "wgs",
    )
    return base


def arquivos(raiz):
    for pasta, _, nomes in os.walk(raiz):
        for n in nomes:
            if n.lower() in ("containers.index",):
                continue
            p = os.path.join(pasta, n)
            try:
                if os.path.getsize(p) < 200:
                    continue
            except OSError:
                continue
            yield p


def main():
    raiz = caminho_wgs()
    if not os.path.isdir(raiz):
        print(json.dumps({"erro": "pasta wgs nao encontrada", "caminho": raiz}))
        return

    achados = []
    for p in arquivos(raiz):
        try:
            with open(p, "rb") as f:
                bruto = f.read()
            gvas_bytes, _tipo = decompress_sav_to_gvas(bruto)
        except Exception:
            continue

        info = {
            "arquivo": os.path.relpath(p, raiz),
            "bytes": len(bruto),
            "descomprimido": len(gvas_bytes),
        }

        # o nome do save aparece no cabeçalho GVAS como caminho do mapa
        try:
            gvas = GvasFile.read(gvas_bytes, PALWORLD_CUSTOM_PROPERTIES, {}, allow_nan=True)
            info["chaves"] = sorted(list(gvas.properties.keys()))[:12]
            info["ok"] = True
        except Exception as e:
            info["ok"] = False
            info["erro"] = f"{type(e).__name__}: {e}"[:160]

        achados.append(info)

    achados.sort(key=lambda x: -x["bytes"])
    print(json.dumps({"raiz": raiz, "saves": achados[:20], "total": len(achados)}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
