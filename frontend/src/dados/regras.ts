/**
 * Regras puras, usadas pelas telas e pelo conjunto de demonstração (o backend aplica as mesmas):
 * busca sem acento, realce do trecho encontrado, períodos de 5 anos e chips de década.
 */
import type { Foto } from './tipos';

const MARCAS = /[̀-ͯ]/g;

/** Minúsculo, sem acento e com espaços simples. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(MARCAS, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export const palavras = (q: string) => normalizar(q).split(' ').filter(Boolean);

/** Cada palavra digitada precisa estar contida no nome ("joao sil" → João Pedro da Silva Sales). */
export function corresponde(nome: string, q: string): boolean {
  const n = normalizar(nome);
  return palavras(q).every((p) => n.includes(p));
}

/**
 * Divide o nome em trechos, marcando o que corresponde à busca. Compara caractere a caractere já
 * normalizado, então "João" com a busca "joao" realça o nome inteiro, acento incluído.
 */
export function trechos(nome: string, q: string): { texto: string; marcado: boolean }[] {
  const ps = palavras(q);
  if (!ps.length) return [{ texto: nome, marcado: false }];
  const chars = [...nome];
  const norm = chars.map((c) => c.normalize('NFD').replace(MARCAS, '').toLowerCase());
  // índice no texto normalizado → índice do caractere original
  let plano = '';
  const origem: number[] = [];
  norm.forEach((c, i) => {
    for (const _ of c) origem.push(i);
    plano += c;
  });
  const marcado = new Array<boolean>(chars.length).fill(false);
  for (const p of ps) {
    let i = plano.indexOf(p);
    while (i >= 0) {
      for (let k = i; k < i + p.length; k++) marcado[origem[k]] = true;
      i = plano.indexOf(p, i + 1);
    }
  }
  const saida: { texto: string; marcado: boolean }[] = [];
  chars.forEach((c, i) => {
    const ultimo = saida[saida.length - 1];
    if (ultimo && ultimo.marcado === marcado[i]) ultimo.texto += c;
    else saida.push({ texto: c, marcado: marcado[i] });
  });
  return saida;
}

export function iniciais(nome: string): string {
  const ps = nome.split(/\s+/).filter((p) => p.length > 2);
  const primeira = (ps[0] ?? nome)[0] ?? '';
  const ultima = ps.length > 1 ? ps[ps.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

/** "Maria Clara Souza" → "Maria Souza" (pílulas de colegas). */
export function nomeCurto(nome: string): string {
  const ps = nome.split(/\s+/).filter(Boolean);
  return ps.length > 1 ? `${ps[0]} ${ps[ps.length - 1]}` : nome;
}

// ---------------------------------------------------------------- períodos de fotos

export interface Periodo {
  inicio: number;
  fim: number;
  rotulo: string;
  fotos: Foto[];
}

/**
 * Agrupa as fotos em blocos de 5 anos a partir do ano inicial (1958 – 1962, 1963 – 1967, …),
 * com o último bloco terminando no ano atual. Só voltam os blocos que têm foto.
 */
export function periodosDasFotos(fotos: Foto[], anoInicial: number, anoAtual: number): Periodo[] {
  const blocos = new Map<number, Foto[]>();
  for (const f of fotos) {
    const inicio = anoInicial + Math.floor((f.ano - anoInicial) / 5) * 5;
    const lista = blocos.get(inicio);
    if (lista) lista.push(f);
    else blocos.set(inicio, [f]);
  }
  return [...blocos.entries()]
    .sort(([a], [b]) => a - b)
    .map(([inicio, lista]) => {
      const fim = inicio + 4 > anoAtual && inicio <= anoAtual ? anoAtual : inicio + 4;
      return {
        inicio,
        fim,
        rotulo: fim === inicio ? String(inicio) : `${inicio} – ${fim}`,
        fotos: [...lista].sort((a, b) => a.ano - b.ano),
      };
    });
}

// ---------------------------------------------------------------- décadas (sala 5)

/**
 * Chips de década: 1958–1969, 1970–1979 … 2020–2026. Se a primeira década tiver menos de 5 anos
 * (1958 e 1959), ela se junta à seguinte.
 */
export function decadas(anoInicial: number, anoAtual: number): [number, number][] {
  const lista: [number, number][] = [];
  let inicio = anoInicial;
  let fim = inicio - (inicio % 10) + 9;
  if (fim - inicio + 1 < 5) fim += 10;
  while (inicio <= anoAtual) {
    lista.push([inicio, Math.min(fim, anoAtual)]);
    inicio = fim + 1;
    fim = inicio + 9;
  }
  return lista;
}

export const rotuloDecada = ([a, b]: [number, number]) => `${a}–${b}`;

// ---------------------------------------------------------------- formatos

export function duracao(segundos: number | null | undefined): string {
  const s = Math.max(0, Math.floor(segundos || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function dataCurta(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
