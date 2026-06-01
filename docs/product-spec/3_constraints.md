# 3. Constraints

## Hardware constraints

- **Card type**: NXP NTAG215 (primary) / NTAG216 (extended). ISO 14443-3A, NFC Forum Type 2.
- **Storage**: ~492 usable bytes on NTAG215; ~1024 bytes on NTAG216. All card state - balance, session, log, authentication trailer - must fit within this limit.
- **No secure element**: the card has no hardware-backed encryption or tamper protection. The system must be **tamper-evident**, not tamper-proof.
- **No native app**: all terminal and gate interaction runs in a browser using Web NFC and Web Crypto APIs. No iOS NFC write support (Web NFC is Android/Chrome only at time of writing).

## Financial constraints

| Constraint                 | Value         | Rationale                                                  |
| -------------------------- | ------------- | ---------------------------------------------------------- |
| Maximum storable balance   | Rp 16,000,000 | Hard ceiling imposed by `uint32` storage format            |
| Recommended balance cap    | Rp 5,000,000  | Backend policy limit; bounds worst-case card-loss exposure |
| Single transaction maximum | Rp 1,000,000  | Enforced by terminal at write time                         |
| Daily cumulative limit     | Rp 2,000,000  | Backend-enforced at reconciliation                         |
| Weekly cumulative limit    | Rp 5,000,000  | Backend policy; triggers elevated review on breach         |

> See [Tech Specs §9 Risk & Financial Limits](../tech-specs/9_risk-financial-limits.md) for enforcement mechanisms.

## Connectivity constraints

- **Terminals and gates are offline-first.** They must function without backend access for the duration of a session grant.
- **Session grants have bounded lifetimes.** A terminal without a valid session grant cannot authorise transactions.
- **Top-ups are always online.** No balance credit operation may proceed without a live backend connection.
- **Reconciliation must occur within the session grant window.** Events accumulated offline are batched and uploaded when connectivity returns.

## Security constraints

- The card is an untrusted storage medium. Every read must re-validate all cryptographic proofs on the card.
- A card showing a failed validation must be treated as tampered or cloned, not retried.
- Session grants are single-use per terminal and must not be shared across devices.
- Key material is derived server-side; terminals never receive or store raw card master keys.

## Operational constraints

- The system must support 4 distinct client apps (Station, Gate, Terminal, Scout) without requiring native app installation.
- Cards in BLOCKED state (tamper, fraud, or expired) may not be reactivated on-card - physical reissue is required.
- Clock drift between terminal and backend of up to 1 hour is acceptable during offline sessions.

> ⚠️ Downstream impact: changes to any constraint in this section must be reflected in [System Design §2 Hardware Constraints](../system-design/2_hardware-constraints.md) and [System Design §3 Security Model](../system-design/3_security-model.md).
