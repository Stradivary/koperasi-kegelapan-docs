# 6. Log Chain Model

## Purpose

The log chain provides a tamper-evident record of all value changes on a card. Each entry is cryptographically linked to the entry before it, anchored at session start, so any modification to any entry - or its position in the sequence - breaks the chain and is detectable on the next read.

## Chaining model

- Each log entry includes a hash computed over its own data and the hash of the previous entry.
- The chain starts at session open time, providing an anchor that cannot be forged without knowing the session key.
- The trailer stores the hash of the most recent entry (the chain head). This binds the full log sequence to the HMAC-protected trailer.

## Security guarantees

- Modifying a single log entry invalidates its hash and every hash after it.
- Partial tampering is detectable - the chain does not need to be fully traversed to find inconsistency.
- The `rootHash` in the trailer ties the log chain to the overall card authentication.

> Exact hash function, field layout, and chain anchor computation: [Tech Specs §14 Transaction Log Format](../tech-specs/14_transaction-log-format.md) and [Tech Specs §5 Tamper Detection & Validation](../tech-specs/5_tamper-detection-validation.md).
