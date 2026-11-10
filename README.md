# Memorial Dom Bosco Maria Izabel Rodrigues

Tour do Memorial em **seis espaços, com um totem touchscreen por espaço**, e um **check-in pelo
celular** do visitante. Quem faz o check-in na entrada pode ser encontrado pelos colegas na Sala 06 (Alunos).

| Sala | Nome | O totem mostra |
|---|---|---|
| 01 | Fundação | Apresentação, Linha do tempo (7 décadas), Marcos (4 cartões), Fotos (períodos de 5 anos) e Vídeos |
| 02 | Diretores | idem |
| 03 | Professores | idem |
| 04 | Artes | idem |
| 05 | Esporte | idem |
| 06 | Alunos | as mesmas 5 abas **e** a aba **Colegas**: busca de ex-alunos por nome, ano ou década, e o perfil de cada pessoa |

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
              └── /api, /admin, /administracao → backend (gunicorn :8000) → db (postgres)
```

## Subir

```bash
cp .env.example .env        # troque DJANGO_SECRET_KEY e as senhas
docker compose up -d --build
docker compose exec backend python manage.py carregar_exemplo   # opcional: conteúdo de exemplo
```

- Totens: `http://<servidor>:8080/?sala=1` … `?sala=6`
- Check-in: `http://<servidor>:8080/checkin` (é o endereço do QR Code)
- Admin: `http://<servidor>:8080/admin` (usuário do `.env`)
- Painel da administração: `http://<servidor>:8080/administracao/` (aprovações e entradas e saídas, ver abaixo)

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

`carregar_exemplo` carrega o conteúdo do tour (`backend/memorial/exemplo/tour.json`, igual ao
`frontend/src/dados/exemplo.json` do modo demo; mude os dois juntos e não rode `scripts/extrair_exemplo.py`,
que ainda lê o protótipo antigo). Em cada espaço: apresentação, 7 décadas, 4 marcos, fotos de exemplo em todos os
períodos (sem imagem real: o totem mostra uma moldura provisória) e vídeos curtos (precisa de ffmpeg,
que já vem na imagem) e 22 ex-alunos fictícios. Tudo fica marcado como **demonstrativo**
(campo `demonstrativo` da API e do banco), mas o totem **não mostra mais** "Conteúdo de exemplo" no rodapé nem o crédito
nas fotos: o frontend não exibe esse campo.

> **Antes da versão final:** o `carregar_exemplo` grava no banco o crédito "Conteúdo de exemplo · Memorial Dom Bosco" nas fotos
> e a expressão "foto de exemplo" em legendas. Isso não aparece mais na tela do totem por causa do frontend, mas continua nos dados:
> troque no Admin (ou no backend, em `carregar_exemplo.py` e `tour.json`) ou rode `carregar_exemplo --remover` e cadastre o conteúdo real.

- `carregar_exemplo --remover` apaga só o conteúdo de exemplo.
- `carregar_exemplo --limpar` apaga **todo** o conteúdo das salas (marcos, fotos, vídeos) e os
  ex-alunos de exemplo, e carrega de novo. **Ex-alunos reais nunca são apagados por este comando.**

## Admin

| Onde | O que fazer |
|---|---|
| **Salas** | nome, título, subtítulo e cor de cada sala; apresentação, décadas, marcos e vídeos na própria página (também na Sala 06); **Adicionar fotos** envia várias de uma vez, todas com o ano informado |
| **Apresentações** | título, texto (parágrafos separados por linha em branco), foto de época, legenda e ícone; uma por sala |
| **Décadas** | rótulo, período, título, resumo, ícone e foto; os **acontecimentos** (três por década) ficam na página da década |
| **Marcos** | ano, título, descrição curta, texto explicativo, foto de época, ícone e **destaque inicial** (um por sala) |
| **Fotos** | imagem, ano (define o período de 5 anos), legenda (até 140), crédito, texto alternativo |
| **Vídeos** | arquivo, capa (automática se vazia), tipo, **destaque** (um por sala), legenda WebVTT opcional |
| **Ex-alunos** | filtros por status e ano; ações **Aprovar** e **Ocultar**; o e-mail só aparece aqui |
| **Fotos de ex-alunos** | chegam pelo check-in como *pendentes*; aprove ou recuse em lote |
| **Entradas e saídas** | o registro do sistema, só leitura; aprovações e o registro completo ficam em `/administracao/` |
| **Configuração do memorial** | tempos dos totens, som dos vídeos, aprovação de perfis, termo de consentimento, QR Code |

