import { describe, expect, it } from 'vitest';
import { direcaoDoArraste } from './arrastar';

describe('arrastar para os lados', () => {
  it('para a esquerda passa para o próximo; para a direita, para o anterior', () => {
    expect(direcaoDoArraste(-120, 10)).toBe(1);
    expect(direcaoDoArraste(120, -10)).toBe(-1);
  });
  it('toque curto continua sendo toque', () => {
    expect(direcaoDoArraste(-30, 0)).toBe(0);
    expect(direcaoDoArraste(0, 0)).toBe(0);
  });
  it('arraste mais vertical que lateral não passa (é rolagem)', () => {
    expect(direcaoDoArraste(-80, 90)).toBe(0);
    expect(direcaoDoArraste(-200, 100)).toBe(1);
  });
});
