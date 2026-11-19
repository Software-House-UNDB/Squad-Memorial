import { describe, expect, it } from 'vitest';
import { salaDoCaminho } from './quiosque';
import { salaValida } from './sala';

describe('salaValida', () => {
  it('aceita 1 a 6', () => {
    for (const n of [1, 2, 3, 4, 5, 6]) expect(salaValida(String(n))).toBe(n);
  });
  it('recusa o resto', () => {
    for (const v of [null, '', '0', '7', '2.5', 'abc', '-1']) expect(salaValida(v)).toBeNull();
  });
});

describe('salaDoCaminho', () => {
  it('lê o número de /memorial/sala/N', () => {
    expect(salaDoCaminho('/memorial/sala/3')).toBe('3');
    expect(salaDoCaminho('/memorial/sala/6/')).toBe('6');
  });
  it('ignora outros caminhos', () => {
    for (const c of ['/', '/memorial/', '/memorial/sala/', '/memorial/sala/3/extra', '/check-in/']) {
      expect(salaDoCaminho(c)).toBeNull();
    }
  });
});
