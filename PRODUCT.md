# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Cinco totens touchscreen Android (um por sala), em navegador quiosque e tela cheia, rodando o mesmo PWA;
cada um abre em `/?sala=N` e mostra só a própria sala. O check-in é uma página web comum, aberta no
celular do visitante pelo QR Code da placa de entrada.

## Users

- **Ex-alunos e ex-alunas**: o público principal. Voltam à escola para rever a própria época e
  reencontrar colegas.
- **Famílias e visitantes**: conhecem a história da escola pelo percurso.
- **Equipe do Memorial**: cadastra o conteúdo, aprova fotos enviadas e atende pedidos de remoção.

Nos totens, todos leem de pé, a 50–80 cm da tela, só com o toque, muitas vezes em grupo e sem
instrução. No check-in, cada um usa o próprio celular, em pé, na entrada.

## Product Purpose

O **Memorial Dom Bosco Maria Izabel Rodrigues** conta a história da escola (fundada em 1958) em cinco
salas: Educação, Troféus, Artes, Professoras e Fechamento. As salas 1 a 4 têm linha do tempo, fotos por
períodos de 5 anos e vídeos. Na sala 5, quem fez check-in na entrada é encontrado pelos colegas, pelo
nome, pelo ano ou pela década. Dá certo quando o visitante faz o check-in em menos de um minuto, segue o
percurso e, no fim, encontra o próprio nome e os colegas da mesma turma.

## Operating Context

- **Percurso**: entrada (placa com QR Code) → salas 1 a 4 → sala 5. Cada totem mostra "Sala N de 5".
- **Ociosidade**: depois de 90 s sem toque, aviso de 15 s; depois, o totem volta ao início da sala.
  O aviso não aparece com vídeo tocando.
- **Atualização**: a equipe cadastra pelo `/admin`. Cada totem consulta a versão da própria sala e só
  troca o conteúdo no início da sala ou depois de 30 s sem toque.
- **Rede**: salas 1 a 4 funcionam offline com a última cópia; a sala 5 precisa do servidor (a busca e os
  check-ins novos vêm dele) e avisa quando está sem conexão.

## Capabilities and Constraints

- **Telas do totem**: História, Fotos, Vídeos (salas 1 a 4); Busca e Perfil (sala 5); foto ampliada,
  player, QR do check-in, aviso de inatividade e escolha de sala.
- **Check-in**: nome completo, ano, turma, e-mail, Instagram e Facebook opcionais, até 3 fotos
  opcionais e autorização obrigatória. Mesmo e-mail + mesmo ano atualiza o cadastro.
- **Privacidade**: e-mail nunca sai do servidor; perfil só com consentimento; fotos só depois de
  aprovadas; remoção completa pelo admin. O termo precisa ser validado pela escola.
- **Contrato da API**: `/api/memorial/` (sala, versão, alunos, perfil, check-in). Ver README.
- **Quiosque**: sem zoom, sem menu de toque longo, sem teclado do sistema (teclado virtual próprio),
  botão Voltar nunca sai do app.
- **Toque**: alvos de no mínimo 56 px; texto de 18 px ou mais no palco.
- **Idioma**: português do Brasil.
- **Dependências**: nada pesado; qualquer dependência nova precisa de justificativa.

## Brand Commitments

- **Nome**: Memorial Dom Bosco Maria Izabel Rodrigues ("Memorial Dom Bosco" no app instalado).
- **Marcas**: a assinatura da fundadora (cabeçalho) e o monograma "1958" (ícone e marca d'água).
  As cores ainda serão confirmadas com o manual da marca; estão todas em `tokens.css`.
- **Tom**: acolhedor e de reencontro ("Encontre seus colegas", "Registre sua passagem").

## Evidence on Hand

- O protótipo aprovado (`docs/referencia/tour-memorial-dom-bosco.html`) define telas e comportamento.
- O conteúdo de exemplo (`carregar_exemplo`) é fictício: marcos, legendas, vídeos e os 22 ex-alunos.
  Não é fato histórico da escola e aparece com o selo "Conteúdo de exemplo".

## Product Principles

1. **O percurso é a interface**: cada totem diz em que sala você está e o que tocar.
2. **O reencontro é o fim do tour**: o check-in da entrada existe para a sala 5 funcionar.
3. **Nunca mudar a tela debaixo do dedo**: conteúdo novo e retorno ao início só no ócio.
4. **Só o que a pessoa autorizou**: nome, ano, turma e redes; o resto fica no servidor.
5. **Funcionar sozinho**: sem operador, sem estado travado, com saída por toque em toda tela.

## Accessibility & Inclusion

- Contraste de pelo menos 4,5:1 para texto (valores no DESIGN.md, conferidos por teste).
- Alvos grandes com `:active` visível; não existe hover.
- `prefers-reduced-motion` respeitado; legendas WebVTT opcionais nos vídeos.
- Check-in com rótulos, mensagens de erro ligadas aos campos e foco no primeiro erro.
