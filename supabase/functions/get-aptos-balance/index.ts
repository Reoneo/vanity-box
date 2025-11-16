// Edge function to get Aptos wallet balance for APT and USDC tokens using REST API with fallbacks
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BalanceRequest {
  address?: string;
}

const APTOS_MAINNET_URL = "https://fullnode.mainnet.aptoslabs.com/v1";
const APT_COIN_STORE = "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>";
const USDC_TYPE = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC";
const USDC_COIN_STORE = `0x1::coin::CoinStore<${USDC_TYPE}>`;

function toNumberSafe(v: bigint, decimals: number) {
  // Convert bigint to number safely for small balances
  return Number(v) / Math.pow(10, decimals);
}

async function fetchResourceBalance(address: string, resource: string): Promise<bigint | null> {
  const res = await fetch(`${APTOS_MAINNET_URL}/accounts/${address}/resource/${encodeURIComponent(resource)}`);
  if (res.status === 404) return 0n;
  if (!res.ok) throw new Error(`Resource fetch failed ${res.status}`);
  const json = await res.json();
  const raw = json?.data?.coin?.value as string | undefined;
  if (!raw) return 0n;
  return BigInt(raw);
}

async function fetchCoinsList(address: string): Promise<Record<string, bigint>> {
  const out: Record<string, bigint> = {};
  const res = await fetch(`${APTOS_MAINNET_URL}/accounts/${address}/coins?limit=200`);
  if (!res.ok) return out;
  const json = await res.json();
  const data = Array.isArray(json?.data) ? json.data : json;
  if (Array.isArray(data)) {
    for (const c of data) {
      const type = c.coin_type || c.type || c.info?.type;
      const amtStr = c.amount || c.balance || c.info?.balance || c.coin?.value;
      if (type && typeof amtStr === 'string') {
        out[type] = BigInt(amtStr);
      }
    }
  }
  return out;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let address: string | undefined;
  try {
    // Parse JSON body if present
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = (await req.json()) as BalanceRequest;
      address = body.address;
    }
  } catch (_e) {
    // ignore body parse errors, we'll try query param
  }

  // Support GET with ?address=
  if (!address) {
    const url = new URL(req.url);
    address = url.searchParams.get('address') || undefined;
  }

  console.log(`[get-aptos-balance] Fetching balance for: ${address}`);

  if (!address) {
    return new Response(
      JSON.stringify({ success: false, error: "Address is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Normalize address (ensure 0x prefix)
  const normalizedAddress = address.startsWith("0x") ? address : `0x${address}`;

  try {
    // Try resource endpoint first
    let aptRaw: bigint = 0n;
    let usdcRaw: bigint = 0n;

    try {
      const res = await fetchResourceBalance(normalizedAddress, APT_COIN_STORE);
      if (res !== null) aptRaw = res;
      console.log(`[get-aptos-balance] APT resource result: ${aptRaw}`);
    } catch (e) {
      console.log(`[get-aptos-balance] APT resource error: ${(e as Error).message}`);
    }

    try {
      const res = await fetchResourceBalance(normalizedAddress, USDC_COIN_STORE);
      if (res !== null) usdcRaw = res;
      console.log(`[get-aptos-balance] USDC resource result: ${usdcRaw}`);
    } catch (e) {
      console.log(`[get-aptos-balance] USDC resource error: ${(e as Error).message}`);
    }

    // Fallback to coins list if either is zero
    if (aptRaw === 0n || usdcRaw === 0n) {
      try {
        const coins = await fetchCoinsList(normalizedAddress);
        if (aptRaw === 0n) {
          const aptKey = Object.keys(coins).find((k) => k.includes("0x1::aptos_coin::AptosCoin"));
          if (aptKey) aptRaw = coins[aptKey] ?? 0n;
        }
        if (usdcRaw === 0n) {
          const usdcKey = Object.keys(coins).find((k) => k.includes(USDC_TYPE));
          if (usdcKey) usdcRaw = coins[usdcKey] ?? 0n;
        }
        console.log(`[get-aptos-balance] Fallback coins list - APT: ${aptRaw}, USDC: ${usdcRaw}`);
      } catch (e) {
        console.log(`[get-aptos-balance] coins list fetch error: ${(e as Error).message}`);
      }
    }

    const aptBalance = toNumberSafe(aptRaw, 8);
    const usdcBalance = toNumberSafe(usdcRaw, 6);

    console.log(`[get-aptos-balance] Final - APT: ${aptBalance}, USDC: ${usdcBalance}`);

    return new Response(
      JSON.stringify({
        success: true,
        aptBalance,
        usdcBalance,
        address: normalizedAddress,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[get-aptos-balance] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Failed to get balance" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});