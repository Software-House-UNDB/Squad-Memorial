/**
 * Topo persistente das telas claras: marca (volta ao Sumário), trilha de localização
 * e as abas das áreas. A aba Início tem caixa própria.
 */
import logoCinza from '../../assets/undb-logo-cinza.png';
import { Icone, type NomeIcone } from '../../icones/Icone';
import { useNavegacao } from '../../navegacao/Navegacao';
import type { Rota } from '../../navegacao/rotas';
import './topo.css';

export type IdAba = 'inicio' | 'linha-do-tempo' | 'pessoas' | 'acervo' | 'memorias';

const abas: { id: IdAba; rotulo: string; icone: NomeIcone; rota: Rota }[] = [
  { id: 'inicio', rotulo: 'Início', icone: 'inicio', rota: { tela: 'sumario' } },
  { id: 'linha-do-tempo', rotulo: 'Linha do tempo', icone: 'tempo', rota: { tela: 'linha-do-tempo' } },
  { id: 'pessoas', rotulo: 'Pessoas', icone: 'pessoas', rota: { tela: 'pessoas' } },
  { id: 'acervo', rotulo: 'Acervo', icone: 'foto', rota: { tela: 'galeria' } },
  { id: 'memorias', rotulo: 'Memórias', icone: 'memorias', rota: { tela: 'memorias' } },
];

export interface ItemTrilha { rotulo: string; aoTocar?: () => void }

export function Topo({ aba, trilha = [] }: { aba?: IdAba; trilha?: ItemTrilha[] }) {
  const { ir, inicio, atual } = useNavegacao();

  const tocarAba = (id: IdAba, rota: Rota) => {
    if (id === 'inicio') return inicio();
    if (atual?.rota.tela === rota.tela) return; // já está nela
    ir(rota);
  };

  return (
    <header className="m-topo">
      <button type="button" className="m-marca" onClick={inicio} aria-label="UNDB Memorial, voltar ao Sumário">
        <img src={logoCinza} alt="UNDB Centro Universitário" />
        <span className="fil" aria-hidden="true" />
        <b>MEMORIAL</b>
      </button>

      {trilha.length > 0 && (
        <nav className="m-trilha" aria-label="Você está em">
          {trilha.map((t, i) => {
            const ultimo = i === trilha.length - 1;
            return (
              <span key={i} className="passo">
                <Icone nome="chevron" />
                {ultimo ? <b>{t.rotulo}</b> : t.aoTocar ? <button type="button" onClick={t.aoTocar}>{t.rotulo}</button> : <span>{t.rotulo}</span>}
              </span>
            );
          })}
        </nav>
      )}

      <nav className="m-abas" aria-label="Áreas do memorial">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            className={['m-aba', a.id === 'inicio' && 'm-aba--inicio', aba === a.id && 'is-sel'].filter(Boolean).join(' ')}
            aria-current={aba === a.id ? 'page' : undefined}
            onClick={() => tocarAba(a.id, a.rota)}
          >
            <Icone nome={a.icone} />
            {a.rotulo}
          </button>
        ))}
      </nav>
    </header>
  );
}