/** Cabeçalho, área principal e rodapé com a dica de uso, comuns a todas as salas. */
import type { CSSProperties, ReactNode } from 'react';
import { Icone } from '../componentes/Icone';
import { dois } from '../dados/salas';
import type { Sala } from '../dados/tipos';
import { Cabecalho } from './Cabecalho';

interface PropsMoldura {
  sala: Sala;
  dica: ReactNode;
  /** Aviso de conexão no rodapé (Sala 06). */
  aviso?: ReactNode;
  /** Overlays, desenhados sobre a moldura inteira. */
  sobre?: ReactNode;
  children: ReactNode;
}

export function Moldura({ sala, dica, aviso, sobre, children }: PropsMoldura) {
  return (
    <div className="tt" style={{ '--rc': sala.cor } as CSSProperties} data-sala={sala.numero}>
      <Cabecalho sala={sala} />
      <main className="tt-main">{children}</main>
      <footer className="tt-rod">
        <span className="tt-rod__dica">{dica}</span>
        {aviso && <span className="tt-rod__aviso" role="status"><Icone nome="wifi" tamanho={20} /> {aviso}</span>}
      </footer>
      {sobre}
    </div>
  );
}

interface PropsTitulo {
  sala: Sala;
  /** Substitui o título/subtítulo da sala (a aba Colegas se chama "Encontre seus colegas"). */
  titulo?: string;
  subtitulo?: string;
  children?: ReactNode;
}

export function Titulo({ sala, titulo, subtitulo, children }: PropsTitulo) {
  const sub = subtitulo ?? sala.subtitulo;
  return (
    <div className="tt-titulo">
      <div className="tt-eyb">SALA {dois(sala.numero)} · {sala.nome}</div>
      <h1 className="tt-h1">{titulo ?? sala.titulo}</h1>
      {sub && <p className="tt-sub">{sub}</p>}
      <div className="tt-filete" aria-hidden="true"><i /><em /></div>
      {children}
    </div>
  );
}
