# Architecture Decision Records

This folder contains Architecture Decision Records (ADRs) for the offline NFC wallet system. Each ADR documents a significant design decision, the context that forced it, the alternatives that were considered, and the consequences of the choice.

ADRs are cross-cutting - they explain _why_ the specs are written the way they are.

## Index

| ADR                                               | Title                                                                 | Status   |
| ------------------------------------------------- | --------------------------------------------------------------------- | -------- |
| [ADR-001](1_ab-buffer-write-strategy.md)          | A/B Buffer Write Strategy                                             | Accepted |
| [ADR-002](2_aes-gcm.md)                           | AES-GCM as the Payload Encryption Cipher                              | Accepted |
| [ADR-003](3_ntag215-baseline.md)                  | NTAG215 as the Production Card Baseline                               | Accepted |
| [ADR-004](4_offline-trust-model.md)               | Deferred-Trust Offline Model                                          | Accepted |
| [ADR-005](5_hash-chain-log.md)                    | Hash-Chain Transaction Log                                            | Accepted |
| [ADR-006](6_balance-ceiling.md)                   | uint32 Balance with Rp 16 M Ceiling                                   | Accepted |
| [ADR-007](7_tanstack-start-cloudflare-stack.md)   | TanStack Start and Cloudflare Pages/KV/D1 as the Application Platform | Accepted |
| [ADR-008](8_local-first-terminal-architecture.md) | Local-First Terminal Architecture with Optional Backend Sync          | Accepted |
| [ADR-009](9_indexeddb-local-persistence.md)       | IndexedDB as Primary Browser Persistence with Typed Local State       | Accepted |
| [ADR-010](10_tenant-scoped-local-replicas.md)     | Tenant-Scoped Local Replicas and Explicit Tenant Selection            | Accepted |
| [ADR-011](11_outbox-first-reconciliation-sync.md) | Outbox-First Reconciliation Sync and Conflict Resolution              | Accepted |
| [ADR-012](12_cloudflare-distribution-only.md)     | Cloudflare as Distribution/CDN with Local-First Offline Operation     | Accepted |

## How to read an ADR

Each ADR answers four questions:

1. **Context** - what forced this decision?
2. **Decision** - what was chosen?
3. **Consequences** - what does this cost us?
4. **Alternatives considered** - what was rejected and why?

ADRs are immutable once accepted. If a decision is reversed, a new ADR supersedes the old one; the old one is not deleted.
