/**
 * Tela 7 · Visualizador de documento (Mesa de Leitura).
 * Ficha de papel à esquerda (título, metadados, transcrição, voltar ao marco); a mesa escura à direita
 * com a folha. Zoom por botões em três níveis (página inteira, 1,6×, 2,5×) e "Página inteira" para
 * redefinir; com zoom, um dedo arrasta (rolagem interna). Duplo toque alterna página inteira ↔ 1,6×.
 * Os controles ficam fora da área de leitura. Estados: carregando, não digitalizado e falha.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { documento as buscarDocumento, marco as buscarMarco } from '../../dados/acervo';
import { useMemoriaTela, useNavegacao } from '../../navegacao/Navegacao';
import { TelaClara } from '../../componentes/layout/TelaClara';
import { Botao, BotaoRedondo } from '../../componentes/botoes/Botao';
import { Divisor } from '../../componentes/ornamentos/Ornamentos';
import { Estado } from '../../componentes/estado/Estado';
import './tela-documento.css';

const NIVEIS = [1, 1.6, 2.5] as const;

export function TelaDocumento({ documentoId }: { documentoId: string }) {
  const { ir, voltar, marcarVisitado, pilha } = useNavegacao();
  const origem = pilha[pilha.length - 2]?.rota.tela;
  const veioDoAcervo = origem === 'galeria';
  const doc = buscarDocumento(documentoId);
  const m = buscarMarco(doc?.marcoId);
  const [pagina, setPagina] = useMemoriaTela('pagina', 0);
  const [nivel, setNivel] = useState(0);
  const [transcricao, setTranscricao] = useState(false);
  const [carga, setCarga] = useState<'carregando' | 'pronta' | 'falhou'>('carregando');
  const [tentativa, setTentativa] = useState(0);
  const areaRef = useRef<HTMLDivElement>(null);
  const toque = useRef({ t: 0, x: 0, y: 0 });

  const paginas = doc?.paginas ?? [];
  const pg = paginas[pagina];
  const zoom = NIVEIS[nivel];

  useEffect(() => { setCarga('carregando'); setNivel(0); }, [pagina, tentativa, documentoId]);

  // ao mudar o zoom, mantém o centro da área de leitura
  const centro = useRef({ fx: 0.5, fy: 0.5 });
  const mudarNivel = (n: number) => {
    const a = areaRef.current;
    if (a) {
      centro.current = {
        fx: a.scrollWidth > a.clientWidth ? (a.scrollLeft + a.clientWidth / 2) / a.scrollWidth : 0.5,
        fy: a.scrollHeight > a.clientHeight ? (a.scrollTop + a.clientHeight / 2) / a.scrollHeight : 0.5,
      };
    }
    setNivel(Math.max(0, Math.min(NIVEIS.length - 1, n)));
  };
  useLayoutEffect(() => {
    const a = areaRef.current;
    if (!a) return;
    a.scrollLeft = centro.current.fx * a.scrollWidth - a.clientWidth / 2;
    a.scrollTop = centro.current.fy * a.scrollHeight - a.clientHeight / 2;
  }, [nivel]);

  const aoSoltar = (e: React.PointerEvent) => {
    const agora = performance.now();
    const u = toque.current;
    if (agora - u.t < 320 && Math.hypot(e.clientX - u.x, e.clientY - u.y) < 40) {
      mudarNivel(nivel === 0 ? 1 : 0);
      toque.current = { t: 0, x: 0, y: 0 };
    } else toque.current = { t: agora, x: e.clientX, y: e.clientY };
  };

  const voltarAoMarco = () => {
    if (!m) return voltar();
    marcarVisitado(m.id);
    voltar();
  };

  if (!doc) {
    return (
      <TelaClara nome="documento" aba="acervo" escura trilha={[{ rotulo: 'Documento' }]}>
        <div className="doc-centro"><Estado escuro tipo="vazio" titulo="Documento não encontrado" texto="Este documento não está mais no acervo." acoes={<Botao variante="escuro" icone="voltar" onClick={voltar}>Voltar</Botao>} /></div>
      </TelaClara>
    );
  }

  const aba = veioDoAcervo || !m ? 'acervo' : 'linha-do-tempo';
  const trilha = m && !veioDoAcervo
    ? [{ rotulo: 'Linha do tempo', aoTocar: voltar }, { rotulo: String(m.ano), aoTocar: voltar }, { rotulo: 'Documento' }]
    : [{ rotulo: 'Acervo', aoTocar: voltar }, { rotulo: 'Documento' }];

  return (
    <TelaClara nome="documento" aba={aba} escura trilha={trilha}>
      <aside className="ficha rola">
        <h1>{doc.titulo}</h1>
        <Divisor />
        {!transcricao && (
          <dl>
            <dt>Data</dt><dd>{doc.data}</dd>
            <dt>Tipo</dt><dd>{doc.tipo}</dd>
            <dt>Páginas</dt><dd>{paginas.length || 'Não digitalizado'}</dd>
            {doc.codigoAcervo && (<><dt>Acervo</dt><dd>{doc.codigoAcervo}</dd></>)}
            {m && (<><dt>Marco</dt><dd>{m.titulo}</dd></>)}
            <dt>Fonte</dt><dd>{doc.fonte.descricao}</dd>
          </dl>
        )}
        {transcricao && doc.transcricao && (
          <div className="transcricao">
            {doc.transcricao.map((t, i) => <p key={i}>{t}</p>)}
          </div>
        )}
        <div className="acoes">
          {doc.transcricao?.length ? (
            <Botao variante="pri" icone="texto" onClick={() => setTranscricao(!transcricao)} aria-expanded={transcricao}>
              {transcricao ? 'Ver dados do documento' : 'Ler transcrição'}
            </Botao>
          ) : null}
          {m
            ? <Botao icone="voltar" onClick={voltarAoMarco}>Voltar ao marco</Botao>
            : <Botao icone="voltar" onClick={voltar}>Voltar</Botao>}
          {m && <Botao icone="tempo" onClick={() => { marcarVisitado(m.id); ir({ tela: 'linha-do-tempo', periodoId: m.periodoId }); }}>Ver na linha do tempo</Botao>}
        </div>
      </aside>

      <div className="mesa">
        {paginas.length === 0 ? (
          <div className="doc-centro">
            <Estado escuro tipo="vazio" titulo="Ainda não digitalizado" texto="Este documento existe no acervo, mas ainda não foi digitalizado para o memorial." acoes={<Botao variante="escuro" icone="voltar" onClick={m ? voltarAoMarco : voltar}>{m ? 'Voltar ao marco' : 'Voltar'}</Botao>} />
          </div>
        ) : (
          <>
            {doc.demo && <span className="tag-ilus">Documento demonstrativo</span>}
            <div
              ref={areaRef}
              className={['leitura', nivel > 0 && 'leitura--zoom'].filter(Boolean).join(' ')}
              onPointerUp={aoSoltar}
            >
              <div className={['folha-moldura', carga === 'falhou' && 'is-falha'].filter(Boolean).join(' ')} style={{ ['--zoom' as string]: zoom }}>
                {carga !== 'falhou' && pg?.src && (
                  <img
                    key={`${pagina}-${tentativa}`}
                    className={['folha', carga === 'pronta' && 'is-pronta'].filter(Boolean).join(' ')}
                    src={pg.src}
                    alt={pg.alt}
                    draggable={false}
                    onLoad={() => setCarga('pronta')}
                    onError={() => setCarga('falhou')}
                  />
                )}
              </div>
            </div>

            {carga === 'carregando' && <div className="doc-centro doc-sobre"><Estado escuro tipo="carregando" texto="Abrindo o documento…" /></div>}
            {(carga === 'falhou' || !pg?.src) && (
              <div className="doc-centro doc-sobre">
                <Estado
                  escuro
                  tipo="erro"
                  titulo="A página não abriu"
                  texto="O arquivo desta página pode estar com defeito. Tente de novo ou volte."
                  acoes={<>
                    <Botao variante="pri" icone="recarregar" onClick={() => setTentativa((n) => n + 1)}>Tentar de novo</Botao>
                    <Botao variante="escuro" icone="voltar" onClick={m ? voltarAoMarco : voltar}>Voltar</Botao>
                  </>}
                />
              </div>
            )}

            <div className="zoom" role="group" aria-label="Zoom">
              <BotaoRedondo variante="escuro" icone="mais" rotulo="Aproximar" onClick={() => mudarNivel(nivel + 1)} disabled={nivel >= NIVEIS.length - 1 || carga !== 'pronta'} />
              <BotaoRedondo variante="escuro" icone="menos" rotulo="Afastar" onClick={() => mudarNivel(nivel - 1)} disabled={nivel === 0 || carga !== 'pronta'} />
              <BotaoRedondo variante="escuro" icone="enquadrar" rotulo="Redefinir" onClick={() => mudarNivel(0)} disabled={nivel === 0 || carga !== 'pronta'} />
              <span className="nivel num" aria-live="polite">{nivel === 0 ? 'Página inteira' : `Zoom ${String(zoom).replace('.', ',')}×`}</span>
            </div>

            <div className="barra-doc">
              <BotaoRedondo variante="escuro" icone="voltar" rotulo={pagina > 0 ? 'Anterior' : 'Primeira'} disabled={pagina === 0} onClick={() => setPagina(pagina - 1)} />
              <span className="pagnum"><b className="num">{pagina + 1} / {paginas.length}</b>Página</span>
              <BotaoRedondo variante="escuro" icone="avancar" rotulo={pagina < paginas.length - 1 ? 'Próxima' : 'Última'} disabled={pagina >= paginas.length - 1} onClick={() => setPagina(pagina + 1)} />
            </div>
            {nivel > 0 && <p className="dica-zoom">Arraste com um dedo para percorrer a página</p>}
          </>
        )}
      </div>
    </TelaClara>
  );
}