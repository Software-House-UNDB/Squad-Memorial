/**
 * Sala 5 (fechamento): busca de ex-alunos e perfil, alimentados pelos check-ins.
 * A busca é feita no servidor; sem rede, a tela mantém o último resultado e avisa no rodapé.
 */
import { OverlayCheckin } from '../componentes/OverlayCheckin';
import { useAlunos } from '../dados/alunos';
import type { Conexao } from '../dados/Dados';
import type { RespostaSala } from '../dados/tipos';
import { Busca } from './Busca';
import type { PropsSala } from './estado';
import { Moldura } from './Moldura';
import { Perfil } from './Perfil';
import './sala5.css';

export function SalaFechamento({ estado: st, mudar, dados }: PropsSala & { dados: RespostaSala; conexao: Conexao }) {
  const { sala, config } = dados;
  const naBusca = st.visao === 'busca' || st.perfilId === null;
  const busca = useAlunos(
    { q: st.q, ano: st.ano, decada: st.decada, pagina: st.paginaBusca },
    naBusca && st.overlay === null,
  );
  const urlCheckin = config.urlCheckin || `${location.origin}/checkin`;

  const dica = naBusca
    ? <><b>Busca sem acento e por parte do nome</b> · ex.: “joao sil” encontra João Pedro da Silva Sales</>
    : <>Mostra só o que a pessoa autorizou no check-in · <b>o e-mail nunca aparece</b></>;

  return (
    <Moldura
      sala={sala}
      dica={dica}
      exemplo={dados.demonstrativo}
      aviso={naBusca && busca.offline && busca.pagina ? 'Sem conexão: mostrando o último resultado' : undefined}
      sobre={st.overlay?.tipo === 'checkin' && <OverlayCheckin url={urlCheckin} aoFechar={() => mudar({ overlay: null })} />}
    >
      {naBusca || st.perfilId === null ? (
        <Busca
          sala={sala}
          estado={st}
          mudar={mudar}
          busca={busca}
          anoInicial={config.anoInicial}
          aoCheckin={() => mudar({ overlay: { tipo: 'checkin' }, teclado: false })}
        />
      ) : (
        <Perfil
          key={st.perfilId}
          id={st.perfilId}
          aoVoltar={() => mudar({ visao: 'busca', perfilId: null })}
          aoAbrir={(id) => mudar({ perfilId: id })}
        />
      )}
    </Moldura>
  );
}
