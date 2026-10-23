import { describe, expect, it } from 'vitest';
import { acervo, definirAcervo } from './acervo';
import { acervoDemo } from './acervo-demo';

// O app recebe o acervo da API; aqui o formato é verificado com o acervo demonstrativo do DS.
definirAcervo(acervoDemo);

const ids = (xs: { id: string }[]) => new Set(xs.map((x) => x.id));

describe('integridade do acervo', () => {
  const todos = [...acervo.periodos, ...acervo.marcos, ...acervo.fotos, ...acervo.documentos, ...acervo.pessoas, ...acervo.depoimentos];
  const P = ids(acervo.periodos), M = ids(acervo.marcos), F = ids(acervo.fotos), D = ids(acervo.documentos), PE = ids(acervo.pessoas), DP = ids(acervo.depoimentos);

  it('ids são únicos em todo o acervo', () => {
    expect(new Set(todos.map((x) => x.id)).size).toBe(todos.length);
  });

  it('toda peça tem fonte', () => {
    for (const x of todos) expect(x.fonte.descricao.length).toBeGreaterThan(0);
  });

  it('relacionamentos dos marcos apontam para peças existentes', () => {
    for (const m of acervo.marcos) {
      expect(P.has(m.periodoId)).toBe(true);
      m.fotoIds.forEach((id) => expect(F.has(id)).toBe(true));
      m.documentoIds.forEach((id) => expect(D.has(id)).toBe(true));
      m.pessoaIds.forEach((id) => expect(PE.has(id)).toBe(true));
      if (m.depoimentoId) expect(DP.has(m.depoimentoId)).toBe(true);
    }
  });

  it('ano de cada marco cai dentro do seu período', () => {
    for (const m of acervo.marcos) {
      const p = acervo.periodos.find((x) => x.id === m.periodoId)!;
      expect(m.ano).toBeGreaterThanOrEqual(p.inicio);
      expect(m.ano).toBeLessThanOrEqual(p.fim);
    }
  });

  it('pessoas, documentos e fotos referenciam peças existentes', () => {
    for (const p of acervo.pessoas) {
      p.marcoIds.forEach((id) => expect(M.has(id)).toBe(true));
      p.fotoIds.forEach((id) => expect(F.has(id)).toBe(true));
      if (p.retratoId) expect(F.has(p.retratoId)).toBe(true);
    }
    for (const d of acervo.documentos) if (d.marcoId) expect(M.has(d.marcoId)).toBe(true);
    for (const f of acervo.fotos) {
      if (f.marcoId) expect(M.has(f.marcoId)).toBe(true);
      if (f.periodoId) expect(P.has(f.periodoId)).toBe(true);
      expect(f.legenda.length).toBeLessThanOrEqual(140);
    }
  });

  it('o único conteúdo não demonstrativo é a fundadora verificada', () => {
    const reais = todos.filter((x) => !x.demo).map((x) => x.id);
    expect(reais).toEqual(['pe-01']);
  });
});