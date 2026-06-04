# 12. Key & Trust Model

## Key hierarchy

```
Master Key (SESSION_MASTER_KEY, stored in Cloudflare Workers secrets)
    │
    ├── HMAC-SHA256(masterKey, "tenantId:keyVersion")
    │   └── Tenant Key (per-tenant, per-version)
    │       │
    │       ├── HMAC-SHA256(tenantKey, "session-key")
    │       │   └── Session Key (deterministic, shared across all tenant devices)
    │       │       │
    │       │       ├── HKDF-SHA256(sessionKey, salt=cardId, info="enc", len=32)
    │       │       │   └── Per-card AES-256-GCM Encryption Key
    │       │       │
    │       │       ├── HKDF-SHA256(sessionKey, salt=cardId, info="auth", len=32)
    │       │       │   └── Per-card HMAC-SHA256 Authentication Key
    │       │       │
    │       │       └── HKDF-SHA256(sessionKey, salt=cardId||counter, info="nonce", len=12)
    │       │           └── Per-write AES-GCM Nonce (unique per counter value)
    │       │
    │       └── HMAC-SHA256(tenantKey, grantPayload)
    │           └── Session Grant Signature (verifiable by backend)
    │
    └── HMAC-SHA256(masterKey, JWTPayload)
        └── JWT Access Token Signature (auth tokens, 1h expiry)
```

## Session grant

The backend issues a session grant containing:

| Field        | Type   | Description                                                          |
| ------------ | ------ | -------------------------------------------------------------------- |
| `keyVersion` | number | Identifies which key generation to use for derivation                |
| `sessionKey` | base64 | The tenant session key (deterministic, derived from master + tenant) |
| `expiresAt`  | number | Unix timestamp when the grant expires (24h from issuance)            |
| `allowedOps` | array  | Operations permitted for this role (e.g. `["read", "debit", "checkout"]`) |
| `tenantId`   | string | Tenant this grant is scoped to                                       |
| `accountId`  | string | Authenticated operator's account ID                                  |
| `deviceId`   | string | Device fingerprint hash this grant was issued to                     |
| `signature`  | base64 | HMAC-SHA256 of `{keyVersion, expiresAt, allowedOps, accountId, deviceId}` with tenant key |

**Key insight:** The session key is **deterministic** — it is derived from the tenant key via `HMAC(tenantKey, "session-key")`. All devices in the same tenant at the same `keyVersion` derive the same session key. This is intentional: it allows any terminal in the tenant to read/write cards encrypted by any other terminal, enabling offline operation without per-device key distribution.

**Grant issuance:** `GET /api/session-grant` issues grants. For authenticated roles (admin, station, gate, terminal, kiosk), the token's tenantId and role are used. For scout role, an anonymous grant is issued with read-only ops without requiring authentication.

**Grant lifetime:** 24 hours (`SESSION_KEY_LIFETIME_SECONDS = 86,400`). After expiry, the terminal cannot perform write operations and must request a new grant when online.

## Trust model

| Entity   | Trust Level                  | Basis                                                                |
| -------- | ---------------------------- | -------------------------------------------------------------------- |
| Backend  | **Root of trust**            | Only entity with access to master key. Issues all grants and tokens. |
| Station  | Trusted (online-only)        | All operations require live backend. No offline authority.            |
| Terminal | Conditionally trusted        | Trusted within the bounds of a valid, unexpired session grant.       |
| Gate     | Conditionally trusted        | Same as terminal, scoped to check-in operations only.                |
| Kiosk    | Conditionally trusted        | Same as terminal, scoped to read + debit operations only.            |
| Scout    | Untrusted (read-only)        | Anonymous grant, read operations only, cannot modify card state.     |
| Card     | **Untrusted storage medium** | All state must be cryptographically verified on every read.          |

## Trust invariants

- The card is the source of truth for balance and transaction history during offline periods, but **only when cryptographic verification passes**. A card that fails verification is not trusted.
- A session grant's `allowedOps` constrains what a terminal can do. Even with a valid session key, a terminal cannot perform operations outside its grant scope (enforced by `isWriteEligible`).
- Key rotation increments `keyVersion`. Cards written with an older key version will fail verification against a newer session grant (mismatch → rejection, not tamper).
- The master key never leaves the Cloudflare Workers environment. Terminals receive only the derived session key.

## Integrity-first principle

- Card state is tamper-evident: integrity wins over availability.
- The system treats a compromised card as untrusted and blocks it rather than accepting inconsistent state.
- A terminal with an expired grant cannot write to any card, even if the card data appears valid.
