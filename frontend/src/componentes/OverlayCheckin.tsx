/** "Ainda não fez check-in?": o QR Code da página de check-in, grande, e os três passos da placa. */
import { Icone } from './Icone';
import { QrCode } from './QrCode';

const PASSOS = [
  ['Leia o QR Code', 'Com a câmera do seu celular.'],
  ['Preencha seus dados', 'Nome, ano, turma e, se quiser, fotos e redes sociais.'],
  ['Siga o percurso', 'Seu nome aparece aqui, na sala 5, para os colegas encontrarem.'],
] as const;

export function OverlayCheckin({ url, aoFechar }: { url: string; aoFechar: () => void }) {
  const curto = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return (
    <div className="m-ov m-ov--checkin" role="dialog" aria-modal="true" aria-labelledby="ck-titulo">
      <button type="button" className="m-ov__fechar" onClick={aoFechar}>
        <Icone nome="x" tamanho={20} /> Fechar
      </button>
      <div className="m-ck">
        <div className="m-ck__qr">
          <QrCode texto={url} tamanho={360} rotulo={`QR Code do check-in: ${curto}`} />
          <span>APONTE A CÂMERA DO CELULAR</span>
        </div>
        <div className="m-ck__texto">
          <small>CHECK-IN DO VISITANTE</small>
          <h2 id="ck-titulo" className="serif">Faça seu <span className="sem-quebra">check-in</span> pelo celular</h2>
          <p>Registre sua passagem pela escola e seja encontrado por quem estudou com você.</p>
          <ol className="m-ck__passos">
            {PASSOS.map(([titulo, texto], i) => (
              <li key={titulo}>
                <span className="m-ck__num serif">{i + 1}</span>
                <span>
                  <b className="serif">{titulo}</b>
                  <em>{texto}</em>
                </span>
              </li>
            ))}
          </ol>
          <p className="m-ck__url">Ou acesse <b>{curto}</b></p>
        </div>
      </div>
    </div>
  );
}
