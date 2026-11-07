# Requisitos do servidor próprio da universidade

Documento de requisitos para hospedar o Memorial Dom Bosco em um **servidor da própria universidade**, sem nuvem
pública (AWS, Vercel, Cloudflare). Inclui o dimensionamento do servidor para receber **muitas fotos e vídeos enviados pelos
ex-alunos** no check-in.

- **Base**: arquitetura do repositório em 06/11/2026 (commit `6dd0aa6`).
- **Para quem**: TI da universidade (infraestrutura, redes, segurança) e equipe de desenvolvimento.
- **Como ler**: as seções 3 e 4 trazem as contas; a seção 5 é a especificação para compra ou alocação de VM. Os números são
  estimativas e devem ser revistos com amostras reais (seção 12).

---

## 1. Arquitetura atual

Tudo roda em contêineres Docker num único host (`docker-compose.yml`):

```
celular do visitante ─┐
totens (6, Android) ──┼─▶ nginx :80 ─┬── /, /checkin        → build do frontend (React + Vite, PWA)
equipe (navegador) ───┘              ├── /media/            → volume "media" (fotos e vídeos)
                                     ├── /static/           → volume "static" (CSS do admin)
                                     └── /api, /admin,
                                         /administracao     → backend Django + gunicorn :8000 ─▶ PostgreSQL 16
```

| Componente | Imagem / tecnologia | Papel |
|---|---|---|
| `nginx` | nginx 1.27-alpine, com o build do frontend embutido (`nginx/Dockerfile`) | entrega o app, as mídias (com Range, para o vídeo avançar) e faz proxy para o Django |
| `backend` | Python 3.12, Django 5.1, DRF, Pillow, ffmpeg (`backend/Dockerfile`) | API dos totens, check-in, `/admin`, painel `/administracao/`, processamento de mídia |
| `db` | postgres:16-alpine | dados (salas, conteúdo, ex-alunos, registro de entradas e saídas) |
| `cloudflared` | opcional (perfil `tunel`) | túnel https para o Vercel alcançar o servidor. **Sai** no servidor da universidade |

### Como a mídia entra e é guardada hoje

| Origem | Limite atual | O que é guardado (`backend/memorial/models.py`, `media.py`) |
|---|---|---|
| Fotos do check-in (ex-alunos) | 3 fotos de até 10 MB; o celular já reduz para 2560 px antes de enviar (`frontend/src/checkin/reduzir.ts`); nginx aceita 30 MB na rota | **só** a versão reencodada: JPEG 2560 px + miniatura 480 px, sem EXIF. O original é descartado |
| Fotos do acervo (equipe, `/admin`) | sem limite próprio | **original** + exibição 2560 px + miniatura 480 px |
| Vídeos do acervo (equipe) | até 2 GB por envio (nginx) | o arquivo como enviado (MP4/WebM) + capa JPEG 960 px gerada pelo ffmpeg |
| Vídeos de ex-alunos | **não existe hoje** | (requisito novo, seção 7) |

Pontos da arquitetura que pesam no dimensionamento:

- O processamento é **síncrono**, dentro da requisição: a foto é redimensionada enquanto o visitante espera, e o aviso por e-mail
  também (timeout de 5 s). Para fotos funciona; para vídeo de aluno não funciona (transcodificar leva de dezenas de segundos a
  minutos).
- O gunicorn tem **3 workers síncronos** e timeout de 600 s. No `/admin` e no `/administracao` o nginx repassa o envio sem buffer
  (`proxy_request_buffering off`), então cada envio de vídeo grande ocupa um worker até terminar.
- O cache do Django (limite de frequência do check-in) é em arquivo, em `/tmp` do contêiner. Funciona bem em um servidor só.
- Os totens guardam até 4.000 imagens no cache do navegador (`frontend/vite.config.ts`); os vídeos são sempre transmitidos do
  servidor.
- O service worker (modo offline dos totens) **só funciona em https** (ou `localhost`). No servidor da universidade, os totens
  também precisam acessar por https.

---

## 2. Escopo

**Dentro**: hardware ou VM, armazenamento, rede, DNS e certificado, sistema operacional, backup, monitoramento, segurança, e as
mudanças no sistema para aceitar vídeos dos ex-alunos e rodar fora da nuvem.

