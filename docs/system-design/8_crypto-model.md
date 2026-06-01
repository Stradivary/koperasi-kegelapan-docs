# 8. Cryptographic Model

## Encryption - AES-GCM

The payload buffer (Zones A/B) is encrypted with **AES-256-GCM** before writing to the card.

**What AES-GCM gives us:**

- **Confidentiality** - the plaintext balance, counter, and identity fields are not readable without the key.
- **Authenticated encryption** - GCM appends a 128-bit authentication tag to the ciphertext. Any modification to the ciphertext, even a single bit, causes decryption to fail. This means AES-GCM provides both encryption _and_ integrity in a single operation.
- **Nonce binding** - each encryption uses a unique nonce derived from the session key and the current write counter. The nonce is not reused across writes, preventing multi-message attacks.

**Why AES-GCM over alternatives:**

| Scheme                  | Confidentiality | Integrity                               | Notes                                                                                  |
| ----------------------- | --------------- | --------------------------------------- | -------------------------------------------------------------------------------------- |
| **AES-GCM** (chosen)    | ✅              | ✅ Built-in auth tag                    | Single-pass; natively supported by Web Crypto API                                      |
| AES-CBC + separate HMAC | ✅              | ✅ Requires MAC-then-Encrypt discipline | Two operations; correct composition is error-prone                                     |
| AES-CBC alone           | ✅              | ❌ No integrity                         | Modifications undetectable; not acceptable                                             |
| AES-CTR alone           | ✅              | ❌ No integrity                         | Same problem as CBC                                                                    |
| ChaCha20-Poly1305       | ✅              | ✅ Built-in auth tag                    | Functionally equivalent to AES-GCM; not available in Web Crypto API as of current spec |

**Web Crypto API availability** is the deciding constraint: the terminal runs in a browser. `AES-GCM` is the only AEAD cipher mandated by the Web Crypto spec and available in all target environments (Android Chrome). ChaCha20-Poly1305 would be a viable alternative in a native runtime.

## Integrity - HMAC-SHA256

Despite AES-GCM having its own authentication tag, we apply an **additional HMAC-SHA256** over the trailer fields, and we include the encrypted ciphertext (not the plaintext) as part of the HMAC input.

**Why HMAC in addition to the GCM tag?**

The GCM tag authenticates only the ciphertext and any Additional Authenticated Data (AAD) passed to the cipher. The trailer fields (`rootHash`, `counter`, `activePtr`, `keyVersion`, `expiresAt`) are written _outside_ the encrypted payload - they must be readable without decryption (e.g. for a fast key-version check before attempting decryption). If the trailer were not separately authenticated, an attacker could:

- Replace `activePtr` to redirect the reader to a different buffer without breaking the GCM tag
- Swap `keyVersion` to force a key lookup that fails, causing a denial-of-service
- Modify `expiresAt` to extend or expire a session without touching the encrypted payload

The HMAC ties all of these fields together with a single authentication code that must be verified before any trailer field is trusted.

**What HMAC covers:** the full trailer block (all fields from `expiresAt` through `activePtr`) plus the full encrypted buffer bytes. This means the HMAC binds the trailer to one specific buffer - you cannot swap a valid trailer onto a different payload.

## Key model

- Session-based keys are valid for a short window (1–24 hours) and are issued per terminal by the backend.
- Per-card encryption and HMAC keys are derived from the session key and card ID using HKDF-SHA256. They are never stored or transmitted; they are re-derived on each use.
- Keys are versioned. `keyVersion` on the card tells the terminal which key set to use for derivation.
- Backend manages key issuance, rotation, and compatibility. See [§12 Key Trust Model](12_key-trust-model.md) and [Tech Specs §12](../tech-specs/12_key-hierarchy-session-grants.md) for the full key hierarchy.
