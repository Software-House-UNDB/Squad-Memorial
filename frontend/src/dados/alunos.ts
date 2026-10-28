/**
 * Diretório de ex-alunos (sala 5). A busca acontece no servidor, então a sala 5 precisa de rede:
 * sem servidor, a tela mantém o último resultado (também guardado no aparelho) e avisa.
 * Enquanto a busca está na tela, a lista é atualizada a cada ~10 s para novos check-ins aparecerem.
 */
import { useEffect, useRef, useState } from 'react';
import { quiosque } from '../config/quiosque';
import { fonte, parametrosAlunos } from './fonte';
import type { AlunoPerfil, FiltroAlunos, PaginaAlunos } from './tipos';

const CHAVE = 'memorial:sala5:ultimo';
const ESPERA_DIGITACAO_MS = 250;

function lerUltimo(): PaginaAlunos | null {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || 'null') as PaginaAlunos | null;
  } catch {
    return null;
  }
}

export interface EstadoBusca {
  pagina: PaginaAlunos | null;
  offline: boolean;
  /** A resposta na tela é de outro filtro (ainda chegando, ou sem rede). */
  defasada: boolean;
}

export function useAlunos(filtro: FiltroAlunos, ativo: boolean): EstadoBusca {
  const chave = parametrosAlunos(filtro);
  // `de` é o filtro da página guardada: comparar na renderização evita mostrar o resumo novo
  // ao lado de cartões antigos sem marcá-los como defasados
  const [estado, setEstado] = useState<{ pagina: PaginaAlunos | null; de: string | null; offline: boolean }>(
    () => ({ pagina: lerUltimo(), de: null, offline: false }),
  );
  const filtroRef = useRef(filtro);
  filtroRef.current = filtro;

  useEffect(() => {
    if (!ativo) return;
    let vivo = true;
    let t: number;
    const buscar = async () => {
      try {
        const p = await fonte.alunos(filtroRef.current);
        if (!vivo) return;
        setEstado({ pagina: p, de: chave, offline: false });
        try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* sem espaço */ }
      } catch {
        if (vivo) setEstado((e) => ({ ...e, offline: true }));
      }
      if (vivo) t = window.setTimeout(buscar, quiosque.atualizarBuscaMs);
    };
    // espera a digitação parar antes de perguntar ao servidor
    t = window.setTimeout(buscar, ESPERA_DIGITACAO_MS);
    return () => {
      vivo = false;
      window.clearTimeout(t);
    };
  }, [chave, ativo]);

  return { pagina: estado.pagina, offline: estado.offline, defasada: estado.de !== chave };
}

export function useAluno(id: number | string | null) {
  const [estado, setEstado] = useState<{ perfil: AlunoPerfil | null; erro: 'offline' | 'sumiu' | null }>({ perfil: null, erro: null });
  useEffect(() => {
    if (id === null) return;
    let vivo = true;
    setEstado({ perfil: null, erro: null });
    fonte
      .aluno(id)
      .then((perfil) => vivo && setEstado({ perfil, erro: null }))
      .catch((e: { status?: number }) => vivo && setEstado({ perfil: null, erro: e?.status === 404 ? 'sumiu' : 'offline' }));
    return () => {
      vivo = false;
    };
  }, [id]);
  return estado;
}
