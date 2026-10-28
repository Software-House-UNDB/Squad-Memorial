/**
 * As cinco salas do percurso. É o mesmo conteúdo que a migração do backend cria; o app usa estes
 * valores na escolha de sala e enquanto a primeira resposta do servidor não chega.
 */
import type { Sala } from './tipos';

export const SALAS_PADRAO: Sala[] = [
  { numero: 1, slug: 'educacao', nome: 'Educação', titulo: 'Retrospectiva da educação', subtitulo: 'Como se ensina e se aprende aqui, de 1958 até hoje', cor: '#4A4844', tipo: 'conteudo' },
  { numero: 2, slug: 'trofeus', nome: 'Troféus', titulo: 'Sala de troféus', subtitulo: 'Conquistas esportivas, culturais e acadêmicas', cor: '#84673A', tipo: 'conteudo' },
  { numero: 3, slug: 'artes', nome: 'Artes', titulo: 'Artes', subtitulo: 'Música, teatro, dança e artes visuais na escola', cor: '#8E5444', tipo: 'conteudo' },
  { numero: 4, slug: 'professoras', nome: 'Professoras', titulo: 'Nossas professoras', subtitulo: 'As mulheres que ensinaram gerações de alunos', cor: '#5A6650', tipo: 'conteudo' },
  { numero: 5, slug: 'fechamento', nome: 'Fechamento', titulo: 'Encontre seus colegas', subtitulo: 'Todos que fizeram check-in no Memorial. Pesquise por nome ou por ano.', cor: '#2B2A28', tipo: 'fechamento' },
];

export const salaPadrao = (n: number): Sala => SALAS_PADRAO.find((s) => s.numero === n) ?? SALAS_PADRAO[0];
