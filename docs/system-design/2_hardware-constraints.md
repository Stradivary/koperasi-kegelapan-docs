# 2. Hardware Constraints

## Card type

| Card            | Standard                              | Form factor                     | Source                                                           |
| --------------- | ------------------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| **NXP NTAG215** | ISO 14443-3A (NfcA), NFC Forum Type 2 | Plain white PVC sticker or card | Self-purchased for production deployment                         |
| **NXP NTAG216** | ISO 14443-3A (NfcA), NFC Forum Type 2 | Plain white PVC sticker or card | Sourced for requirement validation and extended-capacity testing |

**Assumption**: NTAG215 is the production baseline. All storage budgets and layout constraints are designed to fit within NTAG215's usable capacity. NTAG216 cards are used during development and integration testing to validate extended log retention and future-proofing. The system will work on NTAG216 without code changes.

## Capacity

| Card    | Usable bytes | Buffer capacity       | Log entries |
| ------- | ------------ | --------------------- | ----------- |
| NTAG215 | ~504 bytes   | 216 bytes per buffer  | 5 entries   |
| NTAG216 | ~1024 bytes  | ~448 bytes per buffer | ~21 entries |

## Limitations

- **No secure element** — the card has no hardware-backed key storage or execution environment. Secrets are never stored on the card.
- **No hardware-backed encryption** — all cryptography is performed by the terminal. The card is passive storage.
- **Full read/write access** — any NFC reader with physical proximity can read the full card contents. An attacker with a writer can modify any byte.
- **No write acknowledgement** — the NFC protocol does not guarantee write atomicity at the page level. A tap interruption mid-write can leave partial state.

## Implications

- The system must be **tamper-evident**, not tamper-proof. We cannot prevent a physical attack; we can only detect it.
- All sensitive state requires cryptographic protection and must be re-validated on every read.
- Memory usage must be tightly bounded and deterministic — there is no overflow path.
- The A/B buffer write strategy (see [§9](9_write-strategy.md)) is required to handle interrupted writes safely.
