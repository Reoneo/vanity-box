// Shared fetch for the get-ens-domains edge function.
// Dedupes identical in-flight requests, briefly caches results, and retries 429s
// so bursts of profile/modal loads don't trip the edge function rate limit.
const inflight = new Map<string, Promise<Response>>();
const cache = new Map<string, { at: number; res: Response }>();
const TTL_MS = 60_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let res = await fetch(url, init);
  for (let attempt = 0; res.status === 429 && attempt < 4; attempt++) {
    await sleep(1000 * 2 ** attempt + Math.random() * 300);
    res = await fetch(url, init);
  }
  return res;
}

export async function fetchEnsDomains(url: string, init?: RequestInit): Promise<Response> {
  const key = `${url}|${typeof init?.body === 'string' ? init.body : ''}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.res.clone();
  let p = inflight.get(key);
  if (!p) {
    p = fetchWithRetry(url, init)
      .then((res) => {
        if (res.ok) cache.set(key, { at: Date.now(), res: res.clone() });
        return res;
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return (await p).clone();
}
