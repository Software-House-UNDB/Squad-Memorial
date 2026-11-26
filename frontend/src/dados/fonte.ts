/**
 * De onde vêm os dados: o servidor (API Django) ou, no modo demonstração (VITE_MODO_DEMO=1,
 * usado no Vercel), o conjunto de exemplo embutido. As telas usam só `fonte` e não sabem qual é.
 */
import { quiosque } from '../config/quiosque';
import { fonteDemo } from './demo';
import { ErroHttp } from './erro';
import { empacotar, normalizarRede } from './redes';
import {
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
  /**
   * Etapa 1 do check-in: confere os dados e manda o código ao e-mail. Nada é gravado ainda.
   * Se o e-mail já tem cadastro, a pessoa recebe no lugar um aviso; a resposta é a mesma.
   */
  pedirCodigo(dados: DadosCheckin): Promise<ResultadoCheckin>;
  /** Etapa 2: com o código do e-mail, grava o check-in (com as fotos). */
  checkin(dados: DadosCheckin, codigo: string): Promise<ResultadoCheckin>;
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
  pedirCodigo: (d) => enviarCheckin(d, '', 30_000),
  checkin: (d, codigo) => enviarCheckin(d, codigo, 60_000),
};

export const fonte: Fonte = quiosque.demo ? fonteDemo : fonteServidor;

/**
 * Envia o formulário. Sem código (etapa 1) vão só os textos, para o pedido do código ser rápido;
 * com o código (etapa 2) vão também as fotos.
 */
async function enviarCheckin(d: DadosCheckin, codigo: string, limiteMs: number): Promise<ResultadoCheckin> {
  const corpo = new FormData();
  for (const k of ['nome', 'ano', 'email', 'site'] as const) corpo.append(k, d[k]);
  corpo.append('turma', d.turma);
  // A rede social cabe nos campos que o servidor já conhece.
  const { rede, usuario } = normalizarRede(d.rede, d.usuario);
  const redes = empacotar(rede, usuario);
  corpo.append('instagram', redes.instagram);
  corpo.append('facebook', redes.facebook);
  corpo.append('consentimento', d.consentimento ? 'true' : 'false');
  if (codigo) {
    corpo.append('codigo', codigo);
    for (const f of d.fotos) corpo.append('fotos', f, f.name);
  }
  // Sem tempo limite o botão ficaria preso numa internet ruim; 60 s dá folga para 3 fotos no 4G.
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), limiteMs);
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
  if (r.status === (codigo ? 201 : 202)) return { ok: true };
  if (r.status === 413) return { ok: false, erros: { fotos: 'As fotos passaram do limite. Envie menos fotos ou fotos menores.' } };
  const corpoErro = (await r.json().catch(() => ({}))) as { erros?: ErrosCheckin & { instagram?: string; facebook?: string } };
  if (corpoErro.erros) {
    // A rede social é um campo só na tela: o erro do Instagram ou do Facebook aparece nele.
    const { instagram, facebook, ...erros } = corpoErro.erros;
    return { ok: false, erros: { ...erros, ...((instagram || facebook) && { rede: instagram || facebook }) } };
  }
  if (r.status === 429) return { ok: false, erros: { geral: 'Muitos envios seguidos. Espere um minuto e tente de novo, ou fale com a equipe na recepção.' } };
  return { ok: false, erros: { geral: 'O check-in não foi enviado. Tente de novo em instantes.' } };
}
