/**
 * Aviso de inatividade (camada sobre a tela atual).
 * Toque em qualquer lugar continua; "Voltar ao início" desfaz a visita na hora.
 */
import monograma from '../assets/memorial/monograma.png';
import { useInatividade } from './Inatividade';
import './aviso.css';

export function AvisoInatividade() {
  const { avisoAberto, restante, fracao, continuar, voltarAgora } = useInatividade();
  if (!avisoAberto) return null;
  return (
    <div className="t-aviso" role="alertdialog" aria-modal="true" aria-labelledby="aviso-titulo" aria-describedby="aviso-texto" onClick={continuar}>
      <div className="t-aviso__caixa">
        <img src={monograma} alt="" />
        <h2 id="aviso-titulo" className="serif">Ainda está aí?</h2>
        <p id="aviso-texto">
          O totem volta ao início da sala em <b className="num">{restante}</b> {restante === 1 ? 'segundo' : 'segundos'}.<br />
          Toque em qualquer lugar para continuar.
        </p>
        <div className="t-aviso__barra" aria-hidden="true"><i style={{ transform: `scaleX(${fracao})` }} /></div>
        <div className="t-aviso__botoes">
          <button type="button" className="t-aviso__btn t-aviso__btn--pri" onClick={(e) => { e.stopPropagation(); continuar(); }}>Continuar explorando</button>
          <button type="button" className="t-aviso__btn" onClick={(e) => { e.stopPropagation(); voltarAgora(); }}>Voltar ao início</button>
        </div>
      </div>
    </div>
  );
}
