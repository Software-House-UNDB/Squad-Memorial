/** Linha do tempo: ano, nó com ícone do tipo de marco e cartão; fio dourado ligando os nós. */
import { fotosDe } from '../../dados/acervo';
import type { Marco } from '../../dados/tipos';
import { Icone } from '../../icones/Icone';
import { CartaoMarco, iconeDoMarco } from '../editorial/Editorial';
import './linha-do-tempo.css';

interface Props {
  marcos: Marco[];
  atualId?: string;
  aoAbrir: (m: Marco) => void;
}

export function FilasDoTempo({ marcos, atualId, aoAbrir }: Props) {
  return (
    <ol className="m-tempo">
      {marcos.map((m) => (
        <li key={m.id} className={['fila', m.id === atualId && 'is-atual'].filter(Boolean).join(' ')} data-marco={m.id}>
          <span className="ano">{m.dataTexto ?? m.ano}</span>
          <span className="m-no" aria-hidden="true"><Icone nome={iconeDoMarco[m.tipo]} /></span>
          <CartaoMarco marco={m} capa={fotosDe(m.fotoIds)[0]} mostrarAno={false} aoTocar={() => aoAbrir(m)} />
        </li>
      ))}
    </ol>
  );
}