# ADR-006: uint24 Balance with Rp 16 M Ceiling

**Date**: 2025-01-01  
**Status**: Accepted  
**Updated**: 2026-06 (clarified balance type as uint24 stored in 4-byte slot)

## Context

The card must store a monetary balance in its encrypted payload. Two design questions arise:

1. **What numeric type?** The balance must fit within the tight byte budget of the NTAG215 card. Floating-point types introduce representation errors for monetary values. The balance should be stored in an integer type denominated in the smallest currency unit (e.g., Indonesian Rupiah has no subdivision, so 1 unit = Rp 1).

2. **What is the maximum balance?** The system operates in an offline environment where fraud cannot be detected in real time. Bounding the maximum card balance limits the worst-case financial exposure if a card is compromised, cloned, or a terminal is operating with stale state.

## Decision

The card balance is stored as a **uint24** (unsigned 24-bit integer, max 16,777,215) with 1 byte of padding per field (4 bytes total storage), denominated in the smallest currency unit (Rupiah, no subdivision).

- The hard maximum value is `2^24 − 1 = 16,777,215` (≈ Rp 16.7 million). The system enforces a lower **operational ceiling of Rp 16,000,000** (16 million Rupiah, ≈ USD 1,000).
- The recommended maximum load per top-up event is **Rp 2,000,000** (2 million Rupiah).
- The maximum single transaction debit is **Rp 1,000,000** (1 million Rupiah).
- The maximum daily debit total is **Rp 2,000,000** (2 million Rupiah).
- The maximum weekly debit total is **Rp 5,000,000** (5 million Rupiah).

These limits are enforced by both the terminal (via session grant policy) and the backend (on reconciliation).

## Consequences

**Positive:**

- uint24 with 1 byte padding maintains 4-byte alignment while enforcing a natural ceiling that matches the log entry `amount` field range.
- All monetary fields (balance, lastBalance, amount, balanceAfter) share the same uint24 range — no overflow possible when debiting a full balance into a log entry.
- Integer arithmetic in the smallest unit eliminates all floating-point rounding errors.
- The Rp 16 M ceiling (within the uint24 hardware max of ~Rp 16.7 M) bounds worst-case per-card exposure if the card is cloned or the session key is leaked.
- The per-transaction and per-day limits further reduce the fraud surface within the offline window.

**Negative:**

- The Rp 16 M ceiling cannot be raised above ~Rp 16.7 M without a schema change (unlike a full uint32 which would allow up to ~Rp 4.3 B). This limits future use cases to prepaid/transit scenarios.
- `lastBalance` (the balance before the most recent transaction, stored for rollback detection) also uses the same uint24 + 1B padding layout.
- Denominating in the smallest unit (Rupiah) means the balance field cannot represent currencies with sub-unit precision (e.g., USD cents) without a convention change.

**Risks:**

- If the operational ceiling is raised by backend policy without reviewing the session grant TTL and reconciliation frequency, the worst-case fraud exposure increases proportionally. Ceiling, TTL, and reconciliation frequency must be reviewed together as a risk triad.

## Alternatives Considered

| Option                                        | Reason Rejected                                                                                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **uint32 (4 bytes, full range)**              | Max ~Rp 4.3 billion is far above any realistic card balance need and creates an inconsistency with the log entry `amount` field (uint24). Using uint24 for all monetary fields ensures no overflow when recording transactions. |
| **uint16 (2 bytes)**                          | Maximum value of 65,535 is too small even for a modest Rp 65,535 limit. Would require storing balance in units of Rp 100 or Rp 1,000, introducing rounding errors and ambiguity.                                                |
| **Fixed-point float (e.g., 32-bit IEEE 754)** | Float32 cannot exactly represent all integer values above 2^24 (≈ 16 million). For balances near the ceiling, float32 introduces representation errors that differ by platform. Unacceptable for a financial system.            |
| **String / BCD**                              | Variable or inflated byte cost. Parsing overhead. Not appropriate for a compact binary card layout.                                                                                                                             |
| **No ceiling (system max only)**              | Without an operational ceiling enforced by policy, a compromised session key has exposure up to the uint24 hardware max. The ceiling exists to bound worst-case fraud, not as a type constraint.                                 |

## References

- Product Spec [§3 Constraints - Financial Limits](../product-spec/3_constraints.md)
- Tech Specs [§3 Card Storage Model](../tech-specs/3_card-storage-model.md)
- Tech Specs [§9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md)
- ADR-004 [Deferred-Trust Offline Model](4_offline-trust-model.md)
