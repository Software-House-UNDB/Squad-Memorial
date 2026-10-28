/**
 * Modo demonstração (VITE_MODO_DEMO=1, usado no Vercel): o conteúdo de exemplo do protótipo,
 * montado no mesmo formato da API. O check-in grava no próprio navegador (localStorage) e aparece
 * na sala 5 do mesmo navegador. Nada é enviado.
 *
 * Fonte: exemplo.json, extraído do protótipo por scripts/extrair_exemplo.py (o mesmo arquivo que o
 * backend usa em carregar_exemplo, com as mesmas regras de geração das fotos).
 */
import { ErroHttp } from './erro';
import exemplo from './exemplo.json';
import { corresponde, normalizar } from './regras';
import { SALAS_PADRAO } from './salas';
import type {
  AlunoPerfil, AlunoResumo, ConfigCheckin, ConfigMemorial, DadosCheckin, FiltroAlunos, Foto, Marco,
  PaginaAlunos, RespostaSala, Video,
} from './tipos';
import { soUsuario, validarCheckin } from './validacao';
import type { Fonte } from './fonte';

interface Pessoa {
  name: string;
  year: number;
  turma: string;
  ck: string;
  pic?: boolean;
  social: [string, string][];
  fotos: [string, number, string][];
}

interface Exemplo {
  hist: Record<string, { years: number[]; hi: number; cards: [string, string, string][] }>;
  fotos: Record<string, { act: number; items: [string, number, string][] }>;
  vids: Record<string, [[string, string, string, string], [string, string, string, string][]]>;
  periods: [string, number][];
  captions: Record<string, string[]>;
  people: Pessoa[];
}

const DADOS = exemplo as unknown as Exemplo;
const ANO_INICIAL = 1958;
const POR_PAGINA = 12;
const HORAS_NOVO = 24;
const CHAVE_CHECKINS = 'memorial:demo:checkins';
const REFERENCIA = Date.UTC(2026, 9, 27); // data do protótipo: os check-ins de exemplo mantêm a distância de "hoje"
const VIDEO_EXEMPLO = '/demo/exemplo.webm';

export const TERMO_DEMO =
  'Autorizo a exibição do meu nome, ano, turma e redes informadas nos totens do Memorial. ' +
  'As fotos enviadas só aparecem depois da aprovação da equipe. O e-mail nunca é mostrado e serve ' +
  'apenas para contato do Memorial. Posso pedir a remoção dos meus dados a qualquer momento.';

const anoAtual = () => new Date().getFullYear();

const CONFIG: ConfigMemorial = {
  nome: 'Memorial Dom Bosco Maria Izabel Rodrigues',
  anoInicial: ANO_INICIAL,
  segundosInatividade: 90,
  segundosContagem: 15,
  segundosLightbox: 45,
  segundosAtualizacao: 300,
  videosComSom: true,
  urlCheckin: '',
};

/** Mesma regra do protótipo (photosFor) e do backend (carregar_exemplo.fotos_do_periodo). */
function fotosDoPeriodo(sala: string, indice: number, inicio: number, fim: number): [number, string][] {
  const [, quantidade] = DADOS.periods[indice] ?? ['', 0];
  const legendas = DADOS.captions[sala];
  const geradas: [number, string][] = Array.from({ length: quantidade }, (_, j) => [
    Math.min(inicio + (j % 5), fim),
    legendas[(j + indice * 3) % legendas.length],
  ]);
  geradas.sort((a, b) => a[0] - b[0]);
  const especial = DADOS.fotos[sala];
  if (indice === especial.act) {
    const proprias = especial.items.map(([, ano, legenda]) => [ano, legenda] as [number, string]);
    return [...proprias, ...geradas.slice(proprias.length).map(([, legenda]) => [fim, legenda] as [number, string])];
  }
  return geradas;
}

function montarSala(numero: number): RespostaSala {
  const sala = SALAS_PADRAO.find((s) => s.numero === numero) ?? SALAS_PADRAO[0];
  const chave = String(numero);
  const hist = DADOS.hist[chave];
  const marcos: Marco[] = hist
    ? hist.years.map((ano, i) => {
        const [icone, titulo, descricao] = hist.cards[i];
        return { id: numero * 100 + i, ano, titulo, descricao, icone, destaque: i === hist.hi };
      })
    : [];
  const fotos: Foto[] = [];
  if (DADOS.captions[chave]) {
    const fim = anoAtual();
    for (let i = 0, inicio = ANO_INICIAL; inicio <= fim; i++, inicio += 5) {
      for (const [ano, legenda] of fotosDoPeriodo(chave, i, inicio, Math.min(inicio + 4, fim))) {
        fotos.push({
          id: numero * 10_000 + fotos.length, ano, legenda, alt: legenda, credito: 'Conteúdo de exemplo',
          src: null, miniatura: null, largura: null, altura: null,
        });
      }
    }
  }
  const vids = DADOS.vids[chave];
  const videos: Video[] = vids
    ? [vids[0], ...vids[1]].map(([tipo, , titulo, descricao], i) => ({
        id: numero * 100 + i, titulo, descricao, tipo, src: VIDEO_EXEMPLO, capa: null,
        duracao: 12, destaque: i === 0, legenda: null,
      }))
    : [];
  return { versao: 'demo', config: CONFIG, sala, demonstrativo: true, marcos, fotos, videos };
}

