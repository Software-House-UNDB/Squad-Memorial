/**
 * Memórias (área do Sumário): depoimentos autorizados da comunidade acadêmica, como citações
 * numa página de livro. Quando o depoimento tem marco, leva até ele.
 */
import { useRef } from 'react';
import { depoimentosAutorizados, marco } from '../../dados/acervo';
import { useNavegacao, useRolagemMemorizada } from '../../navegacao/Navegacao';
import { TelaClara } from '../../componentes/layout/TelaClara';
import { Botao } from '../../componentes/botoes/Botao';
import { Citacao } from '../../componentes/editorial/Editorial';
import { TituloArea } from '../../componentes/ornamentos/Ornamentos';
import { Estado } from '../../componentes/estado/Estado';
import './tela-memorias.css';

export function TelaMemorias() {
  const { ir, voltar, marcarVisitado } = useNavegacao();
  const depoimentos = depoimentosAutorizados();
  const ref = useRef<HTMLDivElement>(null);
  useRolagemMemorizada(ref, 'memorias');

  return (
    <TelaClara nome="memorias" aba="memorias" trilha={[{ rotulo: 'Memórias' }]} onda>
      <div className="memorias-cab">
        <TituloArea>Memórias</TituloArea>
        <i>Depoimentos da comunidade acadêmica</i>
      </div>
      <div className="memorias-lista rola" ref={ref}>
        {depoimentos.length === 0 ? (
          <Estado tipo="vazio" titulo="Em coleta" texto="Os depoimentos estão sendo gravados e autorizados." />
        ) : (
          <ul>
            {depoimentos.map((d) => {
              const m = marco(d.marcoId);
              return (
                <li key={d.id}>
                  <Citacao depoimento={d} />
                  {m && (
                    <Botao icone="tempo" onClick={() => { marcarVisitado(m.id); ir({ tela: 'marco', marcoId: m.id }); }}>
                      Ver o marco de {m.ano}
                    </Botao>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="voltar-fixo">
        <Botao icone="voltar" onClick={voltar}>Voltar</Botao>
      </div>
    </TelaClara>
  );
}