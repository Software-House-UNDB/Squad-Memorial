/**
 * Contrato da API pública (/api/memorial/). O backend monta exatamente estes formatos
 * (backend/memorial/serializers.py), e o conjunto de demonstração (dados/demo.ts) também.
 * URLs de mídia são relativas (/media/...).
 */

export type TipoSala = 'conteudo' | 'fechamento';

export interface Sala {
  numero: number;
  slug: string;
  nome: string;
  titulo: string;
  subtitulo: string;
  /** Cor da sala em hexadecimal (#RRGGBB). */
  cor: string;
  tipo: TipoSala;
}

export interface ConfigMemorial {
  nome: string;
  anoInicial: number;
  segundosInatividade: number;
  segundosContagem: number;
  segundosLightbox: number;
  segundosAtualizacao: number;
  /** Vídeos começam com som (true) ou mudos (false). */
  videosComSom: boolean;
  /** Endereço que o QR Code do check-in abre. Vazio = <origem do app>/checkin. */
  urlCheckin: string;
}

export interface Marco {
  id: number;
  ano: number;
  titulo: string;
  descricao: string;
  icone: string;
  /** Destaque inicial da linha do tempo (um por sala). */
  destaque: boolean;
}

export interface Foto {
  id: number;
  ano: number;
  legenda: string;
  credito: string;
  alt: string;
  /** Versão de exibição (lado maior 2560 px). null = foto de exemplo sem imagem. */
  src: string | null;
  /** Miniatura (480 px). */
  miniatura: string | null;
  largura: number | null;
  altura: number | null;
}

export interface Video {
  id: number;
  titulo: string;
  descricao: string;
  /** "Depoimento", "Documentário", "Acervo", "Institucional" ou texto livre. */
  tipo: string;
  src: string | null;
  capa: string | null;
  /** Em segundos. */
  duracao: number | null;
  destaque: boolean;
  /** Legenda opcional em WebVTT. */
  legenda: string | null;
}

export interface RespostaSala {
  versao: string;
  config: ConfigMemorial;
  sala: Sala;
  /** Algum item desta sala é conteúdo de exemplo (mostra o selo no rodapé). */
  demonstrativo: boolean;
  marcos: Marco[];
  fotos: Foto[];
  videos: Video[];
}

// ---------------------------------------------------------------- sala 5

export interface AlunoResumo {
  id: number | string;
  nome: string;
  ano: number;
  turma: string;
  /** Miniatura da foto de perfil, ou null (o avatar usa as iniciais). */
  foto: string | null;
  /** ISO 8601. */
  checkinEm: string;
  /** Check-in recente: selo NOVO e topo da lista. */
  novo: boolean;
}

export interface FotoAluno {
  id: number | string;
  src: string | null;
  miniatura: string | null;
  legenda: string;
  ano: number | null;
}

export interface AlunoPerfil extends AlunoResumo {
  /** Check-in feito há pouco ("Check-in feito agora"). */
  recente: boolean;
  instagram: string;
  facebook: string;
  /** Só fotos aprovadas pela equipe. */
  fotos: FotoAluno[];
  /** Até 4 colegas com o mesmo ano e a mesma turma. */
  colegas: AlunoResumo[];
}

export interface FiltroAlunos {
  q: string;
  /** Ano exato, ou null. */
  ano: number | null;
  /** Intervalo de anos (chip de década), ou null. */
  decada: [number, number] | null;
  pagina: number;
}

export interface PaginaAlunos {
  total: number;
  pagina: number;
  paginas: number;
  porPagina: number;
  /** Anos que existem no diretório (para o seletor). */
  anos: number[];
  resultados: AlunoResumo[];
}

// ---------------------------------------------------------------- check-in

export interface ConfigCheckin {
  anoInicial: number;
  anoAtual: number;
  termoTexto: string;
  termoVersao: string;
  /** Para pedidos de remoção dos dados. Pode vir vazio. */
  emailContato: string;
}

export interface DadosCheckin {
  nome: string;
  ano: string;
  turma: string;
  email: string;
  instagram: string;
  facebook: string;
  consentimento: boolean;
  fotos: File[];
  /** Campo isca: pessoas não veem, robôs preenchem. */
  site: string;
}

export type ErrosCheckin = Partial<Record<keyof DadosCheckin | 'geral', string>>;
