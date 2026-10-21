import type { ReactNode } from "react";
import { Divisor, Louro } from "./Ornamentos";

export function TituloSecao({ titulo, subtitulo, icone }: {
  titulo: string; subtitulo: string; icone?: ReactNode;
}) {
  return (
    <div className="titulo-secao">
      <Louro className="titulo-secao__louro" />
      <div className="titulo-secao__centro">
        {icone && <div className="titulo-secao__icone">{icone}</div>}
        <h1 className="titulo-secao__titulo">{titulo}</h1>
        <Divisor className="titulo-secao__divisor" />
        <p className="titulo-secao__sub">{subtitulo}</p>
      </div>
      <Louro className="titulo-secao__louro" espelhado />
    </div>
  );
}
