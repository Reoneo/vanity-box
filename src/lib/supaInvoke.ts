// src/lib/supaInvoke.ts
import { supabase } from "@/integrations/supabase/client";

// Use centralized Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://gdjjboorqviobvvygpca.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkampib29ycXZpb2J2dnlncGNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NDY1NDIsImV4cCI6MjA3MzEyMjU0Mn0.88t9gQHYr2kWB3P0Prd1ehRTsP3hYemV6PEkOLQa7tE";

// Global auth token storage - set by WalletConnection after Privy auth
let cachedAuthToken: string | null = null;

export function setAuthToken(token: string | null) {
  cachedAuthToken = token;
  console.log("[supaInvoke] Auth token", token ? "set" : "cleared");
}

export function getAuthToken(): string | null {
  return cachedAuthToken;
}

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
  // Get auth token for protected endpoints
  const authToken = getAuthToken();
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  // Add Privy auth token if available
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }
  
  // 1) Try the official client
  try {
    const { data, error } = await supabase.functions.invoke(name, {
      body,
      headers,
    });
    if (error) throw new Error(parseContext(error));
    return data as T;
  } catch (e1: any) {
    // 2) Fallback: direct fetch to Functions URL
    try {
      const fetchHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      };
      
      // Use auth token if available, otherwise use anon key
      if (authToken) {
        fetchHeaders.Authorization = `Bearer ${authToken}`;
      } else {
        fetchHeaders.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
      }
      
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
        method: "POST",
        headers: fetchHeaders,
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
