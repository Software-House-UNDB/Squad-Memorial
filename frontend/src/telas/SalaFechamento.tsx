/** Sala 5 (fechamento): busca de ex-alunos e perfil. A tela completa chega na fase 4. */
import type { Conexao } from '../dados/Dados';
import type { RespostaSala } from '../dados/tipos';
import { Moldura, Titulo } from './Moldura';
import type { PropsSala } from './estado';

export function SalaFechamento({ dados }: PropsSala & { dados: RespostaSala; conexao: Conexao }) {
  return (
    <Moldura sala={dados.sala} dica={null} exemplo={dados.demonstrativo}>
      <Titulo sala={dados.sala} />
    </Moldura>
  );
}
