/**
 * Os seis espaços do percurso. O app usa estes valores na escolha de sala e enquanto a primeira
 * resposta do servidor não chega; depois, nome, título e cor vêm da API (a do servidor vale).
 *
 * Fundação, Diretores, Professores, Artes e Esporte são salas de conteúdo. A Sala 06 (Alunos) tem
 * as mesmas abas e mais a aba Colegas, que mostra a busca de ex-alunos (tipo 'fechamento').
 */
import type { Sala } from './tipos';

export const SALAS_PADRAO: Sala[] = [
  { numero: 1, slug: 'fundacao', nome: 'Fundação', titulo: 'Fundação', subtitulo: '', cor: '#8E6918', tipo: 'conteudo' },
  { numero: 2, slug: 'diretores', nome: 'Diretores', titulo: 'Diretores', subtitulo: '', cor: '#2F62B0', tipo: 'conteudo' },
  { numero: 3, slug: 'professores', nome: 'Professores', titulo: 'Professores', subtitulo: '', cor: '#17805F', tipo: 'conteudo' },
  { numero: 4, slug: 'artes', nome: 'Artes', titulo: 'Artes', subtitulo: '', cor: '#C43F60', tipo: 'conteudo' },
  { numero: 5, slug: 'esporte', nome: 'Esportes', titulo: 'Esportes', subtitulo: '', cor: '#B85A0C', tipo: 'conteudo' },
  { numero: 6, slug: 'alunos', nome: 'Alunos', titulo: 'Alunos', subtitulo: '', cor: '#6E4BA8', tipo: 'fechamento' },
];

export const salaPadrao = (n: number): Sala => SALAS_PADRAO.find((s) => s.numero === n) ?? SALAS_PADRAO[0];

/** "1" → "01": o selo e os rótulos do totem usam dois dígitos. */
export const dois = (n: number) => String(n).padStart(2, '0');
