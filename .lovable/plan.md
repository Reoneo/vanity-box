
## What’s happening

### 1. Sui / TON are crossed
The current React logic in `ProfileCard.tsx` is actually mapping the wallet options in the right order:

- `ethereum -> ethLogoBlue`
- `iota -> iotaLogoBlue`
- `ton -> tonLogoBlue`
- `sui -> suiLogoBlue`

That means the remaining bug is not the button array itself. The two likely causes are:

- The **binary asset files are mislabeled** (`ton-logo-blue-circle.png` currently contains the Sui icon, or `sui-logo-blue-circle.png` contains the TON icon).
- The **data source is incomplete**, so the Sui button disappears because `linkedSuiAddress` is `null`, while the TON button is still present and visually looks like Sui due to the wrong file.

A DB check confirms `public.iota_cross_chain_profiles` currently has:

- `evm_address = 0x71ab...7040`
- `ton_address = null`
- `sui_address = null`

for `vanity.iota`.

So today:
- the **Sui button missing** is expected from the current DB row,
- and the **TON button looking like Sui** points to the uploaded icon assets being assigned to the wrong files.

### 2. Pressing Sui shows TON
Because the current option-to-address mapping is correct in code, this symptom is most consistent with the **wrong icon file being displayed for the TON option**, not the wrong address being selected in state.

### 3. The second avatar slide is missing
The media gallery currently builds two slides, then removes duplicates by **image URL**:

- searched avatar/header
- IOTA avatar/header

and then runs a dedupe filter by `item.image`.

That collapses the second slide when:
- the searched media and linked IOTA media resolve to the same URL,
- or the searched profile falls back to the same underlying image,
- or a direct `.iota` search is not being treated consistently with linked-domain mode.

### 4. The double loading feel
The current loading behavior is split across:
- initial `isLoading`
- linked IOTA fetch `iotaOnchainProfileLoading`
- profile card hide/show gates

So users can see:
1. one loader for the first resolved profile,
2. then another loader while the linked IOTA profile hydrates.

## Implementation plan

### 1. Fix the chain icon source-of-truth
Update `ProfileCard.tsx` to stop relying on ambiguous file naming alone and introduce a single verified icon registry, for example:

```text
CHAIN_MEDIA = {
  ethereum: { icon, label, alt },
  iota: { icon, label, alt },
  ton: { icon, label, alt },
  sui: { icon, label, alt }
}
```

Then:
- rebind each imported uploaded asset to the correct chain,
- apply the Ethereum icon to:
  - ENS profile avatar/header badge,
  - Ethereum linked wallet selector,
  - Ethereum wallet link display,
- ensure every chain button reads from the same registry.

If the binary files were saved under the wrong names, replace/re-import them with corrected filenames so the code and assets finally match.

### 2. Make linked wallet selection deterministic
Refine the linked wallet selector in `ProfileCard.tsx` so the displayed address always comes from the selected option object, never inferred by icon position or fallback order.

Specifically:
- keep `selectedLinkedWalletKey`,
- derive `displayedWalletAddress` strictly from the selected option,
- preserve selection if the same chain remains available after async updates,
- fall back only when the chosen chain disappears.

Add temporary logs while validating:
```text
selectedLinkedWalletKey
linkedWalletOptions
displayedWalletAddress
```

This will make TON/Sui misrouting obvious during verification.

### 3. Fix missing Sui button and missing data handling
Right now `linkedSuiAddress` is loaded only from `iota_cross_chain_profiles.sui_address`, and the current row is null.

Update the linked-wallet loading flow in `SearchInterface.tsx` so each chain resolves consistently:

- Ethereum: existing flow
- TON: existing flow
- Sui: existing flow
- IOTA owner: existing flow

Then make the UI explicit:
- show a chain button only when that linked address exists,
- never show a Sui button if there is no Sui address,
- if the user expects Sui but DB has none, the UI should not silently imply it exists.

