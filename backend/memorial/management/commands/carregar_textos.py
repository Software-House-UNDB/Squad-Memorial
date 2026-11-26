"""Grava os textos das 6 salas: a apresentação e os 7 pontos da linha do tempo de cada uma.

São os textos do PR #11 (feat/textos-das-salas), lidos do mesmo memorial/exemplo/tour.json que o carregar_exemplo usa,
mas sem fotos, vídeos nem ex-alunos de exemplo. Entram como conteúdo oficial (não demonstrativo): o
`carregar_exemplo --remover` não os apaga.

    docker compose exec backend python manage.py carregar_textos

Roda sozinho no entrypoint a cada vez que o backend sobe (desligue com CARREGAR_TEXTOS=0). Só preenche o que está
vazio: a apresentação de uma sala que não tem apresentação, e a linha do tempo de uma sala sem nenhum ponto. O que a
equipe já cadastrou ou editou no painel nunca é trocado.
"""

import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from memorial.models import Acontecimento, Apresentacao, Decada, Sala
from memorial.registro import sem_registro

DADOS = Path(__file__).resolve().parents[2] / "exemplo" / "tour.json"


def gravar_apresentacao(sala, r, **comum):
    return Apresentacao.objects.create(
        sala=sala, titulo=r["aptitle"], texto="\n\n".join(r["intro"]), legenda=r["apcap"], icone=r["apicon"], **comum,
    )


def gravar_linha_do_tempo(sala, r, dados, **comum):
    for i, d in enumerate(r["dec"]):
        decada = Decada.objects.create(
            sala=sala, rotulo=d.get("r") or dados["decn"][i], periodo=d.get("p") or dados["decr"][i], titulo=d["t"],
            resumo=d["d"], icone=d["icn"], ordem=i, **comum,
        )
        for j, evento in enumerate(d["ev"]):
            ano, texto = evento.split(" · ", 1)
            Acontecimento.objects.create(decada=decada, ano=int(ano), texto=texto, ordem=j)
    return len(r["dec"])


class Command(BaseCommand):
    help = "Grava a apresentação e a linha do tempo das 6 salas onde ainda estão vazias (conteúdo oficial)."

    def handle(self, *args, **opts):
        dados = json.loads(DADOS.read_text(encoding="utf-8"))
        comum = {"demonstrativo": False, "publicado": True}
        feitos = []
        with sem_registro(), transaction.atomic():
            for chave, r in dados["R"].items():
                sala = Sala.objects.filter(numero=int(chave)).first()
                if sala is None:
                    continue
                if not Apresentacao.objects.filter(sala=sala).exists():
                    gravar_apresentacao(sala, r, **comum)
                    feitos.append(f"Sala {chave}: apresentação")
                if not Decada.objects.filter(sala=sala).exists():
                    n = gravar_linha_do_tempo(sala, r, dados, **comum)
                    feitos.append(f"Sala {chave}: {n} pontos na linha do tempo")
        for linha in feitos:
            self.stdout.write(linha)
        self.stdout.write("Textos das salas: " + ("gravados." if feitos else "nada a fazer, todas as salas já têm."))
