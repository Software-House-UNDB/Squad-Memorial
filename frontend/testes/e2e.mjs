/**
 * Testes de ponta a ponta (Playwright) contra o sistema completo, com o conteúdo de exemplo:
 *
 *   docker compose exec backend python manage.py carregar_exemplo --limpar
 *   URL=http://localhost:8080/ npm run test:e2e
 *
 * Roda em 1600 × 900 e 1920 × 1080. Cada execução faz um check-in de teste ("Teste E2E …",
 * e-mail @exemplo.invalid); apague-os no admin se quiser. CHROME=/caminho/do/chrome usa outro
 * navegador. Capturas em .impeccable/review/e2e/.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = (process.env.URL ?? 'http://localhost:8080/').replace(/\/?$/, '/');
const ORIGEM = new URL(BASE).origin;
const CAPTURAS = new URL('../.impeccable/review/e2e/', import.meta.url).pathname;
const TELAS = [[1600, 900], [1920, 1080]];
mkdirSync(CAPTURAS, { recursive: true });

let ok = 0;
const falhas = [];
const erros = [];
const externos = new Set();

function confere(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function verificar(nome, fn) {
  try {
    await fn();
    ok++;
    console.log(`  ✓ ${nome}`);
  } catch (e) {
    falhas.push(`${nome}: ${e.message.split('\n')[0]}`);
    console.log(`  ✗ ${nome}\n      ${e.message.split('\n')[0]}`);
  }
}

const navegador = await chromium.launch({ executablePath: process.env.CHROME || undefined });

async function novaPagina(ctx, rotulo) {
  const p = await ctx.newPage();
  p.on('console', (m) => m.type() === 'error' && erros.push(`[${rotulo}] ${m.text()}`));
  p.on('pageerror', (e) => erros.push(`[${rotulo}] ${e.message}`));
  return p;
}

async function abrir(p, query) {
  await p.goto(`${BASE}?semtelacheia&${query}`);
  await p.locator('.tt-h1, .tt-eyb').first().waitFor();
}

/** Espera a grade de resultados corresponder ao filtro atual (sai do estado "defasada"). */
async function resultados(p) {
  await p.locator('.tt-pessoas:not(.is-defasada)').waitFor();
}

/** Digita no teclado virtual da sala 5, tecla por tecla. */
async function digitar(p, texto) {
  await p.locator('input[type=search]').click();
  for (const c of texto) await p.locator(`.m-teclado [aria-label="${c === ' ' ? 'Espaço' : c.toUpperCase()}"]`).click();
}

