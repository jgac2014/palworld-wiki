#!/usr/bin/env python3
"""
Converte a wiki HTML de sessão única em arquivos Markdown separados,
um por seção, prontos para as content collections do Astro.

Uso: python3 scripts/converter-wiki.py caminho/para/wiki.html
Roda uma vez só, na migração. Depois disso o Markdown é a fonte da verdade.
"""
import sys, re, os, html
from html.parser import HTMLParser

SECOES = {
    "s0":  ("resumo-1-0",        "O que mudou no 1.0",      1,  "Panorama do lançamento, level cap, contagem de Pals e histórico de patches."),
    "s1":  ("plano-de-acao",     "Plano de ação",           2,  "Ordem de operações para quebrar o muro do mid game em co-op."),
    "sB":  ("nossas-bases",      "Nossas 4 bases",          3,  "Blueprint por base, roster nominal e ordem de desbloqueio."),
    "s2":  ("base-e-trabalho",   "Base e trabalho",         4,  "Aptidão para trabalho, auras, layout de base e defesa contra invasões."),
    "s3":  ("breeding",          "Cruzamentos e mutação",   5,  "Herança de passivas, bolos, mutação e a cadeia de produção de Pals."),
    "s4":  ("combate",           "Combate e squad",         6,  "Tier list, passivas de combate, armas, montarias e arena."),
    "s5":  ("torres-e-bosses",   "Torres e bosses",         7,  "As 9 torres em ordem, alphas e zonas de caça proibida."),
    "s6":  ("endgame",           "Endgame",                 8,  "Sunreach, Árvore Mundial, Despertar e Wing Pack."),
    "s7":  ("economia",          "Economia e farm",         9,  "Ouro, recursos raros, expedições e linha de bolo."),
    "s8":  ("co-op",             "Co-op e servidor",       10,  "O que compartilha, limites do mundo por convite e configurações."),
    "sC":  ("controle",          "No controle",            11,  "Gamepad no 1.0: dash com mira, botões do dia a dia e configurações."),
    "sG":  ("glossario",         "Glossário PT ↔ EN",      12,  "Terminologia oficial em português do jogo, dataminada do paldb."),
    "s9":  ("armadilhas",        "Armadilhas e bugs",      13,  "Erros caros, bugs ativos e truques validados pela comunidade."),
    "s10": ("fontes",            "Fontes e incertezas",    14,  "O que está em disputa entre fontes e de onde veio cada dado."),
}

# cards viram admonitions do estilo :::tipo
CLASSE_ADMONITION = {
    "hl":   "destaque",
    "warn": "atencao",
    "bad":  "cuidado",
    "gold": "dica",
    "p":    "nota",
}


