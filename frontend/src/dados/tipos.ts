/**
 * Contrato da API pública (/api/memorial/). O backend monta exatamente estes formatos
 * (backend/memorial/serializers.py), e o conjunto de demonstração (dados/demo.ts) também.
 * URLs de mídia são relativas (/media/...).
 */
import type { RedeId } from './redes';

/**
 * 'conteudo': sala com as 5 abas (Apresentação, Linha do tempo, Marcos, Fotos, Vídeos).
 * 'fechamento': a Sala 06 (Alunos): as mesmas 5 abas mais a aba Colegas (busca de ex-alunos).
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
  /** Resumo de uma frase. */
  descricao: string;
  icone: string;
  /** Destaque inicial (um por sala). Na aba Marcos nenhum cartão abre sozinho; o campo é mantido por compatibilidade. */
  destaque: boolean;
  /** Foto de época do marco. Ausente ou null = moldura provisória com o ícone. */
  foto?: string | null;
  /** Texto explicativo, mostrado quando o visitante toca no cartão. Ausente = só o resumo. */
  texto?: string;
}

/** Texto de abertura da sala (aba Apresentação). */
export interface Apresentacao {
  titulo: string;
  /** Parágrafos. */
  texto: string[];
  /** Foto de época. Ausente ou null = moldura provisória com o ícone. */
  foto?: string | null;
  legenda: string;
  icone: string;
}

export interface Acontecimento {
  ano: number;
  texto: string;
}

/** Uma década da linha do tempo da sala (a aba Linha do tempo mostra todas lado a lado). */
export interface Decada {
  id: number;
  /** "Anos 60". */
  rotulo: string;
  /** "1958 a 1969". */
  periodo: string;
  titulo: string;
  resumo: string;
  icone: string;
  foto?: string | null;
  /** Três por década. */
  acontecimentos: Acontecimento[];
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
  /** Algum item desta sala é conteúdo de exemplo (o frontend não mostra mais o selo no rodapé; o campo segue na API). */
  demonstrativo: boolean;
  marcos: Marco[];
  fotos: Foto[];
  videos: Video[];
  /** Novos na versão de 6 espaços. Ausentes na API antiga: o app deriva o que puder (regras.ts). */
  apresentacao?: Apresentacao | null;
  decadas?: Decada[];
}

// ---------------------------------------------------------------- Sala 06 · aba Colegas

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
  /** Formato antigo (veja redes.ts). O servidor continua enviando, reescrito a partir de `redes`. */
  instagram: string;
  facebook: string;
  /** Até 3 redes. `link` só em "outra" (para mostrar como texto, nunca clicável). Ausente em servidores antigos. */
  redes?: { rede: RedeId; rotulo: string; usuario: string; link?: string }[];
  /** Só fotos aprovadas pela equipe. */
  fotos: FotoAluno[];
  /** Até 4 colegas com o mesmo ano e a mesma turma. */
  colegas: AlunoResumo[];
  /** Total de colegas da turma (a lista vem cortada em 4). Ausente em servidores antigos. */
  totalColegas?: number;
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
  /** Uma rede social por pessoa (opcional); `usuario` é só o usuário, sem endereço nem arroba. */
  rede: RedeId | '';
  usuario: string;
  consentimento: boolean;
  fotos: File[];
  /** Campo isca: pessoas não veem, robôs preenchem. */
  site: string;
}

export type ErrosCheckin = Partial<Record<keyof DadosCheckin | 'geral', string>>;
