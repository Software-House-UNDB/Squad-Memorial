---
name: Memorial Dom Bosco
description: Totens das salas do Memorial Dom Bosco Maria Izabel Rodrigues, em grafite, dourado e marfim, com a assinatura da fundadora.
colors:
  grafite: "#2B2A28"
  grafite-2: "#3D3B38"
  grafite-3: "#1F1E1C"
  dourado: "#B08D57"
  dourado-claro: "#D9C39B"
  dourado-texto: "#7C6034"
  dourado-fundo: "#EFE6D6"
  marfim: "#F3F0EA"
  areia: "#E9E4DA"
  cartao: "#FBF9F5"
  linha: "#E2DCD1"
  suave: "#5E5A53"
  suave-2: "#67635D"
  suave-escuro: "#CFC8BA"
  erro: "#9A3B2E"
  sala-1: "#4A4844"
  sala-2: "#84673A"
  sala-3: "#8E5444"
  sala-4: "#5A6650"
  sala-5: "#2B2A28"
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
    textColor: "{colors.marfim}"
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

**Norte criativo: "O selo da fundadora".** Cada totem é uma página do mesmo álbum: cabeçalho grafite
com a assinatura de Maria Izabel Rodrigues, papel marfim, filetes e pontos dourados tirados do
monograma "1958". A cor de cada sala marca o número da sala, a aba ativa e o destaque, sem disputar com
o dourado.

Referência de composição: o protótipo `docs/referencia/tour-memorial-dom-bosco.html` (bloco
`/* totem (1600x900) */`). A composição é a mesma; os tamanhos foram aumentados para leitura de pé, a
50–80 cm da tela, e o contraste foi corrigido (ver "Contraste").

- **Palco lógico 1600 × 900 (16:9)**, escalado para a tela real e centralizado. Em telas 16:10 sobram
  faixas `--grafite-3` em cima e embaixo. Nada rola na página; só listas internas (períodos, resultados,
  vídeos) rolam, com barra visível.
- **Estrutura comum**: cabeçalho 78 px · área principal (margens de 52 px) · rodapé 46 px com a dica de
  uso da aba e, à direita, o selo "Conteúdo de exemplo · Memorial Dom Bosco" quando a sala tiver
  conteúdo demonstrativo.
- **Duas atmosferas**: o marfim para navegar e o grafite (95%) para overlays (foto ampliada, player,
  QR do check-in, aviso de inatividade).

## Cores

Os tokens ficam em `frontend/src/estilos/tokens.css`; para aplicar o manual da marca, troque só ali.

- **Grafite** (`#2B2A28`): cabeçalho, cartão do perfil, chips ativos, texto principal.
- **Dourado** (`#B08D57`): **só ornamento** sobre fundo claro (filetes, pontos, anéis, bordas) e texto
  sobre grafite. Sobre o marfim ele tem 2,72:1 e nunca escreve.
- **Dourado-texto** (`#7C6034`): todo texto dourado sobre fundo claro (eyebrows, rótulos em caixa-alta,
  tipo do vídeo, contagem). O protótipo usava `#8A6B3A` (4,35:1).
- **Dourado-claro** (`#D9C39B`): rótulos e texto dourado sobre grafite.
- **Suave** / **Suave-2** (`#5E5A53` / `#67635D`): textos de apoio. O protótipo usava `#77736C` (4,15:1).
- **Cor da sala**: 1 `#4A4844`, 2 `#84673A`, 3 `#8E5444` (terracota), 4 `#5A6650` (verde-oliva),
  5 `#2B2A28`. Entra no selo do cabeçalho, na aba ativa, no anel e no ano do marco em destaque, na borda
  do cartão em destaque e no período selecionado. **A sala 2 foi escurecida** de `#A07D47` (marfim sobre
  ela: 3,35:1) para `#84673A`, mantendo o tom.

### Contraste (valores finais, WCAG 2.1)

Medidos pelo teste `frontend/src/estilos/contraste.test.ts`, que falha se algum par cair abaixo de 4,5:1.

