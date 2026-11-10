# Frontend · do totem de 5 salas ao "Tour do Memorial · 6 espaços"

Escopo: **somente `frontend/`**, mais a documentação (`README.md`, `PRODUCT.md`, `DESIGN.md` e esta nota).

## Commits

1. `feat(frontend): tour de 6 espaços …` — estrutura, telas e contrato de dados.
2. `style(frontend): identidade "Proposta B …"` — só paleta e cabeçalho. Revertível sozinho.
3. `docs: nota de mudanças …` — este arquivo (primeira versão).
4. `style(frontend): cartão do perfil na cor do espaço` — pedido do Henry: o cartão (ano, turma, redes) deixou de ser
   dourado e passou a usar a cor da Sala 06 (roxo `#6E4BA8`, em degradê), com texto branco.
   **Substituído em novembro de 2026:** o perfil voltou ao dourado (ver "Check-in e perfil", ao final).
5. `fix(frontend): abas da Sala 06 não respondiam depois de abrir Colegas` — o título da busca ficava por cima da
   barra de abas e capturava o toque; a barra ganhou `z-index: 5` (`totem.css`).
6. `docs: README, PRODUCT e DESIGN` — atualização da documentação para os 6 espaços.

## Arquivos principais

| Arquivo | O que é |
|---|---|
| `frontend/src/dados/salas.ts` | as 6 salas (slug, nome, subtítulo, cor, tipo) e o helper `dois(n)` |
| `frontend/src/dados/tipos.ts` | contrato da API (`Apresentacao`, `Decada`, `Acontecimento`, campos novos de `Marco`) |
| `frontend/src/dados/regras.ts` | `decadasDaSala`, `apresentacaoDaSala`, `nomeDaDecada`, `marcosOrdenados` (com testes) |
| `frontend/src/dados/demo.ts` + `exemplo.json` | conteúdo de demonstração do tour novo |
| `frontend/src/telas/SalaConteudo.tsx` | tela única dos 6 espaços (abas, overlays e a aba Colegas) |
| `frontend/src/telas/Apresentacao.tsx`, `LinhaDoTempo.tsx`, `Marcos.tsx` | as telas novas |
| `frontend/src/telas/Colegas.tsx`, `Busca.tsx`, `Perfil.tsx` | aba Colegas (antes `SalaFechamento`), busca e perfil em formato de rede social |
| `frontend/src/telas/AbasSala.tsx`, `estado.ts` | abas em pílula e estado do totem (`linha`, `marcoAberto`, `perfilAba`) |
| `frontend/src/componentes/FotoEpoca.tsx` | foto com tom sépia e moldura |
| `frontend/src/estilos/tokens.css`, `contraste.test.ts` | paleta Proposta B e teste de contraste (inclui Sala 06) |

Removidos: `telas/Historia.tsx` e `telas/SalaFechamento.tsx`. Novo ícone `home` em `componentes/Icone.tsx`.

## O que mudou na tela

| Antes | Agora |
|---|---|
| 5 salas (Educação, Troféus, Artes, Professoras, Fechamento) | 6 espaços: Fundação, Diretores, Professores, Artes, Esporte, Alunos |
| Abas História, Fotos, Vídeos | Apresentação, Linha do tempo, Marcos, Fotos, Vídeos (+ **Colegas** na Sala 06) |
| Linha do tempo horizontal com marcos | Linha do tempo = 7 décadas (1958–1969 … 2020–2026) com painel (foto, resumo, 3 acontecimentos) |
| — | Marcos = 4 cartões por espaço; o toque abre o texto explicativo |
| Sala 5 só com a busca de ex-alunos | Sala 06 = as 5 abas + Colegas (busca e perfil em formato de rede social; o perfil foi refeito em novembro de 2026) |
| Rótulos "SALA 5", "Sala 5 de 5" | "SALA 06", "Sala 06 de 06" |

Mantidos: Fotos e Vídeos (inclusive overlays), inatividade (90 s + 15 s) voltando à Apresentação, Voltar do Android,
teclado virtual, cache offline, modo demo (`VITE_MODO_DEMO=1`), alvos de toque ≥ 56 px.

Fora do escopo, de propósito (não existem na API): botão "Conectar", "Abrir no celular" (QR do perfil), cidade,
categorias de álbum. O perfil mostra só o que a API já entrega (ano, turma, redes sociais, fotos aprovadas, colegas). As redes
chegam nos campos `instagram` e `facebook`, e o frontend reconhece outras redes pelo formato do campo (ver "Check-in e perfil").

## Contrato do backend (`GET /api/memorial/sala/<n>/`)

Implementado no backend (migrações `0010` a `0012`) e cadastrado pelo `/admin`:

- **Salas 1 a 6**. Slugs/cores:
  `fundacao #8E6918`, `diretores #2F62B0`, `professores #17805F`, `artes #C43F60`, `esporte #B85A0C`, `alunos #6E4BA8`.
  A Sala 06 tem `tipo: "fechamento"`; as demais, `"conteudo"`.
