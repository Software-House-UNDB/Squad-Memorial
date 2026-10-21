import type { ReactNode } from "react";

/** Seção sem conteúdo: o ícone da própria seção, um filete e o aviso. */
export function Vazio({ texto, icone }: { texto: string; icone: ReactNode }) {
  return (
    <div className="vazio">
      <span className="vazio__icone" aria-hidden>{icone}</span>
      <span className="vazio__filete" aria-hidden />
      <p>{texto}</p>
    </div>
  );
}
