"""Importa os alunos das ATAs da escola (planilha .xlsx, uma aba por ano/unidade) para a Sala 06.

    # na VM, na pasta do projeto: a planilha vai pela entrada padrão (não precisa copiar para o container)
    docker compose -f docker-compose.prod.yml exec -T backend python manage.py importar_ata - --simular < ata.xlsx
    docker compose -f docker-compose.prod.yml exec -T backend python manage.py importar_ata - < ata.xlsx

    --simular            lê e mostra o relatório, sem gravar nada
    --visivel-ate 2012   quem saiu (último ano na ata) até este ano aparece na Sala 06; depois, entra oculto
    --relatorio X.csv    grava uma linha por pessoa (e as linhas ignoradas) para conferir na planilha
    --remover            apaga os cadastros da ata que ninguém completou com check-in

A leitura das abas está em memorial/ata.py. Cada pessoa vira UM cadastro, com o último ano e a última turma
em que aparece; todos os anos ficam guardados em historico_ata e aparecem no perfil ("Na ata de 1980 a 1991").

Rodar de novo é seguro: quem já veio da ata é atualizado, não duplicado. Quem já fez check-in com o mesmo
nome em um dos anos da ata não ganha outro cadastro: o check-in recebe o histórico da ata.
"""

import csv
import io
import sys
from collections import Counter
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from memorial.ata import SEM_TURMA, agrupar_pessoas, caractere_estranho, ler_planilha
from memorial.models import Aluno, Registro, chave_turma, normalizar
from memorial.registro import registrar, sem_registro

AUTOR = "Comando importar_ata"
LOTE = 1000


def _data_da_ata(ano):
    """Data do "check-in" de quem veio da ata: o fim do último ano letivo (nunca conta como check-in novo)."""
    return timezone.make_aware(datetime(ano, 12, 31, 12, 0))


