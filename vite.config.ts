import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";

export default defineConfig({
  plugins: [svelte()],
  clearScreen: false,
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
      ...(process.env.TAURI_ENV_PLATFORM
        ? {}
        : { "@tauri-apps/api/core": path.resolve("./src/lib/mock-invoke-shim.ts") }),
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
});
