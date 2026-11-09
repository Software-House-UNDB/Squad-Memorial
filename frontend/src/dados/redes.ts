/**
 * Rede social do check-in: uma só por pessoa, escolhida por botões.
 *
 * FORMATO GUARDADO HOJE (o servidor ainda não tem campo de rede nem de turno):
 *   - Instagram vai no campo `instagram`, só o usuário: "maria.souza".
 *   - Facebook vai no campo `facebook`, sem prefixo: "maria.souza" (igual aos cadastros antigos).
 *   - As demais redes vão no campo `facebook`, com o id da rede e uma barra na frente:
 *     "tiktok/maria", "linkedin/maria-souza", "x/maria_s", "youtube/canal", "threads/maria"...
 *   - "Outra rede" vai no campo `facebook` como "outra/site.com/caminho" (sem https:// nem www.; até 94
 *     caracteres, para caber nos 100 que o servidor aceita).
 *   - O turno vai dentro do campo `turma`, em tipos.ts: "3º A - Matutino" (veja turmaComTurno e separarTurma).
 *
 * Quem for migrar: só este arquivo (empacotar e lerRedes) e as duas funções de turno em tipos.ts conhecem
 * esse formato. Formulário, validação, perfil e busca trabalham com valores limpos (rede, usuario, turno).
 * Com a coluna turno e a lista de redes no backend, troque o corpo dessas funções e mais nada.
 */
export type RedeId =
  | 'instagram' | 'tiktok' | 'linkedin' | 'facebook' | 'x' | 'youtube' | 'threads'
  | 'kwai' | 'pinterest' | 'snapchat' | 'telegram' | 'twitch' | 'github' | 'behance' | 'outra';

export interface Rede {
  id: RedeId;
  rotulo: string;
  /** Nome do ícone em Icone.tsx. */
  icone: string;
  /** Domínios do endereço do perfil (um subdomínio como www, br ou m também vale). */
  dominios: string[];
  /** O que o usuário precisa ser (sem arroba e sem endereço). Em "outra" o "usuário" é o link curto do perfil. */
  usuario: RegExp;
  /** O que o campo mostra antes do usuário. */
  prefixoLink: string;
  /** Texto mostrado no perfil. O totem não abre links: é só texto. */
  exibir: (usuario: string) => string;
}

