/** Foto em moldura de polaroide branca, com rotação leve e legenda "ano legenda". */
import { Imagem } from './Imagem';

const ROTACOES = [-0.6, 0.4, -0.3, 0.5, 0.3, -0.5, 0.6, -0.4];

interface Props {
  src: string | null;
  alt: string;
  ano: number | null;
  legenda: string;
  semente: number;
  icone?: string;
  /** Posição na grade: define a rotação (±0,6°). */
  posicao: number;
  aoTocar?: () => void;
}

export function Polaroide({ src, alt, ano, legenda, semente, icone, posicao, aoTocar }: Props) {
  const conteudo = (
    <>
      <Imagem src={src} alt={alt} semente={semente} icone={icone} />
      <span className="m-pol__leg">
        {ano !== null && <b className="num">{ano}</b>} <i>{legenda}</i>
      </span>
    </>
  );
  const estilo = { transform: `rotate(${ROTACOES[posicao % ROTACOES.length]}deg)` };
  if (!aoTocar) return <figure className="m-pol" style={estilo}>{conteudo}</figure>;
  return (
    <button type="button" className="m-pol" style={estilo} onClick={aoTocar} aria-label={`Ampliar foto${ano ? ` de ${ano}` : ''}: ${legenda}`}>
      {conteudo}
    </button>
  );
}
