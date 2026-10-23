/** Trilho de rolagem dourado (DESIGN.md: "mostra quanto falta"). Só aparece se houver o que rolar. */
import { useEffect, useState, type RefObject } from 'react';

export function TrilhoRolagem({ alvo }: { alvo: RefObject<HTMLElement | null> }) {
  const [m, setM] = useState({ visivel: false, topo: 0, altura: 0 });

  useEffect(() => {
    const el = alvo.current;
    if (!el) return;
    const medir = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const visivel = scrollHeight > clientHeight + 4;
      const altura = visivel ? Math.max(.12, clientHeight / scrollHeight) : 0;
      const topo = visivel ? (scrollTop / (scrollHeight - clientHeight)) * (1 - altura) : 0;
      setM({ visivel, topo, altura });
    };
    medir();
    el.addEventListener('scroll', medir, { passive: true });
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => { el.removeEventListener('scroll', medir); ro.disconnect(); };
  }, [alvo]);

  if (!m.visivel) return null;
  return (
    <span className="m-trilho-rolagem" aria-hidden="true">
      <i style={{ top: `${m.topo * 100}%`, height: `${m.altura * 100}%` }} />
    </span>
  );
}