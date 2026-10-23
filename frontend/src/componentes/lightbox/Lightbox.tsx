/**
 * Visualizador ampliado (sala escura).
 * - Fechar no alto à direita; Anterior/Próxima no meio das laterais; tira de miniaturas embaixo.
 * - Duplo toque aproxima 2× no ponto tocado (e volta); com zoom, um dedo arrasta.
 * - Pinça funciona, mas nunca é necessária. Deslizar para o lado troca a foto; para baixo, fecha.
 * - 45s sem toque fecham o lightbox (config). Voltar do Android fecha antes de sair da tela.
 * - Vídeos: um toque reproduz/pausa; controles grandes ficam fora da área de gesto. Sem zoom.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { quiosque } from '../../config/quiosque';
import type { Foto } from '../../dados/tipos';
import { useCamada } from '../../navegacao/Navegacao';
import { useTemporizadorLocal } from '../../quiosque/Inatividade';
import { useEscala } from '../../quiosque/Palco';
import { BotaoRedondo } from '../botoes/Botao';
import { Placa } from '../acervo/Placa';
import { Icone } from '../../icones/Icone';
import { relogio, useVideo } from './useVideo';
import './lightbox.css';

interface Props {
  fotos: Foto[];
  indice: number;
  aoMudar: (i: number) => void;
  aoFechar: () => void;
  /** Ex.: "1998" ou "Os anos de expansão". */
  contexto?: string;
}

const ZOOM_DUPLO = 2;
const ZOOM_MAX = 3;

