"""Leitura das ATAs de alunos (planilha .xlsx, uma aba por ano/unidade) para o comando importar_ata.

A planilha da escola não tem um formato só: cada aba foi digitada por uma pessoa, em uma época. As colunas
mudam de ordem (ALUNO/PL/CURSO/TURMA, ALUNO/TURMA/PL, ALUNO/RA/PL/STATUS/CURSO/TURMA...), algumas abas não
têm cabeçalho, outras têm o cabeçalho no fim ou linhas de título ("ANO DE 1988", "TURMA 11") no meio.
Por isso as colunas não são lidas pela posição nem pelo cabeçalho, e sim pelo que cada célula contém:

- a 1ª coluna é sempre o nome;
- número entre 1950 e 2030 ou texto de 4 dígitos → ano letivo (PL);
- "Centro", "Renascença" → unidade;
- "001-012345" → RA (matrícula, identifica a pessoa de 2012 em diante);
- "Matriculado", "Transferido", "Cancelado"... → situação na ata;
- "Ensino Médio", "Primário", "Ginásio", "1º grau", "Educação Infantil 2" → curso;
- "8º SÉRIE", "2ª séríe" (só a série) → série;
- o resto ("301", "P10M", "C202", "EF60M", "T. 80", "6ª SÉRIE 61") → turma.

O ano vem do nome da aba ("1993 CENTRO" → 1993), que é o que a escola conferiu; o PL da linha só é usado
se a aba não tiver ano no nome.
"""

from __future__ import annotations

import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field

from .models import normalizar

ANO_MIN, ANO_MAX = 1950, 2030
TURMA_MAX = 30  # Aluno.turma
NOME_MAX = 120  # Aluno.nome
SEM_TURMA = "—"
LACUNA_HOMONIMO = 8  # anos sem aparecer na ata: daí em diante é tratado como outra pessoa de mesmo nome

_PARTICULAS = {"de", "da", "do", "das", "dos", "e", "di", "du", "del", "van", "von"}
_SITUACOES = {
    "matriculado", "transferido", "remanejado", "cancelado", "inabilitado", "concluido", "aprovado",
    "reprovado", "desistente", "evadido", "trancado",
}
_CABECALHOS = {
    "aluno", "alunos", "nome", "pl", "turma", "curso", "ra", "status", "unidade", "local", "ano", "serie",
    "conferir", "verificar qual ata", "obs", "obs.:",
}
_CURSO = re.compile(r"ensino|enino|primari|ginasi|colegial|grau|educa|infantil|jardim|maternal|cientifico|classico")
_SERIE_SO = re.compile(r"^\d+\s*[ºª°oa]?\s*(serie|ano)$")
_RA = re.compile(r"^\d{3}-\d{4,}$")
_ANO_TEXTO = re.compile(r"^(19[5-9]\d|20[0-3]\d)$")
# linhas que não são aluno: títulos e cabeçalhos repetidos no meio da aba
_NAO_NOME = re.compile(
    r"^(ano de|turma\b|aluno|nome\b|continuacao|unidade|centro\b|renascenca\b|\d)|^[^a-z]*$|\bserie\b|:"
)
# anotação de quem digitou: "(conferir)", "[grafia incerta]"
_ANOTACAO = re.compile(r"\s*[\(\[][^\)\]]*[\)\]]?|[\[\]\(\)]")


@dataclass
class Linha:
    aba: str
    linha: int
    nome: str
    ano: int
    turma: str
    curso: str = ""
    unidade: str = ""
    ra: str = ""
    situacao: str = ""
    nota: str = ""

    @property
    def chave(self):
        return normalizar(self.nome), self.ano


@dataclass
class Leitura:
    linhas: list[Linha] = field(default_factory=list)
    ignoradas: Counter = field(default_factory=Counter)  # motivo → quantidade
    exemplos_ignorados: dict = field(default_factory=dict)  # motivo → [(aba, linha, texto)]
    repetidas: int = 0  # mesma pessoa no mesmo ano (duas abas, ou duas vezes na aba)
    sem_turma: int = 0
    nome_curto: list = field(default_factory=list)  # uma palavra só: pode estar incompleto na ata
    abas: dict = field(default_factory=dict)  # aba → alunos lidos

    def ignorar(self, motivo, aba, n, texto=""):
        self.ignoradas[motivo] += 1
        ex = self.exemplos_ignorados.setdefault(motivo, [])
        if len(ex) < 5:
            ex.append((aba, n, texto))


def _texto(valor) -> str:
    if valor is None:
        return ""
    if isinstance(valor, float) and valor.is_integer():
        valor = int(valor)
    return re.sub(r"\s+", " ", str(valor).replace("\xa0", " ")).strip()


def _sem_acento(t: str) -> str:
    return normalizar(t)


