/**
 * De onde vêm os dados: o servidor (API Django) ou, no modo demonstração (VITE_MODO_DEMO=1,
 * usado no Vercel), o conjunto de exemplo embutido. As telas usam só `fonte` e não sabem qual é.
 */
import { quiosque } from '../config/quiosque';
import { fonteDemo } from './demo';
import { ErroHttp } from './erro';
import { empacotar, normalizarRede } from './redes';
import {
  turmaComTurno,
  type AlunoPerfil, type ConfigCheckin, type DadosCheckin, type ErrosCheckin, type FiltroAlunos, type PaginaAlunos,
  type RespostaSala,
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
    for (const k of ['nome', 'ano', 'email', 'site'] as const) corpo.append(k, d[k]);
    // O turno viaja dentro da turma e a rede social cabe nos campos que o servidor já conhece.
    corpo.append('turma', d.turno ? turmaComTurno(d.turma, d.turno) : d.turma);
    const { rede, usuario } = normalizarRede(d.rede, d.usuario);
    const redes = empacotar(rede, usuario);
    corpo.append('instagram', redes.instagram);
    corpo.append('facebook', redes.facebook);
    corpo.append('consentimento', d.consentimento ? 'true' : 'false');
    for (const f of d.fotos) corpo.append('fotos', f, f.name);
    // Sem tempo limite o botão ficaria preso numa internet ruim; 60 s dá folga para 3 fotos no 4G.
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), 60_000);
    let r: Response;
    try {
      r = await fetch(`${quiosque.api}/api/memorial/checkin/`, { method: 'POST', body: corpo, signal: ctrl.signal });
    } catch {
      if (ctrl.signal.aborted) {
        return { ok: false, erros: { geral: 'O envio demorou demais. Confira a internet e tente de novo; o que você preencheu continua na tela.' } };
      }
      return { ok: false, erros: { geral: 'Sem conexão. Confira a internet do celular e tente de novo.' } };
    } finally {
      window.clearTimeout(t);
    }
    if (r.status === 201) return { ok: true };
    if (r.status === 429) return { ok: false, erros: { geral: 'Muitos envios seguidos. Espere um minuto e tente de novo, ou fale com a equipe na recepção.' } };
    if (r.status === 413) return { ok: false, erros: { fotos: 'As fotos passaram do limite. Envie menos fotos ou fotos menores.' } };
    if (r.status === 400) {
      const corpoErro = (await r.json().catch(() => ({}))) as { erros?: ErrosCheckin & { instagram?: string; facebook?: string } };
      if (corpoErro.erros) {
        // A rede social é um campo só na tela: o erro do Instagram ou do Facebook aparece nele.
        const { instagram, facebook, ...erros } = corpoErro.erros;
        return { ok: false, erros: { ...erros, ...((instagram || facebook) && { rede: instagram || facebook }) } };
      }
    }
    return { ok: false, erros: { geral: 'O check-in não foi enviado. Tente de novo em instantes.' } };
  },
};

export const fonte: Fonte = quiosque.demo ? fonteDemo : fonteServidor;
