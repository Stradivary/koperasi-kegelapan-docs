# 4. Cryptography

## Algorithms

| Purpose                | Algorithm                                     |
| ---------------------- | --------------------------------------------- |
| Payload encryption     | AES-256-GCM                                   |
| Payload authentication | HMAC-SHA256 (truncated to 8 bytes in trailer) |
| Key derivation         | HKDF-SHA256                                   |
| Log chain hash         | SHA-256 (truncated to 4 bytes per entry)      |

## Encryption

- The active buffer payload is encrypted with **AES-256-GCM**.
- The AES key is derived per-card using HKDF (see Key Derivation below).
- GCM provides both confidentiality and ciphertext integrity; a failed GCM tag check is treated as a tamper event.
- The GCM nonce (12 bytes) is derived deterministically from the card counter to avoid nonce reuse without requiring nonce storage: `nonce = HKDF(sessionKey, cardId || counter, "nonce", 12)`.

## Integrity

- An **HMAC-SHA256** is computed over the following fields in order:
  1. Full encrypted buffer bytes (216 bytes)
  2. `expiresAt`, `keyVersion`, `rootHash`, `counterBind` from the trailer
- The `activePtr` field is NOT included in the HMAC input (it is written last during the buffer flip).
- The first 8 bytes of the HMAC output are stored in the trailer `HMAC` field.
- Validation recomputes the HMAC on every read and compares it to the stored value.

## Key derivation

All per-card keys are derived from the session key using **HKDF-SHA256**:

```
encryptionKey = HKDF(sessionKey, salt=cardId, info="enc",  length=32)
authKey       = HKDF(sessionKey, salt=cardId, info="auth", length=32)
```

- `sessionKey`: 32-byte key issued by the backend in the session grant.
- `cardId`: 6-byte unique card identifier from the header block.
- `info`: ASCII string label that domain-separates encryption and authentication keys.

## Keys and rotation

- Session keys are valid for **1–24 hours**; the backend controls the exact duration.
- Each session grant carries a `keyVersion` field; the card stores the same value in the trailer.
- On read, the terminal checks `keyVersion` to select the correct session key before attempting decryption.
- If the stored `keyVersion` does not match any held grant, the terminal must request a fresh grant from the backend before proceeding.
- Key compromise triggers immediate revocation and re-issuance at the backend; affected cards require a re-keying write at the next online session.

## Security notes

- Never reuse a nonce with the same AES key. The counter-derived nonce must increment on every write.
- All key material must be treated as secrets in memory and cleared after use when the platform supports it.
- The backend master key must be stored in a hardware security module or equivalent protected storage.
