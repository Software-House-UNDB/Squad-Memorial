/**
 * Aba Colegas · Perfil de um ex-aluno, no formato de rede social: capa dourada, foto,
 * nome e quatro abas (Visão geral, Fotos, Colegas, Sobre). Só aparece o que a pessoa autorizou no
 * check-in; o e-mail nunca aparece.
 */
import type { ReactNode } from 'react';
import monogramaBranco from '../assets/memorial/monograma-branco.png';
import { Avatar } from '../componentes/Avatar';
import { Icone, type NomeIcone } from '../componentes/Icone';
import { Imagem } from '../componentes/Imagem';
import type { EstadoAluno } from '../dados/alunos';
import { lerRedes, redePorId } from '../dados/redes';
import { dataCurta, nomeCurto } from '../dados/regras';
import { type AlunoResumo, type FotoAluno } from '../dados/tipos';
import type { AbaPerfil } from './estado';

/** Miniaturas na Visão geral (6 colunas) e na aba Fotos (até 2 linhas de 6). */
const MAX_FOTOS_GERAL = 6;
const MAX_FOTOS = 12;
/** Cartões de colega na aba Colegas (a API devolve no máximo 4). */
const MAX_COLEGAS_CARTOES = 12;
const MAX_PILHA = 5;
/** Tamanho máximo da lista de colegas que a API devolve. */
const MAX_COLEGAS_API = 4;

const ABAS: { id: AbaPerfil; rotulo: string }[] = [
  { id: 'geral', rotulo: 'Visão geral' },
  { id: 'fotos', rotulo: 'Fotos' },
  { id: 'colegas', rotulo: 'Colegas' },
  { id: 'sobre', rotulo: 'Sobre' },
];

interface Props {
  aluno: EstadoAluno;
  aba: AbaPerfil;
  aoMudarAba: (a: AbaPerfil) => void;
  aoVoltar: () => void;
  aoAbrir: (id: number | string) => void;
  /** Toque numa foto enviada: abre a foto ampliada (índice em perfil.fotos). */
  aoAbrirFoto: (indice: number) => void;
}

/** Prédio da capa: o mesmo desenho do protótipo. */
function Predio() {
  return (
    <svg className="tt-capa__predio" viewBox="0 0 520 170" aria-hidden="true" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinejoin="round">
      <path d="M20 168h480" /><path d="M60 168V78h400v90" /><path d="M40 78h440L260 18z" />
      <circle cx="260" cy="55" r="11" /><path d="M260 18V2l22 6-22 6" />
      {[90, 140, 190, 330, 380, 430].map((x) => (
        <g key={x}><rect x={x - 14} y="96" width="28" height="22" rx="2" /><rect x={x - 14} y="132" width="28" height="22" rx="2" /></g>
      ))}
      <path d="M236 168v-50a24 24 0 0148 0v50" /><path d="M226 92h68M60 92h400" />
    </svg>
  );
}

/** Cabeçalho de um cartão branco: título em serif, contador e, à direita, o botão de texto. */
function TituloCartao({ titulo, n, acao }: { titulo: string; n?: ReactNode; acao?: ReactNode }) {
  return (
    <div className="fc-t">
      <h3 className="serif">{titulo}</h3>
      {n !== undefined && <span className="num">{n}</span>}
      {acao}
    </div>
  );
}

/** Aviso vazio (sem fotos, sem colegas): borda tracejada dourada e ícone. */
function Vazio({ icone, children }: { icone: NomeIcone; children: ReactNode }) {
  return (
    <div className="fc-vazio">
      <Icone nome={icone} tamanho={30} />
      <p>{children}</p>
    </div>
  );
}

/** Linha com ícone dos cartões da aba Sobre. */
function LinhaSobre({ icone, apagada, children }: { icone: NomeIcone; apagada?: boolean; children: ReactNode }) {
  return (
    <li className={['irow', apagada && 'irow--apagada'].filter(Boolean).join(' ')}>
      <Icone nome={icone} tamanho={17} traco={1.6} />
      <span>{children}</span>
    </li>
  );
}

