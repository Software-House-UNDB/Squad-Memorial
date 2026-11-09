import { describe, expect, it } from 'vitest';
import { AS_PRINCIPAIS, empacotar, lerEntrada, lerRedes, MAIS_REDES, normalizarOutra, normalizarRede, REDES } from './redes';
import { exibirTurma, separarTurma, turmaComTurno, type DadosCheckin } from './tipos';
import { MENSAGENS, ORDEM_CAMPOS, validarCheckin } from './validacao';

describe('lerEntrada', () => {
  it.each([
    ['https://br.linkedin.com/in/maria-souza?x=1', 'linkedin', 'maria-souza'],
    ['linkedin.com/in/maria-souza/', 'linkedin', 'maria-souza'],
    ['https://www.instagram.com/maria.souza/', 'instagram', 'maria.souza'],
    ['https://m.facebook.com/maria.souza#fotos', 'facebook', 'maria.souza'],
    ['https://www.tiktok.com/@maria_souza?lang=pt', 'tiktok', 'maria_souza'],
    ['twitter.com/maria_s', 'x', 'maria_s'],
    ['https://x.com/maria_s', 'x', 'maria_s'],
    ['https://www.youtube.com/@mariasouza', 'youtube', 'mariasouza'],
    ['https://www.threads.net/@maria.souza', 'threads', 'maria.souza'],
    ['https://www.facebook.com/user/maria.souza/', 'facebook', 'maria.souza'],
    ['https://www.snapchat.com/add/maria.s', 'snapchat', 'maria.s'],
    ['https://t.me/maria_souza', 'telegram', 'maria_souza'],
    ['https://kw.ai/@maria', 'kwai', 'maria'],
    ['https://www.twitch.tv/mariastream', 'twitch', 'mariastream'],
    ['https://github.com/maria-souza', 'github', 'maria-souza'],
    ['https://www.behance.net/mariasouza', 'behance', 'mariasouza'],
    ['https://br.pinterest.com/maria.souza/', 'pinterest', 'maria.souza'],
  ])('%s', (entrada, rede, usuario) => {
    expect(lerEntrada(entrada)).toEqual({ rede, usuario });
  });

  it('texto que não é endereço devolve só o usuário, sem o @', () => {
    expect(lerEntrada('@maria.souza')).toEqual({ rede: null, usuario: 'maria.souza' });
    expect(lerEntrada('maria.souza')).toEqual({ rede: null, usuario: 'maria.souza' });
  });

  it('endereço de site que não está na lista vira "outra", com o texto original', () => {
    expect(lerEntrada('https://meusite.com.br/maria')).toEqual({ rede: 'outra', usuario: 'https://meusite.com.br/maria' });
    expect(lerEntrada('meusite.com/maria')).toEqual({ rede: 'outra', usuario: 'meusite.com/maria' });
  });

  it('não confunde subdomínio parecido com a rede', () => {
    expect(lerEntrada('https://instagram.com.golpe.net/maria').rede).toBe('outra');
  });
});

