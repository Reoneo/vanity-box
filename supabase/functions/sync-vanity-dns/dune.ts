export class DuneResultsUnavailable extends Error {
  constructor() {
    super("Dune query 7320928 has no completed results for its current version. Run the query in Dune, then retry DNS sync. Existing DNS records are unchanged.");
    this.name = "DuneResultsUnavailable";
  }
}

/** Read completed results only; never start a potentially billable execution. */
export async function fetchDuneResults(apiKey: string, request: typeof fetch = fetch): Promise<string[]> {
  const names = new Set<string>();
  let offset = 0;
  const limit = 1000;
  let executionId: string | undefined;
  while (true) {
    // Pin subsequent pages to the same completed execution.
    const endpoint = executionId ? `execution/${encodeURIComponent(executionId)}` : "query/7320928";
    const res = await request(
      `https://api.dune.com/api/v1/${endpoint}/results?limit=${limit}&offset=${offset}`,
      { headers: { "X-Dune-API-Key": apiKey }, signal: AbortSignal.timeout(15_000) },
    );
    if (!res.ok) {
      const detail = await res.text();
      if (res.status === 404 && /No execution found|not found|expired/i.test(detail)) {
        throw new DuneResultsUnavailable();
      }
      throw new Error(`Dune API error [${res.status}]: ${detail}`);
    }
    const data = await res.json();
    if (!Array.isArray(data?.result?.rows)) throw new DuneResultsUnavailable();
    executionId = executionId ?? data.execution_id;
    for (const row of data.result.rows) {
      const name = String(row.domain || row.name || "").trim().replace(/\.vanity$/i, "").toLowerCase();
      if (name) names.add(name);
    }
    if (data.result.rows.length < limit) break;
    offset += limit;
  }
  return [...names];
}