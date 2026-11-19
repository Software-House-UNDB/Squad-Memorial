import { describe, expect, it } from 'vitest';
import { orientacaoDaUrl } from './quiosque';
import { medidasDoPalco, orientacaoDaTela } from '../quiosque/Palco';

describe('orientação do palco', () => {
  it('segue a proporção da tela', () => {
    expect(orientacaoDaTela(1920, 1080, null)).toBe('paisagem');
    expect(orientacaoDaTela(1080, 1920, null)).toBe('retrato');
    expect(orientacaoDaTela(1000, 1000, null)).toBe('paisagem');
  });
  it('?orientacao= fixa uma delas', () => {
    expect(orientacaoDaUrl('retrato')).toBe('retrato');
    expect(orientacaoDaUrl('vertical')).toBe('retrato');
    expect(orientacaoDaUrl('paisagem')).toBe('paisagem');
    expect(orientacaoDaUrl('x')).toBeNull();
    expect(orientacaoDaTela(1920, 1080, 'retrato')).toBe('retrato');
  });
  it('palco em pé é o deitado girado', () => {
    expect(medidasDoPalco('paisagem')).toEqual({ largura: 1600, altura: 900 });
    expect(medidasDoPalco('retrato')).toEqual({ largura: 900, altura: 1600 });
  });
});
