/** As abas em pílula de cada espaço. A Sala 06 (tipo "fechamento") tem uma a mais: Colegas. */
import { Icone } from '../componentes/Icone';
import type { Sala } from '../dados/tipos';
import type { Aba } from './estado';

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: 'apresentacao', rotulo: 'Apresentação', icone: 'book' },
  { id: 'linha', rotulo: 'Linha do tempo', icone: 'clock' },
  { id: 'fotos', rotulo: 'Fotos', icone: 'image' },
  { id: 'videos', rotulo: 'Vídeos', icone: 'video' },
];
const ABA_COLEGAS = { id: 'colegas' as Aba, rotulo: 'Colegas', icone: 'users' };

const temColegas = (sala: Sala) => sala.tipo === 'fechamento';

/** Uma aba que a sala não tem (por exemplo "colegas" numa sala de conteúdo) volta para a Apresentação. */
export const abaValida = (sala: Sala, aba: Aba): Aba => (aba === 'colegas' && !temColegas(sala) ? 'apresentacao' : aba);

interface Props {
  sala: Sala;
  aba: Aba;
  aoEscolher: (aba: Aba) => void;
}

export function AbasSala({ sala, aba, aoEscolher }: Props) {
  const abas = temColegas(sala) ? [...ABAS, ABA_COLEGAS] : ABAS;
  return (
    <div className="tt-abas" role="tablist" aria-label="Conteúdo do espaço">
      {abas.map((a) => (
        <button
          key={a.id}
          type="button"
          role="tab"
          aria-selected={aba === a.id}
          className={['tt-aba', aba === a.id && 'is-ativa'].filter(Boolean).join(' ')}
          onClick={() => aoEscolher(a.id)}
        >
          <Icone nome={a.icone} tamanho={20} /> {a.rotulo}
        </button>
      ))}
    </div>
  );
}
