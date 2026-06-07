# 6. State Machine & Session Rules

## Valid states

| State               | Code | Description                                                  |
| ------------------- | ---- | ------------------------------------------------------------ |
| `IDLE`              | `0`  | Card is issued but no session is open                        |
| `CHECKED_IN`        | `1`  | Gate has opened a session; terminal operations are permitted |
| `STATION_OPERATION` | `2`  | A terminal is actively processing a multi-step operation     |
| `CHECKED_OUT`       | `3`  | Session has been closed by a gate checkout or force checkout |

> **Note**: `BLOCKED` is a **status**, not a state. Status and state are independent dimensions stored in separate card fields. A blocked card can be in any state; the `status` field overrides all session logic. See [§15 Status Codes & Block Rules](15_status-codes-block-rules.md) for status codes and block enforcement.

## State transitions

| From                | To                  | Trigger          | Condition                                                    |
| ------------------- | ------------------- | ---------------- | ------------------------------------------------------------ |
| `IDLE`              | `CHECKED_IN`        | `gate_checkin`   | Valid session grant; `status == ACTIVE`; balance ≥ Rp 10,000 |
| `IDLE`              | `CHECKED_OUT`       | `force_checkout` | Valid session grant; `status == ACTIVE`                      |
| `CHECKED_IN`        | `STATION_OPERATION` | `terminal_start` | Valid session grant; `status == ACTIVE`                      |
| `CHECKED_IN`        | `CHECKED_OUT`       | `gate_checkout`  | Session was open (allowed even when session expired)         |
| `CHECKED_IN`        | `CHECKED_OUT`       | `force_checkout` | Always allowed                                               |
| `STATION_OPERATION` | `CHECKED_IN`        | `terminal_end`   | Write verified; counter incremented                          |
| `STATION_OPERATION` | `CHECKED_OUT`       | `force_checkout` | Always allowed                                               |
| `CHECKED_OUT`       | `IDLE`              | `admin_reset`    | Station/admin privilege required                             |
| `CHECKED_OUT`       | `IDLE`              | `gate_checkin`   | Re-entry after checkout (resets to IDLE then to CHECKED_IN)  |

## Session rules

- Terminal write operations require the card to be in `CHECKED_IN` or `STATION_OPERATION` state.
- A session is considered expired when: `nowSeconds > lastTimestamp + 86,400 + 3,600` (24h timeout + 1h clock drift tolerance).
- After session expiry, only `gate_checkout` and `force_checkout` transitions are permitted; all other operations are rejected with "Session expired".
- Cards in `IDLE` or `CHECKED_OUT` state never expire — `isSessionExpired()` returns `false` for these states.
- The `endTime` field is set when checkout occurs (`applyCheckout`). A zero `endTime` indicates an open session.
- At checkout, a parking fee is calculated: `hours (rounded up) × Rp 2,000` and deducted from the balance.

## Check-in validation

Before a `gate_checkin` transition is allowed, `validateTransition` enforces:

- `status == ACTIVE` (card not blocked)
- Session not expired (for cards already in an active state)
- `balance >= MIN_BALANCE_BEFORE_CHECKIN` (Rp 10,000)

## Write eligibility check

Before any card write, `isWriteEligible(payload, grant, requiredOp, nowSeconds)` validates:

- Card status must be `ACTIVE`
- Session grant must not have expired (`nowSeconds < grant.expiresAt`)
- The requested operation (e.g., "debit", "checkin") must be in `grant.allowedOps`

## Invalid transition behavior

- Any transition not listed in the table above is rejected with a reason string (e.g., "Invalid transition from IDLE via terminal_start").
- Rejected transitions are NOT automatically treated as tamper events. They indicate either a programming error or an operational issue (wrong app for the operation).
- The terminal must not write to the card after detecting an invalid transition.
- If the card is in `STATION_OPERATION` state on read (indicating a potentially incomplete previous write), the terminal should use `recoverFromIncompleteWrite` to check the inactive buffer's integrity before deciding whether to recover or escalate.

## Applied operations

| Function           | Trigger         | Effect                                                                 |
| ------------------ | --------------- | ---------------------------------------------------------------------- |
| `applyCheckin`     | `gate_checkin`  | state→CHECKED_IN, set session.startTime, log CHECKIN entry             |
| `applyCheckout`    | `gate_checkout` | state→CHECKED_OUT, deduct fee, set session.endTime, log CHECKOUT entry |
| `applyDebit`       | terminal debit  | decrement balance, log DEBIT entry                                     |
| `applyTopup`       | station top-up  | increment balance, log CREDIT entry                                    |
| `applyResetState`  | `admin_reset`   | state→IDLE, status→ACTIVE, zero session, log ADMIN entry               |
| `applyBlockStatus` | admin block     | set status to specified BLOCKED\_\* value, log ADMIN entry             |
