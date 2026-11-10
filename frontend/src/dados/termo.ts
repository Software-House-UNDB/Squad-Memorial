/**
 * Termo de uso dos dados e da imagem. É o texto de RESERVA do check-in (quando a configuração do servidor
 * não carrega) e o do modo demonstração. Em produção o texto mostrado é o do servidor (Administração >
 * Configuração do memorial), e é ele que o servidor grava como versão aceita.
 * A primeira linha é o título da caixa; as demais, o corpo (parágrafos separados por linha em branco).
 */
export const TERMO_PADRAO = [
  'Termo de uso dos dados e da imagem',
  '',
  'Ao fazer o check-in no Memorial Dom Bosco Maria Izabel Rodrigues, da UNDB, autorizo, de forma livre e informada, o uso dos meus dados e das minhas fotos, nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).',
  '',
  '1. O que é usado. Nome, ano e turma em que estudei, e-mail, rede social e fotos, quando informados.',
  '',
  '2. Para quê. Montar meu perfil na Sala 06 (Alunos), exibido nos totens e nas telas do Memorial para que colegas me encontrem pelo nome. O e-mail não é exibido: só a equipe o usa, para falar comigo sobre este cadastro. As fotos só aparecem depois de aprovadas pela equipe, e declaro ter o direito de usá-las.',
  '',
  '3. Uso restrito. Meus dados e minhas imagens não serão vendidos, usados em publicidade nem compartilhados com terceiros, salvo obrigação legal.',
  '',
  '4. Meus direitos. Posso pedir acesso, correção ou remoção dos meus dados e revogar esta autorização a qualquer momento, pelo e-mail de contato no fim desta página ou na recepção do Memorial. Os dados ficam armazenados enquanto o Memorial exibir esta sala ou até o meu pedido.',
].join('\n');

/** Separa o título (primeira linha) do corpo (o resto, sem a linha em branco inicial). */
export function separarTermo(texto: string): { titulo: string; corpo: string } {
  const t = texto.trim();
  const i = t.indexOf('\n');
  if (i < 0) return { titulo: '', corpo: t };
  return { titulo: t.slice(0, i).trim(), corpo: t.slice(i + 1).trim() };
}