class ParserSecao(HTMLParser):
    """Converte o HTML de uma seção em Markdown."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []
        self.pilha = []          # tags abertas
        self.linha = []          # buffer da linha corrente
        self.em_tabela = False
        self.linha_tabela = []
        self.tabela = []
        self.cabecalho_feito = False
        self.lista = []          # pilha de tipos de lista
        self.item_aberto = False
        self.card = None
        self.pular = 0

    # ---------- utilidades ----------
    def escreve(self, txt):
        self.linha.append(txt)

    def fecha_linha(self):
        t = "".join(self.linha).strip()
        self.linha = []
        if t:
            self.out.append(t)
            self.out.append("")

    def texto_corrente(self):
        return "".join(self.linha).strip()

    # ---------- tags ----------
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get("class", "")

        if tag == "div" and "card" in cls.split():
            self.fecha_linha()
            tipo = "nota"
            for c in cls.split():
                if c in CLASSE_ADMONITION:
                    tipo = CLASSE_ADMONITION[c]
            self.card = tipo
            self.out.append(f":::{tipo}")
            return

        if tag == "div" and cls == "t":
            # rótulo do card vira título do admonition
            self.pular = 0
            self.escreve("**")
            return

        if tag in ("h2",):
            self.fecha_linha()
            self.escreve("")  # o h1 vem do frontmatter
            self.pular = 1
            return

        if tag == "h3":
            self.fecha_linha()
            self.escreve("## ")
            return
        if tag == "h4":
            self.fecha_linha()
            self.escreve("### ")
            return

        if tag == "p":
            self.fecha_linha()
            return

        if tag in ("strong", "b"):
            self.escreve("**")
            return
        if tag in ("em", "i"):
            self.escreve("*")
            return
        if tag == "code":
            self.escreve("`")
            return
        if tag == "br":
            self.escreve("  \n")
            return

        if tag == "a":
            self.href = a.get("href", "")
            self.escreve("[")
            return

        if tag in ("ul", "ol"):
            self.fecha_linha()
            self.lista.append(tag)
            return

        if tag == "li":
            prefixo = "  " * (len(self.lista) - 1)
            marca = "- " if (self.lista and self.lista[-1] == "ul") else "1. "
            self.escreve(prefixo + marca)
            self.item_aberto = True
            return

        if tag == "table":
            self.fecha_linha()
            self.em_tabela = True
            self.tabela = []
            self.cabecalho_feito = False
            return

        if tag == "tr" and self.em_tabela:
            self.linha_tabela = []
            return

        if tag in ("td", "th") and self.em_tabela:
            self.celula = []
            return

        if tag == "span" and "b" in cls.split():
            self.no_badge = True
            self.escreve("[")
            return

        if tag == "div" and "kv" in cls.split():
            self.fecha_linha()
            self.no_kv = True
            self.escreve("- ")
            return

        if tag == "span" and "k" in cls.split() and getattr(self, "no_kv", False):
            self.escreve("**")
            self.fechando_k = True
            return

    def handle_endtag(self, tag):
        if tag == "div":
            if getattr(self, "no_kv", False):
                t = "".join(self.linha).strip()
                self.linha = []
                if t.strip("- "):
                    self.out.append(t)
                self.no_kv = False
            return

        if tag in ("h2",):
            self.linha = []
            self.pular = 0
            return

        if tag in ("h3", "h4", "p"):
            self.fecha_linha()
            return

        if tag in ("strong", "b"):
            self.escreve("**")
            return
        if tag in ("em", "i"):
            self.escreve("*")
            return
        if tag == "code":
            self.escreve("`")
            return
        if tag == "a":
            self.escreve(f"]({self.href})")
            return

        if tag == "li":
            t = "".join(self.linha).rstrip()
            self.linha = []
            if t.strip(" -1."):
                self.out.append(t)
            self.item_aberto = False
            return

        if tag in ("ul", "ol"):
            if self.lista:
                self.lista.pop()
            if not self.lista:
                self.out.append("")
            return

        if tag in ("td", "th") and self.em_tabela:
            cel = "".join(self.linha).strip().replace("\n", " ").replace("|", "\\|")
            self.linha = []
            self.linha_tabela.append(cel)
            return

        if tag == "tr" and self.em_tabela:
            self.tabela.append(self.linha_tabela)
            self.linha_tabela = []
            return

        if tag == "table":
            self.em_tabela = False
            if self.tabela:
                largura = max(len(r) for r in self.tabela)
                norm = [r + [""] * (largura - len(r)) for r in self.tabela]
                self.out.append("| " + " | ".join(norm[0]) + " |")
                self.out.append("|" + "---|" * largura)
                for r in norm[1:]:
                    self.out.append("| " + " | ".join(r) + " |")
                self.out.append("")
            return

        if tag == "span":
            if getattr(self, "fechando_k", False):
                self.escreve("**: ")
                self.fechando_k = False
                return
            if getattr(self, "no_badge", False):
                self.escreve("]")
                self.no_badge = False
            return

    def handle_data(self, data):
        if self.pular:
            return
        t = data.replace("\n", " ")
        if not t.strip():
            if self.linha and not self.linha[-1].endswith(" "):
                self.escreve(" ")
            return
        self.escreve(re.sub(r"\s+", " ", t))

    def resultado(self):
        self.fecha_linha()
        md = "\n".join(self.out)
        # fecha admonitions: cada ::: aberto precisa de um :::
        linhas = md.split("\n")
        saida, aberto = [], False
        for ln in linhas:
            if ln.startswith(":::") and not aberto:
                saida.append(ln)
                aberto = True
                continue
            if aberto and (ln.startswith("## ") or ln.startswith("### ") or ln.startswith(":::")):
                saida.append(":::")
                saida.append("")
                aberto = False
                if ln.startswith(":::"):
                    saida.append(ln)
                    aberto = True
                    continue
            saida.append(ln)
        if aberto:
            saida.append(":::")
        md = "\n".join(saida)
        md = re.sub(r"\n{3,}", "\n\n", md)
        md = re.sub(r"\*\*\s*\*\*", "", md)
        md = re.sub(r" +\n", "\n", md)
        md = re.sub(r" {2,}", " ", md)
        return md.strip() + "\n"


def extrai_secoes(html_txt):
    """Devolve dict id -> html interno da <section>."""
    res = {}
    for m in re.finditer(r'<section id="([^"]+)"[^>]*>(.*?)</section>', html_txt, re.S):
        res[m.group(1)] = m.group(2)
    return res


def main():
    if len(sys.argv) < 2:
        print("uso: converter-wiki.py wiki.html [destino]")
        sys.exit(1)
    origem = sys.argv[1]
    destino = sys.argv[2] if len(sys.argv) > 2 else "src/content/wiki"
    os.makedirs(destino, exist_ok=True)

    bruto = open(origem, encoding="utf-8").read()
    secoes = extrai_secoes(bruto)

    for sid, (slug, titulo, ordem, desc) in SECOES.items():
        if sid not in secoes:
            print(f"  ! seção {sid} não encontrada, pulando")
            continue
        p = ParserSecao()
        p.feed(secoes[sid])
        corpo = p.resultado()
        fm = (
            "---\n"
            f'titulo: "{titulo}"\n'
            f'descricao: "{desc}"\n'
            f"ordem: {ordem}\n"
            f'atualizado: 2026-07-30\n'
            "---\n\n"
        )
        caminho = os.path.join(destino, f"{slug}.md")
        with open(caminho, "w", encoding="utf-8") as f:
            f.write(fm + corpo)
        print(f"  ok  {caminho}  ({len(corpo)} chars)")


if __name__ == "__main__":
    main()
