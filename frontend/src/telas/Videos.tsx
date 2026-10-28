/**
 * Aba Vídeos: um vídeo em destaque (área grande, play, tipo, duração, título e descrição) e, ao
 * lado, a lista com os demais. Tocar em qualquer um abre o player em tela cheia.
 */
import { Icone } from '../componentes/Icone';
import { Imagem, tom } from '../componentes/Imagem';
import { duracao } from '../dados/regras';
import type { Video } from '../dados/tipos';

interface Props {
  videos: Video[];
  destaque: Video | undefined;
  aoAbrir: (id: number) => void;
}

function Play({ tamanho }: { tamanho: number }) {
  return (
    <span className="tt-play" style={{ width: tamanho, height: tamanho }} aria-hidden="true">
      <span style={{ marginLeft: Math.round(tamanho / 14) }}><Icone nome="play" tamanho={Math.round(tamanho / 2.6)} /></span>
    </span>
  );
}

function Capa({ v, grande }: { v: Video; grande?: boolean }) {
  if (v.capa) return <Imagem src={v.capa} alt="" semente={v.id} />;
  const t = tom(v.id + 2);
  const fundo = grande
    ? 'radial-gradient(circle at 50% 45%, #B6A88F, #7C7265 70%, #4E4842)'
    : `linear-gradient(135deg, ${t}, #5E574E)`;
  return <span className="tt-capa-vazia" style={{ background: fundo }} />;
}

export function Videos({ videos, destaque, aoAbrir }: Props) {
  if (!destaque) return <p className="tt-vazio entra">Esta sala ainda não tem vídeos.</p>;
  const outros = videos.filter((v) => v.id !== destaque.id);
  return (
    <div className="tt-videos entra">
      <button type="button" className="tt-destaque tt-cartao" onClick={() => aoAbrir(destaque.id)} aria-label={`Assistir: ${destaque.titulo}`}>
        <span className="tt-destaque__tela">
          <Capa v={destaque} grande />
          <Play tamanho={92} />
        </span>
        <span className="tt-destaque__meta">
          <small className="num">{destaque.tipo.toUpperCase()}{destaque.duracao ? ` · ${duracao(destaque.duracao)}` : ''}</small>
          <b className="serif">{destaque.titulo}</b>
          {destaque.descricao && <span>{destaque.descricao}</span>}
        </span>
      </button>

      <div className="tt-vlista">
        <div className="tt-vlista__rot">MAIS VÍDEOS DESTA SALA · {videos.length}</div>
        <div className="tt-vlista__itens rola">
          {outros.map((v) => (
            <button key={v.id} type="button" className="tt-vitem tt-cartao" onClick={() => aoAbrir(v.id)} aria-label={`Assistir: ${v.titulo}`}>
              <span className="tt-vitem__mini">
                <Capa v={v} />
                <Play tamanho={38} />
                {v.duracao ? <span className="tt-vitem__dur num">{duracao(v.duracao)}</span> : null}
              </span>
              <span className="tt-vitem__txt">
                <small>{v.tipo.toUpperCase()}</small>
                <b className="serif">{v.titulo}</b>
                {v.descricao && <span>{v.descricao}</span>}
              </span>
            </button>
          ))}
          {!outros.length && <p className="tt-vlista__vazia">Só este vídeo por enquanto.</p>}
        </div>
      </div>
    </div>
  );
}