**Fora**: os totens Android (só os requisitos mínimos de armazenamento deles, em RI-12), o conteúdo histórico, a validação jurídica
do termo de consentimento (continua pendente com a escola, ver README).

---

## 3. Premissas de volume

### 3.1 Tamanho de cada arquivo

| Item | Tamanho estimado | De onde vem |
|---|---|---|
| Foto de ex-aluno guardada (2560 px + miniatura) | **1,1 MB** | JPEG qualidade 85 de 2560 px ≈ 1,0 MB; miniatura ≈ 50 KB |
| Foto enviada pelo celular (já reduzida) | 1,5 MB | JPEG 0,88 a 2560 px |
| Foto do acervo (original + versões) | 9 MB | original escaneado ≈ 8 MB |
| Vídeo de ex-aluno **guardado** (transcodificado 1080p, H.264 CRF 23 ≈ 5 Mbit/s, AAC 128 kbit/s) | **38 MB por minuto** | 5,1 Mbit/s × 60 s ÷ 8 |
| Vídeo de ex-aluno guardado em 720p (≈ 2,5 Mbit/s) | 19 MB por minuto | alternativa econômica |
| Vídeo **original** do celular, 1080p 30 fps (≈ 17 Mbit/s) | 130 MB por minuto | temporário, até transcodificar |
| Vídeo original do celular, 4K (≈ 45 Mbit/s) | 340 MB por minuto | temporário |
| Vídeo do acervo, 5 min em 1080p | 190 MB | recomendação de `ffmpeg` do README |

### 3.2 Cenários de uso

| Parâmetro | A · Base | B · Projeto (recomendado) | C · Alto |
|---|---|---|---|
| Check-ins por ano | 3.000 | 10.000 | 30.000 |
| Check-ins que enviam fotos | 60 % | 70 % | 70 % |
| Fotos por check-in (média) | 2 | 3 | 3 |
| Check-ins que enviam vídeo | 15 % | 25 % | 35 % |
| Vídeos por check-in com vídeo (média) | 1 | 1,5 | 2 |
| Duração média do vídeo | 1,5 min | 2 min | 2 min |
| Check-ins na hora de pico (evento de reencontro) | 60 | 200 | 400 |

O cenário **B** é o alvo: um memorial aberto ao público com eventos de reencontro de turmas. O **C** cobre datas como o
jubileu de 70 anos da escola (2028) e uma divulgação ampla do check-in.

### 3.3 Acervo institucional (fixo)

6 salas × ~300 fotos × 9 MB ≈ **16 GB**; 6 salas × ~20 vídeos × 190 MB ≈ **23 GB**. Total **≈ 40 GB**, crescendo pouco.

---

## 4. Dimensionamento

### 4.1 Armazenamento de mídia

**Por ano** (só o que fica guardado, sem originais de vídeo):

| | A · Base | B · Projeto | C · Alto |
|---|---|---|---|
| Fotos de ex-alunos por ano | 3.600 → **4 GB** | 21.000 → **23 GB** | 63.000 → **69 GB** |
| Vídeos de ex-alunos por ano | 450 × 57 MB → **26 GB** | 3.750 × 76 MB → **285 GB** | 21.000 × 76 MB → **1,6 TB** |
| **Total por ano** | **≈ 30 GB** | **≈ 310 GB** | **≈ 1,7 TB** |

**Em 5 anos** (volume anual × 5 + acervo de 40 GB, × 1,3 de folga para sistema de arquivos, capas, legendas e erro das estimativas):

| | A · Base | B · Projeto | C · Alto |
|---|---|---|---|
| Mídia em 5 anos | **≈ 250 GB** | **≈ 2,1 TB** | **≈ 11 TB** |
| Se a escola decidir **guardar o original** dos vídeos (preservação histórica) | ≈ 800 GB | ≈ 8,4 TB | ≈ 47 TB |

Os vídeos são mais de 90 % do espaço nos cenários B e C. As decisões que mais mudam a conta são:
guardar ou não o original, 1080p ou 720p, e a duração máxima por vídeo (seção 7). Gravar em 720p corta o espaço dos vídeos pela
metade.

### 4.2 Área temporária (upload e transcodificação)