No upload, como antes: fotos viram duas versões JPEG (`exibicao` 2560 px e `miniatura` 480 px, EXIF
corrigido e removido); vídeos têm duração e codec lidos pelo ffprobe e capa capturada pelo ffmpeg;
apagar um registro apaga os arquivos do disco.

## Painel da administração

**Onde acessar:** `http://<servidor>:8080/administracao/`, com o mesmo login do `/admin` (a página inicial do `/admin` também
tem um botão para ele). Em desenvolvimento sem Docker: `http://localhost:8080/administracao/`.

### Cadastros (`/administracao/gerir/`)

Tudo que se edita no `/admin` também se edita aqui, pela barra lateral: salas, apresentações, décadas, marcos, fotos, vídeos, ex-alunos,
fotos de ex-alunos e configuração. Tem os mesmos campos, filtros, busca, ações em lote e permissões, em cartões com foto ou ícone, com seletor de cor
e de ícone. A página de uma sala reúne a apresentação, as décadas, os marcos e os vídeos dela. Apagar sempre mostra antes o que será removido.

As telas leem as definições de `backend/memorial/admin.py`: um campo novo lá aparece aqui sem outra mudança. Um **modelo** novo precisa entrar em
`backend/memorial/secoes.py` (um teste avisa se faltar). A única diferença: alterar `publicado` ou `status` direto na lista não existe aqui; use as ações em lote
ou a página do item.

### Aprovações (`/administracao/`)

Toda foto enviada no check-in entra como *pendente* e só aparece nos totens depois de aprovada. Aqui a equipe vê as fotos e os
cadastros pendentes, marca os que quiser (ou **Selecionar todas**) e aprova, recusa ou oculta de uma vez. **Ampliar** mostra a foto
em tamanho maior. Cada decisão fica nas entradas e saídas, com quem decidiu, e pode ser refeita no `/admin`.

**Cadastros pendentes** só existem com **Aprovar perfis antes de aparecer** ligado em Configuração do memorial. Desligado (o padrão),
o perfil aparece na Sala 06 logo depois do check-in, e a tela avisa isso. As fotos passam por aprovação nos dois casos.

**Como a equipe é avisada:**

- com o painel aberto: número no menu e no título da aba, e uma faixa "Chegou 1 item novo" (consulta a cada 30 s, sem recarregar a tela
  nem perder a seleção);
- por e-mail, com as fotos em anexo e o link do painel, a cada check-in que deixar algo pendente. Vai para os superusuários e o grupo
  **Administrativo**, no e-mail de cada usuário. Só funciona com `EMAIL_HOST` configurado no `.env` (ver `.env.example`); sem ele, nada é enviado.
  Porta 587 usa `EMAIL_USE_TLS=1`; porta 465 usa `EMAIL_USE_SSL=1`. A tela de aprovações diz quantas pessoas recebem o aviso (e avisa se
  ninguém tem e-mail cadastrado) e tem o botão **Enviar e-mail de teste para mim** (para quem pode alterar a configuração), que mostra o erro
  do servidor de e-mail se o envio falhar. Pelo terminal: `docker compose exec backend python manage.py testar_email [destinatário]`.

### Entradas e saídas (`/administracao/registro/`)

Tudo que entrou e saiu do sistema, com busca, filtros por tipo e data, e exportação em CSV. Ninguém edita nem apaga os registros
(nem pelo `/admin`, em **Entradas e saídas**).

