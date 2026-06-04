# Tech Specs Index

This folder contains implementation-focused technical specifications for the NFC wallet application. These sections are intended for developers building the frontend, backend, and card interfaces.

> ⚠️ This spec is aligned with the **code-frozen implementation** as of June 2026.

## Sections

1. [Overview](1_overview.md)
2. [System Architecture](2_system-architecture.md)
3. [Card Storage Model](3_card-storage-model.md) — 496B binary layout (2×216B + 64B trailer)
4. [Cryptography](4_cryptography.md) — AES-256-GCM, HMAC-SHA256, HKDF, Web Crypto API
5. [Tamper Detection & Validation](5_tamper-detection-validation.md) — 8-step validation sequence
6. [State Machine & Session Rules](6_state-machine-session-rules.md) — 4 states (IDLE, CHECKED_IN, STATION_OPERATION, CHECKED_OUT)
7. [Write & Update Strategy](7_write-update-strategy.md) — A/B buffer crash-safe writes
8. [Backend & Frontend Interfaces](8_backend-frontend-interfaces.md) — API contracts
9. [Risk & Financial Limits](9_risk-financial-limits.md) — Implemented limits + policy system
10. [Implementation Notes](10_implementation-notes.md)
11. [Deployment & Maintenance](11_deployment-maintenance.md)
12. [Key Hierarchy & Session Grants](12_key-hierarchy-session-grants.md) — Deterministic tenant-scoped HMAC derivation
13. [Role-specific App Models](13_roles-app-models.md) — 7 roles: admin, station, gate, terminal, kiosk, scout, superadmin
14. [Transaction Log Format](14_transaction-log-format.md) — 5-entry ring buffer, 16B per entry, chain hash
15. [Status Codes & Block Rules](15_status-codes-block-rules.md) — 5 statuses, dual-source enforcement
16. [Infrastructure Stack](16_infrastructure-stack.md) — Cloudflare Workers + D1 + Pages
17. [Time, Validation & Assumptions](17_time-validation-assumptions.md)
18. [Software Assumptions](18_software-assumptions.md)
19. [CI/CD Integration](19_cicd-integration.md)

> These specs are written as a development reference: clear behavior definitions, interface expectations, and implementation guidance for both the browser app and the backend service.
