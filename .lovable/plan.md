
## Objective
Fix badge attribution so `.iota` profiles show **both IOTA + Ethereum badges only when the same social handle exists on both profiles**, while keeping distinct handles as separate cards (for example, two X/Twitter cards if handles differ).

## What is currently failing (root cause)
From the current code and network behavior:

1. `fetchEvmSocials` depends on `ensDomains`, but `ensDomains` is fetched using `currentWalletAddress` (the `.iota` owner address), not `linkedEvmAddress`.
2. On `.iota` profiles, that ENS lookup returns empty, so ENS-based Web3.bio social records (GitHub/LinkedIn/Telegram text records) are never queried.
3. `evmSocialsFetched` is set `true` before ENS data can later become available, so the social fetch doesn’t retry.
4. EVM links are stored in a `Record<string, any>` keyed by platform, which can drop additional candidates per platform and reduce matching accuracy.
5. Social card React keys still use `platform`, which is unsafe when same-platform entries must coexist.

## Implementation plan

### 1) Fetch ENS domains for the linked Ethereum wallet (not the IOTA owner wallet)
In `src/components/ProfileCard.tsx`:

- Add dedicated state for linked EVM ENS resolution (separate from existing NFT ENS state):
  - `linkedEvmEnsDomains`
  - `linkedEvmEnsFetched`
- Add effect:
  - Runs only for `.iota` + valid `linkedEvmAddress`
  - Calls `get-ens-domains` with `walletAddress: linkedEvmAddress`
  - Stores names in `linkedEvmEnsDomains`
  - Marks `linkedEvmEnsFetched=true` even when empty (to unblock next stage)

This decouples social enrichment from unrelated ENS/NFT fetching.

### 2) Rework EVM social fetching to include all Web3.bio sources and avoid race lock
- Reset EVM social fetch state when profile target changes:
  - On `linkedEvmAddress` / identity change, clear previous EVM social cache and fetched flags.
- Update EVM social effect so it runs when:
  - `.iota` profile
  - valid linked EVM address
  - linked ENS fetch finished
- Query Web3.bio for:
  1. `profile/{linkedEvmAddress}`
  2. each linked ENS name from `linkedEvmEnsDomains` (or at least primary + fallbacks)
- Aggregate as a **list of social entries** (not platform map), deduping by `{normalizedPlatform + normalizedHandle}` so we keep all unique handles.

### 3) Upgrade duplicate detection to handle-accurate matching
- Replace single-map merge with entry-based matching:
  - Build normalized IOTA social entry list from `.iota` links
  - Build normalized EVM social entry list from Web3.bio results
- Matching rule for `source: "both"`:
  - same normalized platform (twitter→x)
  - same normalized handle (case-insensitive, strip `@`, canonical URL path extraction)
- If platform matches but handle differs:
  - keep both cards (IOTA-only and ETH-only), each with correct badge.

This directly enforces your rule: badges are assigned by true handle match, not platform-only match.

### 4) Preserve badge display constraints
- Keep origin badges visible only when:
  - profile is `.iota`
  - linked EVM exists
- Badge rendering remains:
  - `iota` only → IOTA badge
  - `ethereum` only → ETH badge
  - `both` → both badges

### 5) Fix rendering identity keys so duplicate-platform cards render reliably
- Add stable unique `entryId` to merged social entries.
- Update all social render locations to use `key={entryId}` instead of `key={platform}`.
- This prevents React key collisions when two cards share a platform (e.g., `X` + `Twitter` or two `linkedin` variants).

## File to modify
- `src/components/ProfileCard.tsx`

## Validation checklist (end-to-end)
1. Open `/Vanity.iota`:
   - GitHub, LinkedIn, Telegram that exist on both sources show dual badges.
   - X/Twitter with different handles shows separate cards, each single-source badge.
2. Confirm no dual badge appears for non-matching same-platform handles.
3. Confirm non-`.iota` profiles do not show origin badges.
4. Switch between `.iota` profiles and verify old EVM social data does not leak (state reset works).
5. Verify mobile overlay and desktop social views both reflect identical badge logic and entries.

## Technical note
This keeps your current UI style and data providers, but changes the merge model from “platform-first” to “platform+handle-first,” which is required for accurate unification signaling.
