import { BookOpen, ChevronRight, Film, Images } from "lucide-react";
import { Link } from "react-router";
import { Divisor, Logo, Louro } from "../components/Ornamentos";
import { useTotem } from "../hooks/useTotem";

export function Inicio() {
  const { data } = useTotem();
  const periodos = data?.periodos ?? [];
  const nFotos = periodos.reduce((s, p) => s + p.fotos.length, 0);
  const nVideos = data?.videos.length ?? 0;
  const anos = periodos.map((p) => p.ano);
  const faixa = anos.length ? `${Math.min(...anos)} — ${Math.max(...anos)}` : "";

  const secoes = [
    {
      para: "/historia", titulo: "História", Icone: BookOpen,
      texto: "A linha do tempo da instituição, marco a marco.",
      conta: periodos.length ? `${periodos.length} marcos` : "",
    },
    {
      para: "/fotos", titulo: "Fotos", Icone: Images,
      texto: "Imagens do acervo organizadas por período.",
      conta: nFotos ? `${nFotos} fotos` : "",
    },
    {
      para: "/videos", titulo: "Vídeos", Icone: Film,
      texto: "Depoimentos, eventos e registros institucionais.",
      conta: nVideos ? `${nVideos} vídeos` : "",
    },
  ];

  return (
    <main className="inicio">
      <div className="inicio__cabeca entrar">
        <Logo variante="suave" className="inicio__logo" />
        <div className="inicio__titulo-linha">
          <Louro className="inicio__louro" />
          <div>
            <h1 className="inicio__titulo">{data?.config.titulo ?? "Memorial"}</h1>
            <Divisor className="inicio__divisor" />
            <p className="inicio__sub">{data?.config.subtitulo ?? "Nossa história, nosso legado."}</p>
            {faixa && <p className="inicio__faixa">{faixa}</p>}
          </div>
          <Louro className="inicio__louro" espelhado />
        </div>
      </div>

      <nav className="inicio__secoes" aria-label="Seções do memorial">
        {secoes.map(({ para, titulo, Icone, texto, conta }, idx) => (
          <Link key={para} to={para} className="cartao-secao entrar" style={{ animationDelay: `${120 + idx * 90}ms` }}>
            <span className="cartao-secao__icone"><Icone size={40} strokeWidth={1.4} aria-hidden /></span>
            <span className="cartao-secao__titulo">{titulo}</span>
            <span className="cartao-secao__texto">{texto}</span>
            <span className="cartao-secao__rodape">
              <span className="cartao-secao__conta">{conta}</span>
              <span className="cartao-secao__seta"><ChevronRight size={30} strokeWidth={1.8} aria-hidden /></span>
            </span>
          </Link>
        ))}
      </nav>

      <p className="inicio__dica entrar" style={{ animationDelay: "450ms" }}>
        Toque em uma seção para começar
      </p>
    </main>
  );
}