| Texto | Fundo | Contraste |
|---|---|---|
| grafite | marfim / areia | 12,61 / 11,32 |
| grafite-2 (abas inativas) | areia | 8,81 |
| suave | marfim / areia | 6,03 / 5,41 |
| suave-2 | marfim / cartão / areia | 5,25 / 5,67 / 4,71 |
| dourado-texto | marfim / cartão / areia | 5,16 / 5,58 / 4,63 |
| dourado-texto (selo NOVO) | dourado-fundo | 4,74 |
| dourado | grafite / grafite-3 | 4,64 / 5,39 |
| dourado-claro | grafite / grafite-2 | 8,35 / 6,50 |
| suave-escuro | grafite | 8,62 |
| marfim | sala 1 / 2 / 3 / 4 / 5 | 8,02 / 4,64 / 5,27 / 5,35 / 12,61 |
| erro | marfim | 6,08 |
| *dourado (só ornamento)* | *marfim* | *2,72* |

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

- **Cabeçalho** (78 px, grafite): assinatura com 46 px de altura, divisor, selo redondo com o número na
  cor da sala, "SALA N" + nome em serif, e à direita "PERCURSO", cinco pontos e "Sala N de 5". **Os
  pontos são indicadores, não botões**: cada totem conhece só a própria sala.
- **Abas em pílula** (História, Fotos, Vídeos) sobre a areia; a ativa é preenchida com a cor da sala.
- **Linha do tempo**: fio com degradê dourado, marcos alternando acima e abaixo, ponto na linha, ano em
  serif e cartão (ícone, título, descrição de até 3 linhas). Destaque: ano maior na cor da sala, anel e
  borda do cartão na cor da sala. 4 a 10 marcos cabem na tela; acima disso, rolagem lateral com encaixe.
- **Polaroide**: moldura branca, rotação de ±0,6°, legenda "**ano** *legenda*". Sem imagem, uma moldura
  provisória (degradê quente com o ícone da sala).
- **Overlays**: grafite a 95%, botão Fechar em pílula dourada no canto, legenda "ANO · FOTO i DE n".
  O player tem tocar/pausar, barra de progresso, tempo, som (mudo e volume) e legenda WebVTT.
- **Cartão de perfil** (400 px): grafite, moldura dourada interna, monograma a 5% ao fundo, anel dourado
  com o avatar (foto ou iniciais em serif), blocos ANO EM QUE ESTUDOU e TURMA, redes informadas.
- **Teclado virtual**: grafite, fixo embaixo, letras, espaço, Apagar, Limpar e Pronto. Com ele aberto,
  o título recolhe para os resultados subirem.

## Marcas

Em `frontend/src/assets/memorial/`, extraídas do protótipo:

- `assinatura.png` (900 × 229, **versão clara**): cabeçalho de todos os totens e do check-in.
- `monograma.png` (520 × 537, dourado): ícones do PWA (sobre `#1F1E1C`), aviso de inatividade e marca
  d'água do perfil (5%).
- `icone.png` (120 × 124, **versão escura**): selo do rodapé.
- `placa-checkin.jpg`: a placa de entrada do protótipo, como referência (o QR de verdade vem do admin).

## Movimento

Curto e com saída suave (`cubic-bezier(.22, 1, .36, 1)`, 240 ms). Entrada de conteúdo com 8 px de
deslocamento. `prefers-reduced-motion` desliga tudo.

## Do's and Don'ts

- **Do** usar `--dourado-texto` em todo texto dourado sobre fundo claro.
- **Do** manter alvos de 56 px e texto corrido de 18 px no palco.
- **Do** mostrar o selo "Conteúdo de exemplo" enquanto a sala tiver conteúdo demonstrativo.
- **Don't** escrever com `--dourado` sobre marfim, areia ou cartão.
- **Don't** pôr texto marfim sobre a cor original da sala 2 (`#A07D47`).
- **Don't** carregar fontes, ícones ou scripts de CDN: tudo precisa funcionar offline.
- **Don't** mostrar e-mail de ex-aluno em lugar nenhum da interface.
