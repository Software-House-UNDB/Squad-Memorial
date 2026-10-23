# Memorial UNDB — totem

Memorial Interativo da UNDB para o totem touchscreen Android (1920 × 1080, paisagem).

- **Frontend** (`frontend/`): o app do Design System **"Livro de Honra"** (React + Vite + TypeScript),
  com PWA para funcionar offline. Regras visuais em `DESIGN.md`, produto em `PRODUCT.md`,
  tokens em `frontend/src/estilos/tokens.css`, logos oficiais em `frontend/src/assets/`.
- **Backend** (`backend/`): Django + DRF entregam o acervo; o conteúdo é cadastrado pelo `/admin`.
- **Nginx**: entrega o app, as fotos e os vídeos, e faz proxy para o Django. PostgreSQL guarda os dados.

```
nginx :8080 ──┬── /             → app do totem (build do frontend/, embutido na imagem)
              ├── /media/       → volume "media" (fotos, vídeos, páginas de documentos)
              ├── /static/      → volume "static" (CSS do admin)
              └── /api, /admin  → backend (gunicorn :8000) → db (postgres)
```

No totem, basta abrir `http://<ip-do-servidor>:8080/` no navegador quiosque.

## Subir

```bash
cp .env.example .env        # troque SECRET_KEY e as senhas
docker compose up -d --build
docker compose exec backend python manage.py carregar_exemplo   # opcional: acervo demonstrativo
```

- Totem: http://localhost:8080/
- Admin: http://localhost:8080/admin (usuário do `.env`)
- API:   http://localhost:8080/api/totem/

`carregar_exemplo` carrega o acervo demonstrativo do design system (13 marcos, 67 fotos sem imagem,
2 vídeos, 4 documentos, 8 pessoas, 6 depoimentos). Tudo fica marcado como **demonstrativo**, e o
totem mostra a etiqueta "Conteúdo demonstrativo" enquanto existir algum item assim.

- `carregar_exemplo --remover` apaga só o conteúdo demonstrativo (mantém o que você cadastrou).
- `carregar_exemplo --limpar` apaga **todo** o acervo e carrega o exemplo de novo.

## Modelo do acervo (admin)

| Modelo | Onde aparece | Campos principais |
|---|---|---|
| **Período** | Linha do tempo, galeria, capa | ano inicial e final, título, descrição, foto de capa |
| **Marco** | Linha do tempo, detalhe, conquistas | ano, data por extenso, título, resumo, lede, narrativa, tipo, conquista, pessoas |
| **Foto** | Detalhe, galeria, lightbox, capa | imagem, legenda (até 140), texto alternativo, crédito, data, marco, período, pessoas |
| **Vídeo** | Detalhe, galeria (filtro Vídeos), lightbox | arquivo, capa, título, descrição, marco, período |
| **Documento** + **Página** | Detalhe, galeria, visualizador | título, tipo, data, código no acervo, transcrição, páginas digitalizadas |
| **Pessoa** | Pessoas, painel lateral | nome, papel, biografia, retrato (uma foto cadastrada), verificado, autorização de imagem |
| **Depoimento** | Detalhe do marco, Memórias | texto, autor, vínculo, marco, autorizado |
| **Configuração do totem** | todas | título e subtítulo da capa, tempos de inatividade, contagem, lightbox e atualização |

Toda peça tem **fonte** (vazio = "Acervo institucional UNDB"), **demonstrativo** e **publicado**.

Regras aplicadas automaticamente:

- Marco sem período vai para a década do ano (a década é criada se não existir).
- Foto e vídeo sem período herdam o período do marco.
- Foto sem imagem aparece como placa provisória "Foto do acervo".
- Documento sem páginas aparece como "ainda não digitalizado".
- Depoimento sem **autorizado** e retrato sem **autorização de uso de imagem** não saem do servidor / não aparecem.
- Área do Sumário sem itens não aparece.
- Ao editar um marco, o campo **Adicionar fotos** aceita várias imagens de uma vez.

No upload:

- **Fotos**: duas versões JPEG, `exibicao` (lado maior 2560 px) e `miniatura` (480 px), com rotação
  EXIF corrigida. O totem nunca baixa o original.
- **Vídeos**: o ffprobe lê duração e codec; sem capa, o ffmpeg captura um quadro. O admin avisa se o
  codec não for H.264/VP8/VP9.
- **Exclusão**: apagar foto, vídeo ou página remove os arquivos do disco.

### Migração do formato anterior

As migrações `0002` a `0006` convertem o banco antigo sem perder nada: cada "período" antigo
(um ano com título e descrição) vira um **marco**, ligado à década correspondente, que é criada
como **período**. A descrição vira resumo e narrativa, o resumo da galeria vira lede e o ícone vira
o tipo. Fotos e vídeos continuam ligados ao mesmo registro. Testado em PostgreSQL e SQLite.

