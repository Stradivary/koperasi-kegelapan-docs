# 15. Blocked / Status Rules

> Status codes and blocking logic are defined in [§11 Card Status Enforcement](11_card-status-enforcement.md). This section covers the escalation model and warning behaviour that precede a final block.

## Escalation model

Not every suspicious event results in an immediate block. The system distinguishes between:

- **Hard block** - immediate and automatic. Triggered by a failed cryptographic check (→ `BLOCKED_TAMPER`) or a backend fraud signal (→ `BLOCKED_FRAUD`). No operator confirmation required.
- **Soft warning** - a suspicious condition is logged and surfaced to the operator, but the card continues operating. Used when the evidence is ambiguous (e.g. a single near-limit transaction, minor clock drift).
- **Admin block** - a deliberate operator action, always initiated via the Station app with backend confirmation (→ `BLOCKED_ADMIN`).

## Warning-to-block escalation

A soft warning may escalate to a hard block if:

- The same card triggers warnings repeatedly across multiple reconciliation windows.
- A backend-side anomaly detector flags the card based on aggregated event history.
- An operator reviews the warnings and confirms a block via the Station app.

## Behaviour summary

| Status          | Writes | Reads | Recovery                                                                   |
| --------------- | ------ | ----- | -------------------------------------------------------------------------- |
| ACTIVE          | ✅     | ✅    | N/A                                                                        |
| BLOCKED_TAMPER  | ❌     | ✅    | Station `applyResetState` (sets status=ACTIVE, state=IDLE, zeroes session) |
| BLOCKED_FRAUD   | ❌     | ✅    | Station reissue + backend auth                                             |
| BLOCKED_EXPIRED | ❌     | ✅    | Station renewal via `applyResetState`                                      |
| BLOCKED_ADMIN   | ❌     | ✅    | Station reissue or `applyResetState` + operator confirmation               |

> Note: The implementation provides `applyBlockStatus(payload, blockedStatus, nowSeconds)` to write a blocked status to the physical card when the local DB indicates the card is blocked but on-card status is still ACTIVE. This ensures offline block enforcement — once the block is written to the card, all terminals (even fully offline ones) will respect it.
