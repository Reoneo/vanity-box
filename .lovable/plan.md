

# Fetch and Display Linked Ethereum Social Links on .iota Profiles

## Overview
When a `.iota` profile has a linked Ethereum wallet, fetch social links from Web3.bio for that Ethereum address and merge them with the existing IOTA profile social links. Each social link displays a small origin icon (IOTA or Ethereum), and duplicates show both icons.

## Current Behavior
- `.iota` profiles only show social links from the IOTA onchain profile (IPFS data via `web3BioProfile.links`)
- The linked Ethereum wallet address is already resolved (`linkedEvmAddress` prop) but only used for tokens, NFTs, POAPs, etc.
- No social enrichment from the linked Ethereum wallet

## Implementation Plan

### 1. Fetch Ethereum Social Links in ProfileCard
Add a new `useEffect` in `ProfileCard.tsx` that:
- Detects `.iota` profiles with a valid `linkedEvmAddress`
- Calls the Web3.bio public API (`https://api.web3.bio/profile/{address}`) to fetch social links for the linked EVM address
- Stores the result in a new state variable `evmSocialLinks`

### 2. Build a Merged Social Links List
Create a `useMemo` that produces a unified social link array with source attribution:
- Iterate over IOTA links (from `web3BioProfile.links`) and tag each as `source: 'iota'`
- Iterate over EVM links (from the new fetch) and tag each as `source: 'ethereum'`
- For duplicates (same platform key), merge into a single entry with `source: 'both'`
- Deduplicate by platform name (case-insensitive), keeping the IOTA version's URL as primary

### 3. Add Small Origin Icons to Social Link Cards
In all social link rendering locations (desktop panel, mobile overlay, and inline sections):
- Replace direct iteration over `web3BioProfile.links` with iteration over the merged list
- Add a small (16x16) origin badge in the corner of each social card:
  - **IOTA source**: Small IOTA token icon (`src/assets/iota-token-icon.png`)
  - **Ethereum source**: Small ETH icon (`src/assets/eth-logo-dark.svg`)
  - **Both sources (duplicate)**: Show both icons side by side
- The badge is positioned at the bottom-right of the social icon circle, keeping the current card design intact

### 4. Update Social Link Count for Button Visibility
Update the `hasSocials` and `socialLinks` calculations (used for showing the "Social" pill button) to use the merged list length instead of only `web3BioProfile.links`.

## Technical Details

### Files Modified
- **`src/components/ProfileCard.tsx`**:
  - New state: `evmSocialLinks` (Record of platform to link data)
  - New state: `evmSocialsFetched` (boolean flag)
  - New `useEffect`: Fetch Web3.bio profile for `linkedEvmAddress` when available
  - New `useMemo`: `mergedSocialLinks` - array of `{ platform, linkData, url, source }` objects
  - Update 4 rendering locations (desktop panel content, mobile overlay, desktop inline, and the `hasSocials` checks) to use `mergedSocialLinks`
  - Add origin badge rendering (small icon overlay) to each social card

### No New Files or Dependencies Required
- Uses existing assets (`iota-token-icon.png`, `eth-logo-dark.svg`)
- Uses existing Web3.bio API pattern already in `useProfileResolver.ts`
- No new edge functions needed

### Merge Logic (Pseudocode)
```text
mergedMap = {}

for each (platform, linkData) in iotaLinks:
    mergedMap[platform] = { platform, linkData, source: 'iota' }

for each (platform, linkData) in evmLinks:
    if platform exists in mergedMap:
        mergedMap[platform].source = 'both'
    else:
        mergedMap[platform] = { platform, linkData, source: 'ethereum' }

return Object.values(mergedMap)
    .filter(exclude 'website' and 'email')
```

