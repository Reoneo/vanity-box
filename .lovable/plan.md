

# Passkey Wallet System - Full Implementation Plan

## Overview
Implement a production-grade passkey wallet creation and binding system for IOTA dApps, enabling users to create new IOTA wallets backed by platform passkeys (WebAuthn/FIDO2) and optionally bind existing extension wallets to passkeys for passwordless sign-in.

## Phase 1: Database Migration

Create a hardened `auth_private` schema with three tables:

- **`auth_private.wallet_passkey_bindings`** -- stores credential IDs, compressed P-256 public keys (33 bytes), sign counts, binding level (passkey_wallet vs existing_wallet_link), origin, RP ID, wallet proof hashes, status, and timestamps.
- **`auth_private.passkey_challenges`** -- stores SHA-256 hashed challenges (never raw), challenge type enum, bind session ID, expected origin/RP ID, TTL expiry, and single-use consumption tracking.
- **`auth_private.auth_audit_events`** -- append-only audit log with triggers preventing UPDATE/DELETE.

Includes:
- Custom enums for binding_status, challenge_type, binding_level
- Atomic `consume_challenge()` function (SECURITY DEFINER, single UPDATE...WHERE used_at IS NULL)
- `revoke_binding()` function with audit trail
- Strict RLS: service_role only, no public/anon/authenticated access
- GRANT/REVOKE privilege hardening
- Unique indexes on credential_id, useful indexes on user_id, wallet_address, status

## Phase 2: Edge Functions (6 functions)

All edge functions use service role for DB access, CORS headers, and rate limiting patterns.

### 2a. `passkey-bind-challenge`
- Accepts wallet address, generates random 32-byte nonce
- Stores SHA-256 hash of nonce with 5-minute TTL
- Returns canonical wallet-proof message (domain-separated, nonce-based, EIP-4361-inspired template)

### 2b. `passkey-verify-wallet`
- Accepts wallet address, message, signature, bind_session_id, nonce
- Atomically consumes the wallet_bind challenge via `consume_challenge()`
- Verifies IOTA wallet signature using `verifyPersonalMessageSignature()`
- Stores proof hashes (message hash + signature hash) in audit
- Returns verified bind session state

### 2c. `passkey-register-challenge`
- Generates WebAuthn `PublicKeyCredentialCreationOptions` with ES256 (alg -7, P-256)
- Sets `residentKey: required`, `userVerification: required`, `attestation: none`
- RP ID = `vanity.box` (stable registrable domain)
- Stores challenge hash with 5-minute TTL

### 2d. `passkey-register-verify`
- Parses clientDataJSON, verifies type = "webauthn.create"
- Atomically consumes challenge
- Validates origin allowlist, rpIdHash = SHA-256(RP ID)
- Checks UP and UV flags in authenticator data
- Extracts credential ID, public key (normalizes to 33-byte compressed P-256)
- For `passkey_wallet`: derives IOTA address from public key
- For `existing_wallet_link`: uses the verified wallet address from bind session
- Atomic insert: binding + audit event in single transaction

### 2e. `passkey-login-challenge`
- Generates assertion challenge for `navigator.credentials.get()`
- Stores hashed challenge with TTL
- Anti-enumeration: same response shape regardless of credential existence

### 2f. `passkey-login-verify`
- Parses assertion response, consumes challenge
- Verifies origin, rpIdHash, UP/UV flags
- Verifies signature over `authenticatorData || SHA-256(clientDataJSON)` using stored public key
- Handles signCount comparison (store + audit anomalies)
- Updates `last_used_at` on binding
- Returns session/auth token

### 2g. `passkey-unbind`
- Requires step-up WebAuthn authentication (recent, within 5 minutes)
- Calls `revoke_binding()` DB function
- Writes audit event

## Phase 3: Frontend - Shared Utilities

### 3a. `src/lib/passkey/webauthn.ts`
- Base64url encode/decode helpers
- `createPasskeyCredential()` -- wraps `navigator.credentials.create()` with proper options
- `getPasskeyAssertion()` -- wraps `navigator.credentials.get()`
- `isWebAuthnAvailable()` -- feature detection

### 3b. `src/lib/passkey/keyNormalization.ts`
- P-256 key format converters: SPKI DER to uncompressed, COSE to uncompressed, uncompressed to compressed (33-byte)
- Uses `@noble/hashes` (already installed) for SHA-256
- Handles `getPublicKey()` null fallback (parse COSE from attestationObject)