// ---------------------------------------------------------------- ex-alunos

interface AlunoDemo extends AlunoResumo {
  instagram: string;
  facebook: string;
  fotos: AlunoPerfil['fotos'];
  email?: string;
}

const turmaChave = (t: string) =>
  normalizar(t).replace(/[º°ª]/g, ' ').replace(/(\d)[oa]\s+(?=\S)/g, '$1 ').replace(/[^0-9a-z]/g, '');

function pessoasExemplo(): AlunoDemo[] {
  const agora = Date.now();
  return DADOS.people.map((p, i) => {
    const [d, m, a] = p.ck.split('/').map(Number);
    const dias = Math.max(1, Math.round((REFERENCIA - Date.UTC(a, m - 1, d)) / 86_400_000));
    const redes = Object.fromEntries(p.social.map(([rede, url]) => [rede, url.split('/').slice(1).join('/')]));
    return {
      id: `p${i}`, nome: p.name, ano: p.year, turma: p.turma, foto: null,
      checkinEm: new Date(agora - dias * 86_400_000 - i * 3_600_000).toISOString(), novo: false,
      instagram: redes.insta ?? '', facebook: redes.fb ?? '',
      fotos: p.fotos.map(([, ano, legenda], j) => ({ id: `p${i}f${j}`, src: null, miniatura: null, legenda, ano })),
    };
  });
}

function checkinsLocais(): AlunoDemo[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CHECKINS) || '[]') as AlunoDemo[];
  } catch {
    return [];
  }
}

function diretorio(): AlunoDemo[] {
  const limite = Date.now() - HORAS_NOVO * 3_600_000;
  return [...checkinsLocais(), ...pessoasExemplo()].map((a) => ({ ...a, novo: Date.parse(a.checkinEm) >= limite }));
}

function ordenar(lista: AlunoDemo[]): AlunoDemo[] {
  return [...lista].sort((a, b) =>
    Number(b.novo) - Number(a.novo)
    || (a.novo && b.novo ? Date.parse(b.checkinEm) - Date.parse(a.checkinEm) : 0)
    || normalizar(a.nome).localeCompare(normalizar(b.nome)));
}

const resumo = ({ id, nome, ano, turma, foto, checkinEm, novo }: AlunoDemo): AlunoResumo => ({ id, nome, ano, turma, foto, checkinEm, novo });

export const fonteDemo: Fonte = {
  sala: async (n) => montarSala(n),
  versao: async () => 'demo',

  async alunos(f: FiltroAlunos): Promise<PaginaAlunos> {
    const todos = diretorio();
    const filtrados = ordenar(todos.filter((a) =>
      corresponde(a.nome, f.q)
      && (!f.ano || a.ano === f.ano)
      && (!f.decada || (a.ano >= f.decada[0] && a.ano <= f.decada[1]))));
    const paginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
    const pagina = Math.min(Math.max(1, f.pagina), paginas);
    return {
      total: filtrados.length, pagina, paginas, porPagina: POR_PAGINA,
      anos: [...new Set(todos.map((a) => a.ano))].sort((a, b) => a - b),
      resultados: filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map(resumo),
    };
  },

  async aluno(id): Promise<AlunoPerfil> {
    const todos = diretorio();
    const a = todos.find((x) => String(x.id) === String(id));
    if (!a) throw new ErroHttp(404);
    const colegas = ordenar(todos.filter((x) => x.id !== a.id && x.ano === a.ano && turmaChave(x.turma) === turmaChave(a.turma)));
    return {
      ...resumo(a),
      recente: Date.parse(a.checkinEm) >= Date.now() - 2 * 3_600_000,
      instagram: a.instagram, facebook: a.facebook, fotos: a.fotos,
      colegas: colegas.slice(0, 4).map(resumo),
    };
  },

  configCheckin: async (): Promise<ConfigCheckin> => ({
    anoInicial: ANO_INICIAL, anoAtual: anoAtual(), termoTexto: TERMO_DEMO, termoVersao: '1.0', emailContato: '',
  }),

  async checkin(d: DadosCheckin) {
    const erros = validarCheckin(d, ANO_INICIAL, anoAtual());
    if (Object.keys(erros).length) return { ok: false as const, erros };
    if (d.site.trim()) return { ok: true as const };
    const email = d.email.trim().toLowerCase();
    const ano = Number(d.ano);
    const lista = checkinsLocais().filter((a) => !(a.email === email && a.ano === ano));
    lista.unshift({
      id: `n${Date.now()}`, nome: d.nome.trim().replace(/\s+/g, ' '), ano, turma: d.turma.trim(), foto: null,
      checkinEm: new Date().toISOString(), novo: true, email,
      instagram: soUsuario(d.instagram, 'instagram'), facebook: soUsuario(d.facebook, 'facebook'),
      fotos: [], // fotos só aparecem depois da aprovação da equipe
    });
    localStorage.setItem(CHAVE_CHECKINS, JSON.stringify(lista.slice(0, 50)));
    return { ok: true as const };
  },
};
