/**
 * Player do vídeo em tela cheia: tocar/pausar, barra de progresso (toque para ir ao ponto), tempo,
 * som (mudo e volume) e legenda WebVTT opcional. Começa a tocar ao abrir; o som inicial vem do admin.
 * Enquanto toca, o aviso de inatividade não aparece (useVideo emite atividade a cada segundo).
 */
import { useEffect, useRef, useState } from 'react';
import { duracao as relogio } from '../dados/regras';
import type { Video } from '../dados/tipos';
import { Icone } from './Icone';
import { useVideo } from './useVideo';

interface Props {
  video: Video;
  comSom: boolean;
  aoFechar: () => void;
}

const VOLUME_PADRAO = 0.8;

export function OverlayVideo({ video, comSom, aoFechar }: Props) {
  const v = useVideo(String(video.id), video.duracao ?? undefined);
  const barra = useRef<HTMLDivElement>(null);
  const barraVolume = useRef<HTMLDivElement>(null);
  const [mudo, setMudo] = useState(!comSom);
  const [volume, setVolume] = useState(VOLUME_PADRAO);
  const [legendas, setLegendas] = useState(true);

  // começa a tocar ao abrir (o toque que abriu o overlay libera o autoplay com som)
  useEffect(() => {
    const el = v.ref.current;
    if (!el) return;
    el.volume = VOLUME_PADRAO;
    el.muted = !comSom;
    void el.play().catch(() => { /* sem autoplay: o botão de tocar fica à vista */ });
  }, [video.id, comSom, v.ref]);

  useEffect(() => {
    const el = v.ref.current;
    if (!el) return;
    el.muted = mudo;
    el.volume = volume;
  }, [mudo, volume, v.ref]);

  useEffect(() => {
    const trilha = v.ref.current?.textTracks[0];
    if (trilha) trilha.mode = legendas ? 'showing' : 'hidden';
  }, [legendas, v.ref]);

  const fracao = (e: React.PointerEvent, ref: React.RefObject<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    return r ? Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) : 0;
  };
  const irPara = (e: React.PointerEvent) => {
    if (v.duracao) v.buscar(fracao(e, barra) * v.duracao);
  };
  const ajustarVolume = (e: React.PointerEvent) => {
    const f = fracao(e, barraVolume);
    setVolume(f);
    setMudo(f === 0);
  };

  const progresso = v.duracao ? Math.min(1, v.tempo / v.duracao) : 0;

  return (
    <div className="m-ov" role="dialog" aria-modal="true" aria-label={`Vídeo: ${video.titulo}`}>
      <button type="button" className="m-ov__fechar" onClick={aoFechar}>
        <Icone nome="x" tamanho={20} /> Fechar
      </button>
      <div className="m-ov__video">
        <video
          ref={v.ref}
          src={video.src ?? undefined}
          poster={video.capa ?? undefined}
          playsInline
          preload="metadata"
          crossOrigin={video.legenda ? 'anonymous' : undefined}
          onClick={v.alternar}
          {...v.eventos}
        >
          {video.legenda && <track kind="subtitles" srcLang="pt-BR" label="Português" src={video.legenda} default />}
        </video>
        {(!v.tocando || v.erro) && (
          <button type="button" className="m-ov__play-centro" onClick={v.alternar} aria-label={v.terminou ? 'Assistir de novo' : 'Tocar'} disabled={v.erro}>
            <Icone nome={v.erro ? 'x' : v.terminou ? 'refresh' : 'play'} tamanho={44} />
          </button>
        )}
        {v.erro && <p className="m-ov__erro">Não foi possível reproduzir este vídeo agora.</p>}
      </div>

      <div className="m-ov__controles">
        <button type="button" className="m-ov__btn" onClick={v.alternar} aria-label={v.tocando ? 'Pausar' : 'Tocar'} disabled={v.erro}>
          <Icone nome={v.tocando ? 'pause' : 'play'} tamanho={24} />
        </button>
        <span className="m-ov__tempo num">{relogio(v.tempo)}</span>
        <div
          ref={barra}
          className="m-ov__barra"
          role="slider"
          aria-label="Posição do vídeo"
          aria-valuemin={0}
          aria-valuemax={Math.round(v.duracao)}
          aria-valuenow={Math.round(v.tempo)}
          aria-valuetext={`${relogio(v.tempo)} de ${relogio(v.duracao)}`}
          onPointerDown={irPara}
        >
          <span style={{ width: `${progresso * 100}%` }} />
        </div>
        <span className="m-ov__tempo num">{relogio(v.duracao)}</span>
        <button type="button" className="m-ov__btn" onClick={() => setMudo((m) => !m)} aria-label={mudo ? 'Ligar o som' : 'Tirar o som'} aria-pressed={mudo}>
          <Icone nome={mudo ? 'mute' : 'volume'} tamanho={24} />
        </button>
        <div
          ref={barraVolume}
          className="m-ov__barra m-ov__barra--volume"
          role="slider"
          aria-label="Volume"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={mudo ? 0 : Math.round(volume * 100)}
          onPointerDown={ajustarVolume}
        >
          <span style={{ width: `${mudo ? 0 : volume * 100}%` }} />
        </div>
        {video.legenda && (
          <button type="button" className="m-ov__btn" onClick={() => setLegendas((l) => !l)} aria-label="Legendas" aria-pressed={legendas}>
            <Icone nome="cc" tamanho={24} />
          </button>
        )}
      </div>

      <div className="m-ov__leg">
        <small>
          {video.tipo.toUpperCase()}
          {video.duracao ? ` · ${relogio(video.duracao)}` : ''}
          {v.tocando ? ' · REPRODUZINDO' : ''}
        </small>
        <span className="serif">{video.titulo}</span>
      </div>
    </div>
  );
}
