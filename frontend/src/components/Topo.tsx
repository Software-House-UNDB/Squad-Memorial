import { BookOpen, Film, House, Images } from "lucide-react";
import { NavLink } from "react-router";
import { useTotem } from "../hooks/useTotem";
import { Logo } from "./Ornamentos";

const ABAS = [
  { para: "/historia", rotulo: "História", Icone: BookOpen },
  { para: "/fotos", rotulo: "Fotos", Icone: Images },
  { para: "/videos", rotulo: "Vídeos", Icone: Film },
];

export function Topo() {
  const { data } = useTotem();
  return (
    <header className="topo">
      <NavLink to="/" className="topo__marca" aria-label="Voltar ao início">
        <Logo variante="suave" className="topo__logo" decorativo />
        <span className="topo__filete" aria-hidden />
        <span className="topo__nome">{data?.config.titulo ?? "Memorial"}</span>
      </NavLink>
      <nav className="topo__abas" aria-label="Seções">
        {ABAS.map(({ para, rotulo, Icone }) => (
          <NavLink key={para} to={para} className="topo__aba">
            <Icone size={22} strokeWidth={1.6} aria-hidden />
            <span>{rotulo}</span>
          </NavLink>
        ))}
        <NavLink to="/" className="topo__aba topo__aba--inicio" end>
          <House size={22} strokeWidth={1.6} aria-hidden />
          <span>Início</span>
        </NavLink>
      </nav>
    </header>
  );
}
