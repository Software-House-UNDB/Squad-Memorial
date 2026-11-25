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
  it('acompanha a proporção da tela só na altura, dentro dos limites', () => {
    // 16:9 e 9:16: as medidas de referência, sem sobra
    expect(medidasDoPalco('paisagem', { largura: 1920, altura: 1080 })).toEqual({ largura: 1600, altura: 900 });
    expect(medidasDoPalco('retrato', { largura: 1080, altura: 1920 })).toEqual({ largura: 900, altura: 1600 });
    // 16:10 e 4:3 deitados; 3:4 em pé (tablet)
    expect(medidasDoPalco('paisagem', { largura: 1440, altura: 900 })).toEqual({ largura: 1600, altura: 1000 });
    expect(medidasDoPalco('paisagem', { largura: 1024, altura: 768 })).toEqual({ largura: 1600, altura: 1200 });
    expect(medidasDoPalco('retrato', { largura: 768, altura: 1024 })).toEqual({ largura: 900, altura: 1200 });
    // fora dos limites: mais largo que 16:9 fica em 900; celular alongado para em 2000
    expect(medidasDoPalco('paisagem', { largura: 2560, altura: 1080 })).toEqual({ largura: 1600, altura: 900 });
    expect(medidasDoPalco('retrato', { largura: 390, altura: 844 })).toEqual({ largura: 900, altura: 1948 });
    expect(medidasDoPalco('retrato', { largura: 300, altura: 900 })).toEqual({ largura: 900, altura: 2000 });
  });
});
