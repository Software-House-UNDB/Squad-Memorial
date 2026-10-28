/**
 * Cabeçalho grafite de todos os totens: assinatura, selo da sala e o percurso.
 * Em produção os pontos do percurso são só indicadores (cada totem conhece apenas a própria sala).
 */
import assinatura from '../assets/memorial/assinatura.png';
import { TOTAL_SALAS } from '../config/sala';
import type { Sala } from '../dados/tipos';

export function Cabecalho({ sala }: { sala: Sala }) {
  const n = sala.numero;
  return (
    <header className="tt-cab">
      <img className="tt-cab__marca" src={assinatura} alt="Memorial Dom Bosco Maria Izabel Rodrigues" />
      <span className="tt-cab__div" aria-hidden="true" />
      <div className="tt-cab__sala">
        <span className="tt-cab__selo num" style={{ background: sala.cor }}>{n}</span>
        <div>
          <small>SALA {n}</small>
          <b className="serif">{sala.nome}</b>
        </div>
      </div>
      <div className="tt-cab__percurso" aria-label={`Percurso: sala ${n} de ${TOTAL_SALAS}`}>
        <span aria-hidden="true">PERCURSO</span>
        <span className="tt-cab__pontos" aria-hidden="true">
          {Array.from({ length: TOTAL_SALAS }, (_, i) => i + 1).map((i) => (
            <span key={i} className="tt-cab__passo">
              <i className={i === n ? 'is-atual' : i < n ? 'is-feito' : undefined} />
              {i < TOTAL_SALAS && <span className="tt-cab__fio" />}
            </span>
          ))}
        </span>
        <span className="tt-cab__n num">Sala {n} de {TOTAL_SALAS}</span>
      </div>
    </header>
  );
}
