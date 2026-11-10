/**
 * "Mais redes": folha que sobe de baixo da tela com as redes que não cabem nos botões do formulário.
 * Lista própria (sem <select> nativo), para ter alvos grandes de toque. Esc e toque fora fecham.
 */
import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { Icone } from '../componentes/Icone';
import { MAIS_REDES, redePorId, type RedeId } from '../dados/redes';

interface Props {
  aoEscolher: (rede: RedeId) => void;
  aoFechar: () => void;
}

export function FolhaRedes({ aoEscolher, aoFechar }: Props) {
  const corpo = useRef<HTMLDivElement>(null);
  const titulo = useId();

  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // a página atrás não rola enquanto a folha está aberta
    corpo.current?.querySelector<HTMLElement>('button')?.focus();
    return () => { document.body.style.overflow = antes; };
  }, []);

  /** Esc fecha; o Tab fica preso dentro da folha (ela é modal). */
  const teclas = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      aoFechar();
      return;
    }
    if (e.key !== 'Tab' || !corpo.current) return;
    const botoes = [...corpo.current.querySelectorAll<HTMLElement>('button')];
    const primeiro = botoes[0];
    const ultimo = botoes[botoes.length - 1];
    if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
  };

  return (
    <div className="ck-folha" onKeyDown={teclas}>
      <div className="ck-folha__fundo" onClick={aoFechar} aria-hidden="true" />
      <div ref={corpo} className="ck-folha__corpo" role="dialog" aria-modal="true" aria-labelledby={titulo}>
        <h2 id={titulo} className="serif">Escolha a rede</h2>
        <ul>
          {MAIS_REDES.map((id) => {
            const r = redePorId(id);
            return (
              <li key={id}>
                <button type="button" className="ck-folha__linha" onClick={() => aoEscolher(id)}>
                  <Icone nome={r.icone} tamanho={24} />
                  <span>{r.rotulo}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className="ck-folha__fechar" onClick={aoFechar}>Fechar</button>
      </div>
    </div>
  );
}
