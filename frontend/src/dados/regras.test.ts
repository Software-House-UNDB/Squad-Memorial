import { describe, expect, it } from 'vitest';
import { corresponde, decadas, iniciais, nomeCurto, periodosDasFotos, rotuloDecada, trechos } from './regras';
import type { Foto } from './tipos';

const foto = (id: number, ano: number): Foto => ({ id, ano, legenda: '', credito: '', alt: '', src: null, miniatura: null, largura: null, altura: null });

describe('busca', () => {
  it('ignora acento e maiúsculas; cada palavra precisa estar no nome', () => {
    expect(corresponde('João Pedro da Silva Sales', 'joao sil')).toBe(true);
    expect(corresponde('João Pedro da Silva Sales', 'JOÃO  SALES')).toBe(true);
    expect(corresponde('Antônio Silva Façanha', 'facanha')).toBe(true);
    expect(corresponde('João Pedro da Silva Sales', 'joao moura')).toBe(false);
    expect(corresponde('Qualquer Nome', '')).toBe(true);
  });

  it('realça o trecho encontrado no nome original, com acento', () => {
    expect(trechos('João Pedro da Silva', 'joao sil')).toEqual([
      { texto: 'João', marcado: true },
      { texto: ' Pedro da ', marcado: false },
      { texto: 'Sil', marcado: true },
      { texto: 'va', marcado: false },
    ]);
    expect(trechos('Ana', '')).toEqual([{ texto: 'Ana', marcado: false }]);
  });

  it('iniciais e nome curto', () => {
    expect(iniciais('João Pedro da Silva Sales')).toBe('JS');
    expect(iniciais('Ana Beatriz Silva Moura')).toBe('AM');
    expect(nomeCurto('Maria Clara Silva Fontenele')).toBe('Maria Fontenele');
  });
});

describe('períodos de 5 anos', () => {
  it('agrupa a partir do ano inicial e só mostra blocos com foto', () => {
    const p = periodosDasFotos([foto(1, 1985), foto(2, 1983), foto(3, 1958), foto(4, 2025)], 1958, 2026);
    expect(p.map((x) => x.rotulo)).toEqual(['1958 – 1962', '1983 – 1987', '2023 – 2026']);
    expect(p[1].fotos.map((f) => f.ano)).toEqual([1983, 1985]);
  });
});

describe('décadas', () => {
  it('junta 1958–1959 com os anos 60 e termina no ano atual', () => {
    expect(decadas(1958, 2026).map(rotuloDecada)).toEqual([
      '1958–1969', '1970–1979', '1980–1989', '1990–1999', '2000–2009', '2010–2019', '2020–2026',
    ]);
    expect(decadas(1955, 1972).map(rotuloDecada)).toEqual(['1955–1959', '1960–1969', '1970–1972']);
  });
});
