/**
 * Check-in do visitante, no próprio celular: nome, ano, turma, e-mail, uma rede social (opcional),
 * até 3 fotos (opcionais) e a autorização obrigatória. Quem faz check-in aparece na Sala 06 (Alunos).
 *
 * O modo vem do painel ("Aceite de check-ins"). Direto (o padrão): o envio do formulário grava o check-in.
 * Por e-mail, duas etapas: o formulário manda um código ao e-mail (nada é gravado ainda) e o check-in só é
 * gravado com o código digitado. Até 3 check-ins por e-mail, um por ano: quem já tem o do ano (ou os 3) recebe um aviso no
 * lugar do código.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import assinatura from '../assets/memorial/assinatura.png';
import { Icone } from '../componentes/Icone';
import { quiosque } from '../config/quiosque';
import { CODIGO_DEMO } from '../dados/demo';
import { fonte } from '../dados/fonte';
import { AS_PRINCIPAIS, MAIS_REDES, normalizarRede, redePorId, type RedeId } from '../dados/redes';
import { dois, SALAS_PADRAO } from '../dados/salas';
import type { ConfigCheckin, DadosCheckin, ErrosCheckin, ResultadoCheckin } from '../dados/tipos';
import { separarTermo, TERMO_PADRAO } from '../dados/termo';
import { MAX_FOTOS, ORDEM_CAMPOS, validarCheckin } from '../dados/validacao';
import { FolhaRedes } from './FolhaRedes';
import { reduzirFoto } from './reduzir';

/** O que a tela final precisa saber do check-in que acabou de ser gravado. */
interface Feito {
  nome: string;
  fotos: number;
}

const VAZIO: DadosCheckin = {
  nome: '', ano: '', turma: '', email: '', rede: '', usuario: '', consentimento: false, fotos: [], site: '',
};

const PADRAO: ConfigCheckin = {
  anoInicial: 1958,
  anoAtual: new Date().getFullYear(),
  termoTexto: TERMO_PADRAO,
  termoVersao: '',
  emailContato: '',
  confirmacaoEmail: false,
  aprovarPerfis: false,
  codigoMinutos: 15,
};

export function Checkin() {
  const [config, setConfig] = useState<ConfigCheckin>(PADRAO);
  /** O termo mostrado é o do servidor? Com o texto de reserva (PADRAO) o servidor gravaria outra versão. */
  const [termo, setTermo] = useState<'carregando' | 'ok' | 'falhou'>('carregando');
  const [feito, setFeito] = useState<Feito | null>(null);

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
          <Sucesso {...feito} aprovarPerfis={!!config.aprovarPerfis} />
        ) : (
          <Formulario config={config} termo={termo} aoRecarregarTermo={carregarTermo} aoConcluir={setFeito} />
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
  aoConcluir: (feito: Feito) => void;
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
  /** Depois do envio do formulário: a tela do código. Os dados continuam aqui, para a segunda etapa. */
  const [confirmando, setConfirmando] = useState(false);
  /**
   * O código já enviado: vale para o e-mail, não para os dados. Se o visitante tocar em "Corrigir os dados" e
   * mantiver o e-mail, a tela volta ao campo do código em vez de pedir outro (o servidor recusaria um novo
   * pedido antes de 1 minuto, e o visitante ficaria preso no formulário).
   */
  const codigoPedido = useRef<{ email: string; em: number } | null>(null);
  const [avisoCodigo, setAvisoCodigo] = useState('');
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
    if (!config.confirmacaoEmail) {
      const r = await fonte.checkinDireto(dados);
      setEnviando(false);
      if (r.ok) {
        aoConcluir({ nome: dados.nome.trim().split(/\s+/)[0], fotos: dados.fotos.length });
        window.scrollTo({ top: 0 });
      } else {
        setErros(r.erros);
        focarPrimeiroErro(r.erros);
      }
      return;
    }
    const email = dados.email.trim().toLowerCase();
    const pedido = codigoPedido.current;
    const validadeMs = ((config.codigoMinutos ?? 15) - 1) * 60_000; // 1 minuto de folga para digitar
    if (pedido && pedido.email === email && Date.now() - pedido.em < validadeMs) {
      setEnviando(false);
      setAvisoCodigo('Dados corrigidos. Use o mesmo código que enviamos para este e-mail.');
      setConfirmando(true);
      window.scrollTo({ top: 0 });
      return;
    }
    const r = await fonte.pedirCodigo(dados);
    setEnviando(false);
    if (r.ok) {
      codigoPedido.current = { email, em: Date.now() };
      setAvisoCodigo('');
      setConfirmando(true);
      window.scrollTo({ top: 0 });
    } else {
      setErros(r.erros);
      focarPrimeiroErro(r.erros);
    }
  };

  const confirmar = async (codigo: string): Promise<ResultadoCheckin> => {
    const r = await fonte.checkin(d, codigo);
    if (r.ok) {
      aoConcluir({ nome: d.nome.trim().split(/\s+/)[0], fotos: d.fotos.length });
      window.scrollTo({ top: 0 });
    }
    return r;
  };

  if (confirmando) {
    return (
      <Confirmacao email={d.email.trim()} aoConfirmar={confirmar} avisoInicial={avisoCodigo}
        esperaInicial={Math.max(0, ESPERA_REENVIO - Math.floor((Date.now() - (codigoPedido.current?.em ?? Date.now())) / 1000))}
        aoReenviar={async () => {
          const r = await fonte.pedirCodigo(d);
          if (r.ok) codigoPedido.current = { email: d.email.trim().toLowerCase(), em: Date.now() };
          return r;
        }}
        aoCorrigir={() => { setConfirmando(false); window.scrollTo({ top: 0 }); }} />
    );
  }

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
          <details className="ck-termo__texto">
            <summary>Ler termo completo</summary>
            <TextoTermo texto={config.termoTexto} />
          </details>
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

