/**
 * Navegação do memorial: uma pilha de rotas + o estado do livro (capa fechada / aberto).
 *
 * - Cada entrada da pilha guarda a "memória" da tela (década escolhida, filtro, rolagem),
 *   restaurada quando o visitante volta de um detalhe.
 * - Camadas (lightbox, painel lateral) registram um fechamento: Voltar fecha a camada antes de
 *   desempilhar a tela.
 * - O botão Voltar do Android (history.back) é interceptado: recua dentro do memorial e nunca
 *   sai da página. Mantemos sempre uma entrada-guarda no histórico.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Rota } from './rotas';

export type EstadoLivro = 'fechado' | 'abrindo' | 'aberto' | 'fechando';

interface Entrada {
  chave: number;
  rota: Rota;
  memoria: Record<string, unknown>;
}

interface Navegacao {
  livro: EstadoLivro;
  pilha: Entrada[];
  atual: Entrada | undefined;
  /** Abre o livro na capa (gesto de 480ms) e mostra o Sumário. */
  abrirLivro: () => void;
  /** Fecha o livro de volta à capa, limpando pilha, filtros, rolagens e camadas. */
  fecharLivro: () => void;
  ir: (rota: Rota) => void;
  /** Substitui a rota atual (ex.: trocar de marco pelo anterior/próximo sem empilhar). */
  trocar: (rota: Rota) => void;
  voltar: () => void;
  inicio: () => void;
  /** Lê/grava a memória da tela atual. */
  lerMemoria: <T>(chave: string) => T | undefined;
  gravarMemoria: (chave: string, valor: unknown) => void;
  /** Registra uma camada que o Voltar deve fechar primeiro. Retorna a função de remoção. */
  registrarCamada: (fechar: () => void) => () => void;
  /** Último marco aberto nesta visita (a linha do tempo volta a ele). Zera ao fechar o livro. */
  marcoVisitado: () => string | undefined;
  marcarVisitado: (id: string) => void;
}

const Contexto = createContext<Navegacao | null>(null);

export const DURACAO_LIVRO_MS = 480;

