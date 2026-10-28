/**
 * Foto ampliada: fundo escuro, foto grande com moldura branca, setas, "ANO · FOTO i DE n" e Fechar.
 * Deslizar para o lado troca a foto. Sem toque por segundosLightbox (45 s), fecha sozinha.
 */
import { useRef } from 'react';
import { quiosque } from '../config/quiosque';
import type { Foto } from '../dados/tipos';
import { useTemporizadorLocal } from '../quiosque/Inatividade';
import { Icone } from './Icone';
import { Imagem } from './Imagem';

interface Props {
  fotos: Foto[];
  indice: number;
  icone: (f: Foto) => string;
  aoMudar: (i: number) => void;
  aoFechar: () => void;
}

export function OverlayFoto({ fotos, indice, icone, aoMudar, aoFechar }: Props) {
  const foto = fotos[indice];
  const n = fotos.length;
  const inicio = useRef<{ x: number; y: number } | null>(null);
  useTemporizadorLocal(true, quiosque.inatividade.lightboxMs, aoFechar);
  if (!foto) return null;

  const ir = (passo: number) => aoMudar((indice + passo + n) % n);

  return (
    <div className="m-ov" role="dialog" aria-modal="true" aria-label={`Foto ${indice + 1} de ${n}`}>
      <button type="button" className="m-ov__fechar" onClick={aoFechar}>
        <Icone nome="x" tamanho={20} /> Fechar
      </button>
      <div className="m-ov__foto-area">
        <div
          className="m-ov__moldura"
          onPointerDown={(e) => { inicio.current = { x: e.clientX, y: e.clientY }; }}
          onPointerUp={(e) => {
            const i = inicio.current;
            inicio.current = null;
            if (!i) return;
            const dx = e.clientX - i.x;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - i.y)) ir(dx < 0 ? 1 : -1);
          }}
        >
          <Imagem key={foto.id} src={foto.src} alt={foto.alt || foto.legenda} semente={foto.id} icone={icone(foto)} tamanhoIcone={120} prioridade />
        </div>
        {n > 1 && (
          <>
            <button type="button" className="m-ov__nav m-ov__nav--ant" onClick={() => ir(-1)} aria-label="Foto anterior">
              <Icone nome="left" tamanho={26} />
            </button>
            <button type="button" className="m-ov__nav m-ov__nav--prox" onClick={() => ir(1)} aria-label="Próxima foto">
              <Icone nome="right" tamanho={26} />
            </button>
          </>
        )}
      </div>
      <div className="m-ov__leg">
        <small className="num">{foto.ano} · FOTO {indice + 1} DE {n}</small>
        <span className="serif">{foto.legenda}</span>
        {foto.credito && <em>{foto.credito}</em>}
      </div>
    </div>
  );
}
