let pending: Promise<void> | undefined;
let nextAttemptAt = 0;
const KEY = "vanity_www_autosync_at";

/** Background DNS maintenance must never block navigation or repeat on every mount. */
export function syncVanityDns(): Promise<void> {
  if (pending) return pending;
  let lastSuccess = 0;
  try { lastSuccess = Number(localStorage.getItem(KEY) || "0"); } catch { /* storage unavailable */ }
  if (Date.now() < nextAttemptAt || Date.now() - lastSuccess < 6 * 60 * 60 * 1000) return Promise.resolve();
  nextAttemptAt = Date.now() + 5 * 60 * 1000;
  pending = (async () => {
    try {
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-vanity-dns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
        body: JSON.stringify({ action: "sync-quick" }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result.status === "deferred") {
        nextAttemptAt = Date.now() + Math.max(900, Number(result.retryAfterSeconds) || 900) * 1000;
        return;
      }
      if (!result.wwwCnames) return;
      nextAttemptAt = Date.now() + 6 * 60 * 60 * 1000;
      try { localStorage.setItem(KEY, String(Date.now())); } catch { /* storage unavailable */ }
    } catch { /* optional maintenance cannot interrupt the page */ }
  })().finally(() => { pending = undefined; });
  return pending;
}