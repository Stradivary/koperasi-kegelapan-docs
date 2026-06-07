# 9. Risk & Financial Limits

## Financial bounds

### Implemented (enforced in code)

| Limit                          | Value             | Constant                     | Enforcement location                              |
| ------------------------------ | ----------------- | ---------------------------- | ------------------------------------------------- |
| Maximum card balance           | **Rp 16,000,000** | `MAX_BALANCE`                | `engine.ts` client-side, `sync.ts` server-side    |
| Maximum transaction amount     | **Rp 16,000,000** | `MAX_TRANSACTION_AMOUNT`     | uint24 log entry field cap; `sync.ts` server-side |
| Maximum top-up per tx          | **Rp 2,000,000**  | `MAX_TOPUP_AMOUNT`           | `engine.ts` client-side, `sync.ts` server-side    |
| Minimum top-up amount          | **Rp 2,000**      | `MIN_TOPUP_AMOUNT`           | `engine.ts` client-side, `sync.ts` server-side    |
| Minimum issuance balance       | **Rp 2,000**      | `MIN_ISSUANCE_BALANCE`       | `sync.ts` server-side, UI validation              |
| Minimum balance for check-in   | **Rp 10,000**     | `MIN_BALANCE_BEFORE_CHECKIN` | `engine.ts` in `validateTransition`               |
| Minimum balance after checkout | **Rp 0**          | `MIN_BALANCE_AFTER_CHECKOUT` | `engine.ts` in `validateCheckoutBalance`          |
| Parking rate per hour          | **Rp 2,000**      | `PARKING_RATE_PER_HOUR`      | `engine.ts` in `calculateCheckoutFee`             |

### Policy system (defined but not enforced at transaction time)

The following limits exist as fields in the `PolicyData` interface (`src/core/auth/policy.ts` and `api/src/routes/policy.ts`) and are served via `GET /api/policy`, but are **not enforced** at write time or sync push:

| Limit                      | Default value                    | Field name             | Status                                                                                  |
| -------------------------- | -------------------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| Single transaction maximum | Rp 1,000,000                     | `maxTransactionAmount` | Defined; not checked at write time                                                      |
| Daily cumulative limit     | Rp 5,000,000                     | `maxDailyTotal`        | Defined; not checked at reconcile/push                                                  |
| Top-up online only         | `true`                           | `topupOnlineOnly`      | Defined; structurally enforced (credit ops require station role which is always-online) |
| Allowed tx types           | debit, credit, checkin, checkout | `allowedTxTypes`       | Defined; not filtered at push                                                           |
| Session timeout hours      | 24                               | `sessionTimeoutHours`  | Defined; hardcoded constant used instead                                                |

> **Note**: The policy system provides per-tenant configurability but enforcement is a future enhancement. Current enforcement relies on hardcoded constants in `engine.ts` and `sync.ts`.

## Hardware constraints

- **Balance** (`wallet.balance`, `wallet.lastBalance`): stored as **uint24** (3 bytes value + 1 byte padding per field, max 16,777,215 / ~Rp 16.7 M). Operational ceiling `MAX_BALANCE = 16,000,000` fits within this hardware limit.
- **Log entry amount**: stored as **uint24** (max 16,777,215). This is the hard cap on any single transaction amount. `MAX_TRANSACTION_AMOUNT = 16,000,000` provides a round business limit within this hardware cap.
- **Log entry balanceAfter**: stored as **uint24** (3 bytes value + 1 byte padding, same range as balance).
- **Counter**: stored as **uint64** (bigint) — will not overflow in practice.

## Enforcement mechanism

### At write time (client-side)

Before constructing the new payload:

- `validateTopup(payload, amount)` checks:
  - `amount >= MIN_TOPUP_AMOUNT` (Rp 2,000)
  - `amount <= MAX_TOPUP_AMOUNT` (Rp 2,000,000)
  - `balanceAfter <= MAX_BALANCE` (Rp 16,000,000)
- `validateTransition(payload, "gate_checkin", now)` checks:
  - `balance >= MIN_BALANCE_BEFORE_CHECKIN` (Rp 10,000)
- `validateCheckoutBalance(payload, now)` checks:
  - `balanceAfter >= MIN_BALANCE_AFTER_CHECKOUT` (Rp 0)
- Issuance UI enforces `MIN_ISSUANCE_BALANCE` (Rp 2,000)

### At sync push (server-side)

`validateTransaction()` in `api/src/routes/sync.ts` rejects transactions that:

- Have `amount < 0` or `amount > MAX_TRANSACTION_AMOUNT` (16,000,000)
- Have `balanceAfter < 0` or `balanceAfter > MAX_BALANCE` (16,000,000)
- Are type `topup` with `amount < MIN_TOPUP_AMOUNT` (2,000) or `amount > MAX_TOPUP_AMOUNT` (2,000,000)
- Are type `credit` with `amount < MIN_ISSUANCE_BALANCE` (2,000)
- Have `counter < 0` or `counter > 65535`
- Have invalid type (not in: debit, credit, checkin, checkout, topup, admin)

### Stale counter rejection

The sync push endpoint checks each transaction's counter against the server's known card counter. If `tx.counter <= card.counter`, the event is rejected as `stale_counter`. This prevents replay of already-reconciled transactions.

## Risk management

- Require backend validation for any top-up or balance credit operation; debits may proceed offline within the session grant scope.
- Keep offline exposure bounded by session grant duration (24h) and the hardware transaction limit.
- Treat tamper or rollback events as high-priority incidents: freeze the card, log the event, and notify an operator.
- Review cards with repeated near-limit transactions across sync windows as potential fraud signals.
- Device blocking (via superadmin) revokes all active sessions and prevents further sync operations from the compromised device.
- Sync push batch size is capped at 500 transactions per request to prevent abuse.
