/** Peças editoriais: chips, medalha, cartão de marco, camafeu, bloco editorial, citação, paginação. */
import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { Depoimento, Foto, Marco } from '../../dados/tipos';
import { Icone, type NomeIcone } from '../../icones/Icone';
import { Botao, SetaToque } from '../botoes/Botao';
import { Placa } from '../acervo/Placa';
import './editorial.css';

/* ---------- Chip ---------- */
interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selecionado?: boolean;
  contagem?: string | number;
  children: ReactNode;
}
export function Chip({ selecionado, contagem, children, className, type = 'button', ...resto }: ChipProps) {
  return (
    <button type={type} className={['m-chip', selecionado && 'is-sel', className].filter(Boolean).join(' ')} aria-pressed={selecionado} {...resto}>
      <span>{children}</span>
      {contagem !== undefined && <span className="q">{contagem}</span>}
    </button>
  );
}

/* ---------- Medalha ---------- */
export function Medalha({ icone, erro, tamanho }: { icone: NomeIcone; erro?: boolean; tamanho?: number }) {
  return (
    <span className={['m-medalha', erro && 'm-medalha--lacre'].filter(Boolean).join(' ')} style={tamanho ? { width: tamanho, height: tamanho } : undefined} aria-hidden="true">
      <Icone nome={icone} />
    </span>
  );
}

/* ---------- Cartão de marco ---------- */
export const iconeDoMarco: Record<Marco['tipo'], NomeIcone> = { predio: 'predio', documento: 'documento', pessoa: 'pessoas', foto: 'foto' };

export function rodapeDoMarco(m: Marco) {
  const partes: string[] = [];
  if (m.fotoIds.length) partes.push(`${m.fotoIds.length} ${m.fotoIds.length === 1 ? 'foto' : 'fotos'}`);
  if (m.documentoIds.length) partes.push(`${m.documentoIds.length} ${m.documentoIds.length === 1 ? 'documento' : 'documentos'}`);
  return partes.join(' · ');
}

interface CartaoMarcoProps {
  marco: Marco;
  capa?: Foto;
  mostrarAno?: boolean;
  compacto?: boolean;
  aoTocar: () => void;
}
export function CartaoMarco({ marco, capa, mostrarAno = true, compacto, aoTocar }: CartaoMarcoProps) {
  return (
    <button type="button" className={['m-marco', compacto && 'm-marco--compacto'].filter(Boolean).join(' ')} onClick={aoTocar}>
      <Placa foto={capa} tom={2} miniatura etiqueta={false} className="m-marco-mini" />
      <span className="m-marco-texto">
        {mostrarAno && <span className="ano">{marco.dataTexto ?? marco.ano}</span>}
        <span className="titulo">{marco.titulo}</span>
        {!compacto && <span className="resumo">{marco.resumo}</span>}
        {!compacto && rodapeDoMarco(marco) && <span className="pe">{rodapeDoMarco(marco)}</span>}
      </span>
      <SetaToque />
    </button>
  );
}

/* ---------- Camafeu (personalidade) ---------- */
interface CamafeuProps {
  nome: string;
  papel: string;
  retrato?: Foto;
  selecionado?: boolean;
  aoTocar?: () => void;
  tamanho?: 'grade' | 'painel';
}
export function Camafeu({ nome, papel, retrato, selecionado, aoTocar, tamanho = 'grade' }: CamafeuProps) {
  const conteudo = (
    <>
      <span className="m-camafeu">
        {retrato ? <Placa foto={retrato} miniatura etiqueta={false} className="m-camafeu-foto" /> : <span className="m-camafeu-vazio" />}
      </span>
      {tamanho === 'grade' && (
        <>
          <b>{nome}</b>
          <i>{papel}</i>
        </>
      )}
    </>
  );
  if (!aoTocar) return <div className={`m-pessoa m-pessoa--${tamanho}`}>{conteudo}</div>;
  return (
    <button type="button" className={['m-pessoa', `m-pessoa--${tamanho}`, selecionado && 'is-sel'].filter(Boolean).join(' ')} aria-pressed={selecionado} onClick={aoTocar}>
      {conteudo}
    </button>
  );
}

/* ---------- Bloco editorial + citação ---------- */
interface EditorialProps {
  ano: string | number;
  titulo: string;
  lede?: string;
  paragrafos: string[];
  citacao?: Depoimento;
}
export function BlocoEditorial({ ano, titulo, lede, paragrafos, citacao }: EditorialProps) {
  const [expandido, setExpandido] = useState(false);
  const visiveis = expandido ? paragrafos : paragrafos.slice(0, 1);
  return (
    <article className="m-editorial">
      <span className="ano">{ano}</span>
      <h2>{titulo}</h2>
      {lede && <p className="lede">{lede}</p>}
      {visiveis.map((p, i) => <p key={i} className="corpo">{p}</p>)}
      {paragrafos.length > 1 && (
        <Botao variante="sec" className="ler-mais" onClick={() => setExpandido(!expandido)} aria-expanded={expandido}>
          {expandido ? 'Ler menos' : 'Ler mais'}
        </Botao>
      )}
      {citacao && <Citacao depoimento={citacao} />}
    </article>
  );
}

export function Citacao({ depoimento }: { depoimento: Depoimento }) {
  return (
    <blockquote className="m-citacao">
      <q>{depoimento.texto}</q>
      <cite>{depoimento.autor} · {depoimento.vinculo}</cite>
    </blockquote>
  );
}

/* ---------- Progresso ---------- */
export function Progresso({ rotulo, atual, total }: { rotulo: string; atual: number; total: number }) {
  return (
    <div className="m-pag" role="status" aria-label={`${rotulo} ${atual} de ${total}`}>
      <span className="cont">{rotulo} <b className="num">{atual}</b> de {total}</span>
      <span className="m-trilho" aria-hidden="true"><i style={{ width: `${(atual / Math.max(total, 1)) * 100}%` }} /></span>
    </div>
  );
}