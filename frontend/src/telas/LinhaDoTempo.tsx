/**
 * Aba Linha do tempo: as décadas lado a lado (uma linha com pontos) e, abaixo, o painel da década
 * escolhida: foto, resumo e três acontecimentos. As setas passam para a década anterior/seguinte.
 */
import { FotoEpoca } from '../componentes/FotoEpoca';
import { Icone } from '../componentes/Icone';
import type { Decada } from '../dados/tipos';

interface Props {
  decadas: Decada[];
  indice: number;
  aoEscolher: (i: number) => void;
}

export function LinhaDoTempo({ decadas, indice, aoEscolher }: Props) {
  if (!decadas.length) {
    return <p className="tt-vazio entra">Este espaço ainda não tem linha do tempo.</p>;
  }
  const i = Math.min(Math.max(indice, 0), decadas.length - 1);
  const d = decadas[i];
  return (
    <div className="tt-linha entra">
      <div className="tt-linha__trilho" role="tablist" aria-label="Décadas" style={{ gridTemplateColumns: `repeat(${decadas.length}, minmax(0, 1fr))` }}>
        {decadas.map((x, k) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={k === i}
            className={['tt-dec', k === i && 'is-ativa'].filter(Boolean).join(' ')}
            onClick={() => aoEscolher(k)}
          >
            <span className="tt-dec__ponto" aria-hidden="true"><i /></span>
            <b className="serif">{x.rotulo}</b>
            <small className="tt-dec__etq">{x.periodo}</small>
          </button>
        ))}
      </div>

      <article className="tt-painel tt-cartao" key={d.id} aria-label={`${d.rotulo}: ${d.titulo}`}>
        <FotoEpoca src={d.foto} alt={d.titulo} icone={d.icone} semente={d.id} className="tt-painel__foto" tamanhoIcone={72} />
        <div className="tt-painel__txt">
          <div className="tt-eyb num">{d.rotulo.toUpperCase()} · {i + 1} DE {decadas.length}</div>
          <h3 className="tt-painel__tit serif">{d.titulo}</h3>
          {d.resumo && <p className="tt-painel__resumo">{d.resumo}</p>}
          {d.acontecimentos.length > 0 && (
            <ul className="tt-painel__ev">
              {d.acontecimentos.map((e, k) => (
                <li key={k}>
                  <span className="tt-painel__ano num">{e.ano}</span>
                  <span>{e.texto}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="tt-painel__setas">
          <button type="button" className="m-seta" disabled={i <= 0} onClick={() => aoEscolher(i - 1)} aria-label="Década anterior">
            <Icone nome="left" tamanho={22} />
          </button>
          <button type="button" className="m-seta" disabled={i >= decadas.length - 1} onClick={() => aoEscolher(i + 1)} aria-label="Próxima década">
            <Icone nome="right" tamanho={22} />
          </button>
        </div>
      </article>
    </div>
  );
}
