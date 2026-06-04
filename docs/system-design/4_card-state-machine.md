# 4. Card State Machine

## States

| State               | Code | Meaning                                                                                           |
| ------------------- | ---- | ------------------------------------------------------------------------------------------------- |
| `IDLE`              | 0    | Card is issued but no session is open. Waiting for gate check-in.                                 |
| `CHECKED_IN`        | 1    | Gate has opened a session. Terminal debit operations and station operations are permitted.   |
| `STATION_OPERATION` | 2    | A terminal has started a multi-step operation (e.g. debit). Intermediate state during processing. |
| `CHECKED_OUT`       | 3    | Session was closed by a gate/force checkout. Card is reconcilable; awaits next check-in or reset. |

## Valid transitions

```
                         gate_checkin
              IDLE ─────────────────────────► CHECKED_IN
               ▲                                  │
               │ admin_reset                      │ terminal_start
               │ gate_checkin                     ▼
          CHECKED_OUT ◄──────────────── STATION_OPERATION
               ▲                                  │
               │ gate_checkout                    │ terminal_end
               │ force_checkout                   ▼
               └────────────────────────── CHECKED_IN (loop)
```

Transition table (from `engine.ts`):

| From              | Trigger          | To                |
| ----------------- | ---------------- | ----------------- |
| IDLE              | gate_checkin     | CHECKED_IN        |
| IDLE              | force_checkout   | CHECKED_OUT       |
| CHECKED_IN        | terminal_start   | STATION_OPERATION |
| CHECKED_IN        | gate_checkout    | CHECKED_OUT       |
| CHECKED_IN        | force_checkout   | CHECKED_OUT       |
| STATION_OPERATION | terminal_end     | CHECKED_IN        |
| STATION_OPERATION | force_checkout   | CHECKED_OUT       |
| CHECKED_OUT       | admin_reset      | IDLE              |
| CHECKED_OUT       | gate_checkin     | IDLE              |

## Rules

- A terminal debit is performed within `STATION_OPERATION` state. The card transitions via `terminal_start` from `CHECKED_IN` before the debit and back via `terminal_end` after.
- Check-in requires a minimum card balance of **Rp 10,000** (`MIN_BALANCE_BEFORE_CHECKIN`). Cards below this threshold are rejected at gate.
- The session must complete (checkout) within **24 hours** of check-in (`SESSION_TIMEOUT_SECONDS = 86,400`).
- Terminal and gate clocks may drift by up to **1 hour** during validation (`CLOCK_DRIFT_TOLERANCE = 3,600`).
- Invalid transitions are rejected with a reason string. They do not automatically trigger a block — they indicate either a programming error or a race condition, not necessarily tamper.
- The `force_checkout` trigger is available from any active state (IDLE, CHECKED_IN, STATION_OPERATION) and always transitions to CHECKED_OUT.

## Expired session (no checkout within 24 hours + 1 hour drift)

If a card remains in `CHECKED_IN` or `STATION_OPERATION` more than 25 hours (24h + 1h drift tolerance) after `wallet.lastTimestamp` (checked by `isSessionExpired`):

- **The session is treated as expired.** No new operations may begin except `gate_checkout` and `force_checkout`.
- **Only checkout transitions are permitted.** The `validateTransition` function allows `gate_checkout` and `force_checkout` even when expired, but rejects all other triggers with "Session expired".
- **Forced check-out**: any app with the appropriate trigger can write `CHECKED_OUT` and calculate the parking fee. The fee is `hours (rounded up) × Rp 2,000`.
- **This is not a tamper condition.** A stale session is treated as an operational error (e.g., member exited without tapping out), not a fraud signal. The card is not blocked.
- **Cards in IDLE or CHECKED_OUT never expire.** The `isSessionExpired` function returns `false` for these states.

## Operational behaviour

- `CHECKED_IN` indicates the card is authorised for a session and can proceed to debit/checkout.
- `STATION_OPERATION` indicates a terminal is actively processing a multi-step operation. If a read finds the card in this state, the terminal should verify the inactive buffer via `recoverFromIncompleteWrite` before deciding whether to recover or escalate.
- `CHECKED_OUT` indicates the session is complete. A subsequent `gate_checkin` or `admin_reset` transitions back to `IDLE` for a fresh session.
