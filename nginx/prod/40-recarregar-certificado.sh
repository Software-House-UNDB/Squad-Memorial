#!/bin/sh
# Recarrega a configuração a cada 12 h: pega o certificado renovado pelo certbot sem derrubar conexões.
(while sleep 43200; do nginx -s reload; done) &
