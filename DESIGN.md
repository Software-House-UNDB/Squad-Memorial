---
name: Memorial Dom Bosco
description: Totens dos espaços do Memorial Dom Bosco Maria Izabel Rodrigues, em dourado e branco gelo (Proposta B), com a assinatura dourada da fundadora.
colors:
  grafite: "#23211D"
  grafite-2: "#3A3732"
  grafite-3: "#1F1E1C"
  dourado: "#C29A45"
  dourado-claro: "#E9D3A0"
  dourado-texto: "#855F10"
  dourado-fundo: "#F4E9CF"
  marfim: "#F6F8F8"
  areia: "#EEF2F1"
  cartao: "#FFFFFF"
  linha: "#E0E6E5"
  branco: "#FFFFFF"
  suave: "#5A5F62"
  suave-2: "#656A6D"
  suave-escuro: "#CFC8BA"
  erro: "#9A3B2E"
  sala-1: "#8E6918"
  sala-2: "#2F62B0"
  sala-3: "#17805F"
  sala-4: "#C43F60"
  sala-5: "#B85A0C"
  sala-6: "#6E4BA8"
typography:
  titulo:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "58px"
    fontWeight: 700
    lineHeight: 1.02
  ano:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "28px (destaque 40px)"
    fontWeight: 700
    fontFeature: "lnum tnum"
  texto:
    fontFamily: "Montserrat, Helvetica Neue, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.45
  apoio:
    fontFamily: "Montserrat"
    fontSize: "16px"
  rotulo:
    fontFamily: "Montserrat"
    fontSize: "14px"
    fontWeight: 700
    letterSpacing: "0.2em"
    textTransform: uppercase
rounded:
  cartao: "10px"
  perfil: "14px"
  pilula: "999px"
spacing:
  margem-lateral: "52px"
  toque-minimo: "56px"
  folga-toque: "12px"
components:
  aba-ativa:
    backgroundColor: "{colors.sala-N}"
    textColor: "{colors.branco}"
    rounded: "{rounded.pilula}"
    height: "56px"
  chip-ativo:
    backgroundColor: "{colors.grafite}"
    textColor: "{colors.marfim}"
    rounded: "{rounded.pilula}"
    height: "56px"
  cartao:
    backgroundColor: "{colors.cartao}"
    border: "1px {colors.linha}"
    rounded: "{rounded.cartao}"
---

# Design System: Memorial Dom Bosco

## Overview

**Norte criativo: "O selo da fundadora".** Cada totem é uma página do mesmo álbum: cabeçalho branco
com a assinatura dourada de Maria Izabel Rodrigues e uma borda de 3 px na cor do espaço, papel branco
gelo, filetes e pontos dourados tirados do monograma "1958". A cor de cada espaço marca o selo, a aba
ativa, o ano, o cartão de marco aberto e a capa do perfil, sem disputar com o dourado.

**Identidade vigente: "Proposta B · dourado e branco gelo"** (Marketing, 30/10/2026). A identidade
anterior (grafite e marfim quente) pode ser recuperada revertendo o commit "identidade visual".

Referência de composição: o protótipo `docs/referencia/tour-memorial-dom-bosco.html` (bloco
`/* totem (1600x900) */`). A composição é a mesma; os tamanhos foram aumentados para leitura de pé, a
50–80 cm da tela, e o contraste foi corrigido (ver "Contraste").

- **Palco lógico 1600 × 900 (16:9)**, escalado para a tela real e centralizado. A largura de referência é
  fixa (1600 deitado, 900 em pé) e a altura acompanha a proporção da tela: deitado até 1600 × 1200 (4:3), em pé
  de 900 × 1200 (3:4) a 900 × 2000. A sobra (`--sobra`) faz as telas das abas crescerem até 100 px deitado e
  160 px em pé; o resto vira respiro no papel, acima e abaixo da área principal. Em pé num tablet 3:4 a sobra é
  negativa e as fotos das abas encolhem até um piso. Fora desses limites ainda sobram faixas `--grafite-3`.
  Em 16:9 e 9:16 nada muda. Nada rola na página; só listas internas (períodos, resultados, vídeos) rolam,
  com barra visível.
- **Estrutura comum**: cabeçalho 78 px (+ borda de 3 px) · área principal (margens de 52 px) · rodapé 46 px com a dica de
  uso da aba e, à direita, o selo "Conteúdo de exemplo · Memorial Dom Bosco" quando a sala tiver
  conteúdo demonstrativo.
- **Duas atmosferas**: o branco gelo para navegar e o grafite (95%) para overlays (foto ampliada, player,
  QR do check-in, aviso de inatividade).

## Cores

Os tokens ficam em `frontend/src/estilos/tokens.css`; para aplicar o manual da marca, troque só ali.

