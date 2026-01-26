
# Fix IOTA Names (.iota) Domain Resolution

## Problem Identified
The `resolve-iota-domain` edge function is failing with "Invalid IOTA name" error because:

1. **Incorrect name format**: Code removes `.iota` suffix before calling `getNameRecord()`, but the SDK expects the full name including `.iota`
   - Current: `getNameRecord('vanity')` - fails
   - Correct: `getNameRecord('vanity.iota')` - expected by SDK

2. **Outdated SDK initialization**: The current implementation uses the older `IotaClient` approach, but the SDK documentation shows a newer GraphQL-based initialization

## Solution

### Step 1: Update Edge Function - Fix Name Format and SDK Initialization

Update `supabase/functions/resolve-iota-domain/index.ts` to:

```text
Changes:
- Remove the code that strips ".iota" suffix (lines 61-64)
- Keep the full domain name for getNameRecord() call
- Update SDK initialization to use GraphQL client approach from documentation
- Add better error handling and logging
```

**Key code changes:**

```typescript
// NEW: Use GraphQL-based initialization (per SDK docs)
const { IotaNamesClient } = await import("npm:@iota/iota-names-sdk@latest");
const { getNetwork, Network } = await import("npm:@iota/iota-sdk@latest/client");
const { IotaGraphQLClient } = await import("npm:@iota/iota-sdk@latest/graphql");

const network = getNetwork(Network.Mainnet);
const iotaNamesClient = new IotaNamesClient({
  graphQlClient: new IotaGraphQLClient({ url: network.graphql! }),
  network: network.id,
});

// FIX: Keep the full domain name WITH .iota suffix
const domainName = domain.toLowerCase();
// Ensure it ends with .iota
const lookupName = domainName.endsWith(".iota") ? domainName : `${domainName}.iota`;

console.log(`Looking up IOTA name: ${lookupName}`);
nameRecord = await iotaNamesClient.getNameRecord(lookupName);
```

### Step 2: Deploy and Test

1. Deploy the updated `resolve-iota-domain` edge function
2. Test searching for "vanity.iota"
3. Verify the wallet address is correctly resolved and displayed

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/resolve-iota-domain/index.ts` | Fix name format, update SDK initialization |

## Expected Outcome

- Searching "vanity.iota" will correctly resolve to the associated wallet address
- Profile will display with the IOTA domain name
- Loading bar will complete instead of sticking at 98%

## Technical Notes

- The SDK documentation explicitly shows: `await iotaNamesClient.getNameRecord('example.iota')` with the suffix included
- The GraphQL initialization approach is the recommended method per the latest SDK documentation
- If "vanity.iota" is not registered on IOTA mainnet, it will correctly return "not found" instead of "Invalid IOTA name"
