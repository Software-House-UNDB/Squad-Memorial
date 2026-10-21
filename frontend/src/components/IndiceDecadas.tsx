import { useEffect, useRef, useState, type RefObject } from "react";

/** A partir de quantos períodos o índice aparece (com poucos, a lista inteira já cabe na vista). */
const MINIMO = 9;

/** Rola até o elemento; sem animação para quem pediu menos movimento. */
export function rolarPara(el: Element, block: ScrollLogicalPosition = "start") {
  const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: suave ? "smooth" : "auto", block });
}

const decada = (ano: number) => Math.floor(ano / 10) * 10;

/**
 * Atalhos por década, fixos no topo da rolagem, para acervos com dezenas de períodos.
 * `refs` aponta para o elemento de cada período (chave = id do período).
 */
export function IndiceDecadas({ periodos, refs }: {
  periodos: { id: number; ano: number }[];
  refs: RefObject<Map<number, HTMLElement>>;
}) {
  const primeiros = new Map<number, number>(); // década -> id do primeiro período
  for (const p of periodos) if (!primeiros.has(decada(p.ano))) primeiros.set(decada(p.ano), p.id);
  const decadas = [...primeiros.keys()];
  const anoPorId = new Map(periodos.map((p) => [p.id, p.ano]));

  const [ativa, setAtiva] = useState<number | null>(decadas[0] ?? null);
  const barra = useRef<HTMLElement>(null);
  const visivel = periodos.length >= MINIMO && decadas.length > 1;

  // Marca a década do período que está passando pela faixa superior da tela
  useEffect(() => {
    if (!visivel) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const ano = anoPorId.get(Number((e.target as HTMLElement).dataset.periodo));
          if (ano !== undefined) setAtiva(decada(ano));
        }
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    refs.current?.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [visivel, periodos]); // anoPorId deriva de periodos

  // Mantém o atalho ativo visível quando há décadas demais para a largura
  useEffect(() => {
    const b = barra.current;
    const chip = b?.querySelector<HTMLElement>(".decada.is-ativa");
    if (!b || !chip) return;
    b.scrollTo({ left: chip.offsetLeft - b.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [ativa]);

  if (!visivel) return null;

  return (
    <nav className="indice-decadas" aria-label="Ir para a década" ref={barra}>
      <span className="indice-decadas__rotulo">Décadas</span>
      {decadas.map((d) => (
        <button
          key={d}
          className={`decada ${ativa === d ? "is-ativa" : ""}`}
          aria-current={ativa === d ? "true" : undefined}
          aria-label={`Década de ${d}`}
          onClick={() => {
            const el = refs.current?.get(primeiros.get(d)!);
            if (el) rolarPara(el);
            setAtiva(d);
          }}
        >
          {d}
        </button>
      ))}
    </nav>
  );
}
