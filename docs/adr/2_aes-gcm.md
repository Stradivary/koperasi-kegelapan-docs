# ADR-002: AES-GCM as the Payload Encryption Cipher

**Date**: 2025-01-01  
**Status**: Accepted

## Context

The card payload (Zone A and Zone B) must be encrypted before writing to the NFC card. An attacker with a cheap NFC reader can read any NTAG card in seconds. Without encryption, the balance, identity, and session state are exposed in plaintext. The encrypted payload must also be authenticated - an attacker who cannot read the plaintext must also be unable to forge or modify the ciphertext without detection.

The encryption stack must run in a browser-based terminal application (Android Chrome) because Web NFC requires a browser context and cannot be used from a native Android app. The Web Crypto API is therefore the only available cryptographic runtime.

## Decision

The card payload is encrypted with **AES-256-GCM**.

- The AES key is a 32-byte per-card key derived from the terminal session key using HKDF-SHA256.
- The GCM nonce (12 bytes) is derived deterministically from the session key and the current write counter: `HKDF(sessionKey, cardId || counter, "nonce", 12)`. This eliminates nonce storage and prevents nonce reuse across writes.
- GCM provides both confidentiality and authenticated encryption (128-bit authentication tag) in a single pass.
- An additional HMAC-SHA256 is applied over the trailer fields and the full encrypted buffer to authenticate data that lives outside the encrypted payload (see [ADR notes on HMAC](#hmac-addendum)).

## Consequences

**Positive:**

- AES-GCM is natively supported by the Web Crypto API (`AES-GCM` algorithm name) on all target platforms (Android Chrome, desktop Chrome, Firefox, Safari).
- Single-pass AEAD: confidentiality and integrity in one operation, with no risk of miscomposing encrypt-then-MAC.
- Deterministic nonce derivation avoids the need for nonce storage on the card and prevents catastrophic nonce reuse.
- Hardware acceleration is available on all modern ARM CPUs (AES-NI equivalent on ARM Cortex-A).

**Negative:**

- GCM is fragile if the same nonce is ever reused with the same key; an attacker who observes two ciphertexts with the same (key, nonce) pair can recover the XOR of plaintexts and forge authentication tags. Deterministic nonce derivation from the counter mitigates this, but requires that the write counter is always incremented before encrypting.
- AES-GCM authentication covers only the ciphertext and any AAD passed to the cipher. Trailer fields written outside the encrypted payload are not covered unless explicitly included in AAD or protected by a separate HMAC (addressed by the HMAC addendum below).

**Risks:**

- If a terminal writes a new payload without incrementing the counter first, nonce reuse can occur. The write procedure must enforce counter-increment-before-encrypt.

## HMAC Addendum

The GCM authentication tag authenticates the ciphertext and any Additional Authenticated Data (AAD). The trailer fields (`rootHash`, `counter`, `activePtr`, `keyVersion`, `expiresAt`) are written outside the encrypted payload to allow fast read access without full decryption. An attacker could modify these fields without breaking the GCM tag unless they are separately authenticated.

An **HMAC-SHA256** (truncated to 8 bytes) is therefore computed over the full encrypted buffer bytes concatenated with all trailer fields. This ties the trailer to the specific ciphertext and prevents trailer-swap and activePtr-redirect attacks. See Tech Specs [§4 Cryptography](../tech-specs/4_cryptography.md) for the full HMAC input definition.

## Alternatives Considered

| Option                    | Reason Rejected                                                                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AES-CBC + HMAC-SHA256** | Two separate operations; correct MAC-then-Encrypt composition is error-prone. Requires careful padding. Web Crypto supports it, but AES-GCM is simpler and safer for this use case.                                                       |
| **AES-CBC alone**         | No integrity check; any modification to the ciphertext is undetectable. Unacceptable for a financial system.                                                                                                                              |
| **AES-CTR alone**         | Same integrity gap as AES-CBC. CTR without authentication cannot detect tampering.                                                                                                                                                        |
| **ChaCha20-Poly1305**     | Functionally equivalent to AES-GCM and would be the preferred choice in a native runtime (lower latency on devices without AES hardware). Rejected because it is **not available in the Web Crypto API** as of the current specification. |
| **RSA / EC encryption**   | Asymmetric encryption is not appropriate for bulk card payload encryption. Key sizes and ciphertext overhead are incompatible with the ≤492-byte card constraint.                                                                         |

## References

- System Design [§8 Cryptographic Model](../system-design/8_crypto-model.md)
- Tech Specs [§4 Cryptography](../tech-specs/4_cryptography.md)
- Tech Specs [§12 Key Hierarchy & Session Grants](../tech-specs/12_key-hierarchy-session-grants.md)
- [Web Crypto API - Supported Algorithms (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto)
