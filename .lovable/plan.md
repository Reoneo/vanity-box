

## Diagnosis

The white-screen runtime error comes from VeChain's `connex-driver/dist/simple-net.js`, which does:
```js
const http_1 = require("http");
new http_1.Agent({ keepAlive: true })
```
Vite's `nodePolyfills` provides a browser `http` module, but that polyfill does **not** export an `Agent` class — so `new http_1.Agent(...)` throws `undefined is not a constructor` at module-init time, killing the whole React tree.

My previous shim aliased the deep path `@vechain/connex-driver/dist/simple-net` to a fetch-based replacement. That alias is **not effective** because `connex-driver/dist/index.js` loads `simple-net` via a **relative** `require("./simple-net")` from inside its own directory — Vite resolves that to the real file on disk, bypassing the alias entirely. So the broken module still runs at startup.

## Fix (single, definitive)

Use a small **custom Vite plugin** (in `vite.config.ts`) with a `load()` hook that intercepts any module whose absolute path ends in `@vechain/connex-driver/dist/simple-net.js` (or `.mjs`) and returns the shim source instead. This works regardless of how the file is imported (relative `require`, deep alias, ESM, or CJS).

Implementation:
1. **Add a `load` plugin** in `vite.config.ts` that, when `id` matches `/@vechain[\\/]connex-driver[\\/]dist[\\/]simple-net\.(js|mjs)$/`, reads `src/shims/vechain-simple-net.ts` and returns it as the module body (compiled to JS via a small inline CJS wrapper that re-exports `SimpleNet`).
2. Keep the existing `resolve.alias` entries for `@vechain/connex-driver/dist/simple-net{,.js}` as a belt-and-braces measure for any direct deep imports.
3. Keep the existing `nodePolyfills` (`buffer`, `crypto`, `stream`, `util`) — needed for `thor-devkit`.
4. No changes to React tree, App.tsx, IdentityPanel, or the VeChain UI.

After the plugin is added, the bundle never instantiates Node's `http.Agent`, the `DAppKitProvider` mounts cleanly, and the app renders normally. VeChain wallet linking via VeWorld / WalletConnect continues to work because the shim implements the same `SimpleNet.http()` contract using `fetch`.

### Files to edit
- `vite.config.ts` — add the `vechainSimpleNetShim()` plugin (~15 lines).

No source code in `src/` changes; no dependency changes.

