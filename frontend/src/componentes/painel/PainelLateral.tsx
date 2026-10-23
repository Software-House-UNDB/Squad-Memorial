/**
 * Painel lateral (o memorial não usa modal central para detalhes).
 * Um terço da tela à direita; o contexto fica visível sob véu da Noite a 12%.
 * Abre deslizando em 280ms; fecha tocando fora, em Fechar ou no Voltar do Android.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useCamada } from '../../navegacao/Navegacao';
import { Botao } from '../botoes/Botao';
import './painel.css';

const DURACAO = 280;

export function PainelLateral({ aberto, aoFechar, rotulo, children }: { aberto: boolean; aoFechar: () => void; rotulo: string; children: ReactNode }) {
  const [montado, setMontado] = useState(aberto);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (aberto) {
      setMontado(true);
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setVisivel(true)));
      return () => cancelAnimationFrame(r);
    }
    setVisivel(false);
    const t = window.setTimeout(() => setMontado(false), DURACAO);
    return () => window.clearTimeout(t);
  }, [aberto]);

  useCamada(aberto, aoFechar);

  if (!montado) return null;
  return (
    <div className={['m-painel-camada', visivel && 'is-aberto'].filter(Boolean).join(' ')}>
      <button type="button" className="m-painel-veu" aria-label="Fechar painel" onClick={aoFechar} tabIndex={-1} />
      <aside className="m-painel" role="dialog" aria-label={rotulo}>
        <div className="m-painel-topo">
          <Botao variante="sec" icone="fechar" onClick={aoFechar}>Fechar</Botao>
        </div>
        <div className="m-painel-corpo rola">{children}</div>
      </aside>
    </div>
  );
}