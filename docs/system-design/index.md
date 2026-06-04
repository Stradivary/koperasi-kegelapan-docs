# System Design Index

This folder contains the structured system design for the offline NFC wallet system. It defines the concepts, state model, and security assumptions.

> System design focuses on the model and intent. Tech specs are the implementation reference for developers.

> ⚠️ This spec is aligned with the **code-frozen implementation** as of June 2026.

## Sections

1. [Core Objective](1_core-objective.md) — Offline-capable NFC wallet with tamper-evident design
2. [Hardware Constraints](2_hardware-constraints.md) — NTAG215/216, 496B layout, no secure element
3. [Security Model](3_security-model.md) — Threat model and defence matrix (AES-GCM, HMAC, chain hash)
4. [Card State Machine](4_card-state-machine.md) — 4 states: IDLE → CHECKED_IN → STATION_OPERATION → CHECKED_OUT
5. [Data Layout](5_data-layout.md) — 2×216B buffers + 64B trailer, wire format 280B
6. [Log Chain Model](6_log-chain-model.md) — 5-entry ring buffer with SHA-256 chain hashing
7. [Trailer / Meta](7_trailer-meta.md) — 64B trailer with HMAC, rootHash, counterBind, activePtr
8. [Cryptographic Model](8_crypto-model.md) — AES-256-GCM + HMAC-SHA256 + HKDF key derivation
9. [Write Strategy (A/B Buffer)](9_write-strategy.md) — Double-buffer for crash-safe NFC writes
10. [Verification Rules](10_verification-rules.md) — Full validation sequence on every read
11. [Card Status Enforcement](11_card-status-enforcement.md) — Status vs State, block enforcement
12. [Key Trust Model](12_key-trust-model.md) — Deterministic tenant-scoped key hierarchy
13. [Client Roles](13_client-roles.md) — 7 roles: admin, station, gate, terminal, kiosk, scout, superadmin
14. [Transaction Log Structure](14_transaction-log-structure.md) — Ring buffer, chain hash, TxType flags
15. [Blocked Status Rules](15_blocked-status-rules.md) — Escalation model, hard/soft block, recovery
16. [Infrastructure Stack](16_infrastructure-stack.md) — Cloudflare Workers + D1 + Pages, Dexie local DB
17. [Validation Assumptions](17_validation-assumptions.md) — Time model, validation sequence, constants
18. [Card Initialisation State](18_card-initialisation-state.md) — Uninitialised card detection and first-write
