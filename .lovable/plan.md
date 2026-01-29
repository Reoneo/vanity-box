
# IOTA Onchain Profile System Implementation Plan

## Overview
Implement a Move-based onchain profile system for Vanity.box where profile data is bound to the IOTA Names Name NFT. This enables profile editing only by the current Name NFT owner, with automatic ownership transfer when the name is sold.

---

## Architecture Summary

The system consists of three major components:

1. **IOTA Move Smart Contract** - A shared registry storing profile data keyed by Name NFT object ID
2. **Edge Functions** - Read/write operations to the IOTA chain via JSON-RPC
3. **Frontend UI** - Pencil edit icons, edit modals, and transaction signing via IOTA dApp Kit

---

## Part 1: IOTA Move Contract

### Package Structure
```
vanity_profile/
├── Move.toml
└── sources/
    └── profiles.move
```

### Contract Design

**Registry (Shared Object)**
```move
struct Registry has key {
    id: UID,
    profiles: Table<ID, ProfileData>,
}
```

**ProfileData**
```move
struct ProfileData has store, drop {
    avatar_url: String,
    header_url: String,
    bio: String,
    email: String,
    website: String,
    links: vector<Link>,
}
```

**Link**
```move
struct Link has store, drop, copy {
    platform: u8,
    url: String,
}
```

**Platform Constants**
| Code | Platform |
|------|----------|
| 1 | X/Twitter |
| 2 | LinkedIn |
| 3 | Facebook |
| 4 | Instagram |
| 5 | Bluesky |
| 6 | WhatsApp |
| 7 | Telegram |
| 8 | Reddit |
| 9 | Spotify |
| 10 | YouTube |
| 11 | GitHub |

### Entry Functions

| Function | Description |
|----------|-------------|
| `init(ctx)` | Creates and shares the Registry on publish |
| `upsert_profile(reg, name, avatar, header, bio, email, website, ctx)` | Creates or updates profile keyed by Name NFT ID |
| `set_link(reg, name, platform, url)` | Adds/updates a social link |
| `remove_link(reg, name, platform)` | Removes a social link by platform |

**Key Security**: Every mutating function requires `&Name` as an argument. Since Name NFT is an owned object, only the current owner can provide it in a transaction, ensuring authorization at the protocol level.

### Field Validation
| Field | Max Length |
|-------|------------|
| avatar_url | 512 chars |
| header_url | 512 chars |
| website | 512 chars |
| bio | 1000 chars |
| email | 256 chars |
| url (link) | 512 chars |

---

## Part 2: Frontend Integration

### New Files to Create

| File | Purpose |
|------|---------|
| `src/lib/iota/client.ts` | IotaClient configured for mainnet/testnet |
| `src/lib/iota/names.ts` | Name resolution and Name NFT discovery |
| `src/lib/iota/vanityProfile.ts` | Profile read/write helpers using IOTA SDK |
| `src/components/IotaProfileEditModal.tsx` | Edit modal for avatar, header, bio, email, website, socials |

### Key Integration Points

**1. Resolve Owner & Name NFT Object ID**

When loading a `.iota` profile page:
```typescript
// Step 1: Resolve name -> owner address
const owner = await resolveNameOwner("vanity.iota");

// Step 2: Find the Name NFT objectId owned by that address
const nameObjectId = await findNameObjectId(owner, "vanity.iota");

// Step 3: Fetch profile from registry table
const profile = await fetchOnchainProfile(REGISTRY_ID, nameObjectId);
```

**2. Ownership Check for Edit Mode**

```typescript
const connectedAddress = useCurrentAccount()?.address;
const isOwner = connectedAddress && ownerAddress && 
  connectedAddress.toLowerCase() === ownerAddress.toLowerCase();

// Pencil icons only visible when:
// - isOwner === true
// - User navigated via Profile dock button (editEnabled state)
```

**3. Transaction Signing**

Using `@iota/dapp-kit`'s `useSignAndExecuteTransaction` hook:

```typescript
import { useSignAndExecuteTransaction } from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';

const { mutate: signAndExecute } = useSignAndExecuteTransaction();

async function saveProfile(profileData) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::profiles::upsert_profile`,
    arguments: [
      tx.object(REGISTRY_ID),
      tx.object(nameObjectId),
      tx.pure.string(profileData.avatarUrl),
      tx.pure.string(profileData.headerUrl),
      tx.pure.string(profileData.bio),
      tx.pure.string(profileData.email),
      tx.pure.string(profileData.website),
    ],
  });

  signAndExecute({ transaction: tx }, {
    onSuccess: (result) => {
      toast.success("Profile updated onchain!");
      refetchProfile();
    },
    onError: (err) => {
      toast.error(`Transaction failed: ${err.message}`);
    },
  });
}
```

---

## Part 3: Edge Function for Profile Reads

### New Edge Function: `get-iota-onchain-profile`

```typescript
// supabase/functions/get-iota-onchain-profile/index.ts

