import { defineConfig } from "vite";

export default defineConfig({
  base: "/manifesto-island/",
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: "es2020",
    sourcemap: true,
    assetsInlineLimit: 0,
  },
});
