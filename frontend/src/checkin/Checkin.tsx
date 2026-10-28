/**
 * Check-in do visitante, no próprio celular: nome, ano, turma, e-mail, redes (opcionais), até 3
 * fotos (opcionais) e a autorização obrigatória. Quem faz check-in aparece na sala 5.
 */
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import assinatura from '../assets/memorial/assinatura.png';
import { Icone } from '../componentes/Icone';
import { quiosque } from '../config/quiosque';
import { fonte } from '../dados/fonte';
import type { ConfigCheckin, DadosCheckin, ErrosCheckin } from '../dados/tipos';
import { MAX_FOTOS, ORDEM_CAMPOS, validarCheckin } from '../dados/validacao';
import { reduzirFoto } from './reduzir';

const VAZIO: DadosCheckin = {
  nome: '', ano: '', turma: '', email: '', instagram: '', facebook: '', consentimento: false, fotos: [], site: '',
};

const PADRAO: ConfigCheckin = {
  anoInicial: 1958,
  anoAtual: new Date().getFullYear(),
  termoTexto: 'Autorizo a exibição do meu nome, ano, turma e redes informadas nos totens do Memorial.',
  termoVersao: '',
  emailContato: '',
};

export function Checkin() {
  const [config, setConfig] = useState<ConfigCheckin>(PADRAO);
  const [feito, setFeito] = useState<string | null>(null);
  const [chave, setChave] = useState(0);

  useEffect(() => {
    fonte.configCheckin().then(setConfig).catch(() => { /* sem rede: o envio avisa */ });
  }, []);

  return (
    <div className="ck">
      <header className="ck-cab">
        <img src={assinatura} alt="Memorial Dom Bosco Maria Izabel Rodrigues" />
        <small>CHECK-IN DO VISITANTE</small>
      </header>
      {quiosque.demo && (
        <p className="ck-demo" role="note">
          <b>Modo demonstração:</b> nada é enviado. O check-in fica só neste navegador e aparece na sala 5 aberta nele.
        </p>
      )}
      <main className="ck-corpo">
        {feito !== null ? (
          <Sucesso nome={feito} aoRecomecar={() => { setFeito(null); setChave((k) => k + 1); }} />
        ) : (
          <Formulario key={chave} config={config} aoConcluir={setFeito} />
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

function Formulario({ config, aoConcluir }: { config: ConfigCheckin; aoConcluir: (nome: string) => void }) {
  const [d, setD] = useState<DadosCheckin>(VAZIO);
  const [erros, setErros] = useState<ErrosCheckin>({});
  const [enviando, setEnviando] = useState(false);
  const form = useRef<HTMLFormElement>(null);

  const anos: number[] = [];
  for (let a = config.anoAtual; a >= config.anoInicial; a--) anos.push(a);

  const campo = <K extends keyof DadosCheckin>(k: K, v: DadosCheckin[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    if (erros[k]) setErros((e) => ({ ...e, [k]: undefined }));
  };

  const focarPrimeiroErro = (e: ErrosCheckin) => {
    const primeiro = ORDEM_CAMPOS.find((k) => e[k]);
    if (primeiro) form.current?.querySelector<HTMLElement>(`[name="${primeiro}"]`)?.focus();
  };

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (enviando) return;
    const locais = validarCheckin(d, config.anoInicial, config.anoAtual);
    if (Object.keys(locais).length) {
      setErros(locais);
      focarPrimeiroErro(locais);
      return;
    }
    setEnviando(true);
    setErros({});
    const r = await fonte.checkin(d);
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
    const novas = await Promise.all([...lista].slice(0, MAX_FOTOS - d.fotos.length).map(reduzirFoto));
    campo('fotos', [...d.fotos, ...novas].slice(0, MAX_FOTOS));
  };

  return (
    <form ref={form} className="ck-form" onSubmit={enviar} noValidate>
      <h1 className="serif">Registre sua passagem</h1>
      <p className="ck-dica">Seus dados aparecem na sala 5 do Memorial. O <span className="sem-quebra">e-mail</span> nunca é mostrado.</p>

      <Campo rotulo="Nome completo" erro={erros.nome}>
        {(id, desc) => (
          <input id={id} name="nome" aria-describedby={desc} aria-invalid={!!erros.nome} autoComplete="name"
            autoCapitalize="words" placeholder="Ex.: Maria Clara Souza" maxLength={120}
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
              autoComplete="off" maxLength={30} value={d.turma} onChange={(e) => campo('turma', e.target.value)} />
          )}
        </Campo>
      </div>

      <Campo rotulo="E-mail" erro={erros.email} ajuda="Só a equipe do Memorial vê.">
        {(id, desc) => (
          <input id={id} name="email" type="email" inputMode="email" aria-describedby={desc} aria-invalid={!!erros.email}
            autoComplete="email" autoCapitalize="none" placeholder="seu@email.com" maxLength={254}
            value={d.email} onChange={(e) => campo('email', e.target.value)} />
        )}
      </Campo>

      <Campo rotulo="Instagram (opcional)" erro={erros.instagram}>
        {(id, desc) => (
          <input id={id} name="instagram" aria-describedby={desc} aria-invalid={!!erros.instagram} autoCapitalize="none"
            autoComplete="off" placeholder="@seuperfil" maxLength={80} value={d.instagram} onChange={(e) => campo('instagram', e.target.value)} />
        )}
      </Campo>

      <Campo rotulo="Facebook (opcional)" erro={erros.facebook}>
        {(id, desc) => (
          <input id={id} name="facebook" aria-describedby={desc} aria-invalid={!!erros.facebook} autoCapitalize="none"
            autoComplete="off" placeholder="facebook.com/seuperfil" maxLength={120} value={d.facebook} onChange={(e) => campo('facebook', e.target.value)} />
        )}
      </Campo>

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

      {/* Campo isca: invisível para pessoas, robôs preenchem e o servidor descarta. */}
      <div className="ck-isca" aria-hidden="true">
        <label>Site <input name="site" tabIndex={-1} autoComplete="off" value={d.site} onChange={(e) => campo('site', e.target.value)} /></label>
      </div>

      <div className={['ck-termo', erros.consentimento && 'is-erro'].filter(Boolean).join(' ')}>
        <label>
          <input type="checkbox" name="consentimento" checked={d.consentimento} aria-describedby="ck-termo-erro"
            aria-invalid={!!erros.consentimento} onChange={(e) => campo('consentimento', e.target.checked)} />
          <span>{config.termoTexto}</span>
        </label>
        {config.termoVersao && <small>Termo versão {config.termoVersao}</small>}
        <span className="ck-erro" id="ck-termo-erro" role="alert">{erros.consentimento}</span>
      </div>

      {erros.geral && <p className="ck-erro ck-erro--geral" role="alert">{erros.geral}</p>}

      <button type="submit" className="ck-enviar" disabled={enviando}>
        {enviando ? 'Enviando…' : 'Fazer check-in'}
      </button>
    </form>
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
      <p>Siga o percurso. Na sala 5, seus colegas encontram você pelo nome.</p>
      <button type="button" className="ck-ok__outro" onClick={aoRecomecar}>Fazer outro check-in</button>
    </div>
  );
}
