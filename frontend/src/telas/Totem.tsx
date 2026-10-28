/** Totem de uma sala: cabeçalho, título e rodapé. As abas chegam na fase 3. */
import { salaPadrao } from '../dados/salas';
import { Cabecalho } from './Cabecalho';
import './totem.css';

export function Totem({ numero }: { numero: number }) {
  const sala = salaPadrao(numero);
  return (
    <div className="tt" style={{ '--rc': sala.cor } as React.CSSProperties}>
      <Cabecalho sala={sala} />
      <main className="tt-main">
        <div className="tt-eyb">SALA {sala.numero} · {sala.nome}</div>
        <h1 className="tt-h1">{sala.titulo}</h1>
        <p className="tt-sub">{sala.subtitulo}</p>
        <div className="tt-filete" aria-hidden="true"><i /><em /></div>
      </main>
      <footer className="tt-rod" />
    </div>
  );
}
