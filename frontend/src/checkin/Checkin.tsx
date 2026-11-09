/**
 * Check-in do visitante, no próprio celular: nome, ano, turma, e-mail, uma rede social (opcional),
 * até 3 fotos (opcionais) e a autorização obrigatória. Quem faz check-in aparece na Sala 06 (Alunos).
 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import assinatura from '../assets/memorial/assinatura.png';
import { Icone } from '../componentes/Icone';
import { quiosque } from '../config/quiosque';
import { fonte } from '../dados/fonte';
import { AS_PRINCIPAIS, MAIS_REDES, normalizarRede, redePorId, type RedeId } from '../dados/redes';
import { dois, SALAS_PADRAO } from '../dados/salas';
import { type ConfigCheckin, type DadosCheckin, type ErrosCheckin } from '../dados/tipos';
import { separarTermo, TERMO_PADRAO } from '../dados/termo';
import { MAX_FOTOS, ORDEM_CAMPOS, validarCheckin } from '../dados/validacao';
import { FolhaRedes } from './FolhaRedes';
import { reduzirFoto } from './reduzir';

const VAZIO: DadosCheckin = {
  nome: '', ano: '', turma: '', email: '', rede: '', usuario: '', consentimento: false, fotos: [], site: '',
};

const PADRAO: ConfigCheckin = {
  anoInicial: 1958,
  anoAtual: new Date().getFullYear(),
  termoTexto: TERMO_PADRAO,
  termoVersao: '',
  emailContato: '',
};

export function Checkin() {
  const [config, setConfig] = useState<ConfigCheckin>(PADRAO);
  /** O termo mostrado é o do servidor? Com o texto de reserva (PADRAO) o servidor gravaria outra versão. */
  const [termo, setTermo] = useState<'carregando' | 'ok' | 'falhou'>('carregando');
  const [feito, setFeito] = useState<string | null>(null);
  const [chave, setChave] = useState(0);

  const carregarTermo = () => {
    setTermo('carregando');
    fonte.configCheckin()
      .then((c) => { setConfig(c); setTermo('ok'); })
      .catch(() => setTermo('falhou'));
  };
  useEffect(carregarTermo, []);

  return (
    <div className="ck">
      <header className="ck-cab">
        <img src={assinatura} alt="Memorial Dom Bosco Maria Izabel Rodrigues" />
        <small>CHECK-IN DO VISITANTE</small>
      </header>
      {quiosque.demo && (
        <p className="ck-demo" role="note">
          <b>Modo demonstração:</b> nada é enviado. O check-in fica só neste navegador e aparece na Sala 06 (Alunos) aberta nele.
        </p>
      )}
      <main className="ck-corpo">
        {feito !== null ? (
          <Sucesso nome={feito} aoRecomecar={() => { setFeito(null); setChave((k) => k + 1); }} />
        ) : (
          <Formulario key={chave} config={config} termo={termo} aoRecarregarTermo={carregarTermo} aoConcluir={setFeito} />
        )}
      </main>
      <footer className="ck-rod">
        {config.emailContato
          ? <>Para corrigir ou remover seus dados, escreva para <a href={`mailto:${config.emailContato}`}>{config.emailContato}</a>.</>
          : 'Para corrigir ou remover seus dados, fale com a equipe do Memorial na recepção.'}
      </footer>
    </div>
  );
}

interface PropsFormulario {
  config: ConfigCheckin;
  termo: 'carregando' | 'ok' | 'falhou';
  aoRecarregarTermo: () => void;
  aoConcluir: (nome: string) => void;
}

