## Diagnosis

I tested the deployed `get-ens-domains` edge function directly and confirmed it correctly returns `jailbreak.eth` metadata (owner, manager, registrant, resolvedAddress, expiryDate, source: "onchain"). So the backend is fine.

The frontend code in `ProfileCard.tsx` is in place but the injection effect (line 657) is gated on `ensDomainsFetched`. For a searched `.eth` that resolves to an EVM wallet that doesn't own the name, the main fetch path returns `domains: []` but races with state resets, and the injection effect's `ensDomains` dependency causes it to keep early-returning. The detail modal roles and expiry-border helpers exist, but only render if a domain is actually in `ensDomains`.

## Fix

1. **Decouple the .eth injection effect** in `src/components/ProfileCard.tsx`:
   - Remove the `ensDomainsFetched` gate and the `ensDomains` dep (use functional setState with internal dedupe).
   - Trigger purely on `searchedIdentity` changing to a `.eth` name.
   - Use a ref to track which name was last injected this session so it fires exactly once per search.
   - This guarantees `jailbreak.eth` (and any searched .eth) lands in `ensDomains` regardless of ownership, which makes the NFT button visible (`hasNfts` checks `ensDomains.length > 0`) and renders the ENS tile.

2. **Verify modal + borders already wired**:
   - `ENSDomainDetailModal.tsx` already renders Owner / Manager / Registrant / ETH-record rows plus a "Grace period ends" row — no change needed once the domain object reaches it.
   - `getEnsBorderClass` already returns red for expired and emerald for grace-ended — applied at both the desktop grid (line 2712) and mobile grid (line 3788) call sites.

3. **Smoke-test in preview** after the edit:
   - Search `jailbreak.eth` (active name, future expiry) → NFT button visible, ENS tile blue border, modal shows all 4 role rows + future grace date.
   - Search a known expired .eth (e.g. any lapsed test name) → red border; after 90d grace → emerald border.
   - Confirm with browser network panel that the `get-ens-domains` POST with `{domainName}` returns the on-chain payload.

## Technical detail

```ts
// ProfileCard.tsx — replace the existing injection useEffect
const injectedEnsNameRef = useRef<string | null>(null);
useEffect(() => {
  const name = (searchedIdentity || '').toLowerCase().trim();
  if (!name.endsWith('.eth')) return;
  if (injectedEnsNameRef.current === name) return;
  injectedEnsNameRef.current = name;
  let cancelled = false;
  (async () => {
    const res = await fetch('.../get-ens-domains', {
      method: 'POST', headers: {...}, body: JSON.stringify({ domainName: name }),
    });
    const j = await res.json();
    if (cancelled || !j?.domain) return;
    setEnsDomains(prev =>
      prev.some(d => (d?.name || '').toLowerCase() === name) ? prev : [j.domain, ...prev]
    );
    setEnsDomainsFetched(true); // ensure category gating opens immediately
  })();
  return () => { cancelled = true; };
}, [searchedIdentity]);
```

Also reset `injectedEnsNameRef.current = null` in the existing reset effect that clears `ensDomains` so re-searching the same name after a different profile still re-injects.

## Files

- `src/components/ProfileCard.tsx` — replace injection effect (~lines 656-682) and add ref reset in the reset effect (~line 1150).

No edge-function or DB changes; the backend already returns the correct payload.
