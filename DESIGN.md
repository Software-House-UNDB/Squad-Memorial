---
name: Memorial UNDB
description: Totem de memória institucional da UNDB, em papel envelhecido, tinta azul e filetes dourados.
colors:
  papel-de-arquivo: "#f5efe3"
  papel-envelhecido: "#ece2cf"
  folha-nova: "rgba(255, 252, 245, 0.9)"
  vinco-de-papel: "#e3d5b8"
  tinta-ferrogalica: "#1d3461"
  ferrogalica-diluida: "#2f4f86"
  ouro-de-lombada: "#b8893b"
  ouro-desbotado: "#d9bb7e"
  ouro-gravado: "#86601f"
  sepia-de-escrita: "#3b3328"
  sepia-esmaecida: "#6e6352"
  louro-prateado: "#9fb0cc"
  noite-de-exposicao: "#0e1321"
typography:
  display:
    fontFamily: "Cinzel, Trajan Pro, Georgia, serif"
    fontSize: "clamp(3.4rem, 10vmin, 8.5rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.08em"
  headline:
    fontFamily: "Cinzel, Trajan Pro, Georgia, serif"
    fontSize: "clamp(2.6rem, 6.5vmin, 4.75rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0.07em"
  title:
    fontFamily: "Cinzel, Trajan Pro, Georgia, serif"
    fontSize: "2rem"
    fontWeight: 600
    letterSpacing: "0.06em"
  year:
    fontFamily: "EB Garamond, Garamond, Georgia, serif"
    fontSize: "2.4rem"
    fontWeight: 500
    lineHeight: 1
    fontFeature: "lnum"
  body:
    fontFamily: "EB Garamond, Garamond, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.35
  label:
    fontFamily: "Cinzel, Trajan Pro, Georgia, serif"
    fontSize: "0.95rem"
    fontWeight: 400
    letterSpacing: "0.12em"
rounded:
  miniatura-tira: "6px"
  miniatura: "8px"
  aba: "10px"
  cartao: "12px"
  pilula: "999px"
spacing:
  folga-toque: "0.75rem"
  grupo: "1.25rem"
  secao: "1.5rem"
  bloco: "2rem"
  toque-minimo: "3.5rem"
components:
  botao:
    backgroundColor: "{colors.ouro-desbotado}"
    textColor: "{colors.tinta-ferrogalica}"
    typography: "{typography.label}"
    rounded: "{rounded.pilula}"
    padding: "0 2rem"
    height: "3.5rem"
  botao-redondo-escuro:
    backgroundColor: "rgba(255, 255, 255, 0.14)"
    textColor: "#ffffff"
    rounded: "{rounded.pilula}"
    size: "4.5rem"
  chip:
    backgroundColor: "{colors.folha-nova}"
    textColor: "{colors.tinta-ferrogalica}"
    rounded: "{rounded.pilula}"
    padding: "0 1.8rem"
    height: "3.5rem"
  chip-ativo:
    backgroundColor: "{colors.tinta-ferrogalica}"
    textColor: "#ffffff"
    rounded: "{rounded.pilula}"
  cartao:
    backgroundColor: "{colors.folha-nova}"
    textColor: "{colors.sepia-de-escrita}"
    rounded: "{rounded.cartao}"
    padding: "1.75rem"
  aba-navegacao:
    textColor: "{colors.tinta-ferrogalica}"
    typography: "{typography.label}"
    rounded: "{rounded.aba}"
    padding: "0 1.25rem"
    height: "3.5rem"
  seta-de-toque:
    backgroundColor: "{colors.tinta-ferrogalica}"
    textColor: "#ffffff"
    rounded: "{rounded.pilula}"
    size: "3.25rem"
---

# Design System: Memorial UNDB

## Overview

**Creative North Star: "O Livro de Honra"**

O totem é um álbum solene e encadernado da instituição, aberto no hall de entrada. O fundo é papel de arquivo creme com aquarelas difusas e uma textura de fibra quase imperceptível. Os títulos são inscrições em capitulares romanas (Cinzel), o texto corre numa Garamond de livro e a ornamentação se limita ao que um encadernador usaria: filetes dourados, um losango no centro do divisor, ramos de louro desenhados e uma onda azul com fio de ouro fechando o rodapé, como a borda de uma capa.