/** Botão de texto "Ver todos / Ver todas": leva para a aba do assunto. */
function BotaoVer({ rotulo, aoClicar }: { rotulo: string; aoClicar: () => void }) {
  return (
    <button type="button" className="tt-link" onClick={aoClicar}>
      {rotulo} <Icone nome="right" tamanho={16} traco={2} />
    </button>
  );
}

/** Miniatura de uma foto enviada: botão que abre a foto ampliada (i = posição em perfil.fotos). */
function Miniatura({ f, i, nome, comLegenda, aoAbrirFoto }: { f: FotoAluno; i: number; nome: string; comLegenda?: boolean; aoAbrirFoto: (i: number) => void }) {
  return (
    <button type="button" className="fc-foto" onClick={() => aoAbrirFoto(i)} aria-label={`Ampliar foto${f.ano ? ` de ${f.ano}` : ''}: ${f.legenda || nome}`}>
      <span className="fc-foto__img">
        <Imagem src={f.miniatura} alt="" semente={i * 3 + 1} icone="users" />
        {f.ano ? <b className="fc-foto__ano num">{f.ano}</b> : null}
      </span>
      {comLegenda && f.legenda && <span className="fc-foto__leg">{f.legenda}</span>}
    </button>
  );
}

/** Colega na Visão geral: avatar e nome curto, em coluna; abre o perfil dele. */
function ColegaMini({ c, aoAbrir }: { c: AlunoResumo; aoAbrir: (id: number | string) => void }) {
  return (
    <button type="button" className="fc-mini" onClick={() => aoAbrir(c.id)} aria-label={`Ver perfil de ${c.nome}`}>
      <Avatar nome={c.nome} foto={c.foto} tamanho={52} />
      <span className="fc-mini__nome">{nomeCurto(c.nome)}</span>
    </button>
  );
}

/** Colega na aba Colegas: o cartão inteiro é um botão que abre o perfil dele. */
function CartaoColega({ c, aoAbrir }: { c: AlunoResumo; aoAbrir: (id: number | string) => void }) {
  return (
    <button type="button" className="fc-colega" onClick={() => aoAbrir(c.id)}>
      <Avatar nome={c.nome} foto={c.foto} tamanho={58} />
      <span className="fc-colega__txt">
        <b className="fc-colega__nome serif">{c.nome}</b>
        <span className="fc-colega__meta num">Turma {c.turma} · {c.ano}</span>
      </span>
      <span className="fc-colega__ver" aria-hidden="true">Ver perfil</span>
    </button>
  );
}

