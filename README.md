# Memorial Dom Bosco Maria Izabel Rodrigues

Tour do Memorial em **cinco salas, com um totem touchscreen por sala**, e um **check-in pelo
celular** do visitante. Quem faz o check-in na entrada pode ser encontrado pelos colegas na sala 5.

| Sala | Nome | O totem mostra |
|---|---|---|
| 1 | Educação | História (linha do tempo), Fotos (períodos de 5 anos) e Vídeos |
| 2 | Troféus | idem |
| 3 | Artes | idem |
| 4 | Professoras | idem |
| 5 | Fechamento | Busca de ex-alunos por nome, ano ou década, e o perfil de cada pessoa |

- **Frontend** (`frontend/`): React + Vite + TypeScript, PWA para funcionar offline. Duas páginas:
  o totem (`/`) e o check-in (`/checkin`). Regras visuais em `DESIGN.md`, produto em `PRODUCT.md`,
  tokens em `frontend/src/estilos/tokens.css`, marcas em `frontend/src/assets/memorial/`.
- **Backend** (`backend/`): Django + DRF; o conteúdo é cadastrado pelo `/admin`.
- **Nginx**: entrega o app, as fotos e os vídeos, e faz proxy para o Django. PostgreSQL guarda os dados.
- **Referência**: o protótipo aprovado está em `docs/referencia/tour-memorial-dom-bosco.html`.

```
nginx :8080 ──┬── /, /checkin   → apps (build do frontend/, embutido na imagem)
              ├── /media/       → volume "media" (fotos, vídeos, fotos de ex-alunos)
              ├── /static/      → volume "static" (CSS do admin)
              └── /api, /admin  → backend (gunicorn :8000) → db (postgres)
```

## Subir

```bash
cp .env.example .env        # troque DJANGO_SECRET_KEY e as senhas
docker compose up -d --build
docker compose exec backend python manage.py carregar_exemplo   # opcional: conteúdo de exemplo
```

- Totens: `http://<servidor>:8080/?sala=1` … `?sala=5`
- Check-in: `http://<servidor>:8080/checkin` (é o endereço do QR Code)
- Admin: `http://<servidor>:8080/admin` (usuário do `.env`)

### Configurar cada totem

1. No navegador quiosque do totem (ex.: Fully Kiosk Browser), abra `http://<servidor>:8080/?sala=N`.
2. A sala fica guardada no aparelho (`memorial:sala`). O app instalado como PWA, aberto sem a query,
   continua na mesma sala. Sem sala definida, o totem mostra "Escolha a sala deste totem".
3. Para trocar a sala de um totem, abra de novo o endereço com outro `?sala=N`.
4. Abra uma vez com `?diag` para conferir a escala (o palco lógico é 1600 × 900; em telas 16:10 ele
   fica centralizado, com faixas grafite).

### Placa de check-in

Em **Admin › Configuração do memorial** há o QR Code pronto para a placa, em PNG e SVG. Ele aponta
para o **endereço do check-in** (vazio = `<este servidor>/checkin`). O endereço precisa ser acessível
pelo celular do visitante (rede da escola com Wi-Fi aberto, ou um domínio público com o túnel).

## Conteúdo de exemplo

`carregar_exemplo` carrega o conteúdo do protótipo (extraído por `scripts/extrair_exemplo.py` para
`backend/memorial/exemplo/tour.json`): 8 marcos por sala, fotos de exemplo em todos os períodos
(sem imagem real: o totem mostra uma moldura provisória), 5 vídeos curtos por sala (precisa de ffmpeg,
que já vem na imagem) e 22 ex-alunos fictícios. Tudo fica marcado como **demonstrativo** e o rodapé
do totem mostra "Conteúdo de exemplo" enquanto a sala tiver algum item assim.

- `carregar_exemplo --remover` apaga só o conteúdo de exemplo.
- `carregar_exemplo --limpar` apaga **todo** o conteúdo das salas (marcos, fotos, vídeos) e os
  ex-alunos de exemplo, e carrega de novo. **Ex-alunos reais nunca são apagados por este comando.**

## Admin