| Direção | O que conta |
|---|---|
| Entrada | check-in novo ou atualizado, foto enviada, cadastro criado ou alterado (com quem fez), aprovações, login da equipe, login recusado |
| Saída | cadastro removido, ex-aluno removido, exportação de dados, aviso por e-mail, logout da equipe |

**Limites:** o conteúdo de exemplo (`carregar_exemplo`) não entra no registro. Do que aconteceu antes da migração `0012`, só
check-ins e fotos foram trazidos. Não existe check-out de visitantes: a saída de uma pessoa do prédio não é registrada.

### Dar acesso a alguém

Em Admin › Usuários, crie o usuário, marque **Membro da equipe**, preencha o **e-mail** (para receber os avisos) e inclua no grupo
**Administrativo**, criado sozinho pelas migrações. O grupo aprova fotos e cadastros, edita ex-alunos e vê as entradas e saídas; não altera o conteúdo das
salas, e o menu do painel mostra só o que cada usuário pode acessar. Para liberar mais, dê as permissões do modelo no usuário ou no grupo.

## API (`/api/memorial/`)

| Endpoint | Uso |
|---|---|
| `GET sala/<n>/` | tudo que o totem da sala precisa: `{versao, config, sala, demonstrativo, marcos, fotos, videos}` e, no tour de 6 espaços, também `apresentacao` e `decadas` (opcionais; ver `docs/mudancas-frontend-tour-6-espacos.md`) |
| `GET versao/?sala=<n>` | `{"versao": "…"}`, muda só quando algo daquela sala (ou a configuração) muda |
| `GET alunos/?q=&ano=&decada=1990-1999&pagina=` | busca no diretório (12 por página), recentes primeiro |
| `GET alunos/<id>/` | perfil, `redes` (lista), fotos **aprovadas**, até 4 colegas da mesma turma e `totalColegas` |
| `GET checkin/` | textos do formulário (termo e versão, ano inicial) |
| `POST checkin/` | multipart: `nome, ano, turma, email, instagram, facebook` (ou `redes`), `consentimento, fotos[]` |

Formatos em `frontend/src/dados/tipos.ts`. URLs de mídia são relativas (`/media/...`).

**Redes sociais.** O servidor guarda **até 3 redes por pessoa** (modelo `RedeSocial`, regras em `backend/memorial/redes.py`, as mesmas
de `frontend/src/dados/redes.ts`). O POST aceita dois formatos:

- `redes`: JSON com a lista, ex.: `[{"rede": "tiktok", "usuario": "maria"}, {"rede": "outra", "usuario": "site.com/maria"}]`
  (erro em `erros.redes`);
- `instagram` e `facebook`, como o frontend atual envia: Instagram em `instagram`; as demais redes em `facebook` com prefixo,
  `<rede>/<usuario>` (ex.: `tiktok/maria`), "Outra rede" como `outra/<site>/<caminho>` e o Facebook sem prefixo. O servidor converte
  para a lista e confere cada rede pela regra dela.

O perfil devolve `redes: [{rede, rotulo, usuario}]` (com `link` em "outra", só para mostrar como texto) e continua devolvendo
`instagram` e `facebook` no formato antigo, para totens e celulares com o frontend anterior. Painel e admin mostram o rótulo certo
de cada rede (ex.: "TikTok: tiktok.com/@maria") e editam as redes do ex-aluno. Detalhes: [`docs/passagem-para-o-backend.md`](docs/passagem-para-o-backend.md).

O check-in tem limite de frequência por IP (`CHECKIN_LIMITE_MINUTO=5/min`, `CHECKIN_LIMITE_HORA=30/hour`;
atrás do túnel use `DJANGO_NUM_PROXIES=2`), campo isca anti-robô, até 3 fotos de 10 MB (verificadas e
reencodadas, sem EXIF; o nginx aceita até 30 MB só nessa rota) e resposta mínima. Mesmo e-mail + mesmo
ano atualiza o cadastro em vez de duplicar. O corpo das requisições não é registrado em log.

