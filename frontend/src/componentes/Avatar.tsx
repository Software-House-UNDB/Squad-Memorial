/** Avatar de ex-aluno: a foto de perfil, ou as iniciais em serif sobre grafite. */
import { useState } from 'react';
import { iniciais } from '../dados/regras';

export function Avatar({ nome, foto, tamanho = 52 }: { nome: string; foto: string | null; tamanho?: number }) {
  const [falhou, setFalhou] = useState(false);
  const estilo = { width: tamanho, height: tamanho };
  if (foto && !falhou) {
    return <img className="m-av m-av--foto" style={estilo} src={foto} alt="" loading="lazy" onError={() => setFalhou(true)} />;
  }
  return (
    <span className="m-av m-av--ini serif" style={{ ...estilo, fontSize: Math.max(14, Math.round(tamanho * 0.4)) }} aria-hidden="true">
      {/* avatar pequeno (pilha de colegas): só a primeira inicial, para não ser cortada pelo vizinho */}
      {tamanho < 36 ? iniciais(nome).slice(0, 1) : iniciais(nome)}
    </span>
  );
}