| Onde | O que fazer |
|---|---|
| **Salas** | nome, título, subtítulo e cor de cada sala; marcos e vídeos na própria página; **Adicionar fotos** envia várias de uma vez, todas com o ano informado |
| **Marcos** | ano, título, descrição curta, ícone e **destaque inicial** (um por sala) |
| **Fotos** | imagem, ano (define o período de 5 anos), legenda (até 140), crédito, texto alternativo |
| **Vídeos** | arquivo, capa (automática se vazia), tipo, **destaque** (um por sala), legenda WebVTT opcional |
| **Ex-alunos** | filtros por status e ano; ações **Aprovar** e **Ocultar**; o e-mail só aparece aqui |
| **Fotos de ex-alunos** | chegam pelo check-in como *pendentes*; aprove ou recuse em lote |
| **Configuração do memorial** | tempos dos totens, som dos vídeos, aprovação de perfis, termo de consentimento, QR Code |

No upload, como antes: fotos viram duas versões JPEG (`exibicao` 2560 px e `miniatura` 480 px, EXIF
corrigido e removido); vídeos têm duração e codec lidos pelo ffprobe e capa capturada pelo ffmpeg;
apagar um registro apaga os arquivos do disco.

## API (`/api/memorial/`)

| Endpoint | Uso |
|---|---|
| `GET sala/<n>/` | tudo que o totem da sala precisa: `{versao, config, sala, demonstrativo, marcos, fotos, videos}` |
| `GET versao/?sala=<n>` | `{"versao": "…"}`, muda só quando algo daquela sala (ou a configuração) muda |
| `GET alunos/?q=&ano=&decada=1990-1999&pagina=` | busca no diretório (12 por página), recentes primeiro |
| `GET alunos/<id>/` | perfil, redes, fotos **aprovadas** e até 4 colegas da mesma turma |
| `GET checkin/` | textos do formulário (termo e versão, ano inicial) |
| `POST checkin/` | multipart: `nome, ano, turma, email, instagram, facebook, consentimento, fotos[]` |

Formatos em `frontend/src/dados/tipos.ts`. URLs de mídia são relativas (`/media/...`).

O check-in tem limite de frequência por IP (`CHECKIN_LIMITE_MINUTO=5/min`, `CHECKIN_LIMITE_HORA=30/hour`;
atrás do túnel use `DJANGO_NUM_PROXIES=2`), campo isca anti-robô, até 3 fotos de 10 MB (verificadas e
reencodadas, sem EXIF; o nginx aceita até 30 MB só nessa rota) e resposta mínima. Mesmo e-mail + mesmo
ano atualiza o cadastro em vez de duplicar. O corpo das requisições não é registrado em log.

## Privacidade (LGPD)

Os dados da sala 5 são de pessoas reais:

- o **e-mail nunca sai do servidor** (nenhuma resposta da API o contém; há teste para isso);
- o perfil só aparece com **consentimento** e status *aprovado* (com **aprovar perfis** ligado no admin,
  todo check-in entra como *pendente*);
- **fotos enviadas só aparecem depois de aprovadas** pela equipe;
- **remoção**: apagar o ex-aluno no admin apaga o perfil, a foto e as fotos enviadas (arquivos inclusos).
  Os totens deixam de mostrar a pessoa na hora; as fotos guardadas no cache do totem expiram em até 1 dia.

> **Atenção:** o texto do termo de consentimento que vem pronto é um ponto de partida. Ele precisa ser
> validado pela escola (encarregado de dados / jurídico) antes do uso com o público. Ao mudar o texto,
> mude também a **versão do termo**: cada cadastro guarda a versão aceita.

## Frontend

- **Salas 1 a 4** funcionam offline com a última cópia (`localStorage` + service worker). A **sala 5
  precisa do servidor**: sem rede, mostra o último resultado com um aviso no rodapé. Na busca, a lista
  se atualiza a cada ~10 s para novos check-ins aparecerem sozinhos.
- **Conteúdo novo** só entra quando o totem volta ao início da sala, ou depois de 30 s sem toque.
  Idem para uma versão nova do app.
- **Inatividade**: aviso aos 90 s, contagem de 15 s, e o totem volta ao início da sala (aba História,
  destaque inicial, overlays fechados, busca limpa). Vídeo tocando não dispara o aviso.
- **Botão Voltar** do Android fecha o overlay aberto, depois o teclado, depois volta do perfil à busca;
  nunca sai do app.
