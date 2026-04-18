import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import viteCompression from "vite-plugin-compression";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// Intercept @vechain/connex-driver/dist/simple-net.{js,mjs} (which uses Node http.Agent)
// and replace it with our browser-safe fetch-based shim. Works for relative requires too.
function vechainSimpleNetShim(): Plugin {
  const shimPath = path.resolve(__dirname, "./src/shims/vechain-simple-net.ts");
  const re = /@vechain[\\/]connex-driver[\\/]dist[\\/]simple-net\.(js|mjs|cjs)$/;
  return {
    name: "vechain-simple-net-shim",
    enforce: "pre",
    load(id) {
      const clean = id.split("?")[0];
      if (re.test(clean)) {
        return fs.readFileSync(shimPath, "utf-8");
      }
      return null;
    },
  };
}

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
