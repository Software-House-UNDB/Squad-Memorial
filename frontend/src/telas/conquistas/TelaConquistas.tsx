/**
 * Marcos e conquistas (área do Sumário). Reaproveita a linha do tempo, só com os marcos marcados
 * como conquista, em todas as décadas.
 */
import { useRef } from 'react';
import { marcosConquista } from '../../dados/acervo';
import { useNavegacao, useRolagemMemorizada } from '../../navegacao/Navegacao';
import { TelaClara } from '../../componentes/layout/TelaClara';
import { Botao } from '../../componentes/botoes/Botao';
import { FilasDoTempo } from '../../componentes/linha-do-tempo/LinhaDoTempo';
import { TituloArea } from '../../componentes/ornamentos/Ornamentos';
import { Estado } from '../../componentes/estado/Estado';
import './tela-conquistas.css';

export function TelaConquistas() {
  const { ir, voltar, marcoVisitado, marcarVisitado } = useNavegacao();
  const marcos = marcosConquista();
  const ref = useRef<HTMLDivElement>(null);
  useRolagemMemorizada(ref, 'conquistas');

  return (
    <TelaClara nome="conquistas" aba="linha-do-tempo" trilha={[{ rotulo: 'Marcos e conquistas' }]} onda>
      <div className="conquistas-lado">
        <TituloArea>Marcos e conquistas</TituloArea>
        <p>Reconhecimentos, autorizações e primeiras vezes, em ordem cronológica.</p>
        <Botao icone="tempo" onClick={() => ir({ tela: 'linha-do-tempo' })}>Ver a linha do tempo completa</Botao>
      </div>
      <div className="voltar-fixo"><Botao icone="voltar" onClick={voltar}>Voltar</Botao></div>
      <div className="conquistas-lista rola" ref={ref}>
        {marcos.length ? (
          <FilasDoTempo marcos={marcos} atualId={marcoVisitado()} aoAbrir={(m) => { marcarVisitado(m.id); ir({ tela: 'marco', marcoId: m.id }); }} />
        ) : (
          <Estado tipo="vazio" titulo="Em pesquisa" texto="As conquistas ainda estão sendo levantadas no acervo." />
        )}
      </div>
    </TelaClara>
  );
}