function Formulario({ config, termo, aoRecarregarTermo, aoConcluir }: PropsFormulario) {
  const [d, setD] = useState<DadosCheckin>(VAZIO);
  const [erros, setErros] = useState<ErrosCheckin>({});
  const [enviando, setEnviando] = useState(false);
  /** Reduzindo as fotos escolhidas: o envio espera, para não mandar o formulário sem elas. */
  const [preparando, setPreparando] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const colou = useRef(false);
  const campoRede = useRef<HTMLInputElement>(null);
  const botaoMais = useRef<HTMLButtonElement>(null);
  const [folha, setFolha] = useState(false);
  const idRede = useId();
  const rede = d.rede ? redePorId(d.rede) : null;

  const anos: number[] = [];
  for (let a = config.anoAtual; a >= config.anoInicial; a--) anos.push(a);

  const campo = <K extends keyof DadosCheckin>(k: K, v: DadosCheckin[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    if (erros[k]) setErros((e) => ({ ...e, [k]: undefined }));
  };

  /** Escolhe a rede (ou desmarca, ao tocar de novo no botão marcado). */
  const escolherRede = (id: RedeId) => {
    setD((x) => ({ ...x, rede: x.rede === id ? '' : id }));
    if (erros.rede) setErros((e) => ({ ...e, rede: undefined }));
  };

  /** Fecha a folha "Mais redes": com uma rede escolhida o foco vai para o campo; sem escolher, volta ao botão. */
  const fecharFolha = (escolhida?: RedeId) => {
    setFolha(false);
    if (escolhida) {
      setD((x) => ({ ...x, rede: escolhida }));
      if (erros.rede) setErros((e) => ({ ...e, rede: undefined }));
    }
    window.setTimeout(() => (escolhida ? campoRede : botaoMais).current?.focus(), 0);
  };

  /**
   * Um link reconhecido marca a rede e deixa só o usuário. Roda ao colar e ao sair do campo, não a cada tecla.
   * Ao sair do campo o erro fica: se ele sumisse, a página subiria e o toque no botão de envio se perderia.
   */
  const lerUsuario = (texto: string, limparErro: boolean) => {
    setD((x) => ({ ...x, ...normalizarRede(x.rede, texto) }));
    if (limparErro && erros.rede) setErros((e) => ({ ...e, rede: undefined }));
  };

  const focarPrimeiroErro = (e: ErrosCheckin) => {
    const primeiro = ORDEM_CAMPOS.find((k) => e[k]);
    if (primeiro) form.current?.querySelector<HTMLElement>(`[name="${primeiro}"]`)?.focus();
  };

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (enviando || preparando || termo !== 'ok') return;
    const dados = { ...d, ...normalizarRede(d.rede, d.usuario) };
    setD(dados);
    const locais = validarCheckin(dados, config.anoInicial, config.anoAtual);
    if (Object.keys(locais).length) {
      setErros(locais);
      focarPrimeiroErro(locais);
      return;
    }
    setEnviando(true);
    setErros({});
    const r = await fonte.checkin(dados);
    setEnviando(false);
    if (r.ok) {
      aoConcluir(d.nome.trim().split(/\s+/)[0]);
      window.scrollTo({ top: 0 });
    } else {
      setErros(r.erros);
      focarPrimeiroErro(r.erros);
    }
  };

  const adicionarFotos = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setPreparando(true);
    try {
      const novas = await Promise.all([...lista].slice(0, MAX_FOTOS - d.fotos.length).map(reduzirFoto));
      setD((x) => ({ ...x, fotos: [...x.fotos, ...novas].slice(0, MAX_FOTOS) }));
      setErros((e) => ({ ...e, fotos: undefined }));
    } finally {
      setPreparando(false);
    }
  };

  return (
    <form ref={form} className="ck-form" onSubmit={enviar} noValidate>
      <h1 className="serif">Registre sua passagem</h1>
      <p className="ck-dica">Seus dados aparecem na Sala 06 (Alunos) do Memorial. O <span className="sem-quebra">e-mail</span> nunca é mostrado.</p>

      <Campo rotulo="Nome completo" erro={erros.nome}>
        {(id, desc) => (
          <input id={id} name="nome" aria-describedby={desc} aria-invalid={!!erros.nome} autoComplete="name"
            autoCapitalize="words" enterKeyHint="next" placeholder="Ex.: Maria Clara Souza" maxLength={120}
            value={d.nome} onChange={(e) => campo('nome', e.target.value)} />
        )}
      </Campo>

      <div className="ck-dois">
        <Campo rotulo="Ano em que estudou" erro={erros.ano}>
          {(id, desc) => (
            <select id={id} name="ano" aria-describedby={desc} aria-invalid={!!erros.ano} value={d.ano} onChange={(e) => campo('ano', e.target.value)}>
              <option value="">Ano</option>
              {anos.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
        </Campo>
        <Campo rotulo="Turma" erro={erros.turma}>
          {(id, desc) => (
            <input id={id} name="turma" aria-describedby={desc} aria-invalid={!!erros.turma} placeholder="3º A"
              autoComplete="off" enterKeyHint="next" maxLength={30} value={d.turma} onChange={(e) => campo('turma', e.target.value)} />
          )}
        </Campo>
      </div>

      <Campo rotulo="E-mail" erro={erros.email} ajuda="Só a equipe do Memorial vê.">
        {(id, desc) => (
          <input id={id} name="email" type="email" inputMode="email" aria-describedby={desc} aria-invalid={!!erros.email}
            autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next"
            placeholder="seu@email.com" maxLength={254}
            value={d.email} onChange={(e) => campo('email', e.target.value)} />
        )}
      </Campo>

      <fieldset className={['ck-campo', 'ck-rede', erros.rede && 'is-erro'].filter(Boolean).join(' ')}
        aria-describedby={`${idRede}-erro`}>
        <legend>Rede social (opcional)</legend>
        <div className="ck-rede__grupo">
          {AS_PRINCIPAIS.map((id) => (
            <button key={id} type="button" className="ck-rede__op" aria-pressed={d.rede === id} onClick={() => escolherRede(id)}>
              {redePorId(id).rotulo}
            </button>
          ))}
          {/* Uma rede escolhida em "Mais redes" aparece aqui, marcada, para a pessoa ver o que escolheu. */}
          {d.rede && MAIS_REDES.includes(d.rede) && (
            <button type="button" className="ck-rede__op" aria-pressed="true" onClick={() => escolherRede(d.rede as RedeId)}>
              {redePorId(d.rede).rotulo}
            </button>
          )}
          <button ref={botaoMais} type="button" className="ck-rede__op ck-rede__mais" aria-haspopup="dialog" onClick={() => setFolha(true)}>
            Mais redes ▾
          </button>
        </div>
        <div className="ck-rede__campo">
          {rede?.prefixoLink && <span className="ck-rede__prefixo" aria-hidden="true">{rede.prefixoLink}</span>}
          <input ref={campoRede} name="rede" inputMode="url" aria-invalid={!!erros.rede} autoCapitalize="none" autoCorrect="off"
            spellCheck={false} autoComplete="off" enterKeyHint="next" maxLength={200}
            aria-describedby={`${idRede}-ajuda ${idRede}-erro`}
            aria-label={!rede ? 'Usuário ou link da rede social' : rede.id === 'outra' ? 'Link do perfil' : `Usuário no ${rede.rotulo}`}
            placeholder={!rede ? 'Escolha a rede acima ou cole o link do perfil' : rede.id === 'outra' ? 'site.com/seu-perfil' : 'seu-usuario'}
            value={d.usuario}
            onPaste={() => { colou.current = true; }}
            onChange={(e) => {
              if (colou.current) { colou.current = false; lerUsuario(e.target.value, true); return; }
              setD((x) => ({ ...x, usuario: e.target.value }));
              if (erros.rede) setErros((x) => ({ ...x, rede: undefined }));
            }}
            onBlur={(e) => lerUsuario(e.target.value, false)} />
        </div>
        <span id={`${idRede}-ajuda`} className="ck-ajuda">Digite só o usuário. Se preferir, cole o link inteiro.</span>
        <span id={`${idRede}-erro`} className="ck-erro" role="alert">{erros.rede}</span>
      </fieldset>
      {folha && <FolhaRedes aoEscolher={fecharFolha} aoFechar={() => fecharFolha()} />}

      <Campo rotulo={`Fotos da sua época (opcional, até ${MAX_FOTOS})`} erro={erros.fotos} ajuda="Aparecem no seu perfil depois da aprovação da equipe.">
        {(id, desc) => (
          <div className="ck-fotos">
            {d.fotos.map((f, i) => (
              <Miniatura key={`${f.name}-${i}`} arquivo={f} aoRemover={() => campo('fotos', d.fotos.filter((_, j) => j !== i))} />
            ))}
            {d.fotos.length < MAX_FOTOS && (
              <label className="ck-fotos__add" htmlFor={id}>
                <Icone nome="image" tamanho={26} />
                <span>Adicionar foto</span>
                <input id={id} name="fotos" type="file" accept="image/*" multiple aria-describedby={desc}
                  onChange={(e) => { void adicionarFotos(e.target.files); e.target.value = ''; }} />
              </label>
            )}
          </div>
        )}
      </Campo>
      {preparando && <p className="ck-preparando" role="status">Preparando suas fotos…</p>}

      {/* Campo isca: invisível para pessoas, robôs preenchem e o servidor descarta. */}
      <div className="ck-isca" aria-hidden="true">
        <label>Site <input name="site" tabIndex={-1} autoComplete="off" value={d.site} onChange={(e) => campo('site', e.target.value)} /></label>
      </div>

      <div className={['ck-termo', erros.consentimento && 'is-erro'].filter(Boolean).join(' ')}>
        <label>
          <input type="checkbox" name="consentimento" checked={d.consentimento} aria-describedby="ck-termo-erro"
            aria-invalid={!!erros.consentimento} onChange={(e) => campo('consentimento', e.target.checked)} />
          <span>Li e aceito o termo de uso dos meus dados e da minha imagem</span>
        </label>
        {termo === 'ok' && (
          <>
            <details className="ck-termo__texto">
              <summary>Ler termo completo</summary>
              <TextoTermo texto={config.termoTexto} />
            </details>
            {config.termoVersao && <small>Termo versão {config.termoVersao}</small>}
          </>
        )}
        {termo === 'carregando' && <p className="ck-termo__aviso" role="status">Carregando o termo…</p>}
        {termo === 'falhou' && (
          <div className="ck-termo__aviso" role="alert">
            <p>Não foi possível carregar o termo.</p>
            <button type="button" className="ck-termo__tentar" onClick={aoRecarregarTermo}>Tentar de novo</button>
          </div>
        )}
        <span className="ck-erro" id="ck-termo-erro" role="alert">{erros.consentimento}</span>
      </div>

      {erros.geral && <p className="ck-erro ck-erro--geral" role="alert">{erros.geral}</p>}

      <button type="submit" className="ck-enviar" disabled={enviando || preparando || termo !== 'ok'}>
        {enviando ? 'Enviando…' : preparando ? 'Preparando fotos…' : 'Fazer check-in'}
      </button>
    </form>
  );
}

/** O termo por extenso: a primeira linha é o título; o corpo é justificado (lang pt-BR liga a hifenização). */
function TextoTermo({ texto }: { texto: string }) {
  const { titulo, corpo } = separarTermo(texto);
  return (
    <>
      {titulo && <h2 className="serif">{titulo}</h2>}
      <p lang="pt-BR">{corpo}</p>
    </>
  );
}

function Campo({ rotulo, erro, ajuda, children }: { rotulo: string; erro?: string; ajuda?: string; children: (id: string, desc: string) => ReactNode }) {
  const id = useId();
  const desc = `${id}-desc`;
  return (
    <div className={['ck-campo', erro && 'is-erro'].filter(Boolean).join(' ')}>
      <label htmlFor={id}>{rotulo}</label>
      {children(id, desc)}
      <span id={desc} className={erro ? 'ck-erro' : 'ck-ajuda'} role={erro ? 'alert' : undefined}>
        {erro ?? ajuda ?? ''}
      </span>
    </div>
  );
}

function Miniatura({ arquivo, aoRemover }: { arquivo: File; aoRemover: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(arquivo);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);
  return (
    <div className="ck-fotos__item">
      {url && <img src={url} alt="" />}
      <button type="button" onClick={aoRemover} aria-label={`Remover foto ${arquivo.name}`}>
        <Icone nome="x" tamanho={18} />
      </button>
    </div>
  );
}

function Sucesso({ nome, aoRecomecar }: { nome: string; aoRecomecar: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => titulo.current?.focus(), []);
  return (
    <div className="ck-ok" role="status">
      <div className="ck-ok__selo"><Icone nome="check" tamanho={48} traco={2.2} cor="var(--dourado)" /></div>
      <h1 className="serif" ref={titulo} tabIndex={-1}>Check-in feito, {nome}!</h1>
      <p>Na Sala 06 (Alunos), seus colegas encontram você pelo nome.</p>
      <section className="ck-ok__percurso" aria-labelledby="ck-percurso">
        <h2 id="ck-percurso" className="serif">Comece pela Sala 01 (Fundação)</h2>
        <ol>
          {SALAS_PADRAO.map((s) => (
            <li key={s.numero}><span className="num">{dois(s.numero)}</span> {s.nome}</li>
          ))}
        </ol>
      </section>
      <button type="button" className="ck-ok__outro" onClick={aoRecomecar}>Fazer outro check-in</button>
    </div>
  );
}
