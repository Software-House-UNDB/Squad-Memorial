/**
 * Aba Fotos: à esquerda (em cima, no retrato) os períodos de 5 anos, só os que têm foto, calculados pelo ano
 * de cada foto; à direita o período inteiro numa grade de polaroides que rola na vertical (dedo, mouse ou
 * roda). Cabem 4 × 2 na tela deitada e 2 × 4 em pé; as setas avançam uma tela de cada vez.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icone } from '../componentes/Icone';
import { Polaroide } from '../componentes/Polaroide';
import type { Periodo } from '../dados/regras';
import type { Foto } from '../dados/tipos';

interface Props {
  periodos: Periodo[];
  periodo: Periodo | undefined;
  /** Foto (posição no período) que deve estar à vista: a última ampliada, ao voltar do overlay. */
  fotoAVista: number;
  icone: (f: Foto) => string;
  aoPeriodo: (inicio: number) => void;
  aoAbrir: (indice: number) => void;
}

interface Medidas {
  colunas: number;
  linhas: number;
  /** Altura de uma linha + o espaço entre linhas (px do palco). */
  passo: number;
}

/**
 * Colunas e linhas por tela vêm do CSS (--fotos-colunas / --fotos-linhas), que muda no retrato. Se a grade
 * for baixa demais para elas (palco 3:4), a polaroide não achata: cabem menos linhas e o resto rola.
 */
function medir(grade: HTMLElement): Medidas & { altura: number } {
  const s = getComputedStyle(grade);
  const colunas = Number(s.getPropertyValue('--fotos-colunas')) || 4;
  const desejadas = Number(s.getPropertyValue('--fotos-linhas')) || 2;
  const gap = Number.parseFloat(s.rowGap) || 0;
  const util = grade.clientHeight - (Number.parseFloat(s.paddingTop) || 0) - (Number.parseFloat(s.paddingBottom) || 0);
  const largura = grade.clientWidth - (Number.parseFloat(s.paddingLeft) || 0) - (Number.parseFloat(s.paddingRight) || 0);
  const minima = Math.max(150, ((largura - gap * (colunas - 1)) / colunas) * 0.42);
  let linhas = desejadas;
  while (linhas > 1 && (util - gap * (linhas - 1)) / linhas < minima) linhas--;
  const altura = Math.max(minima, (util - gap * (linhas - 1)) / linhas);
  return { colunas, linhas, passo: altura + gap, altura };
}

export function Fotos({ periodos, periodo, fotoAVista, icone, aoPeriodo, aoAbrir }: Props) {
  const lista = useRef<HTMLDivElement>(null);
  const grade = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState<Medidas>({ colunas: 4, linhas: 2, passo: 0 });
  const [linhaTopo, setLinhaTopo] = useState(0);

  const total = periodo?.fotos.length ?? 0;

  const temGrade = periodo !== undefined;

  // a altura das linhas acompanha a altura da grade: sempre cabem exatamente `linhas` linhas na tela
  // biome-ignore lint/correctness/useExhaustiveDependencies: a grade só existe quando há período
  useLayoutEffect(() => {
    const g = grade.current;
    if (!g) return;
    const ajustar = () => {
      const m = medir(g);
      g.style.gridAutoRows = `${m.altura}px`;
      setMedidas((a) => (a.colunas === m.colunas && a.linhas === m.linhas && a.passo === m.passo ? a : m));
    };
    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(g);
    return () => ro.disconnect();
  }, [temGrade]);

  const aoRolar = useCallback(() => {
    const g = grade.current;
    if (!g || !medidas.passo) return;
    setLinhaTopo(Math.max(0, Math.round(g.scrollTop / medidas.passo)));
  }, [medidas.passo]);

  // período novo começa do topo
  // biome-ignore lint/correctness/useExhaustiveDependencies: o período é o gatilho
  useEffect(() => {
    grade.current?.scrollTo({ top: 0, behavior: 'instant' });
    setLinhaTopo(0);
    lista.current?.querySelector<HTMLElement>('.is-ativo')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [periodo?.inicio]);

  // ao voltar da foto ampliada, a última foto vista fica à vista na grade
  useEffect(() => {
    const g = grade.current;
    if (!g || !medidas.passo || fotoAVista <= 0) return;
    const linha = Math.floor(fotoAVista / medidas.colunas);
    const primeira = Math.round(g.scrollTop / medidas.passo);
    if (linha < primeira || linha >= primeira + medidas.linhas) {
      g.scrollTo({ top: Math.max(0, linha - medidas.linhas + 1) * medidas.passo, behavior: 'instant' });
    }
    aoRolar();
  }, [fotoAVista, medidas, aoRolar]);

  if (!periodo) return <p className="tt-vazio entra">Esta sala ainda não tem fotos.</p>;

  const porTela = medidas.colunas * medidas.linhas;
  const linhasTotal = Math.ceil(total / medidas.colunas);
  const ultimaLinhaTopo = Math.max(0, linhasTotal - medidas.linhas);
  const topo = Math.min(linhaTopo, ultimaLinhaTopo);
  const de = Math.min(total, topo * medidas.colunas + 1);
  const ate = Math.min(total, de - 1 + porTela);

  const passarTela = (d: 1 | -1) => {
    const g = grade.current;
    if (!g || !medidas.passo) return;
    const alvo = Math.min(ultimaLinhaTopo, Math.max(0, topo + d * medidas.linhas));
    g.scrollTo({ top: alvo * medidas.passo, behavior: 'smooth' });
  };

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
            {total} {total === 1 ? 'foto' : 'fotos'} · mostrando {de} a {ate}
          </span>
          <span className="tt-galeria__setas">
            <button type="button" className="m-seta" onClick={() => passarTela(-1)} disabled={topo <= 0} aria-label="Fotos anteriores">
              <Icone nome="up" tamanho={22} />
            </button>
            <button
              type="button"
              className="m-seta"
              onClick={() => passarTela(1)}
              disabled={topo >= ultimaLinhaTopo}
              aria-label="Mais fotos"
            >
              <Icone nome="down" tamanho={22} />
            </button>
          </span>
        </header>
        <div className="tt-galeria__grade rola" ref={grade} onScroll={aoRolar}>
          {periodo.fotos.map((f, i) => (
            <Polaroide
              key={f.id}
              src={f.miniatura}
              alt={f.alt || f.legenda}
              ano={f.ano}
              legenda={f.legenda}
              semente={f.id}
              icone={icone(f)}
              posicao={i}
              aoTocar={() => aoAbrir(i)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
