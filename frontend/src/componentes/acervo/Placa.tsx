/**
 * Imagem do acervo.
 * - Com `src`: reserva o espaço em Papel Envelhecido, decodifica de forma assíncrona, aparece ao carregar;
 *   se falhar, mostra "Imagem indisponível" no lugar, sem quebrar o layout.
 * - Sem `src`: placa provisória (tom 1–5) com a etiqueta "Foto do acervo", até o acervo oficial entrar.
 * `ajuste="contain"` mostra a foto inteira (lightbox); `cover` recorta (miniaturas).
 */
import { useState } from 'react';
import type { Foto, TomPlaca } from '../../dados/tipos';
import { Icone } from '../../icones/Icone';
import './placa.css';

interface Props {
  foto?: Foto;
  tom?: TomPlaca;
  ajuste?: 'cover' | 'contain';
  miniatura?: boolean;
  etiqueta?: string | false;
  className?: string;
}

export function Placa({ foto, tom, ajuste = 'cover', miniatura = false, etiqueta, className }: Props) {
  const [estado, setEstado] = useState<'carregando' | 'pronta' | 'falhou'>('carregando');
  const src = foto ? (miniatura ? foto.srcMiniatura ?? foto.src : foto.src) : undefined;
  const t = foto?.tom ?? tom ?? 1;
  const classes = ['placa', className].filter(Boolean).join(' ');

  // vídeo: o selo de reprodução aparece sobre a capa (ou sobre a placa, se não houver capa)
  const selo = foto?.video ? <span className="placa-video" aria-hidden="true"><Icone nome="reproduzir" /></span> : null;

  if (!src) {
    const padrao = foto?.video
      ? (foto.demo ? 'Vídeo do acervo · demonstrativo' : 'Vídeo do acervo')
      : (foto?.demo ? 'Foto do acervo · demonstrativa' : 'Foto do acervo');
    const rotulo = etiqueta === false ? undefined : etiqueta ?? (foto ? padrao : undefined);
    return (
      <div className={`${classes} placa--provisoria p${t}`} role={foto ? 'img' : undefined} aria-label={foto?.alt}>
        {rotulo && <span className="placa-etiqueta">{rotulo}</span>}
        {selo}
      </div>
    );
  }

  return (
    <div className={`${classes} placa--${estado}`}>
      {estado !== 'falhou' && (
        <img
          src={src}
          alt={foto?.alt ?? ''}
          loading={miniatura ? 'lazy' : 'eager'}
          decoding="async"
          draggable={false}
          style={{ objectFit: ajuste }}
          onLoad={() => setEstado('pronta')}
          onError={() => setEstado('falhou')}
        />
      )}
      {estado === 'falhou' && (
        <span className="placa-falha"><Icone nome="foto" />Imagem indisponível</span>
      )}
      {selo}
    </div>
  );
}