Enquanto o vídeo é recebido e transcodificado, o original fica em disco:

- pico do cenário B: 200 check-ins/h × 25 % × 1,5 vídeo × 2 min × 130 MB ≈ **20 GB por hora** de originais;
- se a fila atrasar um dia inteiro de evento (≈ 1.000 vídeos de 2 min): ≈ **260 GB**.

**Requisito: 500 GB de área temporária em SSD**, separada do disco do sistema. Hoje o nginx guarda o corpo dos envios em
`/var/cache/nginx` e o Django em `/tmp`, os dois no disco raiz do contêiner: um pico de vídeos pode encher o disco do sistema e
derrubar o banco junto. Ver MC-05.

### 4.3 Processamento (CPU)

| Tarefa | Custo estimado | Pico do cenário B | Pico do cenário C |
|---|---|---|---|
| Foto: abrir, girar, 2 redimensionamentos (Pillow) | ≈ 0,5 s de 1 núcleo | 420 fotos/h → 4 min de CPU/h | 840 fotos/h → 7 min/h |
| Vídeo de 2 min → 1080p H.264 (`-preset fast`) | ≈ 60 s com 4 threads | 75 vídeos/h → **≈ 5 threads ocupadas** | 280 vídeos/h → **≈ 19 threads** |
| Capa do vídeo (ffmpeg, 1 quadro) | < 1 s | desprezível | desprezível |
| API dos totens, painel, PostgreSQL | baixo (6 totens, poucos usuários) | 2 a 4 vCPU | 2 a 4 vCPU |

Conclusão: a transcodificação de vídeo define a CPU.

- **B**: 16 vCPU. 8 ficam para a fila de vídeo (2 trabalhos em paralelo × 4 threads, ≈ 120 vídeos/h), o resto para web e banco.
- **C**: 32 vCPU, ou 16 vCPU com codificação por hardware (Intel Quick Sync ou GPU NVIDIA com NVENC, 5 a 10 vezes mais rápido).
  A alternativa sem hardware novo é aceitar que a fila só zere de madrugada: o vídeo fica *processando* por algumas horas, o que é
  aceitável porque ele passa por aprovação de qualquer forma.

### 4.4 Memória (RAM)

| Uso | Estimativa |
|---|---|
| PostgreSQL (`shared_buffers` 2 GB + cache) | 4 GB |
| gunicorn, 9 workers × ~150 MB | 1,5 GB |
| Pillow: foto de 40 MP (limite atual) aberta em RGBA ≈ 160 MB, × 4 em paralelo | 0,7 GB |
| ffmpeg 1080p, ≈ 500 MB por trabalho × 2 | 1 GB |
| Sistema, Docker, nginx, monitoramento | 2 GB |
| Cache de páginas do Linux (servir mídia recente sem ler o disco) | o restante |

**Mínimo 16 GB; recomendado 32 GB ECC.**

### 4.5 Rede

| Fluxo | Cálculo | Banda |
|---|---|---|
| Envios do check-in na hora de pico (B) | 200 × (70 % × 3 × 1,5 MB + 25 % × 1,5 × 260 MB) ≈ 20 GB/h | **≈ 45 Mbit/s médio**, picos de 150 Mbit/s |
| Envios na hora de pico (C) | 400 × (2,1 × 1,5 MB + 0,7 × 260 MB) ≈ 74 GB/h | ≈ 165 Mbit/s médio, picos de 500 Mbit/s |
| Vídeos para os 6 totens | 6 × 5 Mbit/s | 30 Mbit/s (rede interna) |
| Painel da equipe (aprovação com prévia de vídeo) | poucos usuários | < 50 Mbit/s |

- Placa de rede **1 GbE** (de preferência 2 × 1 GbE agregadas) é suficiente.
- Se o visitante enviar pelo **4G**, o envio entra pelo link de internet da universidade: reservar **≥ 300 Mbit/s de entrada**
  para o cenário B. O melhor caminho é **Wi-Fi aberto na entrada do memorial**, ligado à rede interna, para o envio não depender
  do link externo nem do plano de dados do visitante.

### 4.6 Banco de dados

O PostgreSQL guarda só texto e caminhos de arquivo. Mesmo no cenário C (150 mil ex-alunos e 300 mil fotos em 5 anos, mais o
registro de entradas e saídas), fica abaixo de **10 GB**. Vai no SSD do sistema.