def nome_bonito(nome: str) -> str:
    """'JOSÉ DA SILVA  JUNIOR ' → 'José da Silva Junior'. Nome já em caixa mista fica como está.

    Também limpa sobras de digitação: "M, Ferreira" e "F> de" viram "M. Ferreira" e "F. de"; "|", "?" e "•" saem.
    """
    nome = re.sub(r"[|?•*]", " ", nome.replace("\xa0", " "))
    nome = re.sub(r"\b(\w)\s*[,>]\s*", r"\1. ", nome)
    nome = re.sub(r"\s+", " ", nome).strip(" .,;-'\"/–")
    if nome != nome.upper() and nome != nome.lower():
        return nome[:NOME_MAX]
    partes = []
    for i, p in enumerate(nome.lower().split(" ")):
        if i and p in _PARTICULAS:
            partes.append(p)
        elif re.fullmatch(r"[ivx]+", p) and i:  # "Pedro II"
            partes.append(p.upper())
        else:
            partes.append("-".join(s[:1].upper() + s[1:] for s in p.split("-")))
    return " ".join(partes)[:NOME_MAX]


def _arrumar_turma(t: str) -> str:
    t = t.replace("séríe", "série").replace("SÉRÍE", "SÉRIE")
    t = re.sub(r"(?i)s[ée]rie", "série", t)
    t = re.sub(r"(\d)\s*([ºª°])\s*", r"\1\2 ", t).replace("  ", " ")
    return t.strip()


def classificar(valor) -> tuple[str, str]:
    """Diz o que uma célula (fora a do nome) é: ('ano'|'unidade'|'ra'|'situacao'|'curso'|'serie'|'turma'|'', texto)."""
    if isinstance(valor, (int, float)) and not isinstance(valor, bool):
        n = int(valor)
        if ANO_MIN <= n <= ANO_MAX:
            return "ano", str(n)
        return ("turma", str(n)) if n > 0 else ("", "")
    t = _texto(valor)
    if not t:
        return "", ""
    s = _sem_acento(t)
    if s in _CABECALHOS or s in {"/", "'"}:
        return "", ""
    if _ANO_TEXTO.match(s):
        return "ano", s
    if _RA.match(s):
        return "ra", t
    if s in _SITUACOES:
        return "situacao", t.capitalize()
    if s in {"centro"}:
        return "unidade", "Centro"
    if s.startswith("renasc"):
        return "unidade", "Renascença"
    if _CURSO.search(s):
        return "curso", t
    if _SERIE_SO.match(s):
        return "serie", _arrumar_turma(t)
    return "turma", _arrumar_turma(t)


def _unidade_da_aba(titulo: str) -> str:
    s = _sem_acento(titulo)
    if "centro" in s:
        return "Centro"
    if "renas" in s:
        return "Renascença"
    return ""


def montar_turma(turma: str, serie: str, curso: str, unidade: str, com_unidade: bool) -> str:
    """Turma como vai para o sistema: o código da ata; sem código, a série; sem série, o curso.

    Nos anos em que a escola tinha duas unidades, a unidade vai junto ("301 · Centro"), senão as turmas
    "301" do Centro e da Renascença virariam uma turma só na lista de colegas.
    """
    base = turma or serie or curso or SEM_TURMA
    if com_unidade and unidade and base != SEM_TURMA:
        sufixo = f" · {unidade}"
        return base[: TURMA_MAX - len(sufixo)].rstrip() + sufixo
    return base[:TURMA_MAX]


