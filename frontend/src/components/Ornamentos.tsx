import type { CSSProperties } from "react";
import logoBranca from "../assets/logoundbbranca.png";
import logoCinza from "../assets/logoundbcinza.png";
import logoPreta from "../assets/logoundbpreta.png";

/**
 * Logo oficial da UNDB. Os arquivos são usados como vieram: sem recolorir,
 * sem filtro e sempre na proporção original (a altura vem do CSS, a largura acompanha).
 * - "suave": cinza #363636, padrão nos fundos claros (contraste 9,9:1 sobre o papel)
 * - "escuro": preta, para quando o fundo claro pedir contraste máximo
 * - "claro": branca, para fundos escuros (proteção de tela)
 */
const LOGOS = {
  suave: { src: logoCinza, w: 541, h: 163 },
  escuro: { src: logoPreta, w: 541, h: 163 },
  claro: { src: logoBranca, w: 552, h: 166 },
} as const;

export type VarianteLogo = keyof typeof LOGOS;

export function Logo({ variante = "suave", className, decorativo = false }: {
  variante?: VarianteLogo; className?: string; decorativo?: boolean;
}) {
  const { src, w, h } = LOGOS[variante];
  return (
    <img
      src={src}
      alt={decorativo ? "" : "UNDB Centro Universitário"}
      width={w}
      height={h}
      className={`logo ${className ?? ""}`}
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
