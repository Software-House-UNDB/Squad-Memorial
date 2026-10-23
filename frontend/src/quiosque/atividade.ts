/**
 * Sinal único de "o visitante fez algo". Ouvido pelo temporizador global de inatividade
 * e pelo temporizador do lightbox. Toques, teclas (manutenção) e rolagem contam;
 * movimento do ponteiro só conta com o dedo na tela.
 */
type Ouvinte = () => void;
const ouvintes = new Set<Ouvinte>();
let instalado = false;
let ultimo = performance.now();

function emitir() {
  ultimo = performance.now();
  ouvintes.forEach((f) => f());
}

function instalar() {
  if (instalado) return;
  instalado = true;
  const opcoes: AddEventListenerOptions = { capture: true, passive: true };
  window.addEventListener('pointerdown', emitir, opcoes);
  window.addEventListener('keydown', emitir, opcoes);
  window.addEventListener('wheel', emitir, opcoes);
  window.addEventListener('scroll', emitir, opcoes);
  window.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') emitir(); }, opcoes);
}

export function aoAtividade(f: Ouvinte): () => void {
  instalar();
  ouvintes.add(f);
  return () => { ouvintes.delete(f); };
}

export const ultimaAtividade = () => ultimo;
export const registrarAtividade = emitir;