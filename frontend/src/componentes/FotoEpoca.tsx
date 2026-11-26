/**
 * Foto de época (apresentação e décadas): a imagem com tom sépia e moldura envelhecida.
 * Sem imagem, mostra a moldura provisória com o ícone, no mesmo tom.
 */
import { Imagem } from './Imagem';

interface Props {
  src?: string | null;
  alt: string;
  icone: string;
  /** Define o tom da moldura provisória. */
  semente?: number;
  className?: string;
  tamanhoIcone?: number;
}

export function FotoEpoca({ src, alt, icone, semente = 0, className, tamanhoIcone = 72 }: Props) {
  return (
    <div className={['m-epoca', className].filter(Boolean).join(' ')}>
      <Imagem src={src ?? null} alt={alt} semente={semente} icone={icone} tamanhoIcone={tamanhoIcone} />
    </div>
  );
}
