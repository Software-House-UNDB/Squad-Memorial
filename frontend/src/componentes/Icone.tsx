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
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10M10 20v-6h4v6" /></>,
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
  tiktok: <><path d="M14 3v11.5a3.5 3.5 0 11-3.5-3.5" /><path d="M14 3c.2 2.5 2 4.3 5 4.5" /></>,
  linkedin: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M8 10.5V16M8 7.8v.1M12 16v-5.5M12 13a2.5 2.5 0 015 0v3" /></>,
  rede_x: <><path d="M4 4h4.5L20 20h-4.5z" /><path d="M20 4l-7 8M4 20l7-8" /></>,
  youtube: <><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.5l5 2.5-5 2.5z" /></>,
  threads: <path d="M16.5 9.2c-.6-2.4-2.4-3.7-4.8-3.7-3.2 0-5.2 2.5-5.2 6.5s2 6.5 5.2 6.5c2.9 0 4.6-1.5 4.6-3.6 0-2.3-2.1-3.1-4.3-3-1.7.1-2.5 1-2.5 2s.9 1.7 2.1 1.7c2 0 3.2-1.4 3.2-4.1" />,
  link: <><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  pinterest: <><circle cx="12" cy="12" r="9" /><path d="M10.2 20.5l1.7-7M9 11.2c0-2 1.4-3.2 3.1-3.2 1.8 0 3 1.2 3 2.8 0 2.1-1.2 3.6-2.9 3.6-.9 0-1.6-.5-1.8-1.2" /></>,
  snapchat: <path d="M12 3.5c-2.8 0-4.3 2-4.3 4.6v1.8c-.7.3-1.4.4-2.2.5.3.7 1 1 2 1.1-.4 1.6-1.6 2.7-3.2 3.2.8.6 2 .4 2.9.8.5.5.9 1.5 2.1 1.5.9 0 1.3-.7 2.7-.7s1.8.7 2.7.7c1.2 0 1.6-1 2.1-1.5.9-.4 2.1-.2 2.9-.8-1.6-.5-2.8-1.6-3.2-3.2 1-.1 1.7-.4 2-1.1-.8-.1-1.5-.2-2.2-.5V8.1c0-2.6-1.5-4.6-4.3-4.6z" />,
  telegram: <><path d="M21 4L3 11l6 2.5L11 20l3-4.5 5 3.5z" /><path d="M9 13.5L21 4" /></>,
  twitch: <><path d="M4 3h17v11l-4 4h-4l-3 3v-3H4z" /><path d="M12 8v4M16 8v4" /></>,
  github: <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />,
  behance: <path d="M3 6.5h5a2.3 2.3 0 010 4.5H3zM3 11h5.5a2.8 2.8 0 010 5.5H3zM3 6.5v10M14 7h6M14.5 14h6c0-2-1.2-3.2-3-3.2s-3 1.2-3 3.2 1.2 3.3 3 3.3c1 0 1.8-.4 2.3-1.2" />,
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
