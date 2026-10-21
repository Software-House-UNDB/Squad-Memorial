import { Film, Play } from "lucide-react";
import { useState } from "react";
import { PlayerVideo } from "../components/PlayerVideo";
import { TituloSecao } from "../components/TituloSecao";
import { Vazio } from "../components/Vazio";
import { useTotem } from "../hooks/useTotem";
import type { Video } from "../lib/api";
import { duracao } from "../lib/format";

function tituloComAno(v: Video) {
  return v.ano && !v.titulo.includes(String(v.ano)) ? `${v.titulo} — ${v.ano}` : v.titulo;
}

export function Videos() {
  const { data } = useTotem();
  const [filtro, setFiltro] = useState<string>("todos");
  const [tocando, setTocando] = useState<Video | null>(null);

  const videos = data?.videos ?? [];
  // só mostra filtros de categorias que têm vídeo
  const categorias = (data?.categorias_video ?? []).filter((c) => videos.some((v) => v.categoria === c.valor));
  const lista = filtro === "todos" ? videos : videos.filter((v) => v.categoria === filtro);

  return (
    <div className="secao">
      <TituloSecao titulo="Vídeos" subtitulo="Depoimentos e registros históricos" icone={<Film size={34} strokeWidth={1.4} />} />

      {videos.length === 0 ? (
        <Vazio texto="Os vídeos do memorial estarão disponíveis em breve." icone={<Film size={40} strokeWidth={1.4} />} />
      ) : (
        <>
          {categorias.length > 1 && (
            <div className="filtros" role="tablist" aria-label="Filtrar vídeos">
              {[{ valor: "todos", nome: "Todos" }, ...categorias].map((c) => (
                <button
                  key={c.valor}
                  role="tab"
                  aria-selected={filtro === c.valor}
                  className={`filtro ${filtro === c.valor ? "is-ativo" : ""}`}
                  onClick={() => setFiltro(c.valor)}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          )}

          <div className="grade-videos" key={filtro}>
            {lista.map((v, idx) => (
              <button
                key={v.id}
                className="cartao-video entrar"
                style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
                onClick={() => setTocando(v)}
              >
                <span className="cartao-video__capa">
                  {v.capa ? <img src={v.capa} alt="" loading="lazy" draggable={false} /> : <span className="cartao-video__sem-capa" />}
                  <span className="cartao-video__play"><Play size={34} fill="currentColor" /></span>
                  {v.duracao_segundos ? <span className="cartao-video__duracao">{duracao(v.duracao_segundos)}</span> : null}
                </span>
                <span className="cartao-video__titulo">{tituloComAno(v)}</span>
                {v.descricao && <span className="cartao-video__desc">{v.descricao}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {tocando && <PlayerVideo video={tocando} aoFechar={() => setTocando(null)} />}
    </div>
  );
}
