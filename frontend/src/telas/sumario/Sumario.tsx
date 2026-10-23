/**
 * Tela 2 · Sumário. A página inicial é um índice de livro: a prancha da Linha do tempo em destaque
 * e as demais áreas em linhas de 118px com medalha, nome, descrição, contagem e seta de tinta.
 * Áreas sem dados não aparecem; contagens vêm do acervo.
 */
import { areasDoSumario } from '../../dados/areas';
import { foto, periodosOrdenados } from '../../dados/acervo';
import { useNavegacao } from '../../navegacao/Navegacao';
import { TelaClara } from '../../componentes/layout/TelaClara';
import { Botao, SetaToque } from '../../componentes/botoes/Botao';
import { Medalha } from '../../componentes/editorial/Editorial';
import { Placa } from '../../componentes/acervo/Placa';
import { TituloArea } from '../../componentes/ornamentos/Ornamentos';
import './sumario.css';

export function Sumario() {
  const { ir, fecharLivro } = useNavegacao();
  const areas = areasDoSumario();
  const destaque = foto(periodosOrdenados()[1]?.fotoId ?? periodosOrdenados()[0]?.fotoId);

  return (
    <TelaClara nome="sumario" aba="inicio" onda>
      <div className="sumario-corpo">
        <button type="button" className="destaque" onClick={() => ir({ tela: 'linha-do-tempo' })}>
          <Placa foto={destaque} etiqueta={false} className="destaque-foto" />
          <span className="destaque-etiqueta">{destaque?.demo ? 'Foto do acervo · demonstrativa' : 'Foto do acervo'}</span>
          <span className="faixa">
            <span className="titulo">Linha do tempo</span>
            <span className="texto">Percorra os marcos da UNDB, década por década, com fotos e documentos.</span>
            <span className="m-btn m-btn--pri m-btn--g" aria-hidden="true"><span>Abrir a linha do tempo</span></span>
          </span>
        </button>

        <div className="indice">
          <div className="sum-cab">
            <TituloArea>Sumário</TituloArea>
            <i>Toque em uma área para explorar.</i>
          </div>
          <ul>
            {areas.map((a) => (
              <li key={a.id}>
                <button type="button" className="item" onClick={() => ir(a.rota)}>
                  <Medalha icone={a.icone} tamanho={68} />
                  <span className="txt"><b>{a.nome}</b><span>{a.descricao}</span></span>
                  {a.contagem && <em>{a.contagem}</em>}
                  <SetaToque />
                </button>
              </li>
            ))}
          </ul>
          <div className="fechar-livro">
            <Botao variante="sec" icone="livro" onClick={fecharLivro}>Fechar o livro</Botao>
          </div>
        </div>
      </div>
    </TelaClara>
  );
}