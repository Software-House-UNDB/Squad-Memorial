# Passagem para o backend

> **Atualização (10/11/2026): os itens 1 a 7 de "Trabalho no backend" foram feitos.** Resumo no fim deste documento, em
> "Feito no backend". O que falta é a parte do frontend ("Depois do backend") e os "Outros itens".

Para quem for ajustar o backend depois das mudanças do check-in e do perfil do aluno (novembro de 2026). O frontend foi feito **sem tocar no
contrato da API**: tudo que ele precisou guardar coube nos campos que já existiam. Este documento diz como ler esse formato, o que fazer no
backend para ter o desenho final e o que muda no frontend depois.

Contexto das mudanças: [`mudancas-frontend-tour-6-espacos.md`](mudancas-frontend-tour-6-espacos.md), seção "Check-in e perfil (novembro de 2026)".

## Situação atual

- **Turma:** o frontend envia e guarda a turma como a pessoa digitou (`turma`, até 30 caracteres, ex.: "3º A"). **Não existe coluna de turno**: o turno chegou a ser
  perguntado no check-in e foi retirado do produto. Cadastros feitos enquanto o turno existia podem ter a turma com sufixo (ex.: "3º A - Matutino"); o frontend os
  mostra como estão.
- **Rede social:** uma por pessoa, guardada nos campos `instagram` e `facebook` do `Aluno` (`backend/memorial/models.py`: `instagram` até 60 e `facebook` até 100 caracteres).
  O servidor valida os dois em `CheckinSerializer` (`backend/memorial/serializers.py`: `validate_instagram` aceita `[A-Za-z0-9._]{1,30}`; `validate_facebook` aceita
  `[A-Za-z0-9.\-_/?=]{1,100}` e tira o prefixo `facebook.com/`). **Não há lista de redes no servidor.**
- **O que o frontend grava:**

  | Rede escolhida | Campo | Valor |
  |---|---|---|
  | Instagram | `instagram` | usuário, ex.: `maria.souza` |
  | Facebook | `facebook` | usuário, sem prefixo, igual aos cadastros antigos |
  | TikTok, LinkedIn, X, YouTube, Threads, Kwai, Pinterest, Snapchat, Telegram, Twitch, GitHub, Behance | `facebook` | `<rede>/<usuario>`, ex.: `tiktok/maria` |
  | Outra rede | `facebook` | `outra/<site>/<caminho>`, ex.: `outra/site.com/maria` (até 94 caracteres, sem `https://` e sem parâmetros) |

- **Quem conhece esse formato:** só `frontend/src/dados/redes.ts` (`empacotar` para gravar, `lerRedes` para ler). O servidor trata tudo como um Facebook.
- **Efeito colateral até o backend ser ajustado:** o painel de aprovações (`backend/memorial/templates/memorial/administracao_aprovacoes.html`) e o admin
  (`backend/memorial/admin.py`, grupo "Redes sociais (aparecem no perfil)") mostram qualquer rede que não seja Instagram com o rótulo "Facebook"
  (ex.: "Facebook: tiktok/maria").
- **A API do perfil** (`montar_aluno_perfil`, `GET alunos/<id>/`) devolve `instagram` e `facebook` como estão e **até 4 colegas** da mesma turma, sem o total
  (`backend/memorial/views.py`, função `aluno`). O frontend mostra "4+" quando recebe 4.
- **Termo:** o texto vem de `GET checkin/` (Admin › Configuração do memorial). O texto padrão do banco (`TERMO_PADRAO` em `models.py`) ainda é o antigo,
  curto: o texto novo precisa ser colado no Admin, com a **versão aumentada** (ex.: 2.0), no mesmo dia da publicação. O servidor grava a versão aceita em
  cada cadastro (`consentimento_versao`); o frontend não a mostra.

## Do que está guardado hoje para o desenho final

