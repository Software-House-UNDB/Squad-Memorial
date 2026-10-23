/**
 * Palco lógico de 1920×1080 px CSS, escalado para caber na tela real mantendo a proporção.
 *
 * Por que: no WebView Android, 1 px CSS = 1 dp, e a largura em px CSS é a largura física
 * dividida pela densidade. Um painel 1920×1080 em densidade 1.5 aparece como 1280×720 para o CSS.
 * O palco preserva a composição em qualquer caso; o painel ?diag mostra a densidade real e o
 * tamanho efetivo dos alvos, para ajustar a densidade do sistema no equipamento.
 *
 * Fora do totem deitado (celular, tablet, totem em pé ou janela pequena), o palco escalado ficaria
 * minúsculo. Nesses casos ele vira fluido: ocupa a tela real sem escala e as telas se reorganizam
 * em coluna (classe `fluido` no <html>). ?palco=fixo ou ?palco=fluido forçam um dos modos.
 */
import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { quiosque } from '../config/quiosque';
import './palco.css';

const Escala = createContext(1);
export const useEscala = () => useContext(Escala);

/** Abaixo desta escala o texto do palco fica pequeno demais para ler (1280×720 dá 0,667). */
const ESCALA_MINIMA = 0.62;

interface Medida { escala: number; fluido: boolean }

function calcular(): Medida {
  const { largura, altura } = quiosque.palco;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const escala = Math.min(vw / largura, vh / altura);
  const fluido = quiosque.modoPalco === 'auto' ? vw <= vh || escala < ESCALA_MINIMA : quiosque.modoPalco === 'fluido';
  return { escala: fluido ? 1 : escala, fluido };
}

export function Palco({ children }: { children: ReactNode }) {
  const [{ escala, fluido }, setMedida] = useState(calcular);

  useEffect(() => {
    const ajustar = () => setMedida((m) => {
      const n = calcular();
      return n.escala === m.escala && n.fluido === m.fluido ? m : n;
    });
    window.addEventListener('resize', ajustar);
    window.addEventListener('orientationchange', ajustar);
    window.visualViewport?.addEventListener('resize', ajustar);
    return () => {
      window.removeEventListener('resize', ajustar);
      window.removeEventListener('orientationchange', ajustar);
      window.visualViewport?.removeEventListener('resize', ajustar);
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('fluido', fluido);
  }, [fluido]);

  return (
    <Escala.Provider value={escala}>
      <div className="moldura-palco">
        <div
          className={['palco', fluido && 'palco--fluido'].filter(Boolean).join(' ')}
          style={fluido ? undefined : { width: quiosque.palco.largura, height: quiosque.palco.altura, transform: `translate(-50%, -50%) scale(${escala})` }}
        >
          {children}
        </div>
      </div>
      {quiosque.diagnostico && <Diagnostico escala={escala} fluido={fluido} />}
    </Escala.Provider>
  );
}

function Diagnostico({ escala, fluido }: { escala: number; fluido: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);
  const dpr = window.devicePixelRatio || 1;
  const alvoMinimo = (fluido ? 56 : 60.13) * escala; // max(3.5rem, 56px) no palco = 60,13px
  const ok = alvoMinimo >= 56;
  return (
    <div className="diagnostico" role="status">
      <b>Diagnóstico do quiosque</b>
      <span>Viewport CSS: {window.innerWidth} × {window.innerHeight}</span>
      <span>devicePixelRatio: {dpr}</span>
      <span>Físico estimado: {Math.round(window.innerWidth * dpr)} × {Math.round(window.innerHeight * dpr)}</span>
      <span>Palco: {fluido ? 'fluido (sem escala)' : `fixo, escala ${escala.toFixed(3)}`}</span>
      <span className={ok ? '' : 'alerta'}>Alvo mínimo efetivo: {alvoMinimo.toFixed(1)} dp {ok ? '(ok ≥ 56)' : '(abaixo de 56: ajuste a densidade do Android para que o viewport CSS seja 1920 × 1080)'}</span>
    </div>
  );
}
