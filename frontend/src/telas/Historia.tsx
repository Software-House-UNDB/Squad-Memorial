/**
 * Aba História: linha horizontal com degradê dourado, marcos alternando acima e abaixo.
 * Tocar no ano, no ponto ou no cartão troca o destaque. Até 10 marcos cabem na tela (8 é o ideal);
 * acima disso a linha rola para os lados, com encaixe em cada marco.
 */
import { Icone } from '../componentes/Icone';
import type { Marco } from '../dados/tipos';

const LARGURA = 1496; // área útil do palco (1600 − 2 × 52)
const MARGEM = 150;
const MAX_SEM_ROLAGEM = 10;
const PASSO_ROLAGEM = 150;

interface Props {
  marcos: Marco[];
  destaqueId: number | null;
  aoEscolher: (id: number) => void;
}

export function Historia({ marcos, destaqueId, aoEscolher }: Props) {
  if (!marcos.length) {
    return <p className="tt-vazio entra">Esta sala ainda não tem marcos na linha do tempo.</p>;
  }
  const n = marcos.length;
  const rola = n > MAX_SEM_ROLAGEM;
  const passo = rola ? PASSO_ROLAGEM : n > 1 ? (LARGURA - 2 * MARGEM) / (n - 1) : 0;
  const largura = rola ? 2 * MARGEM + (n - 1) * passo : LARGURA;
  // cartões do mesmo lado ficam a 2 passos de distância
  const larguraCartao = Math.min(300, Math.max(240, 2 * passo - 28));
  const ativo = marcos.find((m) => m.id === destaqueId) ?? marcos.find((m) => m.destaque) ?? marcos[0];

  return (
    <div className={['tt-hist entra', rola && 'tt-hist--rola'].filter(Boolean).join(' ')}>
      <div className="tt-hist__trilho" style={{ width: largura }}>
        <span className="tt-hist__linha" aria-hidden="true" />
        {marcos.map((m, i) => {
          const x = n === 1 ? largura / 2 : MARGEM + i * passo;
          const acima = i % 2 === 0;
          const on = m.id === ativo.id;
          const escolher = () => aoEscolher(m.id);
          return (
            <div key={m.id} className={['tt-marco', acima ? 'tt-marco--acima' : 'tt-marco--abaixo', on && 'is-ativo'].filter(Boolean).join(' ')} style={{ left: x }}>
              <button type="button" className="tt-marco__ponto" onClick={escolher} aria-label={`${m.ano}: ${m.titulo}`} aria-pressed={on}>
                <i />
              </button>
              <button type="button" className="tt-marco__ano serif num" onClick={escolher} tabIndex={-1} aria-hidden="true">
                {m.ano}
              </button>
              <button type="button" className="tt-marco__cartao tt-cartao" style={{ width: larguraCartao }} onClick={escolher} aria-pressed={on}>
                <span className="tt-marco__icone"><Icone nome={m.icone} tamanho={20} /></span>
                <span className="tt-marco__titulo serif">{m.titulo}</span>
                <span className="tt-marco__desc">{m.descricao}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
