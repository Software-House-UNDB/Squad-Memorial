import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";
import { buscarTotem, buscarVersao, type TotemData } from "../lib/api";

type Status = "carregando" | "online" | "offline";

interface TotemCtx {
  data: TotemData | null;
  status: Status;
  /** Há conteúdo novo baixado esperando o totem ficar ocioso para ser aplicado. */
  temAtualizacao: boolean;
  aplicarAtualizacao: () => void;
}

const Ctx = createContext<TotemCtx | null>(null);
const CHAVE_CACHE = "memorial:totem";

function lerCache(): TotemData | null {
  try {
    const bruto = localStorage.getItem(CHAVE_CACHE);
    return bruto ? (JSON.parse(bruto) as TotemData) : null;
  } catch {
    return null;
  }
}

function salvarCache(d: TotemData) {
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(d));
  } catch {
    /* sem espaço: o service worker ainda tem a resposta da API */
  }
}

/** Baixa miniaturas e capas em segundo plano para que funcionem offline. */
async function aquecerCache(d: TotemData) {
  const urls = new Set<string>();
  for (const p of d.periodos) for (const f of p.fotos) if (f.miniatura) urls.add(f.miniatura);
  for (const v of d.videos) if (v.capa) urls.add(v.capa);
  const fila = [...urls];
  const trabalhador = async () => {
    while (fila.length) {
      const url = fila.shift()!;
      try {
        await fetch(url, { mode: "no-cors" });
      } catch {
        return; // sem rede: tenta de novo na próxima atualização
      }
    }
  };
  await Promise.all([trabalhador(), trabalhador(), trabalhador()]);
}

export function TotemProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<TotemData | null>(lerCache);
  const [status, setStatus] = useState<Status>("carregando");
  const [pendente, setPendente] = useState<TotemData | null>(null);
  const versaoAtual = useRef<string | null>(data?.versao ?? null);

  const aplicar = useCallback((d: TotemData) => {
    versaoAtual.current = d.versao;
    setData(d);
    salvarCache(d);
    const ocioso = (window as Window & { requestIdleCallback?: (cb: () => void) => void })
      .requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000));
    ocioso(() => void aquecerCache(d));
  }, []);

  // Carga inicial: insiste a cada 10 s até o servidor responder
  useEffect(() => {
    let vivo = true;
    let timer: ReturnType<typeof setTimeout>;
    const tentar = () =>
      buscarTotem()
        .then((d) => {
          if (!vivo) return;
          aplicar(d);
          // a resposta pode ter vindo do cache do service worker: confirma a rede
          buscarVersao()
            .then(() => vivo && setStatus("online"))
            .catch(() => vivo && setStatus("offline"));
        })
        .catch(() => {
          if (!vivo) return;
          setStatus("offline");
          timer = setTimeout(tentar, 10000);
        });
    tentar();
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, [aplicar]);

  // Checagem periódica de versão
  const intervalo = (data?.config.segundos_atualizacao ?? 300) * 1000;
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const { versao } = await buscarVersao();
        setStatus("online");
        if (versao === versaoAtual.current) return;
        const novo = await buscarTotem();
        if (versaoAtual.current === null) aplicar(novo);
        else setPendente(novo);
      } catch {
        setStatus("offline");
      }
    }, Math.max(intervalo, 15000));
    return () => clearInterval(id);
  }, [intervalo, aplicar]);

  const aplicarAtualizacao = useCallback(() => {
    setPendente((p) => {
      if (p) aplicar(p);
      return null;
    });
  }, [aplicar]);

  return (
    <Ctx.Provider value={{ data, status, temAtualizacao: !!pendente, aplicarAtualizacao }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTotem() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTotem fora do TotemProvider");
  return c;
}
