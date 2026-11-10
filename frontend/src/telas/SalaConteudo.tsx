/**
 * Um espaço do tour: abas Apresentação, Linha do tempo, Marcos, Fotos e Vídeos, com a foto
 * ampliada e o player em overlay. A Sala 06 (tipo "fechamento") ganha a aba Colegas, com a busca
 * de ex-alunos e o perfil (check-in feito pelo celular do visitante).
 */
import { useMemo, type ReactNode } from 'react';
import { OverlayCheckin } from '../componentes/OverlayCheckin';
import { OverlayFoto } from '../componentes/OverlayFoto';
import { OverlayVideo } from '../componentes/OverlayVideo';
import { useAluno, useAlunos } from '../dados/alunos';
import { apresentacaoDaSala, decadasDaSala, marcosOrdenados, periodosDasFotos } from '../dados/regras';
import type { Foto, RespostaSala } from '../dados/tipos';
import { AbasSala, abaValida } from './AbasSala';
import { Apresentacao } from './Apresentacao';
import { Colegas } from './Colegas';
import { Fotos, FOTOS_POR_PAGINA } from './Fotos';
import { LinhaDoTempo } from './LinhaDoTempo';
import { Marcos } from './Marcos';
import { Moldura, Titulo } from './Moldura';
import type { Aba, PropsSala } from './estado';
import { Videos } from './Videos';
import './sala5.css';

