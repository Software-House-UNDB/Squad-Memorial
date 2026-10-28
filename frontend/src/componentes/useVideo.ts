/**
 * Estado do vídeo aberto no lightbox.
 * Enquanto o vídeo toca, emite "atividade" a cada segundo: o aviso de inatividade e o fechamento
 * automático do lightbox esperam o vídeo terminar (DESIGN.md: o vídeo volta 30s depois de terminar,
 * aqui o lightbox fecha pelo seu próprio tempo, contado a partir do fim).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { registrarAtividade } from '../quiosque/atividade';

export function useVideo(chave: string | undefined, duracaoConhecida?: number) {
  const ref = useRef<HTMLVideoElement>(null);
  const [tocando, setTocando] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [duracao, setDuracao] = useState(duracaoConhecida ?? 0);
  const [terminou, setTerminou] = useState(false);
  const [erro, setErro] = useState(false);

  // novo vídeo: zera o estado
  useEffect(() => {
    setTocando(false);
    setTempo(0);
    setDuracao(duracaoConhecida ?? 0);
    setTerminou(false);
    setErro(false);
  }, [chave, duracaoConhecida]);

  useEffect(() => {
    if (!tocando) return;
    const t = window.setInterval(registrarAtividade, 1_000);
    return () => window.clearInterval(t);
  }, [tocando]);

  const alternar = useCallback(() => {
    const v = ref.current;
    if (!v || erro) return;
    if (v.ended) {
      v.currentTime = 0;
      setTerminou(false);
    }
    if (v.paused) void v.play().catch(() => setErro(true));
    else v.pause();
  }, [erro]);

  const buscar = useCallback((segundos: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = segundos;
    setTempo(segundos);
    setTerminou(false);
  }, []);

  const eventos = {
    onPlay: () => setTocando(true),
    onPause: () => setTocando(false),
    onEnded: () => {
      setTocando(false);
      setTerminou(true);
    },
    onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => setTempo(e.currentTarget.currentTime),
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLVideoElement>) => {
      if (Number.isFinite(e.currentTarget.duration)) setDuracao(e.currentTarget.duration);
    },
    onError: () => setErro(true),
  };

  return { ref, tocando, tempo, duracao, terminou, erro, alternar, buscar, eventos };
}

export function relogio(segundos: number) {
  const s = Math.max(0, Math.floor(segundos || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}