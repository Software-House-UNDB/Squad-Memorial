import { describe, expect, it } from 'vitest';
import { textoSucesso } from './Checkin';

describe('tela final do check-in', () => {
  it('com aprovação de perfis, não promete que o perfil já aparece', () => {
    expect(textoSucesso(true, 0)).toMatch(/assim que a equipe do Memorial aprovar/);
    expect(textoSucesso(true, 2)).toMatch(/perfil e suas fotos aparecem .* assim que a equipe/);
    expect(textoSucesso(true, 0)).not.toMatch(/já encontram/);
  });
  it('sem aprovação de perfis, o perfil já aparece; as fotos esperam a equipe', () => {
    expect(textoSucesso(false, 0)).toMatch(/já encontram você pelo nome\.$/);
    expect(textoSucesso(false, 1)).toMatch(/fotos aparecem depois da aprovação/);
  });
});