### 4.7 Backup

- Capacidade de backup ≥ **1,5 × a mídia** (cópia completa + histórico de versões): **≈ 3 TB** no cenário B em 5 anos.
- Primeira cópia completa de 2 TB em rede de 1 GbE: ≈ 5 horas. Depois, só o que mudou (≈ 1 GB por dia no cenário B).

---

## 5. Especificação do servidor

| Item | Mínimo (cenário A) | **Recomendado (cenário B)** | Alto (cenário C) |
|---|---|---|---|
| CPU | 8 vCPU x86-64, ≥ 2,5 GHz | **16 vCPU** (ex.: 8 núcleos com HT, Xeon Silver ou EPYC 4004 atuais) | 32 vCPU, ou 16 vCPU + Quick Sync/NVENC |
| RAM | 16 GB | **32 GB ECC** | 64 GB ECC |
| Disco do sistema e banco | 2 × SSD 480 GB em RAID 1 | **2 × NVMe 960 GB em RAID 1** | 2 × NVMe 1,92 TB em RAID 1 |
| Área temporária de upload | 200 GB SSD | **500 GB SSD/NVMe** (partição ou disco próprio) | 1 TB NVMe |
| Mídia | 2 × HDD 2 TB em RAID 1 (2 TB úteis) | **4 × HDD 4 TB enterprise 7.200 rpm em RAID 10 (8 TB úteis)** | 6 × HDD 8 TB em RAID 6 (32 TB úteis) |
| Rede | 1 × 1 GbE | **2 × 1 GbE agregadas** | 2 × 10 GbE ou 2 × 1 GbE |
| Energia | nobreak | **fonte redundante + nobreak ≥ 15 min com desligamento automático** | idem |
| Backup | disco externo + cópia fora do prédio | **NAS ou storage da universidade ≥ 6 TB + cópia fora do campus** | storage ≥ 50 TB |

Observações:

- **VM ou físico**: pode ser uma VM no cluster da universidade (VMware, Proxmox, Hyper-V) com os mesmos recursos reservados, desde
  que o volume de mídia esteja em storage com redundância e a CPU não seja compartilhada a ponto de travar a fila de vídeo.
- **8 TB úteis no B** cobrem os 2,1 TB de 5 anos com folga e mais ~4 anos do cenário C se o uso surpreender. Os discos de
  mídia são HDD porque a leitura é sequencial (vídeo) e pouco concorrente (6 totens); o que precisa de SSD é a área temporária e o banco.
- Sistema de arquivos da mídia: **XFS** ou ext4. Alerta de uso em 70 % e 85 % (RNF-12).

---

## 6. Requisitos de infraestrutura (RI)

