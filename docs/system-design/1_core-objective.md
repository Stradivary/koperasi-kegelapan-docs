# 1. Core Objective

Design an **offline-capable NFC wallet system** that:

- **Stores balance, session state, and logs directly on the card** - the card is the single source of truth for financial state during offline periods. No backend connectivity is required to read, validate, or debit a card. All state is self-contained and verifiable from the card alone.
- **Detects tampering, cloning, replay, and rollback** - because the card is physically accessible and has no secure element, every read must re-verify all cryptographic proofs. Any modification that bypasses a legitimate write path is detectable before any value change is committed.
- **Works with Web NFC and Web Crypto without requiring a native app** - all terminal, gate, and station interactions run in a browser on a standard Android device. No app store deployment, no native SDK dependency.
- **Supports multi-frontend experiences with a shared backend** - seven distinct client roles (Station, Gate, Terminal, Kiosk, Scout, Admin, Superadmin) share one backend API and one card format. Role-specific behaviour is enforced at the app routing and session-grant `allowedOps` level, not by separate card formats.
- **Enforces bounded financial risk** - the maximum balance storable on a card is Rp 16,000,000 (constrained by the `uint24` log amount field). Per-tenant policy defaults cap daily totals at Rp 5,000,000. A lost or stolen card's worst-case exposure is bounded by the session grant scope and configurable financial limits.

## Card hardware target

The system is designed for **NXP NTAG215** as the primary production card (~492 bytes usable). The layout also supports **NTAG216** (~1024 bytes) for future capacity growth or extended log retention. See [§2 Hardware Constraints](2_hardware-constraints.md) for full details.

## Goals

- Enable secure offline transactions with a disposable trust model.
- Keep the card data tamper-evident rather than fully tamper-proof.
- Provide a recoverable backend audit trail for reconciliation.
- Maintain compatibility with NTAG215/216 NFC cards.

## Design priorities

- Security first for state integrity, even with untrusted card storage.
- Minimal card-side logic; the card holds state while terminals enforce rules.
- Ease of extension through modular design sections.
