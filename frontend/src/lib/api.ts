export type Icone =
  | "predio" | "livro" | "ciencia" | "tecnologia"
  | "camera" | "formatura" | "estrela" | "pessoas";

export interface Foto {
  id: number;
  url: string | null;
  miniatura: string | null;
  largura: number | null;
  altura: number | null;
  legenda: string;
  credito: string;
  destaque: boolean;
}

export interface Periodo {
  id: number;
  ano: number;
  titulo: string;
  descricao: string;
  resumo_galeria: string;
  icone: Icone;
  fotos: Foto[];
}

export interface Video {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  categoria_nome: string;
  ano: number | null;
  periodo: number | null;
  url: string;
  capa: string | null;
  duracao_segundos: number | null;
}

export interface Config {
  titulo: string;
  subtitulo: string;
  segundos_inatividade: number;
  segundos_atualizacao: number;
  descanso_ativo: boolean;
}

export interface TotemData {
  versao: string;
  config: Config;
  periodos: Periodo[];
  videos: Video[];
  categorias_video: { valor: string; nome: string }[];
}

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

async function getJson<T>(path: string, timeoutMs = 8000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}${path}`, { signal: ctrl.signal, cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

export const buscarTotem = () => getJson<TotemData>("/api/totem/");
export const buscarVersao = () => getJson<{ versao: string }>("/api/totem/versao/", 5000);
