/**
 * Botões do Design System.
 * - Botao: pílula (primário, secundário, tinta, escuro; grande para ações principais).
 * - BotaoRedondo: disco com rótulo embaixo (Anterior, Próximo, Fechar, Aproximar…).
 * - SetaToque: o círculo de tinta com chevron que mostra onde tocar.
 * A ação dispara no clique (ao soltar dentro do botão); arrastar para fora cancela.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icone, type NomeIcone } from '../../icones/Icone';
import './botoes.css';

type Variante = 'pri' | 'sec' | 'tinta' | 'escuro';

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  grande?: boolean;
  icone?: NomeIcone;
  /** Ícone depois do rótulo (ex.: "1999 →"). */
  iconeDepois?: boolean;
  selecionado?: boolean;
  children: ReactNode;
}

export function Botao({ variante = 'sec', grande, icone, iconeDepois, selecionado, className, children, type = 'button', ...resto }: BotaoProps) {
  const classes = ['m-btn', `m-btn--${variante}`, grande && 'm-btn--g', selecionado && 'is-sel', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={classes} aria-pressed={selecionado === undefined ? undefined : selecionado} {...resto}>
      {icone && !iconeDepois && <Icone nome={icone} />}
      <span>{children}</span>
      {icone && iconeDepois && <Icone nome={icone} />}
    </button>
  );
}

interface RedondoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'claro' | 'tinta' | 'escuro';
  icone: NomeIcone;
  rotulo: string;
}

export function BotaoRedondo({ variante = 'claro', icone, rotulo, className, type = 'button', ...resto }: RedondoProps) {
  return (
    <button type={type} className={['m-redondo', `m-redondo--${variante}`, className].filter(Boolean).join(' ')} {...resto}>
      <span className="disco"><Icone nome={icone} /></span>
      <span className="rot">{rotulo}</span>
    </button>
  );
}

export function SetaToque({ className }: { className?: string }) {
  return (
    <span className={['m-seta', className].filter(Boolean).join(' ')} aria-hidden="true">
      <Icone nome="chevron" />
    </span>
  );
}