const ESPERA_REENVIO = 60; // segundos, como o servidor (CHECKIN_CODIGO_INTERVALO)

interface PropsConfirmacao {
  email: string;
  /** Mensagem ao abrir a tela (ex.: voltou de "Corrigir os dados" e o código continua valendo). */
  avisoInicial?: string;
  /** Segundos até liberar "Enviar outro código", contados desde o último envio. */
  esperaInicial?: number;
  aoConfirmar: (codigo: string) => Promise<ResultadoCheckin>;
  aoReenviar: () => Promise<ResultadoCheckin>;
  aoCorrigir: () => void;
}

/** Segunda etapa: o código de 6 números que chegou no e-mail. */
function Confirmacao({ email, avisoInicial = '', esperaInicial = ESPERA_REENVIO, aoConfirmar, aoReenviar, aoCorrigir }: PropsConfirmacao) {
  const [codigo, setCodigo] = useState('');
  const [erros, setErros] = useState<{ codigo?: string; geral?: string }>({});
  const [aviso, setAviso] = useState(avisoInicial);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(esperaInicial);
  const titulo = useRef<HTMLHeadingElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => titulo.current?.focus(), []);
  useEffect(() => {
    if (espera <= 0) return;
    const t = window.setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [espera]);

  const confirmar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (enviando) return;
    if (codigo.replace(/\D/g, '').length !== 6) {
      setErros({ codigo: 'Digite o código de 6 números que enviamos para o seu e-mail.' });
      campo.current?.focus();
      return;
    }
    setEnviando(true);
    setErros({});
    setAviso('');
    const r = await aoConfirmar(codigo);
    setEnviando(false);
    if (!r.ok) {
      // Um erro de outro campo (as fotos, por exemplo) aparece aqui: o formulário está em "Corrigir os dados".
      const { codigo: erroCodigo, geral, ...outros } = r.erros;
      const daFoto = outros.fotos ? `${outros.fotos} Toque em "Corrigir os dados" para trocar ou tirar a foto.` : undefined;
      setErros({ codigo: erroCodigo, geral: geral ?? daFoto ?? Object.values(outros).find(Boolean) });
      if (erroCodigo) campo.current?.focus();
    }
  };

  const reenviar = async () => {
    setErros({});
    setAviso('');
    const r = await aoReenviar();
    if (r.ok) {
      setCodigo('');
      setEspera(ESPERA_REENVIO);
      setAviso('Enviamos um código novo. O anterior não vale mais.');
    } else {
      setErros({ geral: r.erros.geral ?? Object.values(r.erros).find(Boolean) });
    }
  };

  return (
    <form className="ck-form ck-conf" onSubmit={confirmar} noValidate>
      <h1 className="serif" ref={titulo} tabIndex={-1}>Confirme seu e-mail</h1>
      <p className="ck-dica">
        Enviamos um código de 6 números para <b className="ck-conf__email">{email}</b>. Digite-o abaixo para concluir o
        <span className="sem-quebra"> check-in</span>.
      </p>
      {quiosque.demo && (
        <p className="ck-demo" role="note"><b>Modo demonstração:</b> nenhum e-mail é enviado. O código é {CODIGO_DEMO}.</p>
      )}

      <Campo rotulo="Código de confirmação" erro={erros.codigo} ajuda="Não chegou? Confira a caixa de spam.">
        {(id, desc) => (
          <input ref={campo} id={id} name="codigo" className="ck-conf__codigo" aria-describedby={desc} aria-invalid={!!erros.codigo}
            inputMode="numeric" autoComplete="one-time-code" enterKeyHint="done" placeholder="000000" maxLength={7}
            value={codigo} onChange={(e) => {
              setCodigo(e.target.value.replace(/[^\d ]/g, ''));
              if (erros.codigo) setErros((x) => ({ ...x, codigo: undefined }));
            }} />
        )}
      </Campo>

      {aviso && <p className="ck-conf__aviso" role="status">{aviso}</p>}
      {erros.geral && <p className="ck-erro ck-erro--geral" role="alert">{erros.geral}</p>}

      <button type="submit" className="ck-enviar" disabled={enviando}>
        {enviando ? 'Confirmando…' : 'Confirmar check-in'}
      </button>
      <div className="ck-conf__acoes">
        <button type="button" className="ck-termo__tentar" disabled={espera > 0 || enviando} onClick={() => void reenviar()}>
          {espera > 0 ? `Enviar outro código (${espera} s)` : 'Enviar outro código'}
        </button>
        <button type="button" className="ck-termo__tentar" disabled={enviando} onClick={aoCorrigir}>Corrigir os dados</button>
      </div>
      <p className="ck-conf__nota">
        Cada e-mail faz um <span className="sem-quebra">check-in</span> por ano, até 3 (escola e faculdade, por exemplo).
        Se este e-mail já fez o deste ano, ou já tem 3, você recebe um aviso no lugar do código. Para alterar seus dados, fale com a equipe na
        recepção.
      </p>
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

/**
 * Prévia da foto escolhida. Fotos HEIC (padrão da câmera de iPhones e de muitos Android) o Chrome do celular
 * não consegue desenhar: no lugar da imagem quebrada aparece um quadro "Foto pronta". O servidor converte.
 */
function Miniatura({ arquivo, aoRemover }: { arquivo: File; aoRemover: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [semPrevia, setSemPrevia] = useState(false);
  useEffect(() => {
    const u = URL.createObjectURL(arquivo);
    setUrl(u);
    setSemPrevia(false);
    return () => URL.revokeObjectURL(u);
  }, [arquivo]);
  return (
    <div className="ck-fotos__item">
      {url && !semPrevia && <img src={url} alt="" onError={() => setSemPrevia(true)} />}
      {semPrevia && (
        <span className="ck-fotos__pronta">
          <Icone nome="image" tamanho={26} />
          Foto pronta
        </span>
      )}
      <button type="button" onClick={aoRemover} aria-label={`Remover foto ${arquivo.name}`}>
        <Icone nome="x" tamanho={18} />
      </button>
    </div>
  );
}

/** Onde e quando o visitante vai se ver: com "aprovar perfis" ligado, nada aparece antes da equipe aprovar. */
export function textoSucesso(aprovarPerfis: boolean, fotos: number): string {
  if (aprovarPerfis) {
    return fotos
      ? 'Seu perfil e suas fotos aparecem na Sala 06 (Alunos) assim que a equipe do Memorial aprovar.'
      : 'Seu perfil aparece na Sala 06 (Alunos) assim que a equipe do Memorial aprovar.';
  }
  return fotos
    ? 'Na Sala 06 (Alunos), seus colegas já encontram você pelo nome. Suas fotos aparecem depois da aprovação da equipe.'
    : 'Na Sala 06 (Alunos), seus colegas já encontram você pelo nome.';
}

function Sucesso({ nome, fotos, aprovarPerfis }: Feito & { aprovarPerfis: boolean }) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useEffect(() => titulo.current?.focus(), []);
  return (
    <div className="ck-ok" role="status">
      <div className="ck-ok__selo"><Icone nome="check" tamanho={48} traco={2.2} cor="var(--dourado)" /></div>
      <h1 className="serif" ref={titulo} tabIndex={-1}>Check-in feito, {nome}!</h1>
      <p>{textoSucesso(aprovarPerfis, fotos)}</p>
      <section className="ck-ok__percurso" aria-labelledby="ck-percurso">
        <h2 id="ck-percurso" className="serif">Comece pela Sala 01 (Fundação)</h2>
        <ol>
          {SALAS_PADRAO.map((s) => (
            <li key={s.numero}><span className="num">{dois(s.numero)}</span> {s.nome}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