describe('empacotar e lerRedes', () => {
  it('Instagram vai em instagram; Facebook vai sem prefixo; as demais com prefixo em facebook', () => {
    expect(empacotar('outra', 'https://www.MeuSite.com/@maria/?x=1')).toEqual({ instagram: '', facebook: 'outra/meusite.com/maria' });
    expect(empacotar('outra', 'semcaminho.com')).toEqual({ instagram: '', facebook: '' });
    expect(empacotar('instagram', 'maria')).toEqual({ instagram: 'maria', facebook: '' });
    expect(empacotar('facebook', 'maria.s')).toEqual({ instagram: '', facebook: 'maria.s' });
    expect(empacotar('tiktok', 'maria')).toEqual({ instagram: '', facebook: 'tiktok/maria' });
    expect(empacotar('', 'maria')).toEqual({ instagram: '', facebook: '' });
    expect(empacotar('x', '')).toEqual({ instagram: '', facebook: '' });
  });

  it('cada rede volta como foi guardada, e o Facebook antigo continua Facebook', () => {
    for (const { id } of REDES) {
      const usuario = id === 'outra' ? 'meusite.com/maria' : 'maria';
      const { instagram, facebook } = empacotar(id, usuario);
      expect(lerRedes(instagram, facebook)).toEqual([{ id, usuario }]);
    }
    expect(lerRedes('', 'outra/meusite.com/maria')).toEqual([{ id: 'outra', usuario: 'meusite.com/maria' }]);
    expect(lerRedes('', 'fulano.silva')).toEqual([{ id: 'facebook', usuario: 'fulano.silva' }]);
    expect(lerRedes('ana', 'fulano')).toEqual([{ id: 'instagram', usuario: 'ana' }, { id: 'facebook', usuario: 'fulano' }]);
    expect(lerRedes('', '')).toEqual([]);
  });

  it('exibir mostra o endereço como texto', () => {
    const texto = (id: string, u: string) => REDES.find((r) => r.id === id)?.exibir(u);
    expect(texto('tiktok', 'maria')).toBe('tiktok.com/@maria');
    expect(texto('linkedin', 'maria-souza')).toBe('linkedin.com/in/maria-souza');
    expect(texto('facebook', 'maria')).toBe('facebook.com/maria');
    expect(texto('facebook', 'pages/Maria/123')).toBe('pages/Maria/123');
  });

  it('o link colado vale mais que o botão escolhido', () => {
    expect(normalizarRede('instagram', 'linkedin.com/in/maria-souza')).toEqual({ rede: 'linkedin', usuario: 'maria-souza' });
    expect(normalizarRede('tiktok', '@maria')).toEqual({ rede: 'tiktok', usuario: 'maria' });
  });
});

describe('normalizarOutra', () => {
  it.each([
    ['https://www.MeuSite.com/@maria/', 'meusite.com/maria'],
    ['http://meusite.com/pessoas/@maria/?x=1#topo', 'meusite.com/pessoas/maria'],
    ['  site.com.br/perfil  ', 'site.com.br/perfil'],
  ])('%s', (entrada, saida) => {
    expect(normalizarOutra(entrada)).toBe(saida);
  });

  it('recusa sem caminho, sem ponto no domínio, com símbolos ou acima de 94 caracteres', () => {
    expect(normalizarOutra('meusite.com')).toBeNull();
    expect(normalizarOutra('meusite.com/')).toBeNull();
    expect(normalizarOutra('localhost/maria')).toBeNull();
    expect(normalizarOutra('meusite.com/ma ria')).toBeNull();
    expect(normalizarOutra('meusite.com/maria$')).toBeNull();
    expect(normalizarOutra(`a.com/${'x'.repeat(88)}`)).not.toBeNull(); // 6 + 88 = 94
    expect(normalizarOutra(`a.com/${'x'.repeat(89)}`)).toBeNull();
  });
});

describe('listas de redes', () => {
  it('as principais vêm primeiro; "Mais redes" tem o resto, com "outra" por último', () => {
    expect(AS_PRINCIPAIS).toEqual(['instagram', 'tiktok', 'linkedin', 'facebook']);
    expect(MAIS_REDES).toEqual(['x', 'youtube', 'threads', 'kwai', 'pinterest', 'snapchat', 'telegram', 'twitch', 'github', 'behance', 'outra']);
  });
});

describe('turno na turma', () => {
  it('vai e volta', () => {
    expect(turmaComTurno(' 3º A ', 'matutino')).toBe('3º A - Matutino');
    expect(separarTurma('3º A - Vespertino')).toEqual({ turma: '3º A', turno: 'vespertino' });
    expect(separarTurma('3º A')).toEqual({ turma: '3º A', turno: '' });
    expect(exibirTurma('3º A - Noturno')).toBe('3º A · Noturno');
    expect(exibirTurma('8ª B')).toBe('8ª B');
  });
});