- `apresentacao` (opcional): `{ titulo, texto: string[], foto?: url|null, legenda, icone }`.
- `decadas` (opcional, 7 itens): `{ id, rotulo: "Anos 60", periodo: "1958 a 1969", titulo, resumo, icone, foto?, acontecimentos: [{ano, texto} × 3] }`.
- `marcos[]`: 4 por espaço; campos novos opcionais `foto` (url|null) e `texto` (texto longo, aberto no toque).
- Sem `decadas`, o app monta as décadas a partir dos `marcos`; sem `apresentacao`, usa título e subtítulo da sala.
- Os tipos estão em `frontend/src/dados/tipos.ts`; o conjunto de exemplo (`dados/demo.ts` + `exemplo.json`) já segue este formato.

## Atenção

- `frontend/src/dados/exemplo.json` e o `tour.json` do backend têm o mesmo conteúdo: mude os dois juntos.
  `scripts/extrair_exemplo.py` ainda extrai o protótipo antigo e sobrescreveria os dois: não rode antes de atualizá-lo.
- Contraste: o protótipo tinha dois pares abaixo de 4,5:1 (dourado-texto sobre champanhe, 4,37; cinza secundário sobre branco
  gelo, 4,19) e a cor Esporte não sustenta texto em branco gelo (4,37). Escurecemos os dois tons e o texto sobre a cor do espaço
  é branco puro. O `contraste.test.ts` cobre isso.
- `DESIGN.md` ganhou um aviso: suas tabelas ainda descrevem a paleta anterior.

## Como conferir

```bash
cd frontend
npm ci && npm run typecheck && npm run test:unit && npm run build
VITE_MODO_DEMO=1 npm run dev     # abra /?sala=1 … /?sala=6 em 1600×900
```

## Check-in e perfil (novembro de 2026)

Escopo: **somente `frontend/`** (e a documentação). O contrato da API não mudou. Nada em `backend/`.

### Check-in (`/checkin`)

| Arquivo | O que faz |
|---|---|
| `frontend/src/checkin/Checkin.tsx` | a página: formulário, termo, tela de sucesso e a faixa "Modo demonstração" (só com `VITE_MODO_DEMO=1`) |
| `frontend/src/checkin/FolhaRedes.tsx` | a folha "Mais redes" (X, YouTube, Threads, Kwai, Pinterest, Snapchat, Telegram, Twitch, GitHub, Behance e "Outra rede") |
| `frontend/src/checkin/checkin.css` | estilos do check-in (inclui o termo recolhível e o fallback `100vh`/`100dvh`) |
| `frontend/src/checkin/reduzir.ts` | reduz as fotos no celular antes do envio (aviso "Preparando suas fotos…") |
| `frontend/src/dados/redes.ts` (+ `redes.test.ts`) | lista de redes, leitura do que a pessoa digita ou cola, validação do usuário e o formato guardado (`empacotar` / `lerRedes`) |
| `frontend/src/dados/termo.ts` (+ `termo.test.ts`) | texto de reserva do termo e `separarTermo` (primeira linha = título, resto = corpo) |
| `frontend/src/dados/validacao.ts`, `tipos.ts` | regras do formulário (`MAX_FOTOS = 3`) e o tipo `DadosCheckin` |
| `frontend/src/dados/fonte.ts`, `demo.ts` | envio ao servidor (ou ao navegador, no modo demonstração, chave `memorial:demo:checkins`) |

O que o formulário faz hoje:

- **Campos:** nome, ano, turma (texto livre, até 30 caracteres), e-mail, uma rede social opcional, até 3 fotos e o aceite do termo. O turno chegou a ser
  perguntado e foi retirado: a turma é enviada e guardada como a pessoa digitou ("3º A"), sem sufixo.
- **Rede social:** uma por pessoa. Quatro botões à vista (Instagram, TikTok, LinkedIn, Facebook) e "Mais redes". A pessoa digita só o usuário (o prefixo do
  endereço aparece fixo no campo) ou cola o link inteiro, e a rede é reconhecida (`lerEntrada`). "Outra rede" aceita um endereço curto (`site.com/perfil`, até 94
  caracteres, sem `https://` nem parâmetros: `normalizarOutra`). O totem mostra o endereço como texto, nunca como link.
- **Termo:** a caixa de aceite tem a frase "Li e aceito o termo de uso dos meus dados e da minha imagem" e, abaixo, "Ler termo completo" (`<details>`), com o texto
  justificado (`lang="pt-BR"`, hifenização, `white-space: pre-line`). O texto vem de `GET checkin/`; `termo.ts` é só o valor inicial e o texto do modo
  demonstração. O botão "Fazer check-in" fica desativado até a configuração carregar; se falhar, aparece "Não foi possível carregar o termo" e "Tentar de novo".
  A versão do termo não é mostrada, mas o servidor continua gravando a versão aceita (`consentimento_versao`).
