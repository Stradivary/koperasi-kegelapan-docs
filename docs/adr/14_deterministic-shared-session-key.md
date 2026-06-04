# ADR-014: Deterministic Shared Session Key per Tenant

**Date**: 2026-06-01  
**Status**: Accepted

## Context

The offline NFC wallet requires that any terminal in a tenant can read and write cards produced by any other terminal in the same tenant. In a traditional per-device key model, each device gets a unique session key — but this means cards encrypted by Terminal A cannot be decrypted by Terminal B without a key exchange mechanism (which requires backend connectivity).

The system operates in an offline-first environment where terminals may not have connectivity for up to 24 hours. During this window, a member may check in at Gate A and then present their card at Terminal B. Terminal B must be able to decrypt the card that Gate A encrypted.

## Decision

Session keys are **deterministic and shared** across all devices within the same tenant at the same `keyVersion`.

**Derivation chain:**

```
masterKey (Cloudflare Workers secret)
  → tenantKey = HMAC-SHA256(masterKey, "tenantId:keyVersion")
    → sessionKey = HMAC-SHA256(tenantKey, "session-key")
```

All devices that request a session grant for the same tenant with the same `keyVersion` receive the **identical** `sessionKey`. This is by design.

Per-card keys are still unique (derived via HKDF from sessionKey + cardId), but the session key itself is shared.

## Consequences

**Positive:**

- Any terminal in the tenant can decrypt and re-encrypt any card from that tenant — essential for offline cross-device operation.
- No inter-device key exchange protocol needed — eliminates significant complexity.
- Key rotation is straightforward: increment `keyVersion`, issue new grants.
- Session grant issuance is a pure computation (HMAC derivation) — no database lookup or random generation needed.

**Negative:**

- A compromised session key exposes ALL cards in the tenant (not just one device's cards). The blast radius is per-tenant, not per-device.
- The session key in a grant is sensitive material — if a device is compromised, the attacker has the tenant session key for the remaining grant lifetime.
- Cannot selectively revoke a single device's ability to decrypt cards without rotating the entire tenant's key.

**Risks:**

- Device compromise: mitigated by device blocking (revokes sessions, prevents grant refresh) and short grant TTL (24h).
- Key extraction from browser memory: mitigated by not persisting the session key to any durable storage.
- The 24h grant window bounds the exposure of a leaked session key.

## Alternatives Considered

| Option                              | Reason Rejected                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Per-device unique session key**   | Cards from device A unreadable by device B offline. Requires online key exchange for cross-device use. |
| **Card-specific key sealed to device** | Same problem — other devices can't read the card without the sealing device's cooperation.           |
| **Ephemeral DH key agreement**      | Requires online rendezvous between devices. Incompatible with offline-first architecture.              |
| **Pre-distributed key table**       | Scales poorly with number of devices. Key distribution itself requires online operation.               |

## References

- System Design §12: [Key Trust Model](../system-design/12_key-trust-model.md)
- Tech Specs §12: [Key Hierarchy & Session Grants](../tech-specs/12_key-hierarchy-session-grants.md)
- `src/application/auth/sessionGrant.usecase.ts` — `issueSessionGrant()`
- `src/core/crypto/engine.ts` — HKDF-based per-card key derivation
