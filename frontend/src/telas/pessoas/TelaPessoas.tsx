/**
 * Tela 6 · Personalidades. Camafeus pousados no papel (sem cartão), quatro por linha.
 * Tocar num retrato abre o painel lateral com retrato, nome, papel, biografia, ligações e fonte.
 */
import { useRef, useState } from 'react';
import { acervo, fotosDe, marcosDe, pessoa as buscarPessoa, retratoDe } from '../../dados/acervo';
import { useMemoriaTela, useNavegacao, useRolagemMemorizada } from '../../navegacao/Navegacao';
import { TelaClara } from '../../componentes/layout/TelaClara';
import { Botao } from '../../componentes/botoes/Botao';
import { Camafeu, CartaoMarco } from '../../componentes/editorial/Editorial';
import { Divisor, TituloArea } from '../../componentes/ornamentos/Ornamentos';
import { PainelLateral } from '../../componentes/painel/PainelLateral';
import { Lightbox } from '../../componentes/lightbox/Lightbox';
import { Estado } from '../../componentes/estado/Estado';
import './tela-pessoas.css';

export function TelaPessoas() {
  const { ir, voltar, marcarVisitado } = useNavegacao();
  const [selecionadaId, setSelecionadaId] = useMemoriaTela<string | null>('pessoa', null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const gradeRef = useRef<HTMLDivElement>(null);
  useRolagemMemorizada(gradeRef, 'pessoas');

  const p = buscarPessoa(selecionadaId ?? undefined);
  const retrato = p ? retratoDe(p) : undefined;
  const marcos = p ? marcosDe(p.marcoIds) : [];
  const fotos = p ? fotosDe(p.fotoIds) : [];

  const abrirMarco = (id: string) => {
    marcarVisitado(id);
    ir({ tela: 'marco', marcoId: id });
  };

  return (
    <TelaClara
      nome="pessoas"
      aba="pessoas"
      trilha={[{ rotulo: 'Pessoas' }]}
      sobreposicao={
        <>
          <PainelLateral aberto={!!p} aoFechar={() => setSelecionadaId(null)} rotulo={p ? `Perfil de ${p.nome}` : 'Perfil'}>
            {p && (
              <>
                <div className="retrato">
                  <Camafeu nome={p.nome} papel={p.papel} retrato={retrato} tamanho="painel" />
                  <div>
                    <h2>{p.nome}</h2>
                    <p className="papel">{p.papel}</p>
                  </div>
                </div>
                <Divisor />
                {p.biografia.map((t, i) => <p key={i} className="bio">{t}</p>)}
                {(marcos.length > 0 || fotos.length > 0) && (
                  <div className="acoes">
                    {marcos[0] && <Botao icone="tempo" onClick={() => abrirMarco(marcos[0].id)}>Na linha do tempo</Botao>}
                    {fotos.length > 0 && <Botao icone="foto" onClick={() => setLightbox(0)}>{fotos.length === 1 ? 'Ver foto' : `Ver ${fotos.length} fotos`}</Botao>}
                  </div>
                )}
                {marcos.length > 0 && (
                  <div className="aparece">
                    <span className="rotulo">Aparece em</span>
                    {marcos.map((m) => (
                      <CartaoMarco key={m.id} marco={m} capa={fotosDe(m.fotoIds)[0]} compacto aoTocar={() => abrirMarco(m.id)} />
                    ))}
                  </div>
                )}
                <p className="fonte">Fonte: {p.fonte.descricao.replace(/\.?$/, '.')}{p.verificado ? '' : ' Dados pendentes de validação.'}</p>
              </>
            )}
          </PainelLateral>
          {lightbox !== null && fotos.length > 0 && p && (
            <Lightbox fotos={fotos} indice={lightbox} aoMudar={setLightbox} aoFechar={() => setLightbox(null)} contexto={p.nome} />
          )}
        </>
      }
    >
      <div className="pessoas-cab">
        <TituloArea>Pessoas</TituloArea>
        <i>Quem construiu a história da UNDB</i>
      </div>

      <div className="grade-pessoas rola" ref={gradeRef}>
        {acervo.pessoas.length === 0 ? (
          <Estado tipo="vazio" titulo="Perfis em preparação" texto="Os perfis ainda estão sendo escritos com a comunidade." />
        ) : (
          <ul className="grade">
            {acervo.pessoas.map((pe) => (
              <li key={pe.id}>
                <Camafeu nome={pe.nome} papel={pe.papel} retrato={retratoDe(pe)} selecionado={pe.id === selecionadaId} aoTocar={() => setSelecionadaId(pe.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="voltar-fixo">
        <Botao icone="voltar" onClick={voltar}>Voltar</Botao>
      </div>
    </TelaClara>
  );
}