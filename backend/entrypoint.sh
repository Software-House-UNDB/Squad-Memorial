#!/bin/sh
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Textos das salas (apresentação e linha do tempo): só preenche as salas que ainda estão vazias.
# CARREGAR_TEXTOS=0 desliga.
if [ "${CARREGAR_TEXTOS:-1}" != "0" ]; then
  python manage.py carregar_textos
fi

# Cria o superusuário só se as variáveis existirem e ele ainda não existir
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py createsuperuser --noinput 2>/dev/null || true
fi

exec "$@"
