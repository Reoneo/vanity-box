

## IOTA Subdomain Payment Flow Enhancement

This plan implements half-price early access pricing, live IOTA price fetching, payment validation, and backend minting for vanity.iota subdomains.

---

### Overview

The current IOTA subdomain minting modal uses a placeholder price and simulates minting. This implementation will:
1. Display half-price early access pricing with clear visual indicators
2. Fetch live IOTA token prices from CryptoCompare API
3. Require payment to a specific wallet address before minting
4. Validate payment receipt in the backend before completing the mint

---

### Payment Receiver Address

All IOTA subdomain payments will be sent to:
```
0x20ea2665976a7731a1ee82f8d53be43b0f411b231c1c15850b92b8fdbd4b2839
```

---

### Half-Price Early Access Pricing

Current pricing (will be halved):

| Characters | Original USD | Early Access USD |
|------------|--------------|------------------|
| 3 chars    | $300         | $150             |
| 4 chars    | $100         | $50              |
| 5 chars    | $50          | $25              |
| 6-9 chars  | $25          | $12.50           |
| 10+ chars  | $5           | $2.50            |

The UI will show:
- Original price with strikethrough
- Half price prominently displayed
- "Early Access 50% Off" badge

---

### Technical Implementation

#### 1. Add IOTA to Crypto Price Fetching

**File: `supabase/functions/get-crypto-prices/index.ts`**

Update to include IOTA token in the CryptoCompare API request:
```text
- Current: ETH,WLD,USDC,APT
- Updated: ETH,WLD,USDC,APT,IOTA
```

**File: `src/utils/cryptoPrices.ts`**

Add IOTA to the CryptoPrices interface and fetchCryptoPrices function.

**File: `src/contexts/CryptoPriceContext.tsx`**

Add IOTA with a fallback price (~$0.22 based on current market).

---

#### 2. Create IOTA Payment Edge Functions

**New: `supabase/functions/initiate-iota-payment/index.ts`**

- Accept: subdomain, wallet address, payment amount, payment method (IOTA/ETH)
- Generate unique payment reference
- Store in `payment_references` table with `iota` domain marker
- Return: payment reference, payment receiver address, exact token amount

**New: `supabase/functions/verify-iota-payment/index.ts`**

- Accept: transaction hash, payment reference, wallet address
- Query IOTA mainnet RPC to verify transaction
- Check: correct receiver address, correct amount, transaction confirmed
- Update payment status to 'verified'
- Return: success/failure with verification details

---

#### 3. Create IOTA Subdomain Minting Edge Function

**New: `supabase/functions/mint-iota-subdomain/index.ts`**

This function will:
1. Validate the payment reference is verified
2. Confirm payment matches subdomain and wallet
3. Create the Cloudflare DNS record and page rule (via existing create-vanity-box-redirect logic)
4. Store the minted domain record
5. Return success with vanity.box URL

---

#### 4. Update Frontend Modal

**File: `src/hooks/useIotaSubdomainAvailability.ts`**

Update `getSubdomainPriceUsd` to return both original and early access prices:
```typescript
export function getSubdomainPricing(label: string): { 
  originalPrice: number; 
  earlyAccessPrice: number; 
  isEarlyAccess: boolean 
}
```

**File: `src/components/IotaSubdomainMintModal.tsx`**

Major updates:
1. Use live IOTA price from CryptoPriceContext
2. Display early access pricing with original price strikethrough
3. Add payment flow steps: `quote` → `awaiting_payment` → `verifying_payment` → `minting` → `success`
4. Show payment instructions with receiver address
5. Add transaction hash input for verification
6. Poll for payment verification before proceeding to mint

**File: `src/components/NameSearchCarousel.tsx`**

Update to display half-price and early access badge for IOTA cards.

---

#### 5. Database Schema (Existing Tables)

The existing `payment_references` and `minted_domains` tables will be used. No new tables required since:
- `payment_references` already supports IOTA via `payment_method` field
- `minted_domains` can store vanity.iota entries with `domain = 'vanity.iota'`

---

### Payment Flow Diagram

```text
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  User sees  │────▶│  User clicks     │────▶│  Backend creates   │
│  half-price │     │  "Mint" button   │     │  payment reference │
└─────────────┘     └──────────────────┘     └────────────────────┘
                                                       │
                                                       ▼
┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  DNS record │◀────│  Backend mints   │◀────│  User sends IOTA/  │
│  created    │     │  after payment   │     │  ETH to receiver   │
└─────────────┘     │  verified        │     └────────────────────┘
                    └──────────────────┘              │
                            ▲                         ▼
                            │              ┌────────────────────┐
                            └──────────────│  User submits      │
                                           │  transaction hash  │
                                           └────────────────────┘
```

---

### Security Considerations

1. **Backend Payment Validation**: Payment verification occurs server-side by querying the IOTA blockchain
2. **Reference Matching**: Payment reference must match subdomain, domain, and wallet address
3. **Replay Prevention**: Payment references can only be used once (status transitions: pending → verified)
4. **Amount Verification**: Backend confirms the exact token amount was received

---

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/initiate-iota-payment/index.ts` | Generate payment reference for IOTA subdomains |
| `supabase/functions/verify-iota-payment/index.ts` | Verify IOTA/ETH payment on-chain |
| `supabase/functions/mint-iota-subdomain/index.ts` | Complete minting after payment verification |

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/get-crypto-prices/index.ts` | Add IOTA to price fetching |
| `src/utils/cryptoPrices.ts` | Add IOTA to interface and function |
| `src/contexts/CryptoPriceContext.tsx` | Add IOTA fallback price |
| `src/hooks/useIotaSubdomainAvailability.ts` | Add early access pricing function |
| `src/components/IotaSubdomainMintModal.tsx` | Complete payment flow with half-price display |
| `src/components/NameSearchCarousel.tsx` | Display early access badge and half-price |

