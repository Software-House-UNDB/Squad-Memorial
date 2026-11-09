/**
 * Aba Colegas · Perfil de um ex-aluno, no formato de rede social: capa na cor do espaço, foto,
 * nome e quatro abas (Visão geral, Fotos, Colegas, Sobre). Só aparece o que a pessoa autorizou no
 * check-in; o e-mail nunca aparece.
 */
import type { ReactNode } from 'react';
import monogramaBranco from '../assets/memorial/monograma-branco.png';
import { Avatar } from '../componentes/Avatar';
import { Icone, type NomeIcone } from '../componentes/Icone';
import { Polaroide } from '../componentes/Polaroide';
import type { EstadoAluno } from '../dados/alunos';
import { lerRedes, redePorId } from '../dados/redes';
import { dataCurta } from '../dados/regras';
import { exibirTurma, rotuloTurno, separarTurma, type AlunoResumo } from '../dados/tipos';
import type { AbaPerfil } from './estado';

const MAX_FOTOS_GERAL = 3;
const MAX_FOTOS = 6;
const MAX_PILHA = 4;
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

/** Linha de um cartão da aba Sobre: ícone de 22 px à esquerda e o texto. */
function LinhaSobre({ icone, children }: { icone: NomeIcone; children: ReactNode }) {
  return (
    <li className="tt-sobre__lin">
      <Icone nome={icone} tamanho={22} />
      <span>{children}</span>
    </li>
  );
}

/** Botão de texto "Ver todos / Ver todas": leva para a aba do assunto. */
function BotaoVer({ rotulo, aoClicar }: { rotulo: string; aoClicar: () => void }) {
  return (
    <button type="button" className="tt-link" onClick={aoClicar}>
      {rotulo} <Icone nome="right" tamanho={18} traco={2} />
    </button>
  );
}

