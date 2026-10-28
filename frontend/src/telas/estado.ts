/**
 * Estado de tela do totem. O "estado inicial" da sala é exatamente INICIAL: é para ele que o totem
 * volta por inatividade, e é nele que o conteúdo novo pode entrar sem atrapalhar ninguém.
 * Guardamos ids (e não posições), para o estado continuar válido quando o conteúdo muda.
 */
export type Aba = 'historia' | 'fotos' | 'videos';

export type Overlay =
  | null
  | { tipo: 'foto'; indice: number }
  | { tipo: 'video'; id: number }
  | { tipo: 'checkin' };

export interface EstadoTotem {
  aba: Aba;
  /** null = destaque inicial definido no admin. */
  marcoId: number | null;
  /** Início do período de fotos; null = primeiro período com fotos. */
  periodo: number | null;
  pagina: number;
  /** Vídeo em destaque; null = destaque definido no admin. */
  videoId: number | null;
  overlay: Overlay;
  // sala 5
  visao: 'busca' | 'perfil';
  perfilId: number | string | null;
  q: string;
  ano: number | null;
  decada: [number, number] | null;
  paginaBusca: number;
  teclado: boolean;
}

export const INICIAL: EstadoTotem = {
  aba: 'historia',
  marcoId: null,
  periodo: null,
  pagina: 0,
  videoId: null,
  overlay: null,
  visao: 'busca',
  perfilId: null,
  q: '',
  ano: null,
  decada: null,
  paginaBusca: 1,
  teclado: false,
};

export const emInicio = (s: EstadoTotem) => JSON.stringify(s) === JSON.stringify(INICIAL);

/** Botão Voltar do Android: fecha o overlay, depois o teclado, depois volta do perfil à busca. */
export function voltar(s: EstadoTotem): EstadoTotem {
  if (s.overlay) return { ...s, overlay: null };
  if (s.teclado) return { ...s, teclado: false };
  if (s.visao === 'perfil') return { ...s, visao: 'busca', perfilId: null };
  return s;
}

/** O que o totem passa para a tela da sala. */
export interface PropsSala {
  estado: EstadoTotem;
  mudar: (p: Partial<EstadoTotem>) => void;
}
