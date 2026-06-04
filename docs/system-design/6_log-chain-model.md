# 6. Log Chain Model

## Purpose

The log chain provides a tamper-evident record of all value changes on a card. Each entry is cryptographically linked to the entry before it, anchored at session start, so any modification to any entry - or its position in the sequence - breaks the chain and is detectable on the next read.

## Chaining model

- Each log entry includes a 4-byte hash computed over its own data fields and the hash of the previous entry (truncated SHA-256).
- The chain starts with **4 zero bytes** as the initial `prevHash` anchor. This provides a fixed starting point for chain validation.
- The trailer stores the hash of the most recent entry (the chain head) in the `rootHash` field (6 bytes, zero-padded). This binds the full log sequence to the HMAC-protected trailer.

## Security guarantees

- Modifying a single log entry invalidates its hash and every hash after it.
- Partial tampering is detectable - the chain does not need to be fully traversed to find inconsistency.
- The `rootHash` in the trailer ties the log chain to the overall card authentication.

> Exact hash function, field layout, and chain anchor computation: [Tech Specs §14 Transaction Log Format](../tech-specs/14_transaction-log-format.md) and [Tech Specs §5 Tamper Detection & Validation](../tech-specs/5_tamper-detection-validation.md).