If there is another table or event source that should populate Sui/TON links, wire that in; otherwise keep `iota_cross_chain_profiles` as the canonical source and avoid phantom buttons.

### 4. Rebuild the avatar/header gallery as source-aware, not URL-deduped
Refactor `avatarSlides` and `headerSlides` in `ProfileCard.tsx` so slides are keyed by **source**, not by image URL.

New behavior:
- `searched` source slide
- `linked-iota` source slide
- optional future chain-specific media slides if present

Important change:
- remove the current dedupe that drops slides when `entry.image === item.image`.

Instead:
- keep both slides if both sources exist, even when the image URLs match,
- badge each slide clearly:
  - “ENS Profile Avatar”
  - “IOTA Profile Avatar”
  - same for headers,
- if one source has no image, omit only that source’s slide.

This guarantees the vanity.iota slide remains visible whenever linked IOTA media exists.

### 5. Treat all profile searches through one linked-profile presentation path
Unify the display model so every search behaves like a linked-domain presentation:

```text
searched identity -> display shell immediately
resolved source profile(s) -> hydrate into same shell
```

That means:
- direct `.iota` searches,
- ENS/UD/Base searches,
- linked cross-chain overlays,

all use the same profile-shell rendering contract.

Practical changes:
- keep the searched identity visible immediately,
- keep one profile shell mounted while data resolves,
- progressively fill avatar, header, address row, socials, tokens, NFTs.

This removes the abrupt “resolve one profile, then swap to another” feeling.

### 6. Replace the split loader with one seamless loading state
Refactor `LoadingProgress.tsx` usage in `SearchInterface.tsx` into one unified loading state, such as:

```text
isProfileTransitionLoading =
  isLoading
  || iotaOnchainProfileLoading
  || isResolvingLinkedEvm
  || resolvingLinkedWallets
```

Then:
- show one loader from search start until the target display shell is ready,
- keep the same modal visible during the whole transition,
- update the subtitle/labels instead of unmounting/remounting the loader.

UI behavior:
- one professional loading card,
- searched domain shown as the primary identity,
- linked destination shown as secondary only when relevant,
- no second progress bar phase.

### 7. Keep the profile card mounted sooner
Adjust the render gating in `SearchInterface.tsx` so the profile shell appears as soon as the searched profile is known, even if linked chain enrichment is still arriving.

Instead of hiding the card until the IOTA payload is fully ready:
- render immediately with searched branding,
- stream in linked wallet data,
- stream in IOTA avatar/header/social/token/NFT content underneath.

That creates the “seamless” feel you asked for and removes the perception of two separate loads.

### 8. Polish the media modal layout
While updating the gallery:
- keep swipe support,
- keep small preview thumbnails,
- move the slide count away from the close button permanently,
- add an accessible `DialogDescription` to remove the current Radix warning in console,
- ensure the badge + title row wraps cleanly on mobile.

## Files to update

- `src/components/ProfileCard.tsx`
  - correct icon registry and wallet selector behavior
  - rebuild source-aware avatar/header slides
  - keep both searched and linked IOTA slides
  - modal polish and accessibility fix

- `src/components/SearchInterface.tsx`
  - unify loading state
  - treat all domains through one linked-profile shell
  - keep one continuous loader
  - make linked chain address resolution consistent

- `src/components/LoadingProgress.tsx`
  - adapt copy/layout to support a single uninterrupted loading experience

## Expected result after the fix

For `vanity.box` / `Finesser.eth` / `.iota` searches:

- Ethereum, IOTA, TON, and Sui icons will map to the correct chains.
- A chain button will only appear when that linked wallet actually exists.
- Pressing a chain icon will always show that chain’s own shortened wallet address.
- The avatar and header galleries will preserve separate searched-vs-IOTA slides whenever both sources exist.
- Direct `.iota` searches and linked cross-chain searches will use the same polished loading flow.
- The loader will feel like one continuous transition instead of a double-load sequence.
- The overall UI will look cleaner and more professional for vanity.box on mobile.
