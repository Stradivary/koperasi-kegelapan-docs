# 5. Tamper Detection & Validation

## Validation sequence

Run checks in this order on every card read. Stop and mark tampered on the first failure.

0. **Uninitialised card pre-check** — if the `magic` field is all `0x00` or all `0xFF`, treat the card as uninitialised (not tampered) and halt. Display "Unactivated card" to the user. Do not proceed to step 1. See [System Design §18](../system-design/18_card-initialisation-state.md).
1. **Magic and version check** — reject the payload if `magic` does not match the expected value or `version` is unsupported.
2. **Key version lookup** — reject if no session grant is available for the card's `keyVersion`.
3. **HMAC verification** — recompute HMAC over encrypted buffer and trailer fields; reject on mismatch.
4. **AES-GCM decryption** — attempt decryption; reject if the GCM authentication tag fails.
5. **Counter check** — reject if the on-card `counter` is less than or equal to the last known counter for this card (rollback).
6. **Timestamp check** — reject if `lastTimestamp` is significantly in the future (beyond clock drift allowance).
7. **Status check** — if `status` is any blocked value, deny writes; allow read-only operations.
8. **Balance consistency** — reject if `balance ≠ lastBalance` when no transaction was expected, or if `balance` does not match the `balanceAfter` of the most recent log entry.
9. **Log chain verification** — recompute each entry hash from `session.startTime`; reject if any hash mismatches.
10. **Root hash verification** — recompute `rootHash` from the log chain head; reject if it does not match the trailer value.

## Failure conditions

Mark a card as tampered when any of the following are true:

- HMAC mismatch
- AES-GCM decryption failure
- `counter` rollback detected
- `lastTimestamp` rollback detected
- `balance` inconsistency with `lastBalance` or first log entry
- Log chain hash mismatch at any position
- `rootHash` mismatch
- Unsupported `magic` or `version`

## Response to tamper detection

- **Do not write to the card.**
- Set the card status to `BLOCKED_TAMPER` (code `1`) on the next successful authenticated write if the card is still operable.
- Log the event with tamper type, `cardId`, `counter`, and `terminalId` for backend reconciliation.
- Display a generic blocked message to the user; do not expose cryptographic details.
- If the card cannot be written (e.g., read fails completely), report the event to the backend immediately.

## Log chain

- Each log entry includes a 4-byte truncated hash field.
- `hash[n] = SHA256(timestamp || amount || balanceAfter || flags || hash[n-1])[0..3]`
- The chain is anchored at `session.startTime`: `hash[0]` uses `startTime` bytes (4 bytes, little-endian) as the initial previous value.
- The trailer `rootHash` stores the hash of the most recent log entry (the chain head).
- An all-zero hash field serves as the empty-slot sentinel during decoding.

## Validation guarantees

- Any single-bit modification to a log entry invalidates the chain from that point forward.
- `rootHash` in the trailer ties the entire log sequence to current card state.
- Trailer HMAC binds the root hash, counter, active pointer, and metadata, preventing selective replay of a valid historical trailer with a modified payload.