- **Busca**: teclado virtual próprio (o do Android cobriria metade da tela).
- **Parâmetros de URL**: `?sala=N`, `?aviso=20&contagem=5&lightbox=10` (segundos), `?diag`,
  `?semtelacheia`, `?tecladonativo` (teclado do sistema, para testar no computador).

### Desenvolvimento

Com o `docker compose` rodando (para ter a API em :8080):

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173/?sala=1 e http://localhost:5173/checkin
```

Outro servidor: `VITE_BACKEND=http://192.168.0.10:8080 npm run dev`. Depois de mudar o frontend,
`docker compose up -d --build nginx` gera o build novo dentro da imagem do nginx.

### Modo demonstração (Vercel)

Com `VITE_MODO_DEMO=1` no build (variável de ambiente do projeto no Vercel), o app não precisa de
servidor: usa o conteúdo de exemplo embutido (`frontend/src/dados/exemplo.json`), `?sala=N` funciona
normalmente, e o check-in grava no próprio navegador e aparece na sala 5 aberta nele, com o aviso
"Modo demonstração: nada é enviado". `vercel.json` já tem a rota `/checkin`. Para ligar o Vercel ao
servidor de verdade (túnel), veja `vercel.backend.json` e o serviço `cloudflared` do compose.

### Testes

```bash
# backend (SQLite ou dentro do contêiner)
docker compose exec backend python manage.py test memorial

# frontend
cd frontend
npm run typecheck
npm run test:unit                         # regras da busca, períodos, décadas, contraste dos tokens
npx playwright install chromium           # só na primeira vez
docker compose exec backend python manage.py carregar_exemplo --limpar
URL=http://localhost:8080/ npm run test:e2e   # 40 verificações, em 1600 × 900 e 1920 × 1080
```

O e2e faz um check-in de teste por execução ("Teste E2E …", e-mail `@exemplo.invalid`); apague-os no
admin quando quiser. As capturas vão para `frontend/.impeccable/review/e2e/`.

## Recomendações para os totens

**Vídeos**: padronize antes de subir.

```bash
ffmpeg -i entrada.mov -c:v libx264 -profile:v high -crf 23 -preset slow \
  -vf "scale='min(1920,iw)':-2" -pix_fmt yuv420p -c:a aac -b:a 128k \
  -movflags +faststart saida.mp4
```

**Som**: o volume inicial vem do admin (vídeos com som ou mudos); o player tem controle de volume e
mostra a legenda WebVTT, se houver. Fones ou caixas de som ficam por conta da instalação.

**Rede**: o servidor deve ficar na rede interna com IP fixo (ou um nome como `memorial.local`).
Adicione o endereço em `DJANGO_ALLOWED_HOSTS` e `DJANGO_CSRF_TRUSTED_ORIGINS`. O service worker
(offline) só funciona em `https` ou `localhost`.

**Modo quiosque**: um navegador kiosk prende o totem na página, esconde as barras do Android e
reinicia sozinho se travar.

## Atualizando a partir do Memorial UNDB (Livro de Honra)

A migração `0007` **apaga as tabelas do acervo antigo** (períodos, marcos, fotos, vídeos, documentos,
pessoas e depoimentos) e a `0008` cria as salas novas. O acervo antigo era demonstrativo, mas faça o
backup antes de subir a versão nova:

```bash
docker compose exec db pg_dump -U memorial memorial > backup-antes-dom-bosco.sql
docker compose up -d --build      # aplica as migrações 0007 a 0009
```

Os arquivos antigos de `/media` (fotos, vídeos, páginas de documento) ficam no volume sem uso; apague
`fotos/`, `videos/` e `documentos/` do volume `media` depois de conferir o backup, se quiser liberar espaço.

## Backup

```bash
docker compose exec db pg_dump -U memorial memorial > backup.sql
docker run --rm -v squad-memorial_media:/m -v "$PWD":/b alpine tar czf /b/media.tgz -C /m .
```

## Desenvolvimento sem Docker

Sem `POSTGRES_HOST` definido, o Django usa SQLite:

```bash
cd backend && pip install -r requirements.txt
DJANGO_DEBUG=1 python manage.py migrate && DJANGO_DEBUG=1 python manage.py runserver 8080
```

Precisa de `ffmpeg` instalado para capas e duração dos vídeos (e para os vídeos de exemplo).
