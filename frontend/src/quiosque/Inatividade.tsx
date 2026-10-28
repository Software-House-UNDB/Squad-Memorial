/**
 * Retorno por inatividade, global ao totem.
 * - Só corre fora do estado inicial da sala (no início não há nada para desfazer).
 * - avisoMs sem atividade → aviso "Ainda está aí?" com contagem de contagemMs.
 * - Qualquer toque no aviso continua; ao zerar, o totem volta ao estado inicial da sala
 *   (aba História, primeiro destaque, overlays fechados, busca e perfil limpos).
 * - Vídeo tocando emite atividade a cada segundo (useVideo), então o aviso não aparece.
 * - Todos os temporizadores e ouvintes são limpos ao desmontar.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { quiosque } from '../config/quiosque';
import { aoAtividade } from './atividade';

interface EstadoInatividade {
  avisoAberto: boolean;
  /** Segundos restantes na contagem (inteiro, para exibição). */
  restante: number;
  /** 0 a 1, para a barra. */
  fracao: number;
  continuar: () => void;
  voltarAgora: () => void;
}

const Contexto = createContext<EstadoInatividade | null>(null);

interface Props {
  /** false no estado inicial da sala. */
  ativo: boolean;
  /** Volta ao estado inicial da sala. */
  aoEsgotar: () => void;
  children: ReactNode;
}

export function InatividadeProvider({ ativo, aoEsgotar, children }: Props) {
  const { avisoMs, contagemMs } = quiosque.inatividade;
  const [avisoAberto, setAvisoAberto] = useState(false);
  const [restanteMs, setRestanteMs] = useState(contagemMs);
  const tAviso = useRef<number | undefined>(undefined);
  const tContagem = useRef<number | undefined>(undefined);
  const fimContagem = useRef(0);
  const avisoRef = useRef(false);
  avisoRef.current = avisoAberto;
  const esgotar = useRef(aoEsgotar);
  esgotar.current = aoEsgotar;

  const limpar = useCallback(() => {
    window.clearTimeout(tAviso.current);
    window.clearInterval(tContagem.current);
  }, []);

  const abrirAviso = useCallback(() => {
    setAvisoAberto(true);
    fimContagem.current = performance.now() + contagemMs;
    setRestanteMs(contagemMs);
    window.clearInterval(tContagem.current);
    tContagem.current = window.setInterval(() => {
      const r = Math.max(0, fimContagem.current - performance.now());
      setRestanteMs(r);
      if (r <= 0) {
        window.clearInterval(tContagem.current);
        setAvisoAberto(false);
        esgotar.current();
      }
    }, 100);
  }, [contagemMs]);

  const armar = useCallback(() => {
    window.clearTimeout(tAviso.current);
    tAviso.current = window.setTimeout(abrirAviso, avisoMs);
  }, [abrirAviso, avisoMs]);

  const continuar = useCallback(() => {
    window.clearInterval(tContagem.current);
    setAvisoAberto(false);
    armar();
  }, [armar]);

  const voltarAgora = useCallback(() => {
    limpar();
    setAvisoAberto(false);
    esgotar.current();
  }, [limpar]);

  useEffect(() => {
    if (!ativo) {
      limpar();
      setAvisoAberto(false);
      return;
    }
    armar();
    // Durante o aviso, um toque é tratado pelo próprio aviso (continuar), não aqui.
    const desligar = aoAtividade(() => {
      if (!avisoRef.current) armar();
    });
    return () => {
      desligar();
      limpar();
    };
  }, [ativo, armar, limpar]);

  const valor: EstadoInatividade = {
    avisoAberto,
    restante: Math.ceil(restanteMs / 1000),
    fracao: contagemMs > 0 ? restanteMs / contagemMs : 0,
    continuar,
    voltarAgora,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useInatividade(): EstadoInatividade {
  const c = useContext(Contexto);
  if (!c) throw new Error('useInatividade fora do InatividadeProvider');
  return c;
}

/** Temporizador local (ex.: foto ampliada fecha em 45 s) que reinicia a cada atividade. */
export function useTemporizadorLocal(ativo: boolean, ms: number, aoEsgotar: () => void) {
  const fn = useRef(aoEsgotar);
  fn.current = aoEsgotar;
  useEffect(() => {
    if (!ativo) return;
    let t = window.setTimeout(() => fn.current(), ms);
    const desligar = aoAtividade(() => {
      window.clearTimeout(t);
      t = window.setTimeout(() => fn.current(), ms);
    });
    return () => {
      desligar();
      window.clearTimeout(t);
    };
  }, [ativo, ms]);
}
