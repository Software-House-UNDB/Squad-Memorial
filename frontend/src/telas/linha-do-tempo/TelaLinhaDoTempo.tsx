/**
 * Tela 3 · Linha do tempo. Duas mãos: à esquerda o período (contexto e imagem), à direita os marcos
 * rolam sob o dedo. Índice de décadas fixo no alto; botões de década anterior/próxima embaixo.
 * Volta de um detalhe no mesmo período, com o último marco visitado marcado em tinta.
 */
import { useEffect, useRef } from 'react';
import { foto, marco, marcosDoPeriodo, periodosOrdenados } from '../../dados/acervo';
import { useMemoriaTela, useNavegacao, useRolagemMemorizada } from '../../navegacao/Navegacao';
import { TelaClara } from '../../componentes/layout/TelaClara';
import { Chip } from '../../componentes/editorial/Editorial';
import { Botao, BotaoRedondo } from '../../componentes/botoes/Botao';
import { Placa } from '../../componentes/acervo/Placa';
import { FilasDoTempo } from '../../componentes/linha-do-tempo/LinhaDoTempo';
import { Estado } from '../../componentes/estado/Estado';
import { TrilhoRolagem } from '../../componentes/linha-do-tempo/TrilhoRolagem';
import './tela-linha-do-tempo.css';

export function TelaLinhaDoTempo({ periodoInicial }: { periodoInicial?: string }) {
  const { ir, voltar, marcoVisitado, marcarVisitado } = useNavegacao();
  const periodos = periodosOrdenados();
  const visitado = marco(marcoVisitado());
  const [periodoId, setPeriodoId] = useMemoriaTela('periodo', () => periodoInicial ?? visitado?.periodoId ?? periodos[1]?.id ?? periodos[0]?.id);
  const listaRef = useRef<HTMLDivElement>(null);
  useRolagemMemorizada(listaRef, `tempo:${periodoId}`, [periodoId]);

  const i = periodos.findIndex((p) => p.id === periodoId);
  const periodo = periodos[i];
  const marcos = periodo ? marcosDoPeriodo(periodo.id) : [];

  // ao voltar de um detalhe, garante que o marco visitado esteja à vista
  useEffect(() => {
    const id = marcoVisitado();
    if (!id) return;
    const el = listaRef.current?.querySelector<HTMLElement>(`[data-marco="${id}"]`);
    if (el && listaRef.current) {
      const c = listaRef.current;
      const topo = el.offsetTop - c.clientHeight / 2 + el.offsetHeight / 2;
      if (topo > c.scrollTop + c.clientHeight - el.offsetHeight || topo < c.scrollTop - el.offsetHeight) c.scrollTop = Math.max(0, topo);
    }
  }, [periodoId, marcoVisitado]);

  const escolher = (id: string) => {
    if (id === periodoId) return;
    setPeriodoId(id);
    listaRef.current?.scrollTo({ top: 0 });
  };

  return (
    <TelaClara nome="linha-do-tempo" aba="linha-do-tempo" trilha={[{ rotulo: 'Linha do tempo' }]} onda>
      <nav className="decadas" aria-label="Ir para a década">
        <span className="rot">Ir para a década</span>
        {periodos.map((p) => (
          <Chip key={p.id} selecionado={p.id === periodoId} contagem={marcosDoPeriodo(p.id).length} onClick={() => escolher(p.id)}>
            {p.inicio}
          </Chip>
        ))}
      </nav>

      {periodo && (
        <div className="tempo-corpo">
          <div className="periodo">
            <h1>{periodo.titulo}</h1>
            <span className="faixa-anos">De {periodo.inicio} a {periodo.fim} · {marcos.length} {marcos.length === 1 ? 'marco' : 'marcos'}</span>
            <p>{periodo.descricao}</p>
            <Placa foto={foto(periodo.fotoId)} className="periodo-foto" />
            <div className="periodo-nav">
              <span className="decada-nav">
                <BotaoRedondo icone="voltar" rotulo={i > 0 ? String(periodos[i - 1].inicio) : 'Primeira'} disabled={i <= 0} onClick={() => escolher(periodos[i - 1].id)} />
                <BotaoRedondo variante="tinta" icone="avancar" rotulo={i < periodos.length - 1 ? String(periodos[i + 1].inicio) : 'Última'} disabled={i >= periodos.length - 1} onClick={() => escolher(periodos[i + 1].id)} />
              </span>
            </div>
          </div>

          <div className="lista-moldura">
          <div className="lista rola" ref={listaRef}>
            {marcos.length > 0 ? (
              <FilasDoTempo
                marcos={marcos}
                atualId={marcoVisitado()}
                aoAbrir={(m) => { marcarVisitado(m.id); ir({ tela: 'marco', marcoId: m.id }); }}
              />
            ) : (
              <div className="lista-vazia">
                <Estado tipo="vazio" titulo="Ainda sem marcos" texto="Os marcos deste período ainda estão sendo pesquisados no acervo." />
              </div>
            )}
          </div>
          <TrilhoRolagem key={periodoId} alvo={listaRef} />
          </div>
        </div>
      )}
      <div className="voltar-fixo"><Botao icone="voltar" onClick={voltar}>Voltar</Botao></div>
    </TelaClara>
  );
}