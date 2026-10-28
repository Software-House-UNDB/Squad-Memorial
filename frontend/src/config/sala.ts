/**
 * Qual sala é este totem.
 * O navegador quiosque abre `/?sala=N`. O número fica guardado no aparelho (memorial:sala), então o
 * app instalado como PWA, aberto sem a query, continua na mesma sala. Sem sala definida, o totem
 * mostra a tela "Escolha a sala deste totem".
 */
import { quiosque } from './quiosque';

export const TOTAL_SALAS = 5;
const CHAVE = 'memorial:sala';

export function salaValida(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= TOTAL_SALAS ? n : null;
}

export function lerSala(): number | null {
  const daUrl = salaValida(quiosque.salaNaUrl);
  if (daUrl) {
    guardarSala(daUrl);
    return daUrl;
  }
  try {
    return salaValida(localStorage.getItem(CHAVE));
  } catch {
    return null;
  }
}

export function guardarSala(n: number) {
  try {
    localStorage.setItem(CHAVE, String(n));
  } catch {
    /* armazenamento indisponível: vale só nesta sessão */
  }
}
