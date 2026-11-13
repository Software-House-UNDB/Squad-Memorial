#!/usr/bin/env bash
# Restaura um backup feito por scripts/backup.sh.
#
#   scripts/restaurar.sh banco backups/banco/memorial-2026-11-12_030000.dump
#   scripts/restaurar.sh midia backups/midia/2026-11-12_030000
#   scripts/restaurar.sh listar                      # mostra os backups disponíveis
#
# Antes de restaurar o banco, faz um backup do estado atual (backups/banco/antes-de-restaurar-*.dump).
# O sistema fica fora do ar durante a restauração (backend e nginx parados) e volta no fim.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

ler_env() {
    local valor="${!1:-}"
    [ -n "$valor" ] && { echo "$valor"; return; }
    valor="$(grep -E "^$1=" .env 2>/dev/null | tail -n 1 | cut -d= -f2- || true)"
    valor="${valor%\"}"; valor="${valor#\"}"
    echo "${valor:-$2}"
}

DADOS_DIR="$(ler_env DADOS_DIR ./dados)"
BACKUP_DIR="$(ler_env BACKUP_DIR ./backups)"
COMPOSE=(docker compose -f "$RAIZ/docker-compose.prod.yml")

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
falha() { log "ERRO: $*" >&2; exit 1; }

confirmar() {
    [ "${CONFIRMAR:-}" = "sim" ] && return  # para automação: CONFIRMAR=sim scripts/restaurar.sh ...
    echo
    echo "ATENÇÃO: $1"
    read -r -p "Digite RESTAURAR para continuar: " resposta
    [ "$resposta" = "RESTAURAR" ] || falha "cancelado."
}

voltar() { log "subindo o sistema de novo"; "${COMPOSE[@]}" up -d backend nginx >/dev/null; }

case "${1:-}" in
listar)
    echo "Banco ($BACKUP_DIR/banco):"; ls -1t "$BACKUP_DIR/banco" 2>/dev/null | sed 's/^/  /' || true
    echo "Fotos e vídeos ($BACKUP_DIR/midia):"; ls -1t "$BACKUP_DIR/midia" 2>/dev/null | sed 's/^/  /' || true
    ;;

banco)
    ARQ="${2:-}"
    [ -f "$ARQ" ] || falha "informe o arquivo .dump (veja: $0 listar)"
    "${COMPOSE[@]}" exec -T db pg_restore --list < "$ARQ" > /dev/null || falha "$ARQ não é um dump válido."
    confirmar "o banco atual será SUBSTITUÍDO pelo de $ARQ."

    SEGURANCA="$BACKUP_DIR/banco/antes-de-restaurar-$(date +%Y-%m-%d_%H%M%S).dump"
    log "guardando o banco atual em $SEGURANCA"
    "${COMPOSE[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges' > "$SEGURANCA"
    chmod 600 "$SEGURANCA"

    log "parando backend e nginx"
    "${COMPOSE[@]}" stop nginx backend >/dev/null
    trap voltar EXIT

    log "restaurando $ARQ"
    # Recria o banco do zero: nada do estado atual sobra misturado com o backup.
    "${COMPOSE[@]}" exec -T db sh -c '
        dropdb -U "$POSTGRES_USER" --if-exists --force "$POSTGRES_DB" &&
        createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$POSTGRES_DB" &&
        pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges --exit-on-error' < "$ARQ"
    log "banco restaurado. (o backend aplica migrações novas, se houver, ao subir)"
    ;;

midia)
    PASTA="${2:-}"
    [ -d "$PASTA" ] || falha "informe a pasta do backup de mídia (veja: $0 listar)"
    confirmar "as fotos e vídeos de $DADOS_DIR/media serão SUBSTITUÍDOS pelos de $PASTA (o que não estiver no backup será apagado)."

    log "parando backend e nginx"
    "${COMPOSE[@]}" stop nginx backend >/dev/null
    trap voltar EXIT

    # Dentro do contêiner "permissoes" (root, com dados/media montado): não depende de sudo nem de rsync no host.
    PASTA_ABS="$(cd "$PASTA" && pwd)"
    "${COMPOSE[@]}" run --rm --no-deps -v "$PASTA_ABS":/backup:ro permissoes \
        'find /app/media -mindepth 1 -delete && cp -a /backup/. /app/media/ && chown -R 10001:10001 /app/media' >/dev/null
    log "mídia restaurada ($(find "$DADOS_DIR/media" -type f | wc -l) arquivos)."
    ;;

*)
    echo "uso: $0 listar | banco <arquivo.dump> | midia <pasta>" >&2
    exit 2
    ;;
esac
