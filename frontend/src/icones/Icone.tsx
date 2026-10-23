/**
 * Ícones do Design System: SVG de traço 1.75, cantos redondos, grade de 24.
 * Sempre acompanhados de palavra (o rótulo vive no componente que usa o ícone).
 */
import type { SVGProps } from 'react';

const caminhos = {
  inicio: <><path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5" /></>,
  voltar: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  avancar: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  fechar: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  tempo: <><path d="M12 2.5v19" /><circle cx="12" cy="7" r="2.4" /><circle cx="12" cy="17" r="2.4" /><path d="M15.5 7h5M3.5 17h5" /></>,
  pessoas: <><circle cx="9" cy="8" r="3.4" /><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16.5 14.2c2.6.2 4.5 2.2 4.5 5" /></>,
  foto: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-9 8" /></>,
  documento: <><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>,
  predio: <><path d="M3.5 21h17M6 21V9.5L12 5.5l6 4V21" /><path d="M10 21v-4.5h4V21M9.5 12h1M13.5 12h1" /></>,
  memorias: <><path d="M5 7h5v4.5c0 3-1.8 5-4.5 6" /><path d="M14 7h5v4.5c0 3-1.8 5-4.5 6" /></>,
  mais: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  enquadrar: <><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /></>,
  toque: <><path d="M9.5 11V5.2a1.6 1.6 0 0 1 3.2 0V11" /><path d="M12.7 10.2a1.6 1.6 0 0 1 3.2 0v1.3" /><path d="M15.9 11a1.6 1.6 0 0 1 3.1.4v3.1c0 3.7-2.5 6.5-6 6.5h-.8c-2 0-3.5-.9-4.6-2.5l-3-4.4a1.6 1.6 0 0 1 2.6-1.8l2.3 2.4" /></>,
  alerta: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.3v.4" /></>,
  recarregar: <><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4v5h-5" /></>,
  texto: <path d="M5 6h14M5 10h14M5 14h10M5 18h7" />,
  vazio: <><rect x="4" y="5" width="16" height="14" rx="2" strokeDasharray="3 2.5" /><path d="M9 12h6" /></>,
  reproduzir: <path d="M8 5.5v13l10.5-6.5z" />,
  pausar: <path d="M8.5 5.5v13M15.5 5.5v13" />,
  video: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9.2v5.6l4.8-2.8z" /></>,
  livro: <><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z" /><path d="M12 6v13.5" /></>,
} as const;

export type NomeIcone = keyof typeof caminhos;

export function Icone({ nome, className, ...resto }: { nome: NomeIcone } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" className={['ico', className].filter(Boolean).join(' ')} aria-hidden="true" focusable="false" {...resto}>
      {caminhos[nome]}
    </svg>
  );
}

/** Ramo de louro (ornamento exclusivo dos títulos de área). */
export function Louro({ espelhado = false }: { espelhado?: boolean }) {
  return (
    <svg viewBox="0 0 40 66" className={`louro${espelhado ? ' louro--dir' : ''}`} aria-hidden="true" focusable="false">
      <path d="M30 64C12 52 8 30 22 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <g fill="currentColor">
        <ellipse cx="20" cy="55" rx="3.2" ry="7.5" transform="rotate(-55 20 55)" />
        <ellipse cx="29" cy="50" rx="3" ry="6.5" transform="rotate(35 29 50)" />
        <ellipse cx="13" cy="44" rx="3.2" ry="7.5" transform="rotate(-35 13 44)" />
        <ellipse cx="22" cy="38" rx="3" ry="6.5" transform="rotate(45 22 38)" />
        <ellipse cx="11" cy="31" rx="3.1" ry="7" transform="rotate(-18 11 31)" />
        <ellipse cx="20" cy="25" rx="2.8" ry="6.2" transform="rotate(50 20 25)" />
        <ellipse cx="14" cy="17" rx="2.8" ry="6.5" transform="rotate(-5 14 17)" />
        <ellipse cx="22" cy="11" rx="2.6" ry="5.5" transform="rotate(40 22 11)" />
        <ellipse cx="21" cy="4" rx="2.4" ry="5" transform="rotate(15 21 4)" />
      </g>
    </svg>
  );
}