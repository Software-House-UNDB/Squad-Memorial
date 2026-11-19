import os
import sys
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def env_list(name, default=""):
    return [v.strip() for v in os.environ.get(name, default).split(",") if v.strip()]


def env_bool(name, default="0"):
    return os.environ.get(name, default).strip().lower() in ("1", "true", "sim", "yes")


DEBUG = env_bool("DJANGO_DEBUG")
_TESTANDO = len(sys.argv) > 1 and sys.argv[1] == "test"

# A chave vem só do .env. Sem ela, só o desenvolvimento (DJANGO_DEBUG=1) e os testes sobem, com uma chave
# descartável; em produção o Django recusa iniciar em vez de assinar sessões com uma chave conhecida.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if not (DEBUG or _TESTANDO):
        raise ImproperlyConfigured("Defina DJANGO_SECRET_KEY no .env (ou DJANGO_DEBUG=1 para desenvolvimento).")
    SECRET_KEY = "dev-somente-local-" + "x" * 40
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
CSRF_TRUSTED_ORIGINS = env_list("DJANGO_CSRF_TRUSTED_ORIGINS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "memorial",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "memorial.registro.RegistroMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

if os.environ.get("POSTGRES_HOST"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ["POSTGRES_DB"],
            "USER": os.environ["POSTGRES_USER"],
            "PASSWORD": os.environ["POSTGRES_PASSWORD"],
            "HOST": os.environ["POSTGRES_HOST"],
            "PORT": os.environ.get("POSTGRES_PORT", "5432"),
        }
    }
else:  # desenvolvimento local sem Docker
    DATABASES = {
        "default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}
    }

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Fortaleza"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Uploads grandes vão para disco temporário em vez de memória.
# O limite real de cada rota fica no nginx (check-in: 30 MB; admin: 2 GB, por causa dos vídeos).
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024
# Pasta dos envios grandes enquanto chegam. Em produção, aponte para a área temporária (não o disco raiz).
FILE_UPLOAD_TEMP_DIR = os.environ.get("DJANGO_UPLOAD_TEMP_DIR") or None

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Aviso de aprovação pendente aos administradores. Sem EMAIL_HOST, nada é enviado (o painel mostra igual).
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT") or "587")
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
# Porta 587: STARTTLS (EMAIL_USE_TLS=1). Porta 465: SSL direto (EMAIL_USE_SSL=1). Os dois juntos não funcionam.
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", "1") and not EMAIL_USE_SSL
EMAIL_TIMEOUT = int(os.environ.get("EMAIL_TIMEOUT") or "5")  # o check-in do visitante espera o envio: um SMTP fora do ar não pode prendê-lo
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "memorial@localhost")
SERVER_EMAIL = DEFAULT_FROM_EMAIL
# Para testar sem servidor de e-mail: EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend (mostra no log)
EMAIL_BACKEND = os.environ.get("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")

# Atrás do nginx
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Produção em https (docker-compose.prod.yml liga): cookies de sessão e CSRF só trafegam cifrados.
# O redirecionamento 80 → 443 e o HSTS ficam no nginx (nginx/nginx.prod.conf).
if env_bool("DJANGO_HTTPS"):
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"

CORS_ALLOWED_ORIGINS = env_list("DJANGO_CORS_ALLOWED_ORIGINS")
CORS_ALLOWED_METHODS = ["GET", "POST", "OPTIONS"]

# Cache em arquivo: compartilhado pelos workers do gunicorn no mesmo contêiner (o limite de
# frequência do check-in precisa enxergar todos os pedidos, não só os de um worker).
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.filebased.FileBasedCache",
        "LOCATION": os.environ.get("DJANGO_CACHE_DIR", "/tmp/memorial-cache"),
    }
}

REST_FRAMEWORK = {
    # A API dos totens é pública; o conteúdo é editado pelo /admin. O único POST é o check-in,
    # sem sessão (então sem CSRF), protegido por limite de frequência e campo isca.
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "UNAUTHENTICATED_USER": None,
    "DEFAULT_THROTTLE_RATES": {
        "checkin_minuto": os.environ.get("CHECKIN_LIMITE_MINUTO", "5/min"),
        "checkin_hora": os.environ.get("CHECKIN_LIMITE_HORA", "30/hour"),
    },
    # Quantos proxies ficam na frente do Django (o IP do visitante é lido do X-Forwarded-For).
    # nginx sozinho = 1. Com o túnel da Cloudflare na frente do nginx = 2.
    "NUM_PROXIES": int(os.environ.get("DJANGO_NUM_PROXIES") or "1"),
}

# O corpo das requisições nunca é registrado (o check-in traz dados pessoais).
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
