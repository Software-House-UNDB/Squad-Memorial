/**
 * Botão Voltar do Android (e do navegador): nunca sai do totem.
 * Mantemos sempre uma entrada-guarda no histórico; cada Voltar consome a guarda, recolocamos outra
 * e entregamos o gesto ao totem, que fecha o overlay aberto, depois volta do perfil para a busca.
 */
import { useEffect, useRef } from 'react';

export function useBotaoVoltar(aoVoltar: () => void) {
  const fn = useRef(aoVoltar);
  fn.current = aoVoltar;

  useEffect(() => {
    const guarda = { memorial: 'guarda' };
    if (history.state?.memorial !== 'guarda') {
      history.replaceState({ memorial: 'base' }, '');
      history.pushState(guarda, '');
    }
    const aoPop = () => {
      history.pushState(guarda, '');
      fn.current();
    };
    window.addEventListener('popstate', aoPop);
    return () => window.removeEventListener('popstate', aoPop);
  }, []);
}