export function Perfil({ aluno, aba, aoMudarAba, aoVoltar, aoAbrir, aoAbrirFoto }: Props) {
  const { perfil: p, erro } = aluno;

  const voltar = (
    <button type="button" className="tt-voltar" onClick={aoVoltar}>
      <Icone nome="arrowl" tamanho={22} /> Voltar à busca
    </button>
  );

  if (!p) {
    return (
      <div className="tt-perfil">
        <div className="tt-capa">{voltar}</div>
        <p className="tt-vazio" role="status">
          {erro === 'sumiu' ? 'Este perfil não está mais disponível.'
            : erro === 'offline' ? 'Sem conexão: não foi possível abrir este perfil agora.'
            : 'Abrindo o perfil…'}
        </p>
      </div>
    );
  }

  // Sempre texto: o totem não abre links. "Outra rede" mostra o endereço guardado e se chama "Rede social".
  const redes = lerRedes(p.instagram, p.facebook).map(({ id, usuario }) => {
    const rede = redePorId(id);
    return { id, icone: rede.icone, texto: rede.exibir(usuario), rotulo: id === 'outra' ? 'Rede social' : rede.rotulo };
  });
  const turma = p.turma;
  const nColegas = p.colegas.length;
  // A API devolve no máximo 4 colegas e não informa o total: com 4, o número é "4+".
  const colegasMais = nColegas >= MAX_COLEGAS_API;
  /** Número da aba (Fotos e Colegas); Visão geral e Sobre ficam sem. */
  const contador = (a: AbaPerfil) =>
    a === 'fotos' ? { texto: String(p.fotos.length), falado: String(p.fotos.length) }
    : a === 'colegas' ? { texto: colegasMais ? `${nColegas}+` : String(nColegas), falado: colegasMais ? `${nColegas} ou mais` : String(nColegas) }
    : null;

  const primeiroNome = p.nome.split(' ')[0];
  const contColegas = colegasMais ? `${nColegas}+` : String(nColegas);
  const textoSemFotos = p.recente
    ? 'As fotos enviadas no check-in aparecem aqui depois da aprovação da equipe.'
    : 'Nenhuma foto aprovada ainda.';
  const semColegas = <Vazio icone="users">Ninguém da mesma turma fez check-in ainda.</Vazio>;

  return (
    <div className="tt-perfil entra">
      <div className="tt-capa" aria-hidden={false}>
        <img className="tt-capa__marca" src={monogramaBranco} alt="" />
        <Predio />
        {voltar}
        <span className="tt-capa__tag num">Turma {turma} · {p.ano}</span>
      </div>

      <div className="tt-pid">
        <div className="tt-pid__av"><Avatar nome={p.nome} foto={p.foto} tamanho={114} /></div>
        <div className="tt-pid__txt">
          <h2 className="tt-pid__nome serif">{p.nome}</h2>
          <p className="tt-pid__meta num">
            Ex-aluno(a) do Colégio Dom Bosco · Turma {turma} · {p.ano}{p.recente && ' · Check-in feito agora'}
          </p>
        </div>
        {nColegas > 0 && (
          <div className="tt-pid__pilha" aria-label={`${nColegas} ${nColegas === 1 ? 'colega' : 'colegas'} da mesma turma`}>
            <span className="tt-pilha" aria-hidden="true">
              {p.colegas.slice(0, MAX_PILHA).map((c) => <Avatar key={c.id} nome={c.nome} foto={c.foto} tamanho={28} />)}
            </span>
            <span>{nColegas} {nColegas === 1 ? 'colega' : 'colegas'} da turma no Memorial</span>
          </div>
        )}
      </div>

      <div className="tt-ptabs" role="tablist" aria-label="Perfil">
        {ABAS.map((a) => {
          const n = contador(a.id);
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              aria-label={n ? `${a.rotulo}, ${n.falado}` : undefined}
              className={['tt-ptab', aba === a.id && 'is-ativa'].filter(Boolean).join(' ')}
              onClick={() => aoMudarAba(a.id)}
            >
              {a.rotulo}
              {n && <span className="tt-ptab__n num" aria-hidden="true">{n.texto}</span>}
            </button>
          );
        })}
      </div>

      <div className="tt-pbody">
        {aba === 'geral' && (
          <div className="tt-pgeral">
            <section className="tt-pcard">
              <img className="tt-pcard__marca" src={monogramaBranco} alt="" />
              <span className="tt-pcard__moldura" aria-hidden="true" />
              <p className="tt-pcard__estudou">
                <Icone nome="cap" tamanho={22} /> Estudou no Colégio Dom Bosco
              </p>
              <dl className="tt-pcard__kv">
                <div><dt>ANO EM QUE ESTUDOU</dt><dd className="serif num">{p.ano}</dd></div>
                <div><dt>TURMA</dt><dd className="serif">{turma}</dd></div>
              </dl>
              {redes.length ? redes.map((r) => (
                <div key={r.id} className="tt-pcard__rede">
                  <Icone nome={r.icone} tamanho={20} />
                  <span className="so-leitor">{r.rotulo}: </span>
                  {r.texto}
                </div>
              )) : (
                <div className="tt-pcard__rede tt-pcard__apagada">
                  <Icone nome="link" tamanho={20} /> Nenhuma rede social informada
                </div>
              )}
              <p className="tt-pcard__nota">
                <Icone nome="lock" tamanho={20} /> E-mail oculto pelo Memorial
              </p>
            </section>
            <div className="tt-pgeral__dir">
              <section className="fcard">
                <TituloCartao
                  titulo="Fotos"
                  n={p.fotos.length}
                  acao={p.fotos.length > 0 && <BotaoVer rotulo="Ver todas" aoClicar={() => aoMudarAba('fotos')} />}
                />
                {p.fotos.length ? (
                  <div className="fc-fotos fc-fotos--geral">
                    {p.fotos.slice(0, MAX_FOTOS_GERAL).map((f, i) => (
                      <Miniatura key={f.id} f={f} i={i} nome={p.nome} aoAbrirFoto={aoAbrirFoto} />
                    ))}
                  </div>
                ) : <Vazio icone="image">{textoSemFotos}</Vazio>}
              </section>
              <section className="fcard">
                <TituloCartao
                  titulo="Colegas da turma"
                  n={contColegas}
                  acao={nColegas > 0 && <BotaoVer rotulo="Ver todos" aoClicar={() => aoMudarAba('colegas')} />}
                />
                {nColegas ? (
                  <div className="fc-minis">
                    {p.colegas.map((c) => <ColegaMini key={c.id} c={c} aoAbrir={aoAbrir} />)}
                  </div>
                ) : semColegas}
              </section>
            </div>
          </div>
        )}
        {aba === 'fotos' && (
          <section className="fcard">
            <TituloCartao titulo={`Fotos de ${primeiroNome}`} n={p.fotos.length} />
            {p.fotos.length ? (
              <>
                <div className="fc-fotos">
                  {p.fotos.slice(0, MAX_FOTOS).map((f, i) => (
                    <Miniatura key={f.id} f={f} i={i} nome={p.nome} comLegenda aoAbrirFoto={aoAbrirFoto} />
                  ))}
                </div>
                {p.fotos.length > MAX_FOTOS && <p className="fc-mais">Mostrando {MAX_FOTOS} de {p.fotos.length} fotos</p>}
              </>
            ) : <Vazio icone="image">{textoSemFotos}</Vazio>}
          </section>
        )}
        {aba === 'colegas' && (
          <section className="fcard">
            <TituloCartao
              titulo={`Colegas da turma ${turma} · ${p.ano}`}
              n={`${colegasMais ? `${nColegas} ou mais` : nColegas} no Memorial`}
            />
            {nColegas ? (
              <div className="fc-colegas">
                {p.colegas.slice(0, MAX_COLEGAS_CARTOES).map((c) => <CartaoColega key={c.id} c={c} aoAbrir={aoAbrir} />)}
              </div>
            ) : semColegas}
          </section>
        )}
        {aba === 'sobre' && (
          <div className="tt-sobre">
            <section className="fcard">
              <TituloCartao titulo="No Colégio Dom Bosco" />
              <ul className="irows">
                <LinhaSobre icone="cap">Ex-aluno(a) do Colégio Dom Bosco</LinhaSobre>
                <LinhaSobre icone="users">Turma {turma}</LinhaSobre>
                <LinhaSobre icone="clock">Estudou na escola em <span className="num">{p.ano}</span></LinhaSobre>
              </ul>
            </section>
            <div className="tt-sobre__dir">
              <section className="fcard">
                <TituloCartao titulo="No Memorial" />
                <ul className="irows">
                  <LinhaSobre icone="check">{p.recente ? 'Check-in feito agora' : <>Check-in em <span className="num">{dataCurta(p.checkinEm)}</span></>}</LinhaSobre>
                  <LinhaSobre icone="image">
                    {p.fotos.length} {p.fotos.length === 1 ? 'foto aprovada' : 'fotos aprovadas'} pela equipe
                  </LinhaSobre>
                  <LinhaSobre icone="users">
                    {colegasMais ? `${nColegas} ou mais colegas` : `${nColegas} ${nColegas === 1 ? 'colega' : 'colegas'}`} da mesma turma no Memorial
                  </LinhaSobre>
                </ul>
              </section>
              <section className="fcard">
                <TituloCartao titulo="Privacidade" />
                <ul className="irows">
                  <LinhaSobre icone="lock" apagada>
                    Só aparece o que a pessoa autorizou no check-in. O e-mail nunca é mostrado e as fotos passam pela equipe antes de aparecer.
                  </LinhaSobre>
                </ul>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
