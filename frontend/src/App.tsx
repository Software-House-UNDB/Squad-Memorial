import { useEffect, useState } from 'react';
import { guardarSala, lerSala } from './config/sala';
import { pedirTelaCheia } from './quiosque/guardas';
import { Palco } from './quiosque/Palco';
import { EscolhaDeSala } from './telas/EscolhaDeSala';
import { Totem } from './telas/Totem';

export function App() {
  const [sala, setSala] = useState<number | null>(lerSala);

  // tela cheia e trava de orientação no primeiro toque (quando o navegador permite)
  useEffect(() => {
    const primeiro = () => void pedirTelaCheia();
    window.addEventListener('pointerdown', primeiro, { once: true, capture: true });
    return () => window.removeEventListener('pointerdown', primeiro, { capture: true });
  }, []);

  const escolher = (n: number) => {
    guardarSala(n);
    history.replaceState(history.state, '', `?sala=${n}`);
    setSala(n);
  };

  return <Palco>{sala ? <Totem numero={sala} /> : <EscolhaDeSala aoEscolher={escolher} />}</Palco>;
}