- **Grafite** (`#23211D`): texto principal, chips ativos, fundo dos overlays e do teclado.
- **Dourado** (`#C29A45`): **só ornamento** sobre fundo claro (filetes, pontos, anéis, bordas, botão de
  play) e texto sobre grafite. Sobre o branco gelo ele tem 2,46:1 e nunca escreve.
- **Dourado-texto** (`#855F10`): todo texto dourado sobre fundo claro (eyebrows, rótulos em caixa-alta,
  tipo do vídeo, contagem). O protótipo usava `#8C6514`, que dava 4,37:1 sobre o champanhe.
- **Dourado-fundo / champanhe** (`#F4E9CF`): círculo de ícone e selo NOVO.
- **Dourado-claro** (`#E9D3A0`): rótulos e texto dourado sobre grafite; início do degradê do play.
- **Suave** / **Suave-2** (`#5A5F62` / `#656A6D`): textos de apoio. O protótipo usava `#73787B` (4,19:1).
- **Branco gelo** (`--marfim`, `#F6F8F8`), **areia**, **cartão** (`#FFFFFF`), **linha**: superfícies.
- **Branco** (`--branco`, `#FFFFFF`): **todo texto sobre a cor do espaço** (aba ativa, selo, ano, cartão de
  marco aberto, cartão do perfil). Não use o branco gelo aí: sobre a Esportes ele dá 4,37:1.
- **Cor do espaço**: 1 Fundação `#8E6918`, 2 Diretores `#2F62B0`, 3 Professores `#17805F`,
  4 Artes `#C43F60`, 5 Esportes `#B85A0C`, 6 Alunos `#6E4BA8`. Entra no selo do cabeçalho, na borda
  inferior do cabeçalho, na aba ativa, no ano dos marcos, no período/década selecionado, no cartão de
  marco aberto e na capa e no cartão do perfil (degradê da cor para uma versão 40% mais escura).

### Contraste (valores finais, WCAG 2.1)

Medidos pelo teste `frontend/src/estilos/contraste.test.ts`, que falha se algum par cair abaixo de 4,5:1.

| Texto | Fundo | Contraste |
|---|---|---|
| grafite | branco gelo / areia | 15,08 / 14,24 |
| grafite-2 | areia | 10,50 |
| suave | branco gelo / areia | 6,07 / 5,73 |
| suave-2 | branco gelo / cartão / areia | 5,14 / 5,47 / 4,85 |
| dourado-texto | branco gelo / cartão / areia | 5,41 / 5,77 / 5,11 |
| dourado-texto (selo NOVO) | dourado-fundo | 4,78 |
| dourado | grafite / grafite-3 | 6,12 / 6,35 |
| dourado-claro | grafite / grafite-2 | 10,94 / 8,06 |
| suave-escuro | grafite | 9,66 |
| branco | sala 1 / 2 / 3 / 4 / 5 / 6 | 5,02 / 6,01 / 4,90 / 4,97 / 4,66 / 6,49 |
| cor da sala (texto) | cartão | igual à linha acima |
| erro | branco gelo | 6,48 |
| *dourado (só ornamento)* | *branco gelo* | *2,46* |

## Tipografia

**Cormorant Garamond** (títulos, anos, nomes; 500–700 e itálico) e **Montserrat** (textos, 400–700),
instaladas com `@fontsource`, nunca por CDN. Anos usam algarismos alinhados (`.num`).

Mínimos no palco 1600 × 900 (o protótipo, feito como apresentação, ficava abaixo deles):

| Uso | Protótipo | Totem |
|---|---|---|
| Texto corrido (subtítulos, descrições, estados vazios) | 12,5–15 px | **18 px** |
| Texto secundário (legendas, contagens, metadados, dica do rodapé) | 11–13 px | **16 px** |
| Rótulos em caixa-alta (eyebrow, "PERÍODOS DE 5 ANOS", tipo do vídeo) | 9,5–11,5 px | **14 px** |
| Botões, abas, chips | 13–14 px | 16–17 px |
| Título da sala | 58 px | 58 px |

Sobre o grafite (texto grande): títulos dos overlays 32–72 px, nome no perfil 34 px.

## Toque

Todo alvo mede **56 px ou mais** (valor do design anterior), com pelo menos 12 px entre vizinhos:
abas, itens da lista de períodos, chips de década, setas, botão Fechar, Voltar, teclas (62 px), pontos
da linha do tempo (círculo de 56 px em volta do ponto de 16 px), cartões de pessoa (86 px) e pílulas de
colega (60 px). Não existe hover: todo elemento tocável tem `:active` (escala, borda dourada ou fundo).

## Componentes

