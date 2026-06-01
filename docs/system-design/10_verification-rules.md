# 10. Verification Rules

Every card read must re-verify the entire card state from scratch. No cached assumption about a previously valid read may be carried forward.

## Tamper conditions

A card is treated as tampered if any of the following fail:

- **Cryptographic integrity** - the authentication tag or HMAC over the payload does not match
- **Log chain integrity** - any entry in the transaction log chain is inconsistent with its predecessor
- **State consistency** - the balance, counter, or timestamp recorded in the wallet block is inconsistent with the log history
- **Counter or timestamp rollback** - the monotonic counter or last-write timestamp has moved backwards, indicating a replay or rollback attack

## Additional checks

- The session window must still be valid at read time.
- State transitions must conform to the card state machine; invalid transitions are treated as suspicious.
- Any field or flag combination that is undefined or contradictory is rejected.

## Response to a failed verification

- Do not write to the card.
- Escalate the card status to blocked if writable; report to the backend if not.
- Display a generic blocked message; do not expose cryptographic details.

> Exact ordered validation sequence with field-level checks: [Tech Specs §5 Tamper Detection & Validation](../tech-specs/5_tamper-detection-validation.md).
