// src/lib/supaInvoke.ts
import { supabase } from "@/integrations/supabase/client";

const SUPA_URL = "https://gdjjboorqviobvvygpca.supabase.co";
const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE";

function parseContext(err: any): string {
  const ctx = err?.context;
  if (typeof ctx === "string" && ctx.length) {
    try {
      const j = JSON.parse(ctx);
      if (j?.error) return String(j.error);
      return ctx;
    } catch {
      return ctx;
    }
  }
  return err?.message || "Function call failed";
}

export async function callEdge<T = any>(name: string, body?: unknown): Promise<T> {
  // 1) Try the official client
  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body,
      headers: { "Content-Type": "application/json" },
    });
    if (error) throw new Error(parseContext(error));
    return data as T;
  } catch (e1: any) {
    // 2) Fallback: direct fetch to Functions URL (often reveals 404/405/500 clearly)
    try {
      const res = await fetch(`${SUPA_URL}/functions/v1/${name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPA_ANON,
          Authorization: `Bearer ${SUPA_ANON}`,
        },
        body: JSON.stringify(body ?? {}),
      });
      const text = await res.text();
      let json: any = undefined;
      try {
        json = JSON.parse(text);
      } catch {
        /* keep text */
      }

      if (!res.ok) {
        const msg = json?.error ?? text ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      return (json ?? text) as T;
    } catch (e2: any) {
      throw new Error(e2?.message || e1?.message || "Edge call failed");
    }
  }
}
