/**
 * Primeira abertura do totem sem sala definida (sem ?sala=N e nada guardado no aparelho).
 * A escolha fica guardada; para trocar depois, abra o endereço com outro ?sala=N.
 */
import assinatura from '../assets/memorial/assinatura.png';
import { SALAS_PADRAO } from '../dados/salas';
import './escolha.css';

export function EscolhaDeSala({ aoEscolher }: { aoEscolher: (n: number) => void }) {
  return (
    <div className="t-escolha">
      <img className="t-escolha__marca" src={assinatura} alt="Memorial Dom Bosco Maria Izabel Rodrigues" />
      <h1 className="serif">Escolha a sala deste totem</h1>
      <p>Cada totem mostra só a própria sala. A escolha fica guardada neste aparelho.</p>
      <ul className="t-escolha__lista">
        {SALAS_PADRAO.map((s) => (
          <li key={s.numero}>
            <button type="button" className="t-escolha__sala" onClick={() => aoEscolher(s.numero)}>
              <span className="t-escolha__num" style={{ background: s.cor }}>{s.numero}</span>
              <span className="t-escolha__rot">Sala {s.numero}</span>
              <b className="serif">{s.nome}</b>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
