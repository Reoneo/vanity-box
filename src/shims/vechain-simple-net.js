// Browser-safe replacement for @vechain/connex-driver/dist/simple-net.js
// Plain JS (no TS annotations) so it can be injected directly via Vite's load() hook.

export class SimpleNet {
  constructor(baseURL, timeout, wsTimeout) {
    this.baseURL = String(baseURL || '').replace(/\/+$/, '');
    this.timeout = timeout || 30000;
    this.wsTimeout = wsTimeout || 30000;
  }

  async http(method, path, params) {
    params = params || {};
    const url = new URL(String(path || '').replace(/^\/+/, ''), this.baseURL + '/');
    if (params.query) {
      for (const k of Object.keys(params.query)) {
        const v = params.query[k];
        if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
      }
    }

    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), this.timeout);
    try {
      const resp = await fetch(url.toString(), {
        method,
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          params.headers || {}
        ),
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
  }

  openWebSocketReader(_path) {
    throw new Error('WebSocket reader not supported in browser shim');
  }
}