export const REDES: Rede[] = [
  { id: 'instagram', rotulo: 'Instagram', icone: 'insta', dominios: ['instagram.com'], usuario: /^[A-Za-z0-9._]{1,30}$/, prefixoLink: 'instagram.com/', exibir: (u) => `instagram.com/${u}` },
  { id: 'tiktok', rotulo: 'TikTok', icone: 'tiktok', dominios: ['tiktok.com'], usuario: /^[A-Za-z0-9._]{2,24}$/, prefixoLink: 'tiktok.com/@', exibir: (u) => `tiktok.com/@${u}` },
  { id: 'linkedin', rotulo: 'LinkedIn', icone: 'linkedin', dominios: ['linkedin.com'], usuario: /^[A-Za-z0-9\-_]{3,80}$/, prefixoLink: 'linkedin.com/in/', exibir: (u) => `linkedin.com/in/${u}` },
  {
    id: 'facebook', rotulo: 'Facebook', icone: 'fb', dominios: ['facebook.com'], usuario: /^[A-Za-z0-9.\-_/?=]{1,100}$/, prefixoLink: 'facebook.com/',
    exibir: (u) => (u.includes('/') ? u : `facebook.com/${u}`),
  },
  { id: 'x', rotulo: 'X', icone: 'rede_x', dominios: ['x.com', 'twitter.com'], usuario: /^[A-Za-z0-9_]{1,15}$/, prefixoLink: 'x.com/', exibir: (u) => `x.com/${u}` },
  { id: 'youtube', rotulo: 'YouTube', icone: 'youtube', dominios: ['youtube.com'], usuario: /^[A-Za-z0-9._\-]{3,30}$/, prefixoLink: 'youtube.com/@', exibir: (u) => `youtube.com/@${u}` },
  { id: 'threads', rotulo: 'Threads', icone: 'threads', dominios: ['threads.net', 'threads.com'], usuario: /^[A-Za-z0-9._]{1,30}$/, prefixoLink: 'threads.net/@', exibir: (u) => `threads.net/@${u}` },
  { id: 'kwai', rotulo: 'Kwai', icone: 'link', dominios: ['kwai.com', 'kw.ai'], usuario: /^[A-Za-z0-9._\-]{2,40}$/, prefixoLink: 'kwai.com/@', exibir: (u) => `kwai.com/@${u}` },
  { id: 'pinterest', rotulo: 'Pinterest', icone: 'pinterest', dominios: ['pinterest.com'], usuario: /^[A-Za-z0-9._\-]{2,40}$/, prefixoLink: 'pinterest.com/', exibir: (u) => `pinterest.com/${u}` },
  { id: 'snapchat', rotulo: 'Snapchat', icone: 'snapchat', dominios: ['snapchat.com'], usuario: /^[A-Za-z0-9._\-]{3,15}$/, prefixoLink: 'snapchat.com/add/', exibir: (u) => `snapchat.com/add/${u}` },
  { id: 'telegram', rotulo: 'Telegram', icone: 'telegram', dominios: ['t.me', 'telegram.me'], usuario: /^[A-Za-z0-9_]{5,32}$/, prefixoLink: 't.me/', exibir: (u) => `t.me/${u}` },
  { id: 'twitch', rotulo: 'Twitch', icone: 'twitch', dominios: ['twitch.tv'], usuario: /^[A-Za-z0-9_]{4,25}$/, prefixoLink: 'twitch.tv/', exibir: (u) => `twitch.tv/${u}` },
  { id: 'github', rotulo: 'GitHub', icone: 'github', dominios: ['github.com'], usuario: /^[A-Za-z0-9\-]{1,39}$/, prefixoLink: 'github.com/', exibir: (u) => `github.com/${u}` },
  { id: 'behance', rotulo: 'Behance', icone: 'behance', dominios: ['behance.net'], usuario: /^[A-Za-z0-9._\-]{3,40}$/, prefixoLink: 'behance.net/', exibir: (u) => `behance.net/${u}` },
  { id: 'outra', rotulo: 'Outra rede', icone: 'link', dominios: [], usuario: /^.+$/, prefixoLink: '', exibir: (u) => u },
];

export const redePorId = (id: RedeId): Rede => REDES.find((r) => r.id === id) as Rede;

/** Os botões sempre à vista; as demais ficam em "Mais redes", na ordem da lista e com "outra" por último. */
export const AS_PRINCIPAIS: RedeId[] = ['instagram', 'tiktok', 'linkedin', 'facebook'];
export const MAIS_REDES: RedeId[] = REDES.map((r) => r.id).filter((id) => !AS_PRINCIPAIS.includes(id));

const LINK_CURTO = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+\/[A-Za-z0-9._\-/]+$/;
const MAX_OUTRA = 94; // "outra/" + 94 = 100, o que o servidor aceita no campo facebook

/**
 * Limpa o link de uma "Outra rede": sem https://, sem www., sem parâmetros, sem @ no começo de cada trecho
 * do caminho e sem barras no fim; o domínio fica em minúsculas. Devolve "site.com/caminho" ou null se não der.
 */
