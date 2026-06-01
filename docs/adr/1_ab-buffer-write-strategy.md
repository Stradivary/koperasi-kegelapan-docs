# ADR-001: A/B Buffer Write Strategy

**Date**: 2025-01-01  
**Status**: Accepted

## Context

NFC cards (NTAG215, NTAG216) have no hardware write-atomicity guarantee. A write to the card may be interrupted mid-way by the card leaving the RF field - due to user movement, RF interference, or a partial write timeout. If the card payload is stored in a single contiguous region, an interrupted write leaves the card in an undefined state: partially overwritten with new data and partially containing old data. Neither the new state nor the old state is intact, and neither can be verified.

The system must guarantee that the card is always in a recoverable state after any interrupted write. This is non-negotiable because the card is the authoritative source of truth for the member's balance.

## Decision

The card payload uses two mirrored buffers - Zone A and Zone B - with a `activePtr` field in the trailer that identifies which buffer holds the current valid state.

**Write procedure:**

1. Write the new payload to the _inactive_ buffer (the one not currently pointed to by `activePtr`).
2. Verify the written data is correct.
3. Flip `activePtr` in the trailer to point to the newly written buffer.

This is an **atomic pointer flip**: the commit point is a single-byte (or single-field) write of `activePtr`. If an interruption occurs before step 3, the old buffer (still pointed to by `activePtr`) is untouched and valid. If an interruption occurs during step 3, the trailer HMAC will be invalid, and the reader will detect the corrupt state and fall back to the known-good buffer.

## Consequences

**Positive:**

- The card always has one intact, verified buffer. Recovery is always possible.
- An interrupted write never permanently corrupts the card state.
- The reader can always fall back to the previously valid buffer on any write failure.
- The commit boundary is well-defined: `activePtr` flip is the point of no return.

**Negative:**

- Two full buffers must be maintained, doubling the storage cost of the card payload.
- On NTAG215 (492 bytes usable), this approximately halves the space available for each buffer.
- Each write operation requires two passes: one write to the inactive buffer, one write to flip `activePtr`.
- Slightly more complex read logic: the reader must check `activePtr` and verify the pointed-to buffer before use.

**Risks:**

- If `activePtr` is valid but the pointed-to buffer is corrupt (e.g., silent NFC bit-flip), the HMAC will catch it, but the card will then be in an unrecoverable state unless the inactive buffer is also valid.
- The pointer flip itself is a single write operation. If the trailer block spans a page boundary and NFC writes are page-aligned, the flip may touch two pages. Implementation must ensure `activePtr` is written in a single NFC page write.

## Alternatives Considered

| Option                                     | Reason Rejected                                                                                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single buffer with write counter**       | A single buffer with a counter cannot distinguish a partially written state from a valid new state. An interrupted write leaves the card unverifiable.            |
| **Journaling / commit log on card**        | Requires significantly more card storage to hold a journal alongside the payload. Exceeds NTAG215 capacity constraints and complicates the read path.             |
| **No atomic write (accept data loss)**     | Unacceptable: the balance on the card is the source of truth in offline mode. Losing or corrupting it means financial data is gone.                               |
| **Larger card (more storage for journal)** | Hardware sourcing is constrained; NTAG215 was selected as the production baseline (see ADR-003). The A/B strategy solves the problem within existing constraints. |

## References

- System Design [§9 Write Strategy](../system-design/9_write-strategy.md)
- System Design [§5 Data Layout](../system-design/5_data-layout.md)
- Tech Specs [§7 Write & Update Strategy](../tech-specs/7_write-update-strategy.md)
