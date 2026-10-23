import type { Id } from '../dados/tipos';

/** As telas do memorial. A capa não é rota: é o estado "livro fechado" (ver Navegacao.tsx). */
export type Rota =
  | { tela: 'sumario' }
  | { tela: 'linha-do-tempo'; periodoId?: Id }
  | { tela: 'marco'; marcoId: Id }
  | { tela: 'galeria' }
  | { tela: 'pessoas' }
  | { tela: 'documento'; documentoId: Id }
  | { tela: 'conquistas' }
  | { tela: 'memorias' };

export type NomeTela = Rota['tela'];

/** Aba do Topo que fica ativa em cada tela. */
export const abaDaTela: Record<NomeTela, 'inicio' | 'linha-do-tempo' | 'pessoas' | 'acervo' | 'memorias'> = {
  sumario: 'inicio',
  'linha-do-tempo': 'linha-do-tempo',
  marco: 'linha-do-tempo',
  conquistas: 'linha-do-tempo',
  documento: 'acervo',
  galeria: 'acervo',
  pessoas: 'pessoas',
  memorias: 'memorias',
};