class Command(BaseCommand):
    help = "Importa os alunos das ATAs (planilha .xlsx) para a Sala 06, um cadastro por pessoa."

    def add_arguments(self, parser):
        parser.add_argument("arquivo", nargs="?", help='Caminho do .xlsx, ou "-" para ler da entrada padrão.')
        parser.add_argument("--simular", action="store_true", help="Só lê e mostra o relatório; não grava nada.")
        parser.add_argument(
            "--visivel-ate", type=int, default=2012,
            help="Último ano na ata até o qual a pessoa aparece na Sala 06 (padrão 2012). Depois disso entra oculta.",
        )
        parser.add_argument("--relatorio", help="CSV com uma linha por pessoa e as linhas ignoradas.")
        parser.add_argument("--remover", action="store_true", help="Apaga os cadastros da ata ainda sem check-in.")

    def handle(self, *args, arquivo, simular, visivel_ate, relatorio, remover, **opcoes):
        if remover:
            return self._remover(simular)
        if not arquivo:
            raise CommandError('Informe a planilha: importar_ata ata.xlsx, ou importar_ata - < ata.xlsx.')

        origem = io.BytesIO(sys.stdin.buffer.read()) if arquivo == "-" else arquivo
        try:
            leitura = ler_planilha(origem)
        except FileNotFoundError:
            raise CommandError(f"Arquivo não encontrado: {arquivo}") from None
        except Exception as e:  # planilha corrompida ou não é .xlsx
            raise CommandError(f"Não consegui abrir a planilha ({type(e).__name__}: {e}).") from None
        if not leitura.linhas:
            raise CommandError("Nenhum aluno encontrado na planilha.")

        pessoas = agrupar_pessoas(leitura.linhas)
        self._resumo_leitura(leitura, pessoas, visivel_ate)

        novos, atualizados, juntados = self._planejar(pessoas)
        self.stdout.write("")
        self.stdout.write(f"Cadastros novos: {len(novos)}")
        self.stdout.write(f"Já vieram da ata antes (atualizados): {len(atualizados)}")
        self.stdout.write(f"Já tinham feito check-in (recebem o histórico da ata): {len(juntados)}")

        if relatorio:
            self._relatorio(relatorio, leitura, pessoas, visivel_ate)
            self.stdout.write(f"Relatório: {relatorio}")

        if simular:
            self.stdout.write(self.style.WARNING("Simulação: nada foi gravado."))
            return

        with sem_registro(), transaction.atomic():
            criados = self._criar(novos, visivel_ate)
            mudados = self._atualizar(atualizados, juntados)
        registrar(
            Registro.Tipo.CADASTRO_CRIADO,
            f"Importação da ata: {criados} cadastro(s) novo(s), {mudados + len(juntados)} atualizado(s)",
            autor=AUTOR,
        )
        visiveis = Aluno.objects.filter(da_ata=True, status=Aluno.Status.APROVADO).count()
        self.stdout.write(self.style.SUCCESS(
            f"Pronto: {criados} cadastro(s) criado(s). Da ata, {visiveis} aparecem na Sala 06; "
            "os ocultos podem ser liberados no admin (Ex-alunos → filtrar por ano → Aprovar)."
        ))

    # ------------------------------------------------------------------ leitura e relatório

    def _resumo_leitura(self, leitura, pessoas, visivel_ate):
        w = self.stdout.write
        w(f"Abas lidas: {len(leitura.abas)}")
        for aba, n in sorted(leitura.abas.items(), key=lambda x: (x[0].strip()[:4], x[0])):
            w(f"  {aba.strip():<22} {n:>5} aluno(s)")
        w(f"Linhas de aluno (nome + ano): {len(leitura.linhas)}")
        w(f"Repetidas no mesmo ano (duas abas ou duas vezes na aba), contadas uma vez: {leitura.repetidas}")
        for motivo, n in leitura.ignoradas.most_common():
            exemplos = "; ".join(f"{a.strip()} l.{ln}: {t}" for a, ln, t in leitura.exemplos_ignorados[motivo][:3])
            w(f"Ignoradas ({motivo}): {n}   ex.: {exemplos}")
        visiveis = sum(p.ano <= visivel_ate for p in pessoas)
        w(f"Pessoas (anos juntados pelo nome): {len(pessoas)}")
        w(f"  aparecem na Sala 06 (último ano até {visivel_ate}): {visiveis}")
        w(f"  entram ocultas (último ano depois de {visivel_ate}): {len(pessoas) - visiveis}")
        w(f"  sem turma na ata (ficam com '{SEM_TURMA}'): {sum(p.turma == SEM_TURMA for p in pessoas)}")
        estranhos = [p.nome for p in pessoas if caractere_estranho(p.nome) or " " not in p.nome]
        if estranhos:
            w(f"  nomes para conferir (uma palavra só ou caractere estranho): {', '.join(estranhos[:15])}")

    def _relatorio(self, caminho, leitura, pessoas, visivel_ate):
        with open(caminho, "w", newline="", encoding="utf-8-sig") as f:  # BOM: o Excel abre com acento certo
            out = csv.writer(f, delimiter=";")
            out.writerow(["nome", "ano (último)", "turma", "anos na ata", "na sala 06", "abas", "anotações", "situação"])
            for p in pessoas:
                out.writerow([
                    p.nome, p.ano, p.turma, " ".join(str(h.ano) for h in p.historico),
                    "sim" if p.ano <= visivel_ate else "não (oculto)",
                    " | ".join(sorted({h.aba.strip() for h in p.historico})),
                    " | ".join(h.nota for h in p.historico if h.nota),
                    p.ultima.situacao,
                ])
            out.writerow([])
            out.writerow(["linhas ignoradas", "motivo", "aba", "linha"])
            for motivo, exemplos in leitura.exemplos_ignorados.items():
                for aba, n, texto in exemplos:
                    out.writerow([texto, motivo, aba.strip(), n])

    # ------------------------------------------------------------------ gravação

    def _planejar(self, pessoas):
        """Separa quem é novo, quem já veio da ata antes e quem já fez check-in com o mesmo nome."""
        da_ata = {(a.nome_busca, a.ano): a for a in Aluno.objects.filter(da_ata=True)}
        checkins = {}
        for a in Aluno.objects.filter(da_ata=False, demonstrativo=False):
            checkins.setdefault(a.nome_busca, []).append(a)
        novos, atualizados, juntados = [], [], []
        usados = set()
        for p in pessoas:
            chave = normalizar(p.nome)
            anos = {h.ano for h in p.historico}
            existente = da_ata.get((chave, p.ano))
            if existente:
                atualizados.append((existente, p))
                continue
            feito = next((a for a in checkins.get(chave, []) if a.ano in anos and a.pk not in usados), None)
            if feito:
                usados.add(feito.pk)
                juntados.append((feito, p))
                continue
            novos.append(p)
        return novos, atualizados, juntados

    def _criar(self, pessoas, visivel_ate):
        objetos = []
        criados = 0
        por_ano = Counter()
        for p in pessoas:
            turma = p.turma
            objetos.append(Aluno(
                nome=p.nome, nome_busca=normalizar(p.nome), ano=p.ano, turma=turma, turma_chave=chave_turma(turma),
                origem=Aluno.Origem.IMPORTADO, consentimento=False, checkin_em=_data_da_ata(p.ano),
                status=Aluno.Status.APROVADO if p.ano <= visivel_ate else Aluno.Status.OCULTO,
                da_ata=True, historico_ata=p.historico_json(),
            ))
            por_ano[p.ano] += 1
            if len(objetos) >= LOTE:
                Aluno.objects.bulk_create(objetos)  # sem save(): nome_busca e turma_chave já vão calculados
                criados += len(objetos)
                objetos = []
                self.stdout.write(f"  … {criados} gravados (até {p.ano})")
        if objetos:
            Aluno.objects.bulk_create(objetos)
            criados += len(objetos)
        return criados

    def _atualizar(self, atualizados, juntados):
        """Rodar de novo só grava o que mudou na planilha (em lote: são dezenas de milhares de linhas)."""
        mudados = []
        for aluno, p in atualizados:
            historico = p.historico_json()
            turma = p.turma if aluno.turma == SEM_TURMA and p.turma != SEM_TURMA else aluno.turma
            if historico != aluno.historico_ata or turma != aluno.turma:
                aluno.historico_ata, aluno.turma, aluno.turma_chave = historico, turma, chave_turma(turma)
                mudados.append(aluno)
        Aluno.objects.bulk_update(mudados, ["historico_ata", "turma", "turma_chave"], batch_size=LOTE)
        for aluno, p in juntados:
            # quem fez check-in manda no próprio cadastro: só ganha o histórico da ata
            aluno.da_ata = True
            aluno.historico_ata = p.historico_json()
        Aluno.objects.bulk_update([a for a, _ in juntados], ["da_ata", "historico_ata"], batch_size=LOTE)
        return len(mudados)

    def _remover(self, simular):
        qs = Aluno.objects.filter(da_ata=True, consentimento=False, email="")
        n = qs.count()
        if simular:
            self.stdout.write(f"Seriam removidos {n} cadastro(s) da ata ainda sem check-in. Nada foi apagado.")
            return
        with sem_registro():
            qs.delete()
        registrar(Registro.Tipo.CADASTRO_REMOVIDO, f"Importação da ata desfeita: {n} cadastro(s) removido(s)", autor=AUTOR)
        self.stdout.write(self.style.SUCCESS(f"{n} cadastro(s) da ata removido(s). Quem já fez check-in ficou."))
