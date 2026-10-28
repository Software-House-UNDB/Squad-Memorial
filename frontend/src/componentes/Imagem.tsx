/**
 * Uma foto do acervo, ou a moldura provisória (degradê quente com ícone) quando a foto ainda não
 * tem imagem, como no conteúdo de exemplo. Se a imagem falhar ao carregar, também cai na moldura.
 */
import { useState } from 'react';
import { Icone } from './Icone';

const TONS = ['#8A7F70', '#A08C6E', '#7E7A74', '#968670', '#8C8378', '#A49174', '#857C71', '#9A8A73'];
export const tom = (semente: number) => TONS[Math.abs(semente) % TONS.length];

interface Props {
  src: string | null;
  alt: string;
  /** Usado para o tom e o ícone da moldura provisória. */
  semente: number;
  icone?: string;
  tamanhoIcone?: number;
  className?: string;
  /** Imagens grandes (overlay) sem lazy loading. */
  prioridade?: boolean;
}

export function Imagem({ src, alt, semente, icone = 'image', tamanhoIcone = 44, className, prioridade }: Props) {
  const [falhou, setFalhou] = useState(false);
  if (src && !falhou) {
    return (
      <img
        className={['m-img', className].filter(Boolean).join(' ')}
        src={src}
        alt={alt}
        loading={prioridade ? 'eager' : 'lazy'}
        decoding="async"
        onError={() => setFalhou(true)}
      />
    );
  }
  const t = tom(semente);
  return (
    <div
      className={['m-img m-img--moldura', className].filter(Boolean).join(' ')}
      style={{ background: `radial-gradient(circle at 50% 40%, ${t}aa, ${t} 70%, #5e574e)` }}
      role="img"
      aria-label={alt}
    >
      <Icone nome={icone} tamanho={tamanhoIcone} traco={1.3} />
    </div>
  );
}
