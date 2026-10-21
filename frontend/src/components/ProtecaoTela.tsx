import { useEffect, useMemo, useState } from "react";
import { useTotem } from "../hooks/useTotem";
import { Brasao, Divisor } from "./Ornamentos";

const INTERVALO = 8000;

interface Slide {
  id: number;
  src: string;
  reserva: string | null;
  ano: number;
  legenda: string;
}

function embaralhar<T>(lista: T[]) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Sequência de fotos do acervo enquanto ninguém usa o totem. Qualquer toque fecha. */
export function ProtecaoTela({ aoTocar }: { aoTocar: () => void }) {
  const { data } = useTotem();
  const slides = useMemo<Slide[]>(() => {
    const todas = (data?.periodos ?? []).flatMap((p) =>
      p.fotos
        .filter((f) => f.url || f.miniatura)
        .map((f) => ({
          id: f.id,
          src: (f.url ?? f.miniatura)!,
          reserva: f.miniatura,
          ano: p.ano,
          legenda: f.legenda || p.titulo,
        })),
    );
    return embaralhar(todas).slice(0, 60);
  }, [data]);

  const [i, setI] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % slides.length), INTERVALO);
    return () => clearInterval(id);
  }, [slides.length]);

  // pré-carrega o próximo slide
  useEffect(() => {
    const prox = slides[(i + 1) % slides.length];
    if (prox) new Image().src = prox.src;
  }, [i, slides]);

  return (
    <div className="protecao" onPointerDown={aoTocar} role="button" aria-label="Toque para começar">
      {slides.map((s, idx) => (
        <img
          key={s.id}
          src={Math.abs(idx - i) <= 1 || idx === 0 ? s.src : undefined}
          onError={(e) => s.reserva && (e.currentTarget.src = s.reserva)}
          className={`protecao__slide ${idx === i ? "is-ativo" : ""} ${idx % 2 ? "is-alt" : ""}`}
          alt=""
          draggable={false}
        />
      ))}
      <div className="protecao__veu" />
      {slides[i] && (
        <div className="protecao__legenda" key={slides[i].id}>
          <span className="protecao__ano">{slides[i].ano}</span>
          <span>{slides[i].legenda}</span>
        </div>
      )}
      <div className="protecao__chamada">
        <Brasao tamanho={72} />
        <h1>{data?.config.titulo ?? "Memorial"}</h1>
        <Divisor className="protecao__divisor" />
        <p className="protecao__toque">Toque na tela para explorar</p>
      </div>
    </div>
  );
}
