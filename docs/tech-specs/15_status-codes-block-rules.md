# 15. Status Codes & Block Rules

## Status codes

| Code | Name              | Description                                         |
| ---- | ----------------- | --------------------------------------------------- |
| `0`  | `ACTIVE`          | Card is in normal operation                         |
| `1`  | `BLOCKED_TAMPER`  | Cryptographic or chain integrity check failed       |
| `2`  | `BLOCKED_FRAUD`   | Suspicious behavior detected by terminal or backend |
| `3`  | `BLOCKED_EXPIRED` | Card or session has passed its expiry date          |
| `4`  | `BLOCKED_ADMIN`   | Manually decommissioned by an operator              |

The `status` field lives in the Identity Block of the card payload (see [§3](3_card-storage-model.md)).

## Blocking logic

- **BLOCKED_TAMPER**: set automatically when any tamper detection check fails (see [§5](5_tamper-detection-validation.md)). The terminal sets this status on the next authenticated write if the card is still writable; if not, it reports the event to the backend.
- **BLOCKED_FRAUD**: set when the terminal or backend detects suspicious patterns (e.g., multiple rapid debit attempts, counter anomalies, or backend-flagged transactions).
- **BLOCKED_EXPIRED**: set when `expiresAt` in the trailer has passed. The terminal enforces this on read; the backend enforces it on reconciliation.
- **BLOCKED_ADMIN**: written by a station terminal acting on a backend instruction. Used for lost/stolen cards or manual decommissioning.

## Status transitions

| From        | To                | Trigger                 | Who                 |
| ----------- | ----------------- | ----------------------- | ------------------- |
| `ACTIVE`    | `BLOCKED_TAMPER`  | Integrity check failure | Terminal (on write) |
| `ACTIVE`    | `BLOCKED_FRAUD`   | Fraud signal            | Terminal or backend |
| `ACTIVE`    | `BLOCKED_EXPIRED` | `expiresAt` passed      | Terminal            |
| `ACTIVE`    | `BLOCKED_ADMIN`   | Operator instruction    | Station             |
| Any blocked | `ACTIVE`          | Re-issuance             | Station only        |

Blocked cards may not transition to `ACTIVE` in the field. Re-activation requires a physical station re-issuance.

## Read-only constraint

- Blocked cards allow status and log **read** operations.
- **No balance changes** are allowed while blocked.
- The terminal must check status before any write and abort if blocked.
- Displaying `Card blocked` to the user is sufficient; the specific block reason should not be shown.

## Unblocking procedure

1. User presents the card at a station.
2. Station operator verifies identity and confirms with the backend that unblock is authorized.
3. Backend marks the card as clearable and issues a station session grant with `admin` permission.
4. Station calls `applyResetState(payload, nowSeconds)` which: sets `status = ACTIVE`, `state = IDLE`, zeroes session fields, increments counter, and adds an `ADMIN` log entry.
5. Station logs the re-issuance event to the backend audit trail via sync push.

Note: `BLOCKED_TAMPER` and `BLOCKED_FRAUD` require backend authorization before re-issuance. `BLOCKED_ADMIN` may be re-issued after operator confirmation. `BLOCKED_EXPIRED` can be renewed automatically if the user's account is still valid.

## Writing block status to card

When the local IndexedDB record indicates a card is blocked (e.g., blocked by admin via server sync) but the physical on-card status is still `ACTIVE`, the system uses `applyBlockStatus(payload, blockedStatus, nowSeconds)` to write the block to the physical card. This ensures offline enforcement:

1. Local DB card record shows blocked status (received via sync pull).
2. On next card tap, `enforceBlockOnCheckin`/`enforceBlockOnCheckout` detects the mismatch.
3. The app calls `applyBlockStatus` to set the on-card `identity.status` to the blocked value.
4. The counter is incremented and an `ADMIN` log entry is added to maintain chain integrity.
5. After this write, all terminals (even fully offline ones) will respect the block.

## Dual-source block enforcement

Block enforcement checks TWO sources before allowing any write operation:

1. **On-card status** (`payload.identity.status`) — authoritative, works fully offline
2. **Local IndexedDB card record** (`cards.status`) — updated via sync pull from server

Either source indicating a blocked status → operation rejected. This provides defense-in-depth: even if the physical card hasn't been updated yet, the local DB from sync pull provides early blocking.
