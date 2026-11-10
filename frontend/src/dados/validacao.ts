/**
 * Validação do check-in no celular, com as mensagens do protótipo. O servidor valida de novo
 * (backend/memorial/serializers.py) com as mesmas mensagens.
 */
import { normalizarRede, redePorId, usuarioValido } from './redes';
import { type DadosCheckin, type ErrosCheckin } from './tipos';

export const MENSAGENS = {
  nome: 'Escreva nome e sobrenome.',
  ano: 'Escolha o ano em que estudou.',
  turma: 'Informe a turma, por exemplo 3º A.',
  email: 'Informe um e-mail válido, por exemplo nome@email.com.',
  redeSemEscolha: 'Escolha qual é a rede social.',
  redeInvalida: (rotulo: string) => `Confira o usuário: ele não parece ser do ${rotulo}.`,
  outraInvalida: 'Cole o endereço curto do perfil, por exemplo site.com/seu-perfil (até 94 caracteres, sem símbolos).',
  consentimento: 'Marque a autorização para aparecer nos totens.',
  fotos: 'Envie no máximo 3 fotos, de até 10 MB cada.',
} as const;

export const MAX_FOTOS = 3;
export const TAMANHO_MAXIMO_FOTO = 10 * 1024 * 1024;

export function validarCheckin(d: DadosCheckin, anoInicial: number, anoAtual: number): ErrosCheckin {
  const erros: ErrosCheckin = {};
  const partes = d.nome.trim().split(/\s+/).filter((p) => /\p{L}/u.test(p));
  if (partes.length < 2 || partes.join(' ').length < 4) erros.nome = MENSAGENS.nome;
  const ano = Number(d.ano);
  if (!d.ano || !Number.isInteger(ano) || ano < anoInicial || ano > anoAtual) erros.ano = MENSAGENS.ano;
  const turma = d.turma.replace(/\s+/g, ' ').trim();
  if (!turma) erros.turma = MENSAGENS.turma;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) erros.email = MENSAGENS.email;
  // Rede escolhida sem usuário é ignorada; usuário sem rede, ou que não é daquela rede, é erro.
  const { rede, usuario } = normalizarRede(d.rede, d.usuario);
  if (usuario) {
    if (!rede) erros.rede = MENSAGENS.redeSemEscolha;
    else if (!usuarioValido(rede, usuario)) {
      erros.rede = rede === 'outra' ? MENSAGENS.outraInvalida : MENSAGENS.redeInvalida(redePorId(rede).rotulo);
    }
  }
  if (d.fotos.length > MAX_FOTOS || d.fotos.some((f) => f.size > TAMANHO_MAXIMO_FOTO)) erros.fotos = MENSAGENS.fotos;
  if (!d.consentimento) erros.consentimento = MENSAGENS.consentimento;
  return erros;
}

/** Ordem dos campos no formulário: o primeiro com erro recebe o foco. */
export const ORDEM_CAMPOS = ['nome', 'ano', 'turma', 'email', 'rede', 'fotos', 'consentimento'] as const;
