/**
 * Ponto único de acesso ao acervo.
 * O acervo vem da API do backend (GET /api/totem/) e é aplicado com `definirAcervo`, feito pelo
 * DadosProvider (dados/Dados.tsx) só quando o livro está fechado. As telas leem tudo por aqui,
 * sem saber de onde veio: os nomes exportados são ligações vivas (live bindings) do ES module.
 */
import type { Acervo, ConfigTotem, Depoimento, Documento, Foto, Id, Marco, Periodo, Pessoa } from './tipos';

const VAZIO: Acervo = { periodos: [], marcos: [], fotos: [], documentos: [], pessoas: [], depoimentos: [] };

export const CONFIG_PADRAO: ConfigTotem = {
  titulo: 'Memorial',
  subtitulo: 'A história da UNDB, guardada por quem faz parte dela.',
  segundosInatividade: 90,
  segundosContagem: 15,
  segundosLightbox: 45,
  segundosAtualizacao: 300,
};

export let acervo: Acervo = VAZIO;
export let configTotem: ConfigTotem = CONFIG_PADRAO;

const porId = <T extends { id: Id }>(lista: T[]) => new Map(lista.map((x) => [x.id, x]));

let mapaPeriodos = new Map<Id, Periodo>();
let mapaMarcos = new Map<Id, Marco>();
let mapaFotos = new Map<Id, Foto>();
let mapaDocumentos = new Map<Id, Documento>();
let mapaPessoas = new Map<Id, Pessoa>();
let mapaDepoimentos = new Map<Id, Depoimento>();

/** Troca o acervo inteiro (e a configuração). Chamado pelo DadosProvider. */
export function definirAcervo(novo: Acervo, config?: ConfigTotem) {
  acervo = novo;
  if (config) configTotem = { ...CONFIG_PADRAO, ...config };
  mapaPeriodos = porId(novo.periodos);
  mapaMarcos = porId(novo.marcos);
  mapaFotos = porId(novo.fotos);
  mapaDocumentos = porId(novo.documentos);
  mapaPessoas = porId(novo.pessoas);
  mapaDepoimentos = porId(novo.depoimentos);
}

export const periodo = (id?: Id): Periodo | undefined => (id ? mapaPeriodos.get(id) : undefined);
export const marco = (id?: Id): Marco | undefined => (id ? mapaMarcos.get(id) : undefined);
export const foto = (id?: Id): Foto | undefined => (id ? mapaFotos.get(id) : undefined);
export const documento = (id?: Id): Documento | undefined => (id ? mapaDocumentos.get(id) : undefined);
export const pessoa = (id?: Id): Pessoa | undefined => (id ? mapaPessoas.get(id) : undefined);

const existe = <T>(x: T | undefined): x is T => x !== undefined;

/** Períodos em ordem cronológica. */
export const periodosOrdenados = (): Periodo[] => [...acervo.periodos].sort((a, b) => a.inicio - b.inicio);

/** Todos os marcos em ordem cronológica (a ordem da leitura "anterior/próximo"). */
export const marcosOrdenados = (): Marco[] => [...acervo.marcos].sort((a, b) => a.ano - b.ano || a.id.localeCompare(b.id, undefined, { numeric: true }));

export const marcosDoPeriodo = (periodoId: Id): Marco[] => marcosOrdenados().filter((m) => m.periodoId === periodoId);

export const marcosConquista = (): Marco[] => marcosOrdenados().filter((m) => m.conquista);

export const fotosDe = (ids: Id[]): Foto[] => ids.map(foto).filter(existe);
export const documentosDe = (ids: Id[]): Documento[] => ids.map(documento).filter(existe);
export const pessoasDe = (ids: Id[]): Pessoa[] => ids.map(pessoa).filter(existe);
export const marcosDe = (ids: Id[]): Marco[] => ids.map(marco).filter(existe);

const porAno = (a: Foto, b: Foto) => (a.ano ?? 0) - (b.ano ?? 0);

/** Fotografias de um período na galeria (com ou sem marco), em ordem de ano. Vídeos ficam de fora. */
export const fotosDoPeriodo = (periodoId: Id): Foto[] =>
  acervo.fotos.filter((f) => f.periodoId === periodoId && !f.video).sort(porAno);

/** Vídeos de um período, em ordem de ano. */
export const videosDoPeriodo = (periodoId: Id): Foto[] =>
  acervo.fotos.filter((f) => f.periodoId === periodoId && f.video).sort(porAno);

export const documentosDoPeriodo = (periodoId: Id): Documento[] => {
  const p = periodo(periodoId);
  if (!p) return [];
  return acervo.documentos.filter((d) => d.ano !== undefined && d.ano >= p.inicio && d.ano <= p.fim);
};

/** Só depoimentos com autorização registrada (DESIGN.md: sem autorização, não entra). */
export const depoimentosAutorizados = (): Depoimento[] => acervo.depoimentos.filter((d) => d.autorizado);

export const depoimento = (id?: Id): Depoimento | undefined => {
  const d = id ? mapaDepoimentos.get(id) : undefined;
  return d && d.autorizado ? d : undefined;
};

/** Retrato só aparece com autorização de uso de imagem. */
export const retratoDe = (p: Pessoa): Foto | undefined => (p.autorizacaoImagem ? foto(p.retratoId) : undefined);

export const totalFotosGaleria = () => acervo.fotos.filter((f) => f.periodoId && !f.video).length;
export const totalVideosGaleria = () => acervo.fotos.filter((f) => f.periodoId && f.video).length;

export const conteudoDemonstrativo = () =>
  [...acervo.marcos, ...acervo.fotos, ...acervo.documentos, ...acervo.pessoas, ...acervo.periodos].some((x) => x.demo);