/**
 * Áreas do Sumário, derivadas do acervo.
 * DESIGN.md: contagens vêm do acervo real; área com zero itens não aparece.
 */
import type { NomeIcone } from '../icones/Icone';
import type { Rota } from '../navegacao/rotas';
import { acervo, depoimentosAutorizados, marcosConquista, totalFotosGaleria, totalVideosGaleria } from './acervo';

export interface Area {
  id: string;
  nome: string;
  descricao: string;
  icone: NomeIcone;
  /** Contagem já formatada ("24 PERFIS"); vazio quando não há dado. */
  contagem: string;
  total: number;
  rota: Rota;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function areasDoSumario(): Area[] {
  const nPessoas = acervo.pessoas.length;
  const nConquistas = marcosConquista().length;
  const nVideos = totalVideosGaleria();
  const nAcervo = totalFotosGaleria() + nVideos + acervo.documentos.length;
  const nMemorias = depoimentosAutorizados().length;
  // "Lugares e cursos" entra quando o acervo tiver itens com essa marcação.
  const nLugares = 0;

  const areas: Area[] = [
    { id: 'pessoas', nome: 'Pessoas', descricao: 'Fundadores e quem construiu a instituição', icone: 'pessoas', total: nPessoas, contagem: plural(nPessoas, 'perfil', 'perfis'), rota: { tela: 'pessoas' } },
    { id: 'conquistas', nome: 'Marcos e conquistas', descricao: 'Reconhecimentos, autorizações, primeiras vezes', icone: 'documento', total: nConquistas, contagem: plural(nConquistas, 'marco', 'marcos'), rota: { tela: 'conquistas' } },
    { id: 'lugares', nome: 'Lugares e cursos', descricao: 'Como o campus e os cursos cresceram', icone: 'predio', total: nLugares, contagem: plural(nLugares, 'espaço', 'espaços'), rota: { tela: 'galeria' } },
    { id: 'acervo', nome: 'Acervo', descricao: nVideos ? 'Fotografias, vídeos e documentos' : 'Fotografias e documentos', icone: 'foto', total: nAcervo, contagem: plural(nAcervo, 'item', 'itens'), rota: { tela: 'galeria' } },
    { id: 'memorias', nome: 'Memórias', descricao: 'Depoimentos da comunidade acadêmica', icone: 'memorias', total: nMemorias, contagem: plural(nMemorias, 'relato', 'relatos'), rota: { tela: 'memorias' } },
  ];
  return areas.filter((a) => a.total > 0);
}