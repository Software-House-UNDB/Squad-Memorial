import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Foto } from "../lib/api";

interface Props {
  fotos: Foto[];
  inicio: number;
  ano: number;
  titulo: string;
  aoFechar: () => void;
}

export function Lightbox({ fotos, inicio, ano, titulo, aoFechar }: Props) {
  const [i, setI] = useState(inicio);
  const [arrasto, setArrasto] = useState(0);
  const origem = useRef<number | null>(null);
  const tiraRef = useRef<HTMLDivElement>(null);
  const foto = fotos[i];

  const ir = useCallback(
    (delta: number) => setI((atual) => (atual + delta + fotos.length) % fotos.length),
    [fotos.length],
  );

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
      if (e.key === "ArrowRight") ir(1);
      if (e.key === "ArrowLeft") ir(-1);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [ir, aoFechar]);

  // Mantém a miniatura ativa visível na tira
  useEffect(() => {
    tiraRef.current?.children[i]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [i]);

  const inicioArrasto = (e: React.PointerEvent) => {
    origem.current = e.clientX;
  };
  const moverArrasto = (e: React.PointerEvent) => {
    if (origem.current !== null) setArrasto(e.clientX - origem.current);
  };
  const fimArrasto = () => {
    if (Math.abs(arrasto) > 70) ir(arrasto < 0 ? 1 : -1);
    origem.current = null;
    setArrasto(0);
  };

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Fotos de ${ano}`}>
      <div className="lightbox__topo">
        <div className="lightbox__contexto">
          <span className="lightbox__ano">{ano}</span>
          <span className="lightbox__titulo">{titulo}</span>
        </div>
        <span className="lightbox__contador">{i + 1} / {fotos.length}</span>
        <button className="botao-redondo" onClick={aoFechar} aria-label="Fechar">
          <X size={30} />
        </button>
      </div>

      <div
        className="lightbox__palco"
        onPointerDown={inicioArrasto}
        onPointerMove={moverArrasto}
        onPointerUp={fimArrasto}
        onPointerCancel={fimArrasto}
        onPointerLeave={fimArrasto}
      >
        {fotos.length > 1 && (
          <button className="lightbox__seta lightbox__seta--esq" onClick={() => ir(-1)} aria-label="Anterior">
            <ChevronLeft size={44} />
          </button>
        )}
        <img
          key={foto.id}
          className="lightbox__img"
          src={foto.url ?? foto.miniatura ?? ""}
          onError={(e) => {
            // offline e a versão grande não está em cache: usa a miniatura
            const img = e.currentTarget;
            if (foto.miniatura && img.src !== foto.miniatura) img.src = foto.miniatura;
          }}
          alt={foto.legenda || `Foto de ${ano}`}
          style={{ transform: `translateX(${arrasto}px)`, transition: arrasto ? "none" : undefined }}
          draggable={false}
        />
        {fotos.length > 1 && (
          <button className="lightbox__seta lightbox__seta--dir" onClick={() => ir(1)} aria-label="Próxima">
            <ChevronRight size={44} />
          </button>
        )}
      </div>

      <div className="lightbox__legenda">
        {foto.legenda && <p>{foto.legenda}</p>}
        {foto.credito && <p className="lightbox__credito">Foto: {foto.credito}</p>}
      </div>

      {fotos.length > 1 && (
        <div className="lightbox__tira" ref={tiraRef}>
          {fotos.map((f, idx) => (
            <button
              key={f.id}
              className={`lightbox__mini ${idx === i ? "is-ativa" : ""}`}
              onClick={() => setI(idx)}
              aria-label={`Foto ${idx + 1}`}
            >
              <img src={f.miniatura ?? ""} alt="" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
