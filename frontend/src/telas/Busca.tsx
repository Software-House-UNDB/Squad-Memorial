/**
 * Sala 5 · Busca: nome (teclado virtual), ano (só anos que existem no diretório) e década.
 * Ano e década se combinam: escolher um ano zera a década, e vice-versa. Mais de 12 resultados
 * ganham páginas com setas (nada é cortado em silêncio).
 */
import { useRef } from 'react';
import { Avatar } from '../componentes/Avatar';
import { Icone } from '../componentes/Icone';
import { TecladoVirtual } from '../componentes/TecladoVirtual';
import { quiosque } from '../config/quiosque';
import type { EstadoBusca } from '../dados/alunos';
import { decadas, rotuloDecada, trechos } from '../dados/regras';
import type { Sala } from '../dados/tipos';
import type { EstadoTotem } from './estado';
import { Titulo } from './Moldura';

interface Props {
  sala: Sala;
  estado: EstadoTotem;
  mudar: (p: Partial<EstadoTotem>) => void;
  busca: EstadoBusca;
  anoInicial: number;
  aoCheckin: () => void;
}

export function Busca({ sala, estado: st, mudar, busca, anoInicial, aoCheckin }: Props) {
  const campo = useRef<HTMLInputElement>(null);
  const p = busca.pagina;
  const chips = decadas(anoInicial, new Date().getFullYear());
  const anos = p?.anos ?? [];
  const total = p?.total ?? 0;
  const pagina = p?.pagina ?? 1;
  const paginas = p?.paginas ?? 1;
  const termo = st.q.trim();

  const filtrar = (f: Partial<EstadoTotem>) => mudar({ ...f, paginaBusca: 1 });
  const digitar = (q: string) => filtrar({ q: q.replace(/^\s+/, '').replace(/\s{2,}/g, ' ').slice(0, 60) });

  let resumo = `${total} ${total === 1 ? 'pessoa' : 'pessoas'}`;
  resumo += termo ? ` com “${termo}” no nome` : ' no Memorial';
  if (st.ano) resumo += ` · ${st.ano}`;
  else if (st.decada) resumo += ` · ${rotuloDecada(st.decada)}`;

  return (
    <div className={['tt-busca', st.teclado && 'tt-busca--teclado'].filter(Boolean).join(' ')}>
      <Titulo sala={sala} />
      <button type="button" className="tt-ck-btn" onClick={aoCheckin}>
        <Icone nome="qr" tamanho={22} cor="var(--dourado-texto)" /> Ainda não fez check-in?
      </button>

      <div className="tt-sbar">
        <label className={['tt-sin tt-cartao', st.teclado && 'is-ativo'].filter(Boolean).join(' ')}>
          <Icone nome="search" tamanho={26} cor="var(--dourado-texto)" />
          <input
            ref={campo}
            type="search"
            value={st.q}
            placeholder="Digite um nome"
            aria-label="Buscar colega por nome"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode={quiosque.tecladoNativo ? 'search' : 'none'}
            onFocus={() => !st.teclado && mudar({ teclado: true })}
            onPointerDown={() => !st.teclado && mudar({ teclado: true })}
            onChange={(e) => digitar(e.target.value)}
          />
          {st.q && (
            <button type="button" className="tt-sin__limpar" onClick={() => digitar('')} aria-label="Limpar busca">
              <Icone nome="x" tamanho={20} />
            </button>
          )}
        </label>
        <label className="tt-sel tt-cartao">
          <small>ANO</small>
          <select
            value={st.ano ?? ''}
            aria-label="Filtrar por ano"
            onChange={(e) => filtrar({ ano: e.target.value ? Number(e.target.value) : null, decada: null })}
          >
            <option value="">Qualquer ano</option>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <Icone nome="chev" tamanho={22} className="tt-sel__seta" />
        </label>
      </div>

      <div className="tt-chips" role="group" aria-label="Por década">
        <span>Por década</span>
        <button type="button" className={['tt-chip', !st.decada && 'is-ativo'].filter(Boolean).join(' ')} aria-pressed={!st.decada} onClick={() => filtrar({ decada: null })}>
          Todos
        </button>
        {chips.map((d) => {
          const on = st.decada?.[0] === d[0] && st.decada?.[1] === d[1];
          return (
            <button key={d[0]} type="button" className={['tt-chip num', on && 'is-ativo'].filter(Boolean).join(' ')} aria-pressed={on} onClick={() => filtrar({ decada: d, ano: null })}>
              {rotuloDecada(d)}
            </button>
          );
        })}
      </div>

      <div className="tt-rs" aria-live="polite">
        <span><b>{resumo}</b></span>
        {paginas > 1 ? (
          <span className="tt-rs__pag">
            <span className="num">Página {pagina} de {paginas}</span>
            <button type="button" className="m-seta" disabled={pagina <= 1} onClick={() => mudar({ paginaBusca: pagina - 1 })} aria-label="Resultados anteriores">
              <Icone nome="left" tamanho={22} />
            </button>
            <button type="button" className="m-seta" disabled={pagina >= paginas} onClick={() => mudar({ paginaBusca: pagina + 1 })} aria-label="Mais resultados">
              <Icone nome="right" tamanho={22} />
            </button>
          </span>
        ) : (
          total > 0 && <span className="tt-rs__dica">Toque em uma pessoa para ver o perfil</span>
        )}
      </div>

      <div className={['tt-pessoas', busca.defasada && 'is-defasada'].filter(Boolean).join(' ')}>
        {p && p.resultados.map((a) => (
          <button key={a.id} type="button" className="tt-pc tt-cartao" onClick={() => mudar({ visao: 'perfil', perfilId: a.id, teclado: false })}>
            <Avatar nome={a.nome} foto={a.foto} tamanho={54} />
            <span className="tt-pc__txt">
              <span className="tt-pc__nome serif">
                {trechos(a.nome, termo).map((t, i) => (t.marcado ? <mark key={i}>{t.texto}</mark> : <span key={i}>{t.texto}</span>))}
                {a.novo && <span className="tt-novo">NOVO</span>}
              </span>
              <span className="tt-pc__meta num">{a.ano} · Turma {a.turma}</span>
            </span>
          </button>
        ))}
        {p && !p.resultados.length && !busca.defasada && (
          <p className="tt-vazio-busca">Ninguém encontrado com esses filtros. Tente parte do nome, sem acento, ou outra década.</p>
        )}
        {!p && (
          <p className="tt-vazio-busca">{busca.offline ? 'Sem conexão com o servidor do memorial. Tentando de novo…' : 'Carregando o diretório…'}</p>
        )}
      </div>

      {st.teclado && (
        <TecladoVirtual
          aoDigitar={(l) => digitar(st.q + l)}
          aoApagar={() => digitar(st.q.slice(0, -1))}
          aoLimpar={() => digitar('')}
          aoFechar={() => {
            campo.current?.blur();
            mudar({ teclado: false });
          }}
        />
      )}
    </div>
  );
}
