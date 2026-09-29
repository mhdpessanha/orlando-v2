"""Gera as caricaturas do site a partir dos PNGs originais (fundo transparente).

Pra cada <Nome>.png da pasta de origem gera, em data/avatars/:
  <nome>.webp        rosto: recorte quadrado a partir do topo da cabeça (384 px)
  <nome>-busto.webp  busto inteiro (480 px de altura), usado na Turma

O nome do arquivo vira a chave: primeiro nome sem acento, minúsculo — tem que bater
com o nome da aba Turma ("Olivia.png" → olivia). Apelidos vão no dicionário APELIDOS.
As imagens ficam fora do git (o repo é público e tem as crianças).

Uso (precisa de Pillow):
  python3 -m venv /tmp/venv && /tmp/venv/bin/pip install pillow
  /tmp/venv/bin/python scripts/caricaturas.py ~/Desktop/"Removed BG"
"""

import glob
import os
import sys
import unicodedata

from PIL import Image

APELIDOS = {"mari": "mariana"}
DESTINO = os.path.join(os.path.dirname(__file__), "..", "data", "avatars")


def chave(caminho: str) -> str:
    base = os.path.splitext(os.path.basename(caminho))[0]
    base = unicodedata.normalize("NFD", base).encode("ascii", "ignore").decode().lower().split()[0]
    return APELIDOS.get(base, base)


def processar(caminho: str) -> None:
    im = Image.open(caminho).convert("RGBA")
    w, h = im.size
    alfa = im.getchannel("A").load()
    # topo da cabeça: 1ª linha com pixels opacos; centro: média dos opacos no terço de cima
    topo = next(y for y in range(h) if sum(1 for x in range(0, w, 2) if alfa[x, y] > 128) >= 8)
    xs = [x for y in range(topo, min(h, topo + int(0.3 * h)), 4) for x in range(0, w, 4) if alfa[x, y] > 128]
    cx = sum(xs) / len(xs)
    lado = int(0.80 * w)
    t = max(0, int(topo - 0.03 * lado))
    l = int(min(max(cx - lado / 2, 0), w - lado))

    k = chave(caminho)
    rosto = im.crop((l, t, l + lado, t + lado)).resize((384, 384), Image.LANCZOS)
    rosto.save(os.path.join(DESTINO, f"{k}.webp"), "WEBP", quality=90, method=6)
    busto = im.crop(im.getbbox())
    busto = busto.resize((round(busto.width * 480 / busto.height), 480), Image.LANCZOS)
    busto.save(os.path.join(DESTINO, f"{k}-busto.webp"), "WEBP", quality=90, method=6)
    print(f"{os.path.basename(caminho)} → {k}.webp, {k}-busto.webp")


if __name__ == "__main__":
    origem = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(DESTINO, exist_ok=True)
    for arquivo in sorted(glob.glob(os.path.join(origem, "*.png"))):
        processar(arquivo)
