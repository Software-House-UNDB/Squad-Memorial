/**
 * Arrastar no totem, com o dedo ou com toque que chega como mouse (molduras de toque USB que o Android trata
 * como mouse): para os lados passa fotos e páginas; nas áreas que rolam, rola (rolarComMouse, em guardas.ts).
 */
import { type MouseEvent, type PointerEvent, useRef } from 'react';

/** Distância mínima (px da tela) para um arraste contar como "passar". */
const ARRASTE_MINIMO = 60;

/** +1: arrastou para a esquerda (próximo); -1: para a direita (anterior); 0: curto ou mais vertical que lateral. */
export function direcaoDoArraste(dx: number, dy: number, minimo = ARRASTE_MINIMO): 1 | -1 | 0 {
  if (Math.abs(dx) < minimo || Math.abs(dx) <= Math.abs(dy) * 1.2) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * Props para um elemento que passa itens ao arrastar para os lados. O toque simples continua sendo um toque:
 * só um arraste de verdade chama aoPassar, e aí o clique que viria em seguida é descartado (para não abrir a
 * foto em que o dedo começou). Use com touch-action: pan-y no elemento, para o navegador não ficar com o gesto.
 */
export function useArrastarLados(aoPassar: (direcao: 1 | -1) => void) {
  const inicio = useRef<{ x: number; y: number; id: number } | null>(null);
  const passou = useRef(false);
  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      inicio.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      passou.current = false;
    },
    onPointerUp: (e: PointerEvent) => {
      const i = inicio.current;
      inicio.current = null;
      if (!i || i.id !== e.pointerId) return;
      const d = direcaoDoArraste(e.clientX - i.x, e.clientY - i.y);
      if (d) {
        passou.current = true;
        aoPassar(d);
      }
    },
    onPointerCancel: () => {
      inicio.current = null;
    },
    onClickCapture: (e: MouseEvent) => {
      if (!passou.current) return;
      passou.current = false;
      e.stopPropagation();
      e.preventDefault();
    },
  };
}

/** A área que rola mais próxima de `alvo` (dentro do palco), ou null. */
function areaQueRola(alvo: Element | null): HTMLElement | null {
  for (let el = alvo; el && el !== document.body; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue;
    const s = getComputedStyle(el);
    const rolaY = /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
    const rolaX = /(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1;
    if (rolaY || rolaX) return el;
  }
  return null;
}

/**
 * Arrastar com o mouse rola as listas do totem como o dedo rolaria. O Chrome só rola ao arrastar com o dedo;
 * num totem cuja moldura de toque se apresenta como mouse, a lista de períodos, os vídeos e o perfil ficavam
 * parados. Um arraste de mais de 8 px vira rolagem e cancela o clique que viria ao soltar.
 */
export function rolarComMouse() {
  let arr: { el: HTMLElement; x: number; y: number; sl: number; st: number; escala: number; moveu: boolean } | null = null;

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = areaQueRola(e.target as Element);
    if (!el) return;
    // o palco é escalado (Palco.tsx): converte px da tela em px do palco
    const escala = el.getBoundingClientRect().width / el.offsetWidth || 1;
    arr = { el, x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop, escala, moveu: false };
  });

  document.addEventListener('pointermove', (e) => {
    if (!arr || e.pointerType !== 'mouse') return;
    const dx = e.clientX - arr.x;
    const dy = e.clientY - arr.y;
    if (!arr.moveu && Math.hypot(dx, dy) < 8) return;
    arr.moveu = true;
    arr.el.scrollTo({ left: arr.sl - dx / arr.escala, top: arr.st - dy / arr.escala, behavior: 'instant' });
  });

  const soltar = () => {
    if (arr?.moveu) {
      const parar = (ev: Event) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener('click', parar, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', parar, { capture: true }), 0);
    }
    arr = null;
  };
  document.addEventListener('pointerup', soltar);
  document.addEventListener('pointercancel', () => {
    arr = null;
  });
}
