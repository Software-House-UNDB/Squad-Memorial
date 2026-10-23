/**
 * Layout global das telas claras (o livro aberto): papel com fibra, Topo persistente e,
 * nas telas de área, a onda fechando a base. Telas de leitura usam a faixa de baixo para navegação.
 */
import type { ReactNode } from 'react';
import { Onda, PapelFibra } from '../ornamentos/Ornamentos';
import { Topo, type IdAba, type ItemTrilha } from '../topo/Topo';
import './layout.css';

interface Props {
  nome: string;
  aba?: IdAba;
  trilha?: ItemTrilha[];
  /** Telas de área (Sumário, Linha do tempo, Galeria…) fecham com a onda. */
  onda?: boolean;
  escura?: boolean;
  /** Camadas que cobrem a tela inteira, inclusive o Topo (lightbox, painel lateral). */
  sobreposicao?: ReactNode;
  children: ReactNode;
}

export function TelaClara({ nome, aba, trilha, onda = false, escura = false, sobreposicao, children }: Props) {
  return (
    <section className={['tela', `t-${nome}`, escura && 'tela--mesa'].filter(Boolean).join(' ')} aria-label={nome}>
      {!escura && <PapelFibra />}
      <Topo aba={aba} trilha={trilha} />
      <div className="tela-corpo tela-entra">{children}</div>
      {onda && <Onda />}
      {sobreposicao}
    </section>
  );
}