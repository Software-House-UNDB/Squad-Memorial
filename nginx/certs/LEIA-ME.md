Certificado institucional (opcional) para o nginx de produção.

Coloque aqui `fullchain.pem` e `privkey.pem` e defina no `.env`:

    SSL_CERT=/etc/nginx/certs/fullchain.pem
    SSL_KEY=/etc/nginx/certs/privkey.pem

Sem isso, o nginx usa o certificado do Let's Encrypt (serviço `certbot`) ou, na primeira subida, um provisório.
Os arquivos `.pem` desta pasta ficam fora do git.