def ler_planilha(caminho, abas_ignoradas=("controle",)) -> Leitura:
    """Lê todas as abas de alunos. Não grava nada: o comando decide o que fazer com o resultado."""
    import openpyxl  # só o comando precisa; não pesa no resto do backend

    wb = openpyxl.load_workbook(caminho, read_only=True, data_only=True)
    leitura = Leitura()
    brutas = []
    anos_com_unidade = set()
    for ws in wb.worksheets:
        titulo = ws.title.strip()
        if _sem_acento(titulo) in abas_ignoradas:
            continue
        m = re.search(r"(19|20)\d{2}", titulo)
        ano_aba = int(m.group()) if m else None
        unidade_aba = _unidade_da_aba(titulo)
        for n, linha in enumerate(ws.iter_rows(values_only=True), start=1):
            if not linha or all(_texto(c) == "" for c in linha):
                continue
            nome = _texto(linha[0])
            nota = "; ".join(x.strip(" ()[]") for x in re.findall(r"[\(\[][^\)\]]*[\)\]]?", nome))
            nome = _ANOTACAO.sub(" ", nome).strip()
            campos = {}
            for c in linha[1:]:
                tipo, valor = classificar(c)
                if tipo and tipo not in campos:
                    campos[tipo] = valor
            if not nome:
                leitura.ignorar("linha sem nome", titulo, n, " | ".join(_texto(c) for c in linha if _texto(c)))
                continue
            if _NAO_NOME.search(_sem_acento(nome)) or len(_sem_acento(nome)) < 3:
                leitura.ignorar("título ou cabeçalho, não é aluno", titulo, n, nome)
                continue
            ano = ano_aba or (int(campos["ano"]) if "ano" in campos else None)
            if not ano:
                leitura.ignorar("sem ano (nem na aba, nem na linha)", titulo, n, nome)
                continue
            unidade = unidade_aba or campos.get("unidade", "")
            if unidade:
                anos_com_unidade.add((ano, unidade))
            # "ENSINO MÉDIO - RENASCENÇA": o curso traz a unidade junto
            curso = campos.get("curso", "")
            if not unidade and "renasc" in _sem_acento(curso):
                unidade = "Renascença"
            curso = re.sub(r"(?i)\s*-\s*renascen[çc]a\s*$", "", curso).strip()
            brutas.append((titulo, n, nome, ano, campos, curso, unidade, nota))

    # unidade na turma só nos anos em que houve mais de uma unidade na ata
    duas_unidades = {a for a in {a for a, _ in anos_com_unidade} if len({u for x, u in anos_com_unidade if x == a}) > 1}

    vistas: dict[tuple, Linha] = {}
    for titulo, n, nome, ano, campos, curso, unidade, nota in brutas:
        turma = montar_turma(campos.get("turma", ""), campos.get("serie", ""), curso, unidade, ano in duas_unidades)
        item = Linha(
            aba=titulo, linha=n, nome=nome_bonito(nome), ano=ano, turma=turma, curso=curso, unidade=unidade,
            ra=campos.get("ra", ""), situacao=campos.get("situacao", ""), nota=nota,
        )
        anterior = vistas.get(item.chave)
        if anterior:
            leitura.repetidas += 1
            if anterior.turma == SEM_TURMA and item.turma != SEM_TURMA:
                vistas[item.chave] = item  # fica a linha mais completa
            continue
        vistas[item.chave] = item

    for item in vistas.values():
        leitura.linhas.append(item)
        leitura.abas[item.aba] = leitura.abas.get(item.aba, 0) + 1
        if item.turma == SEM_TURMA:
            leitura.sem_turma += 1
        if " " not in item.nome:
            leitura.nome_curto.append((item.aba, item.linha, item.nome))
    leitura.linhas.sort(key=lambda x: (x.ano, x.aba, x.linha))
    return leitura


def caractere_estranho(nome: str) -> bool:
    """Nome com dígito ou símbolo fora do comum (para o relatório: vale conferir na ata em papel)."""
    return any(unicodedata.category(c)[0] not in "LZ" and c not in ".'-‘’`´" for c in nome)


@dataclass
class Pessoa:
    """Uma pessoa da ata: todos os anos em que o nome (ou o RA) aparece. Vai para o sistema com o último ano."""

    nome: str
    historico: list[Linha]

    @property
    def ultima(self) -> Linha:
        return self.historico[-1]

    @property
    def ano(self) -> int:
        return self.ultima.ano

    @property
    def turma(self) -> str:
        # o último ano pode ter vindo sem turma: usa a turma mais recente que houver
        for h in reversed(self.historico):
            if h.turma != SEM_TURMA:
                return h.turma
        return SEM_TURMA

    def historico_json(self) -> list[dict]:
        itens = []
        for h in self.historico:
            item = {"ano": h.ano, "turma": h.turma, "aba": h.aba}
            for campo in ("curso", "unidade", "situacao", "nota"):
                if getattr(h, campo):
                    item[campo] = getattr(h, campo)
            itens.append(item)
        return itens


def agrupar_pessoas(linhas: list[Linha]) -> list[Pessoa]:
    """Junta os anos da mesma pessoa: mesmo nome (sem acento/caixa) ou mesmo RA (a grafia muda entre anos).

    Se o nome some por LACUNA_HOMONIMO anos ou mais e volta, são duas pessoas (homônimos de épocas diferentes).
    Dois homônimos no mesmo ano já chegam como uma linha só (a ata não tem como separar).
    """
    pai: dict = {}

    def raiz(x):
        while pai.setdefault(x, x) != x:
            pai[x] = pai[pai[x]]
            x = pai[x]
        return x

    def unir(a, b):
        pai[raiz(a)] = raiz(b)

    for item in linhas:
        chave = ("n", item.chave[0])
        raiz(chave)
        if item.ra:
            unir(("r", item.ra), chave)
    grupos: dict = {}
    for item in linhas:
        grupos.setdefault(raiz(("n", item.chave[0])), []).append(item)
    pessoas = []
    for itens in grupos.values():
        itens.sort(key=lambda x: (x.ano, x.aba, x.linha))
        # dois nomes (grafias) no mesmo ano pelo RA: fica um registro por ano
        por_ano = {}
        for it in itens:
            por_ano.setdefault(it.ano, it)
        historico = sorted(por_ano.values(), key=lambda x: x.ano)
        # intervalo de LACUNA_HOMONIMO anos ou mais sem aparecer: é outra pessoa com o mesmo nome
        inicio = 0
        for i in range(1, len(historico) + 1):
            if i == len(historico) or historico[i].ano - historico[i - 1].ano >= LACUNA_HOMONIMO:
                trecho = historico[inicio:i]
                pessoas.append(Pessoa(nome=trecho[-1].nome, historico=trecho))
                inicio = i
    pessoas.sort(key=lambda p: (p.ano, normalizar(p.nome)))
    return pessoas



