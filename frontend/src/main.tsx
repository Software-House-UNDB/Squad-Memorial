import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Fontes locais (SIL OFL), nunca de CDN: o memorial funciona offline.
import '@fontsource/cinzel/latin-500.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/eb-garamond/latin-400.css';
import '@fontsource/eb-garamond/latin-500.css';
import '@fontsource/eb-garamond/latin-400-italic.css';

// Tokens: fonte única na raiz do projeto. A base vem depois e só resolve os termos em vmin no palco.
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