O clima é **solene e acolhedor** ao mesmo tempo. Solene porque trata da memória da instituição com respeito: tinta azul profunda, ouro contido, nenhuma informalidade. Acolhedor porque o papel é quente, os cantos são suaves e cada elemento tocável responde ao dedo. Quem passa com pressa precisa entender em segundos o que é e onde tocar, por isso a ornamentação nunca disputa atenção com a hierarquia.

Quando o acervo entra em cena (lightbox, player, proteção de tela), o livro se fecha e a sala escurece: o fundo vira a noite de exposição, a interface recua e só restam controles brancos e o ouro desbotado nos anos.

**Key Characteristics:**
- Papel creme com aquarela e textura; nunca branco puro como fundo de página.
- Tinta azul-marinho para títulos e ações, ouro para filetes e ornamentos.
- Cinzel em caixa alta e espaçada para títulos; EB Garamond para leitura e anos.
- Ornamento de encadernação: filete, losango, louro e onda com fio de ouro.
- Duas atmosferas: o livro claro para navegar e a sala escura para o acervo.
- Superfícies quase planas que respondem ao toque com firmeza.

## Colors

Uma paleta de arquivo: papéis em três idades, uma única tinta azul e o ouro em três intensidades, cada uma com uma função.

### Primary
- **Tinta Ferrogálica** (tinta-ferrogalica): a tinta de pena dos documentos antigos. Usada nos títulos, nos nomes de seção, na seta de toque dos cartões, nos chips ativos e na onda do rodapé. É a cor da ação e da autoridade.
- **Ferrogálica Diluída** (ferrogalica-diluida): a segunda camada da onda do rodapé e o fundo das capas de vídeo sem imagem. Nunca aparece em texto.

### Secondary
- **Ouro de Lombada** (ouro-de-lombada): o dourado gravado na lombada. Aparece em filetes, losangos, contornos de ícones, sublinhado da aba ativa e no fio da onda. É ornamento e gráfico, **não texto pequeno** (2,75:1 sobre o papel).
- **Ouro Gravado** (ouro-gravado): o ouro escurecido para texto pequeno, como contagens ("15 FOTOS"), links ("VER 3 FOTOS"), faixa de anos e rótulos (4,9:1 sobre o papel).
- **Ouro Desbotado** (ouro-desbotado): bordas de chips e filtros, preenchimento do botão, anos e barra de progresso sobre fundos escuros (10:1 sobre a noite de exposição).

### Tertiary
- **Louro Prateado** (louro-prateado): exclusivo dos ramos de louro, que são decorativos e ficam em segundo plano. Não usar em nenhum outro lugar.

### Neutral
- **Papel de Arquivo** (papel-de-arquivo): o fundo de toda a experiência clara e da faixa fixa do índice de décadas.
- **Papel Envelhecido** (papel-envelhecido): espaço reservado de imagens que ainda carregam.
- **Folha Nova** (folha-nova): superfície dos cartões, quase branca e levemente translúcida sobre o papel.
- **Vinco de Papel** (vinco-de-papel): bordas de cartões, divisória do Topo e do rodapé dos cartões, fio da galeria.
- **Sépia de Escrita** (sepia-de-escrita): texto corrido principal (10,8:1).
- **Sépia Esmaecida** (sepia-esmaecida): descrições, legendas e textos de apoio (5,1:1).
- **Noite de Exposição** (noite-de-exposicao): fundo do lightbox e base da proteção de tela, o modo "sala escura".

### Named Rules
**A Regra do Ouro que Não Fala.** O Ouro de Lombada desenha, mas não escreve. Todo texto dourado sobre papel usa o Ouro Gravado.

**A Regra da Tinta Única.** Só existe um azul de ação. Nenhum segundo acento compete com a Tinta Ferrogálica nas telas claras.

## Typography

**Display Font:** Cinzel (com Trajan Pro, Georgia)
**Body Font:** EB Garamond (com Garamond, Georgia)

**Character:** Capitulares romanas de inscrição sobre uma Garamond de livro: a pedra gravada e a página impressa. As duas são locais via @fontsource (Cinzel 500/600; EB Garamond 400, 500 e 400 itálico).

A escala parte do menor lado da tela: `html { font-size: clamp(15px, 0.85vmin + 8px, 30px) }` deitado, e `clamp(16px, 1.3vw + 8px, 34px)` em pé. Na prática, 1rem vale cerca de 17px em 1920×1080 e 22px em 1080×1920, então todos os tamanhos em rem crescem quando o totem fica em pé.

