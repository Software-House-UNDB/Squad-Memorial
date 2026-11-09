/**
 * Estado de tela do totem. O "estado inicial" da sala é exatamente INICIAL: é para ele que o totem
 * volta por inatividade, e é nele que o conteúdo novo pode entrar sem atrapalhar ninguém.
 * Guardamos ids (e não posições), para o estado continuar válido quando o conteúdo muda.
 */
export type Aba = 'apresentacao' | 'linha' | 'marcos' | 'fotos' | 'videos' | 'colegas';

/** Abas do perfil de um ex-aluno (Sala 06 · Colegas). */
export type AbaPerfil = 'geral' | 'fotos' | 'colegas' | 'sobre';

export type Overlay =
  | null
  | { tipo: 'foto'; indice: number }
  /** Foto enviada por um ex-aluno: posição em perfil.fotos (Sala 06 · Colegas). */
  | { tipo: 'fotoPerfil'; indice: number }
  | { tipo: 'video'; id: number }
  | { tipo: 'checkin' };

export interface EstadoTotem {
  aba: Aba;
  /** Década aberta na Linha do tempo (posição na lista). */
  linha: number;
  /** Marco aberto na aba Marcos (mostra o texto explicativo); null = todos fechados. */
  marcoAberto: number | null;
  /** Início do período de fotos; null = primeiro período com fotos. */
  periodo: number | null;
  pagina: number;
  /** Vídeo em destaque; null = destaque definido no admin. */
  videoId: number | null;
  overlay: Overlay;
  // aba Colegas (Sala 06)
  visao: 'busca' | 'perfil';
  perfilId: number | string | null;
  perfilAba: AbaPerfil;
  q: string;
  ano: number | null;
  /** Filtro de década da busca de ex-alunos. */
  decada: [number, number] | null;
  paginaBusca: number;
  teclado: boolean;
}

export const INICIAL: EstadoTotem = {
  aba: 'apresentacao',
  linha: 0,
  marcoAberto: null,
  periodo: null,
  pagina: 0,
  videoId: null,
  overlay: null,
  visao: 'busca',
  perfilId: null,
  perfilAba: 'geral',
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
  if (s.visao === 'perfil') return { ...s, visao: 'busca', perfilId: null, perfilAba: 'geral' };
  return s;
}

/** O que o totem passa para a tela da sala. */
export interface PropsSala {
  estado: EstadoTotem;
  mudar: (p: Partial<EstadoTotem>) => void;
}