export function NavegacaoProvider({ children }: { children: ReactNode }) {
  const [livro, setLivro] = useState<EstadoLivro>('fechado');
  const [pilha, setPilha] = useState<Entrada[]>([]);
  const proximaChave = useRef(1);
  const camadas = useRef<(() => void)[]>([]);
  const visitado = useRef<string | undefined>(undefined);
  const temporizador = useRef<number | undefined>(undefined);
  const livroRef = useRef(livro);
  livroRef.current = livro;
  const pilhaRef = useRef(pilha);
  pilhaRef.current = pilha;

  const nova = (rota: Rota): Entrada => ({ chave: proximaChave.current++, rota, memoria: {} });

  const abrirLivro = useCallback(() => {
    if (livroRef.current !== 'fechado') return;
    window.clearTimeout(temporizador.current);
    setPilha([nova({ tela: 'sumario' })]);
    setLivro('abrindo');
    temporizador.current = window.setTimeout(() => setLivro('aberto'), DURACAO_LIVRO_MS);
  }, []);

  const fecharLivro = useCallback(() => {
    if (livroRef.current === 'fechado' || livroRef.current === 'fechando') return;
    window.clearTimeout(temporizador.current);
    // fecha camadas abertas sem disparar navegação
    const abertas = camadas.current.splice(0);
    abertas.reverse().forEach((f) => f());
    setLivro('fechando');
    temporizador.current = window.setTimeout(() => {
      setLivro('fechado');
      setPilha([]);
      visitado.current = undefined;
    }, DURACAO_LIVRO_MS);
  }, []);

  const ir = useCallback((rota: Rota) => {
    if (livroRef.current !== 'aberto' && livroRef.current !== 'abrindo') return;
    setPilha((p) => [...p, nova(rota)]);
  }, []);

  const trocar = useCallback((rota: Rota) => {
    setPilha((p) => (p.length ? [...p.slice(0, -1), nova(rota)] : [nova(rota)]));
  }, []);

  const voltar = useCallback(() => {
    if (livroRef.current !== 'aberto') return;
    const topo = camadas.current[camadas.current.length - 1];
    if (topo) {
      topo();
      return;
    }
    setPilha((p) => (p.length > 1 ? p.slice(0, -1) : p));
  }, []);

  const inicio = useCallback(() => {
    if (livroRef.current !== 'aberto') return;
    camadas.current.splice(0).reverse().forEach((f) => f());
    setPilha((p) => (p.length === 1 && p[0].rota.tela === 'sumario' ? p : [nova({ tela: 'sumario' })]));
  }, []);

  const lerMemoria = useCallback(<T,>(chave: string) => {
    const p = pilhaRef.current;
    return p[p.length - 1]?.memoria[chave] as T | undefined;
  }, []);

  const gravarMemoria = useCallback((chave: string, valor: unknown) => {
    const p = pilhaRef.current;
    const topo = p[p.length - 1];
    if (topo) topo.memoria[chave] = valor; // mutação intencional: memória não dispara renderização
  }, []);

  const registrarCamada = useCallback((fechar: () => void) => {
    camadas.current.push(fechar);
    return () => {
      const i = camadas.current.lastIndexOf(fechar);
      if (i >= 0) camadas.current.splice(i, 1);
    };
  }, []);

  const marcoVisitado = useCallback(() => visitado.current, []);
  const marcarVisitado = useCallback((id: string) => { visitado.current = id; }, []);

  // Botão Voltar do Android / navegador: nunca sai do memorial.
  useEffect(() => {
    const guarda = { memorial: true };
    history.replaceState({ memorial: 'base' }, '');
    history.pushState(guarda, '');
    const aoVoltar = () => {
      history.pushState(guarda, '');
      voltar();
    };
    window.addEventListener('popstate', aoVoltar);
    return () => window.removeEventListener('popstate', aoVoltar);
  }, [voltar]);

  useEffect(() => () => window.clearTimeout(temporizador.current), []);

  const valor = useMemo<Navegacao>(
    () => ({ livro, pilha, atual: pilha[pilha.length - 1], abrirLivro, fecharLivro, ir, trocar, voltar, inicio, lerMemoria, gravarMemoria, registrarCamada, marcoVisitado, marcarVisitado }),
    [livro, pilha, abrirLivro, fecharLivro, ir, trocar, voltar, inicio, lerMemoria, gravarMemoria, registrarCamada, marcoVisitado, marcarVisitado],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useNavegacao(): Navegacao {
  const c = useContext(Contexto);
  if (!c) throw new Error('useNavegacao fora do NavegacaoProvider');
  return c;
}

/**
 * Estado de tela que sobrevive à ida a um detalhe e à volta.
 * Ex.: const [periodoId, setPeriodoId] = useMemoriaTela('periodo', 'p-1990');
 */
export function useMemoriaTela<T>(chave: string, inicial: T | (() => T)): [T, (v: T) => void] {
  const { lerMemoria, gravarMemoria } = useNavegacao();
  const [valor, setValor] = useState<T>(() => {
    const salvo = lerMemoria<T>(chave);
    if (salvo !== undefined) return salvo;
    return typeof inicial === 'function' ? (inicial as () => T)() : inicial;
  });
  const definir = useCallback(
    (v: T) => {
      setValor(v);
      gravarMemoria(chave, v);
    },
    [chave, gravarMemoria],
  );
  useEffect(() => {
    gravarMemoria(chave, valor);
    // grava o valor inicial uma vez
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [valor, definir];
}

/** Restaura e memoriza a rolagem de um contêiner interno. */
export function useRolagemMemorizada(ref: React.RefObject<HTMLElement | null>, chave: string, deps: unknown[] = []) {
  const { lerMemoria, gravarMemoria } = useNavegacao();
  useEffect(() => {
    // no palco fluido quem rola é o corpo da tela inteira, não a lista
    const el = document.documentElement.classList.contains('fluido')
      ? ref.current?.closest<HTMLElement>('.tela-corpo') ?? ref.current
      : ref.current;
    if (!el) return;
    const salvo = lerMemoria<number>(`rolagem:${chave}`);
    el.scrollTop = salvo ?? 0;
    const aoRolar = () => gravarMemoria(`rolagem:${chave}`, el.scrollTop);
    el.addEventListener('scroll', aoRolar, { passive: true });
    return () => el.removeEventListener('scroll', aoRolar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, ...deps]);
}

/** Camada que o Voltar deve fechar antes de sair da tela (lightbox, painel). */
export function useCamada(aberta: boolean, fechar: () => void) {
  const { registrarCamada } = useNavegacao();
  const fecharRef = useRef(fechar);
  fecharRef.current = fechar;
  useEffect(() => {
    if (!aberta) return;
    return registrarCamada(() => fecharRef.current());
  }, [aberta, registrarCamada]);
}