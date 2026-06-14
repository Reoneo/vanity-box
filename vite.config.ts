import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";
import viteCompression from "vite-plugin-compression";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const ATPROTO_DID = "did:plc:bqycbmr2vb3cx5r7i5nr46fl";

// Serve /.well-known/atproto-did in dev and emit it into the build output.
// Vite's `public/` folder ignores dotfile directories, so we handle it here.
function atprotoDidPlugin(): Plugin {
  return {
    name: "atproto-did",
    configureServer(server) {
      server.middlewares.use("/.well-known/atproto-did", (_req, res) => {
        res.setHeader("content-type", "text/plain; charset=utf-8");
        res.end(ATPROTO_DID + "\n");
      });
    },
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist/.well-known");
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "atproto-did"), ATPROTO_DID + "\n");
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
    atprotoDidPlugin(),

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

      // ---- Build shims ----
      "graz": path.resolve(__dirname, "./src/shims/graz.ts"),
      "aptos": path.resolve(__dirname, "./src/shims/aptos.ts"),
      "@mizuwallet-sdk/core": path.resolve(__dirname, "./src/shims/mizuwallet-core.ts"),
      "@telegram-apps/bridge": path.resolve(__dirname, "./src/shims/telegram-apps-bridge.ts"),
    },
    // Prevent duplicate React instances from @iota/dapp-kit and @tanstack/react-query
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
  optimizeDeps: {
    include: ["@tanstack/react-query", "@iota/dapp-kit"],
  },
}));
