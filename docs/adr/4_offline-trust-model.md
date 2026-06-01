# ADR-004: Deferred-Trust Offline Model

**Date**: 2025-01-01  
**Status**: Accepted

## Context

The system serves event venues and transit operators where connectivity to a backend cannot be guaranteed during operations. Turnstiles, food stalls, and transit gates must process card taps even when the internet is unavailable - a failed connection must not block a member from entering or spending.

At the same time, the system must not allow unlimited offline fraud. A terminal that has been disconnected from the backend for an extended period should not have unrestricted authority to accept transactions.

Two extreme models were considered:

- **Online-first**: Every tap requires a backend round-trip. Simple but fails entirely offline.
- **Full offline trust**: Terminals operate independently forever. Simple but allows unbounded fraud if a card or terminal is compromised.

Neither extreme is acceptable. A middle ground is needed.

## Decision

The system uses a **deferred-trust offline model**: terminals are granted a bounded offline authority window through cryptographically signed **session grants** issued by the backend.

Key properties of the model:

1. **Session grants bound the offline window.** A terminal must fetch a fresh session grant from the backend before operating. The grant carries an `expiresAt` timestamp (1–24 hours, controlled by the backend) and an `allowedOps` list. The terminal is not authorised to operate after `expiresAt` without re-authenticating.

2. **The card is the source of truth offline.** Balance, state, and transaction log are stored on the card. The terminal reads and writes the card payload using the session key from the grant. No backend call is needed per transaction.

3. **The backend is the root of trust.** The backend issues keys, sets limits, maintains the blacklist, and reconciles transactions. No terminal or card can extend its own authority beyond what the backend has granted.

4. **Transactions are reconciled asynchronously.** Terminals queue transaction events locally (IndexedDB/localStorage) and submit them in a batch via `POST /api/reconcile` when connectivity is restored. The backend can flag or reject retrospective anomalies.

5. **The balance ceiling bounds worst-case fraud.** The maximum card balance is Rp 16,000,000 (~USD 1,000). If a compromised terminal accepts fraudulent debits or a compromised card is replayed, the maximum financial exposure per card is bounded by this ceiling (see ADR-006).

6. **Blacklist propagation is best-effort.** The backend maintains a card blacklist. Terminals download it on each grant refresh. Blocked cards are rejected immediately; however, a terminal that has been offline since before a card was blocked will not have the latest blacklist until it reconnects.

## Consequences

**Positive:**

- Terminals operate fully offline during a valid grant window without any backend dependency per tap.
- Financial exposure from offline fraud is bounded by the session grant TTL and the balance ceiling.
- The model degrades gracefully: if the backend is unavailable, existing grant-holders can continue operating until their grant expires.
- Reconciliation provides an audit trail for every transaction, even those accepted offline.

**Negative:**

- A terminal whose grant has expired cannot accept new transactions until it reconnects. Venues must ensure terminals reconnect at least once per grant TTL to maintain continuous operation.
- A card that is blocked at the backend will continue to be accepted by offline terminals until their grant is refreshed. The risk window is bounded by the grant TTL.
- Reconciliation is eventual, not immediate. The backend cannot prevent a fraudulent offline transaction; it can only detect and flag it after the fact.

**Risks:**

- Grant TTL misconfiguration (e.g., 24-hour grants with daily reconnect policy) creates a 24-hour worst-case window for undetected fraud. Operators should choose TTLs appropriate for the venue's connectivity profile.
- Terminals that never reconnect (e.g., decommissioned without draining the event queue) may leave unreconciled transactions. The backend must enforce a reconciliation deadline policy.

## Alternatives Considered

| Option                                     | Reason Rejected                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Online-only (no offline capability)**    | Unacceptable for the target use case: events and venues frequently have intermittent or no internet. A payment failure during an event gate rush is operationally unacceptable. |
| **Full offline trust (no session expiry)** | A stolen or compromised terminal would have unlimited authority forever. No financial loss bound. Incompatible with the security requirements.                                  |
| **Pre-loaded policy without key grants**   | A terminal with a static key and a locally stored policy has no way to receive revocations or blacklist updates. A compromised key cannot be revoked offline.                   |
| **Per-transaction backend confirmation**   | Requires reliable connectivity per tap. Falls back to the online-only problem. Not feasible for NFC tap speeds (< 500ms expected UX).                                           |

## References

- System Design [§3 Security Model](../system-design/3_security-model.md)
- System Design [§12 Key & Trust Model](../system-design/12_key-trust-model.md)
- Tech Specs [§12 Key Hierarchy & Session Grants](../tech-specs/12_key-hierarchy-session-grants.md)
- API Spec [§3 Session Grants](../api-spec/3_session-grants.md)
- Product Spec [§3 Constraints](../product-spec/3_constraints.md)
