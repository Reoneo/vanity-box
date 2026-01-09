import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from "vite-plugin-compression";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),

    // Required for wagmi / wallet libs
    nodePolyfills({
      include: ["buffer"],
      globals: {
        Buffer: true,
      },
    }),

    // Compression
    viteCompression({
      algorithm: "gzip",
      ext: ".gz",
    }),
    viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
    }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),

      // 🚫 Explicitly block non-EVM chains (Ethereum-only build)
      "@getpara/cosmos-wallet-connectors": false,
      "@getpara/solana-wallet-connectors": false,
      "@getpara/graz-connector": false,
      graz: false,
    },

    // 🔑 CRITICAL: force ONE wagmi / viem instance
    dedupe: ["react", "react-dom", "wagmi", "@wagmi/core", "@wagmi/connectors", "viem"],
  },

  optimizeDeps: {
    include: ["wagmi", "@wagmi/core", "@wagmi/connectors", "viem"],
  },
}));