- **Sucesso:** "Check-in feito, <nome>!", a orientação da Sala 06 e "Comece pela Sala 01 (Fundação)" com a lista das 6 salas. Não há botão para fazer outro
  check-in e nenhuma trava nova no aparelho; o servidor continua tratando e-mail + ano repetidos como atualização.
- **Envio e erros (`fonte.ts`):** tempo limite de 60 s ("O envio demorou demais…"), 429 ("Muitos envios seguidos…"), 413 (fotos grandes demais) e erros 400 do servidor
  mostrados no campo certo (o erro de `instagram` ou `facebook` aparece no campo único da rede).
- **Teclado e layout:** `inputMode`, `autoComplete`, `autoCapitalize` e `enterKeyHint` nos campos; Ano e Turma lado a lado com os campos alinhados.

#### Como a rede é guardada sem mudar o servidor

| Rede escolhida | Campo enviado | Valor |
|---|---|---|
| Instagram | `instagram` | `maria.souza` |
| Facebook | `facebook` | `maria.souza` (sem prefixo, igual aos cadastros antigos) |
| TikTok, LinkedIn, X, YouTube, Threads, Kwai, Pinterest, Snapchat, Telegram, Twitch, GitHub, Behance | `facebook` | `<rede>/<usuario>`, ex.: `tiktok/maria` |
| Outra rede | `facebook` | `outra/<site>/<caminho>`, ex.: `outra/site.com/maria` |

Só `empacotar` e `lerRedes`, em `redes.ts`, conhecem esse formato. Até o backend ser ajustado, o painel de aprovações
(`administracao_aprovacoes.html`) e o admin mostram essas redes com o rótulo "Facebook" (ex.: "Facebook: tiktok/maria"). A migração está em
[`passagem-para-o-backend.md`](passagem-para-o-backend.md).

### Perfil do aluno (Sala 06, aba Colegas)

| Arquivo | O que mudou |
|---|---|
| `frontend/src/telas/Perfil.tsx` | o perfil inteiro: capa, cabeçalho, abas com contador e as quatro abas |
| `frontend/src/telas/sala5.css` | visual dourado (capa com o prédio, avatar, cartão dourado, cartões brancos) e tipografia única |
| `frontend/src/telas/totem.css`, `estilos/tokens.css` | fundo da página com brilho dourado; token `--champanhe` |
| `frontend/src/telas/Colegas.tsx`, `SalaConteudo.tsx`, `estado.ts` | abrir as fotos do perfil em tela cheia (overlay `fotoPerfil`) |
| `frontend/src/componentes/Icone.tsx`, `Avatar.tsx` | ícones de cada rede e de cadeado; iniciais do avatar |

- **Cabeçalho e abas:** "Ex-aluno(a) do Colégio Dom Bosco · Turma X · ano". Abas Visão geral, Fotos (n), Colegas (n) e Sobre. A API devolve no máximo 4 colegas e não
  informa o total, então com 4 o contador mostra "4+" (e o texto, "4 ou mais").
- **Visão geral:** cartão dourado com ano e turma, as redes (com o ícone de cada uma; Kwai e "Outra rede" usam o ícone de link), "E-mail oculto pelo Memorial" ou
  "Nenhuma rede social informada"; fotos (até 6, com "Ver todas") e colegas da turma (com "Ver todos").
- **Fotos:** grade de até 12 com legenda (e "Mostrando 12 de n fotos" quando há mais). **Colegas:** cartões com nome, turma, ano e "Ver perfil". **Sobre:** três cartões
  (No Colégio Dom Bosco, No Memorial, Privacidade).
- **Fotos em tela cheia:** o mesmo overlay das salas (setas e Fechar). O Voltar do Android fecha o overlay antes de voltar do perfil à busca (`navegacao/voltar.ts`).
- **Fonte:** títulos dos cartões em serif; o resto em Montserrat, igual nas quatro abas.

### Conteúdo de exemplo

- O rodapé "Conteúdo de exemplo" saiu de `Moldura.tsx` e o crédito saiu de `OverlayFoto.tsx` (o crédito só aparece se existir e não começar com "Conteúdo de
  exemplo"). `demo.ts` e `exemplo.json` não trazem mais crédito nem "foto de exemplo".
- O campo `demonstrativo` continua na API, no banco e em `tipos.ts`; o frontend só não o exibe.
- A faixa "Modo demonstração: nada é enviado" do check-in continua, só com `VITE_MODO_DEMO=1`. O build de produção não deve ter essa variável.
- O banco ainda tem o que o `carregar_exemplo` grava ("Conteúdo de exemplo · Memorial Dom Bosco" no crédito das fotos e "foto de exemplo" em legendas): trocar no
  Admin ou no backend.

### Testes

`testes/e2e.mjs` (demonstração ou servidor real): o check-in valida o nome, escolhe o TikTok e confirma que a pessoa aparece na Sala 06 sem recarregar, com a turma e
`tiktok.com/@…`; o perfil da Ana confere as 3 fotos e a rede e abre um colega; a API nunca devolve e-mail. `npm run test:unit` cobre a leitura das redes, o formato guardado, a
validação do check-in e o texto do termo.
