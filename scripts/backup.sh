#!/usr/bin/env bash
# Backup do Memorial em produção (docker-compose.prod.yml): banco, fotos e vídeos, e o .env.
#
#   scripts/backup.sh               # banco + fotos e vídeos + .env
#   scripts/backup.sh --so-banco    # só o banco (rápido; bom para rodar várias vezes ao dia)
#
# Vai para BACKUP_DIR (padrão: ./backups, ao lado do docker-compose.prod.yml):
#   backups/banco/memorial-AAAA-MM-DD_HHMMSS.dump   pg_dump formato custom (restaura com scripts/restaurar.sh)
#   backups/midia/AAAA-MM-DD_HHMMSS/                cópia de dados/media; arquivos iguais ao backup anterior
#                                                   viram hardlink (não ocupam espaço de novo)
#   backups/config/env-AAAA-MM-DD_HHMMSS            cópia do .env (permissão 600: tem senhas)
# Mantém os BACKUP_MANTER mais novos de cada tipo (padrão: 14).
#
# Agendar (todo dia às 03:00), com: sudo crontab -e
#   0 3 * * * /opt/composers/memorial/scripts/backup.sh >> /opt/composers/memorial/backups/backup.log 2>&1
#
# Os backups ficam no mesmo servidor: copie a pasta backups/ para outro lugar também (outro disco, NAS da TI).
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

# Lê uma variável do ambiente ou, se não houver, do .env (sem executá-lo)
ler_env() {
    local valor="${!1:-}"
    [ -n "$valor" ] && { echo "$valor"; return; }
    valor="$(grep -E "^$1=" .env 2>/dev/null | tail -n 1 | cut -d= -f2- || true)"
    valor="${valor%\"}"; valor="${valor#\"}"
    echo "${valor:-$2}"
}

SO_BANCO=0
case "${1:-}" in
    --so-banco) SO_BANCO=1 ;;
    "") ;;
    *) echo "uso: $0 [--so-banco]" >&2; exit 2 ;;
esac

DADOS_DIR="$(ler_env DADOS_DIR ./dados)"
BACKUP_DIR="$(ler_env BACKUP_DIR ./backups)"
MANTER="$(ler_env BACKUP_MANTER 14)"
COMPOSE=(docker compose -f "$RAIZ/docker-compose.prod.yml")
DATA="$(date +%Y-%m-%d_%H%M%S)"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
falha() { log "ERRO: $*" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"/{banco,midia,config}
chmod 700 "$BACKUP_DIR"

# Um backup por vez (o cron e alguém na mão ao mesmo tempo)
exec 9>"$BACKUP_DIR/.trava"
if command -v flock >/dev/null && ! flock -n 9; then
    falha "outro backup está rodando."
fi

# Mantém só os N mais novos (os nomes começam pela data, então a ordem alfabética é a cronológica)
podar() {
    local pasta="$1" padrao="$2"
    find "$pasta" -mindepth 1 -maxdepth 1 -name "$padrao" -printf '%f\n' | sort | head -n -"$MANTER" |
        while read -r velho; do rm -rf -- "${pasta:?}/$velho"; log "removido backup antigo: $pasta/$velho"; done
}

# ---------------------------------------------------------------- banco
"${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -qx db || falha "o serviço db não está rodando."

ARQ="$BACKUP_DIR/banco/memorial-$DATA.dump"
log "banco: gerando $ARQ"
# Usuário e banco vêm do próprio contêiner: nenhuma senha passa pela linha de comando.
"${COMPOSE[@]}" exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges' > "$ARQ.parcial" \
    || { rm -f "$ARQ.parcial"; falha "pg_dump falhou."; }
# Confere se o arquivo é um dump legível antes de considerar o backup feito
"${COMPOSE[@]}" exec -T db pg_restore --list < "$ARQ.parcial" > /dev/null \
    || { rm -f "$ARQ.parcial"; falha "o dump gerado não é válido."; }
mv "$ARQ.parcial" "$ARQ"
chmod 600 "$ARQ"
log "banco: ok ($(du -h "$ARQ" | cut -f1))"
podar "$BACKUP_DIR/banco" 'memorial-*.dump'

[ "$SO_BANCO" = 1 ] && { log "fim (só banco)."; exit 0; }

# ---------------------------------------------------------------- .env
if [ -f .env ]; then
    install -m 600 .env "$BACKUP_DIR/config/env-$DATA"
    podar "$BACKUP_DIR/config" 'env-*'
fi

# ---------------------------------------------------------------- fotos e vídeos
ORIGEM="$DADOS_DIR/media"
[ -d "$ORIGEM" ] || falha "pasta de mídia não encontrada: $ORIGEM"
DESTINO="$BACKUP_DIR/midia/$DATA"
ANTERIOR="$(find "$BACKUP_DIR/midia" -mindepth 1 -maxdepth 1 -type d ! -name '*.parcial' -printf '%f\n' | sort | tail -n 1)"

find "$BACKUP_DIR/midia" -mindepth 1 -maxdepth 1 -name '*.parcial' -exec rm -rf {} +  # restos de um backup interrompido
log "mídia: copiando $ORIGEM"
if command -v rsync >/dev/null; then
    # Arquivo igual ao do backup anterior vira hardlink: cada backup é completo, mas só o novo ocupa espaço.
    LINK=()
    [ -n "$ANTERIOR" ] && LINK=(--link-dest="$(cd "$BACKUP_DIR/midia/$ANTERIOR" && pwd)")
    rsync -a --delete "${LINK[@]}" "$ORIGEM"/ "$DESTINO.parcial"/
else
    log "mídia: rsync não instalado (apt install rsync); fazendo cópia completa, sem economia de espaço."
    mkdir -p "$DESTINO.parcial"
    cp -a "$ORIGEM"/. "$DESTINO.parcial"/
fi
mv "$DESTINO.parcial" "$DESTINO"
log "mídia: ok ($(find "$DESTINO" -type f | wc -l) arquivos, $(du -sh "$DESTINO" | cut -f1) contando o compartilhado)"
podar "$BACKUP_DIR/midia" '20*'

log "fim. Espaço total dos backups: $(du -sh "$BACKUP_DIR" | cut -f1)"
