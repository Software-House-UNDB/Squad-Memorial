/**
 * Tela 5 · Galeria histórica (área Acervo).
 * Filtros em chips (Fotografias / Vídeos / Documentos; Vídeos só aparece quando houver algum). Cada período: escudo, anos, nome, contagem e uma tira
 * de cinco fotos com o bloco "+N", que abre o período inteiro na própria tela. Tocar numa foto abre o
 * lightbox daquele período; tocar num documento abre o visualizador.
 */
import { useRef, useState } from 'react';
import { documentosDoPeriodo, fotosDoPeriodo, periodosOrdenados, videosDoPeriodo } from '../../dados/acervo';
import type { Periodo } from '../../dados/tipos';
import { Icone } from '../../icones/Icone';
import { useMemoriaTela, useNavegacao, useRolagemMemorizada } from '../../navegacao/Navegacao';
import { TelaClara } from '../../componentes/layout/TelaClara';
import { Chip } from '../../componentes/editorial/Editorial';
import { Botao } from '../../componentes/botoes/Botao';
import { Placa } from '../../componentes/acervo/Placa';
import { Lightbox } from '../../componentes/lightbox/Lightbox';
import { Estado } from '../../componentes/estado/Estado';
import './tela-galeria.css';

type Filtro = 'fotos' | 'videos' | 'documentos';

const ROTULO: Record<Filtro, string> = { fotos: 'Fotografias', videos: 'Vídeos', documentos: 'Documentos' };
const midiaDoPeriodo = (filtro: Filtro, periodoId: string) =>
  filtro === 'videos' ? videosDoPeriodo(periodoId) : fotosDoPeriodo(periodoId);
const NA_TIRA = 5;

export function TelaGaleria() {
  const { ir, voltar } = useNavegacao();
  const periodos = periodosOrdenados();
  const [filtro, setFiltro] = useMemoriaTela<Filtro>('filtro', 'fotos');
  const [aberto, setAberto] = useMemoriaTela<string | null>('periodoAberto', null);
  const [lightbox, setLightbox] = useState<{ periodoId: string; indice: number; filtro: Filtro } | null>(null);
  const rolaRef = useRef<HTMLDivElement>(null);
  useRolagemMemorizada(rolaRef, `galeria:${filtro}:${aberto ?? 'todos'}`, [filtro, aberto]);

  const totalFotos = periodos.reduce((n, p) => n + fotosDoPeriodo(p.id).length, 0);
  const totalVideos = periodos.reduce((n, p) => n + videosDoPeriodo(p.id).length, 0);
  const totalDocs = periodos.reduce((n, p) => n + documentosDoPeriodo(p.id).length, 0);
  const periodoAberto = periodos.find((p) => p.id === aberto);
  const visiveis = periodoAberto ? [periodoAberto] : periodos;
  const total: Record<Filtro, number> = { fotos: totalFotos, videos: totalVideos, documentos: totalDocs };
  const nada = total[filtro] === 0;

  const trocarFiltro = (f: Filtro) => { setFiltro(f); setAberto(null); };
  const fotosLb = lightbox ? midiaDoPeriodo(lightbox.filtro, lightbox.periodoId) : [];
  const periodoLb = periodos.find((p) => p.id === lightbox?.periodoId);

  return (
    <TelaClara
      nome="galeria"
      aba="acervo"
      trilha={periodoAberto
        ? [{ rotulo: 'Acervo', aoTocar: () => setAberto(null) }, { rotulo: `${periodoAberto.inicio}–${periodoAberto.fim}` }]
        : [{ rotulo: 'Acervo' }, { rotulo: ROTULO[filtro] }]}
      onda
      sobreposicao={lightbox && fotosLb.length > 0 && (
        <Lightbox fotos={fotosLb} indice={lightbox.indice} aoMudar={(i) => setLightbox({ ...lightbox, indice: i })} aoFechar={() => setLightbox(null)} contexto={periodoLb ? `${periodoLb.inicio}–${periodoLb.fim}` : undefined} />
      )}
    >
      <div className="filtros">
        <span className="rot">Mostrar</span>
        <Chip selecionado={filtro === 'fotos'} contagem={totalFotos} onClick={() => trocarFiltro('fotos')} disabled={totalFotos === 0}>Fotografias</Chip>
        {totalVideos > 0 && <Chip selecionado={filtro === 'videos'} contagem={totalVideos} onClick={() => trocarFiltro('videos')}>Vídeos</Chip>}
        <Chip selecionado={filtro === 'documentos'} contagem={totalDocs} onClick={() => trocarFiltro('documentos')} disabled={totalDocs === 0}>Documentos</Chip>
      </div>

      <div className="periodos rola" ref={rolaRef}>
        {nada && (
          <div className="galeria-vazia">
            <Estado tipo="vazio" titulo="Acervo em digitalização" texto="Ainda não há itens deste tipo no acervo digital." acoes={<Botao onClick={voltar} icone="voltar">Voltar</Botao>} />
          </div>
        )}
        {!nada && visiveis.map((p) => (
          <PeriodoGaleria
            key={p.id}
            periodo={p}
            filtro={filtro}
            expandido={!!periodoAberto}
            aoAbrirFoto={(i) => setLightbox({ periodoId: p.id, indice: i, filtro })}
            aoVerTodas={() => setAberto(p.id)}
            aoAbrirDocumento={(id) => ir({ tela: 'documento', documentoId: id })}
          />
        ))}
      </div>
      <div className="voltar-fixo">
        {periodoAberto
          ? <Botao icone="voltar" onClick={() => setAberto(null)}>Todos os períodos</Botao>
          : <Botao icone="voltar" onClick={voltar}>Voltar</Botao>}
      </div>
    </TelaClara>
  );
}