export function normalizarOutra(texto: string): string | null {
  const semParametros = texto.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/[?#].*$/s, '');
  const [dominio, ...trechos] = semParametros.split('/');
  const caminho = trechos.map((t) => t.replace(/^@/, '')).join('/').replace(/\/+$/, '');
  const limpo = `${dominio.toLowerCase()}/${caminho}`;
  return limpo.length <= MAX_OUTRA && LINK_CURTO.test(limpo) ? limpo : null;
}

/** Endereço: com protocolo, ou "dominio.com/algo". "maria.silva" sozinho é um usuário, não um endereço. */
const ENDERECO = /^(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/(.*))?$/i;

/**
 * Lê o que a pessoa digitou ou colou. Um endereço de rede conhecida ("https://br.linkedin.com/in/maria-souza?x=1")
 * devolve a rede e só o usuário ("maria-souza"). Um endereço de site que não está na lista devolve a rede
 * "outra" e o texto original. Texto que não é endereço devolve só o usuário, sem o @.
 */
export function lerEntrada(texto: string): { rede: RedeId | null; usuario: string } {
  const limpo = texto.trim().replace(/[?#].*$/s, '');
  const achou = limpo.match(ENDERECO);
  if (achou && (/^https?:\/\//i.test(limpo) || achou[2] !== undefined)) {
    const host = achou[1].toLowerCase();
    const rede = REDES.find((r) => r.dominios.some((d) => host === d || host.endsWith(`.${d}`)));
    if (!rede) return { rede: 'outra', usuario: texto.trim() };
    const usuario = (achou[2] ?? '')
      .replace(/^\/+/, '')
      .replace(/^(in|user|add)\//i, '')
      .replace(/^@/, '')
      .replace(/\/+$/, '')
      .trim();
    return { rede: rede.id, usuario };
  }
  return { rede: null, usuario: limpo.replace(/^@/, '').trim() };
}

/** Une a rede escolhida nos botões com o que foi digitado: um link reconhecido vale mais que o botão. */
export function normalizarRede(rede: RedeId | '', texto: string): { rede: RedeId | ''; usuario: string } {
  const lido = lerEntrada(texto);
  const escolhida = lido.rede ?? rede;
  // Em "outra rede" o campo passa a mostrar o link já limpo (sem https://, www. e parâmetros).
  return { rede: escolhida, usuario: escolhida === 'outra' ? normalizarOutra(lido.usuario) ?? lido.usuario : lido.usuario };
}

/** O usuário está certo para a rede? (A validação do formulário usa isto; "outra" tem regra própria.) */
export function usuarioValido(rede: RedeId, usuario: string): boolean {
  return rede === 'outra' ? normalizarOutra(usuario) !== null : redePorId(rede).usuario.test(usuario);
}

/** Os campos que o servidor conhece (veja o formato no topo do arquivo). */
export function empacotar(rede: RedeId | '', usuario: string): { instagram: string; facebook: string } {
  if (!rede || !usuario) return { instagram: '', facebook: '' };
  if (rede === 'instagram') return { instagram: usuario, facebook: '' };
  if (rede === 'facebook') return { instagram: '', facebook: usuario };
  if (rede === 'outra') {
    const link = normalizarOutra(usuario);
    return { instagram: '', facebook: link ? `outra/${link}` : '' };
  }
  return { instagram: '', facebook: `${rede}/${usuario}` };
}

const PREFIXADA = /^(tiktok|linkedin|x|youtube|threads|kwai|pinterest|snapchat|telegram|twitch|github|behance)\/([^/]+)$/;
const OUTRA = /^outra\/(.+)$/;

/** O caminho inverso de `empacotar`, para o perfil. Cadastros antigos, com um Facebook sem prefixo, continuam Facebook. */
export function lerRedes(instagram: string, facebook: string): { id: RedeId; usuario: string }[] {
  const lista: { id: RedeId; usuario: string }[] = [];
  if (instagram) lista.push({ id: 'instagram', usuario: instagram });
  const prefixada = facebook.match(PREFIXADA);
  const outra = facebook.match(OUTRA);
  if (prefixada) lista.push({ id: prefixada[1] as RedeId, usuario: prefixada[2] });
  else if (outra) lista.push({ id: 'outra', usuario: outra[1] });
  else if (facebook) lista.push({ id: 'facebook', usuario: facebook });
  return lista;
}
