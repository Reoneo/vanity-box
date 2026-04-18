// Browser-safe replacement for @vechain/connex-driver/dist/simple-net.js
// The original uses Node http/https Agents; we use fetch instead.

export class SimpleNet {
  private baseURL: string;
  private timeout: number;
  public wsTimeout: number;

  constructor(baseURL: string, timeout = 30_000, wsTimeout = 30_000) {
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.timeout = timeout;
    this.wsTimeout = wsTimeout;
  }

  async http(method: string, path: string, params?: any): Promise<any> {
    params = params || {};
    const url = new URL(path.replace(/^\/+/, ''), this.baseURL + '/');
    if (params.query) {
      for (const [k, v] of Object.entries(params.query)) {
        if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
      }
    }

    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), this.timeout);
    try {
      const resp = await fetch(url.toString(), {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(params.headers || {}),
        },
        body: params.body ? JSON.stringify(params.body) : undefined,
        signal: ctrl.signal,
      });
      const headers: Record<string, string> = {};
      resp.headers.forEach((v, k) => { headers[k] = v; });
      if (params.validateResponseHeader) params.validateResponseHeader(headers);
      const text = await resp.text();
      if (!resp.ok) throw new Error(`${method} ${url}: ${resp.status} ${text}`);
      try { return JSON.parse(text); } catch { return text; }
    } finally {
      clearTimeout(tid);
    }
  }

  openWebSocketReader(_path: string): any {
    throw new Error('WebSocket reader not supported in browser shim');
  }
}
