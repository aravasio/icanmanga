import { defineConfig } from "vite"
import { resolve } from "path"

const outDir = "dist"

export default defineConfig([
  {
    build: {
      outDir,
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        input: {
          background: resolve(__dirname, "src/background/serviceWorker.ts"),
          options: resolve(__dirname, "src/options/options.ts"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "chunks/[name].js",
          assetFileNames: "assets/[name][extname]",
          manualChunks: undefined,
        },
      },
    },
  },
  {
    publicDir: false,
    build: {
      outDir,
      emptyOutDir: false,
      sourcemap: false,
      rollupOptions: {
        input: {
          content: resolve(__dirname, "src/content/content.ts"),
        },
        output: {
          entryFileNames: "[name].js",
          format: "iife",
        },
      },
    },
  },
])
