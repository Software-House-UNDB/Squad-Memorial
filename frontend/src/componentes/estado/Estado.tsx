/** Estados de sistema: carregando (após 400ms), vazio e erro, sempre com uma saída. */
import { useEffect, useState, type ReactNode } from 'react';
import { Medalha } from '../editorial/Editorial';
import './estado.css';

interface Props {
  tipo: 'carregando' | 'vazio' | 'erro';
  titulo?: string;
  texto: string;
  acoes?: ReactNode;
  escuro?: boolean;
}

export function Estado({ tipo, titulo, texto, acoes, escuro }: Props) {
  // DESIGN.md: nada aparece antes de 400ms no carregamento.
  const [visivel, setVisivel] = useState(tipo !== 'carregando');
  useEffect(() => {
    if (tipo !== 'carregando') return setVisivel(true);
    const t = window.setTimeout(() => setVisivel(true), 400);
    return () => window.clearTimeout(t);
  }, [tipo]);
  if (!visivel) return null;

  return (
    <div className={['m-estado', escuro && 'm-estado--escuro'].filter(Boolean).join(' ')} role={tipo === 'erro' ? 'alert' : 'status'}>
      {tipo === 'carregando' && <span className="m-losangos" aria-hidden="true"><i /><i /><i /></span>}
      {tipo === 'vazio' && <Medalha icone="vazio" />}
      {tipo === 'erro' && <Medalha icone="alerta" erro />}
      {titulo && <h3>{titulo}</h3>}
      <p>{texto}</p>
      {acoes && <div className="acoes">{acoes}</div>}
    </div>
  );
}