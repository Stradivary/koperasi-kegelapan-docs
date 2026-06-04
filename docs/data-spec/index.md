# Data Spec Index

This folder defines **what is stored, where, and in what format** for the offline NFC wallet system. It is the authoritative source for field definitions, binary layouts, backend schema, encoding rules, and versioning contracts.

> Data Spec is Layer 5. It depends on Tech Specs (Layer 3) for behaviour rules and System Design (Layer 2) for the conceptual model. API Spec (Layer 4) depends on this layer for payload field definitions.

> ⚠️ This spec is aligned with the **code-frozen implementation** as of June 2026.

## Sections

1. [Overview](1_overview.md) — storage areas, ownership, and data flow
2. [Card Binary Schema](2_card-binary-schema.md) — full 496B binary layout for NFC card payload
3. [Backend DB Schema](3_backend-db-schema.md) — 11 D1/SQLite tables (Drizzle ORM)
4. [Encoding Conventions & Versioning](4_encoding-conventions.md) — endianness, encoding rules, schema v4, migrations
5. [Multitenancy, Auth & Local-first Storage](5_multitenancy-auth-local-first.md) — tenant boundaries, Dexie IndexedDB stores, outbox pattern, sync pull/push

## Upstream sources

- System Design §5: [Data Layout](../system-design/5_data-layout.md)
- System Design §13: [Client Roles & Apps](../system-design/13_client-roles.md)
- Tech Specs §3: [Card Storage Model](../tech-specs/3_card-storage-model.md)
- Tech Specs §8: [Backend & Frontend Interfaces](../tech-specs/8_backend-frontend-interfaces.md)
- Tech Specs §14: [Transaction Log Format](../tech-specs/14_transaction-log-format.md)
- Tech Specs §15: [Status Codes & Block Rules](../tech-specs/15_status-codes-block-rules.md)

## Downstream layers

- API Spec: [docs/api-spec/](../api-spec/index.md)
- Security Spec: `docs/security-spec/` _(not yet written)_
- Test Spec: `docs/test-spec/` _(not yet written)_