- **Cabeçalho** (78 px, branco, borda inferior de 3 px na cor do espaço): assinatura dourada com 46 px
  de altura, divisor, selo redondo com o número de dois dígitos ("06") na cor do espaço e anel dourado,
  "SALA 06" + nome em serif, e à direita "PERCURSO", seis pontos e "Sala 06 de 06". **Os pontos são
  indicadores, não botões**: cada totem conhece só a própria sala.
- **Abas em pílula** sobre a areia: Apresentação, Linha do tempo, Marcos, Fotos e Vídeos (+ **Colegas** na
  Sala 06). A ativa é preenchida com a cor do espaço, com texto branco. A barra tem `z-index` acima do
  conteúdo da aba Colegas (sem isso, o título da busca capturava o toque). Com o teclado virtual aberto
  e dentro do perfil de um aluno, as abas ficam ocultas.
- **Foto de época**: a imagem com tom sépia, moldura branca e sombra interna; sem imagem, a moldura
  provisória (degradê quente com o ícone). Usada na Apresentação, nas décadas e nos marcos.
- **Apresentação**: foto à esquerda (600 px) com legenda, texto à direita (título 44 px, parágrafos de
  18 px) e três atalhos de 56 px para Linha do tempo, Marcos e Fotos.
- **Linha do tempo**: sete décadas lado a lado sobre um fio dourado (ponto, "Anos 60", "1958 a 1969",
  título). A década escolhida mostra um painel branco com borda superior na cor do espaço: foto, "DÉCADA
  n DE 7", resumo, três acontecimentos com o ano em pílula e setas anterior/próxima.
- **Marcos**: quatro cartões (foto de 214 px com o ano em pílula, ícone, título, frase curta). O toque
  abre o texto explicativo e o cartão ganha a cor do espaço com texto branco; só um abre por vez. Acima
  de 4 marcos, rolagem lateral com encaixe.
- **Polaroide**: moldura branca, rotação de ±0,6°, legenda "**ano** *legenda*". Sem imagem, uma moldura
  provisória (degradê quente com o ícone da sala).
- **Overlays**: grafite a 95%, botão Fechar em pílula dourada no canto, legenda "ANO · FOTO i DE n".
  O player tem tocar/pausar, barra de progresso, tempo, som (mudo e volume) e legenda WebVTT. O botão de
  play dos vídeos é um círculo com degradê dourado.
- **Perfil do aluno** (rede social): capa de 176 px na cor do espaço (degradê, prédio da escola em traço
  e a tag "Turma X · ano"), botão **Voltar à busca** branco sobre a capa, avatar de 152 px sobreposto,
  nome em serif 44 px, pilha de colegas e quatro abas (Visão geral, Fotos, Colegas, Sobre). O **cartão**
  de 400 px (ANO EM QUE ESTUDOU, TURMA e redes) usa o degradê da cor do espaço com texto branco, moldura
  interna translúcida e o monograma branco a 12%.
- **Teclado virtual**: grafite, fixo embaixo, letras, espaço, Apagar, Limpar e Pronto. Com ele aberto,
  o título recolhe para os resultados subirem.

## Marcas

Em `frontend/src/assets/memorial/`, extraídas do protótipo:

- `assinatura-dourada.png` (900 × 229, **versão dourada**): cabeçalho branco dos totens.
- `assinatura.png` (900 × 229, **versão clara**): fundos escuros (check-in, escolha de sala).
- `monograma.png` (520 × 537, dourado): ícones do PWA (sobre `#1F1E1C`) e aviso de inatividade.
- `monograma-branco.png` (520 × 537): marca d'água do cartão do perfil.
- `icone.png` (120 × 124, **versão escura**): selo do rodapé.
- `placa-checkin.jpg`: a placa de entrada do protótipo, como referência (o QR de verdade vem do admin).

## Movimento

Curto e com saída suave (`cubic-bezier(.22, 1, .36, 1)`, 240 ms). Entrada de conteúdo com 8 px de
deslocamento. `prefers-reduced-motion` desliga tudo.

## Do's and Don'ts

- **Do** usar `--dourado-texto` em todo texto dourado sobre fundo claro.
- **Do** usar `--branco` para todo texto sobre a cor do espaço.
- **Do** manter alvos de 56 px e texto corrido de 18 px no palco.
- **Do** mostrar o selo "Conteúdo de exemplo" enquanto a sala tiver conteúdo demonstrativo.
- **Don't** escrever com `--dourado` sobre branco gelo, areia ou cartão.
- **Don't** pôr texto branco gelo (`--marfim`) sobre a cor do espaço: na Esportes dá 4,37:1.
- **Don't** carregar fontes, ícones ou scripts de CDN: tudo precisa funcionar offline.
- **Don't** mostrar e-mail de ex-aluno em lugar nenhum da interface.
