/**
 * Tela 4 · Detalhe de um acontecimento (livro aberto).
 * Página esquerda: imagem grande, legenda e miniaturas irmãs (fotos e documentos).
 * Página direita: bloco editorial e ações. Faixa inferior: Voltar, contador e marco anterior/próximo.
 */
import { useState } from 'react';
import { depoimento, documentosDe, fotosDe, marco as buscarMarco, marcosOrdenados, periodo } from '../../dados/acervo';
import { Icone } from '../../icones/Icone';
import { useNavegacao } from '../../navegacao/Navegacao';
import { TelaClara } from '../../componentes/layout/TelaClara';
import { Botao } from '../../componentes/botoes/Botao';
import { BlocoEditorial, Progresso } from '../../componentes/editorial/Editorial';
import { Placa } from '../../componentes/acervo/Placa';
import { Lightbox } from '../../componentes/lightbox/Lightbox';
import { Estado } from '../../componentes/estado/Estado';
import './tela-marco.css';

export function TelaMarco({ marcoId }: { marcoId: string }) {
  const { ir, voltar, trocar, marcarVisitado } = useNavegacao();
  const m = buscarMarco(marcoId);
  const [fotoAtual, setFotoAtual] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (!m) {
    return (
      <TelaClara nome="marco" aba="linha-do-tempo" trilha={[{ rotulo: 'Linha do tempo', aoTocar: voltar }]}>
        <div className="marco-indisponivel">
          <Estado tipo="vazio" titulo="Marco não encontrado" texto="Este acontecimento não está mais no acervo." acoes={<Botao variante="sec" icone="voltar" onClick={voltar}>Voltar</Botao>} />
        </div>
      </TelaClara>
    );
  }

  const fotos = fotosDe(m.fotoIds);
  const nVideos = fotos.filter((f) => f.video).length;
  const nFotos = fotos.length - nVideos;
  const verTudo = [
    nFotos ? `${nFotos} ${nFotos === 1 ? 'foto' : 'fotos'}` : '',
    nVideos ? `${nVideos} ${nVideos === 1 ? 'vídeo' : 'vídeos'}` : '',
  ].filter(Boolean).join(' e ');
  const docs = documentosDe(m.documentoIds);
  const todos = marcosOrdenados();
  const pos = todos.findIndex((x) => x.id === m.id);
  const anterior = todos[pos - 1];
  const proximo = todos[pos + 1];
  const citacao = depoimento(m.depoimentoId);
  const foto = fotos[fotoAtual];

  const irPara = (id: string) => {
    marcarVisitado(id);
    trocar({ tela: 'marco', marcoId: id });
  };

  return (
    <TelaClara
      nome="marco"
      aba="linha-do-tempo"
      trilha={[{ rotulo: 'Linha do tempo', aoTocar: voltar }, { rotulo: String(m.dataTexto ?? m.ano) }]}
      sobreposicao={lightbox !== null && fotos.length > 0 && (
        <Lightbox fotos={fotos} indice={lightbox} aoMudar={setLightbox} aoFechar={() => { setFotoAtual(lightbox); setLightbox(null); }} contexto={String(m.ano)} />
      )}
    >
      <div className="livro">
        <div className="pag-esq">
          {foto ? (
            <button type="button" className="foto-grande" onClick={() => setLightbox(fotoAtual)} aria-label={foto.video ? 'Assistir ao vídeo' : 'Ampliar fotografia'}>
              <Placa foto={foto} />
              <span className="ampliar"><Icone nome={foto.video ? 'reproduzir' : 'mais'} />{foto.video ? 'Assistir' : 'Ampliar'}</span>
            </button>
          ) : (
            <div className="foto-grande foto-grande--vazia">
              <Estado tipo="vazio" titulo="Sem fotos" texto="Ainda não há fotografias deste acontecimento no acervo." />
            </div>
          )}
          {foto && (
            <p className="legenda">
              <b>{foto.video ? 'Vídeo' : 'Foto'} {fotoAtual + 1} de {fotos.length}</b>
              {foto.legenda}
            </p>
          )}
          {(fotos.length > 1 || docs.length > 0) && (
            <div className="miniaturas rola-x">
              {fotos.map((f, i) => (
                <button key={f.id} type="button" className={['mini', i === fotoAtual && 'is-sel'].filter(Boolean).join(' ')} aria-label={`Ver ${f.video ? 'vídeo' : 'foto'} ${i + 1}`} aria-pressed={i === fotoAtual} onClick={() => setFotoAtual(i)}>
                  <Placa foto={f} miniatura etiqueta={false} />
                </button>
              ))}
              {docs.map((d) => (
                <button key={d.id} type="button" className="mini mini-doc" aria-label={`Abrir documento: ${d.titulo}`} onClick={() => ir({ tela: 'documento', documentoId: d.id })}>
                  <Icone nome="documento" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pag-dir rola">
          <BlocoEditorial key={m.id} ano={m.dataTexto ?? m.ano} titulo={m.titulo} lede={m.lede} paragrafos={m.narrativa} citacao={citacao} />
          <div className="rel">
            {fotos.length > 0 && <Botao icone={nFotos ? 'foto' : 'video'} onClick={() => setLightbox(0)}>Ver {verTudo}</Botao>}
            {docs[0] && <Botao icone="documento" onClick={() => ir({ tela: 'documento', documentoId: docs[0].id })}>{docs.length > 1 ? 'Ler os documentos' : 'Ler o documento'}</Botao>}
          </div>
          <p className="fonte-marco">Fonte: {m.fonte.descricao}. Período: {periodo(m.periodoId)?.titulo}.</p>
        </div>
      </div>

      <div className="navpe">
        <Botao icone="voltar" onClick={voltar}>Voltar à linha do tempo</Botao>
        <Progresso rotulo="Marco" atual={pos + 1} total={todos.length} />
        <Botao icone="voltar" disabled={!anterior} onClick={() => anterior && irPara(anterior.id)}>{anterior ? String(anterior.ano) : 'Primeiro'}</Botao>
        <Botao variante="tinta" icone="avancar" iconeDepois disabled={!proximo} onClick={() => proximo && irPara(proximo.id)}>{proximo ? String(proximo.ano) : 'Último'}</Botao>
      </div>

    </TelaClara>
  );
}