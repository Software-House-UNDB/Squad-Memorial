/**
 * De onde vêm os dados: o servidor (API Django) ou, no modo demonstração (VITE_MODO_DEMO=1,
 * usado no Vercel), o conjunto de exemplo embutido. As telas usam só `fonte` e não sabem qual é.
 */
import { quiosque } from '../config/quiosque';
import { fonteDemo } from './demo';
import type {
  AlunoPerfil, ConfigCheckin, DadosCheckin, ErrosCheckin, FiltroAlunos, PaginaAlunos, RespostaSala,
} from './tipos';

export type ResultadoCheckin = { ok: true } | { ok: false; erros: ErrosCheckin };

export interface Fonte {
  sala(numero: number): Promise<RespostaSala>;
  versao(numero: number): Promise<string>;
  alunos(filtro: FiltroAlunos): Promise<PaginaAlunos>;
  aluno(id: number | string): Promise<AlunoPerfil>;
  configCheckin(): Promise<ConfigCheckin>;
  checkin(dados: DadosCheckin): Promise<ResultadoCheckin>;
}

export class ErroHttp extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

async function buscar<T>(caminho: string, limiteMs = 10_000): Promise<T> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), limiteMs);
  try {
    const r = await fetch(`${quiosque.api}${caminho}`, { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new ErroHttp(r.status);
    return (await r.json()) as T;
  } finally {
    window.clearTimeout(t);
  }
}

export function parametrosAlunos(f: FiltroAlunos): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set('q', f.q.trim());
  if (f.ano) p.set('ano', String(f.ano));
  if (f.decada) p.set('decada', `${f.decada[0]}-${f.decada[1]}`);
  if (f.pagina > 1) p.set('pagina', String(f.pagina));
  const s = p.toString();
  return s ? `?${s}` : '';
}

const fonteServidor: Fonte = {
  sala: (n) => buscar<RespostaSala>(`/api/memorial/sala/${n}/`, 15_000),
  versao: async (n) => (await buscar<{ versao: string }>(`/api/memorial/versao/?sala=${n}`, 5_000)).versao,
  alunos: (f) => buscar<PaginaAlunos>(`/api/memorial/alunos/${parametrosAlunos(f)}`, 8_000),
  aluno: (id) => buscar<AlunoPerfil>(`/api/memorial/alunos/${encodeURIComponent(String(id))}/`, 8_000),
  configCheckin: () => buscar<ConfigCheckin>('/api/memorial/checkin/', 10_000),
  async checkin(d) {
    const corpo = new FormData();
    const campos = ['nome', 'ano', 'turma', 'email', 'instagram', 'facebook', 'site'] as const;
    for (const k of campos) corpo.append(k, d[k]);
    corpo.append('consentimento', d.consentimento ? 'true' : 'false');
    for (const f of d.fotos) corpo.append('fotos', f, f.name);
    let r: Response;
    try {
      r = await fetch(`${quiosque.api}/api/memorial/checkin/`, { method: 'POST', body: corpo });
    } catch {
      return { ok: false, erros: { geral: 'Sem conexão. Confira a internet do celular e tente de novo.' } };
    }
    if (r.status === 201) return { ok: true };
    if (r.status === 429) return { ok: false, erros: { geral: 'Muitos envios seguidos deste aparelho. Espere um minuto e tente de novo.' } };
    if (r.status === 413) return { ok: false, erros: { fotos: 'As fotos passaram do limite. Envie menos fotos ou fotos menores.' } };
    if (r.status === 400) {
      const corpoErro = (await r.json().catch(() => ({}))) as { erros?: ErrosCheckin };
      if (corpoErro.erros) return { ok: false, erros: corpoErro.erros };
    }
    return { ok: false, erros: { geral: 'O check-in não foi enviado. Tente de novo em instantes.' } };
  },
};

export const fonte: Fonte = quiosque.demo ? fonteDemo : fonteServidor;
