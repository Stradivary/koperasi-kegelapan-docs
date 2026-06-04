# 3. Cryptographic Controls

> ⚠️ This spec reflects the **code-frozen implementation** as of June 2026.

## Implemented algorithms

| Purpose                        | Algorithm        | Key / output size                                    | Implementation       |
| ------------------------------ | ---------------- | ---------------------------------------------------- | -------------------- |
| Card payload encryption        | AES-256-GCM      | 256-bit key, 128-bit tag, 96-bit nonce               | Web Crypto API       |
| Card payload authentication    | HMAC-SHA256      | 256-bit key; output truncated to **8 bytes**         | Web Crypto API       |
| Log chain hashing              | SHA-256          | 256-bit output; stored as first **4 bytes** per entry| Web Crypto API       |
| Key derivation (per-card)      | HKDF-SHA256      | Variable output (32 bytes for keys, 12 for nonce)    | Web Crypto API       |
| Key derivation (tenant/session)| HMAC-SHA256      | 256-bit output                                       | Node.js `crypto`     |
| Operator password hashing      | PBKDF2-SHA256    | 100,000 iterations, 32-byte output                   | Web Crypto API       |
| JWT signing                    | HMAC-SHA256      | Uses `SESSION_MASTER_KEY`                            | Custom implementation|
| Session grant signature        | HMAC-SHA256      | Signs with tenant key (base64url output)             | Node.js `crypto`     |
| HMAC constant-time comparison  | XOR-based        | Byte-by-byte XOR + accumulator                       | Custom implementation|

## Not implemented (from original aspirational spec)

| Feature                        | Status                                                        |
| ------------------------------ | ------------------------------------------------------------- |
| Argon2id password hashing      | NOT used. PBKDF2-SHA256 is the implementation.                |
| ECDSA device challenge signing | NOT used. Devices use fingerprint hash, not key pairs.        |
| WebAuthn / FIDO2               | NOT implemented.                                              |
| AES-256-GCM encrypted refresh  | NOT implemented. Refresh tokens stored unencrypted client-side.|
| OTP seed encryption            | NOT implemented. No MFA exists.                               |

---

## Nonce policy

The AES-GCM nonce for card writes is derived deterministically:

```
nonce = HKDF-SHA256(ikm=sessionKey, salt=cardId || counter, info="nonce", length=12)
```

- `counter` is the card write counter (uint64, little-endian 8 bytes), incremented before every encryption.
- The same `(sessionKey, cardId, counter)` triple is guaranteed unique per write (monotonic counter).
- The terminal increments the counter on every write via `payload.wallet.counter + 1n`.
- A counter rollback or stale counter is detected at sync push time (server rejects `tx.counter <= card.counter`).

---

## Key hierarchy (as implemented)

```
Cloudflare Workers Secret: SESSION_MASTER_KEY (UTF-8, truncated to 32 bytes)
  │
  ├── HMAC-SHA256(masterKey, "tenantId:keyVersion")
  │   └── Tenant Key (deterministic per tenant + version)
  │       │
  │       ├── HMAC-SHA256(tenantKey, "session-key")
  │       │   └── Session Key (deterministic, SHARED across all tenant devices)
  │       │       │
  │       │       ├── HKDF-SHA256(sessionKey, salt=cardId, info="enc", len=32) → AES-GCM key
  │       │       ├── HKDF-SHA256(sessionKey, salt=cardId, info="auth", len=32) → HMAC key
  │       │       └── HKDF-SHA256(sessionKey, salt=cardId||counter, info="nonce", len=12) → Nonce
  │       │
  │       └── HMAC-SHA256(tenantKey, JSON.stringify({keyVersion, expiresAt, allowedOps, accountId, deviceId}))
  │           └── Session Grant Signature (base64url)
  │
  └── signAccessToken(payload, masterKey) → JWT (HMAC-SHA256, 1h expiry)
```

**Key design choice**: Session keys are **deterministic and shared** across all devices in the same tenant at the same `keyVersion`. This is essential for offline cross-device card operations.

### Key storage

| Location                        | Stored material                         | Prohibited                               |
| ------------------------------- | --------------------------------------- | ---------------------------------------- |
| Cloudflare Workers Secrets      | `SESSION_MASTER_KEY`                    | −                                        |
| D1 database                     | Password hashes, refresh token hashes   | Plaintext passwords, raw tokens, keys    |
| Terminal process memory          | Session key, derived per-card keys      | Anything persisted across page reload    |
| Client IndexedDB                | Sync data, cursors, pending transactions| Session keys, master keys                |
| `localStorage`                  | Not used for sensitive data             | Any secrets                              |
| Card NFC payload                | Encrypted wallet state + HMAC           | Plaintext balance (v2+ always encrypted) |

### Rotation

- **Key version**: backend increments `keyVersion`. New grants use new version. Cards fail validation on key mismatch and must be re-encrypted at station.
- **Master key compromise**: emergency rotation of all key material. All tenants affected. All cards require re-keying.
- **Device compromise**: block device via superadmin → all sessions revoked → cannot sync or obtain new grants.

---

## Prohibited algorithms and practices

| Prohibited                  | Reason                                                             |
| --------------------------- | ------------------------------------------------------------------ |
| AES-CBC without MAC         | No authenticated encryption; malleable ciphertext                  |
| AES-ECB                     | Deterministic; identical blocks reveal patterns                    |
| MD5 / SHA-1 for integrity   | Collision vulnerabilities                                          |
| Static IVs / nonces         | Nonce reuse with AES-GCM allows plaintext recovery and tag forgery |
| Hardcoded symmetric keys    | Prevents rotation; trivially extracted                             |
| Plaintext secrets in logs   | Key material must never appear in log output                       |

---

## Cross-references

- Tech Specs §4: [Cryptography](../tech-specs/4_cryptography.md)
- Tech Specs §12: [Key Hierarchy & Session Grants](../tech-specs/12_key-hierarchy-session-grants.md)
- System Design §8: [Cryptographic Model](../system-design/8_crypto-model.md)
