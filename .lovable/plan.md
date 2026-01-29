
# Fix: IOTA Wallet Profile Button - Reverse Lookup Using JSON-RPC

## Problem Summary
When you connect your IOTA wallet and click the Profile button in the dock, the app shows "No results found" instead of loading your primary `.iota` domain profile. Manual search works correctly because it uses the name directly.

The root cause is that the current `resolve-iota-address` edge function uses IOTA Names SDK methods that may not be working correctly or returning results in an inconsistent format. The official IOTA documentation recommends using the **JSON-RPC API** method `iotax_iotaNamesReverseLookup` for reverse lookup (address to default name).

## Solution Overview
Replace the SDK-based reverse lookup with a direct JSON-RPC call to `iotax_iotaNamesReverseLookup`, which is the officially documented method for resolving an address to its default `.iota` name.

## Technical Details

### 1. Update Edge Function: `resolve-iota-address`
Replace the complex SDK-based logic with a simple JSON-RPC call:

```typescript
// Direct JSON-RPC call to mainnet
const rpcUrl = "https://api.mainnet.iota.cafe";

const rpcResponse = await fetch(rpcUrl, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "iotax_iotaNamesReverseLookup",
    params: [address], // The IOTA address (0x...)
  }),
});

const rpcData = await rpcResponse.json();
const iotaName = rpcData?.result; // Returns the default name string, e.g., "vanity.iota"
```

**Benefits:**
- Uses the official IOTA API endpoint documented at `docs.iota.org`
- Simpler code with fewer dependencies
- More reliable than SDK methods that may have version incompatibilities
- Returns the name directly as a string

### 2. Validate IOTA Address Format
IOTA addresses are 64 hex characters with a `0x` prefix. The function will validate this format before making the RPC call:

```typescript
function isValidIotaAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/i.test(addr?.trim() || '');
}
```

### 3. Profile Button Flow
The existing flow in `SearchInterface.tsx` and `WalletConnection.tsx` remains unchanged since it already:
1. Calls the `resolve-iota-address` edge function on wallet connection
2. Stores the resolved name as `connectedUsername`
3. Uses `connectedUsername` in the Profile button's `onClick` handler

The fix is purely in the edge function's reverse lookup logic.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/resolve-iota-address/index.ts` | Replace SDK-based lookup with direct JSON-RPC call to `iotax_iotaNamesReverseLookup` |

## Implementation Flow

```text
User connects IOTA wallet
        |
        v
WalletConnection.tsx detects connection
        |
        v
Calls resolve-iota-address edge function
        |
        v
Edge function calls JSON-RPC: iotax_iotaNamesReverseLookup
        |
        v
Returns default name (e.g., "vanity.iota")
        |
        v
WalletConnection dispatches wallet-connected event with username
        |
        v
SearchInterface stores connectedUsername
        |
        v
Profile button uses connectedUsername for handleSearch()
        |
        v
Profile loads correctly!
```

## API Reference
- **Endpoint**: `https://api.mainnet.iota.cafe`
- **Method**: `iotax_iotaNamesReverseLookup`
- **Parameter**: IOTA address (string, 0x-prefixed, 64 hex chars)
- **Returns**: Default name string (e.g., "vanity.iota") or null

Source: [IOTA API Reference](https://docs.iota.org/iota-api-ref#iotax_iotanamesreverselookup)
