import { describe, test, expect } from "bun:test";
import { DuneResultsUnavailable, fetchDuneResults } from "./dune.ts";

describe("completed Dune results", () => {
  test("missing current execution defers without starting a paid execution", async () => {
    const requests = [];
    const request = async (url, options) => {
      requests.push({ url, method: options.method || "GET" });
      return new Response(JSON.stringify({ error: "not found: No execution found for the latest version of the given query" }), { status: 404 });
    };
    await expect(fetchDuneResults("test-key", request)).rejects.toBeInstanceOf(DuneResultsUnavailable);
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("GET");
  });
  test("empty completed results remain valid", async () => {
    expect(await fetchDuneResults("test-key", async () => Response.json({ result: { rows: [] } }))).toEqual([]);
  });
  test("incomplete payload is not treated as an empty domain list", async () => {
    await expect(fetchDuneResults("test-key", async () => Response.json({ state: "QUERY_STATE_EXECUTING" }))).rejects.toBeInstanceOf(DuneResultsUnavailable);
  });
  test("normalizes and deduplicates domains", async () => {
    expect(await fetchDuneResults("test-key", async () => Response.json({ result: { rows: [{ domain: " Mrs.Vanity " }, { name: "mrs.vanity" }] } }))).toEqual(["mrs"]);
  });
  test("pins continuation to the original completed execution", async () => {
    const urls = [];
    const request = async (url) => {
      urls.push(url);
      return Response.json({ execution_id: "snapshot-one", result: { rows: urls.length === 1 ? Array.from({ length: 1000 }, (_, i) => ({ name: `${i}.vanity` })) : [{ name: "mrs.vanity" }] } });
    };
    expect(await fetchDuneResults("test-key", request)).toHaveLength(1001);
    expect(urls[1]).toContain("execution/snapshot-one/results?limit=1000&offset=1000");
  });
  test("authentication errors are not disguised as missing results", async () => {
    await expect(fetchDuneResults("test-key", async () => new Response("Unauthorized", { status: 401 }))).rejects.toThrow("Dune API error [401]");
  });
});