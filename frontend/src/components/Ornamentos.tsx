import type { CSSProperties } from "react";

export function Brasao({ tamanho = 56, className }: { tamanho?: number; className?: string }) {
  return (
    <img
      src="/brasao.svg"
      alt=""
      width={tamanho}
      height={tamanho * 1.125}
      className={className}
      draggable={false}
    />
  );
}

/** Ramo de louro desenhado proceduralmente: folhas ao longo de uma curva. */
export function Louro({ espelhado = false, className, style }: {
  espelhado?: boolean; className?: string; style?: CSSProperties;
}) {
  const folhas = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // curva do caule: de baixo (30,190) subindo e abrindo para fora
    const x = 30 + 34 * Math.sin(t * Math.PI * 0.55);
    const y = 190 - t * 170;
    const tamanho = 15 - t * 6;
    const ang = -25 - t * 30;
    folhas.push(
      <ellipse key={`e${i}`} cx={x - 9} cy={y} rx={tamanho * 0.42} ry={tamanho}
        transform={`rotate(${ang} ${x - 9} ${y})`} />,
      <ellipse key={`d${i}`} cx={x + 9} cy={y - 6} rx={tamanho * 0.42} ry={tamanho}
        transform={`rotate(${-ang - 10} ${x + 9} ${y - 6})`} />,
    );
  }
  return (
    <svg viewBox="0 0 100 210" className={className} style={{
      transform: espelhado ? "scaleX(-1)" : undefined, ...style,
    }} aria-hidden>
      <path d="M30 205 C 40 150, 62 90, 64 20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <g fill="currentColor" opacity="0.55">{folhas}</g>
    </svg>
  );
}

/** Linha fina com losango dourado no centro. */
export function Divisor({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 12" className={className ?? "divisor"} aria-hidden preserveAspectRatio="none">
      <line x1="0" y1="6" x2="138" y2="6" stroke="var(--ouro)" strokeWidth="1" />
      <line x1="162" y1="6" x2="300" y2="6" stroke="var(--ouro)" strokeWidth="1" />
      <path d="M150 0 L156 6 L150 12 L144 6 Z" fill="var(--ouro)" />
    </svg>
  );
}

/** Arabesco que ladeia o brasão nos títulos. */
export function Floreio({ espelhado = false }: { espelhado?: boolean }) {
  return (
    <svg viewBox="0 0 80 24" className="floreio" aria-hidden
      style={{ transform: espelhado ? "scaleX(-1)" : undefined }}>
      <path
        d="M78 12 H46 C40 12 36 4 29 4 C22 4 20 12 26 14 C31 16 33 10 29 9 M46 12 C40 12 37 20 30 20 C24 20 18 16 14 12 H2"
        fill="none" stroke="var(--ouro)" strokeWidth="1.4" strokeLinecap="round"
      />
      <circle cx="2" cy="12" r="1.8" fill="var(--ouro)" />
    </svg>
  );
}

/** Camadas de fundo: aquarelas difusas e a onda azul com fio dourado no rodapé. */
export function Fundo() {
  return (
    <div className="fundo" aria-hidden>
      <div className="fundo__aquarela fundo__aquarela--a" />
      <div className="fundo__aquarela fundo__aquarela--b" />
      <div className="fundo__aquarela fundo__aquarela--c" />
      <div className="fundo__textura" />
      <svg className="fundo__onda" viewBox="0 0 1440 160" preserveAspectRatio="none">
        <path d="M0 160 V120 C 420 150, 900 120, 1440 20 V160 Z" fill="var(--tinta)" />
        <path d="M0 160 V138 C 480 160, 980 130, 1440 50 V160 Z" fill="var(--tinta-2)" opacity="0.55" />
        <path d="M0 114 C 420 144, 900 114, 1440 14" fill="none" stroke="var(--ouro)" strokeWidth="3" />
      </svg>
    </div>
  );
}