## Privacidade (LGPD)

Os dados da Sala 06 (aba Colegas) são de pessoas reais:

- o **e-mail nunca sai do servidor** (nenhuma resposta da API o contém; há teste para isso);
- o perfil só aparece com **consentimento** e status *aprovado* (com **aprovar perfis** ligado no admin,
  todo check-in entra como *pendente*);
- **fotos enviadas só aparecem depois de aprovadas** pela equipe. O aviso por e-mail, se configurado, leva a miniatura da foto, nome, ano e
  turma à caixa de e-mail da equipe, nunca o e-mail do visitante; essas cópias não somem do e-mail quando o ex-aluno é removido;
- **remoção**: apagar o ex-aluno no admin apaga o perfil, a foto e as fotos enviadas (arquivos inclusos).
  Os totens deixam de mostrar a pessoa na hora; as fotos guardadas no cache do totem expiram em até 1 dia.
  O nome também sai do registro de entradas e saídas, que fica só com "Ex-aluno nº N (dados pessoais removidos)";
- o **registro de entradas e saídas nunca guarda e-mail nem IP**. O CSV exportado traz nomes, e cada exportação fica registrada.

**Termo de uso dos dados e da imagem (check-in):**

- o texto mostrado ao visitante **vem do servidor** (Admin › Configuração do memorial › texto do termo). O frontend tem um texto de reserva
  (`frontend/src/dados/termo.ts`), usado só como valor inicial e no modo demonstração: se a configuração não carregar, o termo não é mostrado
  (aparece "Carregando o termo…" ou o erro) e o envio fica bloqueado;
- a tela mostra a frase "Li e aceito o termo de uso dos meus dados e da minha imagem" e, abaixo, "Ler termo completo" (recolhível, texto justificado);
- o check-in **só é enviado depois que a configuração carregou**: o botão "Fazer check-in" fica desativado e, se o carregamento falhar, aparece
  "Não foi possível carregar o termo" com o botão "Tentar de novo";
- a **versão do termo não aparece mais na tela**, mas o servidor continua gravando em cada cadastro a versão aceita (`consentimento_versao`):
  ao trocar o texto no Admin, aumente também a versão;
- o texto de reserva do frontend não fixa idade mínima.

> **Atenção:** o texto do termo de consentimento que vem pronto é um ponto de partida. Ele precisa ser
> validado pela escola (encarregado de dados / jurídico) antes do uso com o público. Ao mudar o texto,
> mude também a **versão do termo**: cada cadastro guarda a versão aceita. O termo atual não fixa idade mínima:
> o jurídico deve avaliar o caso de menores de 18 anos (LGPD, art. 14, e uso de imagem).

## Frontend

- **Cada espaço tem 5 abas**: Apresentação, Linha do tempo, Marcos, Fotos e Vídeos. A **Sala 06** tem
  ainda a aba **Colegas** (busca e perfil). Marcos: tocar num cartão abre o texto explicativo.
- As abas de conteúdo funcionam offline com a última cópia (`localStorage` + service worker). A aba
  **Colegas precisa do servidor**: sem rede, mostra o último resultado com um aviso no rodapé. Na busca,
  a lista se atualiza a cada ~10 s para novos check-ins aparecerem sozinhos.
- **Conteúdo novo** só entra quando o totem volta ao início da sala, ou depois de 30 s sem toque.
  Idem para uma versão nova do app.
- **Inatividade**: aviso aos 90 s, contagem de 15 s, e o totem volta ao início da sala (aba Apresentação,
  década e marco fechados, overlays fechados, busca limpa). Vídeo tocando não dispara o aviso.
- **Botão Voltar** do Android fecha o overlay aberto, depois o teclado, depois volta do perfil à busca;
  nunca sai do app.
