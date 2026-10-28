/** Ícones de traço do Memorial (mesmo desenho do protótipo), em SVG inline: funcionam offline. */
import type { ReactNode } from 'react';

const P: Record<string, ReactNode> = {
  board: <><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M12 16v4M8 20h8M7 9h6M7 12h9" /></>,
  cap: <><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></>,
  book: <><path d="M3 5c3-1 6-1 9 1v14c-3-2-6-2-9-1z" /><path d="M21 5c-3-1-6-1-9 1v14c3-2 6-2 9-1z" /></>,
  flask: <><path d="M9 3h6M10 3v6l-5 10c-.5 1 .2 2 1.3 2h11.4c1.1 0 1.8-1 1.3-2l-5-10V3" /><path d="M7.5 15h9" /></>,
  laptop: <><rect x="5" y="5" width="14" height="10" rx="1" /><path d="M3 19h18" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14c2.8 0 5 2 5 5" /></>,
  apple: <><path d="M12 7c-2-2-7-1.5-7 4 0 4 3 9 5 9 1 0 1.3-.5 2-.5s1 .5 2 .5c2 0 5-5 5-9 0-5.5-5-6-7-4z" /><path d="M12 7c0-2 1-3.5 3-4" /></>,
  trophy: <><path d="M7 4h10v5a5 5 0 01-10 0z" /><path d="M7 6H4c0 3 1.5 4.5 3 5M17 6h3c0 3-1.5 4.5-3 5M12 14v4M8 21h8M9 18h6" /></>,
  medal: <><path d="M8 3l4 6 4-6" /><circle cx="12" cy="15" r="5" /><path d="M12 13v4" /></>,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  music: <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
  palette: <><path d="M12 3a9 9 0 100 18c1.5 0 2-1 2-2s-1-1.5-1-2.5S14 15 15 15h2a4 4 0 004-4c0-4.5-4-8-9-8z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" /></>,
  mask: <><path d="M4 5c5 2 11 2 16 0v6c0 5-3.5 9-8 9s-8-4-8-9z" /><path d="M8 11h2M14 11h2M9 15c2 1.5 4 1.5 6 0" /></>,
  heart: <path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z" />,
  image: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M21 16l-5-5-9 8" /></>,
  door: <><path d="M5 21V4a1 1 0 011-1h12a1 1 0 011 1v17M3 21h18" /><circle cx="15" cy="12" r=".8" fill="currentColor" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></>,
  play: <path d="M8 5v14l11-7z" fill="currentColor" />,
  pause: <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" />,
  left: <path d="M15 5l-7 7 7 7" />,
  right: <path d="M9 5l7 7-7 7" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  video: <><circle cx="12" cy="12" r="9" /><path d="M10 8.5v7l5.5-3.5z" /></>,
  qr: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" /></>,
  insta: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".6" fill="currentColor" /></>,
  fb: <path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z" />,
  arrowl: <path d="M19 12H5M11 6l-6 6 6 6" />,
  chev: <path d="M6 9l6 6 6-6" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  backspace: <><path d="M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9l-6-7z" /><path d="M12 9l6 6M18 9l-6 6" /></>,
  keyboard: <><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></>,
  volume: <><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12" /></>,
  mute: <><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9.5l5 5M22 9.5l-5 5" /></>,
  cc: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10.5 10.2a2.2 2.2 0 100 3.6M17 10.2a2.2 2.2 0 100 3.6" /></>,
  wifi: <><path d="M2 8.5a15 15 0 0120 0M5.5 12a10 10 0 0113 0M9 15.5a5 5 0 016 0" /><path d="M12 19h.01" /><path d="M3 3l18 18" /></>,
  refresh: <><path d="M20 11a8 8 0 00-14.3-4.9L4 8" /><path d="M4 3v5h5" /><path d="M4 13a8 8 0 0014.3 4.9L20 16" /><path d="M20 21v-5h-5" /></>,
};

export type NomeIcone = keyof typeof P;

/** Ícones que o admin pode escolher para um marco (mesma lista do backend: Marco.Icone). */
export const ICONES_MARCO = [
  'board', 'cap', 'book', 'flask', 'laptop', 'users', 'apple', 'trophy',
  'medal', 'star', 'music', 'palette', 'mask', 'heart', 'image', 'door',
] as const;

interface Props {
  nome: string;
  tamanho?: number;
  traco?: number;
  cor?: string;
  className?: string;
}

export function Icone({ nome, tamanho = 22, traco = 1.6, cor = 'currentColor', className }: Props) {
  return (
    <svg
      className={className}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={traco}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {P[nome] ?? P.image}
    </svg>
  );
}
