/**
 * Sala 5 · Perfil: cartão grafite com moldura dourada e o monograma ao fundo, ano e turma, redes
 * informadas, fotos aprovadas pela equipe e colegas da mesma turma. O e-mail nunca aparece.
 */
import monograma from '../assets/memorial/monograma.png';
import { Avatar } from '../componentes/Avatar';
import { Icone } from '../componentes/Icone';
import { Polaroide } from '../componentes/Polaroide';
import { useAluno } from '../dados/alunos';
import { dataCurta, nomeCurto } from '../dados/regras';

const MAX_FOTOS = 6;

interface Props {
  id: number | string;
  aoVoltar: () => void;
  aoAbrir: (id: number | string) => void;
}

export function Perfil({ id, aoVoltar, aoAbrir }: Props) {
  const { perfil: p, erro } = useAluno(id);

  const voltar = (
    <button type="button" className="tt-voltar" onClick={aoVoltar}>
      <Icone nome="arrowl" tamanho={22} /> Voltar à busca
    </button>
  );

  if (!p) {
    return (
      <div className="tt-perfil">
        <div className="tt-eyb">SALA 5 · PERFIL DO ALUNO</div>
        {voltar}
        <p className="tt-vazio" role="status">
          {erro === 'sumiu' ? 'Este perfil não está mais disponível.'
            : erro === 'offline' ? 'Sem conexão: não foi possível abrir este perfil agora.'
            : 'Abrindo o perfil…'}
        </p>
      </div>
    );
  }

  const fotos = p.fotos.slice(0, MAX_FOTOS);
  const redes = [
    p.instagram && { icone: 'insta', texto: `instagram.com/${p.instagram}`, rotulo: 'Instagram' },
    p.facebook && { icone: 'fb', texto: p.facebook.includes('/') ? p.facebook : `facebook.com/${p.facebook}`, rotulo: 'Facebook' },
  ].filter(Boolean) as { icone: string; texto: string; rotulo: string }[];

  return (
    <div className="tt-perfil">
      <div className="tt-eyb">SALA 5 · PERFIL DO ALUNO</div>
      {voltar}
      <div className="tt-prof entra">
        <article className="tt-pcard" aria-label={`Perfil de ${p.nome}`}>
          <img className="tt-pcard__marca" src={monograma} alt="" />
          <span className="tt-pcard__moldura" aria-hidden="true" />
          <div className="tt-pcard__anel"><Avatar nome={p.nome} foto={p.foto} tamanho={118} /></div>
          <h2 className="tt-pcard__nome serif">{p.nome}</h2>
          <p className="tt-pcard__meta">{p.recente ? 'Check-in feito agora' : `Ex-aluno(a) · check-in em ${dataCurta(p.checkinEm)}`}</p>
          <div className="tt-pcard__orn" aria-hidden="true"><i /><em /><i /></div>
          <dl className="tt-pcard__kv">
            <div><dt>ANO EM QUE ESTUDOU</dt><dd className="serif num">{p.ano}</dd></div>
            <div><dt>TURMA</dt><dd className="serif">{p.turma}</dd></div>
          </dl>
          {redes.map((r) => (
            <div key={r.icone} className="tt-pcard__rede">
              <Icone nome={r.icone} tamanho={20} cor="var(--dourado-claro)" />
              <span className="so-leitor">{r.rotulo}: </span>
              {r.texto}
            </div>
          ))}
        </article>

        <div className="tt-prof__lado">
          <div className="tt-sh">
            <b className="serif">Fotos enviadas</b>
            <span>
              {p.fotos.length
                ? `${p.fotos.length} ${p.fotos.length === 1 ? 'foto aprovada' : 'fotos aprovadas'} pela equipe${p.fotos.length > MAX_FOTOS ? ` · mostrando ${MAX_FOTOS}` : ''}`
                : 'nenhuma foto aprovada ainda'}
            </span>
          </div>
          {fotos.length ? (
            <div className={['tt-prof__fotos', fotos.length > 3 && 'tt-prof__fotos--2'].filter(Boolean).join(' ')}>
              {fotos.map((f, i) => (
                <Polaroide key={f.id} src={f.miniatura} alt={f.legenda || `Foto de ${p.nome}`} ano={f.ano} legenda={f.legenda} semente={i * 3 + 1} icone="users" posicao={i} />
              ))}
            </div>
          ) : (
            <div className="tt-prof__semfotos tt-cartao">
              As fotos enviadas no check-in aparecem aqui depois da aprovação da equipe.
            </div>
          )}

          <div className="tt-sh tt-sh--turma">
            <b className="serif">Da mesma turma</b>
            <span className="num">
              {p.turma} · {p.ano} · {p.colegas.length} {p.colegas.length === 1 ? 'colega' : 'colegas'} no Memorial
            </span>
          </div>
          <div className="tt-mates">
            {p.colegas.length ? (
              p.colegas.map((c) => (
                <button key={c.id} type="button" className="tt-mate" onClick={() => aoAbrir(c.id)}>
                  <Avatar nome={c.nome} foto={c.foto} tamanho={40} />
                  {nomeCurto(c.nome)}
                </button>
              ))
            ) : (
              <span className="tt-mates__vazio">Ninguém da mesma turma fez check-in ainda.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
