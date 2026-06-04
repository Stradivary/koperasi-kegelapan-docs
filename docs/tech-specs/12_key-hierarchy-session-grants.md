# 12. Key Hierarchy & Session Grants

## Key hierarchy

```
Backend Master Key (SESSION_MASTER_KEY, Cloudflare Workers secret, UTF-8 truncated to 32 bytes)
  │
  ├── HMAC-SHA256(masterKey, "tenantId:keyVersion")
  │   └── Tenant Key (deterministic per tenant + version)
  │       │
  │       ├── HMAC-SHA256(tenantKey, "session-key")
  │       │   └── Session Key (deterministic, SHARED across all tenant devices)
  │       │       │
  │       │       ├── HKDF-SHA256(sessionKey, salt=cardId, info="enc", len=32)
  │       │       │   └── Per-card AES-256-GCM Encryption Key
  │       │       │
  │       │       ├── HKDF-SHA256(sessionKey, salt=cardId, info="auth", len=32)
  │       │       │   └── Per-card HMAC-SHA256 Authentication Key
  │       │       │
  │       │       └── HKDF-SHA256(sessionKey, salt=cardId||counter, info="nonce", len=12)
  │       │           └── Per-write AES-GCM Nonce
  │       │
  │       └── HMAC-SHA256(tenantKey, JSON.stringify({keyVersion, expiresAt, allowedOps, accountId, deviceId}))
  │           └── Session Grant Signature (base64url)
  │
  └── signAccessToken(payload, masterKey)
      └── JWT Access Token (HMAC-SHA256 signed, 1h expiry)
```

**Critical design choice:** The session key is **deterministic and shared**. All devices in the same tenant with the same `keyVersion` derive the exact same session key. This enables any terminal to decrypt and re-encrypt cards written by any other terminal in the same tenant, without requiring inter-device key exchange. This is essential for offline operation.

## Session grants

A session grant is a signed JSON object issued by `GET /api/session-grant`. It provides a terminal with everything needed to perform card operations offline.

| Field        | Type     | Description                                                    |
| ------------ | -------- | -------------------------------------------------------------- |
| `keyVersion` | number   | Identifies the key set for deriving card keys (default: 1)     |
| `sessionKey` | string   | Base64-encoded 32-byte session key                             |
| `expiresAt`  | number   | Unix timestamp; grant is invalid after this time (24h from issuance) |
| `allowedOps` | string[] | Operations the terminal may perform (e.g., `["read", "debit", "checkout"]`) |
| `tenantId`   | string   | Tenant this grant is scoped to                                 |
| `accountId`  | string   | Authenticated operator's account ID (or "scout-anonymous")     |
| `deviceId`   | string   | Device fingerprint hash (or query param)                       |
| `signature`  | string   | Base64url HMAC-SHA256 signature over `{keyVersion, expiresAt, allowedOps, accountId, deviceId}` |

### Issuance rules

- **Authenticated roles** (admin, station, gate, terminal): require a valid JWT. The token's `tenantId` and `role` are used. Requesting a grant for a different tenant returns 403.
- **Scout (anonymous)**: no authentication required. The endpoint returns a read-only grant with `allowedOps: ["read"]` and `accountId: "scout-anonymous"`.
- **Grant lifetime**: `SESSION_KEY_LIFETIME_SECONDS = 86,400` (24 hours from `Date.now()`).

### Client-side usage

On the client, the session grant is stored in memory and converted to a `SessionGrant` object with binary fields:

```typescript
interface SessionGrant {
  keyVersion: number;
  sessionKey: Uint8Array;    // 32 bytes, decoded from base64
  expiresAt: number;
  allowedOps: string[];
  signature: Uint8Array;
  tenantId: string;
  accountId: string;
  deviceId: string;
}
```

## Key derivation (client-side, Web Crypto)

Per-card keys are derived from the session key and card identity using HKDF-SHA256 via the Web Crypto API:

```
encryptionKey = HKDF-SHA256(ikm=sessionKey, salt=cardId, info="enc",  length=32)  → AES-GCM key
authKey       = HKDF-SHA256(ikm=sessionKey, salt=cardId, info="auth", length=32)  → HMAC key
nonce         = HKDF-SHA256(ikm=sessionKey, salt=cardId||counter, info="nonce", length=12) → AES-GCM IV
```

- `cardId` is the 6-byte identifier from the card header block.
- `counter` is the 8-byte write counter (little-endian uint64); binding it to nonce derivation prevents nonce reuse across writes.
- The `info` strings domain-separate the three derived values.

## Key version and rotation

- `keyVersion` is stored on the card trailer and in the session grant.
- During validation, the card's `keyVersion` is compared to the grant's `keyVersion`. A mismatch results in a hard reject (not treated as tamper — it indicates a key rotation gap).
- Rotation procedure: the backend increments the active `keyVersion`. Newly issued grants use the new version. Cards will fail validation against the old grant and must be re-encrypted at a station with the new key.
- During a migration window, the backend should issue grants for both old and new key versions to avoid mass card invalidation.

## Compromise response

| Scenario               | Response                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| Session key exposed    | Rotate `keyVersion` for the affected tenant. All existing grants become stale. All devices must re-authenticate and obtain new grants. Cards remain readable but must be re-encrypted at a station. |
| Master key compromised | Emergency rotation of all key material. All tenants affected. All cards require re-keying at a station. |
| Device compromised     | Block the device via superadmin API. All sessions revoked. Device cannot sync or obtain new grants. |
| JWT token stolen       | Token expires in 1 hour. Refresh token is device-bound and rotated on each use.              |
