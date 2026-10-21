import { Brasao } from "./Ornamentos";

export function Vazio({ texto }: { texto: string }) {
  return (
    <div className="vazio">
      <Brasao tamanho={56} className="vazio__brasao" />
      <p>{texto}</p>
    </div>
  );
}