| ID | Requisito | Prioridade |
|---|---|---|
| RI-01 | Servidor ou VM com os recursos da seção 5, coluna "Recomendado" | obrigatório |
| RI-02 | IP fixo na rede interna, alcançável pelos 6 totens e pelos computadores da equipe | obrigatório |
| RI-03 | Nome DNS institucional (ex.: `memorial.<dominio-da-universidade>`), resolvido na rede interna e, se o check-in for pela internet, também na pública | obrigatório |
| RI-04 | **Certificado TLS válido** para esse nome (certificado institucional ou Let's Encrypt com renovação automática). Necessário para o modo offline dos totens e para o celular do visitante não ver alerta | obrigatório |
| RI-05 | Firewall: só as portas 443 (e 80, redirecionando para 443) abertas para os visitantes; SSH (22) só pela VPN ou pela rede de gestão da TI; PostgreSQL e gunicorn nunca expostos | obrigatório |
| RI-06 | Wi-Fi aberto (ou com portal simples) na entrada e nas salas do memorial, com banda ≥ 150 Mbit/s agregada até o servidor | recomendado |
| RI-07 | Se o check-in for aceito pela internet (4G): publicação do servidor na borda da universidade (NAT ou proxy reverso institucional) e link de entrada ≥ 300 Mbit/s | conforme decisão D-01 |
| RI-08 | Relay SMTP institucional para os avisos à equipe (porta 587 com TLS, usuário de serviço, SPF e DKIM do domínio cobrindo o remetente) | obrigatório (o último commit deixou a integração SMTP pendente) |
| RI-09 | Fonte redundante e nobreak com desligamento automático (NUT ou agente do fabricante) | obrigatório |
| RI-10 | Destino de backup fora do servidor (NAS ou storage) e uma cópia fora do campus ou em mídia retirada do prédio | obrigatório |
| RI-11 | Local com climatização e acesso físico restrito (sala de servidores da TI) | obrigatório |
| RI-12 | Totens com ≥ 32 GB de armazenamento livre (o cache de imagens chega a ~5 GB) e Wi-Fi 5 GHz ou cabo | recomendado |
| RI-13 | Sincronização de horário (NTP da universidade): as datas do registro de entradas e saídas e o limite de frequência dependem dele | obrigatório |

---

## 7. Requisitos funcionais novos (RF)

O sistema atual não recebe vídeos dos ex-alunos. Para isso:

| ID | Requisito |
|---|---|
| RF-01 | O check-in aceita **até 2 vídeos por envio**, de **até 3 minutos e 500 MB cada**, em MP4, MOV (iPhone), WebM ou 3GP. Limites configuráveis em **Configuração do memorial** |
| RF-02 | O servidor confere o arquivo pelo conteúdo (ffprobe), não pela extensão, e recusa com mensagem clara: formato não aceito, longo demais, sem faixa de vídeo |
| RF-03 | O envio do vídeo é **retomável** (protocolo tus ou envio em partes): uma queda de Wi-Fi no meio não obriga a recomeçar. O visitante vê a barra de progresso e pode fechar a página depois que o envio terminar |
| RF-04 | Depois de recebido, o vídeo entra numa **fila** e é transcodificado fora da requisição para MP4 H.264 + AAC, 1080p (ou 720p, conforme D-03), `-movflags +faststart`, com capa automática |
| RF-05 | Estados do vídeo: *recebido* → *processando* → *pendente* (aguarda aprovação) → *aprovado* ou *recusado*; mais *falhou*, com o motivo para a equipe |
| RF-06 | O original é **apagado** depois da transcodificação bem-sucedida (mesma regra das fotos), a não ser que a decisão D-02 seja guardar |
| RF-07 | O painel `/administracao/` mostra os vídeos pendentes com player, duração e tamanho, e aprova, recusa ou oculta em lote como as fotos |
| RF-08 | O aviso por e-mail à equipe leva a **capa** do vídeo e o link do painel, nunca o vídeo em anexo |
| RF-09 | Apagar um ex-aluno apaga também os vídeos, capas e originais dele (arquivos inclusos), e o nome sai do registro, como já acontece com as fotos |
| RF-10 | O perfil do ex-aluno na Sala 06 mostra os vídeos aprovados (aba nova ou junto de Fotos), tocados por streaming, sem cache no totem |
| RF-11 | Cada envio de vídeo, aprovação e remoção entra no registro de entradas e saídas |
| RF-12 | O limite de frequência por IP passa a contar também o volume: por IP, no máximo ~1 GB por hora (configurável), para um único aparelho não encher o disco |

---

## 8. Requisitos não funcionais (RNF)

### Desempenho

| ID | Requisito |
|---|---|
| RNF-01 | Check-in só com fotos responde em até 5 s na rede do memorial (P95) |
| RNF-02 | Vídeo enviado fica disponível para aprovação em até 15 min no cenário B (fila normal) e até 12 h no pico do cenário C |
| RNF-03 | `GET sala/<n>/` e `GET versao/` respondem em até 300 ms (P95); a busca de colegas em até 1 s |
| RNF-04 | O vídeo começa a tocar no totem em até 2 s pela rede interna |
| RNF-05 | Envios grandes não podem bloquear a API dos totens: os workers web não fazem transcodificação |

### Disponibilidade e recuperação

| ID | Requisito |
|---|---|
| RNF-06 | Disponibilidade de 99 % no horário de visitação (as salas 01 a 05 continuam funcionando offline; só a aba Colegas e o check-in dependem do servidor) |
| RNF-07 | **RPO 24 h** para mídia e banco (no máximo um dia perdido); **RTO 8 h** (servidor de volta em até 8 h úteis) |
| RNF-08 | Backup diário do banco (`pg_dump`), backup incremental diário da mídia (restic, Borg ou a ferramenta da TI), com retenção de 7 diárias, 4 semanais e 12 mensais. Os backups são **criptografados** |
| RNF-09 | Teste de restauração a cada semestre, com o resultado registrado |
| RNF-10 | Os contêineres sobem sozinhos depois de queda de energia (`restart: unless-stopped`, já configurado) |

### Segurança e privacidade (LGPD)

| ID | Requisito |
|---|---|
| RNF-11 | Dados e backups ficam **no Brasil**, sob controle da universidade. O servidor entra no inventário de tratamento de dados pessoais da instituição, com o encarregado (DPO) informado |
| RNF-12 | Monitoramento com alertas por e-mail: disco (70 % e 85 %), fila de vídeo parada, serviço fora do ar, certificado a vencer em 15 dias, falha de backup. Sugestão: Netdata, ou Prometheus + Grafana se a TI já usar |
| RNF-13 | Atualizações de segurança do sistema automáticas (`unattended-upgrades`) e janela mensal para atualizar as imagens Docker |
| RNF-14 | Acesso administrativo por chave SSH, sem login de root por senha; `fail2ban` no SSH e no `/admin` |
| RNF-15 | Disco de mídia e de backup **criptografados** (LUKS ou criptografia do storage): são fotos e vídeos de pessoas reais |
| RNF-16 | Os logs do nginx guardam IP só pelo tempo exigido pela política da universidade (o registro de entradas e saídas do sistema já não guarda IP nem e-mail) |
| RNF-17 | Opcional: varredura dos envios com ClamAV antes de entrar na fila |
| RNF-18 | Senhas e chaves só no `.env` do servidor, com permissão 600, fora do git; `DJANGO_SECRET_KEY` nova e única para a produção |

---

## 9. Requisitos de software (RS)

| ID | Requisito |
|---|---|
| RS-01 | Ubuntu Server 24.04 LTS ou Debian 12 |
| RS-02 | Docker Engine ≥ 27 e Docker Compose v2 (o `docker-compose.yml` atual roda sem mudança de estrutura) |
| RS-03 | Imagens já usadas: `postgres:16-alpine`, `nginx:1.27-alpine`, `python:3.12-slim` com ffmpeg, `node:22-alpine` (só no build) |
| RS-04 | Novo serviço de fila: **Redis 7** + um contêiner `worker` (Celery, RQ ou Django-Q2), com a mesma imagem do backend, limitado a N trabalhos em paralelo |
| RS-05 | Se houver Quick Sync ou NVENC: ffmpeg com suporte a VAAPI/QSV ou NVENC, e o dispositivo (`/dev/dri` ou a GPU) repassado ao `worker` |
| RS-06 | Certificado: Certbot (ou o processo institucional) com renovação automática e recarga do nginx |

---

## 10. Mudanças no código e na configuração (MC)

O que o repositório precisa mudar para rodar no servidor da universidade e aguentar o volume de vídeos:

| ID | Onde | Mudança |
|---|---|---|
| MC-01 | `docker-compose.yml` | Remover o serviço `cloudflared`; adicionar `redis` e `worker`; trocar os volumes nomeados `media` e `pgdata` por pastas montadas nos discos certos (ex.: `/srv/memorial/media` no RAID de mídia, `/srv/memorial/pg` no NVMe) |
| MC-02 | `nginx/nginx.conf` | Escutar em 443 com o certificado (ou ficar atrás do proxy institucional que faz o TLS); redirecionar 80 → 443; HSTS |
| MC-03 | `nginx/nginx.conf` | Rota de envio de vídeo com `client_max_body_size` de acordo com RF-01 (ex.: 1100m) e timeouts longos; ou o endpoint tus, que envia em partes pequenas |
| MC-04 | `nginx/nginx.conf` | Liberar `Range` e cache curto em `/media/alunos/videos/` (mesma regra de remoção rápida das fotos de ex-alunos) |
| MC-05 | `nginx/nginx.conf`, `backend/config/settings.py` | `client_body_temp_path` do nginx e `FILE_UPLOAD_TEMP_DIR` do Django apontando para a **área temporária** (seção 4.2), não para o disco raiz |
| MC-06 | `backend/Dockerfile` | gunicorn com mais workers (`2 × núcleos + 1`, ex.: 9) ou `--worker-class gthread`; os envios grandes do admin não podem segurar todos |
| MC-07 | `backend/memorial/models.py`, `views.py`, `serializers.py` | Modelo `VideoAluno` com os estados de RF-05; check-in aceitando `videos[]`; transcodificação e capa movidas para a fila |
| MC-08 | `backend/memorial/notificacoes.py` | Enviar o e-mail pela fila, não na requisição do visitante; levar a capa do vídeo (RF-08) |
| MC-09 | `backend/memorial/administracao.py` e templates | Vídeos pendentes no painel de aprovações (RF-07) |
| MC-10 | `frontend/src/checkin/` | Campo de vídeo, verificação de duração no aparelho antes de enviar, barra de progresso, envio retomável |
| MC-11 | `frontend/src/telas/Perfil.tsx` e `frontend/src/dados/tipos.ts` | Vídeos aprovados no perfil do ex-aluno (RF-10) |
| MC-12 | `.env` | `DJANGO_ALLOWED_HOSTS` e `DJANGO_CSRF_TRUSTED_ORIGINS` com o nome institucional em https; `DJANGO_NUM_PROXIES=1` (nginx sozinho) ou `2` (atrás do proxy da universidade); `EMAIL_*` do relay institucional; tirar os domínios do Vercel e do túnel |
| MC-13 | `backend/config/settings.py` | `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE` e `CSRF_COOKIE_SECURE` ligados em produção |
| MC-14 | `scripts/` | Scripts de backup (banco + mídia) e restauração, agendados pelo cron ou systemd timer |
| MC-15 | Admin › Configuração do memorial | Atualizar o **endereço do check-in** e gerar de novo o QR Code da placa com o domínio novo |

---

## 11. Decisões em aberto

| ID | Pergunta | Impacto |
|---|---|---|
| D-01 | O check-in será só pelo Wi-Fi do memorial ou também pela internet (4G)? | Pela internet exige RI-07: publicação na borda, link de entrada maior e mais atenção a abuso |
| D-02 | Guardar o **original** dos vídeos dos ex-alunos? | Multiplica o espaço por ~4 (seção 4.1). Recomendação: não guardar, como já acontece com as fotos |
| D-03 | Guardar os vídeos em 1080p ou 720p? | 720p corta o espaço e o tempo de transcodificação pela metade; num totem de 1600 × 900 a diferença é pequena |
| D-04 | Limites por envio (RF-01): 2 vídeos de 3 min são suficientes? | Cada minuto a mais no limite aumenta o pior caso de espaço proporcionalmente |
| D-05 | Por quanto tempo guardar fotos e vídeos **recusados**? | Recomendação: apagar na hora da recusa, ou em até 30 dias |
| D-06 | A TI oferece VM com storage redundante ou será comprado um servidor físico? | Muda quem cuida do RAID, do backup e do monitoramento |
| D-07 | Quem é o responsável técnico pelo servidor (atualizações, alertas, restauração)? | Precisa de um nome antes de ir para produção |

---

## 12. Como refazer as contas

Espaço de mídia por ano:

```
fotos  = check-ins × %_com_fotos × fotos_por_check-in × 1,1 MB
vídeos = check-ins × %_com_vídeo × vídeos_por_check-in × minutos × MB_por_minuto
         (38 MB/min em 1080p, 19 MB/min em 720p; somar 130 MB/min por vídeo se guardar o original)
total em N anos = (fotos + vídeos) × N + 40 GB de acervo, × 1,3 de folga
```

Para trocar as estimativas por números reais:

1. Peça a 5 ou 6 pessoas que gravem vídeos de 1 a 2 minutos no próprio celular (Android e iPhone) e envie para o servidor de teste.
2. Transcodifique com o comando de `ffmpeg` do README e anote o tamanho final e o tempo gasto na CPU do servidor escolhido.
3. Depois do primeiro evento de reencontro, compare o número real de check-ins, fotos e vídeos com a tabela da seção 3.2 e
   ajuste o cenário. O monitoramento de disco (RNF-12) mostra o crescimento real por mês.
