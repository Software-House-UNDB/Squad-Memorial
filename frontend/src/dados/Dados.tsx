/**
 * Dados da sala deste totem, sem nunca mudar a tela debaixo do dedo:
 * - Abre com a última cópia guardada (localStorage), então as salas 1 a 4 funcionam sem servidor.
 * - Busca /api/memorial/sala/N/ ao abrir e depois consulta /versao/?sala=N periodicamente.
 * - Conteúdo novo só é aplicado quando o totem volta ao estado inicial da sala, ou depois de 30 s
 *   sem toque. Idem para uma versão nova do app (service worker) e para a recarga diária.
 * - Miniaturas e capas são baixadas em segundo plano para o cache do service worker (offline).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { aplicarConfigServidor, quiosque } from '../config/quiosque';
import { ultimaAtividade } from '../quiosque/atividade';
import { criarVerificadorDeRecarga } from '../quiosque/guardas';
import { fonte } from './fonte';
import type { RespostaSala } from './tipos';

export type Conexao = 'carregando' | 'online' | 'offline';

interface EstadoDados {
  /** Dados aplicados; null enquanto nada foi carregado. */
  dados: RespostaSala | null;
  conexao: Conexao;
  /** O totem avisa quando está no estado inicial da sala (ponto seguro para trocar o conteúdo). */
  informarInicio: (emInicio: boolean) => void;
}

const Contexto = createContext<EstadoDados | null>(null);
const NOVA_TENTATIVA_MS = 10_000;
const chaveCache = (n: number) => `memorial:sala:${n}`;

function lerCache(n: number): RespostaSala | null {
  try {
    const bruto = localStorage.getItem(chaveCache(n));
    return bruto ? (JSON.parse(bruto) as RespostaSala) : null;
  } catch {
    return null;
  }
}

function salvarCache(n: number, r: RespostaSala) {
  try {
    localStorage.setItem(chaveCache(n), JSON.stringify(r));
  } catch {
    /* sem espaço: o service worker ainda guarda a resposta da API */
  }
}

/** Baixa miniaturas e capas em segundo plano, para que apareçam offline. */
async function aquecerCache(r: RespostaSala) {
  const urls = new Set<string>();
  for (const f of r.fotos) if (f.miniatura) urls.add(f.miniatura);
  for (const v of r.videos) if (v.capa) urls.add(v.capa);
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

const ocioso = (cb: () => void) =>
  ((window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback
    ?? ((f: () => void) => window.setTimeout(f, 2000)))(cb);

export function DadosProvider({ sala, children }: { sala: number; children: ReactNode }) {
  const [dados, setDados] = useState<RespostaSala | null>(() => {
    const c = quiosque.demo ? null : lerCache(sala);
    if (c) aplicarConfigServidor(c.config);
    return c;
  });
  const [conexao, setConexao] = useState<Conexao>('carregando');
  const pendente = useRef<RespostaSala | null>(null);
  const atual = useRef(dados);
  atual.current = dados;
  const emInicio = useRef(true);

  const aplicar = useCallback((r: RespostaSala) => {
    pendente.current = null;
    aplicarConfigServidor(r.config);
    setDados(r);
    if (!quiosque.demo) ocioso(() => void aquecerCache(r));
  }, []);

  /** Ponto seguro: no início da sala, ou ninguém tocou há 30 s. */
  const podeTrocar = useCallback(
    () => emInicio.current || performance.now() - ultimaAtividade() >= quiosque.aplicarConteudoAposMs,
    [],
  );

  const receber = useCallback((r: RespostaSala) => {
    if (!quiosque.demo) salvarCache(sala, r);
    if (atual.current === null || podeTrocar()) aplicar(r);
    else if (r.versao !== atual.current.versao) pendente.current = r;
  }, [sala, aplicar, podeTrocar]);

  // Carga inicial: insiste até o servidor responder.
  useEffect(() => {
    let vivo = true;
    let t: number;
    const tentar = () =>
      fonte.sala(sala)
        .then((r) => {
          if (!vivo) return;
          receber(r);
          // a resposta pode ter vindo do cache do service worker: confirma a rede
          fonte.versao(sala)
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
  }, [sala, receber]);

  const checar = useCallback(async () => {
    if (quiosque.demo) return;
    try {
      const v = await fonte.versao(sala);
      setConexao('online');
      const conhecida = pendente.current?.versao ?? atual.current?.versao;
      if (v !== conhecida) receber(await fonte.sala(sala));
    } catch {
      setConexao('offline');
    }
  }, [sala, receber]);

  // Checagem periódica de versão.
  const intervalo = Math.max(dados?.config.segundosAtualizacao ?? 300, 15) * 1000;
  useEffect(() => {
    const t = window.setInterval(() => void checar(), intervalo);
    return () => window.clearInterval(t);
  }, [intervalo, checar]);

  // Versão nova do app (service worker): instalada só num ponto seguro.
  const {
    needRefresh: [appNovo],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) window.setInterval(() => void reg.update(), 60 * 60 * 1000);
    },
  });

  // A cada 5 s: aplica o conteúdo pendente, a versão nova do app ou a recarga diária, se puder.
  const recarregarHoje = useRef(criarVerificadorDeRecarga());
  useEffect(() => {
    const t = window.setInterval(() => {
      if (!podeTrocar()) return;
      if (appNovo) void updateServiceWorker(true);
      else if (pendente.current) aplicar(pendente.current);
      else if (emInicio.current && recarregarHoje.current()) location.reload();
    }, 5_000);
    return () => window.clearInterval(t);
  }, [appNovo, updateServiceWorker, aplicar, podeTrocar]);

  const informarInicio = useCallback((v: boolean) => {
    const voltou = v && !emInicio.current;
    emInicio.current = v;
    if (voltou && pendente.current) aplicar(pendente.current);
    if (voltou) void checar();
  }, [aplicar, checar]);

  return <Contexto.Provider value={{ dados, conexao, informarInicio }}>{children}</Contexto.Provider>;
}

export function useDados(): EstadoDados {
  const c = useContext(Contexto);
  if (!c) throw new Error('useDados fora do DadosProvider');
  return c;
}
