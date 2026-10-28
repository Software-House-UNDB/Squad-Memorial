"""Extrai o conteúdo de exemplo do protótipo (constantes DATA e ROOMS) para JSON.

    python3 scripts/extrair_exemplo.py

Gera o mesmo arquivo em dois lugares, porque o backend e o frontend são construídos separadamente
(imagens Docker e Vercel diferentes):
  - backend/memorial/exemplo/tour.json  → usado por `manage.py carregar_exemplo`
  - frontend/src/dados/exemplo.json     → usado pelo modo demonstração (VITE_MODO_DEMO=1)
"""

import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PROTOTIPO = RAIZ / "docs/referencia/tour-memorial-dom-bosco.html"
DESTINOS = [RAIZ / "backend/memorial/exemplo/tour.json", RAIZ / "frontend/src/dados/exemplo.json"]


def objeto_js(texto, nome):
    """Recorta o literal `const NOME={...};` respeitando chaves aninhadas e strings."""
    inicio = texto.index(f"const {nome}=") + len(f"const {nome}=")
    nivel, em_string, escape = 0, None, False
    for i, c in enumerate(texto[inicio:], start=inicio):
        if em_string:
            if escape:
                escape = False
            elif c == "\\":
                escape = True
            elif c == em_string:
                em_string = None
        elif c in "'\"":
            em_string = c
        elif c == "{":
            nivel += 1
        elif c == "}":
            nivel -= 1
            if nivel == 0:
                return texto[inicio:i + 1]
    raise ValueError(f"{nome} sem fim")


def js_para_json(literal):
    """ROOMS usa chaves sem aspas e strings com aspas simples; DATA já é JSON."""
    s = re.sub(r"([{,]\s*)([A-Za-z_]\w*|\d+)\s*:", r'\1"\2":', literal)
    return re.sub(r"'([^'\\]*)'", lambda m: json.dumps(m.group(1), ensure_ascii=False), s)


def main():
    html = PROTOTIPO.read_text(encoding="utf-8")
    dados = json.loads(objeto_js(html, "DATA"))
    salas = json.loads(js_para_json(objeto_js(html, "ROOMS")))
    saida = {"salas": salas, **dados}
    texto = json.dumps(saida, ensure_ascii=False, indent=1) + "\n"
    for destino in DESTINOS:
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_text(texto, encoding="utf-8")
        print(f"{destino.relative_to(RAIZ)}: {len(texto)} bytes")
    print(f"{len(salas)} salas, {len(dados['people'])} ex-alunos, "
          f"{sum(len(h['years']) for h in dados['hist'].values())} marcos")


if __name__ == "__main__":
    sys.exit(main())
