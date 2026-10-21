import { BookOpen, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router";
import { IconePeriodo } from "../components/IconePeriodo";
import { TituloSecao } from "../components/TituloSecao";
import { Vazio } from "../components/Vazio";
import { useTotem } from "../hooks/useTotem";

export function Historia() {
  const { data } = useTotem();
  const navegar = useNavigate();
  const periodos = data?.periodos ?? [];

  return (
    <div className="secao">
      <TituloSecao titulo="História" subtitulo="Linha do tempo" icone={<BookOpen size={34} strokeWidth={1.4} />} />

      {periodos.length === 0 ? (
        <Vazio texto="A linha do tempo ainda está sendo preparada." />
      ) : (
        <ol className="linha-tempo">
          {periodos.map((p, idx) => {
            const temFotos = p.fotos.length > 0;
            return (
              <li key={p.id} className="marco entrar" style={{ animationDelay: `${Math.min(idx, 8) * 70}ms` }}>
                <span className="marco__ano">{p.ano}</span>
                <span className="marco__no"><IconePeriodo icone={p.icone} size={30} /></span>
                <button
                  className="marco__cartao"
                  onClick={() => temFotos && navegar(`/fotos?periodo=${p.id}`)}
                  disabled={!temFotos}
                >
                  <span className="marco__titulo">{p.titulo}.</span>
                  <span className="marco__desc">{p.descricao}</span>
                  {temFotos && (
                    <span className="marco__link">
                      Ver {p.fotos.length} {p.fotos.length === 1 ? "foto" : "fotos"}
                      <ChevronRight size={20} aria-hidden />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
