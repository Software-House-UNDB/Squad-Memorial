#!/bin/sh
# Roda antes do envsubst do modelo. Gera /etc/nginx/conf.d/00-rede-interna.conf com o "geo" que diz quem
# está na rede da escola, a partir de REDE_INTERNA do .env (faixas separadas por espaço ou vírgula).
#
# Quem está fora dessas faixas só alcança o check-in (/check-in/), o agendamento (/agendamento/) e o que
# essas páginas usam; o resto (totens /sala/N, painel, admin, API, fotos e vídeos) fica só na rede interna.
# As regras de cada rota estão no modelo nginx.prod.conf.template ("Acesso de fora da rede").
#
# REDE_INTERNA=todas desliga a restrição (tudo aberto para quem alcançar o servidor).

set -eu

SAIDA=/etc/nginx/conf.d/00-rede-interna.conf
FAIXAS="$(printf '%s' "${REDE_INTERNA:-10.0.0.0/8 172.16.0.0/12 192.168.0.0/16}" | tr ',' ' ')"

{
    echo "# Gerado por 16-rede-interna.sh a partir de REDE_INTERNA. Não edite: mude o .env e recrie o nginx."
    echo "geo \$rede_interna {"
    if [ "$FAIXAS" = "todas" ]; then
        echo "    default 1;"
    else
        echo "    default 0;"
        echo "    127.0.0.1/32 1;"
        echo "    ::1/128 1;"
        for faixa in $FAIXAS; do
            # só IPv4/IPv6 com máscara opcional: nada além disso entra na configuração
            if printf '%s' "$faixa" | grep -Eq '^([0-9]{1,3}\.){3}[0-9]{1,3}(/[0-9]{1,2})?$|^[0-9a-fA-F:]+(/[0-9]{1,3})?$'; then
                echo "    $faixa 1;"
            else
                echo "rede-interna: faixa inválida em REDE_INTERNA: $faixa" >&2
                exit 1
            fi
        done
    fi
    echo "}"
} > "$SAIDA"

if [ "$FAIXAS" = "todas" ]; then
    echo "rede-interna: desligada (REDE_INTERNA=todas): o sistema inteiro fica acessível de fora"
else
    echo "rede-interna: totens, painel e API só para $FAIXAS; de fora, só check-in e agendamento"
fi