// 1. Resolve name -> owner
// 2. Find Name NFT objectId via getOwnedObjects + filter by type
// 3. Read dynamic field from Registry using getDynamicFieldObject
// 4. Return ProfileData
```

### Name NFT Type Discovery

The IOTA Names SDK uses a specific Name NFT type. To discover it:

```typescript
const ownedObjects = await client.getOwnedObjects({
  owner: ownerAddress,
  options: { showType: true, showContent: true },
});

// Filter for objects with "name" or "iota_names" in type
const nameNfts = ownedObjects.data.filter(obj => 
  obj.data?.type?.toLowerCase().includes("name")
);
```

A helper function will match the full name string stored in the NFT's content fields.

---

## Part 4: ProfileCard.tsx Modifications

### New Props
```typescript
interface ProfileCardProps {
  // ... existing props ...
  connectedWalletAddress?: string;  // Already exists
  onchainProfile?: OnchainProfileData | null;
  isProfileOwner?: boolean;
  onEditProfile?: () => void;
}
```

### Pencil Icon Placement

Pencil icons will appear next to:
- Avatar (when hovered)
- Header image (when hovered)
- Bio section
- Email/Website section
- Social links section (opens editor modal)

Only rendered when `isProfileOwner && editEnabled`.

### Edit Modal Content

| Section | Fields |
|---------|--------|
| Images | Avatar URL (with preview), Header URL (with preview) |
| About | Bio (textarea, 1000 chars max), Email (with warning), Website URL |
| Socials | List of platform + URL pairs with add/remove |

---

## Part 5: State Management

### New State in SearchInterface.tsx

```typescript
// Onchain profile data for .iota profiles
const [onchainProfile, setOnchainProfile] = useState<OnchainProfileData | null>(null);
const [onchainProfileLoading, setOnchainProfileLoading] = useState(false);
const [showIotaEditModal, setShowIotaEditModal] = useState(false);
const [isProfileOwner, setIsProfileOwner] = useState(false);
```

### Load Flow

```typescript
useEffect(() => {
  if (searchedIdentity?.toLowerCase().endsWith('.iota')) {
    loadOnchainProfile(searchedIdentity);
  }
}, [searchedIdentity]);

async function loadOnchainProfile(name: string) {
  setOnchainProfileLoading(true);
  try {
    const data = await callEdge('get-iota-onchain-profile', { name });
    setOnchainProfile(data.profile);
    setIsProfileOwner(
      connectedAddress?.toLowerCase() === data.ownerAddress?.toLowerCase()
    );
  } catch (e) {
    console.error('Failed to load onchain profile:', e);
  } finally {
    setOnchainProfileLoading(false);
  }
}
```

---

## Part 6: Implementation Phases

### Phase 1: Contract & Infrastructure
1. Create Move contract source code
2. Document deployment instructions for mainnet
3. Store package ID and registry ID as environment variables

### Phase 2: Read Path
1. Create `get-iota-onchain-profile` edge function
2. Implement Name NFT discovery logic
3. Integrate with ProfileCard to display onchain data

### Phase 3: Write Path
1. Add `useSignAndExecuteTransaction` hook usage
2. Create `IotaProfileEditModal` component
3. Implement save flow with transaction confirmation

### Phase 4: Polish
1. Add loading states during transaction
2. Handle errors gracefully (preserve form state)
3. Add "Create Onchain Profile" button for owners without profile
4. Implement 30-second in-memory cache for reads

---

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `VITE_VANITY_PROFILE_PACKAGE_ID` | Deployed Move package address |
| `VITE_VANITY_PROFILE_REGISTRY_ID` | Registry shared object ID |
| `VITE_IOTA_NAMES_NAME_NFT_TYPE` | Full struct type path for Name NFT |
| `VITE_IOTA_NETWORK` | "mainnet" or "testnet" |

---

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/lib/iota/client.ts` |
| Create | `src/lib/iota/names.ts` |
| Create | `src/lib/iota/vanityProfile.ts` |
| Create | `src/components/IotaProfileEditModal.tsx` |
| Create | `supabase/functions/get-iota-onchain-profile/index.ts` |
| Modify | `src/components/ProfileCard.tsx` - Add pencil icons for IOTA profiles |
| Modify | `src/components/SearchInterface.tsx` - Add onchain profile state + edit modal |
| Modify | `src/contexts/IotaWalletContext.tsx` - Export transaction signing hook |

---

## UX Copy

| Scenario | Message |
|----------|---------|
| Email warning | "Warning: Email stored onchain is public and permanent." |
| No Name NFT found | "Could not locate the Name NFT object. Please refresh or confirm the name is owned by this wallet." |
| Transaction pending | "Saving profile to IOTA blockchain..." |
| Transaction success | "Profile updated onchain!" |
| No profile exists (owner) | "Create Onchain Profile" button |
| Not owner | Hide all edit buttons |

---

## Technical Notes

1. **Name NFT Type Path**: The exact type string (e.g., `0x...::iota_names::Name`) must be discovered from the IOTA Names package. A helper function will log owned object types to identify the correct path.

2. **Move Package Deployment**: The Move contract must be deployed separately using the IOTA CLI. Instructions will be provided as comments in the source file.

3. **Existing Features Preserved**: This implementation adds IOTA-specific editing without modifying existing WalletConnect, ENS, or Namestone edit flows.