- **Busca**: teclado virtual próprio (o do Android cobriria metade da tela).
- **Parâmetros de URL**: `?sala=N`, `?aviso=20&contagem=5&lightbox=10` (segundos), `?diag`,
  `?semtelacheia`, `?tecladonativo` (teclado do sistema, para testar no computador).
- **Perfil do aluno** (Sala 06, aba Colegas): visual na cor dourada da página, com capa dourada e o prédio, e um cartão dourado com ano, turma e redes.
  Fonte padrão nas quatro abas (títulos em serif, o resto em Montserrat). Cabeçalho "Ex-aluno(a) do Colégio Dom Bosco · Turma X · ano".
  Abas com contador: Visão geral, Fotos (n), Colegas (n, ou "4+": a API devolve no máximo 4 colegas e não informa o total) e Sobre.
  - **Visão geral**: cartão dourado (com "E-mail oculto pelo Memorial" e, sem redes, "Nenhuma rede social informada"), até 6 fotos com "Ver todas" e colegas da turma com "Ver todos".
  - **Fotos**: grade de até 12, com legenda. **Colegas**: cartões com nome, turma, ano e "Ver perfil". **Sobre**: três cartões (No Colégio Dom Bosco, No Memorial, Privacidade).
  - As fotos abrem em tela cheia, no mesmo overlay das salas (setas e Fechar); o Voltar do Android fecha o overlay primeiro.
  - As redes aparecem como texto, com o ícone de cada rede (`lerRedes`); Kwai e "Outra rede" usam o ícone de link. O totem nunca abre links.
  - Dentro do perfil as abas da sala somem; o botão **Voltar à busca** leva de volta.
- **Check-in** (`/checkin`, no celular; `frontend/src/checkin/`):
  - campos: nome, ano, turma (texto livre, até 30 caracteres; não há pergunta de turno), e-mail, uma rede social opcional, até 3 fotos e o aceite do termo;
  - **rede social** (opcional, uma por pessoa nesta fase): botões Instagram, TikTok, LinkedIn e Facebook à vista e "Mais redes" com X, YouTube, Threads, Kwai,
    Pinterest, Snapchat, Telegram, Twitch, GitHub, Behance e "Outra rede". A pessoa digita só o usuário (o prefixo do endereço fica fixo) ou cola o link
    inteiro e a rede é reconhecida. Em "Outra rede" vale um endereço curto (`site.com/perfil`, até 94 caracteres, sem `https://`, sem parâmetros);
  - **termo**: aceite com a frase curta e "Ler termo completo" recolhível; sem o termo carregado o envio fica bloqueado (ver Privacidade);
  - **tela de sucesso**: sem botão de novo check-in (um por celular; a regra de e-mail + ano repetido continua no servidor); mostra a orientação
    para começar pela Sala 01 e a lista das 6 salas;
  - **envio**: tempo limite de 60 s com mensagem própria, mensagem clara para o limite de envios (429), aviso "Preparando suas fotos…" ao reduzir as fotos,
    atributos de teclado nos campos (e-mail, link, nome) e Ano e Turma alinhados lado a lado.

### Desenvolvimento

Com o `docker compose` rodando (para ter a API em :8080):

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173/?sala=1 … ?sala=6 e http://localhost:5173/checkin
```

Outro servidor: `VITE_BACKEND=http://192.168.0.10:8080 npm run dev`. Depois de mudar o frontend,
`docker compose up -d --build nginx` gera o build novo dentro da imagem do nginx.

### Modo demonstração (Vercel)

Com `VITE_MODO_DEMO=1` no build (variável de ambiente do projeto no Vercel), o app não precisa de
servidor: usa o conteúdo de exemplo embutido (`frontend/src/dados/exemplo.json`), `?sala=N` (1 a 6) funciona
normalmente, e o check-in grava no próprio navegador e aparece na Sala 06 aberta nele, com o aviso
"Modo demonstração: nada é enviado". A faixa de demonstração **só aparece nesse modo**: o **build de produção não deve ter
`VITE_MODO_DEMO=1`**, senão o check-in não chega ao servidor. `vercel.json` já tem a rota `/checkin`. Para ligar o Vercel ao
servidor de verdade (túnel), veja `vercel.backend.json` e o serviço `cloudflared` do compose.

