# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

O app roda num totem touch-screen Android, em navegador quiosque, em tela cheia. É um PWA web, não um app nativo.

## Users

- **Alunos e calouros**: comunidade acadêmica atual, de passagem pelo hall.
- **Visitantes e famílias**: pessoas de fora conhecendo a instituição.
- **Convidados de cerimônias**: público de solenidades e eventos institucionais.

Todos leem de pé, a cerca de 50–80 cm da tela, e usam só o toque. O uso costuma ser rápido, muitas vezes em grupo. Ninguém recebe instrução antes de tocar.

## Product Purpose

Memorial digital da UNDB Centro Universitário: apresenta a história da instituição em uma linha do tempo de marcos, uma galeria de fotos por período e vídeos (depoimentos, eventos e registros institucionais). Dá certo quando quem passa entende em segundos o que é o totem, toca e encontra a história da instituição sem ajuda.

## Positioning

É o acervo da própria UNDB, organizado por período histórico e exibido num ponto físico do campus. Não é um site institucional nem uma vitrine de marketing.

## Operating Context

- **Local:** hall de entrada, uma área de passagem e espera.
- **Ociosidade:** depois de um tempo sem toque, o totem volta ao Início, fecha fotos e vídeos abertos e liga a proteção de tela com fotos do acervo. O contador de inatividade fica pausado enquanto um vídeo toca.
- **Atualização:** a equipe cadastra o conteúdo pelo `/admin` do Django. O totem consulta a versão periodicamente, baixa o conteúdo novo e só o aplica quando está ocioso. Uma versão nova do app também só é instalada no ócio.
- **Orientação:** o totem pode ficar em pé (1080×1920) ou deitado (1920×1080).

## Capabilities and Constraints

- **Telas:** Início, História (linha do tempo), Fotos (galeria por período, com lightbox de deslizar) e Vídeos (filtro por categoria e player próprio). Há também proteção de tela, carregamento e estados vazios.
- **Offline:** precisa funcionar 100% sem rede. App, dados, miniaturas e capas ficam no cache do service worker. Fontes, ícones e scripts não podem vir de CDN.
- **Contrato da API:** `GET /api/totem/` (tudo numa chamada) e `GET /api/totem/versao/`, somente leitura.
- **Escala:** a interface precisa aguentar dezenas de períodos e centenas de fotos, não só os dados de exemplo.
- **Quiosque:** sem zoom por pinça, sem menu de toque longo, sem arrastar imagens. Não há mouse, hover nem teclado.
- **Toque:** alvos de no mínimo 56 px, com espaço entre eles.
- **Idioma:** todo texto de interface em português do Brasil.
- **Dependências:** nada pesado; qualquer dependência nova precisa de justificativa.
- **Em aberto:** quem é a equipe responsável por cadastrar e curar o acervo.

## Brand Commitments

- **Instituição:** UNDB Centro Universitário. O nome do produto na interface é "Memorial".
- **Logo oficial:** `frontend/src/assets/logoundb{preta,cinza,branca}.png`. Não pode ser recolorido, distorcido nem filtrado. Mantém a proporção original e uma área de respiro ao redor.
- **Tom:** institucional e acolhedor, de memória e legado ("Nossa história, nosso legado.").

## Evidence on Hand

- Parte do acervo real já está digitalizada, mas o cadastro no sistema está no começo.
- O comando `carregar_exemplo` gera dados de teste (5 marcos, fotos e vídeos de exemplo) que não são conteúdo real.
- Não inventar marcos, datas, legendas, depoimentos nem números da instituição. O conteúdo vem sempre do cadastro.

## Product Principles

1. **Entender em dois segundos:** quem passa precisa ver o que é e onde tocar, sem instrução.
2. **O acervo em primeiro plano:** fotos e vídeos lideram, e a interface recua quando o conteúdo está na tela.
3. **Nunca mudar a tela debaixo do dedo:** atualizações e retorno ao Início só acontecem no ócio.
4. **Funcionar sozinho:** sem rede, sem operador e sem estado travado. Todo caminho tem saída por toque.
5. **Crescer sem quebrar:** cada tela vale tanto para cinco períodos quanto para cinquenta.

## Accessibility & Inclusion

- **Leitura à distância e de pé:** texto com contraste de pelo menos 4,5:1 (3:1 para texto grande e elementos gráficos, incluindo o logo).
- **Toque:** alvos grandes, com feedback visual ao tocar (`:active`), já que não existe hover.
- **Movimento:** respeitar `prefers-reduced-motion`.