### Hierarchy
- **Display** (600, clamp(3.4rem, 10vmin, 8.5rem), 1): apenas a palavra "MEMORIAL" no Início e na proteção de tela. Caixa alta.
- **Headline** (600, clamp(2.6rem, 6.5vmin, 4.75rem), 1.05): títulos de seção (HISTÓRIA, FOTOS, VÍDEOS), ladeados por louros. Caixa alta.
- **Title** (600, 2rem): nomes nos cartões de seção do Início; o nome "MEMORIAL" no Topo usa 1.6rem. Caixa alta.
- **Year** (EB Garamond 500, 2.4rem, algarismos alinhados): anos da linha do tempo, da galeria e do lightbox. Os anos sempre falam em Garamond, nunca em Cinzel.
- **Body** (400, 1.2–1.4rem, 1.35): descrições, legendas e títulos de marco (1.55rem, 500). Medida máxima de 60ch.
- **Label** (Cinzel 400–500, 0.95–1.1rem, 0.12em, caixa alta): contagens, links de ação, abas, rótulo do índice de décadas.
- **Itálico** (EB Garamond itálico): subtítulo do Início, dicas ("Toque em uma seção para começar"), mensagens de espera e de estado vazio.

### Named Rules
**A Regra da Inscrição.** Cinzel só em caixa alta e sempre com espaçamento positivo (de 0.06em a 0.12em). Nunca em frases longas.

**A Regra do Mínimo de Longe.** Nenhum texto lido no totem fica abaixo de 0.95rem; os textos de leitura ficam a partir de 1.2rem.

## Layout

- **Base:** o app ocupa a tela inteira sem rolagem do documento. As telas internas têm o Topo fixo e uma área de conteúdo que rola sozinha. A coluna de conteúdo usa `min(100% - 3rem, 70rem)`, centralizada; a linha do tempo se limita a 52rem.
- **Duas orientações**, trocadas por `@media (orientation: portrait)`:
  - **Deitado:** o Topo põe a marca à esquerda e as abas à direita; os cartões do Início ficam em 3 colunas; cada período da galeria tem o texto numa coluna de 12rem e a tira de fotos ao lado.
  - **Em pé:** o Topo centraliza a marca e põe as abas numa linha de largura total; os cartões do Início empilham em linhas horizontais (ícone, texto, seta); o texto do período fica acima da tira de fotos.
- **Ritmo:** os grupos internos são apertados (0.3–0.6rem); entre cartões, 1.25–1.5rem; entre blocos, 2rem. O Início é centralizado verticalmente e reserva 14vh embaixo para a onda.
- **Acervo grande:** com 9 ou mais períodos, um índice de décadas fica fixo no topo da rolagem. A galeria mostra 11 miniaturas por período e um bloco "+N fotos".
- **Toque:** todo alvo mede no mínimo 3.5rem (60px deitado, 77px em pé), com pelo menos 0.75rem de folga entre vizinhos.

## Elevation & Depth

Quase plano. A profundidade vem do papel em camadas: cartões translúcidos de Folha Nova sobre o Papel de Arquivo, contornados pelo Vinco de Papel. As sombras existentes são baixas, quentes e difusas, só para descolar o cartão do fundo; não sinalizam hierarquia.

### Shadow Vocabulary
- **Repouso** (`box-shadow: 0 1px 2px rgba(60, 45, 20, 0.06), 0 6px 18px rgba(60, 45, 20, 0.08)`): cartões, nós da linha do tempo, miniaturas.
- **Toque** (`box-shadow: 0 2px 4px rgba(60, 45, 20, 0.08), 0 14px 34px rgba(60, 45, 20, 0.14)`): só durante `:active` e no período destacado ao chegar pela linha do tempo.

### Named Rules
**A Regra do Papel Pousado.** Uma superfície nunca ganha mais que a sombra de Repouso parada. A sombra mais funda só aparece como resposta ao toque.

## Shapes

- **Cantos suaves e contidos:** cartões com 12px, miniaturas com 8px, abas com 10px e miniaturas do lightbox com 6px. Tudo o que é ação discreta (chips, filtros, décadas, botões, setas, fechar) é pílula ou círculo.
- **Círculos de medalha:** os ícones de seção e de estado vazio ficam em círculos de Folha Nova com contorno dourado de 1.5px; os nós da linha do tempo, em círculos com contorno de 2px.
- **Escudo:** marca os períodos na galeria (um escudo de Tinta Ferrogálica, recortado com `clip-path`).
- **Losango:** o centro de todo divisor.

## Components

