# 7. Financial Risk Controls

> ⚠️ This spec reflects the **code-frozen implementation** as of June 2026.

## Limit enforcement chain

Financial controls are applied at two checkpoints in the current implementation:

| Checkpoint       | Enforced by  | When               | Limits applied                                                               |
| ---------------- | ------------ | ------------------ | ---------------------------------------------------------------------------- |
| **Write time**   | Terminal app  | Before card write  | `MAX_BALANCE`, `MAX_TOPUP_AMOUNT`, `MIN_TOPUP_AMOUNT`, `MIN_BALANCE_BEFORE_CHECKIN` |
| **Sync push**    | Backend API   | On batch receipt   | `MAX_TRANSACTION_AMOUNT`, `MAX_BALANCE`, topup min/max, issuance min, counter/type validation |

A third checkpoint (**policy-based limits**) is defined but **not enforced** at transaction time:

| Checkpoint       | Status          | Limits defined                                     |
| ---------------- | --------------- | -------------------------------------------------- |
| Tenant policy    | NOT ENFORCED    | `maxTransactionAmount` (1M), `maxDailyTotal` (5M), `topupOnlineOnly`, `allowedTxTypes`, `sessionTimeoutHours` |

---

## Implemented limit values

| Limit                          | Value             | Enforcement                                      |
| ------------------------------ | ----------------- | ------------------------------------------------ |
| Maximum card balance           | Rp 16,000,000     | Client-side (`validateTopup`) + server-side      |
| Maximum transaction amount     | Rp 16,000,000     | Server-side (`validateTransaction` in sync.ts)   |
| Maximum top-up per tx          | Rp 2,000,000      | Client-side + server-side                        |
| Minimum top-up amount          | Rp 2,000          | Client-side + server-side                        |
| Minimum issuance balance       | Rp 2,000          | Server-side + UI validation                      |
| Minimum balance for check-in   | Rp 10,000         | Client-side (`validateTransition`)               |
| Parking rate                   | Rp 2,000/hour     | Client-side (`calculateCheckoutFee`)             |
| Sync push batch size           | 500 transactions  | Server-side (returns 400 if exceeded)            |
| Sync rate limit                | 60 req/min        | Server middleware per device_id                  |
| Auth rate limit                | Rate-limited      | Server middleware on `/api/auth/*`               |

---

## Stale counter rejection

The primary anti-replay mechanism at sync push time:
- Server maintains `cards.counter` (last known counter per card).
- If `tx.counter <= card.counter`, the transaction is rejected with `stale_counter`.
- This prevents replay of already-synced transactions.

---

## Idempotency

- Each transaction pushed via `POST /api/sync/push` includes an `idempotencyKey`.
- Duplicate idempotency keys are silently accepted (no error, no double-write).
- Format: `tenantId:cardIdHex:counter` — deterministic and unique per transaction.

---

## Risk signals (implemented)

| Signal                     | Detection                                             | Response                                    |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------- |
| Tamper detected            | HMAC/chain validation failure during card read        | Card escalated to `BLOCKED_TAMPER`          |
| Stale counter on sync push | `tx.counter <= server card.counter`                   | Individual transaction rejected             |
| Device compromised         | Superadmin blocks device                              | All sessions revoked, sync operations abort |
| Invalid transaction type   | Type not in valid set during sync push                | Transaction rejected with `invalid_type`    |
| Amount out of range        | Amount exceeds uint24 max or topup limits             | Transaction rejected                        |

---

## Not implemented (aspirational)

The following risk controls are defined in the policy schema but are **not enforced** in code:

| Control                        | Status                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| Daily cumulative limit (5M)    | Defined in `PolicyData.maxDailyTotal`; not checked         |
| Weekly cumulative limit        | Not defined anywhere in code                               |
| Single tx cap (1M)             | Defined in `PolicyData.maxTransactionAmount`; not enforced at write time |
| Automated anomaly detection    | Not implemented; no ML/scoring                             |
| Real-time fraud alerts         | Not implemented; signals visible only at sync time         |
| Progressive account lockout    | Not implemented; rate limiting only                        |
| Operator notifications         | Not implemented; flagged events visible in DB only         |

---

## Worst-case offline exposure

The maximum financial exposure from a compromised terminal operating offline is bounded by:

- **Per-card maximum**: Rp 16,000,000 (hardware balance cap)
- **Session grant duration**: 24 hours
- **Sync push batch cap**: 500 transactions per request

A compromised terminal with a valid session grant could theoretically debit multiple cards up to their balance limit during the 24h window. The primary mitigations are:
1. Device blocking (revokes sessions, prevents sync)
2. Short session grant TTL (24h)
3. Stale counter detection at sync push (prevents double-spend across devices)
4. Physical card proximity requirement (must physically tap each card)

---

## Cross-references

- Tech Specs §9: [Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md)
- Data Spec §3: [Backend DB Schema](../data-spec/3_backend-db-schema.md)
- Security Spec §4: [Card Tamper Detection](4_card-tamper-detection.md)
- Security Spec §5: [Offline Trust Model](5_offline-trust-model.md)
