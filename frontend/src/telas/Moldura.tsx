/** Cabeçalho grafite, área principal e rodapé com a dica de uso, comuns a todas as salas. */
import type { CSSProperties, ReactNode } from 'react';
import icone from '../assets/memorial/icone.png';
import { Icone } from '../componentes/Icone';
import type { Sala } from '../dados/tipos';
import { Cabecalho } from './Cabecalho';

interface PropsMoldura {
  sala: Sala;
  dica: ReactNode;
  /** Selo "Conteúdo de exemplo" no rodapé. */
  exemplo?: boolean;
  /** Aviso de conexão no rodapé (sala 5). */
  aviso?: ReactNode;
  /** Overlays, desenhados sobre a moldura inteira. */
  sobre?: ReactNode;
  children: ReactNode;
}

export function Moldura({ sala, dica, exemplo, aviso, sobre, children }: PropsMoldura) {
  return (
    <div className="tt" style={{ '--rc': sala.cor } as CSSProperties} data-sala={sala.numero}>
      <Cabecalho sala={sala} />
      <main className="tt-main">{children}</main>
      <footer className="tt-rod">
        <span className="tt-rod__dica">{dica}</span>
        {aviso && <span className="tt-rod__aviso" role="status"><Icone nome="wifi" tamanho={20} /> {aviso}</span>}
        {exemplo && (
          <span className="tt-rod__exemplo">
            Conteúdo de exemplo · Memorial Dom Bosco <img src={icone} alt="" />
          </span>
        )}
      </footer>
      {sobre}
    </div>
  );
}

export function Titulo({ sala, children }: { sala: Sala; children?: ReactNode }) {
  return (
    <div className="tt-titulo">
      <div className="tt-eyb">SALA {sala.numero} · {sala.nome}</div>
      <h1 className="tt-h1">{sala.titulo}</h1>
      {sala.subtitulo && <p className="tt-sub">{sala.subtitulo}</p>}
      <div className="tt-filete" aria-hidden="true"><i /><em /></div>
      {children}
    </div>
  );
}
