/**
 * Palco lógico de 1600 × 900 px CSS (16:9), escalado para caber na tela real mantendo a proporção.
 * Em telas 16:10 (ou qualquer outra proporção) ele fica centralizado, com faixas em --grafite-3.
 *
 * Por que: no WebView Android, 1 px CSS = 1 dp, e a largura em px CSS é a largura física
 * dividida pela densidade. O palco preserva a composição em qualquer caso; o painel ?diag mostra a
 * densidade real e o tamanho efetivo dos alvos, para ajustar a densidade do sistema no equipamento.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { quiosque } from '../config/quiosque';
import './palco.css';

const Escala = createContext(1);
export const useEscala = () => useContext(Escala);

function calcular(): number {
  const { largura, altura } = quiosque.palco;
  return Math.min(window.innerWidth / largura, window.innerHeight / altura);
}

export function Palco({ children }: { children: ReactNode }) {
  const [escala, setEscala] = useState(calcular);

  useEffect(() => {
    const ajustar = () => setEscala(calcular());
    window.addEventListener('resize', ajustar);
    window.addEventListener('orientationchange', ajustar);
    window.visualViewport?.addEventListener('resize', ajustar);
    return () => {
      window.removeEventListener('resize', ajustar);
      window.removeEventListener('orientationchange', ajustar);
      window.visualViewport?.removeEventListener('resize', ajustar);
    };
  }, []);

  return (
    <Escala.Provider value={escala}>
      <div className="moldura-palco">
        <div
          className="palco"
          style={{ width: quiosque.palco.largura, height: quiosque.palco.altura, transform: `translate(-50%, -50%) scale(${escala})` }}
        >
          {children}
        </div>
      </div>
      {quiosque.diagnostico && <Diagnostico escala={escala} />}
    </Escala.Provider>
  );
}

function Diagnostico({ escala }: { escala: number }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const dpr = window.devicePixelRatio || 1;
  const alvoMinimo = 56 * escala;
  const ok = alvoMinimo >= 48;
  return (
    <div className="diagnostico" role="status">
      <b>Diagnóstico do quiosque</b>
      <span>Viewport CSS: {window.innerWidth} × {window.innerHeight}</span>
      <span>devicePixelRatio: {dpr}</span>
      <span>Físico estimado: {Math.round(window.innerWidth * dpr)} × {Math.round(window.innerHeight * dpr)}</span>
      <span>Palco 1600 × 900, escala {escala.toFixed(3)}</span>
      <span className={ok ? '' : 'alerta'}>Alvo mínimo efetivo: {alvoMinimo.toFixed(1)} dp {ok ? '(ok)' : '(pequeno: ajuste a densidade do Android para aumentar o viewport CSS)'}</span>
    </div>
  );
}