## API (somente leitura, sem autenticação)

| Endpoint | Uso |
|---|---|
| `GET /api/totem/` | `{versao, config, acervo}`: tudo em uma chamada, no formato de `frontend/src/dados/tipos.ts` |
| `GET /api/totem/versao/` | `{"versao": "…"}`, muda a cada alteração de conteúdo |

Os ids são strings com prefixo por tipo (`p-3`, `m-12`, `f-40`, `v-2`, `d-5`, `pe-1`, `dp-7`).
Vídeos entram na lista `fotos`, com a capa em `src` e o arquivo em `video.src`.

## Frontend do totem (`frontend/`)

Telas do design system: Capa (proteção de tela), Sumário, Linha do tempo, Detalhe do marco,
Galeria (fotografias, vídeos e documentos), Pessoas, Documento, Marcos e conquistas, Memórias e
o aviso de inatividade. Detalhes em `DESIGN.md`.

Integração com o backend (`src/dados/Dados.tsx`):

- **Acervo**: vem de `/api/totem/`. A última cópia fica guardada no aparelho, então a capa abre
  na hora, mesmo sem servidor. Sem nenhuma cópia, aparece "Conectando ao servidor do memorial".
- **Conteúdo novo**: o app consulta `/api/totem/versao/` a cada `segundos_atualizacao` e sempre
  que o livro fecha. Conteúdo novo **só entra com o livro fechado**, nunca debaixo do dedo de
  quem está usando.
- **Offline**: o service worker guarda o app, o acervo, as miniaturas, as capas e as páginas de
  documento. Vídeos ficam de fora (são grandes e vão por streaming).
- **Nova versão do app**: instalada sozinha na próxima vez que o livro fechar.
- **Vídeos**: abrem no lightbox (a "sala escura"); um toque reproduz/pausa, com controles de 56 px
  ou mais. Enquanto o vídeo toca, o aviso de inatividade não aparece.
- **Tempos**: vêm do admin. Na URL, `?aviso=20&contagem=5&lightbox=10` sobrescreve (em segundos);
  `?diag` mostra o painel de densidade; `?semtelacheia` não pede tela cheia.

### Desenvolvimento do frontend

Com o `docker compose` rodando (para ter a API em :8080):

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, com /api e /media apontando para :8080
```

Para apontar para outro servidor: `VITE_BACKEND=http://192.168.0.10:8080 npm run dev`.

Depois de mudar o frontend, `docker compose up -d --build nginx` gera o build novo dentro da
imagem do nginx.

### Testes

```bash
cd frontend
npm run test:dados                       # formato do acervo (vitest)
npx playwright install chromium          # só na primeira vez
docker compose exec backend python manage.py carregar_exemplo --limpar
URL=http://localhost:8080/ npm run test:e2e   # 90 verificações, contra o sistema completo
```

O e2e usa o acervo demonstrativo. As capturas vão para `.impeccable/review/app/`.

## Recomendações para o totem Android

**Densidade da tela**: abra uma vez com `?diag`. O viewport CSS deve ser **1920 × 1080**; se não for,
ajuste a densidade do Android (Opções do desenvolvedor → Largura mínima, ou `adb shell wm density`).

**Vídeos**: padronize antes de subir. Isso evita vídeo que não toca e arquivo gigante:

```bash
ffmpeg -i entrada.mov -c:v libx264 -profile:v high -crf 23 -preset slow \
  -vf "scale='min(1920,iw)':-2" -pix_fmt yuv420p -c:a aac -b:a 128k \
  -movflags +faststart saida.mp4
```

**Rede**: o ideal é o servidor rodar na rede interna da UNDB com IP fixo (ou um nome como
`memorial.undb.local`). Adicione o endereço real em `DJANGO_ALLOWED_HOSTS` e
`DJANGO_CSRF_TRUSTED_ORIGINS`. O service worker (offline) só funciona em `https` ou `localhost`.

**Modo quiosque**: um navegador kiosk (ex.: Fully Kiosk Browser) ou um app WebView próprio prende o
totem na página, esconde as barras do Android e reinicia sozinho se travar. O botão Voltar do Android
nunca sai do memorial.

## Backup

```bash
docker compose exec db pg_dump -U memorial memorial > backup.sql
docker run --rm -v memorial-undb_media:/m -v "$PWD":/b alpine tar czf /b/media.tgz -C /m .
```

## Desenvolvimento sem Docker

Sem `POSTGRES_HOST` definido, o Django usa SQLite:

```bash
cd backend && pip install -r requirements.txt
DJANGO_DEBUG=1 python manage.py migrate && DJANGO_DEBUG=1 python manage.py runserver 8080
```

Precisa de `ffmpeg` instalado para capas e duração dos vídeos.