# 17. Time, Validation & Assumptions

## Time model

- All timestamps are in **UTC Unix seconds** (uint32).
- Device clocks must be reasonably accurate; drift tolerance is **1 hour** (`CLOCK_DRIFT_TOLERANCE = 3,600 seconds`) between terminal and backend.
- Session timeout is **24 hours** (`SESSION_TIMEOUT_SECONDS = 86,400`). A session is considered expired when `nowSeconds > lastTimestamp + 86,400 + 3,600`.
- Session grant expiry is **24 hours** from issuance (`SESSION_KEY_LIFETIME_SECONDS = 86,400`).
- JWT access tokens expire in **1 hour** from issuance.
- A `nowSeconds = 0` is treated as a programming error and triggers a fallback to `Date.now() / 1000` with a console warning.

## Validation sequence (every read)

1. **Magic check** — reject if magic bytes are missing/corrupted (pre-check before crypto validation)
2. **Schema version check** — reject if `version < 4` ("Schema version mismatch") or `version > 4` ("Unrecognized schema version")
3. **Key version check** — reject if card `keyVersion` doesn't match session grant `keyVersion`
4. **AES-GCM decrypt** (v2+ only) — decrypt card body using session key + card ID + counter as nonce
5. **Payload decode** — decode binary wire format into structured `CardPayload`
6. **HMAC verification** — verify trailer HMAC over encrypted buffer + anchor fields
7. **Counter-bind check** — verify `counterBind == lower32(wallet.counter)`
8. **Tenant-bind check** — verify FNV-32a(tenantId) matches card `tenantBind` field
9. **Chain hash validation** — walk log entries and verify each hash chains to previous
10. **Status check** — if `status != ACTIVE`, deny all write operations
11. **Session expiry check** — if `isSessionExpired()`, allow only checkout transitions
12. **Transition validation** — verify requested state transition is valid from current state

## Pre-operation checks (before write)

- `isWriteEligible(payload, grant, requiredOp, nowSeconds)`:
  - Card must be ACTIVE status
  - Grant must not be expired (`nowSeconds < grant.expiresAt`)
  - Required operation must be in `grant.allowedOps`
- Block enforcement (`enforceBlockOnCheckin`/`enforceBlockOnCheckout`):
  - Checks both on-card status AND local IndexedDB card record
  - Either source indicating blocked → reject

## Assumptions

- Users carry NFC cards and can hold them steady for 1-2 seconds during a write operation.
- Terminal devices are standard Android devices with Chrome browser supporting Web NFC and Web Crypto APIs.
- Terminal devices can connect to the backend periodically (at least once per 24h) to refresh session grants and sync transactions.
- Physical card printing, personalisation, and government integrations are out of scope.
- NTAG215 cards have sufficient storage (496 bytes) for the current data layout. No additional storage is planned.
- All monetary values are in Indonesian Rupiah (IDR), stored as integer amounts (no decimal).
- The parking use-case charges Rp 2,000 per hour (rounded up).
