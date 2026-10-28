import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fontes locais (SIL OFL), nunca de CDN: o totem funciona offline.
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import '@fontsource/cormorant-garamond/latin-500-italic.css';
import '@fontsource/cormorant-garamond/latin-600-italic.css';
import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/latin-400-italic.css';

import './estilos/tokens.css';
import './estilos/base.css';

import { App } from './App';
import { instalarGuardas } from './quiosque/guardas';

instalarGuardas();

createRoot(document.getElementById('raiz')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
