# Memorial UNDB — totem

O app do totem é React + Vite (PWA com cache offline). Django + DRF servem o
conteúdo, PostgreSQL guarda os dados e o Nginx entrega o app, as fotos e os
vídeos. O conteúdo é cadastrado pelo `/admin`.

```
nginx :8080 ──┬── /             → app do totem (build do frontend/, embutido na imagem)
              ├── /media/       → volume "media" (fotos e vídeos)
              ├── /static/      → volume "static" (CSS do admin)
              └── /api, /admin  → backend (gunicorn :8000) → db (postgres)
```

No totem, basta abrir `http://<ip-do-servidor>:8080/` no navegador quiosque.

## Subir

```bash
cp .env.example .env        # troque SECRET_KEY e as senhas
docker compose up -d --build
docker compose exec backend python manage.py carregar_exemplo   # opcional: dados de teste
```

- Totem: http://localhost:8080/
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

## Frontend do totem (`frontend/`)

Telas: **Início**, **História** (linha do tempo), **Fotos** (galeria por
período, com visualizador em tela cheia e deslizar para os lados) e **Vídeos**
(filtros por categoria, player com controles grandes). Funciona em tela
horizontal ou vertical.

Comportamento de quiosque:

- **Inatividade**: sem toque por `segundos_inatividade`, volta ao início, fecha
  fotos/vídeos abertos e liga a **proteção de tela** (fotos do acervo em
  sequência). Enquanto um vídeo toca, o contador fica pausado.
- **Conteúdo novo**: a cada `segundos_atualizacao` o app consulta
  `/api/totem/versao/`. Se mudou, baixa tudo, mas só troca o conteúdo quando o
  totem está ocioso, para não mudar a tela debaixo do dedo de ninguém.
- **Offline**: o app, os dados, as miniaturas e as capas ficam no cache do
  service worker. Se o servidor cair, o totem continua funcionando e mostra um
  selo discreto "offline" no canto. Vídeos e fotos em tamanho grande que não
  estavam em cache não abrem (a foto cai para a miniatura).
- **Nova versão do app**: quando você publica um build novo, ele é instalado
  sozinho no próximo período ocioso.
- Sem zoom por pinça, sem menu de toque longo, sem arrastar imagens.

**Logo**: o brasão em `frontend/public/brasao.svg` é provisório. Troque pelo
logo oficial da UNDB (mesmo nome de arquivo) e rode o build de novo.

### Desenvolvimento do frontend

Com o `docker compose` rodando (para ter a API em :8080):

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, com /api e /media apontando para :8080
```

Para apontar para outro servidor: `VITE_BACKEND=http://192.168.0.10:8080 npm run dev`.

Depois de mudar o frontend, `docker compose up -d --build nginx` gera o build
novo dentro da imagem do nginx.

## Recomendações para o totem Android

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
