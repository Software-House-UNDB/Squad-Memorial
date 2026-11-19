/**
 * Palco lógico escalado para caber na tela real mantendo a proporção: 1600 × 900 px CSS (16:9) com o
 * totem deitado e 900 × 1600 (9:16) com o totem em pé. A orientação segue a tela (ou ?orientacao=) e
 * muda sozinha se a tela girar; o CSS de cada tela recompõe o layout em .palco--retrato (estilos/retrato.css).
 * Em proporções intermediárias (16:10, 4:3) o palco fica centralizado, com faixas em --grafite-3.
 *
 * Por que: no WebView Android, 1 px CSS = 1 dp, e a largura em px CSS é a largura física
 * dividida pela densidade. O palco preserva a composição em qualquer caso; o painel ?diag mostra a
 * densidade real e o tamanho efetivo dos alvos, para ajustar a densidade do sistema no equipamento.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { quiosque, type Orientacao } from '../config/quiosque';
import './palco.css';
import '../estilos/retrato.css';

const Escala = createContext(1);
export const useEscala = () => useContext(Escala);
const OrientacaoCtx = createContext<Orientacao>('paisagem');
/** 'retrato' com o totem em pé. Para JS que dependa da composição; o layout em si fica no CSS. */
export const useOrientacao = () => useContext(OrientacaoCtx);

/** Em pé quando a tela é mais alta que larga, salvo ?orientacao= na URL. */
export function orientacaoDaTela(largura: number, altura: number, fixa: Orientacao | null = quiosque.orientacaoFixa): Orientacao {
  return fixa ?? (altura > largura ? 'retrato' : 'paisagem');
}

export const medidasDoPalco = (o: Orientacao) => (o === 'retrato' ? quiosque.palcoRetrato : quiosque.palco);

function calcular() {
  const orientacao = orientacaoDaTela(window.innerWidth, window.innerHeight);
  const { largura, altura } = medidasDoPalco(orientacao);
  return { orientacao, escala: Math.min(window.innerWidth / largura, window.innerHeight / altura) };
}

export function Palco({ children }: { children: ReactNode }) {
  const [{ escala, orientacao }, setMedida] = useState(calcular);
  const { largura, altura } = medidasDoPalco(orientacao);

  useEffect(() => {
    const ajustar = () => setMedida(calcular());
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
    <OrientacaoCtx.Provider value={orientacao}>
      <Escala.Provider value={escala}>
        <div className="moldura-palco">
          <div
            className={`palco palco--${orientacao}`}
            data-orientacao={orientacao}
            style={{ width: largura, height: altura, transform: `translate(-50%, -50%) scale(${escala})` }}
          >
            {children}
          </div>
        </div>
        {quiosque.diagnostico && <Diagnostico escala={escala} palco={`${largura} × ${altura} (${orientacao})`} />}
      </Escala.Provider>
    </OrientacaoCtx.Provider>
  );
}

function Diagnostico({ escala, palco }: { escala: number; palco: string }) {
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
      <span>Palco {palco}, escala {escala.toFixed(3)}</span>
      <span className={ok ? '' : 'alerta'}>Alvo mínimo efetivo: {alvoMinimo.toFixed(1)} dp {ok ? '(ok)' : '(pequeno: ajuste a densidade do Android para aumentar o viewport CSS)'}</span>
    </div>
  );
}
