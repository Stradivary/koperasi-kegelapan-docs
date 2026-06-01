# 11. Card Status Enforcement

## Status vs State - what is the difference?

This system uses two orthogonal fields on the card that can look similar but mean very different things:

| Field    | Where stored           | What it tracks                                                      | Values                                                                |
| -------- | ---------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `state`  | Wallet + Runtime Block | **Session lifecycle** - where is the card in a workflow right now?  | IDLE, CHECKED_IN, TERMINAL_OPERATION, CHECKED_OUT                     |
| `status` | Identity Block         | **Card health / trustworthiness** - can the card be trusted at all? | ACTIVE, BLOCKED_TAMPER, BLOCKED_FRAUD, BLOCKED_EXPIRED, BLOCKED_ADMIN |

A card can be `ACTIVE` (healthy) and `CHECKED_IN` (in a session) - that is normal. A card can also be `BLOCKED_TAMPER` (untrusted) and `IDLE` (no session). **Status and state are independent.** A blocked card can be in any state; the block overrides all session logic.

Enforcement order on every read:

1. Validate cryptographic integrity (HMAC, AES-GCM, log chain)
2. **Check `status` - if blocked, deny writes and stop**
3. Check `state` - enforce session rules for the current operation

## Status values

| Code | Name              | Description                                          |
| ---- | ----------------- | ---------------------------------------------------- |
| `0`  | `ACTIVE`          | Card is in normal operation                          |
| `1`  | `BLOCKED_TAMPER`  | Cryptographic or chain integrity check failed        |
| `2`  | `BLOCKED_FRAUD`   | Suspicious behaviour detected by terminal or backend |
| `3`  | `BLOCKED_EXPIRED` | Card or session has passed its expiry date           |
| `4`  | `BLOCKED_ADMIN`   | Manually decommissioned by a station operator        |

> See [Tech Specs §15 Status Codes & Block Rules](../tech-specs/15_status-codes-block-rules.md) for blocking logic and re-issuance procedures.

## Behaviour

- Cards with status codes 1–4 are treated as read-only. No balance changes, no state transitions.
- A blocked card cannot be recovered on-card. Reissue at a Station is required.

## Block and release scenario

The following describes the end-to-end journey for a member whose card is blocked.

**Trigger**: a terminal detects an HMAC mismatch while reading the card during a debit attempt.

**What happens automatically:**

1. The terminal does not write to the card.
2. The terminal escalates the card to `BLOCKED_TAMPER` on the next authenticated write (if the card is still writable). If not writable, it sends a `/api/terminal-report` event to the backend with `eventType: "tamper"`.
3. The backend sets the card's backend record to `BLOCKED_TAMPER` and logs the event.
4. The terminal displays "Card blocked - please visit a service point."

**Member journey to release:**

1. Member brings the card to a **Station** terminal.
2. Station operator queries the backend for the card's block reason and history.
3. Operator verifies the member's identity and confirms no fraud signal.
4. Operator requests a reissue authorisation from the backend (`POST /api/cards/:cardId/reissue`). For `BLOCKED_TAMPER`, the backend requires explicit authorisation (not automatic).
5. Backend issues a station session grant with `reissue` in `allowedOps`.
6. Station app re-writes the full card payload: `status = ACTIVE`, new `counter`, current `keyVersion`, zeroed wallet state.
7. Station logs the reissue event to the backend audit trail.
8. Member's card is now active again with a zero balance. Any remaining balance from before the block must be restored by the operator via a top-up after review.

**For `BLOCKED_EXPIRED`**: the flow is the same but backend authorisation is not required - the Station can renew an expired card automatically if the member's account is still active.

**For `BLOCKED_ADMIN`** (lost/stolen): the card is permanently retired. A new physical card is issued and registered as a separate card. The old `cardId` remains blocked in the backend permanently.

## Enforcement rules

- `status` is checked on every read, before any session or state logic.
- Any tampering detection must escalate `status` to `BLOCKED_TAMPER`.
- Expired cards (`BLOCKED_EXPIRED`) must be rejected for all financial operations.
- Admin-blocked cards (`BLOCKED_ADMIN`) are set by a Station acting on a backend instruction.