export function Lightbox({ fotos, indice, aoMudar, aoFechar, contexto }: Props) {
  const escala = useEscala();
  const foto = fotos[indice];
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [arrastando, setArrastando] = useState(false);
  const palcoRef = useRef<HTMLDivElement>(null);
  const tiraRef = useRef<HTMLDivElement>(null);
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef({ x0: 0, y0: 0, t0: 0, movido: false, dist0: 0, zoom0: 1, pan0: { x: 0, y: 0 } });
  const ultimoToque = useRef({ t: 0, x: 0, y: 0 });

  const video = useVideo(foto?.video ? foto.id : undefined, foto?.video?.duracao);
  const barraRef = useRef<HTMLDivElement>(null);

  useCamada(true, aoFechar);
  useTemporizadorLocal(true, quiosque.inatividade.lightboxMs, aoFechar);

  // zera o zoom ao trocar de foto
  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [indice]);

  // mantém a miniatura atual visível
  useEffect(() => {
    const el = tiraRef.current?.querySelector<HTMLElement>('.is-sel');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [indice]);

  const limitar = useCallback((p: { x: number; y: number }, z: number) => {
    const el = palcoRef.current?.querySelector<HTMLElement>('.lb-imagem');
    if (!el || z <= 1) return { x: 0, y: 0 };
    const w = el.offsetWidth, h = el.offsetHeight;
    const mx = ((z - 1) * w) / 2, my = ((z - 1) * h) / 2;
    return { x: Math.max(-mx, Math.min(mx, p.x)), y: Math.max(-my, Math.min(my, p.y)) };
  }, []);

  const anterior = () => indice > 0 && aoMudar(indice - 1);
  const proxima = () => indice < fotos.length - 1 && aoMudar(indice + 1);

  /** Converte coordenadas da tela para o palco (que está escalado). */
  const noPalco = (cx: number, cy: number) => {
    const r = palcoRef.current!.getBoundingClientRect();
    return { x: (cx - r.left - r.width / 2) / escala, y: (cy - r.top - r.height / 2) / escala };
  };

  const aoPressionar = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;
    setArrastando(true);
    if (ponteiros.current.size === 1) {
      Object.assign(g, { x0: e.clientX, y0: e.clientY, t0: performance.now(), movido: false, pan0: pan });
    } else if (ponteiros.current.size === 2) {
      const [a, b] = [...ponteiros.current.values()];
      Object.assign(g, { dist0: Math.hypot(a.x - b.x, a.y - b.y), zoom0: zoom, movido: true });
    }
  };

  const aoMover = (e: React.PointerEvent) => {
    if (!ponteiros.current.has(e.pointerId)) return;
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;
    if (ponteiros.current.size === 2 && !foto?.video) {
      const [a, b] = [...ponteiros.current.values()];
      const z = Math.max(1, Math.min(ZOOM_MAX, (g.zoom0 * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(g.dist0, 1)));
      setZoom(z);
      setPan((p) => limitar(p, z));
      return;
    }
    const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
    if (Math.hypot(dx, dy) > 10) g.movido = true;
    if (zoom > 1) setPan(limitar({ x: g.pan0.x + dx / escala, y: g.pan0.y + dy / escala }, zoom));
  };

  const aoSoltar = (e: React.PointerEvent) => {
    const g = gesto.current;
    ponteiros.current.delete(e.pointerId);
    if (ponteiros.current.size > 0) return;
    setArrastando(false);
    const dx = (e.clientX - g.x0) / escala, dy = (e.clientY - g.y0) / escala;
    const agora = performance.now();

    if (!g.movido && agora - g.t0 < 300 && foto?.video) {
      video.alternar();
      return;
    }
    if (!g.movido && agora - g.t0 < 300) {
      const u = ultimoToque.current;
      if (agora - u.t < 320 && Math.hypot(e.clientX - u.x, e.clientY - u.y) < 40) {
        // duplo toque
        if (zoom > 1) { setZoom(1); setPan({ x: 0, y: 0 }); }
        else {
          const p = noPalco(e.clientX, e.clientY);
          setZoom(ZOOM_DUPLO);
          setPan(limitar({ x: -p.x * (ZOOM_DUPLO - 1), y: -p.y * (ZOOM_DUPLO - 1) }, ZOOM_DUPLO));
        }
        ultimoToque.current = { t: 0, x: 0, y: 0 };
      } else {
        ultimoToque.current = { t: agora, x: e.clientX, y: e.clientY };
      }
      return;
    }
    if (zoom === 1 && g.movido) {
      if (Math.abs(dx) > 90 && Math.abs(dx) > Math.abs(dy)) (dx < 0 ? proxima : anterior)();
      else if (dy > 120 && Math.abs(dy) > Math.abs(dx)) aoFechar();
    }
  };

  if (!foto) return null;
  const primeira = indice === 0, ultima = indice === fotos.length - 1;
  const nVideos = fotos.filter((f) => f.video).length;
  const unidade = nVideos === fotos.length
    ? (fotos.length === 1 ? 'vídeo' : 'vídeos')
    : nVideos > 0 ? 'itens' : (fotos.length === 1 ? 'foto' : 'fotos');

  /** Toque na barra de progresso: vai para o ponto tocado. */
  const buscarNaBarra = (e: React.PointerEvent) => {
    const r = barraRef.current?.getBoundingClientRect();
    if (!r || !video.duracao) return;
    const fr = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    video.buscar(fr * video.duracao);
  };

  return (
    <div className={['m-lightbox', foto.video && 'm-lightbox--video'].filter(Boolean).join(' ')} role="dialog" aria-modal="true" aria-label={foto.video ? 'Vídeo' : 'Fotografia ampliada'}>
      <p className="lb-contador"><b className="num">{indice + 1}</b> de {fotos.length} {unidade}{contexto ? ` · ${contexto}` : ''}</p>
      <BotaoRedondo variante="escuro" icone="fechar" rotulo="Fechar" className="lb-fechar" onClick={aoFechar} />

      <div
        ref={palcoRef}
        className="lb-palco"
        data-zoom
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
      >
        {foto.video ? (
          <div className="lb-imagem lb-imagem--video" key={foto.id}>
            <video
              ref={video.ref}
              src={foto.video.src}
              poster={foto.src}
              playsInline
              preload="metadata"
              aria-label={foto.alt}
              {...video.eventos}
            />
            {(!video.tocando || video.erro) && (
              <span className="lb-video-centro" aria-hidden="true">
                {video.erro ? <Icone nome="alerta" /> : <Icone nome={video.terminou ? 'recarregar' : 'reproduzir'} />}
              </span>
            )}
          </div>
        ) : (
          <div className="lb-imagem" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: arrastando ? 'none' : undefined }} key={foto.id}>
            <Placa foto={foto} ajuste="contain" etiqueta="Foto do acervo · demonstrativa" />
          </div>
        )}
      </div>

      {foto.video && (
        <div className="lb-video-controles">
          {video.erro ? (
            <p className="lb-video-erro">Não foi possível reproduzir este vídeo agora.</p>
          ) : (
            <>
              <BotaoRedondo
                variante="escuro"
                icone={video.tocando ? 'pausar' : video.terminou ? 'recarregar' : 'reproduzir'}
                rotulo={video.tocando ? 'Pausar' : video.terminou ? 'De novo' : 'Assistir'}
                onClick={video.alternar}
              />
              <span className="lb-video-tempo num">{relogio(video.tempo)}</span>
              <div
                ref={barraRef}
                className="lb-video-barra"
                role="slider"
                aria-label="Posição do vídeo"
                aria-valuemin={0}
                aria-valuemax={Math.round(video.duracao)}
                aria-valuenow={Math.round(video.tempo)}
                onPointerDown={buscarNaBarra}
              >
                <span style={{ width: `${video.duracao ? (video.tempo / video.duracao) * 100 : 0}%` }} />
              </div>
              <span className="lb-video-tempo num">{relogio(video.duracao)}</span>
            </>
          )}
        </div>
      )}

      <BotaoRedondo variante="escuro" icone="voltar" rotulo={primeira ? 'Primeira' : 'Anterior'} className="lb-anterior" onClick={anterior} disabled={primeira} />
      <BotaoRedondo variante="escuro" icone="avancar" rotulo={ultima ? 'Última' : 'Próxima'} className="lb-proxima" onClick={proxima} disabled={ultima} />

      <div className="lb-rodape">
        <span className="lb-ano">{foto.data}</span>
        <p className="lb-legenda">{foto.legenda} <span className="lb-fonte">Fonte: {foto.fonte.descricao}.</span></p>
        <div className="lb-tira" ref={tiraRef}>
          {fotos.map((f, i) => (
            <button key={f.id} type="button" className={i === indice ? 'is-sel' : undefined} aria-label={`${f.video ? 'Vídeo' : 'Foto'} ${i + 1}`} aria-current={i === indice} onClick={() => aoMudar(i)}>
              <Placa foto={f} miniatura etiqueta={false} />
            </button>
          ))}
        </div>
      </div>
      {zoom > 1 && <p className="lb-dica">Duplo toque para voltar ao tamanho inteiro</p>}
    </div>
  );
}