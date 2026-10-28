/**
 * Configuração local do quiosque.
 * Os tempos vêm do admin (Configuração do memorial) e são aplicados por `aplicarConfigServidor`.
 * A URL tem prioridade sobre o admin, para testes e manutenção:
 *   ?sala=N              (sala deste totem, 1 a 5; fica guardada no aparelho)
 *   ?aviso=20&contagem=5 (segundos)
 *   ?lightbox=10         (segundos)
 *   ?diag                (painel de diagnóstico de densidade e escala)
 *   ?semtelacheia        (não pedir tela cheia no primeiro toque)
 *   ?tecladonativo       (usa o teclado do sistema na busca, para testar no computador)
 */

const parametros = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

function segundos(nome: string, padraoMs: number): number {
  const v = parametros.get(nome);
  if (v === null) return padraoMs;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n * 1000 : padraoMs;
}

export const quiosque = {
  /** Endereço da API. Vazio = mesmo servidor que entrega o app (nginx). */
  api: (import.meta.env.VITE_API_URL as string | undefined) ?? '',

  /**
   * Modo demonstração: sem servidor. O app usa o conjunto de exemplo embutido (dados/demo.ts) e o
   * check-in grava no próprio navegador. Ligue com VITE_MODO_DEMO=1 no build (ex.: Vercel).
   */
  demo: (import.meta.env.VITE_MODO_DEMO as string | undefined) === '1',

  /** Palco lógico de referência, em px CSS (= dp no WebView Android). 16:9. */
  palco: { largura: 1600, altura: 900 },

  inatividade: {
    /** Sem toque por este tempo, aparece o aviso "Ainda está aí?". */
    avisoMs: segundos('aviso', 90_000),
    /** Duração da contagem do aviso antes de voltar ao início da sala. */
    contagemMs: segundos('contagem', 15_000),
    /** Sem toque dentro da foto ampliada, ela fecha. */
    lightboxMs: segundos('lightbox', 45_000),
  },

  /** Conteúdo novo entra quando a sala volta ao início, ou depois deste tempo sem toque. */
  aplicarConteudoAposMs: 30_000,

  /** Na busca da sala 5, a lista é atualizada a cada N ms para novos check-ins aparecerem. */
  atualizarBuscaMs: 10_000,

  /** Tenta tela cheia e orientação paisagem no primeiro toque. */
  telaCheiaNoPrimeiroToque: !parametros.has('semtelacheia'),

  /** Usa o teclado do sistema em vez do teclado virtual (testes no computador). */
  tecladoNativo: parametros.has('tecladonativo'),

  /** Recarrega o app uma vez por dia, só no início da sala (HH:MM local). null desativa. */
  recarregarDiariamenteAs: '04:00' as string | null,

  /** Exibe o painel de diagnóstico. */
  diagnostico: parametros.has('diag'),

  /** Valor bruto de ?sala na URL (lido por config/sala.ts). */
  salaNaUrl: parametros.get('sala'),
};

export type ConfigQuiosque = typeof quiosque;

/** Aplica os tempos cadastrados no admin, exceto os que a URL sobrescreve. */
export function aplicarConfigServidor(c: { segundosInatividade: number; segundosContagem: number; segundosLightbox: number }) {
  const i = quiosque.inatividade;
  if (!parametros.has('aviso') && c.segundosInatividade > 0) i.avisoMs = c.segundosInatividade * 1000;
  if (!parametros.has('contagem') && c.segundosContagem > 0) i.contagemMs = c.segundosContagem * 1000;
  if (!parametros.has('lightbox') && c.segundosLightbox > 0) i.lightboxMs = c.segundosLightbox * 1000;
}