const BASE: DadosCheckin = {
  nome: 'Maria Souza', ano: '1998', turma: '3º A', turno: 'matutino', email: 'maria@exemplo.com',
  rede: '', usuario: '', consentimento: true, fotos: [], site: '',
};
const erros = (parcial: Partial<DadosCheckin> = {}) => validarCheckin({ ...BASE, ...parcial }, 1958, 2026);

describe('validarCheckin: turma, turno e rede', () => {
  it('aceita o cadastro completo, com e sem rede', () => {
    expect(erros()).toEqual({});
    expect(erros({ rede: 'instagram', usuario: 'maria.souza' })).toEqual({});
  });

  it('turma com mais de 17 caracteres é erro; 17 passam', () => {
    expect(erros({ turma: '1234567890123456' + '7' }).turma).toBeUndefined();
    expect(erros({ turma: '1234567890123456' + '78' }).turma).toBe(MENSAGENS.turmaLonga);
  });

  it('exige o turno entre os valores da lista', () => {
    expect(erros({ turno: '' }).turno).toBe(MENSAGENS.turno);
    expect(erros({ turno: 'integral' as never }).turno).toBe(MENSAGENS.turno);
  });

  it('usuário sem rede é erro; rede sem usuário é ignorada', () => {
    expect(erros({ usuario: 'maria' }).rede).toBe(MENSAGENS.redeSemEscolha);
    expect(erros({ rede: 'tiktok', usuario: '' })).toEqual({});
  });

  it('o usuário precisa ser da rede escolhida', () => {
    expect(erros({ rede: 'x', usuario: 'nome_muito_comprido_para_x' }).rede).toBe(MENSAGENS.redeInvalida('X'));
    expect(erros({ rede: 'instagram', usuario: 'maria souza' }).rede).toBe(MENSAGENS.redeInvalida('Instagram'));
  });

  it('endereço de empresa do LinkedIn é recusado; o do perfil, aceito', () => {
    expect(erros({ rede: 'linkedin', usuario: 'linkedin.com/company/undb' }).rede).toBe(MENSAGENS.redeInvalida('LinkedIn'));
    expect(erros({ rede: 'linkedin', usuario: 'https://br.linkedin.com/in/maria-souza?x=1' })).toEqual({});
  });

  it('"Outra rede" pede um link curto; o link inteiro de um site qualquer é aceito', () => {
    expect(erros({ rede: 'outra', usuario: 'meusite.com/maria' })).toEqual({});
    expect(erros({ rede: 'outra', usuario: 'https://www.meusite.com.br/maria/?x=1' })).toEqual({});
    expect(erros({ usuario: 'https://meusite.com.br/maria' })).toEqual({});
    expect(erros({ rede: 'outra', usuario: 'meusite.com' }).rede).toBe(MENSAGENS.outraInvalida);
    expect(erros({ rede: 'outra', usuario: 'maria' }).rede).toBe(MENSAGENS.outraInvalida);
    expect(erros({ rede: 'outra', usuario: `a.com/${'x'.repeat(95)}` }).rede).toBe(MENSAGENS.outraInvalida);
  });

  it('as redes novas conferem o usuário', () => {
    expect(erros({ rede: 'telegram', usuario: 'mari' }).rede).toBe(MENSAGENS.redeInvalida('Telegram'));
    expect(erros({ rede: 'telegram', usuario: 'maria_souza' })).toEqual({});
    expect(erros({ rede: 'github', usuario: 'maria_souza' }).rede).toBe(MENSAGENS.redeInvalida('GitHub'));
  });

  it('o primeiro erro a receber o foco segue a ordem do formulário', () => {
    const e = erros({ turno: '', email: 'x', usuario: 'maria' });
    expect(ORDEM_CAMPOS.find((k) => e[k])).toBe('turno');
  });
});