| O que está guardado | Vira |
|---|---|
| `instagram` preenchido | rede `instagram`, usuário = o valor |
| `facebook` sem barra, ou começando com `facebook.com` | rede `facebook`, usuário = o valor sem o prefixo `facebook.com/` |
| `facebook` = `<rede>/<usuario>` com `<rede>` na lista do frontend (`tiktok`, `linkedin`, `x`, `youtube`, `threads`, `kwai`, `pinterest`, `snapchat`, `telegram`, `twitch`, `github`, `behance`) e um único trecho depois da barra | essa rede e esse usuário |
| `facebook` = `outra/<site>/<caminho>` | rede `outra`, com o link `https://<site>/<caminho>` |

Atenção ao converter: a regra do frontend (`PREFIXADA` em `redes.ts`) só reconhece uma das 12 redes seguida de **exatamente um** trecho. Qualquer outro valor em
`facebook` (inclusive com barra, como um caminho de página do Facebook) continua sendo Facebook. Um perfil de Facebook que por acaso comece com um desses prefixos
seguido de barra (ex.: `x/algo`) seria lido como a outra rede; o frontend tem a mesma ambiguidade hoje.

## Trabalho no backend

1. **Lista de redes por aluno**, até 3, cada uma com `rede` e `usuario` (ou `link` para "outra"). Pode ser um modelo novo ligado ao `Aluno` ou um campo estruturado.
2. **Validação de cada rede no servidor**, no mesmo rigor do frontend (os padrões por rede estão em `frontend/src/dados/redes.ts`, campo `usuario` de cada item de `REDES`):
   uma expressão por rede; "outra" só com `https`, domínio e caminho, sem parâmetros e **nunca** como link clicável (o totem mostra o endereço como texto).
3. **A API do perfil devolvendo as redes em lista** (ex.: `redes: [{ rede, usuario }]`, com `link` em "outra"). Manter `instagram` e `facebook` na resposta enquanto
   houver totem ou celular com o frontend antigo.
4. **Painel de aprovações e admin** mostrando o rótulo certo de cada rede (hoje todas, menos o Instagram, aparecem como "Facebook").
5. **Migração de dados reversível:** uma migração nova depois da última existente (hoje `0013_aviso_por_email`, conferir o número em `backend/memorial/migrations`), que
   leia `instagram` e `facebook` conforme a tabela acima e crie as redes, com `reverse_code` que reescreva os dois campos antigos no formato que o frontend atual grava.
6. **Manter os campos antigos por compatibilidade** até todos os totens e celulares terem o frontend novo; só então pensar em removê-los.
7. **Testes** em `backend/memorial/tests.py`: conversão dos dados antigos, validação por rede, e que nenhuma resposta da API contém e-mail (já existe teste para isso).

## Depois do backend: o que muda no frontend

Para liberar até 3 redes por pessoa:

- `frontend/src/dados/redes.ts`: trocar o corpo de `empacotar` e `lerRedes` (o resto do app trabalha com valores limpos: rede e usuário).
- `frontend/src/dados/fonte.ts` (envio) e `frontend/src/dados/demo.ts` (gravação no navegador): enviar e guardar a lista em vez de `instagram` e `facebook`.
- `frontend/src/checkin/Checkin.tsx` e `frontend/src/dados/validacao.ts`: hoje o formulário tem **uma** rede (estado `rede` e `usuario`); para aceitar até 3 é preciso ajustar
  o formulário e a validação, além das três funções acima. O perfil (`Perfil.tsx`) já mostra uma lista de redes, pois `lerRedes` devolve uma lista.

## Outros itens que dependem do backend

