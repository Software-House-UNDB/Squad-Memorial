/** Salas 1 a 4: abas História, Fotos e Vídeos, com a foto ampliada e o player em overlay. */
import { useMemo, type ReactNode } from 'react';
import { Icone } from '../componentes/Icone';
import { OverlayFoto } from '../componentes/OverlayFoto';
import { OverlayVideo } from '../componentes/OverlayVideo';
import { periodosDasFotos } from '../dados/regras';
import type { Foto, RespostaSala } from '../dados/tipos';
import { Fotos, FOTOS_POR_PAGINA } from './Fotos';
import { Historia } from './Historia';
import { Moldura, Titulo } from './Moldura';
import type { Aba, PropsSala } from './estado';
import { Videos } from './Videos';

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: 'historia', rotulo: 'História', icone: 'clock' },
  { id: 'fotos', rotulo: 'Fotos', icone: 'image' },
  { id: 'videos', rotulo: 'Vídeos', icone: 'video' },
];

export function SalaConteudo({ estado: st, mudar, dados }: PropsSala & { dados: RespostaSala }) {
  const { sala, config } = dados;

  const marcos = useMemo(() => [...dados.marcos].sort((a, b) => a.ano - b.ano), [dados.marcos]);
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

  const dica: ReactNode = {
    historia: <><b>Toque em um ano</b> ou em um cartão para ver o marco em destaque{marcos.length > 10 ? ' · arraste para os lados' : ''}</>,
    fotos: <><b>Toque em uma foto</b> para ampliar · escolha o período na lista à esquerda</>,
    videos: <><b>Toque em um vídeo</b> para assistir em tela cheia</>,
  }[st.aba];

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
  } else if (ov?.tipo === 'video') {
    const v = videos.find((x) => x.id === ov.id);
    if (v) sobre = <OverlayVideo video={v} comSom={config.videosComSom} aoFechar={() => mudar({ overlay: null })} />;
  }

  return (
    <Moldura sala={sala} dica={dica} exemplo={dados.demonstrativo} sobre={sobre}>
      <Titulo sala={sala} />
      <div className="tt-abas" role="tablist" aria-label="Conteúdo da sala">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            aria-selected={st.aba === a.id}
            className={['tt-aba', st.aba === a.id && 'is-ativa'].filter(Boolean).join(' ')}
            onClick={() => mudar({ aba: a.id, overlay: null })}
          >
            <Icone nome={a.icone} tamanho={20} /> {a.rotulo}
          </button>
        ))}
      </div>
      {st.aba === 'historia' && <Historia marcos={marcos} destaqueId={st.marcoId} aoEscolher={(id) => mudar({ marcoId: id })} />}
      {st.aba === 'fotos' && (
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
      {st.aba === 'videos' && (
        <Videos videos={videos} destaque={videoDestaque} aoAbrir={(id) => mudar({ videoId: id, overlay: { tipo: 'video', id } })} />
      )}
    </Moldura>
  );
}
