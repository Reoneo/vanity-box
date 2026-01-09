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
    nodePolyfills({
      include: ["buffer"],
      globals: { Buffer: true },
    }),
    viteCompression({ algorithm: "gzip", ext: ".gz" }),
    viteCompression({ algorithm: "brotliCompress", ext: ".br" }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),

      // 🔒 Ethereum-only build shims (NOT usage)
      graz: path.resolve(__dirname, "./src/shims/empty.ts"),
      "@getpara/cosmos-wallet-connectors": path.resolve(__dirname, "./src/shims/empty.ts"),
      "@getpara/graz-connector": path.resolve(__dirname, "./src/shims/empty.ts"),
      "@getpara/solana-wallet-connectors": path.resolve(__dirname, "./src/shims/empty.ts"),

      // 🔒 Force single wagmi / viem instance
      wagmi: path.resolve(__dirname, "./node_modules/wagmi"),
      "@wagmi/core": path.resolve(__dirname, "./node_modules/@wagmi/core"),
      "@wagmi/connectors": path.resolve(__dirname, "./node_modules/@wagmi/connectors"),
      viem: path.resolve(__dirname, "./node_modules/viem"),
    },

    dedupe: ["react", "react-dom", "wagmi", "@wagmi/core", "@wagmi/connectors", "viem"],
  },

  optimizeDeps: {
    include: ["wagmi", "@wagmi/core", "@wagmi/connectors", "viem"],
  },
}));
