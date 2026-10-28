/**
 * Página de check-in pelo celular (/checkin). Entrada própria do Vite: sem palco, sem guardas de
 * quiosque, sem inatividade e fora do service worker do totem.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';

import '../estilos/tokens.css';
import './checkin.css';

import { Checkin } from './Checkin';

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <Checkin />
  </StrictMode>,
);
