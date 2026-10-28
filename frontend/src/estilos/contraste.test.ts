/**
 * Contraste dos pares de cor usados em texto (WCAG 2.1), lidos direto de tokens.css.
 * Os valores ficam registrados no DESIGN.md; se a paleta mudar, este teste diz o que quebrou.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const token = (nome: string) => {
  const m = css.match(new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${nome} não encontrado`);
  return m[1];
};

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// [texto, fundo, mínimo]: 4,5 para texto comum; 3 só para texto grande (≥ 24 px ou ≥ 18,66 px em negrito)
const PARES: [string, string, number][] = [
  ['grafite', 'marfim', 4.5], ['grafite', 'areia', 4.5], ['grafite-2', 'areia', 4.5],
  ['suave', 'marfim', 4.5], ['suave', 'areia', 4.5],
  ['suave-2', 'marfim', 4.5], ['suave-2', 'cartao', 4.5], ['suave-2', 'areia', 4.5],
  ['dourado-texto', 'marfim', 4.5], ['dourado-texto', 'cartao', 4.5], ['dourado-texto', 'areia', 4.5],
  ['dourado-texto', 'dourado-fundo', 4.5],
  ['dourado', 'grafite', 4.5], ['dourado', 'grafite-3', 4.5],
  ['dourado-claro', 'grafite', 4.5], ['dourado-claro', 'grafite-2', 4.5], ['suave-escuro', 'grafite', 4.5],
  ['marfim', 'grafite', 4.5], ['erro', 'marfim', 4.5],
  ['marfim', 'sala-1', 4.5], ['marfim', 'sala-2', 4.5], ['marfim', 'sala-3', 4.5], ['marfim', 'sala-4', 4.5], ['marfim', 'sala-5', 4.5],
];

describe('contraste dos tokens', () => {
  it.each(PARES)('%s sobre %s ≥ %s', (texto, fundo, minimo) => {
    expect(contraste(token(texto), token(fundo))).toBeGreaterThanOrEqual(minimo);
  });

  it('dourado puro sobre fundo claro fica só para ornamento (abaixo de 3:1)', () => {
    expect(contraste(token('dourado'), token('marfim'))).toBeLessThan(3);
  });

});
