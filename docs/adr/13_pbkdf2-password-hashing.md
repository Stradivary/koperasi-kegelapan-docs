# ADR-013: PBKDF2-SHA256 for Password Hashing

**Date**: 2026-06-01  
**Status**: Accepted

## Context

Operator accounts require password hashing for authentication. The hash must be verifiable both server-side (Cloudflare Workers) and optionally client-side (for local-only tenant mode). The chosen algorithm must work within Cloudflare Workers' CPU time limits (max 50ms wall-clock for free tier, ~30ms for crypto operations).

Argon2id is the OWASP-recommended algorithm for password hashing. However, Argon2id requires a WebAssembly implementation in Cloudflare Workers (no native support) and its memory-hard parameters (64 MiB minimum) exceed Workers' memory constraints. The alternative Argon2id parameters that fit Workers would sacrifice the memory-hardness that makes Argon2id preferable over simpler algorithms.

## Decision

Use **PBKDF2-SHA256** with **100,000 iterations** and a random salt for all password hashing.

- Server-side: uses Web Crypto API `deriveBits` with PBKDF2 algorithm (natively supported in Cloudflare Workers).
- Client-side: same Web Crypto API, enabling local password verification for offline-only tenants.
- Storage format: `pbkdf2$<saltHex>$<hashHex>` (server-generated) or `<iterations>:<saltHex>:<hashHex>` (client-generated).
- Both formats are supported during verification via `verifyPassword()` in the auth route.
- Constant-time comparison is used (XOR-based byte comparison) to prevent timing attacks.

Cloudflare Workers limit PBKDF2 iterations to 100,000 maximum — this is the hardcoded value used.

## Consequences

**Positive:**

- Native Web Crypto API support in both Workers and browser — no WASM or polyfills needed.
- 100,000 iterations provides reasonable brute-force resistance for the operational context.
- Same algorithm works identically on client and server — important for local-only tenant mode.
- Fits within Cloudflare Workers CPU/memory constraints.

**Negative:**

- PBKDF2 is not memory-hard — GPU/ASIC attacks are more efficient than against Argon2id.
- 100,000 iterations is below OWASP's recommended 600,000 for PBKDF2-SHA256.
- No upgrade path to Argon2id without re-hashing passwords on next login.

**Risks:**

- If credential databases are breached, PBKDF2 hashes are more efficiently cracked than Argon2id. Mitigated by: rate limiting on auth endpoints, short-lived access tokens, and the relatively low-value target (koperasi operator accounts, not financial institution credentials).

## Alternatives Considered

| Option                     | Reason Rejected                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| **Argon2id (WASM)**        | Workers memory limits prevent meaningful memory-hard parameters. WASM adds deploy complexity. |
| **bcrypt**                  | Limited to 72 bytes input. Not natively available in Web Crypto API.                          |
| **scrypt**                  | Not available in Web Crypto API. Would require WASM.                                         |
| **PBKDF2 with 600k iter** | Exceeds Cloudflare Workers' 100,000 iteration cap.                                           |

## References

- Security Spec §3: [Cryptographic Controls](../security-spec/3_cryptographic-controls.md)
- API Spec §2: [Authentication](../api-spec/2_auth.md)
- `api/src/routes/auth.ts` — `pbkdf2()` and `verifyPassword()` implementation
