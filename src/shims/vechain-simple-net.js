// Browser-safe replacement for @vechain/connex-driver/dist/simple-net.js
// Original is CJS and uses Node http.Agent via axios; this shim mirrors its CJS
// shape so Rollup's commonjs plugin can statically detect its exports.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
exports.SimpleNet = void 0;

class SimpleNet {
  constructor(baseURL, timeout, wsTimeout) {
    this.baseURL = String(baseURL || '').replace(/\/+$/, '');
    this.timeout = timeout || 30000;
    this.wsTimeout = wsTimeout || 30000;
  }

  http(method, path, params) {
    const self = this;
    params = params || {};
    return (async () => {
      const url = new URL(String(path || '').replace(/^\/+/, ''), self.baseURL + '/');
      if (params.query) {
        for (const k of Object.keys(params.query)) {
          const v = params.query[k];
          if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
        }
      }
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), self.timeout);
      try {
        const resp = await fetch(url.toString(), {
          method: method,
          headers: Object.assign({ 'Content-Type': 'application/json' }, params.headers || {}),
          body: params.body ? JSON.stringify(params.body) : undefined,
          signal: ctrl.signal,
        });
        const headers = {};
        resp.headers.forEach((v, k) => { headers[k] = v; });
        if (params.validateResponseHeader) params.validateResponseHeader(headers);
        const text = await resp.text();
        if (!resp.ok) throw new Error(method + ' ' + url + ': ' + resp.status + ' ' + text);
        try { return JSON.parse(text); } catch (_e) { return text; }
      } finally {
        clearTimeout(tid);
      }
    })();
  }

  openWebSocketReader(_path) {
    throw new Error('WebSocket reader not supported in browser shim');
  }
}

exports.SimpleNet = SimpleNet;
exports.default = { SimpleNet: SimpleNet };