### Testes

```bash
# backend (SQLite ou dentro do contêiner)
docker compose exec backend python manage.py test memorial

# frontend
cd frontend
npm run typecheck
npm run test:unit                         # busca, períodos, décadas, sala 1 a 6, redes sociais e validação do check-in, termo, contraste dos tokens
npx playwright install chromium           # só na primeira vez
docker compose exec backend python manage.py carregar_exemplo --limpar
URL=http://localhost:8080/ npm run test:e2e   # em 1600 × 900 e 1920 × 1080 (precisa do backend com as 6 salas)
```

O e2e faz um check-in de teste por execução ("Teste E2E …", e-mail `@exemplo.invalid`); apague-os no
admin quando quiser. No check-in ele confere a validação do nome, escolhe o TikTok (rede guardada com prefixo) e confirma que o perfil aparece
na Sala 06 sem recarregar, com a turma e `tiktok.com/@…`; também confere que a API nunca devolve e-mail. As capturas vão para `frontend/.impeccable/review/e2e/`.

## Recomendações para os totens

**Vídeos**: padronize antes de subir.

```bash
ffmpeg -i entrada.mov -c:v libx264 -profile:v high -crf 23 -preset slow \
  -vf "scale='min(1920,iw)':-2" -pix_fmt yuv420p -c:a aac -b:a 128k \
  -movflags +faststart saida.mp4
```

**Som**: o volume inicial vem do admin (vídeos com som ou mudos); o player tem controle de volume e
mostra a legenda WebVTT, se houver. Fones ou caixas de som ficam por conta da instalação.

**Celular (teste rápido)**: com `npm run dev` o Vite já aceita acessos da rede (`--host`). Abra
`http://<IP do computador>:5173/?sala=N` no celular, no mesmo Wi-Fi, e deite o aparelho (a tela é 16:9).
A sala escolhida fica guardada no navegador; use outro `?sala=N` para trocar.

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

## Atualizando das 5 salas para os 6 espaços

A migração `0011` renumera as salas, e o conteúdo já cadastrado vai junto: 1 Educação → 1 Fundação, 2 Troféus → 5 Esporte,
3 Artes → 4 Artes, 4 Professoras → 3 Professores, 5 Fechamento → 6 Alunos; a 2 Diretores é nova. Nome, título, subtítulo e cor
são substituídos. Faça o backup antes e **confira o `?sala=N` de cada totem**: os que estavam em 2 a 5 passam a mostrar outro espaço.

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

## Mudanças do tour de 6 espaços

O que mudou no frontend, o contrato que o backend precisa entregar e os cuidados de contraste estão em
[`docs/mudancas-frontend-tour-6-espacos.md`](docs/mudancas-frontend-tour-6-espacos.md).
As mudanças de novembro de 2026 (check-in e perfil do aluno) estão na seção "Check-in e perfil" do mesmo documento;
o que falta no backend está em [`docs/passagem-para-o-backend.md`](docs/passagem-para-o-backend.md).

## Pendências para o backend

Ficaram de fora do frontend por dependerem do backend (detalhes em [`docs/passagem-para-o-backend.md`](docs/passagem-para-o-backend.md)):

- cidade ("Mora em") no perfil;
- álbuns de fotos no perfil (categoria em cada foto);
- botão "Conectar" e "Abrir no celular" (QR do perfil);
- várias redes por pessoa (hoje, uma) e coluna própria para a rede social;
- total exato de colegas da turma na API (hoje, até 4);
- troca do crédito e das legendas de exemplo que o `carregar_exemplo` grava no banco.
