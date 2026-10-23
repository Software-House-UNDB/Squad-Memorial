/**
 * Configuração local do quiosque.
 * Os tempos de inatividade vêm do admin (Configuração do totem) e são aplicados por
 * `aplicarConfigServidor`. A URL tem prioridade sobre o admin, para testes e manutenção:
 *   ?aviso=20&contagem=5   (segundos)
 *   ?lightbox=10           (segundos)
 *   ?diag                  (painel de diagnóstico de densidade e escala)
 *   ?semtelacheia          (não pedir tela cheia no primeiro toque)
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
   * Modo demonstração: sem servidor. O app usa o acervo de exemplo embutido (dados/acervo-demo.ts).
   * Ligue com VITE_MODO_DEMO=1 no build (ex.: variável de ambiente do Vercel).
   */
  demo: (import.meta.env.VITE_MODO_DEMO as string | undefined) === '1',

  /** Palco lógico de referência, em px CSS (= dp no WebView Android). */
  palco: { largura: 1920, altura: 1080 },

  inatividade: {
    /** Sem toque por este tempo, aparece o aviso "Ainda está aí?". DESIGN.md: 90s. */
    avisoMs: segundos('aviso', 90_000),
    /** Duração da contagem do aviso antes de fechar o livro. DESIGN.md: 15s. */
    contagemMs: segundos('contagem', 15_000),
    /** Sem toque dentro do lightbox, ele volta à galeria. DESIGN.md: 45s. */
    lightboxMs: segundos('lightbox', 45_000),
  },

  capa: {
    /** Troca da foto da prancha na proteção de tela. DESIGN.md: 8s. */
    trocaFotoMs: 8_000,
  },

  /**
   * Mostra a etiqueta "Conteúdo demonstrativo" enquanto houver item marcado como demonstrativo
   * no admin. false desliga a etiqueta de vez.
   */
  modoDemonstracao: true,

  /** Tenta tela cheia e orientação paisagem no primeiro toque na capa. */
  telaCheiaNoPrimeiroToque: !parametros.has('semtelacheia'),

  /** Recarrega o app uma vez por dia, só quando estiver na capa (HH:MM local). null desativa. */
  recarregarDiariamenteAs: '04:00' as string | null,

  /** Falhas de renderização seguidas antes de recarregar o app. DESIGN.md: 3. */
  falhasAntesDeRecarregar: 3,

  /** Exibe o painel de diagnóstico. */
  diagnostico: parametros.has('diag'),
};

export type ConfigQuiosque = typeof quiosque;

/** Aplica os tempos cadastrados no admin, exceto os que a URL sobrescreve. */
export function aplicarConfigServidor(c: { segundosInatividade: number; segundosContagem: number; segundosLightbox: number }) {
  const i = quiosque.inatividade;
  if (!parametros.has('aviso') && c.segundosInatividade > 0) i.avisoMs = c.segundosInatividade * 1000;
  if (!parametros.has('contagem') && c.segundosContagem > 0) i.contagemMs = c.segundosContagem * 1000;
  if (!parametros.has('lightbox') && c.segundosLightbox > 0) i.lightboxMs = c.segundosLightbox * 1000;
}