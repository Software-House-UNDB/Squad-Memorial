import { describe, expect, it } from 'vitest';
import { limparBreadcrumb, limparEvento, semEmails } from './observabilidade';

describe('Sentry sem dados pessoais (LGPD)', () => {
  it('URL perde a query em qualquer texto (spans de desempenho incluídos)', () => {
    expect(semEmails({ spans: [{ description: 'http://memorial.test/sala/6?q=maria+souza' }, { description: 'GET /api/memorial/alunos/?q=joao' }] }))
      .toEqual({ spans: [{ description: 'http://memorial.test/sala/6' }, { description: 'GET /api/memorial/alunos/' }] });
  });

  it('troca e-mails em qualquer texto', () => {
    expect(semEmails({ a: ['erro para maria.souza@exemplo.com'], b: 3 })).toEqual({ a: ['erro para [e-mail]'], b: 3 });
  });

  it('evento sai sem usuário, cabeçalhos, cookies e query string', () => {
    const limpo = limparEvento({
      request: { url: 'https://memorial.test/sala/6?q=maria', headers: { Cookie: 'x' }, cookies: { a: 'b' }, query_string: 'q=maria' },
      user: { email: 'maria@exemplo.com', ip_address: '200.1.2.3' },
    });
    expect(limpo).toEqual({ request: { url: 'https://memorial.test/sala/6' } });
  });

  it('breadcrumb de rede perde a query; console e digitação não são enviados', () => {
    const b = limparBreadcrumb({ category: 'fetch', data: { url: '/api/memorial/alunos/?q=joao+sil', method: 'GET' } });
    expect(b?.data).toEqual({ url: '/api/memorial/alunos/', method: 'GET' });
    expect(limparBreadcrumb({ category: 'console', message: 'maria@exemplo.com' })).toBeNull();
    expect(limparBreadcrumb({ category: 'ui.input', message: 'input[name=email]' })).toBeNull();
  });
});