interface PeriodoProps {
  periodo: Periodo;
  filtro: Filtro;
  expandido: boolean;
  aoAbrirFoto: (i: number) => void;
  aoVerTodas: () => void;
  aoAbrirDocumento: (id: string) => void;
}

function PeriodoGaleria({ periodo, filtro, expandido, aoAbrirFoto, aoVerTodas, aoAbrirDocumento }: PeriodoProps) {
  const fotos = midiaDoPeriodo(filtro, periodo.id);
  const docs = documentosDoPeriodo(periodo.id);
  const n = filtro === 'documentos' ? docs.length : fotos.length;
  const unidade: Record<Filtro, [string, string]> = { fotos: ['foto', 'fotos'], videos: ['vídeo', 'vídeos'], documentos: ['documento', 'documentos'] };
  const decada = String(periodo.inicio).slice(2);

  return (
    <section className={['per', expandido && 'per--aberto'].filter(Boolean).join(' ')} aria-label={`${periodo.inicio} a ${periodo.fim}`}>
      <div className="per-cab">
        <span className="escudo" aria-hidden="true">{decada}</span>
        <b className="num">{periodo.inicio} — {periodo.fim}</b>
        <span className="nome">{periodo.titulo}</span>
        <em>{n} {unidade[filtro][n === 1 ? 0 : 1]}</em>
      </div>

      {n === 0 && (
        <p className="per-vazio">
          Ainda não há {ROTULO[filtro].toLowerCase()} deste período no acervo digital.
        </p>
      )}

      {filtro !== 'documentos' && n > 0 && (
        <div className={expandido ? 'grade' : 'tira'}>
          {(expandido ? fotos : fotos.slice(0, NA_TIRA)).map((f, i) => (
            <button key={f.id} type="button" className="foto" onClick={() => aoAbrirFoto(i)} aria-label={`${f.video ? 'Assistir' : 'Ampliar'}: ${f.legenda}`}>
              <Placa foto={f} miniatura etiqueta={false} />
              <span className="ano-foto">{f.data}{f.demo ? (f.video ? ' · demonstrativo' : ' · demonstrativa') : ''}</span>
            </button>
          ))}
          {!expandido && fotos.length > NA_TIRA && (
            <button type="button" className="mais" onClick={aoVerTodas}>
              <b className="num">+{fotos.length - NA_TIRA}</b>
              <span>Ver todas</span>
            </button>
          )}
        </div>
      )}

      {filtro === 'documentos' && n > 0 && (
        <div className="docs">
          {docs.map((d) => (
            <button key={d.id} type="button" className="doc" onClick={() => aoAbrirDocumento(d.id)}>
              <span className="doc-folha" aria-hidden="true"><Icone nome="documento" /></span>
              <span className="doc-txt">
                <b>{d.titulo}</b>
                <span>{d.tipo} · {d.data}</span>
                <em>{d.paginas.length ? `${d.paginas.length} ${d.paginas.length === 1 ? 'página' : 'páginas'}` : 'Ainda não digitalizado'}</em>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}