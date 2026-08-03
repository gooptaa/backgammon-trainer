import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@backgammon-trainer/backgammon-analysis/fixture": fileURLToPath(
        new URL("../../packages/backgammon-analysis/src/fixture.ts", import.meta.url)
      ),
      "@backgammon-trainer/ai-contracts/fixture": fileURLToPath(
        new URL("../../packages/ai-contracts/src/fixture.ts", import.meta.url)
      ),
      "@backgammon-trainer/ai-contracts": fileURLToPath(
        new URL("../../packages/ai-contracts/src/index.ts", import.meta.url)
      ),
      "@backgammon-trainer/backgammon-coach": fileURLToPath(
        new URL("../../packages/backgammon-coach/src/index.ts", import.meta.url)
      ),
      "@backgammon-trainer/backgammon-domain": fileURLToPath(
        new URL("../../packages/backgammon-domain/src/index.ts", import.meta.url)
      ),
      "@backgammon-trainer/backgammon-analysis": fileURLToPath(
        new URL("../../packages/backgammon-analysis/src/index.ts", import.meta.url)
      ),
      "@backgammon-trainer/backgammon-analysis-session": fileURLToPath(
        new URL("../../packages/backgammon-analysis-session/src/index.ts", import.meta.url)
      ),
      "@backgammon-trainer/backgammon-engine": fileURLToPath(
        new URL("../../packages/backgammon-engine/src/index.ts", import.meta.url)
      )
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "robots.txt", "icons/icon-192.svg", "icons/icon-512.svg"],
      manifest: {
        name: "Backgammon Trainer",
        short_name: "BG Trainer",
        description: "Mobile-first backgammon training app shell",
        theme_color: "#113f5a",
        background_color: "#f7f2e8",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml"
          },
          {
            src: "/icons/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
        navigateFallback: "/index.html",
        runtimeCaching: []
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true
      }
    })
  ],
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  }
});
