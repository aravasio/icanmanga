import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content/content.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        format: "iife",
        inlineDynamicImports: true,
      },
    },
  },
})
