

# Fix Social Link Origin Badges for .iota Profiles with Linked Ethereum Wallets

## Problem
The current implementation fetches EVM social links via Web3.bio using the raw Ethereum address, which only returns Farcaster and Basenames data -- not ENS text records (github, linkedin, telegram, etc.). This means duplicates like GitHub, LinkedIn, and Telegram that exist on BOTH the IOTA onchain profile AND the ENS profile are not detected as duplicates and don't show the dual origin badges.

Additionally, the platform key `x` (IOTA) and `twitter` (Web3.bio) are not treated as the same platform during deduplication.

## Solution

### 1. Enhance EVM Social Fetch to Include ENS Text Records
In `ProfileCard.tsx`, update the `fetchEvmSocials` function to:
- First fetch `https://api.web3.bio/profile/{address}` (existing -- returns Farcaster/Basenames data)
- Then resolve ENS name(s) from the `ensDomains` data already fetched for the linked EVM address
- For the primary ENS name found, also call `https://api.web3.bio/profile/{ensName}` to get ENS text records (github, twitter, telegram, linkedin, etc.)
- Aggregate ALL links from all profiles into the `evmSocialLinks` state

### 2. Normalize Platform Aliases During Merge
Update the `mergedSocialLinks` useMemo to treat `x` and `twitter` as the same platform:
- Add a `normalizePlatformKey` helper: `twitter` maps to `x`, everything else stays the same
- Apply this normalization when building the merge map so IOTA's `x` and EVM's `twitter` produce `source: 'both'`

### 3. Only Show Origin Badges for .iota Profiles with Linked Wallets
Wrap the origin badge rendering in a condition: only render the badge icons when `isIotaProfile && linkedEvmAddress` is truthy. For profiles without a linked wallet, no badges appear.

### 4. Fix Remaining Raw Link Rendering
Line ~2649 in the mobile overlay still iterates over raw `web3BioProfile.links` instead of `mergedSocialLinks`. Update it to use the merged list.

## Technical Details

### Files Modified
- **`src/components/ProfileCard.tsx`**:
  - Add `normalizePlatformKey()` helper that maps `twitter` to `x`
  - Update `fetchEvmSocials` to also fetch by primary ENS name when available (use already-fetched `ensDomains` for the linked address, or do a reverse lookup)
  - Update `mergedSocialLinks` useMemo to use normalized keys
  - Add `const showOriginBadges = isIotaProfile && !!linkedEvmAddress` flag
  - Wrap all 4 origin badge rendering locations with `showOriginBadges` condition
  - Update the remaining mobile overlay social rendering (line ~2649) to use `mergedSocialLinks`

### Platform Key Normalization Map
```text
twitter -> x
All others -> unchanged (lowercase)
```

### Enhanced Fetch Flow
```text
1. Fetch Web3.bio by address -> Farcaster/Basenames links
2. Reverse-resolve ENS primary name for address (via existing ENS domains fetch)
3. Fetch Web3.bio by ENS name -> ENS text records (github, linkedin, telegram, etc.)
4. Aggregate all links into evmSocialLinks
5. Merge with IOTA links using normalized keys
6. Duplicates get source: 'both', showing both IOTA + ETH badges
```

### No New Dependencies or Edge Functions Required
- Reuses existing Web3.bio API calls (direct client-side fetch)
- Uses existing `ensDomains` state already fetched for linked EVM addresses
