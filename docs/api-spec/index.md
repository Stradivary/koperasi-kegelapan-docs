# API Spec Index

This folder defines the **contract between services** for the offline NFC wallet system. It covers all HTTP endpoints exposed by the backend to terminal, gate, station, and scout clients.

> API Spec is Layer 4. It depends on Tech Specs (Layer 3) for behavior rules and System Design (Layer 2) for trust model and session grant concepts.

## Sections

1. [Overview](1_overview.md) - auth model, base URL, versioning, common errors
2. [Authentication](2_auth.md) - tenant-scoped device and operator auth
3. [Session Grants](3_session-grants.md) - `GET /api/session-grant`
4. [Policy](4_policy.md) - `GET /api/policy`
5. [Cards](5_cards.md) - registration, read, top-up, block, reissue
6. [Reconciliation](6_reconciliation.md) - `POST /api/reconcile`
7. [Terminal Reports](7_terminal-reports.md) - `POST /api/terminal-report`

## Cross-references

- Terminal behavior rules: [Tech Specs §8](../tech-specs/8_backend-frontend-interfaces.md)
- Session grant structure: [Tech Specs §12](../tech-specs/12_key-hierarchy-session-grants.md)
- Risk & financial limits: [Tech Specs §9](../tech-specs/9_risk-financial-limits.md)
- Status codes: [Tech Specs §15](../tech-specs/15_status-codes-block-rules.md)
