/**
 * Foto ampliada: fundo escuro, foto grande com moldura branca, setas, "ANO · FOTO i DE n" e Fechar.
 * Deslizar para o lado troca a foto. Sem toque por segundosLightbox (45 s), fecha sozinha.
 */
import { quiosque } from '../config/quiosque';
import type { Foto } from '../dados/tipos';
import { useArrastarLados } from '../quiosque/arrastar';
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
  const arrastar = useArrastarLados((d) => aoMudar((indice + d + n) % n));
  useTemporizadorLocal(true, quiosque.inatividade.lightboxMs, aoFechar);
  if (!foto) return null;
  // o banco de exemplo ainda traz "Conteúdo de exemplo" no crédito: essa linha não aparece
  const credito = foto.credito && !/^conteúdo de exemplo/i.test(foto.credito.trim()) ? foto.credito : '';

  const ir = (passo: number) => aoMudar((indice + passo + n) % n);

  return (
    <div className="m-ov" role="dialog" aria-modal="true" aria-label={`Foto ${indice + 1} de ${n}`}>
      <button type="button" className="m-ov__fechar" onClick={aoFechar}>
        <Icone nome="x" tamanho={20} /> Fechar
      </button>
      {/* o arraste vale na área toda, setas incluídas: em pé elas ficam sobre a foto (retrato.css) */}
      <div className="m-ov__foto-area" {...arrastar}>
        <div className="m-ov__moldura">
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
        <small className="num">{foto.ano > 0 ? `${foto.ano} · ` : ''}FOTO {indice + 1} DE {n}</small>
        <span className="serif">{foto.legenda}</span>
        {credito && <em>{credito}</em>}
      </div>
    </div>
  );
}
