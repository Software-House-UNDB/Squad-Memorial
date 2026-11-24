/** Aba Apresentação: foto de época, texto de abertura do espaço e atalhos para as outras abas. */
import { FotoEpoca } from '../componentes/FotoEpoca';
import { Icone } from '../componentes/Icone';
import { separarDestaques } from '../dados/regras';
import type { Apresentacao as TApresentacao } from '../dados/tipos';
import type { Aba } from './estado';

const ATALHOS: { aba: Aba; rotulo: string; icone: string }[] = [
  { aba: 'linha', rotulo: 'Linha do tempo', icone: 'clock' },
  { aba: 'marcos', rotulo: 'Marcos', icone: 'star' },
  { aba: 'fotos', rotulo: 'Fotos', icone: 'image' },
];

interface Props {
  apresentacao: TApresentacao;
  semente: number;
  aoIr: (aba: Aba) => void;
}

export function Apresentacao({ apresentacao: a, semente, aoIr }: Props) {
  return (
    <div className="tt-apres entra">
      <figure className="tt-apres__foto">
        <FotoEpoca src={a.foto} alt={a.legenda || a.titulo} icone={a.icone} semente={semente} tamanhoIcone={96} />
        {a.legenda && <figcaption>{a.legenda}</figcaption>}
      </figure>
      <div className="tt-apres__txt">
        <div className="tt-eyb">APRESENTAÇÃO</div>
        <h2 className="tt-apres__tit serif">{a.titulo}</h2>
        {a.texto.map((p, i) => (
          <p key={i}>
            {separarDestaques(p).map((t, j) => (t.destaque ? <strong key={j} className="tt-apres__dest">{t.texto}</strong> : t.texto))}
          </p>
        ))}
        <div className="tt-apres__atalhos">
          {ATALHOS.map((x) => (
            <button key={x.aba} type="button" className="tt-atalho" onClick={() => aoIr(x.aba)}>
              <Icone nome={x.icone} tamanho={22} /> {x.rotulo}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
