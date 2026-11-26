/**
 * Sentry no navegador (totem e check-in): erros e desempenho. Desligado sem VITE_SENTRY_DSN no build.
 *
 * O SDK só é baixado quando há DSN (import dinâmico). LGPD: nada de dados pessoais sai do aparelho:
 * sem IP, cookies nem cabeçalhos; os endereços perdem a query string (a busca da Sala 06 leva nomes) e
 * qualquer e-mail que apareça num texto vira [e-mail]. Os breadcrumbs do console não são enviados.
 */
import type { Breadcrumb, ErrorEvent } from '@sentry/react';

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
// endereço (absoluto ou /caminho) seguido de ?query: fica só o endereço. Pega também spans e títulos de transação.
const QUERY = /((?:https?:\/\/|\/)[^\s?#"']*)\?[^\s#"']*/g;

const semQuery = (url: string) => url.split('?')[0];

/** Em qualquer texto do evento: e-mail vira [e-mail] e URL perde a query string. */
export function semEmails<T>(valor: T): T {
  if (typeof valor === 'string') return valor.replace(EMAIL, '[e-mail]').replace(QUERY, '$1') as T;
  if (Array.isArray(valor)) return valor.map(semEmails) as T;
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([k, v]) => [k, semEmails(v)])) as T;
  }
  return valor;
}

export function limparEvento<E extends Pick<ErrorEvent, 'request' | 'user'>>(evento: E): E {
  if (evento.request) {
    const { url } = evento.request;
    evento.request = { url: url ? semQuery(url) : undefined };
  }
  evento.user = undefined;
  return semEmails(evento);
}

export function limparBreadcrumb(b: Breadcrumb): Breadcrumb | null {
  if (b.category === 'console' || b.category === 'ui.input') return null;
  const dados = b.data ? { ...b.data } : undefined;
  if (dados) {
    for (const k of ['url', 'from', 'to']) if (typeof dados[k] === 'string') dados[k] = semQuery(dados[k] as string);
  }
  return semEmails({ ...b, data: dados });
}

function taxa(valor: string | undefined, padrao: number) {
  const n = Number(valor);
  return Number.isFinite(n) && valor !== '' && valor !== undefined ? Math.min(1, Math.max(0, n)) : padrao;
}

export async function iniciarSentry(app: 'totem' | 'checkin') {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
  if (!dsn) return;
  const Sentry = await import('@sentry/react');
  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) || 'producao',
    release: (import.meta.env.VITE_SENTRY_RELEASE as string | undefined) || undefined,
    sendDefaultPii: false,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: taxa(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string | undefined, 0.05),
    initialScope: { tags: { app } },
    beforeSend: (evento) => limparEvento(evento),
    beforeSendTransaction: (evento) => limparEvento(evento),
    beforeBreadcrumb: (b) => limparBreadcrumb(b),
  });
}
