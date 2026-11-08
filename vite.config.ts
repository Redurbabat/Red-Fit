/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt": a new version never hard-reloads mid-workout; the app shows
      // an update toast and the user decides when to reload.
      registerType: "prompt",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "RED Fit",
        short_name: "RED Fit",
        description: "Training und Ernährung in einer App.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0f1012",
        theme_color: "#0f1012",
        lang: "de",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // App shell + static assets are precached; user data lives in IndexedDB.
        // Include the credited, built-in wger JSON catalog in offline precache.
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest,json}"],
        navigateFallback: "/index.html",
        // Never let the SW touch API calls (e.g. a later Open Food Facts lookup).
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
