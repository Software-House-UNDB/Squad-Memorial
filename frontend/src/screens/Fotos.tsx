import { Images } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { IconePeriodo } from "../components/IconePeriodo";
import { Lightbox } from "../components/Lightbox";
import { TituloSecao } from "../components/TituloSecao";
import { Vazio } from "../components/Vazio";
import { useTotem } from "../hooks/useTotem";
import type { Periodo } from "../lib/api";

export function Fotos() {
  const { data } = useTotem();
  const [params] = useSearchParams();
  const alvo = Number(params.get("periodo")) || null;
  const [aberto, setAberto] = useState<{ periodo: Periodo; indice: number } | null>(null);
  const refs = useRef(new Map<number, HTMLElement>());

  const periodos = (data?.periodos ?? []).filter((p) => p.fotos.length > 0);

  // Vindo da linha do tempo: rola até o período escolhido
  useEffect(() => {
    if (!alvo) return;
    const el = refs.current.get(alvo);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
  }, [alvo]);

  return (
    <div className="secao">
      <TituloSecao titulo="Fotos" subtitulo="Galeria por período histórico" icone={<Images size={34} strokeWidth={1.4} />} />

      {periodos.length === 0 ? (
        <Vazio texto="As fotos do acervo ainda estão sendo digitalizadas." />
      ) : (
        <div className="galeria">
          {periodos.map((p, idx) => (
            <section
              key={p.id}
              ref={(el) => { if (el) refs.current.set(p.id, el); }}
              className={`periodo entrar ${alvo === p.id ? "is-alvo" : ""}`}
              style={{ animationDelay: `${Math.min(idx, 6) * 70}ms` }}
              aria-label={`${p.ano}: ${p.titulo}`}
            >
              <span className="periodo__marca"><IconePeriodo icone={p.icone} size={22} /></span>
              <div className="periodo__cartao">
                <div className="periodo__info">
                  <h2 className="periodo__ano">{p.ano}</h2>
                  <p className="periodo__resumo">{p.resumo_galeria}</p>
                  <p className="periodo__qtd">{p.fotos.length} {p.fotos.length === 1 ? "foto" : "fotos"}</p>
                </div>
                <div className="periodo__fotos">
                  {p.fotos.map((f, i) => (
                    <button
                      key={f.id}
                      className="miniatura"
                      onClick={() => setAberto({ periodo: p, indice: i })}
                      aria-label={f.legenda || `Foto ${i + 1} de ${p.ano}`}
                    >
                      <img src={f.miniatura ?? ""} alt="" loading="lazy" draggable={false} />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {aberto && (
        <Lightbox
          fotos={aberto.periodo.fotos}
          inicio={aberto.indice}
          ano={aberto.periodo.ano}
          titulo={aberto.periodo.titulo}
          aoFechar={() => setAberto(null)}
        />
      )}
    </div>
  );
}
