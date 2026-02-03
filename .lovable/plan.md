
# Plan: Fix Homepage, IOTA Resolution, and No Results UI

## Summary
This plan addresses three issues:
1. Remove the tagline from the homepage
2. Fix the "no_results_found" display showing untranslated keys
3. Improve the IOTA domain resolution reliability using official mainnet RPC
4. Enhance the "no results" UI with better styling

---

## Changes

### 1. Remove Homepage Tagline
**File**: `src/components/HomeFeatureShowcase.tsx`

Remove the subtitle text "One name. Every chain. Infinite possibilities." from the hero section (lines 72-79).

---

### 2. Fix Missing English Translations
**File**: `src/contexts/LanguageContext.tsx`

Add the missing translation keys to the English translations object:
- `no_results_found`: "No results found"
- `try_different_query`: "Try a different search query"

This will fix the display of literal key names like "no_results_found" and "try_different_query".

---

### 3. Improve IOTA Domain Resolution
**File**: `supabase/functions/resolve-iota-domain/index.ts`

Update the IOTA domain resolution to use the official JSON-RPC endpoint instead of the SDK for more reliable mainnet resolution:

- Use `iotax_resolveIotaNamesAddress` RPC method (per official IOTA docs)
- Endpoint: `https://api.mainnet.iota.cafe` (mainnet)
- Add fallback error handling for network issues
- Remove SDK dependency which may have GraphQL reliability issues

The official RPC method format:
```text
POST https://api.mainnet.iota.cafe
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "iotax_resolveIotaNamesAddress",
  "params": ["name.iota"]
}
```

---

### 4. Improve No Results UI
**File**: `src/components/SearchInterface.tsx`

Enhance the "no results found" state with:
- Better typography and spacing
- IOTA branding colors (gold accent)
- Helpful suggestion message
- Cleaner, more professional appearance
- Suggestion to check spelling for domain searches

The improved UI will display:
- Larger, clearer "No results found" heading
- Subtext suggesting to try a different search or check spelling
- Gold accent border/styling consistent with app theme

---

## Technical Details

### IOTA RPC Resolution Flow
```text
User searches "name.iota"
       |
       v
resolve-profile detects .iota TLD
       |
       v
Calls resolve-iota-domain edge function
       |
       v
POST to https://api.mainnet.iota.cafe
  - Method: iotax_resolveIotaNamesAddress
  - Params: ["name.iota"]
       |
       v
Returns wallet address or null (not found)
```

### Files Modified
1. `src/components/HomeFeatureShowcase.tsx` - Remove tagline
2. `src/contexts/LanguageContext.tsx` - Add English translations
3. `supabase/functions/resolve-iota-domain/index.ts` - Use JSON-RPC instead of SDK
4. `src/components/SearchInterface.tsx` - Improve no results UI styling
