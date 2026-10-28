/**
 * Aba Fotos: à esquerda os períodos de 5 anos (só os que têm foto, calculados pelo ano de cada
 * foto); à direita o período em grade de 4 × 2 polaroides, com setas de página.
 */
import { useEffect, useRef } from 'react';
import { Icone } from '../componentes/Icone';
import { Polaroide } from '../componentes/Polaroide';
import type { Periodo } from '../dados/regras';
import type { Foto } from '../dados/tipos';

export const FOTOS_POR_PAGINA = 8;

interface Props {
  periodos: Periodo[];
  periodo: Periodo | undefined;
  pagina: number;
  icone: (f: Foto) => string;
  aoPeriodo: (inicio: number) => void;
  aoPagina: (p: number) => void;
  aoAbrir: (indice: number) => void;
}

export function Fotos({ periodos, periodo, pagina, icone, aoPeriodo, aoPagina, aoAbrir }: Props) {
  const lista = useRef<HTMLDivElement>(null);

  // mantém o período escolhido à vista na lista que rola
  useEffect(() => {
    lista.current?.querySelector<HTMLElement>('.is-ativo')?.scrollIntoView({ block: 'nearest' });
  }, [periodo?.inicio]);

  if (!periodo) return <p className="tt-vazio entra">Esta sala ainda não tem fotos.</p>;

  const total = periodo.fotos.length;
  const paginas = Math.max(1, Math.ceil(total / FOTOS_POR_PAGINA));
  const pg = Math.min(pagina, paginas - 1);
  const de = pg * FOTOS_POR_PAGINA;
  const itens = periodo.fotos.slice(de, de + FOTOS_POR_PAGINA);

  return (
    <div className="tt-fotos entra">
      <nav className="tt-per tt-cartao" aria-label="Períodos de 5 anos">
        <div className="tt-per__rot">PERÍODOS DE 5 ANOS</div>
        <div className="tt-per__lista rola" ref={lista}>
          {periodos.map((p) => (
            <button
              key={p.inicio}
              type="button"
              className={p.inicio === periodo.inicio ? 'is-ativo' : undefined}
              aria-current={p.inicio === periodo.inicio}
              onClick={() => aoPeriodo(p.inicio)}
            >
              <span className="num">{p.rotulo}</span>
              <small className="num">{p.fotos.length} {p.fotos.length === 1 ? 'foto' : 'fotos'}</small>
            </button>
          ))}
        </div>
      </nav>

      <section className="tt-galeria" aria-label={`Fotos de ${periodo.rotulo}`}>
        <header className="tt-galeria__cab">
          <h2 className="serif num">{periodo.rotulo}</h2>
          <span className="tt-galeria__cont num">
            {total} {total === 1 ? 'foto' : 'fotos'} · mostrando {de + 1} a {de + itens.length}
          </span>
          <span className="tt-galeria__setas">
            <button type="button" className="m-seta" onClick={() => aoPagina(pg - 1)} disabled={pg === 0} aria-label="Página anterior">
              <Icone nome="left" tamanho={22} />
            </button>
            <button type="button" className="m-seta" onClick={() => aoPagina(pg + 1)} disabled={pg >= paginas - 1} aria-label="Próxima página">
              <Icone nome="right" tamanho={22} />
            </button>
          </span>
        </header>
        <div className="tt-galeria__grade">
          {itens.map((f, i) => (
            <Polaroide
              key={f.id}
              src={f.miniatura}
              alt={f.alt || f.legenda}
              ano={f.ano}
              legenda={f.legenda}
              semente={f.id}
              icone={icone(f)}
              posicao={i}
              aoTocar={() => aoAbrir(de + i)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
