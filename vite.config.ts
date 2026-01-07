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
      // Para's ecosystem packages can pull in Solana/Cosmos peer deps even when unused.
      // We alias them to lightweight stubs so Rollup doesn't try to bundle those chains.
      "graz": path.resolve(__dirname, "./src/shims/graz.ts"),
      "@getpara/cosmos-wallet-connectors": path.resolve(
        __dirname,
        "./src/shims/getpara-cosmos-wallet-connectors.ts"
      ),
      "@getpara/graz-connector": path.resolve(
        __dirname,
        "./src/shims/getpara-graz-connector.ts"
      ),
      "@getpara/solana-wallet-connectors": path.resolve(
        __dirname,
        "./src/shims/getpara-solana-wallet-connectors.ts"
      ),
    },
  },
}));
