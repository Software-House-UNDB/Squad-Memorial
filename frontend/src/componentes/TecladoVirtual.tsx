/**
 * Teclado próprio da busca. O teclado do Android cobriria metade do totem e quebraria o palco, então
 * o campo usa inputmode="none" e este teclado aparece fixo na parte de baixo. Só letras: a busca
 * ignora acentos e maiúsculas. As teclas não tiram o foco do campo (preventDefault no pointerdown).
 */
import { Icone } from './Icone';

const LINHAS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

interface Props {
  aoDigitar: (letra: string) => void;
  aoApagar: () => void;
  aoLimpar: () => void;
  aoFechar: () => void;
}

const manterFoco = (e: React.PointerEvent) => e.preventDefault();

export function TecladoVirtual({ aoDigitar, aoApagar, aoLimpar, aoFechar }: Props) {
  return (
    <div className="m-teclado" role="group" aria-label="Teclado" onPointerDown={manterFoco}>
      {LINHAS.map((linha) => (
        <div key={linha} className="m-teclado__linha">
          {[...linha].map((l) => (
            <button key={l} type="button" className="m-tecla" onClick={() => aoDigitar(l)} aria-label={l.toUpperCase()}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      ))}
      <div className="m-teclado__linha">
        <button type="button" className="m-tecla m-tecla--acao" onClick={aoLimpar}>Limpar</button>
        <button type="button" className="m-tecla m-tecla--espaco" onClick={() => aoDigitar(' ')} aria-label="Espaço">espaço</button>
        <button type="button" className="m-tecla m-tecla--acao" onClick={aoApagar} aria-label="Apagar">
          <Icone nome="backspace" tamanho={26} /> Apagar
        </button>
        <button type="button" className="m-tecla m-tecla--pronto" onClick={aoFechar}>
          <Icone nome="check" tamanho={24} /> Pronto
        </button>
      </div>
    </div>
  );
}
