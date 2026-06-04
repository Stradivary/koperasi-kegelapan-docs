# ADR-015: IndexedDB Write Journal for NFC Operations

**Date**: 2026-06-01  
**Status**: Accepted

## Context

NFC write operations on NTAG215 cards are inherently unreliable. A member may pull their card away mid-write, resulting in an incomplete write. The A/B buffer strategy (ADR-001) ensures the card always has one valid buffer, but the terminal also needs to track pending operations to retry on the next tap.

Without a write journal, if the app crashes or the tab is closed between constructing the new payload and completing the NFC write, the transaction is lost — the card is unchanged but the terminal believes the operation was initiated.

## Decision

Use an **IndexedDB write journal** (write-ahead log) that persists the pending operation BEFORE the physical NFC write begins.

**Write flow:**

1. Compute the new card payload (debit, checkout, etc.)
2. **Persist journal entry** to IndexedDB with key `[tenantId, cardIdHex]` — includes the complete wire bytes and operation metadata
3. Issue the physical NFC write
4. Perform verification read
5. On success: delete journal entry, add to transaction outbox
6. On failure: journal entry remains — recovery on next tap

**Recovery flow (on card scan):**

1. After reading and validating the card, check for a pending journal entry for this card
2. If found and the card's counter matches the pre-write counter (write didn't land), retry the write
3. If found and the card's counter is already incremented (write did land but journal wasn't cleared), clear the journal and add to outbox

**Journal entry schema:**
- Composite key: `[tenantId, cardIdHex]` — one pending write per card at a time
- Fields: `wireBytes`, `operation`, `amount`, `preWriteCounter`, `timestamp`, `attempts`

## Consequences

**Positive:**

- No transaction is lost due to app crash, tab close, or NFC interruption
- Recovery is automatic on next card tap — no operator intervention needed
- Single pending write per card prevents conflicting concurrent operations
- The journal is tenant-scoped, maintaining isolation

**Negative:**

- Adds IndexedDB write latency to the critical path (before NFC write)
- Journal cleanup logic adds complexity to the scan flow
- If a card is never tapped again, the journal entry persists indefinitely (requires cleanup policy)

**Risks:**

- If the journal entry is written but IndexedDB is cleared (browser data wipe), the operation is lost. Acceptable: the card was not modified, so no financial state was changed.
- Concurrent tabs could create conflicting journals — mitigated by single pending write per card key.

## Alternatives Considered

| Option                        | Reason Rejected                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| **No journal (fire-and-forget)** | Transaction loss on NFC interruption or app crash. Unacceptable for financial operations.   |
| **In-memory only journal**    | Lost on tab close or crash — the primary failure scenarios we're protecting against.          |
| **Service Worker background retry** | Service Workers cannot access NFC hardware. Write must happen in foreground tab.         |

## References

- System Design §9: [Write Strategy](../system-design/9_write-strategy.md)
- Tech Specs §7: [Write & Update Strategy](../tech-specs/7_write-update-strategy.md)
- assumptions.md §5: NFC & Hardware
