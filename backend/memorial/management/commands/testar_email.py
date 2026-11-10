"""Confere a configuração de e-mail (EMAIL_*) mandando uma mensagem de teste.

    docker compose exec backend python manage.py testar_email voce@escola.edu.br
    docker compose exec backend python manage.py testar_email          # para a equipe que recebe os avisos
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from memorial.notificacoes import ErroEmail, destinatarios, email_configurado, enviar_teste


class Command(BaseCommand):
    help = "Envia um e-mail de teste com a configuração EMAIL_* do servidor."

    def add_arguments(self, parser):
        parser.add_argument("para", nargs="*", help="Destinatários. Vazio = quem recebe os avisos de aprovação.")

    def handle(self, *args, para, **opcoes):
        if not email_configurado():
            raise CommandError("EMAIL_HOST está vazio: o aviso por e-mail está desligado.")
        para = para or destinatarios()
        if not para:
            raise CommandError("Nenhum superusuário ou membro do grupo Administrativo tem e-mail cadastrado.")
        modo = "SSL" if settings.EMAIL_USE_SSL else "STARTTLS" if settings.EMAIL_USE_TLS else "sem criptografia"
        self.stdout.write(f"Servidor {settings.EMAIL_HOST}:{settings.EMAIL_PORT} ({modo}), remetente {settings.DEFAULT_FROM_EMAIL}.")
        falhas = 0
        for email in para:
            try:
                enviar_teste(email, "/administracao/")
            except ErroEmail as exc:
                falhas += 1
                self.stderr.write(f"{email}: não enviado: {exc}")
            else:
                self.stdout.write(self.style.SUCCESS(f"{email}: enviado."))
        if falhas:
            raise CommandError(f"{falhas} de {len(para)} e-mail(s) não enviado(s).")
