

# Fix Social Link Origin Badge Assignment for .iota Profiles

## Problem
The current merge logic uses only the platform name (e.g., `x`) as the merge key. This causes two bugs:

1. **False duplicate**: IOTA has X `@Smithdotbox` and Ethereum has Twitter `@30315eth` -- these are different accounts but get merged into one entry with `source: 'both'` because `twitter` normalizes to `x`.
2. **Missing separate entry**: The Ethereum-only X account (`@30315eth`) disappears entirely instead of appearing as a separate card with an ETH-only badge.

## What it should look like
- **X @Smithdotbox** -- IOTA badge only (only on .iota profile)
- **Twitter @30315eth** -- ETH badge only (only on Ethereum profile)
- **GitHub @ReoNeo** -- Both badges (same handle on both profiles)
- **LinkedIn @ThirdWeb** -- Both badges (same handle on both profiles)
- **Telegram @PortofSpain** -- Both badges (same handle on both profiles)
- **Bluesky, YouTube, Discord, Farcaster** -- whichever source they come from

## Solution

### Change the merge logic to compare handles, not just platform names

In the `mergedSocialLinks` useMemo in `ProfileCard.tsx`:

1. When an EVM link has the same normalized platform key as an existing IOTA link, extract and compare the actual handle/URL values
2. If the handles match -- mark as `source: 'both'` (true duplicate)
3. If the handles differ -- keep both as separate entries (one `iota`, one `ethereum`), using a disambiguated key like `x` and `x_evm`
4. Display the original platform name for each entry (so the Ethereum one shows "Twitter" and the IOTA one shows "X")

### Technical Details

**File: `src/components/ProfileCard.tsx`**

- Add a `extractRawHandle` helper that pulls the handle string from linkData (either `linkData.handle`, the last segment of `linkData.link`, or the raw string)
- Update the merge block (~lines 443-452): when `mergedMap[key]` already exists, compare handles. If different, insert the EVM link under a suffixed key (`${key}_evm`) so both appear
- Update the rendering key from `platform` to a unique key (since we may now have two entries for the same normalized platform)
- No changes to badge rendering logic needed -- the existing `source` flags will now be correctly assigned

### Handle Extraction Pseudocode
```text
function extractRawHandle(platform, linkData):
  if linkData.handle exists: return normalize(linkData.handle)
  link = linkData.link or linkData (if string)
  return last path segment of URL, stripped of @ prefix
```

### Merge Logic Pseudocode
```text
for each (platform, linkData) in evmLinks:
  key = normalizePlatformKey(platform)
  if key in mergedMap:
    iotaHandle = extractRawHandle(mergedMap[key])
    evmHandle = extractRawHandle(linkData)
    if iotaHandle == evmHandle:
      mergedMap[key].source = 'both'
    else:
      mergedMap[key + '_evm'] = { platform, linkData, source: 'ethereum' }
  else:
    mergedMap[key] = { platform, linkData, source: 'ethereum' }
```