for (const [w, h] of TELAS) {
  console.log(`\n${w} × ${h}`);
  const ctx = await navegador.newContext({ viewport: { width: w, height: h } });
  ctx.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith(ORIGEM) && !u.startsWith('data:') && !u.startsWith('blob:')) externos.add(u);
  });
  const p = await novaPagina(ctx, `${w}`);
  const foto = (n) => p.screenshot({ path: `${CAPTURAS}${w}-${n}.png` });

  // ---------------------------------------------------------------- salas pela URL
  const NOMES = ['Educação', 'Troféus', 'Artes', 'Professoras', 'Fechamento'];
  for (let n = 1; n <= 5; n++) {
    await verificar(`sala ${n} abre por ?sala=${n}`, async () => {
      await abrir(p, `sala=${n}`);
      confere((await p.locator('.tt-cab__n').innerText()) === `Sala ${n} de 5`, 'percurso errado');
      confere((await p.locator('.tt-cab__sala b').innerText()) === NOMES[n - 1], 'nome da sala errado');
      if (n < 5) confere((await p.locator('.tt-marco').count()) === 8, '8 marcos esperados');
      await foto(`sala${n}`);
    });
  }

  await verificar('a sala fica guardada sem a query (PWA instalado)', async () => {
    await p.goto(`${BASE}?semtelacheia`);
    await p.locator('.tt-cab__n').waitFor();
    confere((await p.locator('.tt-cab__n').innerText()) === 'Sala 5 de 5', 'não lembrou a sala');
  });

  // ---------------------------------------------------------------- história
  await verificar('troca de marco na linha do tempo', async () => {
    await abrir(p, 'sala=1');
    confere((await p.locator('.tt-marco.is-ativo .tt-marco__ano').innerText()) === '1984', 'destaque inicial deveria ser 1984');
    await p.locator('.tt-marco__cartao', { hasText: 'Primeiras turmas' }).click();
    confere((await p.locator('.tt-marco.is-ativo .tt-marco__titulo').innerText()) === 'Primeiras turmas', 'destaque não mudou');
    await p.locator('.tt-marco__ponto[aria-label^="2020"]').click();
    confere((await p.locator('.tt-marco.is-ativo .tt-marco__ano').innerText()) === '2020', 'toque no ponto não mudou');
  });

  // ---------------------------------------------------------------- fotos
  await verificar('paginação de fotos', async () => {
    await p.getByRole('tab', { name: /Fotos/ }).click();
    const cont = p.locator('.tt-galeria__cont');
    confere((await cont.innerText()).includes('mostrando 1 a 8'), 'primeira página');
    await p.getByRole('button', { name: 'Próxima página' }).click();
    confere((await cont.innerText()).includes('mostrando 9 a 11'), `segunda página: ${await cont.innerText()}`);
    await p.locator('.tt-per__lista button', { hasText: '1983 – 1987' }).click();
    confere((await p.locator('.tt-galeria__cab h2').innerText()) === '1983 – 1987', 'período não mudou');
    confere((await cont.innerText()).includes('mostrando 1 a 8'), 'período novo começa na página 1');
  });

  await verificar('foto ampliada com setas', async () => {
    await p.locator('.m-pol').nth(7).click();
    const leg = p.locator('.m-ov__leg small');
    confere((await leg.innerText()).includes('FOTO 8 DE 12'), await leg.innerText());
    await p.getByRole('button', { name: 'Próxima foto' }).click();
    confere((await leg.innerText()).includes('FOTO 9 DE 12'), await leg.innerText());
    await foto('foto-ampliada');
    await p.getByRole('button', { name: 'Fechar' }).click();
    confere((await p.locator('.tt-galeria__cont').innerText()).includes('mostrando 9 a 12'), 'grade deveria ir à página da última foto vista');
  });

  // ---------------------------------------------------------------- vídeo e inatividade
  await verificar('vídeo toca no overlay e não dispara o aviso de inatividade', async () => {
    await abrir(p, 'sala=2&aviso=3&contagem=3');
    await p.getByRole('tab', { name: /Vídeos/ }).click();
    await p.locator('.tt-destaque').click();
    await p.waitForFunction(() => (document.querySelector('.m-ov video')?.currentTime ?? 0) > 0.5, null, { timeout: 8000 });
    await p.waitForTimeout(4500); // mais que o aviso de 3 s
    confere(!(await p.locator('.t-aviso').isVisible()), 'aviso apareceu com o vídeo tocando');
    confere(await p.evaluate(() => !document.querySelector('.m-ov video').paused), 'vídeo parou');
    await foto('video');
    await p.getByRole('button', { name: 'Pausar' }).click();
    await p.locator('.t-aviso').waitFor({ timeout: 6000 });
  });

  await verificar('inatividade volta ao início da sala', async () => {
    await p.locator('.t-aviso').waitFor({ state: 'detached', timeout: 6000 });
    confere(await p.getByRole('tab', { name: /História/ }).getAttribute('aria-selected') === 'true', 'não voltou para História');
    confere((await p.locator('.m-ov').count()) === 0, 'overlay continuou aberto');
    confere((await p.locator('.tt-marco.is-ativo .tt-marco__ano').innerText()) === '1988', 'destaque inicial da sala 2 é 1988');
  });

  // ---------------------------------------------------------------- Voltar do Android
  await verificar('Voltar fecha o overlay e não sai do app', async () => {
    await abrir(p, 'sala=3');
    await p.getByRole('tab', { name: /Fotos/ }).click();
    await p.locator('.m-pol').first().click();
    await p.locator('.m-ov').waitFor();
    await p.goBack();
    await p.locator('.m-ov').waitFor({ state: 'detached' });
    await p.goBack();
    await p.goBack();
    confere(p.url().startsWith(BASE), `saiu do app: ${p.url()}`);
    confere((await p.locator('.tt-cab__n').innerText()) === 'Sala 3 de 5', 'perdeu a sala');
  });

  // ---------------------------------------------------------------- sala 5
  await verificar('busca "joao sil" encontra João Pedro da Silva Sales', async () => {
    await abrir(p, 'sala=5');
    await p.locator('.tt-pc').first().waitFor();
    await digitar(p, 'joao sil');
    await p.locator('.tt-rs b', { hasText: '1 pessoa com “joao sil” no nome' }).waitFor();
    confere((await p.locator('.tt-pc .tt-pc__nome').first().innerText()).startsWith('João Pedro da Silva Sales'), 'nome errado');
    confere((await p.locator('.tt-pc mark').first().innerText()) === 'João', 'realce do trecho');
    await foto('busca-teclado');
    await p.getByRole('button', { name: 'Pronto' }).click();
    confere((await p.locator('.m-teclado').count()) === 0, 'teclado não fechou');
  });

  await verificar('filtros de ano e década', async () => {
    await p.getByRole('button', { name: 'Limpar busca' }).click();
    await p.locator('select[aria-label="Filtrar por ano"]').selectOption('1998');
    await p.locator('.tt-rs b', { hasText: '· 1998' }).waitFor();
    await resultados(p);
    const metas = await p.locator('.tt-pc__meta').allInnerTexts();
    confere(metas.length === 5 && metas.every((m) => m.startsWith('1998')), `ano 1998: ${metas}`);
    await p.getByRole('button', { name: '1980–1989' }).click();
    await p.locator('.tt-rs b', { hasText: '· 1980–1989' }).waitFor();
    await resultados(p);
    confere((await p.locator('select[aria-label="Filtrar por ano"]').inputValue()) === '', 'escolher a década deveria zerar o ano');
    const anos = (await p.locator('.tt-pc__meta').allInnerTexts()).map((m) => Number(m.slice(0, 4)));
    confere(anos.length === 2 && anos.every((a) => a >= 1980 && a <= 1989), `década: ${anos}`);
    await p.getByRole('button', { name: 'Todos' }).click();
    await p.locator('.tt-rs b', { hasText: 'pessoas no Memorial' }).waitFor();
    await resultados(p);
    confere(await p.locator('.tt-rs__pag').isVisible(), 'mais de 12 resultados devem paginar');
  });

  await verificar('perfil, colega da mesma turma e volta', async () => {
    await p.locator('.tt-pc', { hasText: 'Ana Beatriz Silva Moura' }).click();
    await p.locator('.tt-pcard__nome', { hasText: 'Ana Beatriz Silva Moura' }).waitFor();
    confere((await p.locator('.tt-prof__fotos .m-pol').count()) === 3, '3 fotos aprovadas');
    confere((await p.locator('.tt-pcard').innerText()).includes('instagram.com/anabeatriz.moura'), 'rede social');
    await foto('perfil');
    await p.locator('.tt-mate', { hasText: 'Juliana Pinheiro' }).click();
    await p.locator('.tt-pcard__nome', { hasText: 'Juliana Silva Pinheiro' }).waitFor();
    await p.getByRole('button', { name: 'Voltar à busca' }).click();
    await p.locator('input[type=search]').waitFor();
  });

  await verificar('Voltar do Android volta do perfil para a busca', async () => {
    await p.locator('.tt-pc').first().click();
    await p.locator('.tt-pcard').waitFor();
    await p.goBack();
    await p.locator('input[type=search]').waitFor();
    confere(p.url().startsWith(BASE), 'saiu do app');
  });

  await verificar('QR Code do check-in na sala 5', async () => {
    await p.getByRole('button', { name: 'Ainda não fez check-in?' }).click();
    const qr = p.locator('svg.m-qr');
    await qr.waitFor();
    const caixa = await qr.boundingBox();
    confere(caixa && caixa.width > 250, 'QR pequeno demais');
    confere((await p.locator('.m-ck__url b').innerText()).endsWith('/checkin'), 'endereço do check-in');
    await foto('qr');
    await p.getByRole('button', { name: 'Fechar' }).click();
  });

  await verificar('check-in pelo celular aparece na sala 5 sem recarregar', async () => {
    // só letras: o servidor descarta palavras sem letra no nome
    const nome = `Teste E2E ${w === 1600 ? 'Palco' : 'Tela'} ${Date.now().toString(36).replace(/\d/g, '')}`;
    const cel = await novaPagina(await navegador.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }), 'celular');
    await cel.goto(`${BASE}checkin`);
    await cel.locator('[name=nome]').fill('Maria');
    await cel.getByRole('button', { name: 'Fazer check-in' }).click();
    await cel.getByText('Escreva nome e sobrenome.').waitFor();
    await cel.locator('[name=nome]').fill(nome);
    await cel.locator('[name=ano]').selectOption('2007');
    await cel.locator('[name=turma]').fill('2º B');
    await cel.locator('[name=email]').fill(`e2e-${Date.now()}@exemplo.invalid`);
    await cel.locator('[name=consentimento]').check();
    await cel.getByRole('button', { name: 'Fazer check-in' }).click();
    await cel.getByText(/Check-in feito, Teste!/).waitFor();
    await cel.screenshot({ path: `${CAPTURAS}${w}-checkin-celular.png` });
    await cel.context().close();
    // a sala 5 já está aberta na busca: a lista se atualiza sozinha (~10 s)
    const cartao = p.locator('.tt-pc', { hasText: nome });
    await cartao.waitFor({ timeout: 15_000 });
    confere((await cartao.locator('.tt-novo').count()) === 1, 'selo NOVO');
    await cartao.click();
    await p.locator('.tt-pcard__meta', { hasText: 'Check-in feito agora' }).waitFor();
    confere((await p.locator('.tt-mate', { hasText: 'João Sales' }).count()) === 1, 'colega da mesma turma (2007, 2º B)');
  });

  await verificar('a API nunca devolve e-mail', async () => {
    const lista = await (await p.request.get(`${ORIGEM}/api/memorial/alunos/?q=teste`)).text();
    const id = JSON.parse(lista).resultados[0]?.id;
    const perfil = await (await p.request.get(`${ORIGEM}/api/memorial/alunos/${id}/`)).text();
    for (const corpo of [lista, perfil]) {
      confere(!corpo.includes('@') && !/"e-?mail"/i.test(corpo), 'e-mail na resposta');
    }
  });

  await ctx.close();
}

await navegador.close();

console.log('');
await verificar('nenhum erro no console', async () => confere(!erros.length, erros.slice(0, 5).join(' | ')));
await verificar('nenhuma requisição a outro domínio (CDN)', async () => confere(!externos.size, [...externos].slice(0, 5).join(', ')));

console.log(`\n${ok} verificações ok, ${falhas.length} falha(s).`);
if (falhas.length) {
  falhas.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
