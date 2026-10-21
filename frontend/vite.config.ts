import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Em desenvolvimento, /api e /media vão para o nginx do docker compose
const BACKEND = process.env.VITE_BACKEND ?? "http://localhost:8080";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt", // o app decide quando recarregar (só quando o totem está ocioso)
      injectRegister: false,
      includeAssets: ["brasao.svg"],
      manifest: {
        name: "Memorial UNDB",
        short_name: "Memorial",
        lang: "pt-BR",
        display: "fullscreen",
        orientation: "any",
        background_color: "#f5efe3",
        theme_color: "#1d3461",
        start_url: "/",
        icons: [{ src: "brasao.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/admin/, /^\/media\//, /^\/static\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Conteúdo: tenta a rede, cai para o cache se o servidor não responder.
            // /versao/ fica de fora: é ela que diz ao app se o servidor está acessível.
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api/") && !url.pathname.endsWith("/versao/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "memorial-api",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 20 },
            },
          },
          {
            // Fotos e capas nunca mudam (nome único por upload): cache primeiro
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/media/fotos/") ||
              url.pathname.startsWith("/media/videos/capas/"),
            handler: "CacheFirst",
            options: {
              cacheName: "memorial-imagens",
              expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 365, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Vídeos (.mp4) ficam de fora de propósito: são grandes e usam
          // requisições Range, então vão direto para o nginx por streaming.
        ],
      },
    }),
  ],
  server: {
    host: true,
    proxy: {
      "/api": { target: BACKEND, changeOrigin: false },
      "/media": { target: BACKEND, changeOrigin: false },
    },
  },
});
