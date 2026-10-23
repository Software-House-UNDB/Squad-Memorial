/** Ornamentos de encadernação: divisor com losango, onda com fio de ouro, fibra do papel, título de área entre louros. */
import type { ReactNode } from 'react';
import { Louro } from '../../icones/Icone';
import './ornamentos.css';

export function Divisor({ className }: { className?: string }) {
  return <div className={['m-divisor', className].filter(Boolean).join(' ')} aria-hidden="true"><i /></div>;
}

export function Onda() {
  return (
    <div className="m-onda" aria-hidden="true">
      <svg viewBox="0 0 1920 120" preserveAspectRatio="none">
        <path d="M0 52C380 6 760 96 1180 40S1700 22 1920 58V120H0Z" fill="var(--cor-tinta-diluida)" />
        <path d="M0 78C430 36 840 120 1250 66S1730 50 1920 80V120H0Z" fill="var(--cor-tinta)" />
        <path d="M0 78C430 36 840 120 1250 66S1730 50 1920 80" fill="none" stroke="var(--cor-ouro)" strokeWidth="3" />
      </svg>
    </div>
  );
}

/** Fibra e aquarela do papel de arquivo (decorativo, por baixo do conteúdo). */
export function PapelFibra() {
  return <div className="m-papel-fibra" aria-hidden="true" />;
}

/** Título de área ladeado por louros (só títulos de área). */
export function TituloArea({ children, nivel = 1 }: { children: ReactNode; nivel?: 1 | 2 }) {
  const H = nivel === 1 ? 'h1' : 'h2';
  return (
    <div className="m-titulo-area">
      <Louro />
      <H>{children}</H>
      <Louro espelhado />
    </div>
  );
}