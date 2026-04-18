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
      include: ['buffer', 'crypto'],
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

      // ---- Build shims ----
      "graz": path.resolve(__dirname, "./src/shims/graz.ts"),
      "aptos": path.resolve(__dirname, "./src/shims/aptos.ts"),
      "@mizuwallet-sdk/core": path.resolve(__dirname, "./src/shims/mizuwallet-core.ts"),
      "@telegram-apps/bridge": path.resolve(__dirname, "./src/shims/telegram-apps-bridge.ts"),
      // VeChain connex-driver uses Node http/https; replace its SimpleNet with a fetch-based browser shim
      "@vechain/connex-driver/dist/simple-net.js": path.resolve(__dirname, "./src/shims/vechain-simple-net.ts"),
      "@vechain/connex-driver/dist/simple-net": path.resolve(__dirname, "./src/shims/vechain-simple-net.ts"),
    },
    // Prevent duplicate React instances from @iota/dapp-kit and @tanstack/react-query
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: ["@tanstack/react-query", "@iota/dapp-kit"],
  },
}));
