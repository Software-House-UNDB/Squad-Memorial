import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";

interface KioskCtx {
  /** Pausa o contador de inatividade (ex.: enquanto um vídeo toca). */
  suspender: (motivo: string, ativo: boolean) => void;
}

const Ctx = createContext<KioskCtx>({ suspender: () => {} });

const EVENTOS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

/**
 * Chama `aoFicarOcioso` depois de `segundos` sem nenhum toque.
 * Enquanto algum componente pedir suspensão, o tempo não corre.
 */
export function KioskProvider({
  segundos, aoFicarOcioso, children,
}: { segundos: number; aoFicarOcioso: () => void; children: ReactNode }) {
  const [suspensoes, setSuspensoes] = useState<Set<string>>(new Set());
  const callback = useRef(aoFicarOcioso);
  callback.current = aoFicarOcioso;

  const suspender = useCallback((motivo: string, ativo: boolean) => {
    setSuspensoes((s) => {
      const n = new Set(s);
      if (ativo) n.add(motivo);
      else n.delete(motivo);
      return n;
    });
  }, []);

  const suspenso = suspensoes.size > 0;

  useEffect(() => {
    if (suspenso) return;
    let timer = setTimeout(() => callback.current(), segundos * 1000);
    let ultimo = 0;
    const reiniciar = () => {
      const agora = Date.now();
      if (agora - ultimo < 500) return; // pointermove dispara muito
      ultimo = agora;
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), segundos * 1000);
    };
    EVENTOS.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
    return () => {
      clearTimeout(timer);
      EVENTOS.forEach((e) => window.removeEventListener(e, reiniciar));
    };
  }, [segundos, suspenso]);

  return <Ctx.Provider value={{ suspender }}>{children}</Ctx.Provider>;
}

export function useSuspenderInatividade(motivo: string, ativo: boolean) {
  const { suspender } = useContext(Ctx);
  useEffect(() => {
    suspender(motivo, ativo);
    return () => suspender(motivo, false);
  }, [motivo, ativo, suspender]);
}

/** Bloqueios de quiosque: menu de contexto, arrastar imagens, zoom por gesto. */
export function useBloqueiosQuiosque() {
  useEffect(() => {
    const bloquear = (e: Event) => e.preventDefault();
    const gesto = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };
    document.addEventListener("contextmenu", bloquear);
    document.addEventListener("dragstart", bloquear);
    document.addEventListener("gesturestart", bloquear);
    document.addEventListener("touchmove", gesto, { passive: false });
    return () => {
      document.removeEventListener("contextmenu", bloquear);
      document.removeEventListener("dragstart", bloquear);
      document.removeEventListener("gesturestart", bloquear);
      document.removeEventListener("touchmove", gesto);
    };
  }, []);
}
