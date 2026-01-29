
# IOTA vanity.iota Subdomain Minting Feature

## Overview
Add a new card to the `NameSearchCarousel` component that allows users to mint vanity.iota subdomains (e.g., `guy.vanity.iota`). This card will appear:
- **Desktop**: Between the ENS (.eth) and Base (.base.eth) cards (3-column layout)
- **Mobile**: At the top of the stack (first card)

The subdomain pricing follows the same structure as ENS subdomains defined in the custom knowledge.

## Pricing Structure (USD)
| Character Length | Price (USD) |
|------------------|-------------|
| 1 character | $100 |
| 2 characters | $50 |
| 3 characters | $25 |
| 4 characters | $15 |
| 5 characters | $10 |
| 6-9 characters | $5 |
| 10+ characters | $1 |

## Technical Implementation

### 1. Create IOTA Subdomain Availability Hook
**New file: `src/hooks/useIotaSubdomainAvailability.ts`**

A hook that checks if a vanity.iota subdomain is available by querying the IOTA Names SDK:
- Uses `iotaNamesClient.getNameRecord()` to check if the subdomain exists
- Returns status: `idle`, `loading`, `available`, `taken`, `invalid`, `error`
- Includes expiration date if the name is taken
- Validates subdomain format (3+ characters, alphanumeric + hyphens)

### 2. Create IOTA Subdomain Mint Modal
**New file: `src/components/IotaSubdomainMintModal.tsx`**

A modal for minting vanity.iota subdomains using the IOTA Names SDK:
- Uses `IotaNamesTransaction.createSubname()` from `@iota/iota-names-sdk`
- Integrates with IOTA dApp Kit for wallet signing via `useSignAndExecuteTransaction`
- Shows price in IOTA tokens (converted from USD using crypto prices)
- Requires IOTA wallet connection (prompts user to connect if not connected)
- Sets subdomain to expire same as parent (vanity.iota)
- Enables `allowChildCreation: false` and `allowTimeExtension: true`

### 3. Update NameSearchCarousel Component
**Modified file: `src/components/NameSearchCarousel.tsx`**

Add a third card for IOTA vanity.iota subdomains:
- Import the new availability hook and modal
- Add state for IOTA modal open/close
- Create `IotaVanityCard` component with teal/IOTA branding
- Modify layout:
  - Desktop: 3-column grid (`grid-cols-3`)
  - Mobile: Stack with IOTA card first
- Display price in USD/IOTA with toggle (similar to ENS/ETH toggle)

### 4. Environment Variables & Constants
**Constants needed (stored in code, not env vars):**
- `VANITY_IOTA_PARENT_NFT_ID`: The object ID of the vanity.iota Name NFT that owns the subnames
- This will need to be obtained from the vanity.iota name owner's wallet

## Component Layout

### Desktop (3-column)
```
+----------------+----------------+----------------+
|    guy.eth     | guy.vanity.iota|  guy.base.eth  |
|      ENS       |      IOTA      |   Basenames    |
+----------------+----------------+----------------+
```

### Mobile (stacked)
```
+--------------------------------+
|        guy.vanity.iota         |
|            IOTA                |
+--------------------------------+
|           guy.eth              |
|             ENS                |
+--------------------------------+
|        guy.base.eth            |
|          Basenames             |
+--------------------------------+
```

## Minting Flow

1. User searches for a name (e.g., "guy")
2. IOTA card shows availability of `guy.vanity.iota`
3. If available, user clicks "Register" button
4. Modal opens showing:
   - Subdomain preview
   - Price in USD + IOTA equivalent
   - IOTA wallet connection status
5. User connects IOTA wallet (if not connected)
6. User confirms transaction in wallet
7. Transaction executes `createSubname()` on IOTA Names
8. Success toast + redirect to profile

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useIotaSubdomainAvailability.ts` | Check subdomain availability via IOTA Names SDK |
| `src/components/IotaSubdomainMintModal.tsx` | Modal for minting with wallet integration |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/NameSearchCarousel.tsx` | Add IOTA card, update layout to 3-column on desktop |
| `src/lib/iota/names.ts` | Add subdomain-specific helper functions |

## SDK Integration Details

The IOTA Names SDK provides the `IotaNamesTransaction` class for creating subnames:

```typescript
import { IotaNamesClient, IotaNamesTransaction } from '@iota/iota-names-sdk';
import { Transaction } from '@iota/iota-sdk/transactions';
import { useSignAndExecuteTransaction } from '@iota/dapp-kit';

// Create transaction
const tx = new Transaction();
const iotaNamesTx = new IotaNamesTransaction(iotaNamesClient, tx);

// Create subname
const subnameNft = iotaNamesTx.createSubname({
  parentNft: VANITY_IOTA_PARENT_NFT_ID,
  name: 'guy.vanity.iota',
  expirationTimestampMs: parentExpiration,
  allowChildCreation: false,
  allowTimeExtension: true,
});

// Transfer to user
tx.transferObjects([subnameNft], tx.pure.address(userAddress));

// Sign and execute
signAndExecute({ transaction: tx });
```

## UI/UX Details

### Card Styling (IOTA Theme)
- Border: `border-teal-500/40`
- Avatar background: `bg-teal-500/10`
- Register button: `bg-teal-500 hover:bg-teal-600 text-white`
- Uses existing `vanity-iota-avatar.png` asset

### Price Display
- Shows USD price by default
- Click to toggle to IOTA equivalent
- Uses existing `useCryptoPrices()` hook for IOTA price

### Availability Badge
- Available: Green badge with checkmark
- Registered: Red badge with X
- Loading: Spinning loader
- Invalid: Amber badge

## Dependencies
All required packages are already installed:
- `@iota/iota-names-sdk@^0.5.1`
- `@iota/dapp-kit@^0.8.3`
- `@iota/iota-sdk@^1.10.0`

## Important Notes

1. **Parent NFT Access**: The minting flow requires access to the `vanity.iota` parent NFT object ID. This is typically owned by Vanity.box's operational wallet, so the minting may need to be coordinated via a backend service or the user needs to own the parent.

2. **Alternative Approach**: If Vanity.box owns `vanity.iota`, the minting could be done via an edge function that holds the parent NFT signing capability, similar to how ENS subdomains are minted via Namestone.

3. **For MVP**: The implementation will include placeholder constants for the parent NFT ID that can be configured once the vanity.iota name is acquired.
