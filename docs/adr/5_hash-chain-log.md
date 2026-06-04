# ADR-005: Hash-Chain Transaction Log

**Date**: 2025-01-01  
**Status**: Accepted  
**Updated**: 2026-06 (corrected hash size from 6 to 4 bytes, anchor from startTime to zeros)

## Context

The card must carry a local transaction log to support reconciliation when the terminal reconnects to the backend. The log must be tamper-evident: a fraudster who can write to the card (full attacker write access is assumed; see ADR-003) must not be able to silently delete, reorder, or modify past transactions in the log without detection.

Additionally, the card log must fit within the tight byte budget of NTAG215 (~492 bytes total). A log that is simply a list of flat entries with no integrity relationship between them would allow an attacker to replace individual entries without breaking the rest of the log.

## Decision

The transaction log uses a **hash chain**: each log entry contains a truncated SHA-256 hash that covers the content of the current entry plus the hash field of the previous entry. The chain is anchored with **4 zero bytes** as the initial `prevHash`, and the trailer `rootHash` (which is HMAC-protected) stores the final chain head.

**Chain structure:**

```
Initial anchor: prevHash = Uint8Array(4)  [4 zero bytes]
  └─ entry[0]: hash = SHA256(timestamp || amount || balanceAfter || flags || prevHash)[0:3]
       └─ entry[1]: hash = SHA256(timestamp || amount || balanceAfter || flags || entry[0].hash)[0:3]
            └─ entry[N]: hash = SHA256(...data... || entry[N-1].hash)[0:3]

Trailer rootHash = entry[last].hash (4 bytes, zero-padded to 6 bytes in trailer)
```

**Hash input (16 bytes):**
- bytes 0-3: `timestamp` (uint32, little-endian)
- bytes 4-6: `amount` (uint24, little-endian)
- bytes 7-10: `balanceAfter` (uint32, little-endian)
- byte 11: `flags` (uint8)
- bytes 12-15: `prevHash` (4 bytes)

- Hash fields are **4 bytes** (32 bits, truncated SHA-256). This is a practical size given the attacker cannot precompute chains without the session key (required to produce a valid HMAC over the trailer containing `rootHash`).
- The log is a **ring buffer**: when full (5 entries on NTAG215), the oldest entry is overwritten. The chain is recomputed from surviving entries on each write via `recomputeChainHashes`.
- Each entry is 16 bytes: 4B timestamp, 3B amount, 4B balanceAfter, 1B flags, 4B hash.

## Consequences

**Positive:**

- Modification of any log entry (amount, balance, type) invalidates all subsequent hashes in the chain. The reader detects tampering on any entry after the modified one.
- Deletion of a log entry breaks the chain at the deletion point and forward.
- Reordering entries breaks the chain because each entry's hash depends on the previous.
- Insertion of a forged entry is only possible if the attacker can also recompute all subsequent hashes - which requires knowing the session key to maintain a valid `rootHash` HMAC.

**Negative:**

- A truncated 6-byte hash has a birthday collision probability of approximately 2^{-24} for random guessing. An attacker without the session key cannot forge the `rootHash` binding anyway; the 6-byte truncation is a storage trade-off, not a security weakness in this context.
- The ring buffer model means old entries are overwritten when the log is full (7 entries on NTAG215). Long sessions with many transactions will lose the earliest entries before reconciliation unless the terminal uploads incrementally.
- The chain must be re-anchored on every ring-buffer wrap, which requires a trailer write (and thus an HMAC recompute) on every 7th transaction.

**Risks:**

- If a terminal fails to reconcile before the log wraps multiple times, unreconciled entries are permanently lost. Backend policy should enforce reconciliation frequency relative to the expected transaction rate per card.

## Alternatives Considered

| Option                                | Reason Rejected                                                                                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Flat log (no chain)**               | Each entry is independent. An attacker can replace any entry without affecting any other. Does not provide tamper evidence for individual entries.                                                                                                                       |
| **Full SHA-256 per entry (32 bytes)** | 32-byte hash fields would limit the log to 3 entries on NTAG215 (vs 7 with 6-byte truncation). Disproportionate storage cost for marginal security gain given the session-key binding.                                                                                   |
| **HMAC per entry**                    | Would require storing a separate HMAC key reference per entry, or using the same key for all entries. A single HMAC per entry is approximately the same size as the chain hash and does not provide chain-linkage (reordering and deletion would still be undetectable). |
| **Merkle tree**                       | More tamper-resistant for random-access log proof, but requires significantly more storage for intermediate nodes. Overkill for a sequential append-only log.                                                                                                            |
| **No on-card log (backend only)**     | Requires online connectivity per transaction to record the log. Incompatible with the offline-first requirement.                                                                                                                                                         |

## References

- System Design [§6 Log Chain Model](../system-design/6_log-chain-model.md)
- System Design [§14 Transaction Log Structure](../system-design/14_transaction-log-structure.md)
- Tech Specs [§14 Transaction Log Format](../tech-specs/14_transaction-log-format.md)
- Tech Specs [§5 Tamper Detection & Validation](../tech-specs/5_tamper-detection-validation.md)