- **Cidade ("Mora em")** no perfil: campo novo no `Aluno`, no check-in e na API.
- **Álbuns de fotos no perfil:** categoria em cada foto (`FotoAluno`) e a API devolvendo-a; o frontend passaria a filtrar por álbum.
- **Total exato de colegas** na API do perfil (hoje a lista é cortada em 4 e o frontend mostra "4+").
- **Botão "Conectar" e "Abrir no celular" (QR do perfil):** dependem de uma API de perfil público ou de um endereço próprio por perfil.
- **Conteúdo de exemplo no banco:** o `carregar_exemplo` (`backend/memorial/management/commands/carregar_exemplo.py`) grava o crédito "Conteúdo de exemplo · Memorial Dom Bosco"
  (constante `CREDITO`) e `backend/memorial/exemplo/tour.json` tem a expressão "foto de exemplo" em legendas (e o mesmo conteúdo existe em `frontend/src/dados/exemplo.json`).
  O totem não mostra mais isso, mas os dados continuam no banco: trocar no Admin ou no backend. O texto de ajuda de `demonstrativo` (`models.py`) e o comentário do comando
  ainda dizem que o totem mostra o selo "Conteúdo de exemplo", o que deixou de ser verdade.
- **Termo padrão:** atualizar `TERMO_PADRAO` em `models.py` se quiser que instalações novas já saiam com o texto novo, e avisar o jurídico da UNDB (controlador dos dados, prazo de guarda,
  não compartilhar com terceiros, contato e menores de 18 anos).

## Feito no backend (10/11/2026)

- **Modelo `RedeSocial`** (`backend/memorial/models.py`): `aluno`, `rede` (as 14 redes do frontend e `outra`), `usuario`, `ordem`; até 3 por
  ex-aluno (`MAX_REDES` em `backend/memorial/redes.py`), sem repetir a mesma rede e usuário.
- **Regras por rede** em `backend/memorial/redes.py` (`validar`), iguais às de `redes.ts`: um link de rede conhecida vale mais que a rede
  escolhida; "outra" vira `site.com/caminho` (sem `https://`, `www.`, parâmetros nem `@`), até 94 caracteres.
- **Check-in** (`POST checkin/`): aceita o campo novo `redes` (JSON, até 3) ou os campos antigos `instagram` e `facebook` (o frontend atual),
  convertidos com a tabela acima e conferidos pela regra de cada rede (ex.: `telegram/abc` é recusado, o Telegram pede 5 caracteres).
  O check-in refeito troca as redes. Gravação dentro de uma transação.
- **API do perfil** (`GET alunos/<id>/`): `redes: [{rede, rotulo, usuario}]`, com `link` (`https://site.com/caminho`) em "outra", e
  `totalColegas` (total exato da turma; `colegas` continua com até 4). `instagram` e `facebook` continuam na resposta, reescritos a partir das
  redes (`campos_antigos`: o primeiro Instagram e a primeira das outras redes).
- **Painel e admin**: a tela de aprovações mostra "TikTok: tiktok.com/@maria"; o cadastro do ex-aluno (painel e `/admin`) edita as redes
  numa lista de até 3, com a mesma validação; o grupo Administrativo recebeu as permissões das redes. Os campos `instagram` e `facebook`
  não são mais editáveis à mão.
- **Migração** `0014_redes_sociais`: cria as redes a partir dos campos antigos; o `reverse_code` reescreve os campos antigos a partir delas.
- **Termo padrão** (`TERMO_PADRAO` em `models.py`) igual ao de `frontend/src/dados/termo.ts`, versão padrão 2.0. Só vale para instalações
  novas: num banco que já existe, o texto continua o que está em Configuração do memorial.
- **E-mail (SMTP)**: `EMAIL_USE_SSL` (porta 465), `EMAIL_BACKEND` opcional, botão "Enviar e-mail de teste para mim" na tela de aprovações,
  comando `testar_email` e aviso quando ninguém da equipe tem e-mail cadastrado.

Para o frontend usar a lista: em `frontend/src/dados/redes.ts`, `lerRedes` pode ler `perfil.redes` quando vier (e cair em
`instagram`/`facebook` quando não vier), e `fonte.ts` pode enviar `redes` em JSON em vez de `empacotar`.
