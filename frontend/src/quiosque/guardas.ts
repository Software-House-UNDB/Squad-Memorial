/**
 * Proteções do quiosque, instaladas uma vez:
 * - sem menu de contexto, sem seleção por toque longo, sem arrastar imagens;
 * - sem zoom da página inteira (pinça, ctrl+roda, gesturestart do WebKit);
 * - :active funciona no toque (Chrome Android exige um ouvinte de touchstart);
 * - registro local de erros (anel de 50) para a manutenção;
 * - tela cheia e trava de orientação no primeiro toque, quando permitido;
 * - recarga diária, só na capa.
 */
import { quiosque } from '../config/quiosque';

let instaladas = false;

export function instalarGuardas() {
  if (instaladas) return;
  instaladas = true;

  const bloquear = (e: Event) => e.preventDefault();
  window.addEventListener('contextmenu', bloquear);
  window.addEventListener('selectstart', bloquear);
  window.addEventListener('dragstart', bloquear);
  document.addEventListener('gesturestart', bloquear as EventListener);
  document.addEventListener('touchstart', () => {}, { passive: true });
  window.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  // Pinça só é permitida dentro de superfícies que tratam zoom (data-zoom).
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 && !(e.target as Element)?.closest?.('[data-zoom]')) e.preventDefault();
  }, { passive: false });

  window.addEventListener('error', (e) => registrarErro(String(e.message)));
  window.addEventListener('unhandledrejection', (e) => registrarErro(String(e.reason)));
}

export function registrarErro(mensagem: string) {
  try {
    const chave = 'memorial:erros';
    const lista: { t: string; m: string }[] = JSON.parse(localStorage.getItem(chave) || '[]');
    lista.push({ t: new Date().toISOString(), m: mensagem.slice(0, 500) });
    localStorage.setItem(chave, JSON.stringify(lista.slice(-50)));
  } catch {
    /* armazenamento indisponível: ignorar */
  }
}

export async function pedirTelaCheia() {
  if (!quiosque.telaCheiaNoPrimeiroToque) return;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch { /* recusado ou não suportado (ex.: quiosque já em tela cheia) */ }
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.('landscape');
  } catch { /* trava não suportada: o palco continua centralizado */ }
}

/** Retorna true se já passou do horário de recarga de hoje desde que o app abriu. */
export function criarVerificadorDeRecarga() {
  const alvo = quiosque.recarregarDiariamenteAs;
  if (!alvo) return () => false;
  const [h, m] = alvo.split(':').map(Number);
  const aberto = new Date();
  return () => {
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, m);
    return agora >= hoje && aberto < hoje;
  };
}