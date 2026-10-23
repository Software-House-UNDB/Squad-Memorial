/**
 * Tela 8 · Retorno por inatividade (camada global sobre a tela atual).
 * Toque em qualquer lugar continua; "Voltar à capa agora" fecha o livro na hora.
 */
import logoBranco from '../assets/undb-logo-branco.png';
import { Botao } from '../componentes/botoes/Botao';
import { useInatividade } from './Inatividade';
import './aviso.css';

export function AvisoInatividade() {
  const { avisoAberto, restante, fracao, continuar, voltarAgora } = useInatividade();
  if (!avisoAberto) return null;
  return (
    <div className="t-retorno" role="alertdialog" aria-modal="true" aria-labelledby="aviso-titulo" aria-describedby="aviso-texto" onClick={continuar}>
      <div className="aviso">
        <img src={logoBranco} alt="UNDB Centro Universitário" />
        <h2 id="aviso-titulo">AINDA ESTÁ AÍ?</h2>
        <p id="aviso-texto">
          O memorial volta à capa em <b className="num">{restante}</b> {restante === 1 ? 'segundo' : 'segundos'}.<br />
          Toque em qualquer lugar para continuar.
        </p>
        <div className="ampulheta" aria-hidden="true"><i style={{ transform: `scaleX(${fracao})` }} /></div>
        <div className="botoes">
          <Botao variante="pri" grande onClick={(e) => { e.stopPropagation(); continuar(); }}>Continuar explorando</Botao>
          <Botao variante="escuro" grande onClick={(e) => { e.stopPropagation(); voltarAgora(); }}>Voltar à capa agora</Botao>
        </div>
      </div>
    </div>
  );
}