import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { Connect, Plugin } from 'vite';

// Em desenvolvimento, /api e /media vão para o nginx do docker compose (ou outro servidor).
// (lê process.env sem depender de @types/node)
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const BACKEND = env.VITE_BACKEND ?? 'http://localhost:8080';

/** Em dev e preview, /checkin abre a página do check-in (no nginx e no Vercel, a regra é deles). */
const rotaCheckin = ((req: { url?: string }, _res: unknown, next: () => void) => {
  if (req.url && /^\/checkin\/?(\?|$)/.test(req.url)) req.url = req.url.replace(/^\/checkin\/?/, '/checkin/index.html');
  next();
}) as unknown as Connect.NextHandleFunction;
const paginaCheckin: Plugin = {
  name: 'pagina-checkin',
  configureServer: (server) => { server.middlewares.use(rotaCheckin); },
  configurePreviewServer: (server) => { server.middlewares.use(rotaCheckin); },
};

// Duas páginas: o totem (index.html) e o check-in pelo celular (checkin/index.html).
// O app é servido pelo nginx do docker compose, na raiz do servidor (base '/').
// O service worker é só do totem: guarda o app, as salas e as imagens para funcionar sem rede.
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    paginaCheckin,
    VitePWA({
      registerType: 'prompt', // o app decide quando atualizar: só no início da sala (dados/Dados.tsx)
      injectRegister: false,
      manifest: {
        name: 'Memorial Dom Bosco',
        short_name: 'Memorial',
        description: 'Memorial Dom Bosco Maria Izabel Rodrigues: totens das salas do percurso.',
        lang: 'pt-BR',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#1F1E1C',
        theme_color: '#1F1E1C',
        start_url: '/',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
        // a página de check-in é do celular do visitante: fica fora do precache e do fallback
        globIgnores: ['checkin/**', 'demo/**'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/checkin/, /^\/api\//, /^\/admin/, /^\/media\//, /^\/static\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Acervo: tenta a rede, cai para o cache se o servidor não responder.
            // /versao/ fica de fora: é ela que diz ao app se o servidor está acessível.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') && !url.pathname.endsWith('/versao/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'memorial-api', networkTimeoutSeconds: 6, expiration: { maxEntries: 10 } },
          },
          {
            // Fotos, capas e páginas de documento nunca mudam (nome único por upload): cache primeiro.
            urlPattern: ({ url }) => /^\/media\/(fotos|videos\/capas|documentos)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'memorial-imagens',
              expiration: { maxEntries: 4000, maxAgeSeconds: 60 * 60 * 24 * 365, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Vídeos (.mp4) ficam de fora de propósito: são grandes e usam requisições Range,
          // então vão direto para o nginx por streaming.
        ],
      },
    }),
  ],
  server: {
    host: true,
    proxy: {
      '/api': { target: BACKEND },
      '/media': { target: BACKEND },
    },
  },
  preview: { proxy: { '/api': { target: BACKEND }, '/media': { target: BACKEND } } },
  build: {
    rollupOptions: {
      input: { totem: 'index.html', checkin: 'checkin/index.html' },
    },
    target: 'es2019',
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as never);