/** Cartão de colega da mesma turma: o cartão inteiro é um botão que abre o perfil dele. */
function CartaoColega({ c, aoAbrir }: { c: AlunoResumo; aoAbrir: (id: number | string) => void }) {
  return (
    <button type="button" className="tt-mate" onClick={() => aoAbrir(c.id)}>
      <Avatar nome={c.nome} foto={c.foto} tamanho={56} />
      <span className="tt-mate__txt">
        <b className="tt-mate__nome serif">{c.nome}</b>
        <span className="tt-mate__meta num">Turma {exibirTurma(c.turma)} · {c.ano}</span>
      </span>
      <span className="tt-mate__ver" aria-hidden="true">Ver perfil <Icone nome="right" tamanho={18} traco={2} /></span>
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

  const fotos = p.fotos.slice(0, MAX_FOTOS);
  // Sempre texto: o totem não abre links. "Outra rede" mostra o endereço guardado e se chama "Rede social".
  const redes = lerRedes(p.instagram, p.facebook).map(({ id, usuario }) => {
    const rede = redePorId(id);
    return { id, icone: rede.icone, texto: rede.exibir(usuario), rotulo: id === 'outra' ? 'Rede social' : rede.rotulo };
  });
  /** A turma vem com o turno dentro ("3º A - Matutino"); cadastros antigos não têm turno. */
  const { turma, turno } = separarTurma(p.turma);
  const turmaTurno = exibirTurma(p.turma);
  const nColegas = p.colegas.length;
  // A API devolve no máximo 4 colegas e não informa o total: com 4, o número é "4+".
  const colegasMais = nColegas >= MAX_COLEGAS_API;
  /** Número da aba (Fotos e Colegas); Visão geral e Sobre ficam sem. */
  const contador = (a: AbaPerfil) =>
    a === 'fotos' ? { texto: String(p.fotos.length), falado: String(p.fotos.length) }
    : a === 'colegas' ? { texto: colegasMais ? `${nColegas}+` : String(nColegas), falado: colegasMais ? `${nColegas} ou mais` : String(nColegas) }
    : null;

  const gradeFotos = (lista: typeof fotos, tres: boolean) =>
    lista.length ? (
      <div className={['tt-pf', tres && 'tt-pf--3'].filter(Boolean).join(' ')}>
        {lista.map((f, i) => (
          <Polaroide key={f.id} src={f.miniatura} alt={f.legenda || `Foto de ${p.nome}`} ano={f.ano} legenda={f.legenda} semente={i * 3 + 1} icone="users" posicao={i} aoTocar={() => aoAbrirFoto(i)} />
        ))}
      </div>
    ) : (
      <div className="tt-prof__semfotos tt-cartao">As fotos enviadas no check-in aparecem aqui depois da aprovação da equipe.</div>
    );

  const colegas = nColegas ? (
    <div className="tt-mates">
      {p.colegas.map((c) => <CartaoColega key={c.id} c={c} aoAbrir={aoAbrir} />)}
    </div>
  ) : (
    <p className="tt-mates__vazio">Ninguém da mesma turma fez check-in ainda.</p>
  );

  return (
    <div className="tt-perfil entra">
      <div className="tt-capa" aria-hidden={false}>
        <Predio />
        {voltar}
        <span className="tt-capa__tag num">Turma {turmaTurno} · {p.ano}</span>
      </div>

      <div className="tt-pid">
        <div className="tt-pid__av"><Avatar nome={p.nome} foto={p.foto} tamanho={114} /></div>
        <div className="tt-pid__txt">
          <h2 className="tt-pid__nome serif">{p.nome}</h2>
          <p className="tt-pid__meta num">
            Ex-aluno(a) do Colégio Dom Bosco · Turma {turmaTurno} · {p.ano}{p.recente && ' · Check-in feito agora'}
          </p>
        </div>
        {nColegas > 0 && (
          <div className="tt-pid__pilha" aria-label={`${nColegas} ${nColegas === 1 ? 'colega' : 'colegas'} da mesma turma`}>
            <span className="tt-pilha" aria-hidden="true">
              {p.colegas.slice(0, MAX_PILHA).map((c) => <Avatar key={c.id} nome={c.nome} foto={c.foto} tamanho={40} />)}
            </span>
            <span>{nColegas} {nColegas === 1 ? 'colega' : 'colegas'} da turma</span>
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
                <Icone nome="cap" tamanho={22} cor="var(--branco)" /> Estudou no Colégio Dom Bosco
              </p>
              <dl className="tt-pcard__kv">
                <div><dt>ANO EM QUE ESTUDOU</dt><dd className="serif num">{p.ano}</dd></div>
                <div><dt>TURMA</dt><dd className="serif">{turma}</dd></div>
                {turno && <div><dt>TURNO</dt><dd className="serif">{rotuloTurno(turno)}</dd></div>}
              </dl>
              {redes.length ? redes.map((r) => (
                <div key={r.id} className="tt-pcard__rede">
                  <Icone nome={r.icone} tamanho={20} cor="var(--branco)" />
                  <span className="so-leitor">{r.rotulo}: </span>
                  {r.texto}
                </div>
              )) : (
                <div className="tt-pcard__rede tt-pcard__apagada">
                  <Icone nome="link" tamanho={20} cor="var(--branco)" /> Nenhuma rede social informada
                </div>
              )}
              <p className="tt-pcard__nota">
                <Icone nome="lock" tamanho={20} cor="var(--branco)" /> E-mail oculto pelo Memorial
              </p>
            </section>
            <div className="tt-pgeral__dir">
              <section>
                <div className="tt-sh tt-sh--acao">
                  <b className="serif">Fotos enviadas</b>
                  <span>
                    {p.fotos.length ? `${p.fotos.length} ${p.fotos.length === 1 ? 'foto aprovada' : 'fotos aprovadas'} pela equipe` : 'nenhuma foto aprovada ainda'}
                  </span>
                  {p.fotos.length > MAX_FOTOS_GERAL && <BotaoVer rotulo="Ver todas" aoClicar={() => aoMudarAba('fotos')} />}
                </div>
                {gradeFotos(fotos.slice(0, MAX_FOTOS_GERAL), true)}
              </section>
              <section>
                <div className="tt-sh tt-sh--acao">
                  <b className="serif">Colegas da turma</b>
                  <span className="num">{colegasMais ? `${nColegas}+` : nColegas} no Memorial</span>
                  {nColegas > 0 && <BotaoVer rotulo="Ver todos" aoClicar={() => aoMudarAba('colegas')} />}
                </div>
                {colegas}
              </section>
            </div>
          </div>
        )}
        {aba === 'fotos' && (
          <>
            <div className="tt-sh">
              <b className="serif">Fotos enviadas</b>
              <span>{p.fotos.length > MAX_FOTOS ? `mostrando ${MAX_FOTOS} de ${p.fotos.length}` : 'aprovadas pela equipe'}</span>
            </div>
            {gradeFotos(fotos, false)}
          </>
        )}
        {aba === 'colegas' && (
          <>
            <div className="tt-sh">
              <b className="serif">Da mesma turma</b>
              <span className="num">{turmaTurno} · {p.ano} · {nColegas} {nColegas === 1 ? 'colega' : 'colegas'} no Memorial</span>
            </div>
            {colegas}
          </>
        )}
        {aba === 'sobre' && (
          <div className="tt-sobre">
            <section className="tt-sobre__cartao">
              <h3 className="serif">No Colégio Dom Bosco</h3>
              <ul>
                <LinhaSobre icone="cap">Ex-aluno(a) do Colégio Dom Bosco</LinhaSobre>
                <LinhaSobre icone="users">Turma {turmaTurno}</LinhaSobre>
                <LinhaSobre icone="clock">Estudou na escola em <span className="num">{p.ano}</span></LinhaSobre>
              </ul>
            </section>
            <section className="tt-sobre__cartao">
              <h3 className="serif">No Memorial</h3>
              <ul>
                <LinhaSobre icone="check">{p.recente ? 'Check-in feito agora' : <>Check-in em <span className="num">{dataCurta(p.checkinEm)}</span></>}</LinhaSobre>
                <LinhaSobre icone="image">
                  {p.fotos.length} {p.fotos.length === 1 ? 'foto aprovada' : 'fotos aprovadas'} pela equipe
                </LinhaSobre>
                <LinhaSobre icone="users">
                  {colegasMais ? `${nColegas} ou mais colegas` : `${nColegas} ${nColegas === 1 ? 'colega' : 'colegas'}`} da mesma turma no Memorial
                </LinhaSobre>
              </ul>
            </section>
            <section className="tt-sobre__cartao tt-sobre__cartao--cheio">
              <h3 className="serif">Privacidade</h3>
              <ul>
                <LinhaSobre icone="lock">
                  Só aparece o que a pessoa autorizou no check-in. O e-mail nunca é mostrado e as fotos passam pela equipe antes de aparecer.
                </LinhaSobre>
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
