
# Make Talent Protocol Badge More Reliable

## Problem
The verification badge relies on a deprecated `/human_checkmark/data_points` endpoint that often returns empty or errors. Meanwhile, the `/profile` endpoint already returns a `human_checkmark: boolean` field directly, and the `/credentials` endpoint returns `Humanity`-category credentials with provider details -- both are more reliable sources.

## Solution
Restructure the edge function to use a **three-tier fallback** for human verification:

1. **Primary**: Use `profile.human_checkmark` boolean from `/profile` (always present, most reliable)
2. **Secondary**: Extract `Humanity`-category credentials from `/credentials` to get individual provider names (Binance, Coinbase, Worldcoin, etc.)
3. **Tertiary**: Keep the `/human_checkmark/data_points` call as a last resort, but don't depend on it

Also improve the ProfileCard badge logic to use the profile-level `human_checkmark` flag as the primary signal, so the badge shows even when provider details aren't available.

## Changes

### 1. Edge Function: `supabase/functions/get-talent-protocol/index.ts`

**Restructure human checkmark detection:**
- After fetching `/profile`, immediately extract `profile.human_checkmark` as the authoritative boolean
- After fetching `/credentials`, filter for `category === "Humanity"` credentials with `points > 0` to extract provider names (these give the breakdown: Coinbase, Binance, etc.)
- Remove dependency on `/human_checkmark/data_points` -- keep call but only use as supplementary provider list
- Build `verification.humanCheckmark` with:
  - `isVerified`: true if `profile.human_checkmark === true` OR any Humanity credential has `points > 0`
  - `providers`: merged from Humanity credentials + data_points (deduplicated)

**Add ENS-based lookup fallback:**
- The `/profile` endpoint accepts ENS names directly (field: `ens` in profile response). If wallet lookup fails, retry with ENS as the identifier without `account_source`

### 2. ProfileCard: `src/components/ProfileCard.tsx`

**Simplify badge logic (minor):**
- Current logic already checks both `isVerified` and `providers.length > 0` -- no change needed, the edge function fix ensures `isVerified` is consistently set

## Technical Detail

Current flow (unreliable):
```text
/profile --> get profile data (human_checkmark ignored for badge)
/human_checkmark/data_points --> often empty/404
  --> badge only shows if data_points has items with points > 0
  --> fallback: profile.human_checkmark (but providers = [])
```

New flow (reliable):
```text
/profile --> human_checkmark: true/false (PRIMARY signal)
/credentials --> filter category="Humanity" (provider names)
/human_checkmark/data_points --> supplementary (OPTIONAL)
  --> isVerified = profile.human_checkmark OR any Humanity cred
  --> providers = deduplicated from credentials + data_points
```
