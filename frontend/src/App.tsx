import { useState } from 'react';
import { guardarSala, lerSala } from './config/sala';
import { Palco } from './quiosque/Palco';
import { EscolhaDeSala } from './telas/EscolhaDeSala';
import { Totem } from './telas/Totem';

export function App() {
  const [sala, setSala] = useState<number | null>(lerSala);

  const escolher = (n: number) => {
    guardarSala(n);
    history.replaceState(history.state, '', `?sala=${n}`);
    setSala(n);
  };

  return <Palco>{sala ? <Totem numero={sala} /> : <EscolhaDeSala aoEscolher={escolher} />}</Palco>;
}
