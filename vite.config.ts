import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from "vite-plugin-compression";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    nodePolyfills({
      include: ['buffer'],
      globals: {
        Buffer: true,
      },
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),

      // ---- EVM-only build shims ----
      "graz": path.resolve(__dirname, "./src/shims/graz.ts"),
      "@mizuwallet-sdk/core": path.resolve(__dirname, "./src/shims/mizuwallet.ts"),
    },
    // Prevent duplicate React instances from @iota/dapp-kit and @tanstack/react-query
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
  build: {
    rollupOptions: {
      external: ["aptos"],
    },
  },
  optimizeDeps: {
    include: ["@tanstack/react-query", "@iota/dapp-kit"],
  },
}));
