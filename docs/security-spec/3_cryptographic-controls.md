# 3. Cryptographic Controls

## Approved algorithms

| Purpose                        | Algorithm                 | Key / output size                                 |
| ------------------------------ | ------------------------- | ------------------------------------------------- |
| Card payload encryption        | AES-256-GCM               | 256-bit key, 128-bit tag, 96-bit nonce            |
| Card payload authentication    | HMAC-SHA256               | 256-bit key; trailer stores first 8 bytes         |
| Log chain hashing              | SHA-256                   | 256-bit output; stored as first 6 bytes per entry |
| Key derivation                 | HKDF-SHA256               | Variable output length                            |
| Operator password hashing      | Argon2id                  | Memory ≥ 64 MiB, iterations ≥ 3, parallelism ≥ 1  |
| OTP seed encryption            | AES-256-GCM               | Server-side at rest                               |
| Device challenge signing       | ECDSA P-256               | 256-bit key; SHA-256 digest                       |
| Refresh token storage (client) | AES-256-GCM via WebCrypto | Non-extractable `CryptoKey`                       |

## Prohibited algorithms and practices

| Prohibited                  | Reason                                                             |
| --------------------------- | ------------------------------------------------------------------ |
| AES-CBC without MAC         | No authenticated encryption; malleable ciphertext                  |
| AES-ECB                     | Deterministic; identical blocks reveal patterns                    |
| MD5 / SHA-1 for integrity   | Collision vulnerabilities                                          |
| PBKDF2 for password hashing | Insufficient resistance to GPU/ASIC cracking                       |
| bcrypt for password hashing | Limited to 72 bytes; no GPU-resistance advantage over Argon2id     |
| Static IVs / nonces         | Nonce reuse with AES-GCM allows plaintext recovery and tag forgery |
| Hardcoded symmetric keys    | Prevents rotation; trivially extracted                             |
| RSA key size < 2048 bits    | Insufficient margin for key agreement or signing                   |

---

## Nonce policy

The AES-GCM nonce for card writes is derived deterministically:

```
nonce = HKDF-SHA256(ikm=sessionKey, salt=cardId || counter, info="nonce", length=12)
```

- `counter` is the card write counter, incremented before every encryption.
- The same `(sessionKey, cardId, counter)` triple must never be used twice.
- The terminal must verify the on-card counter strictly exceeds the last written value before constructing a new nonce.
- A counter rollback attempt must abort the write and escalate to tamper status.

---

## Key hierarchy and lifecycle

```
HSM / Secrets Manager
  └─ Backend Master Key
       └─ Tenant Signing Key  (per tenant, rotated annually)
            └─ Session Key     (per grant, 1–24 h TTL)
                 └─ Card Encryption Key  (HKDF per card; never transmitted)
                 └─ Card Auth (HMAC) Key (HKDF per card; never transmitted)
```

### Rotation schedule

| Key                | Rotation trigger            | Rotation period                   |
| ------------------ | --------------------------- | --------------------------------- |
| Backend Master Key | Compromise or scheduled     | Annual minimum                    |
| Tenant Signing Key | Compromise or scheduled     | Annual minimum                    |
| Session Key        | Expiry or compromise        | 1–24 hours (backend-controlled)   |
| Per-card keys      | Session key rotation        | Derived; rotate with session key  |
| Device key pair    | Device compromise or annual | Annual or on-demand               |
| Operator password  | Compromise or policy        | Minimum 90 days; forced on breach |
| OTP seed           | Compromise or re-enrollment | On demand                         |

### Revocation

- **Session key**: the backend removes the grant from the active grant store; all terminals using this grant must re-authenticate.
- **Device key**: mark device as `suspended` in `devices`; all sessions for that device are revoked.
- **Master key compromise**: emergency rotation; all cards require re-keying at station on next visit. ADR required.

---

## Key storage rules

| Location                             | Allowed material                                    | Prohibited material              |
| ------------------------------------ | --------------------------------------------------- | -------------------------------- |
| HSM                                  | Master key, tenant signing key                      | Nothing else                     |
| Backend secrets manager (Vault / KV) | Session key seeds, OTP seeds (encrypted)            | Plaintext card data, PII         |
| Terminal process memory              | Session key, derived per-card keys (ephemeral)      | Anything persisted across reload |
| Device IndexedDB                     | Encrypted refresh token blob                        | Plaintext tokens, session keys   |
| Client `localStorage`                | Nothing sensitive                                   | -                                |
| Card binary payload                  | Encrypted wallet state                              | Plaintext balance, keys          |
| Logs                                 | No key material, no PII beyond operator identifiers | Any secret value                 |

---

## Cryptographic validation on card read

The terminal must always run the full sequence from [Tech Specs §5](../tech-specs/5_tamper-detection-validation.md). Partial validation is not permitted. Skipping any step is treated as a security failure and must be surfaced as a code defect, not a runtime exception.

---

## Cross-references

- Tech Specs §4: [Cryptography](../tech-specs/4_cryptography.md)
- Tech Specs §12: [Key Hierarchy & Session Grants](../tech-specs/12_key-hierarchy-session-grants.md)
- ADR §2: [AES-GCM](../adr/2_aes-gcm.md)
