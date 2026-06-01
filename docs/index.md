# Koperasi Kegelapan NFC Wallet - Specification Hub

This site contains the full specification for the **Koperasi Kegelapan offline NFC wallet system**: a tap-based payment system that operates without real-time backend connectivity, storing encrypted wallet state on NTAG215 NFC cards.

## 📖 Panduan Pengguna

Baru menggunakan sistem ini? Mulai dari [**Panduan Pengguna**](user-guide/index.md) untuk langkah-langkah lengkap dari registrasi hingga operasional harian.

## Spec Layers

| Layer                                      | Status      | Folder                |
| ------------------------------------------ | ----------- | --------------------- |
| 1. [Product Spec](product-spec/index.md)   | ✅ Complete | `docs/product-spec/`  |
| 2. [System Design](system-design/index.md) | ✅ Complete | `docs/system-design/` |
| 3. [Tech Specs](tech-specs/index.md)       | ✅ Complete | `docs/tech-specs/`    |
| 4. [API Spec](api-spec/index.md)           | ✅ Complete | `docs/api-spec/`      |
| 5. [Data Spec](data-spec/index.md)         | ✅ Complete | `docs/data-spec/`     |
| 6. [Security Spec](security-spec/index.md) | ✅ Complete | `docs/security-spec/` |
| 7. [Test Spec](test-spec/index.md)         | ✅ Complete | `docs/test-spec/`     |
| [ADRs](adr/index.md)                       | ✅ Complete | `docs/adr/`           |

## Quick Links

- [Core objective](system-design/1_core-objective.md) - What the system is and why it exists
- [Acceptance criteria](product-spec/4_acceptance-criteria.md) - AC-01 through AC-14
- [Card state machine](system-design/4_card-state-machine.md) - IDLE → CHECKED_IN → CHECKED_OUT
- [Cryptographic model](system-design/8_crypto-model.md) - AES-256-GCM, HMAC-SHA256, HKDF
- [API overview](api-spec/1_overview.md) - Base URL, auth, error format
- [Hardware constraints](system-design/2_hardware-constraints.md) - NTAG215 / NTAG216 specs
- [Software assumptions](tech-specs/18_software-assumptions.md) - Tenancy, cards, transactions, sync, limits
- [CI/CD integration](tech-specs/19_cicd-integration.md) - Pipeline, secrets, scripts, deployment

## Architecture Decision Records

Twelve key decisions are recorded in the [ADR folder](adr/index.md):

1. [A/B buffer write strategy](adr/1_ab-buffer-write-strategy.md) - NFC write non-atomicity and recovery
2. [AES-GCM cipher choice](adr/2_aes-gcm.md) - Web Crypto API constraint and AEAD rationale
3. [NTAG215 production baseline](adr/3_ntag215-baseline.md) - Commodity hardware, byte budget
4. [Offline trust model](adr/4_offline-trust-model.md) - Session grants, deferred reconciliation
5. [Hash-chain log](adr/5_hash-chain-log.md) - Tamper-evident on-card transaction log
6. [Balance ceiling](adr/6_balance-ceiling.md) - uint32 with Rp 16 M operational cap
7. [TanStack + Cloudflare stack](adr/7_tanstack-start-cloudflare-stack.md) - Application platform choice
8. [Local-first terminal architecture](adr/8_local-first-terminal-architecture.md) - Optional backend sync
9. [IndexedDB local persistence](adr/9_indexeddb-local-persistence.md) - Typed local state in browser
10. [Tenant-scoped local replicas](adr/10_tenant-scoped-local-replicas.md) - Explicit tenant selection
11. [Outbox-first reconciliation sync](adr/11_outbox-first-reconciliation-sync.md) - Conflict resolution
12. [Cloudflare-only distribution](adr/12_cloudflare-distribution-only.md) - CDN with local-first offline operation