### Buttons
Táteis e firmes: afundam um pouco ao toque.
- **Shape:** pílula (999px), altura mínima de 3.5rem.
- **Primary:** fundo de Ouro Desbotado e texto em Tinta Ferrogálica, em Cinzel 600, 1.1rem. Hoje aparece no erro do player ("Voltar aos vídeos").
- **Redondo escuro:** círculo de 4.5rem com fundo branco a 14% e contorno branco a 40%, usado sobre a noite de exposição (fechar, setas do lightbox, play/pause).
- **Active:** `scale(0.92–0.96)` e fundo mais claro (branco a 30% nos escuros). Não existe hover.

### Chips
- **Style:** pílula de Folha Nova com borda de 1.5px em Ouro Desbotado e texto em Tinta Ferrogálica (filtros de vídeo em 1.3rem, décadas em 1.35rem Garamond).
- **State:** o ativo inverte para fundo de Tinta Ferrogálica com texto branco. No toque, `scale(0.95)`.

### Cards / Containers
- **Corner Style:** 12px.
- **Background:** Folha Nova, com borda de 1px em Vinco de Papel.
- **Shadow Strategy:** Repouso parado e Toque no `:active` (ver Elevation & Depth).
- **Toque:** `scale(0.98)` e a borda passa a Ouro de Lombada: o filete dourado "acende".
- **Internal Padding:** cerca de 1.75rem nos cartões de seção e 1.15–1.5rem nos marcos.

### Navigation
- **Topo:** papel translúcido com desfoque e linha de Vinco embaixo. À esquerda ficam o logo da UNDB, um filete dourado vertical e "MEMORIAL"; tocar nessa marca volta ao Início.
- **Abas:** Cinzel 1.1rem em caixa alta, com ícone dourado. A ativa tem peso 600 e sublinhado dourado de 3px. A aba "Início" é uma caixa de Folha Nova.

### Cartão de seção do Início (signature)
Ícone em círculo de medalha, título em Cinzel, descrição em Garamond e um rodapé com a contagem em Ouro Gravado. A **seta de toque** é um círculo de Tinta Ferrogálica com chevron branco, o "botão" visível que mostra onde tocar sem precisar de hover. No toque, a seta anda 4px para a direita. Em pé, o cartão vira uma linha horizontal.

### Linha do tempo (signature)
Três colunas: o ano em Garamond, um nó circular com ícone e o cartão do marco. Um fio dourado vertical liga os nós. O cartão inteiro é tocável e leva às fotos do período.

### Divisor e ornamentos (signature)
- **Divisor:** duas linhas de 1px em Ouro de Lombada com um losango no centro.
- **Louro:** ramo procedural em Louro Prateado, espelhado nos dois lados dos títulos.
- **Onda do rodapé:** duas camadas de azul com fio de ouro de 3px, fixa no rodapé de todas as telas claras.

### Logo UNDB
Vem dos arquivos oficiais, sem recolorir nem filtrar; o CSS define só a altura.
- **Cinza (#363636):** sobre o papel (Topo, Início, Carregando).
- **Branca:** sobre fundos escuros (proteção de tela).
- **Preta:** reservada.

O logo fica sempre com respiro de pelo menos metade da própria altura.

## Do's and Don'ts

### Do:
- **Do** usar Ouro Gravado em todo texto dourado sobre papel, e Ouro de Lombada só em linhas, ícones e ornamentos.
- **Do** dar a todo elemento tocável um `:active` visível (escala, borda dourada ou fundo mais claro), porque não existe hover.
- **Do** manter alvos de no mínimo 3.5rem com 0.75rem de folga.
- **Do** escrever os anos em EB Garamond com algarismos alinhados.
- **Do** escurecer para a Noite de Exposição quando o acervo ocupa a tela inteira (lightbox, player, proteção de tela).
- **Do** respeitar `prefers-reduced-motion`; as animações existentes são curtas e com saída exponencial (`cubic-bezier(0.22, 1, 0.36, 1)`).

### Don't:
- **Don't** recolorir, distorcer, aplicar filtro ou mudar a proporção do logo oficial da UNDB.
- **Don't** usar Ouro de Lombada em texto pequeno sobre o papel (2,75:1).
- **Don't** usar fundo branco puro nas telas claras; a página é sempre papel.
- **Don't** escrever frases longas em Cinzel nem usar Cinzel sem caixa alta.
- **Don't** aumentar sombras além da de Repouso em superfícies paradas.
- **Don't** carregar fontes, ícones ou scripts de CDN: tudo precisa funcionar offline.
