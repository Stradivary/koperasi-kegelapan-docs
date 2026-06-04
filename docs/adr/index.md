# Architecture Decision Records

This folder contains Architecture Decision Records (ADRs) for the offline NFC wallet system. Each ADR documents a significant design decision, the context that forced it, the alternatives that were considered, and the consequences of the choice.

ADRs are cross-cutting — they explain _why_ the specs are written the way they are.

> ⚠️ This index is aligned with the **code-frozen implementation** as of June 2026.

## Index

| ADR                                               | Title                                                              | Status   |
| ------------------------------------------------- | ------------------------------------------------------------------ | -------- |
| [ADR-001](1_ab-buffer-write-strategy.md)          | A/B Buffer Write Strategy                                          | Accepted |
| [ADR-002](2_aes-gcm.md)                           | AES-GCM as the Payload Encryption Cipher                           | Accepted |
| [ADR-003](3_ntag215-baseline.md)                  | NTAG215 as the Production Card Baseline                            | Accepted |
| [ADR-004](4_offline-trust-model.md)               | Deferred-Trust Offline Model                                       | Accepted |
| [ADR-005](5_hash-chain-log.md)                    | Hash-Chain Transaction Log (4-byte truncated SHA-256)              | Accepted |
| [ADR-006](6_balance-ceiling.md)                   | uint32 Balance with Rp 16 M Ceiling                                | Accepted |
| [ADR-007](7_tanstack-start-cloudflare-stack.md)   | Vite React SPA + Hono Workers as the Application Platform          | Accepted |
| [ADR-008](8_local-first-terminal-architecture.md) | Local-First Terminal Architecture with Optional Backend Sync       | Accepted |
| [ADR-009](9_indexeddb-local-persistence.md)       | IndexedDB as Primary Browser Persistence with Typed Local State    | Accepted |
| [ADR-010](10_tenant-scoped-local-replicas.md)     | Tenant-Scoped Local Replicas and Explicit Tenant Selection         | Accepted |
| [ADR-011](11_outbox-first-reconciliation-sync.md) | Outbox-First Reconciliation Sync and Conflict Resolution           | Accepted |
| [ADR-012](12_cloudflare-distribution-only.md)     | Cloudflare as Distribution/CDN with Local-First Offline Operation  | Accepted |
| [ADR-013](13_pbkdf2-password-hashing.md)          | PBKDF2-SHA256 for Password Hashing                                 | Accepted |
| [ADR-014](14_deterministic-shared-session-key.md) | Deterministic Shared Session Key per Tenant                        | Accepted |
| [ADR-015](15_nfc-write-journal.md)                | IndexedDB Write Journal for NFC Operations                         | Accepted |
| [ADR-016](16_push-first-sync-strategy.md)         | Push-First Sync Strategy with Debounce and Periodic Pull           | Accepted |
| [ADR-017](17_seven-role-rbac-no-mfa.md)           | Seven-Role RBAC without MFA                                        | Accepted |
| [ADR-018](18_single-multi-tenant-offline-upgrade.md) | Single/Multi-Tenant with Offline-to-Synced Upgrade Path         | Accepted |
| [ADR-019](19_device-fingerprint-auth.md)          | Device Fingerprint Authentication (No Cryptographic Device Identity)| Accepted |
| [ADR-020](20_pwa-offline-capability.md)           | PWA with Service Worker for Offline App Shell                      | Accepted |

## How to read an ADR

Each ADR answers four questions:

1. **Context** — what forced this decision?
2. **Decision** — what was chosen?
3. **Consequences** — what does this cost us?
4. **Alternatives considered** — what was rejected and why?

ADRs are immutable once accepted. If a decision is reversed, a new ADR supersedes the old one; the old one is not deleted.

## Topics from assumptions.md covered by ADRs

| assumptions.md Section | Covered by ADR(s) |
| ---------------------- | ----------------- |
| §1 Tenancy & Deployment | ADR-010, ADR-018 |
| §2 Membership & Kartu | ADR-003, ADR-006 |
| §3 Transaksi & Saldo | ADR-005, ADR-006 |
| §4 State Machine & Flow | ADR-004 |
| §5 NFC & Hardware | ADR-001, ADR-003, ADR-015 |
| §6 Keamanan & Kriptografi | ADR-002, ADR-013, ADR-014 |
| §7 Roles & Akses | ADR-017 |
| §8 Sinkronisasi | ADR-011, ADR-016 |
| §9 Device Management | ADR-019 |
| §10 Data Persistence | ADR-009, ADR-010 |
| §11 Infrastruktur | ADR-007, ADR-012, ADR-020 |
| §12 Limitasi & Constraint | ADR-003, ADR-006, ADR-013, ADR-014 |
