

# IOTA Vanity.iota Subdomain Enhancement Plan

## Overview
This plan updates the vanity.iota subdomain feature with:
1. **New pricing structure** (3-character minimum: $300, 4=$100, 5=$50, 6-9=$25, 10+=$5)
2. **Cloudflare DNS integration** to create matching vanity.box subdomains that redirect users to their onchain profile
3. **Improved mint modal UI** with a premium design matching the SubdomainMintModal pattern

---

## Part 1: Pricing Update

### File: `src/hooks/useIotaSubdomainAvailability.ts`

Update the `getSubdomainPriceUsd` function and minimum character validation:

```typescript
// New pricing structure
export function getSubdomainPriceUsd(label: string): number {
  const len = (label || '').trim().length;
  if (len < 3) return -1; // Invalid - minimum 3 characters
  if (len === 3) return 300;
  if (len === 4) return 100;
  if (len === 5) return 50;
  if (len >= 6 && len <= 9) return 25;
  return 5; // 10+ characters
}

// Validation update: minimum 3 characters
function isValidSubdomainLabel(label: string): boolean {
  if (!label || label.length < 3) return false; // Changed from 1 to 3
  const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
  return pattern.test(label) && label.length <= 63;
}
```

### File: `src/components/NameSearchCarousel.tsx`

Update IOTA card to show "Invalid" badge for names under 3 characters and display updated prices.

---

## Part 2: Cloudflare DNS Integration

### New Secrets Required

| Secret Name | Description |
|-------------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Zone.DNS write permission |
| `CLOUDFLARE_ZONE_ID` | Zone ID for vanity.box domain |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

### New Edge Function: `supabase/functions/create-vanity-box-redirect/index.ts`

This edge function will:
1. Accept subdomain name (e.g., "tim")
2. Create a CNAME or A record for `tim.vanity.box`
3. Set up Cloudflare redirect rule to forward to `https://vanity.box/tim.vanity.iota`

```typescript
// Edge function creates DNS record via Cloudflare API
POST https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records
{
  "type": "CNAME",
  "name": "tim", // subdomain
  "content": "vanity.box", // points to main domain
  "proxied": true // enables Cloudflare redirect rules
}

// Then create a redirect rule for this subdomain
POST https://api.cloudflare.com/client/v4/zones/{zone_id}/rulesets/{ruleset_id}/rules
{
  "action": "redirect",
  "expression": "(http.host eq \"tim.vanity.box\")",
  "action_parameters": {
    "from_value": {
      "target_url": {
        "value": "https://vanity.box/tim.vanity.iota"
      },
      "status_code": 301
    }
  }
}
```

### Integration with Minting Flow

The `IotaSubdomainMintModal` will call this edge function after successful subdomain mint to:
1. Create DNS record for `{name}.vanity.box`
2. Configure redirect to `https://vanity.box/{name}.vanity.iota`

---

## Part 3: Improved Mint Modal UI

### File: `src/components/IotaSubdomainMintModal.tsx`

Complete redesign following the `SubdomainMintModal.tsx` pattern with:

**Header Section**
- Premium gradient background (teal theme)
- Large avatar/icon display
- Subdomain name prominently displayed

**Pricing Display**
- Clean price breakdown card showing:
  - Character length indicator
  - Base price in USD
  - Equivalent price in IOTA tokens
  - Network/gas fee estimate
  - Total price

**Features Section**
- What you get with your vanity.iota subdomain:
  - Onchain identity on IOTA
  - Vanity.box redirect (`{name}.vanity.box`)
  - Profile customization via Move contract

**Wallet Connection**
- IOTA wallet status indicator
- Connect button if not connected
- Connected wallet address display with truncation

**Action Buttons**
- Primary gradient button: "Mint for $X"
- Loading states during minting
- Success/error states with appropriate icons

**Visual Improvements**
- Rounded corners (2xl)
- Soft shadows and borders
- Animated transitions between steps
- IOTA teal color scheme (#14B8A6)
- Professional typography hierarchy

---

## Part 4: Database Changes (Optional)

### Table: `iota_minted_subdomains`

Track minted vanity.iota subdomains for analytics and redirect management:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| subdomain | text | The subdomain label (e.g., "tim") |
| full_name | text | Full domain (e.g., "tim.vanity.iota") |
| wallet_address | text | Owner's IOTA wallet address |
| mint_tx_digest | text | IOTA transaction digest |
| cloudflare_record_id | text | Cloudflare DNS record ID |
| price_usd | decimal | Price paid in USD |
| created_at | timestamp | Registration timestamp |

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/create-vanity-box-redirect/index.ts` | Cloudflare DNS + redirect rule creation |

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useIotaSubdomainAvailability.ts` | Update pricing, 3-char minimum |
| `src/components/IotaSubdomainMintModal.tsx` | Complete UI redesign |
| `src/components/NameSearchCarousel.tsx` | Update IOTA card for new pricing |
| `supabase/config.toml` | Add new edge function config |

---

## Technical Flow

```text
User searches "tim"
       ↓
NameSearchCarousel shows availability + price ($25 for 3 chars)
       ↓
User clicks "Register"
       ↓
IotaSubdomainMintModal opens
       ↓
User connects IOTA wallet (if not connected)
       ↓
User confirms mint transaction
       ↓
IotaNamesTransaction.createSubname() executed
       ↓
On success, call create-vanity-box-redirect edge function
       ↓
Edge function creates tim.vanity.box DNS + redirect rule
       ↓
Show success with both URLs:
  - tim.vanity.iota (onchain identity)
  - tim.vanity.box → redirects to profile
```

---

## Implementation Order

1. **Update pricing** in `useIotaSubdomainAvailability.ts`
2. **Update NameSearchCarousel** for 3-char minimum display
3. **Create Cloudflare edge function** for DNS/redirect
4. **Redesign IotaSubdomainMintModal** with premium UI
5. **Integrate Cloudflare call** into mint success flow
6. **Add secrets** for Cloudflare API access
7. **Test end-to-end** mint + redirect flow

