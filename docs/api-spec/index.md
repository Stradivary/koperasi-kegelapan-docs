# API Spec Index

This folder defines the **contract between services** for the offline NFC wallet system. It covers all HTTP endpoints exposed by the Cloudflare Workers backend to terminal, gate, station, kiosk, scout, admin, and superadmin clients.

> API Spec is Layer 4. It depends on Tech Specs (Layer 3) for behavior rules and System Design (Layer 2) for trust model and session grant concepts.

> ⚠️ This spec is aligned with the **code-frozen implementation** as of June 2026.

## Sections

1. [Overview](1_overview.md) — auth model, base URL, middleware, common errors
2. [Authentication](2_auth.md) — `POST /api/auth/token`, `POST /api/auth/refresh`
3. [Session Grants](3_session-grants.md) — `GET /api/session-grant`
4. [Policy](4_policy.md) — `GET /api/policy`
5. [Cards](5_cards.md) — `GET/POST /api/cards`
6. [Sync](6_sync.md) — `POST /api/sync/push`, `GET /api/sync/pull`, `GET /api/sync/devices`, `POST /api/sync/push-entities`
7. [Superadmin](7_superadmin.md) — tenant, account, and device management
8. [Reconciliation](8_reconciliation.md) — `POST /api/reconcile` (legacy)
9. [Accounts](9_accounts.md) — `GET/POST /api/accounts`
10. [Tenants](10_tenants.md) — `GET /api/tenants` (public directory)

## Cross-references

- Terminal behavior rules: [Tech Specs §8](../tech-specs/8_backend-frontend-interfaces.md)
- Session grant structure: [Tech Specs §12](../tech-specs/12_key-hierarchy-session-grants.md)
- Risk & financial limits: [Tech Specs §9](../tech-specs/9_risk-financial-limits.md)
- Status codes: [Tech Specs §15](../tech-specs/15_status-codes-block-rules.md)
