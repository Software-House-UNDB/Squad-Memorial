/**
 * Validação do check-in no celular, com as mensagens do protótipo. O servidor valida de novo
 * (backend/memorial/serializers.py) com as mesmas mensagens.
 */
import type { DadosCheckin, ErrosCheckin } from './tipos';

export const MENSAGENS = {
  nome: 'Escreva nome e sobrenome.',
  ano: 'Escolha o ano em que estudou.',
  turma: 'Informe a turma, por exemplo 3º A.',
  email: 'Informe um e-mail válido, por exemplo nome@email.com.',
  instagram: 'Confira o Instagram: só o nome de usuário, sem espaços.',
  facebook: 'Confira o Facebook: só o nome de usuário ou o endereço do perfil.',
  consentimento: 'Marque a autorização para aparecer nos totens.',
  fotos: 'Envie no máximo 3 fotos, de até 10 MB cada.',
} as const;

export const MAX_FOTOS = 3;
export const TAMANHO_MAXIMO_FOTO = 10 * 1024 * 1024;

/** '@fulano', 'instagram.com/fulano' e 'https://www.instagram.com/fulano/' viram 'fulano'. */
export function soUsuario(valor: string, dominio: 'instagram' | 'facebook'): string {
  return valor
    .trim()
    .replace(new RegExp(`^(https?://)?(www\\.|m\\.)?${dominio}\\.com/`, 'i'), '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/^@/, '')
    .trim();
}

export function validarCheckin(d: DadosCheckin, anoInicial: number, anoAtual: number): ErrosCheckin {
  const erros: ErrosCheckin = {};
  const partes = d.nome.trim().split(/\s+/).filter((p) => /\p{L}/u.test(p));
  if (partes.length < 2 || partes.join(' ').length < 4) erros.nome = MENSAGENS.nome;
  const ano = Number(d.ano);
  if (!d.ano || !Number.isInteger(ano) || ano < anoInicial || ano > anoAtual) erros.ano = MENSAGENS.ano;
  if (!d.turma.trim()) erros.turma = MENSAGENS.turma;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) erros.email = MENSAGENS.email;
  const ig = soUsuario(d.instagram, 'instagram');
  if (ig && !/^[A-Za-z0-9._]{1,30}$/.test(ig)) erros.instagram = MENSAGENS.instagram;
  const fb = soUsuario(d.facebook, 'facebook');
  if (fb && !/^[A-Za-z0-9.\-_/?=]{1,100}$/.test(fb)) erros.facebook = MENSAGENS.facebook;
  if (d.fotos.length > MAX_FOTOS || d.fotos.some((f) => f.size > TAMANHO_MAXIMO_FOTO)) erros.fotos = MENSAGENS.fotos;
  if (!d.consentimento) erros.consentimento = MENSAGENS.consentimento;
  return erros;
}

/** Ordem dos campos no formulário: o primeiro com erro recebe o foco. */
export const ORDEM_CAMPOS = ['nome', 'ano', 'turma', 'email', 'instagram', 'facebook', 'fotos', 'consentimento'] as const;
