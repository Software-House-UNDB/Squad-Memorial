/**
 * Retorno por inatividade, global ao app.
 * - Só corre com o livro aberto (a capa já é a proteção de tela).
 * - avisoMs sem atividade → aviso "Ainda está aí?" com contagem de contagemMs.
 * - Qualquer toque no aviso continua; ao zerar, o livro fecha e volta à capa.
 * - Pausa durante o gesto do livro para não provocar transições cruzadas.
 * - Todos os temporizadores e ouvintes são limpos ao desmontar.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { quiosque } from '../config/quiosque';
import { useNavegacao } from '../navegacao/Navegacao';
import { aoAtividade } from './atividade';

interface EstadoInatividade {
  avisoAberto: boolean;
  /** Segundos restantes na contagem (inteiro, para exibição). */
  restante: number;
  /** 0 a 1, para a ampulheta. */
  fracao: number;
  continuar: () => void;
  voltarAgora: () => void;
}

const Contexto = createContext<EstadoInatividade | null>(null);

export function InatividadeProvider({ children }: { children: ReactNode }) {
  const { livro, fecharLivro } = useNavegacao();
  const { avisoMs, contagemMs } = quiosque.inatividade;
  const [avisoAberto, setAvisoAberto] = useState(false);
  const [restanteMs, setRestanteMs] = useState(contagemMs);
  const tAviso = useRef<number | undefined>(undefined);
  const tContagem = useRef<number | undefined>(undefined);
  const fimContagem = useRef(0);
  const avisoRef = useRef(false);
  avisoRef.current = avisoAberto;

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
        fecharLivro();
      }
    }, 100);
  }, [contagemMs, fecharLivro]);

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
    fecharLivro();
  }, [fecharLivro, limpar]);

  useEffect(() => {
    if (livro !== 'aberto') {
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
  }, [livro, armar, limpar]);

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

/** Temporizador local (ex.: lightbox 45s) que reinicia a cada atividade. */
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