export function SalaConteudo({ estado: st, mudar, dados }: PropsSala & { dados: RespostaSala }) {
  const { sala, config } = dados;
  const aba = abaValida(sala, st.aba);
  const nasColegas = aba === 'colegas';
  const naBusca = nasColegas && (st.visao === 'busca' || st.perfilId === null);
  const noPerfil = nasColegas && !naBusca;

  const marcos = useMemo(() => marcosOrdenados(dados.marcos), [dados.marcos]);
  const decadas = useMemo(() => decadasDaSala(dados, new Date().getFullYear()), [dados]);
  const apresentacao = apresentacaoDaSala(dados);
  // a moldura provisória de uma foto sem imagem usa os ícones da própria sala
  const iconeDaFoto = useMemo(() => {
    const icones = marcos.map((m) => m.icone);
    return (f: Foto) => (icones.length ? icones[Math.abs(f.id) % icones.length] : 'image');
  }, [marcos]);
  const periodos = useMemo(
    () => periodosDasFotos(dados.fotos, config.anoInicial, new Date().getFullYear()),
    [dados.fotos, config.anoInicial],
  );
  const periodo = periodos.find((p) => p.inicio === st.periodo) ?? periodos[0];
  const videos = dados.videos;
  const videoDestaque = videos.find((v) => v.id === st.videoId) ?? videos.find((v) => v.destaque) ?? videos[0];

  // busca de ex-alunos: só consulta o servidor quando a aba Colegas está na busca
  const busca = useAlunos(
    { q: st.q, ano: st.ano, decada: st.decada, pagina: st.paginaBusca },
    naBusca && st.overlay === null,
  );
  // perfil aberto: carregado aqui (e não no Perfil) para a foto ampliada também enxergar as fotos dele
  const aluno = useAluno(noPerfil ? st.perfilId : null);
  const urlCheckin = config.urlCheckin || `${location.origin}/checkin`;

  const dicas: Record<Aba, ReactNode> = {
    apresentacao: <><b>Toque em uma aba</b> para explorar este espaço</>,
    linha: <><b>Toque em uma década</b> para ver o resumo e os acontecimentos</>,
    marcos: <><b>Toque em um marco</b> para ver o texto explicativo</>,
    fotos: <><b>Toque em uma foto</b> para ampliar · escolha o período na lista à esquerda</>,
    videos: <><b>Toque em um vídeo</b> para assistir em tela cheia</>,
    colegas: naBusca
      ? <><b>Busca sem acento e por parte do nome</b> · ex.: “joao sil” encontra João Pedro da Silva Sales</>
      : <>Mostra só o que a pessoa autorizou no check-in · <b>o e-mail nunca aparece</b></>,
  };

  const ov = st.overlay;
  let sobre: ReactNode = null;
  if (ov?.tipo === 'foto' && periodo?.fotos.length) {
    const indice = Math.min(ov.indice, periodo.fotos.length - 1);
    sobre = (
      <OverlayFoto
        fotos={periodo.fotos}
        indice={indice}
        icone={iconeDaFoto}
        aoMudar={(i) => mudar({ overlay: { tipo: 'foto', indice: i } })}
        // ao fechar, a grade mostra a página da última foto vista
        aoFechar={() => mudar({ overlay: null, pagina: Math.floor(indice / FOTOS_POR_PAGINA) })}
      />
    );
  } else if (ov?.tipo === 'fotoPerfil' && noPerfil && aluno.perfil?.fotos.length) {
    const { nome, fotos: doAluno } = aluno.perfil;
    // as fotos do aluno viram Foto para usar o mesmo overlay das salas (a posição é o id)
    const fotosAluno: Foto[] = doAluno.map((f, i) => ({
      id: i,
      ano: f.ano ?? 0,
      legenda: f.legenda,
      credito: '',
      alt: f.legenda || `Foto de ${nome}`,
      src: f.src ?? f.miniatura,
      miniatura: f.miniatura,
      largura: null,
      altura: null,
    }));
    sobre = (
      <OverlayFoto
        fotos={fotosAluno}
        indice={Math.min(ov.indice, fotosAluno.length - 1)}
        icone={() => 'users'}
        aoMudar={(i) => mudar({ overlay: { tipo: 'fotoPerfil', indice: i } })}
        aoFechar={() => mudar({ overlay: null })}
      />
    );
  } else if (ov?.tipo === 'video') {
    const v = videos.find((x) => x.id === ov.id);
    if (v) sobre = <OverlayVideo video={v} comSom={config.videosComSom} aoFechar={() => mudar({ overlay: null })} />;
  } else if (ov?.tipo === 'checkin' && nasColegas) {
    sobre = <OverlayCheckin url={urlCheckin} aoFechar={() => mudar({ overlay: null })} />;
  }

  // o teclado virtual ocupa a parte de baixo: as abas saem de cena enquanto ele está aberto
  const mostrarAbas = !noPerfil && !(naBusca && st.teclado);

  return (
    <Moldura
      sala={sala}
      dica={dicas[aba]}
      aviso={naBusca && busca.offline && busca.pagina ? 'Sem conexão: mostrando o último resultado' : undefined}
      sobre={sobre}
    >
      {!nasColegas && <Titulo sala={sala} />}
      {mostrarAbas && <AbasSala sala={sala} aba={aba} aoEscolher={(a) => mudar({ aba: a, overlay: null, teclado: false })} />}
      {aba === 'apresentacao' && <Apresentacao apresentacao={apresentacao} semente={sala.numero} aoIr={(a) => mudar({ aba: a, overlay: null })} />}
      {aba === 'linha' && <LinhaDoTempo decadas={decadas} indice={st.linha} aoEscolher={(linha) => mudar({ linha })} />}
      {aba === 'marcos' && <Marcos marcos={marcos} aberto={st.marcoAberto} aoAlternar={(marcoAberto) => mudar({ marcoAberto })} />}
      {aba === 'fotos' && (
        <Fotos
          periodos={periodos}
          periodo={periodo}
          pagina={st.pagina}
          icone={iconeDaFoto}
          aoPeriodo={(inicio) => mudar({ periodo: inicio, pagina: 0 })}
          aoPagina={(p) => mudar({ pagina: Math.max(0, p) })}
          aoAbrir={(indice) => mudar({ overlay: { tipo: 'foto', indice } })}
        />
      )}
      {aba === 'videos' && (
        <Videos videos={videos} destaque={videoDestaque} aoAbrir={(id) => mudar({ videoId: id, overlay: { tipo: 'video', id } })} />
      )}
      {nasColegas && <Colegas estado={st} mudar={mudar} dados={dados} busca={busca} aluno={aluno} />}
    </Moldura>
  );
}
