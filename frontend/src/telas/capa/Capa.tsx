/**
 * Tela 1 · Capa do Livro de Honra (boas-vindas e proteção de tela).
 * A tela inteira é alvo de toque; o botão existe para dizer isso.
 * Em repouso, a prancha troca de foto a cada 8s em dissolução lenta, sempre com data.
 */
import { useEffect, useMemo, useState } from 'react';
import logoBranco from '../../assets/undb-logo-branco.png';
import { Icone } from '../../icones/Icone';
import { acervo, configTotem } from '../../dados/acervo';
import { quiosque } from '../../config/quiosque';
import { Placa } from '../../componentes/acervo/Placa';
import { Divisor } from '../../componentes/ornamentos/Ornamentos';
import './capa.css';

export function Capa({ aoAbrir, ativa }: { aoAbrir: () => void; ativa: boolean }) {
  const [i, setI] = useState(0);
  const fotosCapa = useMemo(
    () => acervo.periodos.map((p) => acervo.fotos.find((f) => f.id === p.fotoId)).filter((f): f is NonNullable<typeof f> => !!f),
    [],
  );

  useEffect(() => {
    if (!ativa || fotosCapa.length < 2) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % fotosCapa.length), quiosque.capa.trocaFotoMs);
    return () => window.clearInterval(t);
  }, [ativa, fotosCapa.length]);

  const foto = fotosCapa[i];

  return (
    <div className="t-capa" role="button" tabIndex={0} aria-label="Toque para abrir o memorial" onClick={aoAbrir} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && aoAbrir()}>
      <div className="tecido" aria-hidden="true" />
      <div className="gravacao" aria-hidden="true"><i className="c1" /><i className="c2" /><i className="c3" /><i className="c4" /></div>

      <figure className="prancha">
        <div className="prancha-fotos">
          {fotosCapa.length === 0 && (
            <div className="prancha-foto is-atual"><Placa tom={1} etiqueta={false} /></div>
          )}
          {fotosCapa.map((f, n) => (
            <div key={f.id} className={['prancha-foto', n === i && 'is-atual'].filter(Boolean).join(' ')} aria-hidden={n !== i}>
              <Placa foto={f} etiqueta={false} />
            </div>
          ))}
        </div>
        {foto && <figcaption>Foto do acervo · {foto.data}{foto.demo ? ' · demonstrativa' : ''}</figcaption>}
      </figure>

      <div className="lado">
        <img src={logoBranco} alt="UNDB Centro Universitário" />
        <h1>{configTotem.titulo.toUpperCase()}</h1>
        <Divisor className="divisor-capa" />
        <p className="sub">{configTotem.subtitulo}</p>
        <span className="m-btn m-btn--pri m-btn--g cta" aria-hidden="true"><span>Toque para abrir</span></span>
        <span className="dica"><Icone nome="toque" />Toque em qualquer lugar da tela</span>
      </div>
    </div>
  );
}