import { Pause, Play, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSuspenderInatividade } from "../hooks/useKiosk";
import type { Video } from "../lib/api";
import { duracao } from "../lib/format";

export function PlayerVideo({ video, aoFechar }: { video: Video; aoFechar: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [tocando, setTocando] = useState(false);
  const [tempo, setTempo] = useState(0);
  const [total, setTotal] = useState(video.duracao_segundos ?? 0);
  const [terminou, setTerminou] = useState(false);
  const [erro, setErro] = useState(false);
  const [controles, setControles] = useState(true);
  const esconder = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Enquanto o vídeo toca, o totem não volta sozinho para o início
  useSuspenderInatividade("video", tocando);

  const mostrarControles = () => {
    setControles(true);
    clearTimeout(esconder.current);
    esconder.current = setTimeout(() => setControles(false), 3500);
  };

  useEffect(() => {
    mostrarControles();
    return () => clearTimeout(esconder.current);
  }, []);

  const alternar = () => {
    const v = ref.current;
    if (!v) return;
    if (terminou) {
      v.currentTime = 0;
      setTerminou(false);
    }
    if (v.paused) void v.play().catch(() => setErro(true));
    else v.pause();
    mostrarControles();
  };

  const buscar = (valor: number) => {
    if (ref.current) ref.current.currentTime = valor;
    setTempo(valor);
    mostrarControles();
  };

  return (
    <div
      className={`player ${controles || !tocando ? "is-controles" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={video.titulo}
      onPointerDown={mostrarControles}
    >
      <video
        ref={ref}
        className="player__video"
        src={video.url}
        poster={video.capa ?? undefined}
        autoPlay
        playsInline
        preload="auto"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEnded={() => {
          setTocando(false);
          setTerminou(true);
        }}
        onTimeUpdate={(e) => setTempo(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setTotal(e.currentTarget.duration)}
        onError={() => setErro(true)}
        onClick={alternar}
      />

      <div className="player__topo">
        <div>
          <h2 className="player__titulo">{video.titulo}</h2>
          {video.descricao && <p className="player__desc">{video.descricao}</p>}
        </div>
        <button className="botao-redondo" onClick={aoFechar} aria-label="Fechar vídeo">
          <X size={34} aria-hidden />
        </button>
      </div>

      {erro ? (
        <div className="player__centro player__erro">
          <p>Não foi possível reproduzir este vídeo agora.</p>
          <button className="botao" onClick={aoFechar}>Voltar aos vídeos</button>
        </div>
      ) : (
        (!tocando || terminou) && (
          <button className="player__centro player__grande" onClick={alternar}
            aria-label={terminou ? "Assistir novamente" : "Reproduzir"}>
            {terminou ? <RotateCcw size={56} aria-hidden /> : <Play size={60} fill="currentColor" aria-hidden />}
          </button>
        )
      )}

      <div className="player__barra">
        <button className="player__botao" onClick={alternar} aria-label={tocando ? "Pausar" : "Reproduzir"}>
          {tocando ? <Pause size={32} fill="currentColor" aria-hidden /> : <Play size={32} fill="currentColor" aria-hidden />}
        </button>
        <span className="player__tempo">{duracao(tempo)}</span>
        <input
          className="player__progresso"
          type="range"
          min={0}
          max={total || 0}
          step={0.1}
          value={tempo}
          onChange={(e) => buscar(Number(e.target.value))}
          style={{ ["--p" as string]: total ? `${(tempo / total) * 100}%` : "0%" }}
          aria-label="Posição do vídeo"
        />
        <span className="player__tempo">{duracao(total)}</span>
      </div>
    </div>
  );
}
