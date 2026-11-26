/**
 * Configuração local do quiosque.
 * Os tempos vêm do admin (Configuração do memorial) e são aplicados por `aplicarConfigServidor`.
 * A URL tem prioridade sobre o admin, para testes e manutenção:
 *   /sala/N     (sala deste totem, 1 a 6; fica guardada no aparelho; ?sala=N também vale)
 *   ?aviso=20&contagem=5 (segundos)
 *   ?lightbox=10         (segundos)
 *   ?orientacao=retrato  (força o palco em pé; =paisagem força deitado; sem ele, segue a tela)
 *   ?diag                (painel de diagnóstico de densidade e escala)
 *   ?semtelacheia        (não pedir tela cheia no primeiro toque)
 *   ?tecladonativo       (usa o teclado do sistema na busca, para testar no computador)
 */

/** Número da sala em /sala/N (a base do app vem do Vite). */
export function salaDoCaminho(caminho: string): string | null {
  const m = /\/sala\/(\d+)\/?$/.exec(caminho);
  return m ? m[1] : null;
}

export type Orientacao = 'paisagem' | 'retrato';

/** Lê ?orientacao=retrato|paisagem (aceita também "vertical"/"horizontal"). */
export function orientacaoDaUrl(v: string | null): Orientacao | null {
  if (v === 'retrato' || v === 'vertical') return 'retrato';
  if (v === 'paisagem' || v === 'horizontal') return 'paisagem';
  return null;
}

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

  /** Palco lógico de referência, em px CSS (= dp no WebView Android). 16:9 deitado. */
  palco: { largura: 1600, altura: 900 },

  /** Palco do totem em pé (9:16): mesmos tamanhos de texto e de toque, outra composição (estilos/retrato.css). */
  palcoRetrato: { largura: 900, altura: 1600 },

  /**
   * Quanto o palco pode crescer na altura para acompanhar a proporção da tela, mantendo a largura de
   * referência (e com ela o tamanho do texto e dos alvos): deitado até 4:3 (1600 × 1200), em pé de 3:4
   * (900 × 1200) até a proporção de um celular (900 × 2000). Fora disso sobram faixas, como antes.
   */
  alturaPalco: { paisagem: { min: 900, max: 1200 }, retrato: { min: 1200, max: 2000 } },

  /**
   * Orientação do palco: ?orientacao=retrato ou ?orientacao=paisagem fixa uma delas (útil quando o
   * aparelho informa a tela girada); sem o parâmetro, segue a proporção da tela.
   */
  orientacaoFixa: orientacaoDaUrl(parametros.get('orientacao')),

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

  /** Na busca da Sala 06, a lista é atualizada a cada N ms para novos check-ins aparecerem. */
  atualizarBuscaMs: 10_000,

  /** Tenta tela cheia e trava a orientação atual (deitado ou em pé) no primeiro toque. */
  telaCheiaNoPrimeiroToque: !parametros.has('semtelacheia'),

  /** Usa o teclado do sistema em vez do teclado virtual (testes no computador). */
  tecladoNativo: parametros.has('tecladonativo'),

  /** Recarrega o app uma vez por dia, só no início da sala (HH:MM local). null desativa. */
  recarregarDiariamenteAs: '04:00' as string | null,

  /** Exibe o painel de diagnóstico. */
  diagnostico: parametros.has('diag'),

  /** Sala pedida na URL: /sala/N ou ?sala=N (lida por config/sala.ts). */
  salaNaUrl: salaDoCaminho(typeof location !== 'undefined' ? location.pathname : '') ?? parametros.get('sala'),
};

/** Aplica os tempos cadastrados no admin, exceto os que a URL sobrescreve. */
export function aplicarConfigServidor(c: { segundosInatividade: number; segundosContagem: number; segundosLightbox: number }) {
  const i = quiosque.inatividade;
  if (!parametros.has('aviso') && c.segundosInatividade > 0) i.avisoMs = c.segundosInatividade * 1000;
  if (!parametros.has('contagem') && c.segundosContagem > 0) i.contagemMs = c.segundosContagem * 1000;
  if (!parametros.has('lightbox') && c.segundosLightbox > 0) i.lightboxMs = c.segundosLightbox * 1000;
}
