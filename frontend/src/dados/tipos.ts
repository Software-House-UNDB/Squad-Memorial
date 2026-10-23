/**
 * Modelo de dados do acervo do Memorial.
 * Toda peça tem id único, fonte documental e a marca `demo` enquanto não vier do acervo oficial.
 * Os relacionamentos são sempre por id, para que o acervo possa vir de um JSON externo no futuro.
 */

export type Id = string;

export interface Fonte {
  /** Ex.: "Acervo institucional UNDB, caixa 12" ou "Conteúdo demonstrativo". */
  descricao: string;
  url?: string;
}

export interface ItemBase {
  id: Id;
  /** true = conteúdo demonstrativo, a ser substituído pelo acervo oficial. */
  demo: boolean;
  fonte: Fonte;
}

/** Tom da placa provisória exibida enquanto não há imagem real (1–5). */
export type TomPlaca = 1 | 2 | 3 | 4 | 5;

/** Vídeo do acervo. Entra na lista de fotos (com a capa em `src`) e abre no lightbox. */
export interface VideoAcervo {
  src: string;
  titulo: string;
  /** Duração em segundos, quando conhecida. */
  duracao?: number;
}

export interface Foto extends ItemBase {
  /** Caminho da imagem derivada (WebP/AVIF, lado maior 2560px). Sem src, exibe a placa provisória. */
  src?: string;
  /** Miniatura de 480px. Se ausente, usa `src`. */
  srcMiniatura?: string;
  tom: TomPlaca;
  /** Legenda curta, até 140 caracteres. */
  legenda: string;
  /** Data como deve ser exibida: "1998", "c. 1990", "Data a confirmar". */
  data: string;
  /** Ano numérico para ordenação, quando conhecido. */
  ano?: number;
  /** Texto alternativo para leitor de tela (normalmente igual à legenda). */
  alt: string;
  periodoId?: Id;
  marcoId?: Id;
  pessoaIds?: Id[];
  /** Autor da fotografia, quando conhecido. */
  credito?: string;
  /** Presente quando o item é um vídeo; `src` passa a ser a capa. */
  video?: VideoAcervo;
}

export interface PaginaDocumento {
  src?: string;
  alt: string;
}

export interface Documento extends ItemBase {
  titulo: string;
  data: string;
  ano?: number;
  /** Ata, ofício, fotografia de documento, recorte de jornal… */
  tipo: string;
  codigoAcervo?: string;
  marcoId?: Id;
  /** Páginas digitalizadas. Vazio = documento ainda não digitalizado. */
  paginas: PaginaDocumento[];
  /** Transcrição em parágrafos, quando houver. */
  transcricao?: string[];
}

export interface Periodo extends ItemBase {
  titulo: string;
  inicio: number;
  fim: number;
  descricao: string;
  fotoId?: Id;
}

export type TipoMarco = 'predio' | 'documento' | 'pessoa' | 'foto';

export interface Marco extends ItemBase {
  periodoId: Id;
  ano: number;
  /** Data exibida quando diferente do ano simples ("c. 1998", "março de 1998"). */
  dataTexto?: string;
  titulo: string;
  /** Uma frase para o cartão. */
  resumo: string;
  /** Lead em itálico, até 20 palavras. */
  lede: string;
  /** Corpo em parágrafos curtos, até ~90 palavras no total visível. */
  narrativa: string[];
  tipo: TipoMarco;
  /** Aparece também em "Marcos e conquistas". */
  conquista?: boolean;
  fotoIds: Id[];
  documentoIds: Id[];
  pessoaIds: Id[];
  depoimentoId?: Id;
}

export interface Pessoa extends ItemBase {
  nome: string;
  /** Papel na instituição: "Fundadora", "Primeira direção acadêmica"… */
  papel: string;
  biografia: string[];
  retratoId?: Id;
  marcoIds: Id[];
  fotoIds: Id[];
  /** Nome e papel confirmados por fonte pública ou institucional. */
  verificado?: boolean;
  /** Autorização de uso de imagem registrada. Sem ela, o retrato não é exibido. */
  autorizacaoImagem?: boolean;
}

export interface Depoimento extends ItemBase {
  texto: string;
  autor: string;
  vinculo: string;
  marcoId?: Id;
  /** Sem autorização registrada, o depoimento não entra (DESIGN.md). */
  autorizado: boolean;
}

/** Configuração do totem cadastrada no admin. */
export interface ConfigTotem {
  titulo: string;
  subtitulo: string;
  segundosInatividade: number;
  segundosContagem: number;
  segundosLightbox: number;
  segundosAtualizacao: number;
}

/** Resposta de GET /api/totem/. */
export interface RespostaTotem {
  versao: string;
  config: ConfigTotem;
  acervo: Acervo;
}

export interface Acervo {
  periodos: Periodo[];
  marcos: Marco[];
  fotos: Foto[];
  documentos: Documento[];
  pessoas: Pessoa[];
  depoimentos: Depoimento[];
}