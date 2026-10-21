# Memorial UNDB — backend do totem

Django + DRF servem o conteúdo, PostgreSQL guarda os dados e o Nginx entrega
fotos e vídeos direto do disco. O conteúdo é cadastrado pelo `/admin`.

```
nginx :8080 ──┬── /media/  → volume "media" (fotos e vídeos)
              ├── /static/ → volume "static" (CSS do admin)
              └── /        → backend (gunicorn :8000) → db (postgres)
```

## Subir

```bash
cp .env.example .env        # troque SECRET_KEY e as senhas
docker compose up -d --build
docker compose exec backend python manage.py carregar_exemplo   # opcional: dados de teste
```

- Admin: http://localhost:8080/admin (usuário do `.env`)
- API:   http://localhost:8080/api/totem/

Para apagar o conteúdo de exemplo: `carregar_exemplo --limpar` (apaga tudo).

## Modelo de conteúdo

| Modelo | Tela | Campos principais |
|---|---|---|
| **Marco / período** | História e Fotos | ano, título, descrição, resumo da galeria, ícone |
| **Foto** | Fotos | período, imagem, legenda, crédito, destaque |
| **Vídeo** | Vídeos | título, descrição, categoria, período (opcional), arquivo, capa |
| **Configuração do totem** | todas | tempo de inatividade, intervalo de atualização, proteção de tela |

O que acontece automaticamente no upload:

- **Fotos**: geradas duas versões JPEG, `exibicao` (até 1920 px) e `miniatura`
  (480 px), com rotação EXIF corrigida. O totem nunca baixa o original.
- **Vídeos**: o ffprobe lê duração e codec; se não houver capa, o ffmpeg
  captura um quadro. O admin avisa se o codec não for H.264/VP8/VP9.
- **Exclusão**: apagar uma foto ou vídeo remove os arquivos do disco.
- Na edição de um período, o campo **Adicionar fotos** aceita várias imagens de uma vez.

## API (somente leitura, sem autenticação)

| Endpoint | Uso |
|---|---|
| `GET /api/totem/` | Tudo em uma chamada: config, períodos com fotos, vídeos, categorias |
| `GET /api/totem/versao/` | `{"versao": "…"}`, muda a cada alteração de conteúdo |
| `GET /api/periodos/` | Linha do tempo (`?fotos=1` inclui as fotos) |
| `GET /api/periodos/{id}/` | Um período com fotos |
| `GET /api/videos/` | Filtros `?categoria=entrevista\|evento\|institucional` e `?ano=2007` |

Exemplo de período em `/api/totem/`:

```json
{
  "id": 1, "ano": 1985, "titulo": "Fundação da escola",
  "descricao": "Início das atividades…", "resumo_galeria": "Início das atividades…",
  "icone": "predio",
  "fotos": [{ "id": 1, "url": ".../media/fotos/exibicao/…jpg",
              "miniatura": ".../media/fotos/miniatura/…jpg",
              "largura": 1600, "altura": 1067, "legenda": "…", "credito": "", "destaque": false }]
}
```

`icone` é uma chave (`predio`, `livro`, `ciencia`, `tecnologia`, `camera`,
`formatura`, `estrela`, `pessoas`); o frontend mapeia para o SVG.

## Recomendações para o totem Android

**Fluxo de dados sugerido para o frontend**

1. Ao abrir, busca `/api/totem/` e guarda no cache (Service Worker / IndexedDB).
2. A cada `config.segundos_atualizacao`, consulta `/api/totem/versao/`. Só
   recarrega quando o valor mudar.
3. Se a rede cair, continua exibindo o cache, então o totem nunca fica em branco.
4. Sem toque por `config.segundos_inatividade`, volta para a tela inicial
   (e mostra a proteção de tela, se `descanso_ativo`).

**Vídeos**: padronize antes de subir. Isso evita vídeo que não toca e arquivo gigante:

```bash
ffmpeg -i entrada.mov -c:v libx264 -profile:v high -crf 23 -preset slow \
  -vf "scale='min(1920,iw)':-2" -pix_fmt yuv420p -c:a aac -b:a 128k \
  -movflags +faststart saida.mp4
```

`+faststart` faz o vídeo começar a tocar antes de baixar inteiro, e o Nginx já
suporta requisições Range para avançar/voltar.

**Rede**: o ideal é o servidor rodar na rede interna da UNDB com IP fixo (ou
um nome como `memorial.undb.local`, que já está em `ALLOWED_HOSTS`). Lembre de
adicionar o endereço real em `DJANGO_ALLOWED_HOSTS` e
`DJANGO_CSRF_TRUSTED_ORIGINS`.

**Modo quiosque**: um navegador kiosk (ex.: Fully Kiosk Browser) ou um app
WebView próprio prende o totem na página, esconde a barra do Android, impede
sair do app e reinicia sozinho se travar.

## Backup

```bash
docker compose exec db pg_dump -U memorial memorial > backup.sql
docker run --rm -v memorial-undb_media:/m -v "$PWD":/b alpine tar czf /b/media.tgz -C /m .
```

## Desenvolvimento sem Docker

Sem `POSTGRES_HOST` definido, o Django usa SQLite:

```bash
cd backend && pip install -r requirements.txt
DJANGO_DEBUG=1 python manage.py migrate && DJANGO_DEBUG=1 python manage.py runserver
```

Precisa de `ffmpeg` instalado para capas e duração dos vídeos.
