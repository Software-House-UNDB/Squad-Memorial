import { describe, expect, it } from 'vitest';
import { salaValida } from './sala';

describe('salaValida', () => {
  it('aceita 1 a 5', () => {
    for (const n of [1, 2, 3, 4, 5]) expect(salaValida(String(n))).toBe(n);
  });
  it('recusa o resto', () => {
    for (const v of [null, '', '0', '6', '2.5', 'abc', '-1']) expect(salaValida(v)).toBeNull();
  });
});