### 3c. `src/hooks/usePasskeyWallet.ts`
- React hook managing passkey wallet state
- Methods: `createPasskeyWallet()`, `bindExistingWallet()`, `loginWithPasskey()`, `unbindPasskey()`
- Orchestrates edge function calls + WebAuthn ceremonies
- Manages loading/error/success states

## Phase 4: Frontend - UI Components

### 4a. `src/components/PasskeyWalletModal.tsx`
- Modal with two tabs: "Create Wallet" and "Link Existing"
- **Create Wallet tab**: single button triggers passkey creation ceremony, shows derived IOTA address on success
- **Link Existing tab**: step-by-step flow (1. Sign wallet proof message, 2. Create passkey, 3. Done)
- Shows passkey status, allows unbinding with confirmation dialog
- Accessible from the Identity Panel and Dock

### 4b. Integration into `IdentityPanel.tsx`
- Add "Passkey Wallet" section alongside existing Ethereum/TON/Aptos wallet linking
- Show passkey binding status badge
- "Create Passkey Wallet" or "Link Passkey" buttons based on state

### 4c. Integration into `Dock.tsx`
- Add passkey login option for returning users without extension wallets
- If passkey binding exists, show "Sign in with Passkey" option

## Phase 5: Passkey-based IOTA Transaction Signing

### 5a. `src/lib/passkey/iotaPasskeySigner.ts`
- Implements IOTA SDK-compatible PasskeyAuthenticator signature format
- Wraps WebAuthn assertion data (authenticatorData + clientDataJSON + userSignature)
- userSignature = flag || compact 64-byte P-256 signature || 33-byte compressed pubkey
- Signature normalization (normalizeS for low-S canonical form)

### 5b. Integration with IotaWalletContext
- Add passkey signer as alternative transaction signing path
- When user has passkey wallet and no extension, use passkey signer for `signAndExecuteTransaction`

## Technical Details

### Key Format Pipeline
```text
WebAuthn getPublicKey() -> DER SPKI (91 bytes)
  -> Strip 26-byte header -> Uncompressed P-256 (65 bytes, 0x04 prefix)
  -> Compress -> 33-byte compressed key (0x02/0x03 prefix)

Fallback: attestationObject authData -> CBOR COSE key -> x(32) || y(32)
  -> Prepend 0x04 -> Uncompressed -> Compress -> 33 bytes
```

### Security Controls
- Server-generated 32-byte random challenges (crypto.randomBytes)
- SHA-256 hashed challenge storage (never raw)
- Single-use atomic consumption (UPDATE...WHERE used_at IS NULL...RETURNING)
- 5-minute TTL on all challenges
- Origin allowlist verification (exact match)
- rpIdHash = SHA-256("vanity.box") verification
- UP + UV flag enforcement
- signCount tracking with anomaly auditing
- Rate limiting per IP/user/wallet (20 req/min challenge, 30 req/min verify)
- Anti-enumeration (uniform error responses)
- Append-only audit log with DB-level mutation prevention triggers
- Private schema with service-role-only access

### Dependencies
- `@noble/hashes` (already installed) -- SHA-256, P-256 operations
- No new dependencies required; WebAuthn is a browser API

### Files to Create
1. `supabase/functions/passkey-bind-challenge/index.ts`
2. `supabase/functions/passkey-verify-wallet/index.ts`
3. `supabase/functions/passkey-register-challenge/index.ts`
4. `supabase/functions/passkey-register-verify/index.ts`
5. `supabase/functions/passkey-login-challenge/index.ts`
6. `supabase/functions/passkey-login-verify/index.ts`
7. `supabase/functions/passkey-unbind/index.ts`
8. `src/lib/passkey/webauthn.ts`
9. `src/lib/passkey/keyNormalization.ts`
10. `src/lib/passkey/iotaPasskeySigner.ts`
11. `src/hooks/usePasskeyWallet.ts`
12. `src/components/PasskeyWalletModal.tsx`

### Files to Modify
1. `supabase/config.toml` -- register 7 new edge functions
2. `src/components/identity/IdentityPanel.tsx` -- add passkey wallet section
3. `src/components/Dock.tsx` -- add passkey login option
4. `src/contexts/IotaWalletContext.tsx` -- add passkey signer path
5. `src/types/identity.ts` -- add passkey-related types

