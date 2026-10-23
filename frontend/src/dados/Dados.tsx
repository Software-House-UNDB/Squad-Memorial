/**
 * Carrega o acervo do backend e o mantém atualizado, sem nunca mudar a tela debaixo do dedo:
 * - Abre com a última cópia guardada (localStorage), então o totem funciona mesmo sem servidor.
 * - Busca /api/totem/ ao abrir e, depois, consulta /api/totem/versao/ periodicamente e sempre
 *   que o livro fecha (a capa mostra o conteúdo mais recente).
 * - Conteúdo novo só é aplicado com o livro fechado (na capa). Idem para uma versão nova do app.
 * - Miniaturas e capas são baixadas em segundo plano para o cache do service worker (offline).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { aplicarConfigServidor, quiosque } from '../config/quiosque';
import { useNavegacao } from '../navegacao/Navegacao';
import { CONFIG_PADRAO, configTotem, definirAcervo } from './acervo';
import { acervoDemo } from './acervo-demo';
import type { RespostaTotem } from './tipos';

export type Conexao = 'carregando' | 'online' | 'offline';

interface EstadoDados {
  /** Versão do acervo aplicado; null enquanto nada foi carregado. */
  versao: string | null;
  conexao: Conexao;
}

const Contexto = createContext<EstadoDados>({ versao: null, conexao: 'carregando' });
const CHAVE_CACHE = 'memorial:acervo';
const NOVA_TENTATIVA_MS = 10_000;

async function buscar<T>(caminho: string, limiteMs: number): Promise<T> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), limiteMs);
  try {
    const r = await fetch(`${quiosque.api}${caminho}`, { signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return (await r.json()) as T;
  } finally {
    window.clearTimeout(t);
  }
}

function lerCache(): RespostaTotem | null {
  try {
    const bruto = localStorage.getItem(CHAVE_CACHE);
    return bruto ? (JSON.parse(bruto) as RespostaTotem) : null;
  } catch {
    return null;
  }
}

function salvarCache(r: RespostaTotem) {
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(r));
  } catch {
    /* sem espaço: o service worker ainda guarda a resposta da API */
  }
}

/** Baixa miniaturas e capas em segundo plano, para que apareçam offline. */
async function aquecerCache(r: RespostaTotem) {
  const urls = new Set<string>();
  for (const f of r.acervo.fotos) if (f.srcMiniatura) urls.add(f.srcMiniatura);
  for (const p of r.acervo.periodos) {
    const capa = r.acervo.fotos.find((f) => f.id === p.fotoId);
    if (capa?.src) urls.add(capa.src);
  }
  const fila = [...urls];
  const trabalhador = async () => {
    while (fila.length) {
      try {
        await fetch(fila.shift()!, { mode: 'no-cors' });
      } catch {
        return; // sem rede: tenta de novo na próxima atualização
      }
    }
  };
  await Promise.all([trabalhador(), trabalhador(), trabalhador()]);
}

function aplicar(r: RespostaTotem) {
  definirAcervo(r.acervo, r.config);
  aplicarConfigServidor(r.config ?? CONFIG_PADRAO);
}

// A cópia guardada é aplicada já na carga do módulo: a capa abre sem esperar a rede.
// No modo demonstração (sem servidor) vale o acervo de exemplo embutido no app.
const DEMO = quiosque.demo;
const inicial = DEMO ? null : lerCache();
if (DEMO) definirAcervo(acervoDemo);
else if (inicial) aplicar(inicial);

export function DadosProvider({ children }: { children: ReactNode }) {
  if (DEMO) return <Contexto.Provider value={{ versao: 'demo', conexao: 'online' }}>{children}</Contexto.Provider>;
  return <DadosServidor>{children}</DadosServidor>;
}

function DadosServidor({ children }: { children: ReactNode }) {
  const { livro } = useNavegacao();
  const [versao, setVersao] = useState<string | null>(inicial?.versao ?? null);
  const [conexao, setConexao] = useState<Conexao>('carregando');
  const pendente = useRef<RespostaTotem | null>(null);
  const versaoRef = useRef(versao);
  versaoRef.current = versao;
  const livroRef = useRef(livro);
  livroRef.current = livro;

  const receber = useCallback((r: RespostaTotem) => {
    salvarCache(r);
    if (versaoRef.current === null || livroRef.current === 'fechado') {
      pendente.current = null;
      aplicar(r);
      setVersao(r.versao);
      const ocioso = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
        ?? ((cb: () => void) => window.setTimeout(cb, 2000));
      ocioso(() => void aquecerCache(r));
    } else {
      pendente.current = r; // entra quando o livro fechar
    }
  }, []);

  // Carga inicial: insiste até o servidor responder.
  useEffect(() => {
    let vivo = true;
    let t: number;
    const tentar = () =>
      buscar<RespostaTotem>('/api/totem/', 15_000)
        .then((r) => {
          if (!vivo) return;
          receber(r);
          // a resposta pode ter vindo do cache do service worker: confirma a rede
          buscar('/api/totem/versao/', 5_000)
            .then(() => vivo && setConexao('online'))
            .catch(() => vivo && setConexao('offline'));
        })
        .catch(() => {
          if (!vivo) return;
          setConexao('offline');
          t = window.setTimeout(tentar, NOVA_TENTATIVA_MS);
        });
    tentar();
    return () => {
      vivo = false;
      window.clearTimeout(t);
    };
  }, [receber]);

  const checar = useCallback(async () => {
    try {
      const { versao: v } = await buscar<{ versao: string }>('/api/totem/versao/', 5_000);
      setConexao('online');
      const conhecida = pendente.current?.versao ?? versaoRef.current;
      if (v !== conhecida) receber(await buscar<RespostaTotem>('/api/totem/', 15_000));
    } catch {
      setConexao('offline');
    }
  }, [receber]);

  // Checagem periódica de versão.
  const intervalo = Math.max(configTotem.segundosAtualizacao, 15) * 1000;
  useEffect(() => {
    const t = window.setInterval(() => void checar(), intervalo);
    return () => window.clearInterval(t);
  }, [intervalo, checar]);

  // Versão nova do app (service worker): instalada só com o livro fechado.
  const {
    needRefresh: [appNovo],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) window.setInterval(() => void reg.update(), 60 * 60 * 1000);
    },
  });

  // Com o livro fechado: aplica o conteúdo pendente (ou busca o mais recente) e a versão nova do app.
  useEffect(() => {
    if (livro !== 'fechado') return;
    if (appNovo) {
      void updateServiceWorker(true);
      return;
    }
    if (pendente.current) receber(pendente.current);
    else if (versaoRef.current !== null) void checar();
  }, [livro, appNovo, updateServiceWorker, receber, checar]);

  return <Contexto.Provider value={{ versao, conexao }}>{children}</Contexto.Provider>;
}

export function useDados(): EstadoDados {
  return useContext(Contexto);
}