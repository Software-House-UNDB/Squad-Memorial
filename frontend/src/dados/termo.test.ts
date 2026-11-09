import { describe, expect, it } from 'vitest';
import { separarTermo, TERMO_PADRAO } from './termo';

describe('termo de uso', () => {
  it('a primeira linha é o título e o resto, o corpo', () => {
    const { titulo, corpo } = separarTermo(TERMO_PADRAO);
    expect(titulo).toBe('Termo de uso dos dados e da imagem');
    expect(corpo.startsWith('Ao fazer o check-in no Memorial Dom Bosco')).toBe(true);
    expect(corpo.endsWith('ou até o meu pedido.')).toBe(true);
  });

  it('traz os quatro itens numerados, cada um num parágrafo', () => {
    const { corpo } = separarTermo(TERMO_PADRAO);
    const paragrafos = corpo.split('\n\n');
    expect(paragrafos).toHaveLength(5);
    for (let n = 1; n <= 4; n++) expect(paragrafos[n].startsWith(`${n}. `)).toBe(true);
  });

  it('não exige idade mínima', () => {
    expect(TERMO_PADRAO).not.toMatch(/18 anos|maior de idade|idade mínima/i);
  });

  it('texto de uma linha só vira corpo, sem título', () => {
    expect(separarTermo('Autorizo.')).toEqual({ titulo: '', corpo: 'Autorizo.' });
  });
});
